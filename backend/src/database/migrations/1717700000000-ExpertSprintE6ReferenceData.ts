import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpertSprintE6ReferenceData1717700000000 implements MigrationInterface {
  name = 'ExpertSprintE6ReferenceData1717700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "expert_score" numeric(5,2);
      ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "consultation_rate_tnd" numeric(8,3);
      ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "tarif_note" varchar(200);
    `);

    await queryRunner.query(`
      ALTER TABLE "expert_consultations" ADD COLUMN IF NOT EXISTS "satisfaction_score" integer;
      ALTER TABLE "expert_consultations" ADD COLUMN IF NOT EXISTS "consultation_photo_url" varchar(500);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "governorate_centroids" (
        "id" SERIAL PRIMARY KEY,
        "governorate" varchar(100) UNIQUE NOT NULL,
        "latitude" decimal(10,7) NOT NULL,
        "longitude" decimal(10,7) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "crop_kc_values" (
        "id" SERIAL PRIMARY KEY,
        "crop_type" varchar(100) NOT NULL,
        "kc_ini" decimal(5,2) NOT NULL,
        "kc_mid" decimal(5,2) NOT NULL,
        "kc_end" decimal(5,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "animal_nutritional_norms" (
        "id" SERIAL PRIMARY KEY,
        "species" varchar(100) NOT NULL,
        "stage" varchar(100) NOT NULL,
        "ufl" decimal(6,3) NOT NULL,
        "pdin" decimal(6,2) NOT NULL,
        "pdie" decimal(6,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "seasonal_crop_risks" (
        "id" SERIAL PRIMARY KEY,
        "crop_type" varchar(100) NOT NULL,
        "month" integer NOT NULL CHECK (month >= 1 AND month <= 12),
        "risk_level" varchar(50) NOT NULL,
        "risk_description" text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "product_prescription_rules" (
        "id" SERIAL PRIMARY KEY,
        "disease_name" varchar(200) NOT NULL,
        "allowed_product" varchar(200) NOT NULL,
        "default_dosage" varchar(100) NOT NULL,
        "default_application_method" varchar(100) NOT NULL,
        "pre_harvest_days" integer DEFAULT 0,
        "notes" text
      );

      CREATE TABLE IF NOT EXISTS "vaccine_types" (
        "id" SERIAL PRIMARY KEY,
        "species" varchar(100) NOT NULL,
        "disease_prevented" varchar(200) NOT NULL,
        "injection_method" varchar(100) NOT NULL,
        "age_weeks" integer NOT NULL,
        "interval_months" integer NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccine_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_prescription_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seasonal_crop_risks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "animal_nutritional_norms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crop_kc_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "governorate_centroids"`);
    await queryRunner.query(`
      ALTER TABLE "expert_consultations" DROP COLUMN IF EXISTS "consultation_photo_url";
      ALTER TABLE "expert_consultations" DROP COLUMN IF EXISTS "satisfaction_score";
    `);
    await queryRunner.query(`
      ALTER TABLE "expert_profiles" DROP COLUMN IF EXISTS "tarif_note";
      ALTER TABLE "expert_profiles" DROP COLUMN IF EXISTS "consultation_rate_tnd";
      ALTER TABLE "expert_profiles" DROP COLUMN IF EXISTS "expert_score";
    `);
  }
}
