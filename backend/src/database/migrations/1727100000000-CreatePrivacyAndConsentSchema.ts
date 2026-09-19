import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePrivacyAndConsentSchema1727100000000 implements MigrationInterface {
  name = 'CreatePrivacyAndConsentSchema1727100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUM for consent status
    await queryRunner.query(`
      CREATE TYPE "data_sharing_consents_status_enum" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED');
    `);

    // data_sharing_consents table
    await queryRunner.query(`
      CREATE TABLE "data_sharing_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "farmerId" uuid NOT NULL,
        "institutionId" uuid NOT NULL,
        "scopes" jsonb NOT NULL,
        "dossierId" uuid,
        "campaignId" uuid,
        "status" "data_sharing_consents_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "expiresAt" TIMESTAMP,
        "revokedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_sharing_consents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_data_sharing_consents_farmerId" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_data_sharing_consents_institutionId" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE
      );
    `);

    // data_access_log table
    await queryRunner.query(`
      CREATE TABLE "data_access_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorUserId" uuid NOT NULL,
        "institutionId" uuid NOT NULL,
        "farmerId" uuid NOT NULL,
        "scope" character varying(50) NOT NULL,
        "recordId" character varying(100),
        "action" character varying(20) NOT NULL DEFAULT 'READ',
        "ipAddress" character varying(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_access_log_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_data_access_log_actorUserId" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_data_access_log_institutionId" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_data_access_log_farmerId" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Create Immutability Trigger on data_access_log
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_access_log_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'COMPLIANCE ERROR: data_access_log is append-only. Updates and deletions are strictly forbidden by database policy.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_access_log_update_delete
      BEFORE UPDATE OR DELETE ON "data_access_log"
      FOR EACH ROW EXECUTE FUNCTION prevent_access_log_mutation();
    `);

    // Indexes for fast lookup and audit checks
    await queryRunner.query(`CREATE INDEX "IDX_consents_farmer_inst" ON "data_sharing_consents" ("farmerId", "institutionId", "status");`);
    await queryRunner.query(`CREATE INDEX "IDX_access_log_farmer" ON "data_access_log" ("farmerId", "createdAt");`);
    await queryRunner.query(`CREATE INDEX "IDX_access_log_institution" ON "data_access_log" ("institutionId", "createdAt");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_access_log_update_delete ON "data_access_log";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_access_log_mutation;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_access_log";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_sharing_consents";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "data_sharing_consents_status_enum";`);
  }
}
