import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint7WorkerParcelNavigation1717500000000 implements MigrationInterface {
  name = 'Sprint7WorkerParcelNavigation1717500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_applications" 
        ADD COLUMN "navigation_deep_link" VARCHAR,
        ADD COLUMN "mission_context_snapshot" JSONB
    `);

    await queryRunner.query(`
      ALTER TABLE "mission_contracts" 
        ADD COLUMN "navigation_deep_link" VARCHAR
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mission_contracts" 
        DROP COLUMN "navigation_deep_link"
    `);

    await queryRunner.query(`
      ALTER TABLE "job_applications" 
        DROP COLUMN "navigation_deep_link",
        DROP COLUMN "mission_context_snapshot"
    `);
  }
}
