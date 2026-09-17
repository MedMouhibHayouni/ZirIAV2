import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NameDictionary } from './entities/name-dictionary.entity';
import { NameDictionaryService } from './name-dictionary.service';
import { NameDictionaryController } from './name-dictionary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NameDictionary])],
  controllers: [NameDictionaryController],
  providers: [NameDictionaryService],
  exports: [NameDictionaryService, TypeOrmModule],
})
export class NameDictionaryModule {}
