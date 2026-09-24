import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SlackWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team_domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  command?: string;

  @ApiPropertyOptional({ description: "Bug description passed to slash command" })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  response_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  api_app_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  is_enterprise_install?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enterprise_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enterprise_name?: string;
}
