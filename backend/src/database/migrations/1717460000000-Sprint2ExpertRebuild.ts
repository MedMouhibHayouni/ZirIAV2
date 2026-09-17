import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint2ExpertRebuild1717460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "platform_commissions_transaction_type_enum" ADD VALUE IF NOT EXISTS 'EXPERT_CONSULTATION'`);
    await queryRunner.query(`ALTER TYPE "financial_records_category_enum" ADD VALUE IF NOT EXISTS 'EXPERT_CONSULTATION'`);
    await queryRunner.query(`CREATE TYPE "users_expert_type_enum" AS ENUM('PHYTOPATHOLOGIST', 'AGRONOMIST', 'HYDRAULIC_ENGINEER', 'HYDROGEOLOGIST', 'ZOOTECHNICIAN', 'VETERINARY_EPIDEMIOLOGIST')`);
    await queryRunner.query(`ALTER TABLE "users" ADD "expert_type" "users_expert_type_enum"`);
    await queryRunner.query(`ALTER TABLE "disease_detections" ADD "required_expert_type" "users_expert_type_enum"`);
    await queryRunner.query(`ALTER TABLE "field_reports" ADD "required_expert_type" "users_expert_type_enum"`);
    await queryRunner.query(`ALTER TABLE "ai_model_feedbacks" ADD "expert_validated" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "ai_model_feedbacks" ADD "validating_expert_type" "users_expert_type_enum"`);
    await queryRunner.query(`
      CREATE TABLE "expert_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "expert_type" "users_expert_type_enum" NOT NULL,
        "governorate_zones" jsonb,
        "certifications" jsonb,
        "bio" text,
        "is_profile_completed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_expert_profile_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_expert_profile_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expert_profile_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "expert_consultations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "farmer_id" uuid NOT NULL,
        "expert_id" uuid,
        "expert_type" "users_expert_type_enum" NOT NULL,
        "consultation_type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'OPEN',
        "description" text NOT NULL,
        "expert_response" text,
        "gross_amount_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "net_to_expert_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "platform_commission_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_expert_consultations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expert_consultations_farmer_id" FOREIGN KEY ("farmer_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_expert_consultations_expert_id" FOREIGN KEY ("expert_id") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "expert_consultations"`);
    await queryRunner.query(`DROP TABLE "expert_profiles"`);
    await queryRunner.query(`ALTER TABLE "ai_model_feedbacks" DROP COLUMN "validating_expert_type"`);
    await queryRunner.query(`ALTER TABLE "ai_model_feedbacks" DROP COLUMN "expert_validated"`);
    await queryRunner.query(`ALTER TABLE "field_reports" DROP COLUMN "required_expert_type"`);
    await queryRunner.query(`ALTER TABLE "disease_detections" DROP COLUMN "required_expert_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "expert_type"`);
    await queryRunner.query(`DROP TYPE "users_expert_type_enum"`);
  }
}
