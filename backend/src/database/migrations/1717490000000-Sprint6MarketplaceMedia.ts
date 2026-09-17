import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sprint6MarketplaceMedia1717490000000 implements MigrationInterface {
  name = 'Sprint6MarketplaceMedia1717490000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings" 
        ADD COLUMN "media_items" JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN "listing_quality_score" SMALLINT NOT NULL DEFAULT 0,
        ADD COLUMN "primary_media_url" VARCHAR
    `);

    // Migrate existing photo_urls simple-array to media_items jsonb
    await queryRunner.query(`
      UPDATE "marketplace_listings"
      SET 
        "media_items" = COALESCE(
          (
            SELECT json_agg(json_build_object('type', 'photo', 'url', TRIM(elem), 'position', idx - 1))::jsonb
            FROM unnest(string_to_array("photo_urls", ',')) WITH ORDINALITY AS u(elem, idx)
            WHERE TRIM(elem) <> ''
          ),
          '[]'::jsonb
        ),
        "primary_media_url" = (
          SELECT TRIM(elem)
          FROM unnest(string_to_array("photo_urls", ',')) WITH ORDINALITY AS u(elem, idx)
          WHERE TRIM(elem) <> ''
          LIMIT 1
        )
      WHERE "photo_urls" IS NOT NULL AND "photo_urls" <> ''
    `);

    // Drop old photo_urls column
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings" DROP COLUMN "photo_urls"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Add photo_urls back
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings" ADD COLUMN "photo_urls" TEXT
    `);

    // Reconstruct photo_urls from media_items
    await queryRunner.query(`
      UPDATE "marketplace_listings"
      SET "photo_urls" = (
        SELECT string_agg(item->>'url', ',')
        FROM jsonb_array_elements("media_items") AS item
        WHERE item->>'type' = 'photo'
      )
    `);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings" 
        DROP COLUMN "media_items",
        DROP COLUMN "listing_quality_score",
        DROP COLUMN "primary_media_url"
    `);
  }
}
