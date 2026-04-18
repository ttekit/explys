import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentsService {
    constructor (private readonly prisma: PrismaService){}

    createContent(name: string, friendlyLink: string, description: string) {
        return this.prisma.content.create({
            data: {
                name,
                friendlyLink,
                description
            }
        })
    }

    async updateContent(id: number, dto: CreateContentDto){
        return this.prisma.content.update({
            where: { id },
            data: {
                ...dto,
            },
        })
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
