import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { PrismaService } from "src/prisma.service";
import { VideoCaptionsService } from "src/contents/video-captions.service";
import { AddContentEpisodeDto } from "./dto/add-content-episode.dto";
import { CreateContentDto } from "./dto/create-content.dto";
import { ReorderContentPlaylistDto } from "./dto/reorder-content-playlist.dto";
import { TeacherPatchContentVisibilityDto } from "./dto/teacher-patch-content-visibility.dto";
import { TeacherUploadContentDto } from "./dto/teacher-upload-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import {
    buildSafeS3ObjectKey,
    publicS3ObjectUrl,
} from "../common/s3-key.util";

@Injectable()
export class ContentsService {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly region: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly videoCaptionsService: VideoCaptionsService,
    ) {
        this.bucket = this.configService.getOrThrow<string>("AWS_S3_BUCKET_NAME");
        this.region =
            this.configService.get<string>("AWS_S3_REGION") ??
            this.configService.getOrThrow<string>("AWS_REGION");
        this.s3Client = new S3Client({
            region: this.region,
        });
    }

    async createContent(dto: CreateContentDto, file: Express.Multer.File) {
        const key = buildSafeS3ObjectKey(file.originalname);
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
            }),
        );
        const videoUrl = publicS3ObjectUrl(this.bucket, this.region, key);

        const created = await this.prisma.content.create({
            data: {
                name: dto.name,
                description: dto.description,
                friendlyLink: dto.friendlyLink,
                category: {
                    create: {
                        playlistPosition: 0,
                        ContentVideo: {
                            create: {
                                videoLink: videoUrl,
                                videoName: dto.name,
                                playlistPosition: 0,
                            },
                        },
                    },
                },
            },
            include: {
                category: {
                    include: {
                        ContentVideo: true,
                    },
                },
            },
        });

        const contentVideoId =
            created.category[0]?.ContentVideo?.[0]?.id;
        if (contentVideoId == null) {
            throw new InternalServerErrorException(
                "Created content is missing a ContentVideo id",
            );
        }

        return {
            ...created,
            contentVideoId,
        };
    }

    async updateContent(
        id: number,
        dto: UpdateContentDto,
        file?: Express.Multer.File,
    ) {
        const updateContent = await this.prisma.content.update({
            where: { id },
            data: {
                ...dto,
            },
        });

        if (file) {
            const contentMedia = await this.prisma.contentMedia.findFirst({
                where: { categoryId: id },
                orderBy: { playlistPosition: "asc" },
            });

            if (contentMedia) {
                const existingVideo = await this.prisma.contentVideo.findFirst({
                    where: { contentId: contentMedia.id },
                    orderBy: { playlistPosition: "asc" },
                });

                if (existingVideo?.videoLink) {
                    try {
                        const url = new URL(existingVideo.videoLink);
                        const oldKey = url.pathname.replace(/^\//, "");
                        if (oldKey) {
                            await this.s3Client.send(
                                new DeleteObjectCommand({
                                    Bucket: this.bucket,
                                    Key: decodeURIComponent(oldKey),
                                }),
                            );
                        }
                    } catch {
                        const fallbackKey = existingVideo.videoLink.split("/").pop();
                        if (fallbackKey) {
                            await this.s3Client.send(
                                new DeleteObjectCommand({
                                    Bucket: this.bucket,
                                    Key: decodeURIComponent(fallbackKey),
                                }),
                            );
                        }
                    }
                }

                const key = buildSafeS3ObjectKey(file.originalname);
                await this.s3Client.send(
                    new PutObjectCommand({
                        Bucket: this.bucket,
                        Key: key,
                        Body: file.buffer,
                    }),
                );

                const newUrl = publicS3ObjectUrl(this.bucket, this.region, key);
                await this.prisma.contentVideo.updateMany({
                    where: { contentId: contentMedia.id },
                    data: { videoLink: newUrl },
                });
            }
        }

        return updateContent;
    }

    deleteContent(id: number) {
        return this.prisma.content.delete({
            where: { id },
        });
    }

    async getAllContent() {
        return await this.prisma.content.findMany();
    }

    async getContentById(id: number) {
        return await this.prisma.content.findUnique({
            where: { id },
        });
    }

    async getSeriesPlaylistByFriendlyLink(friendlyLink: string) {
        const content = await this.prisma.content.findUnique({
            where: { friendlyLink },
            include: {
                category: {
                    orderBy: { playlistPosition: "asc" },
                    include: {
                        ContentVideo: {
                            orderBy: { playlistPosition: "asc" },
                        },
                    },
                },
            },
        });
        if (!content) {
            throw new NotFoundException(
                `Content with friendly link "${friendlyLink}" not found`,
            );
        }
        return content;
    }

    async reorderPlaylist(
        contentId: number,
        dto: ReorderContentPlaylistDto,
    ): Promise<void> {
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
            select: { id: true },
        });
        if (!content) {
            throw new NotFoundException(`Content with ID ${contentId} not found`);
        }
        const existing = await this.prisma.contentMedia.findMany({
            where: { categoryId: contentId },
            select: { id: true },
        });
        const existingIds = new Set(existing.map((r) => r.id));
        const ordered = dto.orderedContentMediaIds;
        if (existingIds.size !== ordered.length) {
            throw new BadRequestException(
                "orderedContentMediaIds must include every episode slot for this series",
            );
        }
        for (const id of ordered) {
            if (!existingIds.has(id)) {
                throw new BadRequestException(
                    `ContentMedia ${id} does not belong to series ${contentId}`,
                );
            }
        }
        const unique = new Set(ordered);
        if (unique.size !== ordered.length) {
            throw new BadRequestException("Duplicate ContentMedia id in ordering");
        }
        const offset = 1_000_000;
        await this.prisma.$transaction(async (tx) => {
            for (let i = 0; i < ordered.length; i++) {
                await tx.contentMedia.update({
                    where: { id: ordered[i]! },
                    data: { playlistPosition: offset + i },
                });
            }
            for (let i = 0; i < ordered.length; i++) {
                await tx.contentMedia.update({
                    where: { id: ordered[i]! },
                    data: { playlistPosition: i },
                });
            }
        });
    }

    async addEpisode(
        contentId: number,
        dto: AddContentEpisodeDto,
        file: Express.Multer.File,
    ) {
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
            select: { id: true },
        });
        if (!content) {
            throw new NotFoundException(`Content with ID ${contentId} not found`);
        }
        const maxRow = await this.prisma.contentMedia.aggregate({
            where: { categoryId: contentId },
            _max: { playlistPosition: true },
        });
        const playlistPosition = (maxRow._max.playlistPosition ?? -1) + 1;
        const key = buildSafeS3ObjectKey(file.originalname);
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
            }),
        );
        const videoUrl = publicS3ObjectUrl(this.bucket, this.region, key);
        const createdMedia = await this.prisma.contentMedia.create({
            data: {
                categoryId: contentId,
                playlistPosition,
                ContentVideo: {
                    create: {
                        videoLink: videoUrl,
                        videoName: dto.videoName,
                        videoDescription: dto.videoDescription ?? null,
                        playlistPosition: 0,
                    },
                },
            },
            include: {
                ContentVideo: true,
            },
        });
        const contentVideoId = createdMedia.ContentVideo[0]?.id;
        if (contentVideoId == null) {
            throw new InternalServerErrorException(
                "Created episode is missing a ContentVideo id",
            );
        }
        return { contentVideoId, contentMediaId: createdMedia.id };
    }

    private async requireTeacherAccount(userId: number): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user || user.role !== "teacher") {
            throw new ForbiddenException(
                "Only teacher accounts can use this resource.",
            );
        }
    }

    private buildTeacherFriendlyLink(userId: number): string {
        const tail = randomUUID().replace(/-/g, "").slice(0, 16);
        return `t-${userId}-${tail}`;
    }

    /**
     * Teacher profile upload: one series with one clip; auto captions + tags (no separate regen for teachers).
     */
    async createTeacherUpload(
        userId: number,
        dto: TeacherUploadContentDto,
        file: Express.Multer.File,
    ) {
        await this.requireTeacherAccount(userId);
        let friendlyLink = "";
        for (let attempt = 0; attempt < 12; attempt++) {
            friendlyLink = this.buildTeacherFriendlyLink(userId);
            const clash = await this.prisma.content.findUnique({
                where: { friendlyLink },
                select: { id: true },
            });
            if (!clash) {
                break;
            }
            if (attempt === 11) {
                throw new InternalServerErrorException(
                    "Could not allocate a unique link. Try again.",
                );
            }
        }
        const key = buildSafeS3ObjectKey(file.originalname);
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
            }),
        );
        const videoUrl = publicS3ObjectUrl(this.bucket, this.region, key);
        const name = dto.name.trim();
        const visibility = dto.visibility.trim();
        if (visibility !== "public" && visibility !== "unlisted") {
            throw new BadRequestException('visibility must be "public" or "unlisted"');
        }
        const created = await this.prisma.content.create({
            data: {
                name,
                description: "",
                friendlyLink,
                ownerUserId: userId,
                visibility,
                category: {
                    create: {
                        playlistPosition: 0,
                        ContentVideo: {
                            create: {
                                videoLink: videoUrl,
                                videoName: name,
                                playlistPosition: 0,
                            },
                        },
                    },
                },
            },
            include: {
                category: {
                    include: {
                        ContentVideo: true,
                    },
                },
            },
        });
        const contentVideoId =
            created.category[0]?.ContentVideo?.[0]?.id;
        if (contentVideoId == null) {
            throw new InternalServerErrorException(
                "Created content is missing a ContentVideo id",
            );
        }
        const captionsRow =
            await this.videoCaptionsService.generateCaptions(contentVideoId);
        return {
            ...created,
            contentVideoId,
            captionsReady: captionsRow != null,
        };
    }

    async findTeacherMySeries(userId: number) {
        await this.requireTeacherAccount(userId);
        const rows = await this.prisma.content.findMany({
            where: { ownerUserId: userId },
            orderBy: { createAt: "desc" },
            include: {
                category: {
                    orderBy: { playlistPosition: "asc" },
                    take: 1,
                    include: {
                        ContentVideo: {
                            orderBy: { playlistPosition: "asc" },
                            take: 1,
                            include: {
                                videoCaption: {
                                    select: { subtitlesFileLink: true },
                                },
                            },
                        },
                        stats: true,
                    },
                },
            },
        });
        return rows.map((c) => {
            const slot = c.category[0];
            const vid = slot?.ContentVideo?.[0];
            const stats = slot?.stats;
            return {
                contentId: c.id,
                name: c.name,
                friendlyLink: c.friendlyLink,
                visibility: c.visibility,
                contentVideoId: vid?.id ?? null,
                captionsReady: Boolean(
                    vid?.videoCaption?.subtitlesFileLink?.trim(),
                ),
                systemTags: stats?.systemTags ?? [],
                userTags: stats?.userTags ?? [],
                processingComplexity: stats?.processingComplexity ?? null,
            };
        });
    }

    async patchTeacherContentVisibility(
        userId: number,
        contentId: number,
        dto: TeacherPatchContentVisibilityDto,
    ) {
        await this.requireTeacherAccount(userId);
        const owned = await this.prisma.content.findFirst({
            where: { id: contentId, ownerUserId: userId },
            select: { id: true },
        });
        if (!owned) {
            throw new NotFoundException(
                "Series not found or not owned by this account.",
            );
        }
        const visibility = dto.visibility.trim();
        if (visibility !== "public" && visibility !== "unlisted") {
            throw new BadRequestException('visibility must be "public" or "unlisted"');
        }
        return this.prisma.content.update({
            where: { id: contentId },
            data: { visibility },
            select: {
                id: true,
                name: true,
                friendlyLink: true,
                visibility: true,
            },
        });
    }
}
