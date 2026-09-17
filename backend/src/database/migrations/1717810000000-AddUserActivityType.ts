import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserActivityType1717810000000 implements MigrationInterface {
  name = 'AddUserActivityType1717810000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_activity_type_enum') THEN
          CREATE TYPE "users_activity_type_enum" AS ENUM('CROP', 'LIVESTOCK', 'MIXED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activity_type" "users_activity_type_enum" NOT NULL DEFAULT 'CROP';
    `);

    await queryRunner.query(`
      UPDATE "users" SET "activity_type" = 'CROP' WHERE "role" IN ('FARMER', 'FARMER_AMBASSADOR');
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "activity_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_activity_type_enum"`);
  }
}
