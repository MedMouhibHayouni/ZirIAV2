import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceStorageRealWorldFields1717850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. StorageRoom enhancements
    await queryRunner.query(`
      ALTER TABLE storage_rooms
      ADD COLUMN IF NOT EXISTS total_capacity DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(50) DEFAULT 'M3',
      ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 3),
      ADD COLUMN IF NOT EXISTS compressor_power_kw DECIMAL(10, 2) DEFAULT 15,
      ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20) DEFAULT '#0ea5e9',
      ADD COLUMN IF NOT EXISTS equipment_badges JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS grid_order INT DEFAULT 0;
    `);

    // Backfill total_capacity from capacity_m3 if null
    await queryRunner.query(`
      UPDATE storage_rooms
      SET total_capacity = capacity_m3,
          unit_price = COALESCE(price_per_m3_day, flat_price, 1.5)
      WHERE total_capacity IS NULL;
    `);

    // 2. StorageReservation enhancements
    await queryRunner.query(`
      ALTER TABLE storage_reservations
      ADD COLUMN IF NOT EXISTS occupied_unit VARCHAR(50) DEFAULT 'M3',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'A_JOUR',
      ADD COLUMN IF NOT EXISTS unpaid_months_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS amount_paid_tnd DECIMAL(10, 3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS amount_due_tnd DECIMAL(10, 3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);
    `);

    // Index for client phone ledger lookup & overdue tracking
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_reservation_client_phone
      ON storage_reservations(client_phone, payment_status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_storage_reservation_client_phone;`);
    await queryRunner.query(`
      ALTER TABLE storage_reservations
      DROP COLUMN IF EXISTS occupied_unit,
      DROP COLUMN IF EXISTS payment_status,
      DROP COLUMN IF EXISTS unpaid_months_count,
      DROP COLUMN IF EXISTS amount_paid_tnd,
      DROP COLUMN IF EXISTS amount_due_tnd,
      DROP COLUMN IF EXISTS client_name,
      DROP COLUMN IF EXISTS client_phone;
    `);
    await queryRunner.query(`
      ALTER TABLE storage_rooms
      DROP COLUMN IF EXISTS total_capacity,
      DROP COLUMN IF EXISTS pricing_unit,
      DROP COLUMN IF EXISTS unit_price,
      DROP COLUMN IF EXISTS compressor_power_kw,
      DROP COLUMN IF EXISTS color_hex,
      DROP COLUMN IF EXISTS equipment_badges,
      DROP COLUMN IF EXISTS grid_order;
    `);
  }
}
