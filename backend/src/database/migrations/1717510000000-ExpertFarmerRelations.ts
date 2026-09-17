import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpertFarmerRelations1717510000000 implements MigrationInterface {
  name = 'ExpertFarmerRelations1717510000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "expert_farmer_relations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');
      CREATE TYPE "expert_farmer_relations_requested_by_enum" AS ENUM('FARMER', 'EXPERT');
    `);

    await queryRunner.query(`
      CREATE TABLE "expert_farmer_relations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "expert_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "status" "expert_farmer_relations_status_enum" NOT NULL DEFAULT 'PENDING',
        "requested_by" "expert_farmer_relations_requested_by_enum" NOT NULL,
        "note" text,
        "accepted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_expert_farmer_relations_expert_farmer" UNIQUE ("expert_id", "farmer_id"),
        CONSTRAINT "PK_expert_farmer_relations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expert_farmer_relations_expert" FOREIGN KEY ("expert_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_expert_farmer_relations_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "expert_farmer_relations"`);
    await queryRunner.query(`DROP TYPE "expert_farmer_relations_status_enum"`);
    await queryRunner.query(`DROP TYPE "expert_farmer_relations_requested_by_enum"`);
  }
}
