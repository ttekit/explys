import { Module } from "@nestjs/common";
import { SlackQaController } from "./slack-qa.controller";
import { SlackQaService } from "./slack-qa.service";

@Module({
  controllers: [SlackQaController],
  providers: [SlackQaService],
  exports: [SlackQaService],
})
export class SlackQaModule {}
