import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { PlacementJwtGuard } from "./placement-jwt.guard";
import { PlacementTestController } from "./placement-test.controller";
import { PlacementTestService } from "./placement-test.service";

@Module({
  imports: [PrismaModule],
  controllers: [PlacementTestController],
  providers: [PlacementTestService, PlacementJwtGuard],
})
export class PlacementTestModule {}
