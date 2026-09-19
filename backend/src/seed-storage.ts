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

  console.log('🌱 Generating 5 Frigoristes across Tunisia...\n');

  const userRepo = dataSource.getRepository(User);
  const facilityRepo = dataSource.getRepository(StorageFacility);
  const roomRepo = dataSource.getRepository(StorageRoom);
  const reservationRepo = dataSource.getRepository(StorageReservation);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ─── Frigoriste Data ────────────────────────────────────────────────
  const frigoristes = [
    {
      phone: '+21698000111', email: 'frigoriste.kasserine@ziria.tn', name: 'Hassen Ben Ali',
      governorate: 'Kasserine', delegation: 'Kasserine Nord',
      facilities: [{
        name: 'Complexe Frigorifique Kasserine Nord',
        governorate: 'Kasserine', delegation: 'Kasserine Nord',
        latitude: 35.1676, longitude: 8.8365,
        rooms: [
          {
            name: 'Chambre Positive Pommes (Alpha)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 100, total_capacity: 1000, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.250, unit_price: 0.250,
            compressor_power_kw: 18, color_hex: '#10b981',
            equipment_badges: ['Double Compresseur Bitzer', 'Humidificateur Auto 85%', 'Groupe Électrogène 50kVA', 'Sonde IoT Temp/Hygro', 'Alarme Incendie AFDD'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 150,
            grid_order: 1,
          },
          {
            name: 'Chambre Négative Congélation (SubZero)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 80, total_capacity: 500, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.050, unit_price: 0.050,
            compressor_power_kw: 25, color_hex: '#0ea5e9',
            equipment_badges: ['Dégivrage Gaz Chaud CO₂', 'Sonde IoT -40°C', 'Alarme Ouverture Porte', 'Isolation Panneaux PUR 120mm', 'Double Sas d\'Entrée'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.350,
            grid_order: 2,
          },
          {
            name: 'Stockage Sec Hangar B', room_type: 'Stockage sec',
            capacity_m3: 200, total_capacity: 200, pricing_unit: StoragePricingUnit.M3,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 1.200, unit_price: 1.200,
            compressor_power_kw: 5, color_hex: '#f59e0b',
            equipment_badges: ['Ventilation Forcée 2500m³/h', 'Déshumidificateur Industriel', 'Système Anti-Rongeurs Ultrason', 'Grillage Sécurisé'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 50,
            grid_order: 3,
          },
          {
            name: 'Chambre Positive Huile/Jus (Beta)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 120, total_capacity: 10000, pricing_unit: StoragePricingUnit.LITRE,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.020, unit_price: 0.020,
            compressor_power_kw: 20, color_hex: '#8b5cf6',
            equipment_badges: ['Cuves Inox 316L 5000L', 'Système Azote Inerte', 'Pompe Transfert 5m³/h', 'Filtration HEPA H13'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 180,
            grid_order: 4,
          },
        ],
      }],
    },
    {
      phone: '+21698000333', email: 'frigoriste.sidibouzid@ziria.tn', name: 'Mohamed Trabelsi',
      governorate: 'Sidi Bouzid', delegation: 'Sidi Bouzid Ville',
      facilities: [{
        name: 'Entrepôt Frigorifique Sidi Bouzid Central',
        governorate: 'Sidi Bouzid', delegation: 'Sidi Bouzid Ville',
        latitude: 34.7406, longitude: 9.4839,
        rooms: [
          {
            name: 'Salle Olive Positive (Olio)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 150, total_capacity: 12000, pricing_unit: StoragePricingUnit.LITRE,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.015, unit_price: 0.015,
            compressor_power_kw: 22, color_hex: '#65a30d',
            equipment_badges: ['Cuves Acier Inoxydable 304', 'Régulation Temp ±0.5°C', 'Compteur IoT Volume', 'Éclairage LED Anti-Explosion'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 200,
            grid_order: 1,
          },
          {
            name: 'Chambre Congélation Rapide (Flash)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 60, total_capacity: 300, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.080, unit_price: 0.080,
            compressor_power_kw: 30, color_hex: '#0284c7',
            equipment_badges: ['Congélation Blast -35°C', 'Ventilateurs Circulaires x6', 'Défrost Électrique Auto', 'Capteurs PT100 x8', 'Groupe Frigorifique Copeland'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.380,
            grid_order: 2,
          },
          {
            name: 'Hangar Séché Grains (Céréales)', room_type: 'Stockage sec',
            capacity_m3: 300, total_capacity: 300, pricing_unit: StoragePricingUnit.M3,
            pricing_mode: StoragePricingMode.FORFAIT_PERIODE, flat_price: 4500, unit_price: 15,
            compressor_power_kw: 3, color_hex: '#d97706',
            equipment_badges: ['Ventilation Axiale 4000m³/h', 'Hygromètre Digital', 'Grille Anti-Insectes', 'Balancelle Pese-Farine'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 75,
            grid_order: 3,
          },
          {
            name: 'Chambre Mixte Légumes (Verdura)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 80, total_capacity: 800, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.300, unit_price: 0.300,
            compressor_power_kw: 15, color_hex: '#22c55e',
            equipment_badges: ['Éthylène Scrubber', 'Ventilation_directionnelle', 'Caméra IP 360°', 'Bacs à roulettes ISO'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 120,
            grid_order: 4,
          },
        ],
      }],
    },
    {
      phone: '+21698000555', email: 'frigoriste.sfax@ziria.tn', name: 'Ahmed Sahli',
      governorate: 'Sfax', delegation: 'Sfax Ville',
      facilities: [{
        name: 'Complexe Frigorifique Sfax Maritime',
        governorate: 'Sfax', delegation: 'Sfax Maritime',
        latitude: 34.7406, longitude: 10.7603,
        rooms: [
          {
            name: 'Chambre Poissonnerie (Marine -25°C)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 200, total_capacity: 800, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.065, unit_price: 0.065,
            compressor_power_kw: 40, color_hex: '#0369a1',
            equipment_badges: ['Température -25°C Stable', 'Planchers Inox Antidérapants', 'Système Lavable JHP', 'Défrost Gaz Chaud 3x/jour', 'Caméras HACCP', 'Registre Température 21j'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.420,
            grid_order: 1,
          },
          {
            name: 'Chambre Fruits Tropicaux (+5°C)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 120, total_capacity: 600, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.280, unit_price: 0.280,
            compressor_power_kw: 22, color_hex: '#f97316',
            equipment_badges: ['Contrôle Atmosphère MA/CA', 'Régulateur O₂/CO₂', 'Humidistat Digital', 'Sonde Ethylène', 'Plateformes Élevées'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 220,
            grid_order: 2,
          },
          {
            name: 'Deep Freeze Thon (Sea Blast -40°C)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 100, total_capacity: 400, pricing_unit: StoragePricingUnit.TONNE,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.120, unit_price: 0.120,
            compressor_power_kw: 50, color_hex: '#1e40af',
            equipment_badges: ['Blast Freeze -40°C', 'Compresseurs Bitzer 6FE x2', 'Pompe de Glace Frappée', 'Porte Coulissante Inox 3m', 'Système Désinfection UV'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.450,
            grid_order: 3,
          },
          {
            name: 'Stockage Emballages & Palettes', room_type: 'Stockage sec',
            capacity_m3: 400, total_capacity: 400, pricing_unit: StoragePricingUnit.PALETTE,
            pricing_mode: StoragePricingMode.FORFAIT_PERIODE, flat_price: 3200, unit_price: 40,
            compressor_power_kw: 2, color_hex: '#78716c',
            equipment_badges: ['Rack Métallique 4 Niveaux', 'Transpalette Électrique', 'Désinsectisation Trimestrielle', 'Éclairage 400 lux'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 40,
            grid_order: 4,
          },
          {
            name: 'Chambre Dégustation & Contrôle Qualité', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 30, total_capacity: 30, pricing_unit: StoragePricingUnit.M3,
            pricing_mode: StoragePricingMode.FORFAIT_PERIODE, flat_price: 800, unit_price: 26,
            compressor_power_kw: 8, color_hex: '#a855f7',
            equipment_badges: ['Microscope Numérique', 'Réfractomètre', 'Balance 0.01g', 'Enceinte de sécurité HACCP'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 30,
            grid_order: 5,
          },
        ],
      }],
    },
    {
      phone: '+21698000777', email: 'frigoriste.nabeul@ziria.tn', name: 'Karim Ben Ahmed',
      governorate: 'Nabeul', delegation: 'Nabeul Ville',
      facilities: [{
        name: 'Froid & Fraîcheur Nabeul Cap Bon',
        governorate: 'Nabeul', delegation: 'Nabeul Centre',
        latitude: 36.4561, longitude: 10.7378,
        rooms: [
          {
            name: 'Chambre Fraise & Framboise (+2°C)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 80, total_capacity: 500, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.350, unit_price: 0.350,
            compressor_power_kw: 16, color_hex: '#e11d48',
            equipment_badges: ['Temp +2°C ±0.3°C', 'Chambre à Atmosphère Contrôlée', 'Camion Frigo Ready', 'Plateformes Grilles Inox', 'Désinfection Ozone Automatique'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 190,
            grid_order: 1,
          },
          {
            name: 'Congélation Poisson Cap Bon (Marine -20°C)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 100, total_capacity: 450, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.070, unit_price: 0.070,
            compressor_power_kw: 28, color_hex: '#0891b2',
            equipment_badges: ['Sonde IoWAT -20°C', 'Défrost Hydraulique', 'Porte Battante Isolée 150mm', 'Siphon de Sol Industriel', 'Groupe Bitzer 4FES-5Y'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.390,
            grid_order: 2,
          },
          {
            name: 'Entrepôt Agrumes & Légumes', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 180, total_capacity: 1500, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.180, unit_price: 0.180,
            compressor_power_kw: 25, color_hex: '#eab308',
            equipment_badges: ['Convoyeur à Rouleaux', 'Bande transporteuse Sortie', 'Grille Anti-Mouches', 'Pèse-Bascule 2T', 'Éclairage Anti-Explosion Zone 2'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 250,
            grid_order: 3,
          },
          {
            name: 'Chambre Séchage Olives & Herbes', room_type: 'Stockage sec',
            capacity_m3: 60, total_capacity: 60, pricing_unit: StoragePricingUnit.M3,
            pricing_mode: StoragePricingMode.FORFAIT_PERIODE, flat_price: 2800, unit_price: 46,
            compressor_power_kw: 4, color_hex: '#a3a3a3',
            equipment_badges: ['Déshumidificateur 80L/j', 'Bacs Inox Perforés', 'Ventilation Croisée', 'Hygromètre WiFi'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 60,
            grid_order: 4,
          },
        ],
      }],
    },
    {
      phone: '+21698000999', email: 'frigoriste.gabes@ziria.tn', name: 'Sami Bouazizi',
      governorate: 'Gabès', delegation: 'Gabès Ville',
      facilities: [{
        name: 'Stockage & Logistique Gabès Sud',
        governorate: 'Gabès', delegation: 'Gabès Centre',
        latitude: 33.8815, longitude: 10.0982,
        rooms: [
          {
            name: 'Chambre Dattes Medjool (Degla +8°C)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 250, total_capacity: 5000, pricing_unit: StoragePricingUnit.CAJOT,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.120, unit_price: 0.120,
            compressor_power_kw: 30, color_hex: '#92400e',
            equipment_badges: ['Régulation Humidité 60% RH', 'Palettes Bois ISPM15', 'Grue Manual 2T', 'Ventilateurs Hélicoïdaux x4', 'Capteur Température x6'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 280,
            grid_order: 1,
          },
          {
            name: 'Chambre Congélation Dattes (-22°C)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 100, total_capacity: 800, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.055, unit_price: 0.055,
            compressor_power_kw: 35, color_hex: '#1d4ed8',
            equipment_badges: ['Deep Freeze -22°C', 'Compresseur hermétique Tecumseh', 'Système Défrost Electric 4x/j', 'Panneau Isolation PIR 140mm', 'Éclairage LED IP67'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.370,
            grid_order: 2,
          },
          {
            name: 'Chambre Huile d\'Olive Bio (+10°C)', room_type: 'Chambre positive (0°C à +12°C)',
            capacity_m3: 80, total_capacity: 8000, pricing_unit: StoragePricingUnit.LITRE,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.012, unit_price: 0.012,
            compressor_power_kw: 12, color_hex: '#15803d',
            equipment_badges: ['Cuves Inox 316L 2000L x4', 'Système Nitrogen Blanket', 'Pompe Volumétrique 3m³/h', 'Filtre Cartouche 5μm', 'Compteur Débit Electromagnétique'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 100,
            grid_order: 3,
          },
          {
            name: 'Hangar Materiel Agricole', room_type: 'Stockage sec',
            capacity_m3: 500, total_capacity: 500, pricing_unit: StoragePricingUnit.M3,
            pricing_mode: StoragePricingMode.FORFAIT_PERIODE, flat_price: 2200, unit_price: 4.40,
            compressor_power_kw: 0, color_hex: '#78716c',
            equipment_badges: ['Porte Motorisée 6x4m', 'Système Anti-Vol Vigicam', 'Grillage Toiture Polycarbonate', 'Point d\'Eau + Rigole', 'Bac Graisse Anti-Pollution'],
            electricity_billing_mode: ElectricityBillingMode.FORFAIT_MENSUEL, electricity_rate: 35,
            grid_order: 4,
          },
          {
            name: 'Chambre Congélation Poisson Cap Bon (-20°C)', room_type: 'Chambre négative (-18°C)',
            capacity_m3: 70, total_capacity: 350, pricing_unit: StoragePricingUnit.KG,
            pricing_mode: StoragePricingMode.PAR_M3_JOUR, price_per_m3_day: 0.075, unit_price: 0.075,
            compressor_power_kw: 22, color_hex: '#0e7490',
            equipment_badges: ['Bac de Dégorgement Inox', 'Système Lavable Haute Pression', 'Sonde IoWAT Qualité Air', 'Groupe Frigorifique Danfoss', 'Porte Coulissante Inox 2.5m'],
            electricity_billing_mode: ElectricityBillingMode.TARIF_KWH, electricity_rate: 0.400,
            grid_order: 5,
          },
        ],
      }],
    },
  ];

  // ─── Seed Execution ─────────────────────────────────────────────────
  let facilityCount = 0;
  let roomCount = 0;

  for (const fg of frigoristes) {
    // Create or get Frigoriste user
    let frigoriste = await userRepo.findOne({ where: { phone: fg.phone } });
    if (!frigoriste) {
      frigoriste = userRepo.create({
        phone: fg.phone,
        email: fg.email,
        name: fg.name,
        governorate: fg.governorate,
        delegation: fg.delegation,
        role: Role.EQUIP_OWNER,
        equipment_type: 'Frigoriste',
        password_hash: passwordHash,
        verified: true,
      });
      frigoriste = await userRepo.save(frigoriste);
      console.log(`✅ Created Frigoriste: ${fg.name} (${fg.governorate})`);
    } else {
      frigoriste.equipment_type = 'Frigoriste';
      frigoriste.name = fg.name;
      frigoriste.governorate = fg.governorate;
      frigoriste.delegation = fg.delegation;
      await userRepo.save(frigoriste);
      console.log(`ℹ️  Updated Frigoriste: ${fg.name}`);
    }

    for (const facData of fg.facilities) {
      let facility = await facilityRepo.findOne({ where: { owner_id: frigoriste.id, name: facData.name } });
      if (!facility) {
        facility = facilityRepo.create({
          owner_id: frigoriste.id,
          name: facData.name,
          governorate: facData.governorate,
          delegation: facData.delegation,
          latitude: facData.latitude,
          longitude: facData.longitude,
          photos: [
            { type: 'photo', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', position: 1 },
            { type: 'photo', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80', position: 2 },
          ],
          is_active: true,
        });
        facility = await facilityRepo.save(facility);
        facilityCount++;
        console.log(`  🏭 Created Facility: ${facData.name}`);
      }

      const existingRooms = await roomRepo.find({ where: { facility_id: facility.id } });
      if (existingRooms.length === 0) {
        for (const roomData of facData.rooms) {
          await roomRepo.save(roomRepo.create({
            facility_id: facility.id,
            ...roomData,
            is_active: true,
          }));
          roomCount++;
        }
        console.log(`  ❄️  Created ${facData.rooms.length} rooms`);
      }
    }
  }

  console.log(`\n🎉 Seed Complete!`);
  console.log(`─────────────────────────────────────`);
  console.log(`📦 ${facilityCount} Facilities | ❄️  ${roomCount} Rooms`);
  console.log(`─────────────────────────────────────`);
  console.log(`ACCOUNTS (all share password: Password123!):`);
  console.log(`  Kasserine:   +21698000111 / frigoriste.kasserine@ziria.tn`);
  console.log(`  Sidi Bouzid: +21698000333 / frigoriste.sidibouzid@ziria.tn`);
  console.log(`  Sfax:        +21698000555 / frigoriste.sfax@ziria.tn`);
  console.log(`  Nabeul:      +21698000777 / frigoriste.nabeul@ziria.tn`);
  console.log(`  Gabès:       +21698000999 / frigoriste.gabes@ziria.tn`);
  console.log(`─────────────────────────────────────\n`);

  await app.close();
}

seedStorage().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
