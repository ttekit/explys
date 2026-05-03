import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { Express } from "express";
import { ContentsService } from "./contents.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

@ApiTags("contents")
@Controller("contents")
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get("all")
  async getContent() {
    return this.contentsService.getAllContent();
  }

  @Get(":id")
  getContentById(@Param("id", ParseIntPipe) id: number) {
    return this.contentsService.getContentById(id);
  }

  @Post("create")
  @UseInterceptors(FileInterceptor("file"))
  async createContent(
    @Body() createContentDto: CreateContentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 20 }),
          new FileTypeValidator({ fileType: "video/mp4" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.contentsService.createContent(createContentDto, file);
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("file"))
  updateContent(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: "video/mp4" }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.contentsService.updateContent(id, dto, file);
  }

  @Delete("delete/:id")
  deleteContent(@Param("id", ParseIntPipe) id: number) {
    return this.contentsService.deleteContent(id);
  }
}
