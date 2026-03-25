import { Injectable } from '@nestjs/common';
import { Content } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma.service';

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

    updateContent(id: number, name: string, friendlyLink: string, description: string){
        return this.prisma.content.update({
            where: { id },
            data: {
                name,
                friendlyLink,
                description,
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
