import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PrismaService } from "src/prisma.service";
import { CreateContentDto } from "./dto/create-content.dto";
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

    return await this.prisma.content.create({
      data: {
        name: dto.name,
        description: dto.description,
        friendlyLink: dto.friendlyLink,
        category: {
          create: {
            ContentVideo: {
              create: {
                videoLink: videoUrl,
                videoName: dto.name,
              },
            },
          },
        },
      },
    });
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
      });

      if (contentMedia) {
        const existingVideo = await this.prisma.contentVideo.findFirst({
          where: { contentId: contentMedia.id },
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
}
