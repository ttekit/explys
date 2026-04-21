import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateContentDto{
    @ApiProperty({ description: 'The name of the content' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(20, {message: "The maximum number of characters is 20"})
    name?: string;
    
    @ApiProperty({ description: 'The friendly link for the content' })
    @IsOptional()
    @IsString()
    friendlyLink?: string;
    
    @ApiProperty({ description: 'The description of the content' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    description?: string;
}