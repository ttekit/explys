import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class CreateCheckoutDto {
  @ApiProperty({ enum: ["light", "smart", "family"] })
  @IsIn(["light", "smart", "family"])
  planId!: "light" | "smart" | "family";
}
