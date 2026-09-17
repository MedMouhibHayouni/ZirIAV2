import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Role } from './common/enums/role.enum';
import { StorageFacility } from './storage/entities/storage-facility.entity';
import { StorageRoom, StoragePricingMode, StoragePricingUnit, ElectricityBillingMode } from './storage/entities/storage-room.entity';
import { StorageReservation, StorageReservationStatus, StoragePaymentStatus } from './storage/entities/storage-reservation.entity';
import * as bcrypt from 'bcrypt';

async function seedStorage() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Starting Real-World Cold Storage (Chambre Froide) Seed Generation...');

  const userRepo = dataSource.getRepository(User);
  const facilityRepo = dataSource.getRepository(StorageFacility);
  const roomRepo = dataSource.getRepository(StorageRoom);
  const reservationRepo = dataSource.getRepository(StorageReservation);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create or get Frigoriste User
  let frigoriste = await userRepo.findOne({ where: { phone: '+21698000111' } });
  if (!frigoriste) {
    frigoriste = userRepo.create({
      phone: '+21698000111',
      email: 'frigoriste.kasserine@ziria.tn',
      name: 'Hassen Frigoriste (Kasserine)',
      governorate: 'Kasserine',
      delegation: 'Kasserine Nord',
      role: Role.EQUIP_OWNER,
      equipment_type: 'Frigoriste',
      password_hash: passwordHash,
      verified: true,
    });
    frigoriste = await userRepo.save(frigoriste);
    console.log('✅ Created Frigoriste User:', frigoriste.phone);
  } else {
    frigoriste.email = 'frigoriste.kasserine@ziria.tn';
    frigoriste.equipment_type = 'Frigoriste';
    await userRepo.save(frigoriste);
    console.log('ℹ️ Updated Frigoriste User:', frigoriste.phone);
  }

  // 2. Create or get Farmer User
  let farmer = await userRepo.findOne({ where: { phone: '+21698000222' } });
  if (!farmer) {
    farmer = userRepo.create({
      phone: '+21698000222',
      email: 'farmer.kasserine@ziria.tn',
      name: 'Sami Agriculteur (Kasserine)',
      governorate: 'Kasserine',
      delegation: 'Sbeitla',
      role: Role.FARMER,
      password_hash: passwordHash,
      verified: true,
    });
    farmer = await userRepo.save(farmer);
    console.log('✅ Created Farmer User:', farmer.phone);
  } else {
    farmer.email = 'farmer.kasserine@ziria.tn';
    await userRepo.save(farmer);
  }

  // 3. Create Storage Facility
  let facility = await facilityRepo.findOne({ where: { owner_id: frigoriste.id, name: 'Complexe Frigorifique Kasserine Nord' } });
  if (!facility) {
    facility = facilityRepo.create({
      owner_id: frigoriste.id,
      name: 'Complexe Frigorifique Kasserine Nord',
      governorate: 'Kasserine',
      delegation: 'Kasserine Nord',
      latitude: 35.1676,
      longitude: 8.8365,
      photos: [
        { type: 'photo', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', position: 1 },
        { type: 'photo', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80', position: 2 },
      ],
      is_active: true,
    });
    facility = await facilityRepo.save(facility);
    console.log('✅ Created Storage Facility:', facility.name);
  }

  // 4. Create Multi-Unit Rooms with custom colors & badges
  const existingRooms = await roomRepo.find({ where: { facility_id: facility.id } });
  if (existingRooms.length === 0) {
    const room1 = await roomRepo.save(roomRepo.create({
      facility_id: facility.id,
      name: 'Chambre Positive Pommes (Alpha)',
      room_type: 'Chambre positive (0°C à +12°C)',
      capacity_m3: 100,
      total_capacity: 1000,
      pricing_unit: StoragePricingUnit.CAJOT,
      unit_price: 0.250,
      pricing_mode: StoragePricingMode.PAR_M3_JOUR,
      compressor_power_kw: 18,
      color_hex: '#10b981', // Chilled Emerald
      equipment_badges: ['Double Compresseur', 'Humidificateur Auto', 'Groupe de Secours'],
      grid_order: 1,
      electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL,
      electricity_rate: 150,
      is_active: true,
    }));

    const room2 = await roomRepo.save(roomRepo.create({
      facility_id: facility.id,
      name: 'Chambre Négative Congélation (SubZero)',
      room_type: 'Chambre négative (-18°C)',
      capacity_m3: 80,
      total_capacity: 500,
      pricing_unit: StoragePricingUnit.KG,
      unit_price: 0.050,
      pricing_mode: StoragePricingMode.PAR_M3_JOUR,
      compressor_power_kw: 25,
      color_hex: '#0ea5e9', // Deep Frozen Blue
      equipment_badges: ['Dégivrage Gaz Chaud', 'Sonde Température IoT', 'Alarme Porte Open'],
      grid_order: 2,
      electricity_billing_mode: ElectricityBillingMode.TARIF_KWH,
      electricity_rate: 0.35,
      is_active: true,
    }));

    const room3 = await roomRepo.save(roomRepo.create({
      facility_id: facility.id,
      name: 'Stockage Sec Hangar B',
      room_type: 'Stockage sec',
      capacity_m3: 200,
      total_capacity: 200,
      pricing_unit: StoragePricingUnit.M3,
      unit_price: 1.200,
      pricing_mode: StoragePricingMode.PAR_M3_JOUR,
      compressor_power_kw: 5,
      color_hex: '#f59e0b', // Fruit Storage Amber
      equipment_badges: ['Ventilation Forte', 'Système Anti-Rongeurs'],
      grid_order: 3,
      electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL,
      electricity_rate: 50,
      is_active: true,
    }));

    const room4 = await roomRepo.save(roomRepo.create({
      facility_id: facility.id,
      name: 'Chambre Positive Huile/Jus (Beta)',
      room_type: 'Chambre positive (0°C à +12°C)',
      capacity_m3: 120,
      total_capacity: 10000,
      pricing_unit: StoragePricingUnit.LITRE,
      unit_price: 0.020,
      pricing_mode: StoragePricingMode.PAR_M3_JOUR,
      compressor_power_kw: 20,
      color_hex: '#8b5cf6', // Liquid Storage Purple
      equipment_badges: ['Cuves Inox', 'Système Azote'],
      grid_order: 4,
      electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL,
      electricity_rate: 180,
      is_active: true,
    }));

    console.log('✅ Created 4 Multi-Unit Storage Rooms');

    // 5. Create Reservations with Overdue Debt Cases & Pro-Rata Electricity
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 65); // 2+ months overdue

    // Reservation 1: Active reservation for Farmer in Room 1 (400 cajots / 1000 total = 40%)
    await reservationRepo.save(reservationRepo.create({
      room_id: room1.id,
      renter_id: farmer.id,
      occupied_capacity: 400,
      occupied_unit: StoragePricingUnit.CAJOT,
      client_name: 'Sami Agriculteur (Kasserine)',
      client_phone: '+21698000222',
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: StorageReservationStatus.CONFIRMEE,
      payment_status: StoragePaymentStatus.A_JOUR,
      unpaid_months_count: 0,
      total_price: 3000,
      amount_paid_tnd: 3000,
      amount_due_tnd: 0,
      next_payment_due_date: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    }));

    // Reservation 2: Offline client 2 months overdue in Room 1 (450 cajots)
    await reservationRepo.save(reservationRepo.create({
      room_id: room1.id,
      renter_id: null,
      initial_occupant_label: 'Société Les Pommes Sbeitla',
      client_name: 'Société Les Pommes Sbeitla',
      client_phone: '+21698123456',
      occupied_capacity: 450,
      occupied_unit: StoragePricingUnit.CAJOT,
      start_date: overdueDate,
      status: StorageReservationStatus.EN_COURS,
      payment_status: StoragePaymentStatus.EN_RETARD,
      unpaid_months_count: 2,
      total_price: 6750,
      amount_paid_tnd: 3000,
      amount_due_tnd: 3750,
      next_payment_due_date: overdueDate,
    }));

    // Reservation 3: Second reservation for SAME offline client in Room 4 (5000 Litres) -> tests Unified Ledger
    await reservationRepo.save(reservationRepo.create({
      room_id: room4.id,
      renter_id: null,
      initial_occupant_label: 'Société Les Pommes Sbeitla',
      client_name: 'Société Les Pommes Sbeitla',
      client_phone: '+21698123456',
      occupied_capacity: 5000,
      occupied_unit: StoragePricingUnit.LITRE,
      start_date: new Date(),
      status: StorageReservationStatus.EN_COURS,
      payment_status: StoragePaymentStatus.PAYE_PARTIEL,
      unpaid_months_count: 1,
      total_price: 3000,
      amount_paid_tnd: 1500,
      amount_due_tnd: 1500,
      next_payment_due_date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    }));

    console.log('✅ Created Demo Reservations with 2-Month Overdue Debt & Unified Client Phone Ledger Test Cases');
  }

  console.log('\n🎉 Storage Seed Completed Successfully!');
  console.log('--------------------------------------------------');
  console.log('FRIGORISTE ACCOUNT: Phone "+21698000111" OR Email "frigoriste.kasserine@ziria.tn" / Password "Password123!"');
  console.log('FARMER ACCOUNT:     Phone "+21698000222" OR Email "farmer.kasserine@ziria.tn" / Password "Password123!"');
  console.log('--------------------------------------------------\n');

  await app.close();
}

seedStorage().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
