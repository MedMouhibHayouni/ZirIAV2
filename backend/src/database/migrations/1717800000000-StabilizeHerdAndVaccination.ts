import { MigrationInterface, QueryRunner } from 'typeorm';

export class StabilizeHerdAndVaccination1717800000000 implements MigrationInterface {
  name = 'StabilizeHerdAndVaccination1717800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "herd_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "expert_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "species" varchar(50),
        "breed" varchar(100),
        "herd_size" integer,
        "daily_milk_yield_kg" numeric(8,2),
        "birth_rate_pct" numeric(5,2),
        "mortality_rate_pct" numeric(5,2),
        "last_visit_date" date,
        "feed_program" text,
        "notes" text,
        "performance_alert" boolean DEFAULT false,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now(),
        CONSTRAINT "FK_herd_records_expert" FOREIGN KEY ("expert_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_herd_records_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vaccination_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "expert_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "species" varchar(50),
        "animal_count" integer,
        "vaccine_name" varchar(200),
        "batch_number" varchar(100),
        "vaccination_date" date,
        "next_reminder_date" date,
        "is_reminder_sent" boolean DEFAULT false,
        "notes" text,
        "created_at" timestamptz DEFAULT now(),
        CONSTRAINT "FK_vaccination_records_expert" FOREIGN KEY ("expert_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vaccination_records_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccination_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "herd_records"`);
  }
}
