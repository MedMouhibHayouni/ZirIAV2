import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('specialty_reference')
export class SpecialtyReference {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'name_fr', type: 'varchar', length: 100 })
  name_fr: string;

  @Column({ name: 'name_darija', type: 'varchar', length: 100 })
  name_darija: string;

  @Column({ name: 'icon_name', type: 'varchar', length: 50 })
  icon_name: string;

  @Column({ name: 'color_token', type: 'varchar', length: 50 })
  color_token: string;
}
