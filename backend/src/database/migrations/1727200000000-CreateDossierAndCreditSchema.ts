import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDossierAndCreditSchema1727200000000 implements MigrationInterface {
  name = 'CreateDossierAndCreditSchema1727200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "institution_dossiers_type_enum" AS ENUM('INVESTMENT', 'CREDIT', 'SUBSIDY_APPLICATION', 'TECHNICAL_REQUEST');
      CREATE TYPE "dossier_documents_reviewstatus_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');
    `);

    // institution_dossiers table
    await queryRunner.query(`
      CREATE TABLE "institution_dossiers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referenceNumber" character varying(50) NOT NULL,
        "type" "institution_dossiers_type_enum" NOT NULL,
        "farmerId" uuid NOT NULL,
        "institutionId" uuid NOT NULL,
        "assignedAgentId" uuid,
        "status" character varying(50) NOT NULL DEFAULT 'SUBMITTED',
        "programName" character varying(150) NOT NULL,
        "requestedAmountTnd" numeric(12,3) NOT NULL DEFAULT 0.000,
        "approvedAmountTnd" numeric(12,3),
        "projectSummary" text,
        "internalAgentNotes" text,
        "daysInCurrentStatus" integer NOT NULL DEFAULT 0,
        "isOverdue" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institution_dossiers_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_institution_dossiers_referenceNumber" UNIQUE ("referenceNumber"),
        CONSTRAINT "FK_institution_dossiers_farmerId" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_institution_dossiers_institutionId" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_institution_dossiers_assignedAgentId" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // dossier_documents table
    await queryRunner.query(`
      CREATE TABLE "dossier_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dossierId" uuid NOT NULL,
        "documentName" character varying(150) NOT NULL,
        "documentType" character varying(50) NOT NULL DEFAULT 'PDF',
        "fileUrl" text,
        "reviewStatus" "dossier_documents_reviewstatus_enum" NOT NULL DEFAULT 'PENDING',
        "rejectionReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dossier_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dossier_documents_dossierId" FOREIGN KEY ("dossierId") REFERENCES "institution_dossiers"("id") ON DELETE CASCADE
      );
    `);

    // dossier_status_history table
    await queryRunner.query(`
      CREATE TABLE "dossier_status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dossierId" uuid NOT NULL,
        "previousStatus" character varying(50),
        "newStatus" character varying(50) NOT NULL,
        "changedByUserId" uuid NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dossier_status_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dossier_status_history_dossierId" FOREIGN KEY ("dossierId") REFERENCES "institution_dossiers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dossier_status_history_changedByUserId" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_dossiers_inst_status" ON "institution_dossiers" ("institutionId", "status");`);
    await queryRunner.query(`CREATE INDEX "IDX_dossiers_farmer" ON "institution_dossiers" ("farmerId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dossier_status_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dossier_documents";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_dossiers";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dossier_documents_reviewstatus_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "institution_dossiers_type_enum";`);
  }
}
