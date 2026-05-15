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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Express, Request } from "express";
import { AuthGuard } from "src/auth/auth.guard";
import { jwtSubToUserId } from "src/auth/jwt-subject.util";
import { JwtAdminGuard } from "src/auth/guards/jwt-admin.guard";
import { AddContentEpisodeDto } from "src/contents/dto/add-content-episode.dto";
import { ContentsService } from "./contents.service";
import { CreateContentDto } from "src/contents/dto/create-content.dto";
import { ReorderContentPlaylistDto } from "src/contents/dto/reorder-content-playlist.dto";
import { TeacherPatchContentVisibilityDto } from "src/contents/dto/teacher-patch-content-visibility.dto";
import { TeacherUploadContentDto } from "src/contents/dto/teacher-upload-content.dto";
import { UpdateContentDto } from "src/contents/dto/update-content.dto";

/** MP4 uploads; override with CONTENT_VIDEO_MAX_FILE_BYTES (bytes). Default 512 MiB (match nginx). */
function contentVideoMaxFileBytes(): number {
  const n = Number(process.env.CONTENT_VIDEO_MAX_FILE_BYTES);
  if (Number.isFinite(n) && n > 0) {
    return Math.floor(n);
  }
  return 512 * 1024 * 1024;
}

const CONTENT_VIDEO_MAX_FILE_BYTES = contentVideoMaxFileBytes();

@ApiTags("contents")
@Controller("contents")
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) { }

  @Get("all")
  getContent() {
    return this.contentsService.getAllContent();
  }

  @Get("series/:friendlyLink")
  @ApiOperation({
    summary: "Ordered playlist for a series (Content) by friendly link",
  })
  getSeriesPlaylist(@Param("friendlyLink") friendlyLink: string) {
    return this.contentsService.getSeriesPlaylistByFriendlyLink(friendlyLink);
  }

  @Post("teacher/upload")
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: CONTENT_VIDEO_MAX_FILE_BYTES },
    }),
  )
  @ApiOperation({
    summary:
      "Teacher: upload a lesson (MP4). Creates a series with one clip; captions and tags are generated automatically.",
  })
  async teacherUpload(
    @Req() req: Request & { user?: unknown },
    @Body() dto: TeacherUploadContentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: CONTENT_VIDEO_MAX_FILE_BYTES }),
          new FileTypeValidator({ fileType: "video/mp4" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const userId = jwtSubToUserId(req.user);
    return this.contentsService.createTeacherUpload(userId, dto, file);
  }

  @Get("teacher/my-series")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Teacher: list series uploaded from profile (with caption/tag status)",
  })
  async teacherMySeries(@Req() req: Request & { user?: unknown }) {
    const userId = jwtSubToUserId(req.user);
    return this.contentsService.findTeacherMySeries(userId);
  }

  @Patch("teacher/:id/visibility")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Teacher: set catalog visibility ("public" or "unlisted") for owned series',
  })
  async teacherPatchVisibility(
    @Req() req: Request & { user?: unknown },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: TeacherPatchContentVisibilityDto,
  ) {
    const userId = jwtSubToUserId(req.user);
    return this.contentsService.patchTeacherContentVisibility(userId, id, dto);
  }

  @Get(":id")
  getContentById(@Param("id", ParseIntPipe) id: number) {
    return this.contentsService.getContentById(id);
  }

  @Post("create")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: CONTENT_VIDEO_MAX_FILE_BYTES },
    }),
  )
  async createContent(
    @Body() createContentDto: CreateContentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: CONTENT_VIDEO_MAX_FILE_BYTES }),
          new FileTypeValidator({ fileType: "video/mp4" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.contentsService.createContent(createContentDto, file);
  }

  @Patch(":id/playlist")
  @UseGuards(JwtAdminGuard)
  @ApiOperation({
    summary: "Reorder ContentMedia slots for a series (admin API token)",
  })
  async reorderPlaylist(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReorderContentPlaylistDto,
  ): Promise<void> {
    await this.contentsService.reorderPlaylist(id, dto);
  }

  @Post(":id/episodes")
  @UseGuards(JwtAdminGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: CONTENT_VIDEO_MAX_FILE_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Add an episode (new ContentMedia + video) to an existing series",
  })
  async addEpisode(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddContentEpisodeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: CONTENT_VIDEO_MAX_FILE_BYTES }),
          new FileTypeValidator({ fileType: "video/mp4" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.contentsService.addEpisode(id, dto, file);
  }

  @Patch(":id")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: CONTENT_VIDEO_MAX_FILE_BYTES },
    }),
  )
  updateContent(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: CONTENT_VIDEO_MAX_FILE_BYTES }),
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
