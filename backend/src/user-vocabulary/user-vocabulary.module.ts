import { Module } from '@nestjs/common';
import { UserVocabularyService } from './user-vocabulary.service';

@Module({
  providers: [UserVocabularyService],
  exports: [UserVocabularyService],
})
export class UserVocabularyModule {}
