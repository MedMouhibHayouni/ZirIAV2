import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NameDictionary } from './entities/name-dictionary.entity';

@Injectable()
export class NameDictionaryService {
  constructor(
    @InjectRepository(NameDictionary)
    private readonly repository: Repository<NameDictionary>,
  ) {}

  async findAll(): Promise<NameDictionary[]> {
    return this.repository.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<NameDictionary | null> {
    return this.repository.findOne({ where: { key } });
  }
}
