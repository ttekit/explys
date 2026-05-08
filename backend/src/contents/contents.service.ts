import { Body, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { CreateContentDto } from "./dto/create-content.dto";
import {
  DeleteObjectCommand,
  FilterRuleName,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { UpdateContentDto } from "./dto/update-content.dto";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
@Injectable()
export class ContentsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.bucketName =
      this.configService.getOrThrow<string>("AWS_S3_BUCKET_NAME");
    this.region = this.configService.getOrThrow<string>("AWS_S3_REGION");
    this.s3Client = new S3Client({
      region: this.region,
    });
  }
  private getRedisKey(id: number | string): string {
    return `content:${id}`;
  }

  async createContent(
    dto: CreateContentDto,
    files: { video: Express.Multer.File[]; preview?: Express.Multer.File[] },
  ) {
    try {
      const videoFile = files.video[0];
      const previewFile = files.preview?.[0];

      const timestamp = Date.now();
      const videoKey = `videos/${timestamp}-${videoFile.originalname}`;
      const previewKey = previewFile
        ? `previews/${timestamp}-${previewFile.originalname}`
        : null;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: videoKey,
          Body: videoFile.buffer,
          ContentType: videoFile.mimetype,
        }),
      );

      const videoUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${videoKey}`;

      let previewUrl: string | null = null;
      if (previewFile && previewKey) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: previewKey,
            Body: previewFile.buffer,
            ContentType: previewFile.mimetype,
          }),
        );
        previewUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${previewKey}`;
      }

      const content = await this.prisma.content.create({
        data: {
          name: dto.name,
          description: dto.description,
          friendlyLink: dto.friendlyLink,
          previewUrl: previewUrl,
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

      const cacheData = JSON.stringify({ videoUrl, previewUrl });
      await this.redis.set(`file:${content.id}`, cacheData, "EX", 3600); //TTL = 3600 seconds

      return {
        id: content.id,
        url: videoUrl,
        previewUrl: previewUrl,
        name: content.name,
      };
    } catch (error) {
      console.log("S3/Prisma Error:", error);
      throw new InternalServerErrorException("Error uploading a file to S3");
    }
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
      const media = await this.prisma.contentVideo.findFirst({
        where: {
          contentId: id,
        },
      });

      if (media && media.videoLink) {
        const oldKey = media.videoLink.split("/").pop();

        if (oldKey) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: oldKey,
            }),
          );
        }
      }

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: file.originalname,
          Body: file.buffer,
        }),
      );

      const newUrl = `https://${this.bucketName}.s3.${this.region}amazonaws.com/${file.originalname}`;

      await this.prisma.contentVideo.updateMany({
        where: { contentId: id },
        data: { videoLink: newUrl },
      });

      await this.redis.set(this.getRedisKey(id), newUrl, "EX", 3600);
    }

    return updateContent;
  }

  async deleteContent(id: number) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            ContentVideo: true,
          },
        },
      },
    });

    if (!content) {
      throw new InternalServerErrorException("Content not found");
    }
    if (content) {
      const existingVideo = await this.prisma.contentVideo.findFirst({
        where: { contentId: content.id },
      });

      const videoLinks: string[] = [];
      content.category.forEach((media) => {
        media.ContentVideo.forEach((video) => {
          if (video.videoLink) {
            videoLinks.push(video.videoLink);
          }
        });
      });

      const bucketName = this.configService.get<string>("AWS_S3_BUCKET_NAME");

      for (const link of videoLinks) {
        const fileKey = link.split("/").pop();
        if (fileKey) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: fileKey,
            }),
          );
        }
      }

      await this.redis.del(`file:${content.id}`);

      return this.prisma.content.delete({
        where: { id },
      });
    }
  }

  async getAllContent() {
    return await this.prisma.content.findMany();
  }

  async getContentById(id: number) {
    const cached = await this.redis.get(this.getRedisKey(id));
    if (cached) {
      const data = JSON.parse(cached);
      return {
        id,
        videoLink: data.videoUrl,
        preview: data.preview,
        fromCache: true,
      };
    }

    const content = await this.prisma.content.findUnique({
      where: {
        id,
      },
      include: {
        category: {
          include: {
            ContentVideo: true,
          },
        },
      },
    });
    return content;
  }
}
