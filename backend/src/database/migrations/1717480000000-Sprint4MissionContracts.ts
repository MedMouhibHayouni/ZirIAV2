import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint4MissionContracts1717480000000 implements MigrationInterface {
  name = 'Sprint4MissionContracts1717480000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."contract_type_enum" AS ENUM (
        'TRANSPORT', 'JOB', 'EQUIPMENT_RENTAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."contract_status_enum" AS ENUM (
        'PENDING_ACCEPTANCE', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'RESOLVED', 'CANCELLED'
      )
    `);

    // ─── mission_contracts table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "mission_contracts" (
        "id"                      UUID DEFAULT gen_random_uuid() NOT NULL,
        "contract_type"           "public"."contract_type_enum"   NOT NULL,
        "status"                  "public"."contract_status_enum" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
        "reference_id"            UUID                            NOT NULL,
        "initiator_id"            UUID                            NOT NULL,
        "counterparty_id"         UUID                            NOT NULL,
        "terms_snapshot"          JSONB                           NOT NULL DEFAULT '{}',
        "audit_log"               JSONB                           NOT NULL DEFAULT '[]',
        "total_amount_tnd"        NUMERIC(12,3)                   NOT NULL,
        "commission_amount_tnd"   NUMERIC(12,3)                   NOT NULL DEFAULT 0,
        "accepted_at"             TIMESTAMPTZ,
        "completed_at"            TIMESTAMPTZ,
        "disputed_at"             TIMESTAMPTZ,
        "dispute_reason"          TEXT,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mission_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contract_reference" UNIQUE ("reference_id", "contract_type")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_mc_reference_id"     ON "mission_contracts" ("reference_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_mc_initiator_id"     ON "mission_contracts" ("initiator_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_mc_counterparty_id"  ON "mission_contracts" ("counterparty_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_mc_status"           ON "mission_contracts" ("status")`);

    // ─── proximity_alert_sent_at on transport_requests ────────────────────────
    await queryRunner.query(`
      ALTER TABLE "transport_requests"
        ADD COLUMN IF NOT EXISTS "proximity_alert_sent_at" TIMESTAMPTZ
    `);

    // ─── Immutable audit_log trigger ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_shrink()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF jsonb_array_length(NEW.audit_log) < jsonb_array_length(OLD.audit_log) THEN
          RAISE EXCEPTION 'audit_log on mission_contracts is append-only';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_mc_audit_log_immutable
      BEFORE UPDATE ON "mission_contracts"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_shrink()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_mc_audit_log_immutable ON "mission_contracts"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_audit_log_shrink()`);
    await queryRunner.query(`ALTER TABLE "transport_requests" DROP COLUMN IF EXISTS "proximity_alert_sent_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mission_contracts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contract_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contract_type_enum"`);
  }
}
