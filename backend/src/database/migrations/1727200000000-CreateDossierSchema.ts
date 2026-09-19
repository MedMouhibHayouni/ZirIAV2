import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDossierSchema1727200000000 implements MigrationInterface {
  name = 'CreateDossierSchema1727200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Main dossier table ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_dossiers" (
        "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referenceNumber"      VARCHAR(50) NOT NULL UNIQUE,
        "type"                 VARCHAR(50) NOT NULL,
        "farmerId"             UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "institutionId"        UUID NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE,
        "assignedAgentId"      UUID REFERENCES "user"("id") ON DELETE SET NULL,
        "status"               VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
        "programName"          VARCHAR(150) NOT NULL,
        "requestedAmountTnd"   NUMERIC(12,3) NOT NULL DEFAULT 0,
        "approvedAmountTnd"    NUMERIC(12,3),
        "projectSummary"       TEXT,
        "internalAgentNotes"   TEXT,
        "daysInCurrentStatus"  INTEGER NOT NULL DEFAULT 0,
        "isOverdue"            BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dossier_farmer" ON "institution_dossiers" ("farmerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dossier_institution" ON "institution_dossiers" ("institutionId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dossier_status" ON "institution_dossiers" ("status")`);

    // ── Documents ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dossier_documents" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "dossierId"       UUID NOT NULL REFERENCES "institution_dossiers"("id") ON DELETE CASCADE,
        "documentName"    VARCHAR(150) NOT NULL,
        "documentType"    VARCHAR(50) NOT NULL DEFAULT 'PDF',
        "fileUrl"         TEXT,
        "reviewStatus"    VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        "rejectionReason" TEXT,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Status History (append-only enforced by trigger) ────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dossier_status_history" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "dossierId"        UUID NOT NULL REFERENCES "institution_dossiers"("id") ON DELETE CASCADE,
        "previousStatus"   VARCHAR(50),
        "newStatus"        VARCHAR(50) NOT NULL,
        "changedByUserId"  UUID REFERENCES "user"("id") ON DELETE SET NULL,
        "reason"           TEXT,
        "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Prevent UPDATE and DELETE on status history (append-only)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_dossier_history_mutation()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Dossier status history is immutable (append-only)';
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_dossier_history_immutable
      BEFORE UPDATE OR DELETE ON "dossier_status_history"
      FOR EACH ROW EXECUTE FUNCTION prevent_dossier_history_mutation()
    `);

    // Auto-update updatedAt on dossier changes
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_dossier_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_dossier_updated_at
      BEFORE UPDATE ON "institution_dossiers"
      FOR EACH ROW EXECUTE FUNCTION update_dossier_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_dossier_history_immutable ON "dossier_status_history"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_dossier_updated_at ON "institution_dossiers"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_dossier_history_mutation()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_dossier_updated_at()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dossier_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dossier_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_dossiers"`);
  }
}
