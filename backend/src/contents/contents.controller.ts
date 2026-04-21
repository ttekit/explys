import { Body, Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseFilePipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { Express } from 'express';
import { UpdateContentDto } from './dto/update-content.dto';

@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get('/all')
  getContent() {
    return this.contentsService.getAllContent();
  }

  @Get('/:id')
  getContentById(@Param('id')id: number) {
    return this.contentsService.getContentById(id);
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  async createContent(
    @Body() createContentDto: CreateContentDto,
    @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({maxSize: 1024 * 1024 * 5}),
        new FileTypeValidator({fileType: 'video/mp4'}),
      ]
    })
  ) file: Express.Multer.File){
    await this.contentsService.createContent(createContentDto, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  updateContent(
    @Param('id') id: string, 
    @Body() dto: UpdateContentDto, 
    @UploadedFile() file?: Express.Multer.File){
      return this.contentsService.updateContent(+id, dto, file);
  }

  @Delete('delete/:id') 
  deleteContent(@Param('id') id: number,){
    return this.contentsService.deleteContent( id );
  }
}