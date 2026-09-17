import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('mission_evaluation_badges')
export class MissionEvaluationBadge {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  code: string;

  @Column({ name: 'label_fr', type: 'varchar', length: 100 })
  label_fr: string;

  @Column({ name: 'label_darija', type: 'varchar', length: 100 })
  label_darija: string;

  @Column({ name: 'icon_name', type: 'varchar', length: 50 })
  icon_name: string;

  @Column({ name: 'positive', default: true })
  positive: boolean;
}
