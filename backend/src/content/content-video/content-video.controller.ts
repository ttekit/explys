import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContentVideoService } from "./content-video.service";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";

@ApiTags("content-video")
@Controller("content-video")
export class ContentVideoController {
  constructor(private readonly contentVideoService: ContentVideoService) {}

  @Post()
  create(@Body() createContentVideoDto: CreateContentVideoDto) {
    return this.contentVideoService.create(createContentVideoDto);
  }

  @Get()
  findAll() {
    return this.contentVideoService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.contentVideoService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateContentVideoDto: UpdateContentVideoDto,
  ) {
    return this.contentVideoService.update(id, updateContentVideoDto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.contentVideoService.remove(id);
  }
}
