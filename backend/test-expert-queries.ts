import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'ziria_db',
});

async function run() {
  await ds.initialize();
  console.log('Connected to DB');
  const expertId = '00000000-0000-0000-0000-000000000000'; // dummy uuid
  try {
    await ds.query(`SELECT COUNT(*) as farmers FROM users WHERE role = 'FARMER' AND governorate = (SELECT governorate FROM users WHERE id = $1)`, [expertId]);
    console.log('getDashboardStats Query 1 SUCCESS');
  } catch (e) {
    console.error('getDashboardStats Query 1 ERROR:', e.message);
  }

  try {
    await ds.query(`
      SELECT dd.id, 'AI_DIAGNOSIS' as case_type, dd.disease_name as title, dd.urgency as severity,
             dd.created_at, dd.photo_url, u.id as farmer_id, u.name as farmer_name, u.privacy_level, p.crop_type, u.delegation
      FROM disease_detections dd
      JOIN users u ON u.id = dd.reporter_id
      LEFT JOIN parcels p ON p.id = dd.parcel_id
      WHERE dd.requires_expert_validation = true
      ORDER BY CASE dd.urgency WHEN 'CRITICAL' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, dd.created_at DESC
    `);
    console.log('getPendingCases Query 1 SUCCESS');
  } catch (e) {
    console.error('getPendingCases Query 1 ERROR:', e.message);
  }

  try {
    await ds.query(`
      SELECT fr.id, 'FIELD_REPORT' as case_type, fr.description as title, fr.severity,
             fr.created_at, fr.photo_urls->>0 as photo_url, u.id as farmer_id, u.name as farmer_name, u.privacy_level, fr.affected_crop_type as crop_type, z.delegation
      FROM field_reports fr
      JOIN zones z ON z.id = fr.zone_id
      LEFT JOIN users u ON u.id = fr.farmer_id
      WHERE fr.status = 'PENDING'
      ORDER BY CASE fr.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, fr.created_at DESC
    `);
    const rows = await ds.query(`SELECT * FROM seasonal_crop_risks`);
    console.log('seasonal_crop_risks row count:', rows.length);
    console.log('Sample rows:', rows.slice(0, 10));
  } catch (e) {
    console.error('seasonal_crop_risks Query ERROR:', e.message);
  }
  await ds.destroy();
}
run().catch(console.error);
