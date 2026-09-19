import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Role } from './common/enums/role.enum';
import { DriverProfile, VehicleType } from './drivers/entities/driver-profile.entity';
import { TransportRequest, TransportStatus } from './drivers/entities/transport-request.entity';
import * as bcrypt from 'bcrypt';

// ─── Vehicle Image URLs (Unsplash — proven to work in this project) ──────────
const VEHICLE_IMAGES = {
  // White commercial van — matches Peugeot Expert / Fiat Jumpy
  PEUGEOT_EXPERT: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80',
  // Large white cargo van — matches Fiat Ducato / Citroën Jumper
  FIAT_DUCATO: 'https://images.unsplash.com/photo-1621939514649-2308b2bfff5d?auto=format&fit=crop&w=800&q=80',
  // Mercedes-style sprinter van — matches Mercedes Sprinter
  MERCEDES_SPRINTER: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
  // Compact delivery van — matches Renault Trafic
  RENAULT_TRAFIC: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  // Pickup truck — matches Toyota Hilux
  TOYOTA_HILUX: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80',
  // Pickup truck — matches Mitsubishi L200
  MITSUBISHI_L200: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
  // White cargo van — matches Citroën Jumper
  CITROEN_JUMPER: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80',
  // Medium truck — matches Mercedes Atego
  MERCEDES_ATEGO: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
  // Pickup truck — matches Ford Ranger
  FORD_RANGER: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?auto=format&fit=crop&w=800&q=80',
  // Large van — matches Renault Master
  RENAULT_MASTER: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
  // IVECO Daily
  IVECO_DAILY: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
} as const;

// ─── Profile Avatar URLs ─────────────────────────────────────────────────────
const AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&q=80',
];

async function seedTransport() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🚛 Generating Transporters & Transport Requests across Tunisia...\n');

  const userRepo = dataSource.getRepository(User);
  const driverRepo = dataSource.getRepository(DriverProfile);
  const requestRepo = dataSource.getRepository(TransportRequest);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSPORTERS — Real Tunisian cities, real vehicles, real plates
  // ═══════════════════════════════════════════════════════════════════════════
  const transporters = [
    {
      phone: '+21690100001', email: 'ahmed.farhat@ziria.tn', name: 'Ahmed Farhat',
      governorate: 'Tunis', delegation: 'La Marsa',
      lat: 36.8762, lng: 10.3247,
      avatar: AVATARS[0],
      vehicle: {
        vehicle_type: VehicleType.VAN,
        capacity_tonnes: 1.5,
        license_number: 'TUN-2019-45821',
        vehicle_plate: '12345-TUN-78',
        vehicle_photo_url: VEHICLE_IMAGES.PEUGEOT_EXPERT,
      },
      rating: 4.85,
      bio: 'Transporteur spécialisé dans les produits frais depuis 8 ans. Peugeot Expert thermique, always on time.',
    },
    {
      phone: '+21690100002', email: 'rachid.mansour@ziria.tn', name: 'Rachid Mansour',
      governorate: 'Sousse', delegation: 'Sousse Ville',
      lat: 35.8288, lng: 10.6405,
      avatar: AVATARS[1],
      vehicle: {
        vehicle_type: VehicleType.VAN,
        capacity_tonnes: 3.2,
        license_number: 'SOU-2020-12847',
        vehicle_plate: '23456-SOU-23',
        vehicle_photo_url: VEHICLE_IMAGES.FIAT_DUCATO,
      },
      rating: 4.72,
      bio: 'Ducato longue version, idéal pour les grandes commandes de légumes et fruits.',
    },
    {
      phone: '+21690100003', email: 'youssef.benkhalifa@ziria.tn', name: 'Youssef Ben Khalifa',
      governorate: 'Sfax', delegation: 'Sfax Ville',
      lat: 34.7406, lng: 10.7603,
      avatar: AVATARS[2],
      vehicle: {
        vehicle_type: VehicleType.TRUCK,
        capacity_tonnes: 3.5,
        license_number: 'SFX-2018-34291',
        vehicle_plate: '34567-SFX-45',
        vehicle_photo_url: VEHICLE_IMAGES.MERCEDES_SPRINTER,
      },
      rating: 4.91,
      bio: 'Mercedes Sprinter 316 CDI, parfait pour les livraisons longue distance. Disponible Sfax-Tunis.',
    },
    {
      phone: '+21690100004', email: 'nabil.bouazizi@ziria.tn', name: 'Nabil Bouazizi',
      governorate: 'Bizerte', delegation: 'Bizerte Ville',
      lat: 37.2744, lng: 9.8722,
      avatar: AVATARS[3],
      vehicle: {
        vehicle_type: VehicleType.VAN,
        capacity_tonnes: 1.2,
        license_number: 'BRZ-2021-56123',
        vehicle_plate: '45678-BRZ-12',
        vehicle_photo_url: VEHICLE_IMAGES.RENAULT_TRAFIC,
      },
      rating: 4.58,
      bio: 'Renault Trafic compact, maniable pour les zones urbaines. Pêche & agrumes de Bizerte.',
    },
    {
      phone: '+21690100005', email: 'walid.chelly@ziria.tn', name: 'Walid Chelly',
      governorate: 'Kairouan', delegation: 'Kairouan Ville',
      lat: 35.6782, lng: 10.0963,
      avatar: AVATARS[4],
      vehicle: {
        vehicle_type: VehicleType.PICKUP,
        capacity_tonnes: 1.0,
        license_number: 'KAI-2020-78456',
        vehicle_plate: '56789-KAI-34',
        vehicle_photo_url: VEHICLE_IMAGES.TOYOTA_HILUX,
      },
      rating: 4.67,
      bio: 'Toyota Hilux 4x4, reliable pour les routes de terre. Céréales & olives de Kairouan.',
    },
    {
      phone: '+21690100006', email: 'mongi.slimani@ziria.tn', name: 'Mongi Slimani',
      governorate: 'Nabeul', delegation: 'Nabeul Ville',
      lat: 36.4561, lng: 10.7378,
      avatar: AVATARS[5],
      vehicle: {
        vehicle_type: VehicleType.PICKUP,
        capacity_tonnes: 1.2,
        license_number: 'NAB-2019-91234',
        vehicle_plate: '67890-NAB-56',
        vehicle_photo_url: VEHICLE_IMAGES.MITSUBISHI_L200,
      },
      rating: 4.78,
      bio: 'Mitsubishi L200 Triton, robuste pour les transports côtiers. Fraises & pêches de Nabeul.',
    },
    {
      phone: '+21690100007', email: 'karim.drissi@ziria.tn', name: 'Karim Drissi',
      governorate: 'Monastir', delegation: 'Monastir Ville',
      lat: 35.7643, lng: 10.8113,
      avatar: AVATARS[6],
      vehicle: {
        vehicle_type: VehicleType.VAN,
        capacity_tonnes: 2.8,
        license_number: 'MST-2021-23567',
        vehicle_plate: '78901-MST-67',
        vehicle_photo_url: VEHICLE_IMAGES.CITROEN_JUMPER,
      },
      rating: 4.53,
      bio: 'Citroën Jumper XL, great pour les livraisons Monastir-Sousse. Huile d\'olive & légumes.',
    },
    {
      phone: '+21690100008', email: 'hichem.touati@ziria.tn', name: 'Hichem Touati',
      governorate: 'Gabès', delegation: 'Gabès Ville',
      lat: 33.8815, lng: 10.0982,
      avatar: AVATARS[7],
      vehicle: {
        vehicle_type: VehicleType.TRUCK,
        capacity_tonnes: 5.0,
        license_number: 'GAB-2017-67890',
        vehicle_plate: '89012-GAB-78',
        vehicle_photo_url: VEHICLE_IMAGES.MERCEDES_ATEGO,
      },
      rating: 4.88,
      bio: 'Mercedes Atego 818, camion de 5T pour gros volumes. Dattes & agrumes du Sud.',
    },
    {
      phone: '+21690100009', email: 'sami.rejeb@ziria.tn', name: 'Sami Rejeb',
      governorate: 'Kasserine', delegation: 'Kasserine Ville',
      lat: 35.1676, lng: 8.8365,
      avatar: AVATARS[8],
      vehicle: {
        vehicle_type: VehicleType.VAN,
        capacity_tonnes: 2.5,
        license_number: 'KSR-2020-45678',
        vehicle_plate: '90123-KSR-89',
        vehicle_photo_url: VEHICLE_IMAGES.RENAULT_MASTER,
      },
      rating: 4.61,
      bio: 'Renault Master Grand Volume, transport de céréales et légumes secs. Kasserine-Le Kef.',
    },
    {
      phone: '+21690100010', email: 'aziz.maalej@ziria.tn', name: 'Aziz Maalej',
      governorate: 'Sidi Bouzid', delegation: 'Sidi Bouzid Ville',
      lat: 34.7406, lng: 9.4839,
      avatar: AVATARS[9],
      vehicle: {
        vehicle_type: VehicleType.PICKUP,
        capacity_tonnes: 1.5,
        license_number: 'SBZ-2021-34567',
        vehicle_plate: '01234-SBZ-90',
        vehicle_photo_url: VEHICLE_IMAGES.FORD_RANGER,
      },
      rating: 4.45,
      bio: 'Ford Ranger Wildtrak 4x4, tous terrains. Olives & agrumes de Sidi Bouzid.',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSPORT REQUESTS — Real Tunisian agricultural routes & cargo
  // ═══════════════════════════════════════════════════════════════════════════
  const transportRequests = [
    {
      origin_lat: 36.4561, origin_lng: 10.7378, origin_address: 'Marché de gros, Nabeul',
      destination_lat: 36.8065, destination_lng: 10.1815, destination_address: 'Marché de Rades, Tunis',
      cargo_type: 'Fraises Nabeul', quantity_kg: 850, weight_tonnes: 0.85,
      required_vehicle_type: 'REFRIGERATED', proposed_price_tnd: 420,
      status: TransportStatus.DELIVERED,
      pickup_date: '2026-09-10', is_express: true,
      handling_notes: 'Température max +4°C, manutention délicate, palettes grilles',
    },
    {
      origin_lat: 34.7406, origin_lng: 10.7603, origin_address: 'Port de Sfax',
      destination_lat: 36.8065, destination_lng: 10.1815, destination_address: 'Entrepôt La Marsa, Tunis',
      cargo_type: 'Huile d\'olive extra vierge', quantity_kg: 2400, weight_tonnes: 2.4,
      required_vehicle_type: 'VAN', proposed_price_tnd: 680, accepted_price_tnd: 650,
      status: TransportStatus.IN_TRANSIT,
      pickup_date: '2026-09-15',
      handling_notes: 'Caisses en plastique empilables, pas de renversement',
    },
    {
      origin_lat: 35.6782, origin_lng: 10.0963, origin_address: 'Coopérative Céréaliers Kairouan',
      destination_lat: 34.7406, destination_lng: 10.7603, destination_address: 'Meunerie Sfax',
      cargo_type: 'Blé dur', quantity_kg: 4800, weight_tonnes: 4.8,
      required_vehicle_type: 'TRUCK', proposed_price_tnd: 950,
      status: TransportStatus.OPEN,
      pickup_date: '2026-09-18',
      handling_notes: 'Sacs de 50kg, chargement par transpalette. Disponibilité matin.',
    },
    {
      origin_lat: 37.2744, origin_lng: 9.8722, origin_address: 'Ferme Ben Ali, Bizerte Nord',
      destination_lat: 35.8288, destination_lng: 10.6405, destination_address: 'Supermarché Monoprix Sousse',
      cargo_type: 'Oranges sanguines', quantity_kg: 1200, weight_tonnes: 1.2,
      required_vehicle_type: 'VAN', proposed_price_tnd: 520,
      status: TransportStatus.NEGOTIATING,
      pickup_date: '2026-09-16',
      handling_notes: 'Emballage carton, 400 caisses de 3kg. Livraison avant 8h.',
    },
    {
      origin_lat: 35.1676, origin_lng: 8.8365, origin_address: 'Domaine Sidi Saad, Kasserine',
      destination_lat: 36.8065, destination_lng: 10.1815, destination_address: 'Exportateur Ariana',
      cargo_type: 'Olives vertes', quantity_kg: 3200, weight_tonnes: 3.2,
      required_vehicle_type: 'TRUCK', proposed_price_tnd: 780,
      status: TransportStatus.PENDING,
      pickup_date: '2026-09-20',
      handling_notes: 'Benne de 3m³, chargement calculeuse. Route montagneuse Kasserine-Le Kef.',
    },
    {
      origin_lat: 33.8815, origin_lng: 10.0982, origin_address: 'Palmeraie Gabès Sud',
      destination_lat: 36.8065, destination_lng: 10.1815, destination_address: 'Port de Radès, Tunis',
      cargo_type: 'Dattes Deglet Nour', quantity_kg: 5500, weight_tonnes: 5.5,
      required_vehicle_type: 'TRUCK', proposed_price_tnd: 1800, accepted_price_tnd: 1650,
      status: TransportStatus.ACCEPTED,
      pickup_date: '2026-09-14',
      handling_notes: 'Caisses isothermes, humidité 60%. Grand camion benne nécessité.',
    },
    {
      origin_lat: 36.8762, origin_lng: 10.3247, origin_address: 'Marché de La Marsa, Tunis',
      destination_lat: 35.8288, destination_lng: 10.6405, destination_address: 'Restaurant Group Sousse',
      cargo_type: 'Tomates grappe', quantity_kg: 650, weight_tonnes: 0.65,
      required_vehicle_type: 'VAN', proposed_price_tnd: 380,
      status: TransportStatus.CANCELLED,
      pickup_date: '2026-09-12',
      handling_notes: 'Livraison express, produit fragile. Annulé: commande reportée.',
    },
    {
      origin_lat: 36.4561, origin_lng: 10.7378, origin_address: 'Coopérative Pêcheurs Nabeul',
      destination_lat: 36.8065, destination_lng: 10.1815, destination_address: 'Marché aux poissons Rades',
      cargo_type: 'Poisson frais (dorade, bar)', quantity_kg: 400, weight_tonnes: 0.4,
      required_vehicle_type: 'REFRIGERATED', proposed_price_tnd: 350,
      status: TransportStatus.DELIVERED,
      pickup_date: '2026-09-11', is_express: true,
      handling_notes: 'Glaçons obligatoires, température -2°C, livraison avant 6h du matin.',
    },
    {
      origin_lat: 35.8288, origin_lng: 10.6405, origin_address: 'Oleïc Sousse',
      destination_lat: 34.7406, destination_lng: 10.7603, destination_address: 'Exportateur Sfax',
      cargo_type: 'Huile d\'olive vierge', quantity_kg: 1800, weight_tonnes: 1.8,
      required_vehicle_type: 'VAN', proposed_price_tnd: 580,
      status: TransportStatus.OPEN,
      pickup_date: '2026-09-19',
      handling_notes: 'Fûcs inox 200L, 9 fûcs. Manipulation grue douce requise.',
    },
    {
      origin_lat: 34.7406, origin_lng: 9.4839, origin_address: 'Domaine Olivicole Sidi Bouzid',
      destination_lat: 35.1676, destination_lng: 8.8365, destination_address: 'Pressoir Kasserine',
      cargo_type: 'Olives noires', quantity_kg: 2800, weight_tonnes: 2.8,
      required_vehicle_type: 'PICKUP', proposed_price_tnd: 450,
      status: TransportStatus.PENDING,
      pickup_date: '2026-09-21',
      handling_notes: 'Benne ouverte, chargement pelles. Route nationale Sidi Bouzid-Kasserine.',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  SEED EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  let userCount = 0;
  let driverCount = 0;
  let requestCount = 0;

  // ─── 1. Create Driver Users + Profiles ────────────────────────────────────
  console.log('👤 Creating Transporter Users...\n');

  const driverUsers: User[] = [];

  for (const t of transporters) {
    let user = await userRepo.findOne({ where: { phone: t.phone } });
    if (!user) {
      user = userRepo.create({
        phone: t.phone,
        email: t.email,
        name: t.name,
        governorate: t.governorate,
        delegation: t.delegation,
        lat: t.lat,
        lng: t.lng,
        role: Role.DRIVER,
        profile_picture_url: t.avatar,
        password_hash: passwordHash,
        verified: true,
        is_banned: false,
      });
      user = await userRepo.save(user);
      userCount++;
      console.log(`  ✅ User: ${t.name} (${t.governorate}) — ${t.vehicle.vehicle_plate}`);
    } else {
      user.name = t.name;
      user.governorate = t.governorate;
      user.delegation = t.delegation;
      user.lat = t.lat;
      user.lng = t.lng;
      user.profile_picture_url = t.avatar;
      await userRepo.save(user);
      console.log(`  ℹ️  Updated: ${t.name}`);
    }
    driverUsers.push(user);

    // Create DriverProfile
    let profile = await driverRepo.findOne({ where: { user_id: user.id } });
    if (!profile) {
      profile = driverRepo.create({
        user_id: user.id,
        vehicle_type: t.vehicle.vehicle_type,
        capacity_tonnes: t.vehicle.capacity_tonnes,
        lat: t.lat,
        lng: t.lng,
        governorate: t.governorate,
        is_available: true,
        rating: t.rating,
        license_number: t.vehicle.license_number,
        vehicle_plate: t.vehicle.vehicle_plate,
        vehicle_photo_url: t.vehicle.vehicle_photo_url,
      });
      profile = await driverRepo.save(profile);
      driverCount++;
      console.log(`    🚛 Profile: ${t.vehicle.vehicle_plate} (${t.vehicle.vehicle_type})`);
    } else {
      profile.vehicle_type = t.vehicle.vehicle_type;
      profile.capacity_tonnes = t.vehicle.capacity_tonnes;
      profile.lat = t.lat;
      profile.lng = t.lng;
      profile.rating = t.rating;
      profile.vehicle_plate = t.vehicle.vehicle_plate;
      profile.vehicle_photo_url = t.vehicle.vehicle_photo_url;
      await driverRepo.save(profile);
      console.log(`    ℹ️  Updated profile: ${t.vehicle.vehicle_plate}`);
    }
  }

  // ─── 2. Create Transport Requests ─────────────────────────────────────────
  console.log('\n📦 Creating Transport Requests...\n');

  // We need at least one FARMER or B2B_BUYER to be the requester.
  // Use the first existing farmer from the users table, or create a dummy requester.
  let requester = await userRepo.findOne({ where: { role: Role.B2B_BUYER as any } });
  if (!requester) {
    requester = await userRepo.findOne({ where: { role: Role.FARMER as any } });
  }
  if (!requester) {
    requester = userRepo.create({
      phone: '+21699999900',
      email: 'requester.seed@ziria.tn',
      name: 'Seed Requester (B2B)',
      governorate: 'Tunis',
      delegation: 'Tunis Centre',
      lat: 36.8065,
      lng: 10.1815,
      role: Role.B2B_BUYER,
      password_hash: passwordHash,
      verified: true,
    });
    requester = await userRepo.save(requester);
    console.log('  ✅ Created Seed Requester (B2B_BUYER)');
  }

  for (const req of transportRequests) {
    // Check if request already exists by cargo_type + origin
    const existing = await requestRepo.findOne({
      where: { cargo_type: req.cargo_type, requester_id: requester.id },
    });
    if (!existing) {
      await requestRepo.save(requestRepo.create({
        requester_id: requester.id,
        farmer_id: requester.id,
        origin_lat: req.origin_lat,
        origin_lng: req.origin_lng,
        origin_address: req.origin_address,
        destination_lat: req.destination_lat,
        destination_lng: req.destination_lng,
        destination_address: req.destination_address,
        cargo_type: req.cargo_type,
        quantity_kg: req.quantity_kg,
        weight_tonnes: req.weight_tonnes,
        required_vehicle_type: req.required_vehicle_type,
        proposed_price_tnd: req.proposed_price_tnd,
        accepted_price_tnd: req.accepted_price_tnd || null,
        status: req.status,
        pickup_date: req.pickup_date,
        is_express: req.is_express || false,
        handling_notes: req.handling_notes,
      }));
      requestCount++;
      console.log(`  📋 ${req.cargo_type} — ${req.status} — ${req.origin_address} → ${req.destination_address}`);
    } else {
      console.log(`  ⏭️  Skipped: ${req.cargo_type} (already exists)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n🎉 Seed Complete!`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`👤 Users: ${userCount}  |  🚛 Driver Profiles: ${driverCount}  |  📋 Transport Requests: ${requestCount}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`\nACCOUNTS (all share password: Password123!):\n`);
  for (const t of transporters) {
    const v = t.vehicle;
    console.log(`  🚛 ${t.name.padEnd(18)} ${t.governorate.padEnd(14)} ${v.vehicle_plate.padEnd(14)} ${v.vehicle_type.padEnd(14)} ${v.capacity_tonnes}T`);
  }
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📞 Contact: +21690100001 → +21690100010`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);

  await app.close();
}

seedTransport().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
