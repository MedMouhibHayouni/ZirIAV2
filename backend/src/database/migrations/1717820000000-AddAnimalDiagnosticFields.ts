import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnimalDiagnosticFields1717820000000 implements MigrationInterface {
  name = 'AddAnimalDiagnosticFields1717820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "disease_detections"
        ADD COLUMN IF NOT EXISTS "detection_type" varchar(20) NOT NULL DEFAULT 'PLANT',
        ADD COLUMN IF NOT EXISTS "animal_species" varchar(100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "disease_detections"
        DROP COLUMN IF EXISTS "animal_species",
        DROP COLUMN IF EXISTS "detection_type";
    `);
  }
}
