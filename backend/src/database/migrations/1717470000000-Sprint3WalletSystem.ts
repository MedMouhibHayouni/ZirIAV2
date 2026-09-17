import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint3WalletSystem1717470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "wallet_transactions_transaction_type_enum" AS ENUM('MISSION_PENDING', 'RELEASED', 'CANCELLED_REFUND', 'CONSULTATION_PENDING', 'CONSULTATION_RELEASED', 'AMBASSADOR_COMMISSION', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_COMPLETED', 'ADJUSTMENT')`);
    await queryRunner.query(`
      CREATE TABLE "user_wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "balance_available_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "balance_pending_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "total_earned_all_time_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "total_platform_commission_deducted_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_wallets_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_user_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_wallets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "transaction_type" "wallet_transactions_transaction_type_enum" NOT NULL,
        "amount_tnd" numeric(12,3) NOT NULL,
        "balance_after_tnd" numeric(12,3) NOT NULL,
        "reference_id" uuid,
        "reference_type" character varying,
        "description" text,
        "gross_amount_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "commission_amount_tnd" numeric(12,3) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallet_transactions_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "user_wallets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION block_wallet_transactions_modifications()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Wallet transactions are append-only. Modification or deletion is not allowed.';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER block_wallet_transactions_update_delete
      BEFORE UPDATE OR DELETE ON wallet_transactions
      FOR EACH ROW
      EXECUTE FUNCTION block_wallet_transactions_modifications();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS block_wallet_transactions_update_delete ON wallet_transactions`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS block_wallet_transactions_modifications`);
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE "user_wallets"`);
    await queryRunner.query(`DROP TYPE "wallet_transactions_transaction_type_enum"`);
  }
}
