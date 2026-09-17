import { MigrationInterface, QueryRunner } from 'typeorm';

export class FormalizeWellAndWaterProjectSchema1717860000000 implements MigrationInterface {
  name = 'FormalizeWellAndWaterProjectSchema1717860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── wells ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wells (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL,
        farmer_id UUID,
        well_name VARCHAR(200),
        lat NUMERIC(10,7),
        lng NUMERIC(10,7),
        depth_m NUMERIC(8,2),
        water_level_m NUMERIC(8,2),
        salinity_g_l NUMERIC(6,3),
        tds_mg_l NUMERIC(8,2),
        status VARCHAR(30) DEFAULT 'ACTIVE',
        geological_notes TEXT,
        anomaly_drawdown BOOLEAN DEFAULT false,
        anomaly_salinity BOOLEAN DEFAULT false,
        baseline_water_level_m NUMERIC(8,2),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Add columns that may not exist on tables created by the old raw-SQL path
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wells' AND column_name='baseline_water_level_m') THEN
          ALTER TABLE wells ADD COLUMN baseline_water_level_m NUMERIC(8,2);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wells' AND column_name='updated_at') THEN
          ALTER TABLE wells ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        END IF;
      END $$;
    `);

    // FKs (safe to run multiple times — IF NOT EXISTS on index handles re-runs)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wells_expert_id') THEN
          ALTER TABLE wells ADD CONSTRAINT fk_wells_expert_id FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wells_farmer_id') THEN
          ALTER TABLE wells ADD CONSTRAINT fk_wells_farmer_id FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wells_expert_id ON wells(expert_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wells_farmer_id ON wells(farmer_id);`);

    // ── well_measurements ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS well_measurements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        well_id UUID NOT NULL,
        water_level_m NUMERIC(8,2),
        salinity_g_l NUMERIC(6,3),
        notes TEXT,
        measured_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_well_measurements_well_id') THEN
          ALTER TABLE well_measurements ADD CONSTRAINT fk_well_measurements_well_id FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_well_measurements_well_id ON well_measurements(well_id);`);

    // ── water_projects ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS water_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL,
        farmer_id UUID NOT NULL,
        project_name VARCHAR(200),
        irrigation_type VARCHAR(50),
        status VARCHAR(30) DEFAULT 'DESIGN',
        area_ha NUMERIC(8,2),
        installation_date DATE,
        estimated_completion_date DATE,
        notes TEXT,
        design_pdf_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='water_projects' AND column_name='updated_at') THEN
          ALTER TABLE water_projects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_water_projects_expert_id') THEN
          ALTER TABLE water_projects ADD CONSTRAINT fk_water_projects_expert_id FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_water_projects_farmer_id') THEN
          ALTER TABLE water_projects ADD CONSTRAINT fk_water_projects_farmer_id FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_water_projects_expert_id ON water_projects(expert_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_water_projects_farmer_id ON water_projects(farmer_id);`);

    // ── water_calculations ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS water_calculations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL,
        farmer_id UUID,
        crop_type VARCHAR(100),
        stage VARCHAR(50),
        governorate VARCHAR(100),
        area_ha NUMERIC(10,2),
        kc NUMERIC(5,3),
        eto NUMERIC(5,2),
        etc_mm_day NUMERIC(5,2),
        m3_per_ha_day NUMERIC(8,2),
        total_m3_day NUMERIC(10,2),
        recommendation TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Backfill baseline_water_level_m for existing wells where it is NULL
    await queryRunner.query(`
      UPDATE wells SET baseline_water_level_m = water_level_m WHERE baseline_water_level_m IS NULL;
    `);

    // Backfill updated_at for existing rows
    await queryRunner.query(`
      UPDATE wells SET updated_at = created_at WHERE updated_at IS NULL;
    `);
    await queryRunner.query(`
      UPDATE water_projects SET updated_at = created_at WHERE updated_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_water_projects_farmer_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_water_projects_expert_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS water_calculations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS water_projects;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_well_measurements_well_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS well_measurements;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wells_farmer_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wells_expert_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS wells;`);
  }
}
