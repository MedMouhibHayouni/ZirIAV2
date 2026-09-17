import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('animal_nutritional_norms')
export class AnimalNutritionalNorm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  species: string;

  @Column()
  stage: string;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  ufl: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  pdin: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  pdie: number;
}
