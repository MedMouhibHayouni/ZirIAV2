import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStorageModule1717840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create storage_facilities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS storage_facilities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        governorate VARCHAR(100) NOT NULL,
        delegation VARCHAR(100),
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        photos JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Index 1: StorageFacility(governorate, is_active)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_facility_gov_active
      ON storage_facilities(governorate, is_active);
    `);

    // 2. Create storage_rooms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS storage_rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        facility_id UUID NOT NULL REFERENCES storage_facilities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        room_type VARCHAR(100) NOT NULL,
        capacity_m3 DECIMAL(10, 2) NOT NULL,
        capacity_tonnes DECIMAL(10, 2),
        pricing_mode VARCHAR(50) NOT NULL DEFAULT 'PAR_M3_JOUR',
        price_per_m3_day DECIMAL(10, 3),
        flat_price DECIMAL(10, 3),
        electricity_billing_mode VARCHAR(50) NOT NULL DEFAULT 'FORFAIT_MENSUEL',
        electricity_rate DECIMAL(10, 3) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Index 2: StorageRoom(facility_id, room_type, is_active)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_room_facility_type_active
      ON storage_rooms(facility_id, room_type, is_active);
    `);

    // 3. Create storage_reservations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS storage_reservations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES storage_rooms(id) ON DELETE CASCADE,
        renter_id UUID REFERENCES users(id) ON DELETE SET NULL,
        occupied_capacity DECIMAL(10, 2) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'EN_ATTENTE',
        total_price DECIMAL(10, 3) DEFAULT 0,
        next_payment_due_date TIMESTAMP WITH TIME ZONE,
        initial_occupant_label VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Index 3: StorageReservation(room_id, status, start_date, end_date)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_reservation_room_status_dates
      ON storage_reservations(room_id, status, start_date, end_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_storage_reservation_room_status_dates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS storage_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_storage_room_facility_type_active;`);
    await queryRunner.query(`DROP TABLE IF EXISTS storage_rooms;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_storage_facility_gov_active;`);
    await queryRunner.query(`DROP TABLE IF EXISTS storage_facilities;`);
  }
}
