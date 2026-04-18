import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';

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

  @Post()
  createContent(@Body() dto: CreateContentDto ) {
    const {name, friendlyLink, description} = dto;
    return this.contentsService.createContent(name, friendlyLink, description);
  }

  @Patch(':id')
  updateContent(@Param('id') id: string, @Body() dto: CreateContentDto){
    return this.contentsService.updateContent(+id, dto);
  }

  @Delete('delete/:id') 
  deleteContent(@Param('id') id: number,){
    return this.contentsService.deleteContent( id );
  }
}