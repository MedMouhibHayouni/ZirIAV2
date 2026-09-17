import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NameDictionaryService } from './name-dictionary.service';
import { NameDictionary } from './entities/name-dictionary.entity';

@ApiTags('Name Dictionary')
@Controller('name-dictionary')
export class NameDictionaryController {
  constructor(private readonly service: NameDictionaryService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir tout le dictionnaire de traduction des plantes et maladies' })
  async findAll(): Promise<NameDictionary[]> {
    return this.service.findAll();
  }
}
