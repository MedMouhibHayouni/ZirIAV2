import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketplaceTraceabilityFields1717830000000 implements MigrationInterface {
  name = 'AddMarketplaceTraceabilityFields1717830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
        ADD COLUMN IF NOT EXISTS "floral_origin" varchar(255),
        ADD COLUMN IF NOT EXISTS "sanitary_cert" boolean,
        ADD COLUMN IF NOT EXISTS "breeding_method" varchar(255),
        ADD COLUMN IF NOT EXISTS "traceability_ref_id" varchar(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
        DROP COLUMN IF EXISTS "traceability_ref_id",
        DROP COLUMN IF EXISTS "breeding_method",
        DROP COLUMN IF EXISTS "sanitary_cert",
        DROP COLUMN IF EXISTS "floral_origin";
    `);
  }
}
