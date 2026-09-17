import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpertMessages1717600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expert_messages (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body         TEXT NOT NULL,
        read_at      TIMESTAMPTZ DEFAULT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_em_sender_receiver ON expert_messages (sender_id, receiver_id);
      CREATE INDEX IF NOT EXISTS idx_em_receiver_sender ON expert_messages (receiver_id, sender_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS expert_messages;`);
  }
}
