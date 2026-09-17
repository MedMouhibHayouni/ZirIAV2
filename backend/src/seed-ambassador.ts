import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users/entities/user.entity';
import { Role } from './common/enums/role.enum';
import { Zone } from './ambassador/entities/zone.entity';
import { FieldReport } from './ambassador/entities/field-report.entity';
import { DiseaseDetection } from './disease-detections/entities/disease-detection.entity';
import { Parcel } from './parcels/entities/parcel.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('Seeding Ambassador & Expert Ecosystem...');
  
  const userRepo = dataSource.getRepository(User);
  const zoneRepo = dataSource.getRepository(Zone);
  const reportRepo = dataSource.getRepository(FieldReport);
  const detectionRepo = dataSource.getRepository(DiseaseDetection);
  const parcelRepo = dataSource.getRepository(Parcel);

  // 1. Create Zone
  const zone = zoneRepo.create({
    name: 'Zone Kasserine Nord',
    delegation: 'Sbeitla',
    governorate: 'Kasserine',
    center_lat: 35.234, center_lng: 9.123
  });
  await zoneRepo.save(zone);

  const password = await bcrypt.hash('Admin123!', 10);

  // 2. Create Ambassador
  const ambassador = userRepo.create({
    name: 'Ahmed Ben Ali (Ambassadeur)',
    email: 'ahmed.amb@ziria.tn',
    phone: '21699887766',
    password_hash: password,
    role: Role.FARMER_AMBASSADOR,
    governorate: 'Kasserine',
    delegation: 'Sbeitla',
    zone_id: zone.id
  });
  await userRepo.save(ambassador);

  // Link zone to ambassador
  zone.ambassador_id = ambassador.id;
  await zoneRepo.save(zone);

  // 3. Create Expert CRDA
  const expert = userRepo.create({
    name: 'Dr. Youssef (CRDA)',
    email: 'youssef.crda@ziria.tn',
    phone: '21655443322',
    password_hash: password,
    role: Role.EXPERT,
    governorate: 'Kasserine',
  });
  await userRepo.save(expert);

  // 4. Create Farmers with Privacy Levels
  const farmer1 = userRepo.create({
    name: 'Mohamed Salah', phone: '21611223344', email: 'med@mock.com', password_hash: password,
    role: Role.FARMER, governorate: 'Kasserine', delegation: 'Sbeitla',
    zone_id: zone.id, privacy_level: 'OPEN'
  });
  await userRepo.save(farmer1);

  const farmer2 = userRepo.create({
    name: 'Ali Mansour', phone: '21622334455', email: 'ali@mock.com', password_hash: password,
    role: Role.FARMER, governorate: 'Kasserine', delegation: 'Sbeitla',
    zone_id: zone.id, privacy_level: 'SEMI_PUBLIC'
  });
  await userRepo.save(farmer2);

  const farmer3 = userRepo.create({
    name: 'Anonymous Farmer', phone: '21633445566', email: 'anon@mock.com', password_hash: password,
    role: Role.FARMER, governorate: 'Kasserine', delegation: 'Sbeitla',
    zone_id: zone.id, privacy_level: 'ANONYMOUS'
  });
  await userRepo.save(farmer3);

  // 5. Create Parcels for Farmers
  const p1 = parcelRepo.create({ name: 'Oliveraie MS', area_ha: 2.5, crop_type: 'Olives', owner_id: farmer1.id });
  await parcelRepo.save(p1);
  const p2 = parcelRepo.create({ name: 'Champs Ali', area_ha: 4.0, crop_type: 'Tomates', owner_id: farmer2.id });
  await parcelRepo.save(p2);
  const p3 = parcelRepo.create({ name: 'Secret Field', area_ha: 1.5, crop_type: 'Piment', owner_id: farmer3.id });
  await parcelRepo.save(p3);

  // 6. Create Field Reports (for Triage)
  const report = reportRepo.create({
    zone_id: zone.id, farmer_id: farmer2.id, ambassador_id: ambassador.id,
    description: 'Taches jaunes suspectes sur feuilles de tomates, propagation rapide depuis 2 jours.',
    severity: 'HIGH' as any, affected_crop_type: 'Tomates', status: 'PENDING' as any
  });
  await reportRepo.save(report);

  // 7. Create AI Detections requiring Expert Validation
  const detection = detectionRepo.create({
    reporter_id: farmer1.id, parcel_id: p1.id, disease_name: 'Spilocaea oleaginea (Oeil de paon)',
    confidence_score: 0.82, urgency: 'MEDIUM' as any, requires_expert_validation: true,
    photo_url: 'https://images.unsplash.com/photo-1590680459528-941910af5529?w=800&q=80',
    lat: 35.234, lng: 9.123, crop_type: 'Olives'
  });
  await detectionRepo.save(detection);

  console.log('✅ Seed completed: Zone, Ambassador, Expert, 3 Farmers, 1 Field Report, 1 AI Detection.');
  await app.close();
}

bootstrap();
