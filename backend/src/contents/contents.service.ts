import { Body, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from '@nestjs/config';
import { UpdateContentDto } from './dto/update-content.dto';
@Injectable()
export class ContentsService {
    private readonly s3Client : S3Client;

    constructor (private readonly prisma: PrismaService,
        private readonly configService: ConfigService){
            this.s3Client = new S3Client({
                region: this.configService.getOrThrow('AWS_S3_REGION'),
            })
        }


    async createContent(dto: CreateContentDto, file: Express.Multer.File){
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: 'kpi-eng-course',
                Key: file.originalname,
                Body: file.buffer,
            })
        )
        const videoUrl = `https://kpi-eng-course.s3.amazonaws.com/${file.originalname}`;

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
                            }
                        }
                    }
                }
            }
        });
    }

    async updateContent(id: number, dto: UpdateContentDto, file?: Express.Multer.File){
        
        const updateContent = await this.prisma.content.update({
            where: { id },
            data: {
                ...dto,
            },
        });

        if(file){
            const media = await this.prisma.contentVideo.findFirst({
                where:{
                    contentId: id,
                }
            })

            if(media && media.videoLink){
                const oldKey = media.videoLink.split('/').pop();

                if(oldKey){
                    await this.s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: 'kpi-eng-course',
                            Key: oldKey,
                        })
                    );
                }
            }

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: 'kpi-eng-course',
                    Key: file.originalname,
                    Body: file.buffer,
                }),
            );

            const newUrl = `https://kpi-eng-course.s3.amazonaws.com/${file.originalname}`
            await this.prisma.contentVideo.updateMany({
                where: {contentId: id },
                data: {videoLink: newUrl }
            });
        }

        return updateContent;
    }

    deleteContent(id: number){
        return this.prisma.content.delete({
            where: { id }
        })
    }

    async getAllContent(){
        return await this.prisma.content.findMany();
    }
    
    async getContentById(id: number){
        return await this.prisma.content.findUnique({
            where:{ id }
        });
    }

}
