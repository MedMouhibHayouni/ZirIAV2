import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstitutionsCoreSchema1727000000000 implements MigrationInterface {
  name = 'CreateInstitutionsCoreSchema1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add INSTITUTION to Role enum if PostgreSQL enum type exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'INSTITUTION';
        END IF;
      END $$;
    `);

    // Create ENUM types for institution
    await queryRunner.query(`
      CREATE TYPE "institutions_type_enum" AS ENUM('APIA', 'CRDA');
      CREATE TYPE "institutions_level_enum" AS ENUM('REGIONAL', 'NATIONAL');
      CREATE TYPE "institution_members_officerole_enum" AS ENUM('DIRECTOR', 'AGENT', 'VIEWER');
    `);

    // Create institutions table
    await queryRunner.query(`
      CREATE TABLE "institutions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "institutions_type_enum" NOT NULL,
        "level" "institutions_level_enum" NOT NULL DEFAULT 'REGIONAL',
        "governorate" character varying(100),
        "name" character varying(255) NOT NULL,
        "address" text,
        "phone" character varying(50),
        "email" character varying(150),
        "openingHours" character varying(100),
        "location" geometry(Point,4326),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institutions_id" PRIMARY KEY ("id")
      );
    `);

    // Create institution_members table
    await queryRunner.query(`
      CREATE TABLE "institution_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "institutionId" uuid NOT NULL,
        "officeRole" "institution_members_officerole_enum" NOT NULL DEFAULT 'AGENT',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institution_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_institution_members_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_institution_members_institutionId" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_institutions_type_gov" ON "institutions" ("type", "governorate");`);
    await queryRunner.query(`CREATE INDEX "IDX_inst_members_user" ON "institution_members" ("userId");`);
    await queryRunner.query(`CREATE INDEX "IDX_inst_members_inst" ON "institution_members" ("institutionId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_members";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institutions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "institution_members_officerole_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "institutions_level_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "institutions_type_enum";`);
  }
}
