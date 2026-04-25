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
import { ContentMediaService } from "./content-media.service";
import { CreateContentMediaDto } from "./dto/create-content-media.dto";
import { UpdateContentMediaDto } from "./dto/update-content-media.dto";

@ApiTags("content-media")
@Controller("content-media")
export class ContentMediaController {
  constructor(private readonly contentMediaService: ContentMediaService) {}

  @Post()
  create(@Body() createContentMediaDto: CreateContentMediaDto) {
    return this.contentMediaService.create(createContentMediaDto);
  }

  @Get()
  findAll() {
    return this.contentMediaService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.contentMediaService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateContentMediaDto: UpdateContentMediaDto,
  ) {
    return this.contentMediaService.update(id, updateContentMediaDto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.contentMediaService.remove(id);
  }
}
