import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { CropZone } from '../parcels/entities/crop-zone.entity';
import { Cooperative } from '../cooperatives/entities/cooperative.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentReservation } from '../equipment/entities/equipment-reservation.entity';
import { TransportRequest, TransportStatus } from '../drivers/entities/transport-request.entity';
import { MarketplaceListing, ListingStatus, ListingCategory } from '../marketplace/entities/marketplace-listing.entity';
import { NotificationRecord } from '../notifications/entities/notification-record.entity';
import { FinancialRecord, RecordType, RecordCategory } from '../finance/entities/financial-record.entity';
import { Role } from '../common/enums/role.enum';
import { FarmerActivityType } from '../common/enums/farmer-activity-type.enum';
import { DriverProfile, VehicleType } from '../drivers/entities/driver-profile.entity';
import { WorkerProfile } from '../workers/entities/worker-profile.entity';
import { DiseaseDetection, DetectionUrgency } from '../disease-detections/entities/disease-detection.entity';
import { Zone } from '../ambassador/entities/zone.entity';
import { JobOffer, JobOfferStatus } from '../workers/entities/job-offer.entity';
import { JobApplication, ApplicationStatus } from '../workers/entities/job-application.entity';
import { LandAuction, AuctionStatus } from '../land/entities/land-auction.entity';
import { LandBid } from '../land/entities/land-bid.entity';
import { SubscriptionPlan, SubscriptionPlanCode } from '../subscriptions/entities/subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from '../subscriptions/entities/user-subscription.entity';
import { NameDictionary } from '../name-dictionary/entities/name-dictionary.entity';
import {
  ZirfeedUserProfile,
  ZirfeedFollow,
  ZirfeedPage,
  ZirfeedGroup,
  ZirfeedGroupMember,
  ZirfeedPost,
  ZirfeedComment,
  ZirfeedReaction,
  ZirfeedSavedCollection,
  ZirfeedSavedPost,
  ZirfeedEvent,
  ZirfeedEventAttendee,
  ZirfeedExternalNews,
  ZirfeedHashtag,
  ZirfeedModeration,
  ZirfeedModerationRestriction,
  ZirfeedNotification,
  ZirfeedStory
} from '../zirfeed/entities/zirfeed.entities';
import { GovernorateCentroid } from '../expert/entities/governorate-centroid.entity';
import { CropKcValue } from '../expert/entities/crop-kc-value.entity';
import { AnimalNutritionalNorm } from '../expert/entities/animal-nutritional-norm.entity';
import { SeasonalCropRisk } from '../expert/entities/seasonal-crop-risk.entity';
import { ProductPrescriptionRule } from '../expert/entities/product-prescription-rule.entity';
import { VaccineType } from '../expert/entities/vaccine-type.entity';
import { CrdaZone } from '../expert/entities/crda-zone.entity';
import { GovernorateBoundary } from '../expert/entities/governorate-boundary.entity';
import { ExpertProfile } from '../expert/entities/expert-profile.entity';
import { ExpertType } from '../common/enums/expert-type.enum';

import { ExpertFarmerRelation } from '../expert/entities/expert-farmer-relation.entity';
import { HerdRecord } from '../expert/entities/herd-record.entity';
import { VaccinationRecord } from '../expert/entities/vaccination-record.entity';
import { ExpertConsultation, ConsultationStatus } from '../expert/entities/expert-consultation.entity';
import { Prescription, ApplicationMethod } from '../expert/entities/prescription.entity';
import { ExpertMessage } from '../expert/entities/expert-message.entity';
import * as bcrypt from 'bcrypt';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function rnd(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function inferListingCategory(title: string): ListingCategory {
  const t = title.toLowerCase();
  if (/tracteur|charrue|motopompe|citerne|broyeur|atomiseur|tuyau|caisse/i.test(t)) {
    return ListingCategory.EQUIPMENT;
  }
  if (/bélier|vache|agneau|ruche|bétail|ovin|bovin/i.test(t)) {
    return ListingCategory.LIVESTOCK;
  }
  if (/foin|paille|fourrage|balles/i.test(t)) {
    return ListingCategory.FORAGE_FEED;
  }
  if (/huile|miel|transform/i.test(t)) {
    return ListingCategory.PROCESSED;
  }
  if (/semence|plant|arbres fruitiers|engrais/i.test(t)) {
    return ListingCategory.SEEDS;
  }
  return ListingCategory.FRESH_PRODUCE;
}

const REGIONS = [
  { governorate: 'Kasserine', delegation: 'Foussana', lat: 35.3400, lng: 8.4800 },
  { governorate: 'Kasserine', delegation: 'Sbeitla', lat: 35.2300, lng: 9.1300 },
  { governorate: 'Kasserine', delegation: 'Thala', lat: 35.5700, lng: 8.6700 },
  { governorate: 'Sidi Bouzid', delegation: 'Regueb', lat: 34.8600, lng: 9.7800 },
  { governorate: 'Sidi Bouzid', delegation: 'Meknassy', lat: 34.6200, lng: 9.6100 },
  { governorate: 'Le Kef', delegation: 'Tajerouine', lat: 35.8900, lng: 8.5500 },
  { governorate: 'Le Kef', delegation: 'Dahmani', lat: 35.9400, lng: 8.8300 }
];

const TUNISIAN_NAMES = [
  'Ahmed Ben Salah', 'Mohamed Trabelsi', 'Fatma Khaldi', 'Hedi Mansouri', 'Salma Gammoudi',
  'Yassine Jlassi', 'Mabrouk Tlili', 'Karim Dridi', 'Amel Rezgui', 'Sami Touati',
  'Walid Hammami', 'Olfa Riahi', 'Anis Ben Ali', 'Zied Gharbi', 'Imed Ayadi',
  'Mounir Zaibi', 'Noura Sassi', 'Ridha Abidi', 'Kais Saidi', 'Lamia Bouaziz'
];

const CROPS = [
  { name: 'Olive Chemlali', cat: 'Olive' },
  { name: 'Olive Sahli', cat: 'Olive' },
  { name: 'Pomme Anna', cat: 'Pomme' },
  { name: 'Pomme Starking', cat: 'Pomme' },
  { name: 'Pistache Mateur', cat: 'Pistache' },
  { name: 'Blé Dur Maali', cat: 'Blé' },
  { name: 'Tomate Rio Grande', cat: 'Tomate' },
  { name: 'Amande Mazzetto', cat: 'Amande' }
];

async function bootstrap() {
  console.log('[ZirIA] Launching MASSIVE TUNISIAN SEEDER V7.0...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const dataSource = app.get(DataSource);
  const passwordHash = await bcrypt.hash('Ziria2026!', 10);

  console.log('[ZirIA] Cleaning database...');
  const tables = [
    'expert_farmer_relations', 'expert_profiles', 'soil_analyses', 'water_projects', 'wells', 'well_measurements', 'herd_records', 'vaccination_records',
    'zirfeed_notifications', 'zirfeed_moderation_restrictions', 'zirfeed_moderation',
    'zirfeed_event_attendees', 'zirfeed_events', 'zirfeed_saved_posts', 'zirfeed_saved_collections',
    'zirfeed_reactions', 'zirfeed_comments', 'zirfeed_posts', 'zirfeed_group_members',
    'zirfeed_groups', 'zirfeed_pages', 'zirfeed_follows', 'zirfeed_user_profile', 'zirfeed_external_news', 'zirfeed_hashtags',
    'land_bids', 'land_auctions', 'land_listings', 'job_applications', 'job_offers',
    'worker_profiles', 'transport_requests', 'driver_profiles', 'equipment_reservations',
    'equipment', 'disease_detections', 'marketplace_connections', 'marketplace_listings',
    'crop_zones', 'parcels', 'notification_records', 'financial_records', 'cooperatives',
    'product_orders', 'supplier_promotions', 'products', 'messages', 'zones', 
    'field_reports', 'prescriptions', 'predictions', 'ai_model_feedbacks', 
    'agent_conversations', 'agent_messages', 'agent_intents', 'agent_actions', 
    'feature_purchases', 'market_prices', 'phyto_alerts', 'inventory', 
    'inventory_movements', 'platform_revenue_daily', 'financial_transactions', 
    'vaccine_types', 'product_prescription_rules', 'seasonal_crop_risks', 'animal_nutritional_norms', 'crop_kc_values', 'governorate_centroids',
    'zirpulse_posts', 'platform_commissions', 'user_subscriptions', 'subscription_plans', 'name_dictionary', 'users'
  ];

  for (const table of tables) {
    try { await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`); } catch (e) {}
  }

  const userRepo = dataSource.getRepository(User);
  const coopRepo = dataSource.getRepository(Cooperative);
  const parcelRepo = dataSource.getRepository(Parcel);
  const cropZoneRepo = dataSource.getRepository(CropZone);
  const equipRepo = dataSource.getRepository(Equipment);
  const equipResRepo = dataSource.getRepository(EquipmentReservation);
  const transportRepo = dataSource.getRepository(TransportRequest);
  const marketRepo = dataSource.getRepository(MarketplaceListing);
  const notificationRepo = dataSource.getRepository(NotificationRecord);
  const financeRepo = dataSource.getRepository(FinancialRecord);
  const driverRepo = dataSource.getRepository(DriverProfile);
  const workerRepo = dataSource.getRepository(WorkerProfile);
  const jobOfferRepo = dataSource.getRepository(JobOffer);
  const jobAppRepo = dataSource.getRepository(JobApplication);
  const landAuctionRepo = dataSource.getRepository(LandAuction);
  const landBidRepo = dataSource.getRepository(LandBid);
  const productRepo = dataSource.getRepository('products');
  const orderRepo = dataSource.getRepository('product_orders');
  const zoneEntityRepo = dataSource.getRepository(Zone);
  const diseaseRepo = dataSource.getRepository(DiseaseDetection);
  const planRepo = dataSource.getRepository(SubscriptionPlan);
  const inventoryRepo = dataSource.getRepository('inventory');
  const nameDictRepo = dataSource.getRepository(NameDictionary);

  // ZirFeed Repositories
  const zirProfileRepo = dataSource.getRepository(ZirfeedUserProfile);
  const zirFollowRepo = dataSource.getRepository(ZirfeedFollow);
  const zirPageRepo = dataSource.getRepository(ZirfeedPage);
  const zirGroupRepo = dataSource.getRepository(ZirfeedGroup);
  const zirMemberRepo = dataSource.getRepository(ZirfeedGroupMember);
  const zirPostRepo = dataSource.getRepository(ZirfeedPost);
  const zirCommentRepo = dataSource.getRepository(ZirfeedComment);
  const zirReactionRepo = dataSource.getRepository(ZirfeedReaction);
  const zirCollectionRepo = dataSource.getRepository(ZirfeedSavedCollection);
  const zirSavedPostRepo = dataSource.getRepository(ZirfeedSavedPost);
  const zirEventRepo = dataSource.getRepository(ZirfeedEvent);
  const zirAttendeeRepo = dataSource.getRepository(ZirfeedEventAttendee);
  const zirNewsRepo = dataSource.getRepository(ZirfeedExternalNews);
  const zirHashtagRepo = dataSource.getRepository(ZirfeedHashtag);
  const zirModRepo = dataSource.getRepository(ZirfeedModeration);
  const zirRestrictionRepo = dataSource.getRepository(ZirfeedModerationRestriction);
  const zirNotificationRepo = dataSource.getRepository(ZirfeedNotification);
  const zirStoryRepo = dataSource.getRepository(ZirfeedStory);

  // ─── 0. Name Dictionary ──────────────────────────────────────────────────────
  console.log('[ZirIA] Seeding Name Dictionary...');
  const dictItems = [
    { key: 'Olive Chemlali', name_fr: 'Olive Chemlali', name_ar: 'زيتون شملالي', name_lat: 'Zitoun Chemlali' },
    { key: 'Olive Sahli', name_fr: 'Olive Sahli', name_ar: 'زيتون ساحلي', name_lat: 'Zitoun Sahli' },
    { key: 'Pomme Anna', name_fr: 'Pomme Anna', name_ar: 'تفاح أنا', name_lat: 'Tfeh Anna' },
    { key: 'Pomme Starking', name_fr: 'Pomme Starking', name_ar: 'تفاح ستاركينغ', name_lat: 'Tfeh Starking' },
    { key: 'Pistache Mateur', name_fr: 'Pistache Mateur', name_ar: 'فستق ماطر', name_lat: 'Fostoq Mateur' },
    { key: 'Blé Dur Maali', name_fr: 'Blé Dur Maali', name_ar: 'قمح صلب معالي', name_lat: 'Qamĥ Ŝalb Maali' },
    { key: 'Tomate Rio Grande', name_fr: 'Tomate Rio Grande', name_ar: 'طماطم ريو قراندي', name_lat: 'Tmatem Rio Grande' },
    { key: 'Amande Mazzetto', name_fr: 'Amande Mazzetto', name_ar: 'لوز مازيتو', name_lat: 'Louz Mazzetto' },
    { key: 'Olive', name_fr: 'Olive', name_ar: 'زيتون', name_lat: 'Zitoun' },
    { key: 'Pomme', name_fr: 'Pomme', name_ar: 'تفاح', name_lat: 'Tfeh' },
    { key: 'Pistache', name_fr: 'Pistache', name_ar: 'فستق', name_lat: 'Fostoq' },
    { key: 'Blé', name_fr: 'Blé', name_ar: 'قمح', name_lat: 'Qamĥ' },
    { key: 'Tomate', name_fr: 'Tomate', name_ar: 'طماطم', name_lat: 'Tmatem' },
    { key: 'Amande', name_fr: 'Amande', name_ar: 'لوز', name_lat: 'Louz' },
    { key: 'Piment de Kairouan', name_fr: 'Piment de Kairouan', name_ar: 'فلفل قيرواني', name_lat: 'Felfel Kairouani' },
    { key: 'Huile d\'olive Extra Vierge', name_fr: 'Huile d\'olive Extra Vierge', name_ar: 'زيت زيتون بكر ممتاز', name_lat: 'Zitt Zitoun Bikr Momtaz' },
    { key: 'Oeil de paon', name_fr: 'Oeil de paon', name_ar: 'عين الطاووس', name_lat: 'Ain Tawous' },
    { key: 'Mildiou', name_fr: 'Mildiou', name_ar: 'البiaض الزغبي', name_lat: 'Bayed Zogbi' },
    { key: 'Rouille jaune', name_fr: 'Rouille jaune', name_ar: 'الصدأ الأصفر', name_lat: 'Sda Asfar' },
    { key: 'Cochenille', name_fr: 'Cochenille', name_ar: 'الحشرة القشرية', name_lat: 'Hachara Qachria' },
  ];
  await nameDictRepo.save(nameDictRepo.create(dictItems));

  // ─── 1. Subscription Plans ──────────────────────────────────────────────────
  console.log('[ZirIA] Seeding Subscription Plans...');
  const plans = [
    { code: SubscriptionPlanCode.FREE, name_fr: 'Gratuit', price_tnd: 0, max_active_listings: 3, max_parcels: 1, diagnostics_per_month: 5, has_crm: false, has_financial_dashboard: false, has_gdd_detailed: false, has_api_access: false, has_group_orders: false },
    { code: SubscriptionPlanCode.STARTER, name_fr: 'Débutant', price_tnd: 29, max_active_listings: 10, max_parcels: 5, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: false, has_gdd_detailed: true, has_api_access: false, has_group_orders: false },
    { code: SubscriptionPlanCode.PRO, name_fr: 'Professionnel', price_tnd: 99, max_active_listings: -1, max_parcels: -1, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: true, has_gdd_detailed: true, has_api_access: false, has_group_orders: true },
    { code: SubscriptionPlanCode.BUSINESS, name_fr: 'Entreprise', price_tnd: 299, max_active_listings: -1, max_parcels: -1, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: true, has_gdd_detailed: true, has_api_access: true, has_group_orders: true },
  ];
  await planRepo.save(planRepo.create(plans));

  // ─── 2. Core Users (Admin, Coops, Experts, Ambassadors) ───────────────────────
  console.log('[ZirIA] Seeding Core Users...');
  
  const admin = await userRepo.save(userRepo.create({
    email: 'admin@ziria.tn', name: 'ZirIA SuperAdmin',
    role: Role.ADMIN, password_hash: passwordHash, verified: true
  }));

  const coopsList: Cooperative[] = [];
  const coopPresidentNames = ['Mabrouk Tlili', 'Ridha Abidi', 'Kais Saidi'];
  const coopNames = ['SMSA El Falah Foussana', 'SMSA Regueb El Khir', 'SMSA Dahmani Progrès'];
  const coopLocs = [REGIONS[0], REGIONS[3], REGIONS[6]];

  for (let i = 0; i < 3; i++) {
    const president = await userRepo.save(userRepo.create({
      email: `president${i+1}@ziria.tn`, name: coopPresidentNames[i],
      role: Role.COOP_PRESIDENT, password_hash: passwordHash, verified: true
    }));
    const coop = await coopRepo.save(coopRepo.create({
      name: coopNames[i], 
      location_lat: coopLocs[i].lat, 
      location_lng: coopLocs[i].lng, 
      president
    }));
    coopsList.push(coop);
  }

  const expertsList: User[] = [];
  const expertTypes = [
    { type: ExpertType.PHYTOPATHOLOGIST, name: 'Dr. Yassine Khaldi', email: 'expert1@ziria.tn', gov: 'Kasserine', statuses: ['CRDA_AGENT', 'LIBERAL'], bio: 'Spécialiste en pathologie végétale et diagnostic des maladies des arbres fruitiers en Tunisie.', certs: ['Diplôme National d\'Ingénieur Agronome', 'Certification CRDA Protection des Végétaux'] },
    { type: ExpertType.AGRONOMIST, name: 'Ing. Salma Touati', email: 'expert2@ziria.tn', gov: 'Sidi Bouzid', statuses: ['LIBERAL'], bio: 'Experte en fertilisation des sols et optimisation des rendements cultures maraîchères.', certs: ['Master en Science du Sol', 'Certificat d\'Expert en Nutrition NPK'] },
    { type: ExpertType.HYDRAULIC_ENGINEER, name: 'Ing. Karim Dridi', email: 'expert3@ziria.tn', gov: 'Le Kef', statuses: ['CRDA_AGENT', 'LIBERAL'], bio: 'Ingénieur en génie rural, conception et suivi des systèmes d\'irrigation localisée.', certs: ['Ingénieur Hydraulicien ENIT', 'Accréditation CRDA Amélioration Foncière'] },
    { type: ExpertType.HYDROGEOLOGIST, name: 'Dr. Amel Rezgui', email: 'expert4@ziria.tn', gov: 'Kasserine', statuses: ['LIBERAL'], bio: 'Spécialiste du suivi piézométrique des nappes et de la salinité des puits en Tunisie.', certs: ['Doctorat en Hydrogéologie USTHB', 'Expert National Ressources en Eau'] },
    { type: ExpertType.ZOOTECHNICIAN, name: 'Dr. Sami Hammami', email: 'expert5@ziria.tn', gov: 'Sidi Bouzid', statuses: ['LIBERAL'], bio: 'Conseiller en nutrition et conduite d\'élevage bovin et ovin dans le Centre tunisien.', certs: ['Ingénieur Zootechnicien ESA Mateur', 'Spécialiste Rations Elevage Laitier'] },
    { type: ExpertType.VETERINARY_EPIDEMIOLOGIST, name: 'Dr. Olfa Riahi', email: 'expert6@ziria.tn', gov: 'Le Kef', statuses: ['LIBERAL'], bio: 'Épidémiologiste vétérinaire, spécialisée dans les plans de prophylaxie et vaccination bovine.', certs: ['Docteur en Médecine Vétérinaire ENMV Sidi Thabet', 'Diplôme d\'Epidémiologie Animale'] }
  ];

  const expertProfileRepo = dataSource.getRepository(ExpertProfile);

  for (let i = 0; i < expertTypes.length; i++) {
    const et = expertTypes[i];
    const expert = await userRepo.save(userRepo.create({
      email: et.email,
      name: et.name,
      role: Role.EXPERT,
      password_hash: passwordHash,
      verified: true,
      governorate: et.gov,
      expert_type: et.type
    }));
    expertsList.push(expert);

    await expertProfileRepo.save(expertProfileRepo.create({
      user_id: expert.id,
      expert_type: et.type,
      professional_status: et.statuses,
      accepts_remote_consultations: true,
      governorate_zones: [et.gov],
      certifications: et.certs,
      bio: et.bio,
      is_profile_completed: true,
      expert_score: 4.8,
      consultation_rate_tnd: et.statuses.includes('CRDA_AGENT') ? 0 : 45.0,
      affiliation_name: et.statuses.includes('CRDA_AGENT') ? 'CRDA ' + et.gov : null,
      institution_name: et.statuses.includes('CRDA_AGENT') ? 'Ministère de l\'Agriculture' : null
    }));
  }

  const ambassadorsList: User[] = [];
  const zonesList: Zone[] = [];
  for (let i = 0; i < 3; i++) {
    const loc = REGIONS[i * 3]; // Spread across regions
    const zone = await zoneEntityRepo.save(zoneEntityRepo.create({
      name: `Secteur ${loc.delegation}`,
      delegation: loc.delegation,
      governorate: loc.governorate,
      center_lat: loc.lat,
      center_lng: loc.lng
    }));
    const ambassador = await userRepo.save(userRepo.create({
      email: `ambassador${i+1}@ziria.tn`, name: `Ambassadeur ${TUNISIAN_NAMES[i+5]}`,
      role: Role.FARMER_AMBASSADOR, password_hash: passwordHash, verified: true,
      lat: loc.lat, lng: loc.lng, governorate: loc.governorate, delegation: loc.delegation,
      zone_id: zone.id
    }));
    await zoneEntityRepo.update(zone.id, { ambassador_id: ambassador.id });
    ambassadorsList.push(ambassador);
    zonesList.push(zone);
  }

  // ─── 3. Farmers (15+) ────────────────────────────────────────────────────────
  console.log('[ZirIA] Seeding 15+ Farmers with Parcels...');
  const farmersList: User[] = [];
  const parcelsList: Parcel[] = [];

  const ahmedHome = REGIONS.find((r) => r.delegation === 'Meknassy') || REGIONS[4];

  for (let i = 0; i < 15; i++) {
    const loc = i === 0 ? ahmedHome : randomItem(REGIONS);
    
    // Cycle: 0=MIXED, 1=CROP, 2=LIVESTOCK
    const activityTypes = [FarmerActivityType.MIXED, FarmerActivityType.CROP, FarmerActivityType.LIVESTOCK];
    const farmerActivity = activityTypes[i % 3];

    const farmer = await userRepo.save(userRepo.create({
      email: `farmer${i+1}@ziria.tn`, 
      name: TUNISIAN_NAMES[i % TUNISIAN_NAMES.length],
      role: Role.FARMER, 
      password_hash: passwordHash, verified: true,
      phone: i === 0 ? '+216 98 123 456' : null,
      cooperative: randomItem(coopsList),
      lat: loc.lat + rnd(-0.02, 0.02, 4), 
      lng: loc.lng + rnd(-0.02, 0.02, 4),
      governorate: loc.governorate,
      delegation: loc.delegation,
      zone_id: randomItem(zonesList).id,
      registered_by_ambassador_id: randomItem(ambassadorsList).id,
      activity_type: farmerActivity
    }));
    farmersList.push(farmer);

    // 2 Parcels per farmer (specialized by activity type)
    for (let j = 0; j < 2; j++) {
      let parcelName = '';
      let cropType = '';
      let cropName = '';

      if (farmer.activity_type === FarmerActivityType.LIVESTOCK) {
        parcelName = j === 0 ? 'Pâturage Principal' : 'Zone d\'Élevage & Forage';
        cropType = j === 0 ? 'Pâturage' : 'Fourrage';
        cropName = j === 0 ? 'Herbe de prairie' : 'Orge Fourrager';
      } else {
        const crop = randomItem(CROPS);
        parcelName = j === 0 ? `Verger Principal ${crop.cat}` : `Parcelle Nord ${crop.cat}`;
        cropType = crop.cat;
        cropName = crop.name;
      }

      const parcel = await parcelRepo.save(parcelRepo.create({
        owner_id: farmer.id,
        name: parcelName,
        crop_type: cropType,
        surface_ha: rnd(2, 25),
        lat: (farmer.lat || 35.0) + rnd(-0.005, 0.005, 4),
        lng: (farmer.lng || 9.0) + rnd(-0.005, 0.005, 4)
      }) as any);
      parcelsList.push(parcel);

      // 1 Crop Zone per parcel
      await cropZoneRepo.save(cropZoneRepo.create({
        parcel_id: parcel.id,
        crop_type: cropName,
        surface_ha: parcel.surface_ha * 0.8,
        planted_at: daysAgo(rndInt(100, 400)),
        gdd_accumulated: rndInt(800, 1500),
        gdd_target: 2000,
        plant_count: rndInt(200, 2000),
        harvest_prediction_date: daysFromNow(rndInt(30, 90))
      }) as any);
    }
  }

  // ─── 3.5 Link Experts to Farmers & Seed Specialized Domain Data ──────────────
  console.log('[ZirIA] Seeding Expert-Farmer Relations & Domain Data...');
  
  // Ensure tables exist before inserting mock records
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS soil_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expert_id UUID NOT NULL, farmer_id UUID, parcel_id UUID,
      analysis_date DATE, ph NUMERIC(4,2), organic_matter_pct NUMERIC(6,3),
      nitrogen_ppm NUMERIC(8,2), phosphorus_ppm NUMERIC(8,2), potassium_ppm NUMERIC(8,2),
      calcium_ppm NUMERIC(8,2), magnesium_ppm NUMERIC(8,2), conductivity_ms NUMERIC(6,3),
      notes TEXT, lab_report_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS water_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expert_id UUID NOT NULL, farmer_id UUID NOT NULL,
      project_name VARCHAR(200), irrigation_type VARCHAR(50),
      status VARCHAR(30) DEFAULT 'DESIGN', area_ha NUMERIC(8,2),
      installation_date DATE, estimated_completion_date DATE,
      notes TEXT, design_pdf_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS wells (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expert_id UUID NOT NULL, farmer_id UUID,
      well_name VARCHAR(200), lat NUMERIC(10,7), lng NUMERIC(10,7),
      depth_m NUMERIC(8,2), water_level_m NUMERIC(8,2), salinity_g_l NUMERIC(6,3),
      tds_mg_l NUMERIC(8,2), status VARCHAR(30) DEFAULT 'ACTIVE',
      geological_notes TEXT, anomaly_drawdown BOOLEAN DEFAULT false, anomaly_salinity BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS well_measurements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      well_id UUID NOT NULL, water_level_m NUMERIC(8,2), salinity_g_l NUMERIC(6,3),
      notes TEXT, measured_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  const herdRecordRepo = dataSource.getRepository(HerdRecord);
  const vaccinationRecordRepo = dataSource.getRepository(VaccinationRecord);

  const relationRepo = dataSource.getRepository(ExpertFarmerRelation);
  const expertAssignedFarmers: User[][] = [];

  // Link each expert to 3 unique farmers based on activity type matching
  const cropFarmers = farmersList.filter(f => f.activity_type === FarmerActivityType.CROP || f.activity_type === FarmerActivityType.MIXED);
  const livestockFarmers = farmersList.filter(f => f.activity_type === FarmerActivityType.LIVESTOCK || f.activity_type === FarmerActivityType.MIXED);

  for (let i = 0; i < expertsList.length; i++) {
    const expert = expertsList[i];
    
    let assignedFarmers: User[] = [];
    if (expert.expert_type === ExpertType.ZOOTECHNICIAN || expert.expert_type === ExpertType.VETERINARY_EPIDEMIOLOGIST) {
      // Animal experts get livestock/mixed farmers
      assignedFarmers = [
        livestockFarmers[i % livestockFarmers.length],
        livestockFarmers[(i + 1) % livestockFarmers.length],
        livestockFarmers[(i + 2) % livestockFarmers.length]
      ];
    } else {
      // Crop/Hydraulic/Hydrogeologist get crop/mixed farmers
      assignedFarmers = [
        cropFarmers[i % cropFarmers.length],
        cropFarmers[(i + 1) % cropFarmers.length],
        cropFarmers[(i + 2) % cropFarmers.length]
      ];
    }

    for (const farmer of assignedFarmers) {
      await relationRepo.save(relationRepo.create({
        expert_id: expert.id,
        farmer_id: farmer.id,
        status: 'ACCEPTED' as any,
        requested_by: 'EXPERT' as any,
        accepted_at: new Date()
      }));
    }
    expertAssignedFarmers[i] = assignedFarmers;

    // Seed domain data based on expert type
    if (expert.expert_type === ExpertType.AGRONOMIST) {
      // Seed soil analyses
      const f1 = assignedFarmers[0];
      const p1 = parcelsList.find(p => p.owner_id === f1.id);
      await dataSource.query(`
        INSERT INTO soil_analyses (id, expert_id, farmer_id, parcel_id, analysis_date, ph, organic_matter_pct, nitrogen_ppm, phosphorus_ppm, potassium_ppm, conductivity_ms, notes)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 8.5, 1.2, 50, 10, 40, 2.5, 'ALERTE: pH alcalin et déficit sévère en nutriments majeurs N-P-K.')
      `, [expert.id, f1.id, p1?.id || null, daysAgo(2)]);

      const f2 = assignedFarmers[1];
      const p2 = parcelsList.find(p => p.owner_id === f2.id);
      await dataSource.query(`
        INSERT INTO soil_analyses (id, expert_id, farmer_id, parcel_id, analysis_date, ph, organic_matter_pct, nitrogen_ppm, phosphorus_ppm, potassium_ppm, conductivity_ms, notes)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 6.8, 2.5, 120, 35, 90, 1.1, 'Sol équilibré, fertilité optimale.')
      `, [expert.id, f2.id, p2?.id || null, daysAgo(10)]);

      // Seed crop journals (Cahiers de Culture)
      const cropJournalFarmers = assignedFarmers;
      const seasons = ['Automne 2025', 'Printemps 2026', 'Été 2025'];
      const cropTypes = ['Blé dur (Karim)', 'Tomate (Rio Grande)', 'Piment (Beldi)', 'Olive (Chemlali)', 'Oignon (Texas Grano)', 'Blé dur (Salim)'];
      for (let cj = 0; cj < 6; cj++) {
        const fc = cropJournalFarmers[cj % cropJournalFarmers.length];
        const pc = parcelsList.find(p2 => p2.owner_id === fc.id);
        const season = seasons[cj % seasons.length];
        const crop = cropTypes[cj % cropTypes.length];
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS crop_journals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expert_id UUID NOT NULL, farmer_id UUID, parcel_id UUID,
            season VARCHAR(100), crop_type VARCHAR(100),
            sowing_date DATE, harvest_date DATE, yield_kg_ha NUMERIC(10,2),
            fertilizer_used TEXT, pesticides_used TEXT,
            observations TEXT, recommendations TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await dataSource.query(`
          INSERT INTO crop_journals (expert_id, farmer_id, parcel_id, season, crop_type, sowing_date, harvest_date, yield_kg_ha, fertilizer_used, pesticides_used, observations, recommendations)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [
          expert.id, fc.id, pc?.id || null, season, crop,
          daysAgo(rndInt(100, 200)), daysAgo(rndInt(10, 60)),
          rnd(3000, 8000, 0),
          cj % 2 === 0 ? 'NPK 15-15-15 (350 kg/ha) + Ammonitrate (200 kg/ha)' : 'Fumier composté (20 t/ha) + Urée (150 kg/ha)',
          cj % 3 === 0 ? 'Glyphosate (2 l/ha) + 2,4-D (1 l/ha)' : cj % 3 === 1 ? 'Acétamipride (0.3 kg/ha)' : 'Aucun (lutte intégrée)',
          cj % 2 === 0
            ? 'Développement végétatif satisfaisant. Reprise homogène des plants.'
            : 'Stress hydrique observé en phase de floraison. Irrigation complémentaire recommandée.',
          cj === 0 ? 'Apporter un complément potassique en stade de fructification. Suivi des ravageurs.' : null,
        ]);
      }

    } else if (expert.expert_type === ExpertType.HYDRAULIC_ENGINEER) {
      // Seed water projects
      const f1 = assignedFarmers[0];
      await dataSource.query(`
        INSERT INTO water_projects (id, expert_id, farmer_id, project_name, irrigation_type, status, area_ha, installation_date, estimated_completion_date, notes)
        VALUES (gen_random_uuid(), $1, $2, 'Système Goutte-à-Goutte Secteur Nord', 'GOUTTE_A_GOUTTE', 'INSTALLATION', 5.0, $3, $4, 'Retard d''installation dû à un problème de livraison des canalisations.')
      `, [expert.id, f1.id, daysAgo(30), daysAgo(5)]);

      const f2 = assignedFarmers[1];
      await dataSource.query(`
        INSERT INTO water_projects (id, expert_id, farmer_id, project_name, irrigation_type, status, area_ha, installation_date, estimated_completion_date, notes)
        VALUES (gen_random_uuid(), $1, $2, 'Micro-Asperseurs Oliveraie', 'MICRO_ASPERSEUR', 'DESIGN', 12.0, $3, $4, 'Conception en cours, conformité des plans.')
      `, [expert.id, f2.id, daysAgo(2), daysFromNow(20)]);

    } else if (expert.expert_type === ExpertType.HYDROGEOLOGIST) {
      // Seed wells
      const f1 = assignedFarmers[0];
      const w1 = await dataSource.query(`
        INSERT INTO wells (id, expert_id, farmer_id, well_name, lat, lng, depth_m, water_level_m, salinity_g_l, tds_mg_l, status, geological_notes, anomaly_drawdown, anomaly_salinity)
        VALUES (gen_random_uuid(), $1, $2, 'Puits Principal F1', 35.25, 9.15, 80.0, 65.0, 3.2, 2100.0, 'ACTIVE', 'Anomalie de salinité élevée constatée.', false, true)
        RETURNING *
      `, [expert.id, f1.id]);
      
      if (w1[0]?.id) {
        await dataSource.query(`
          INSERT INTO well_measurements (id, well_id, water_level_m, salinity_g_l, notes, measured_at)
          VALUES (gen_random_uuid(), $1, 62.0, 2.9, 'Salinité en hausse', $2)
        `, [w1[0].id, daysAgo(10)]);
        await dataSource.query(`
          INSERT INTO well_measurements (id, well_id, water_level_m, salinity_g_l, notes, measured_at)
          VALUES (gen_random_uuid(), $1, 65.0, 3.2, 'Alerte: hausse de la salinité détectée', $2)
        `, [w1[0].id, daysAgo(2)]);
      }

      const f2 = assignedFarmers[1];
      await dataSource.query(`
        INSERT INTO wells (id, expert_id, farmer_id, well_name, lat, lng, depth_m, water_level_m, salinity_g_l, tds_mg_l, status, geological_notes, anomaly_drawdown, anomaly_salinity)
        VALUES (gen_random_uuid(), $1, $2, 'Puits P2', 35.22, 9.11, 60.0, 30.0, 0.8, 550.0, 'ACTIVE', 'Niveau stable, eau de bonne qualité.', false, false)
      `, [expert.id, f2.id]);

    } else if (expert.expert_type === ExpertType.ZOOTECHNICIAN) {
      // Seed herd records
      const f1 = assignedFarmers[0];
      await herdRecordRepo.save(herdRecordRepo.create({
        expert_id: expert.id,
        farmer_id: f1.id,
        species: 'BOVINE',
        breed: 'Holstein',
        herd_size: 25,
        daily_milk_yield_kg: 12.5,
        birth_rate_pct: 75.0,
        mortality_rate_pct: 8.5,
        last_visit_date: daysAgo(4),
        feed_program: 'Avoine + Concentré Bovin Laitier',
        notes: 'Chute inexpliquée de la production laitière journalière (moyenne 12.5 kg contre 22 kg attendus).',
        performance_alert: true,
      }));

      const f2 = assignedFarmers[1];
      await herdRecordRepo.save(herdRecordRepo.create({
        expert_id: expert.id,
        farmer_id: f2.id,
        species: 'OVINE',
        breed: 'Barbarine',
        herd_size: 120,
        daily_milk_yield_kg: 0.0,
        birth_rate_pct: 92.0,
        mortality_rate_pct: 1.2,
        last_visit_date: daysAgo(12),
        feed_program: 'Pâturage + Orge complémentaire',
        notes: 'Troupeau vigoureux, croissance normale des agneaux.',
        performance_alert: false,
      }));

    } else if (expert.expert_type === ExpertType.VETERINARY_EPIDEMIOLOGIST) {
      // Seed vaccination records
      const f1 = assignedFarmers[0];
      await vaccinationRecordRepo.save(vaccinationRecordRepo.create({
        expert_id: expert.id,
        farmer_id: f1.id,
        species: 'bovin',
        animal_count: 18,
        vaccine_name: 'Fièvre Aphteuse',
        batch_number: 'FA-2026-B1',
        vaccination_date: daysAgo(170),
        next_reminder_date: daysFromNow(4),
        is_reminder_sent: false,
        notes: 'Rappel de vaccination crucial de mi-saison.',
      }));

      const f2 = assignedFarmers[1];
      await vaccinationRecordRepo.save(vaccinationRecordRepo.create({
        expert_id: expert.id,
        farmer_id: f2.id,
        species: 'ovin',
        animal_count: 85,
        vaccine_name: 'Clostridiose (Entérotoxémie)',
        batch_number: 'CL-2025-O2',
        vaccination_date: daysAgo(120),
        next_reminder_date: daysFromNow(60),
        is_reminder_sent: false,
        notes: 'Prochaine campagne de vaccination préventive.',
      }));

      // Seed clinical dossiers (Dossiers Cliniques Vétérinaires)
      for (let cd = 0; cd < 6; cd++) {
        const cdFarmer = assignedFarmers[cd % assignedFarmers.length];
        const speciesList = ['BOVINE', 'OVINE', 'CAPRINE', 'BOVINE', 'OVINE', 'BOVINE'];
        const symptomsList = [
          'Boiterie sévère du membre antérieur droit, fièvre (40.5°C), jetage nasal purulent',
          'Diarrhée aqueuse profuse, déshydratation modérée, anorexie depuis 48h',
          'Toux grasse persistante, dyspnée, écoulement oculaire séreux',
          'Chute de production laitière brutale (de 22 à 8 l/j), mammite clinique au quartier ARG',
          'Prurit intense, zones alopéciques sur le dos et l\'encolure, lésions croûteuses',
          'Météorisation abdominale, arrêt de rumination, posture anormale (dos voûté)'
        ];
        const diagnosesList = [
          'Panaris interdigité infectieux (Fusobacterium necrophorum)',
          'Coccidiose intestinale à Eimeria spp. (confirmation coprologique)',
          'Bronchopneumonie vermineuse (Dictyocaulus viviparus)',
          'Mammite clinique à Staphylococcus aureus (CMI > 4 µg/ml)',
          'Gale sarcoptique généralisée (Sarcoptes scabiei var. bovis)',
          'Acidose ruminale subaiguë (SAR) — pH ruminal 5.2'
        ];
        const treatmentsList = [
          'AINS (flunixine méglumine 2.2 mg/kg IV) + antibiotique (oxytétracycline LA 20 mg/kg IM) + pansage antiseptique',
          'Fluidothérapie (Ringer Lactate IV 40 ml/kg) + sulfamide anticoccidien (toltrazuril 15 mg/kg PO) + smectite',
          'Anthelminthique (fenbendazole 7.5 mg/kg PO) + anti-inflammatoire (dexaméthasone 0.1 mg/kg IM) + oxygénothérapie',
          'Antibiothérapie intramammaire (céfalexine 200 mg) + AINS (kétoprofène 3 mg/kg IM) + traites fréquentes',
          'Ivermectine 0.2 mg/kg SC (3 injections à 14 jours d\'intervalle) + shampooing acaricide + désinfection de l\'environnement',
          'Bicarbonate de sodium PO (1 g/kg) + changement brutal de ration + monensin (200 mg/tête/jour)'
        ];
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS clinical_dossiers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            expert_id UUID NOT NULL, farmer_id UUID,
            species VARCHAR(50), animal_tag VARCHAR(100), animal_count INTEGER,
            visit_date DATE, symptoms TEXT, diagnosis TEXT, treatment TEXT,
            exams_requested TEXT, follow_up_date DATE, status VARCHAR(30) DEFAULT 'OPEN',
            notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await dataSource.query(`
          INSERT INTO clinical_dossiers (expert_id, farmer_id, species, animal_tag, animal_count, visit_date, symptoms, diagnosis, treatment, exams_requested, follow_up_date, status, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `, [
          expert.id, cdFarmer.id,
          speciesList[cd],
          cd === 0 ? 'TAG-001-BOV' : cd === 2 ? 'TAG-003-CAP' : cd === 4 ? 'TAG-005-OVI' : null,
          rndInt(5, 45),
          daysAgo(rndInt(2, 60)),
          symptomsList[cd],
          cd % 2 === 0 ? diagnosesList[cd] : null,
          cd % 2 === 0 ? treatmentsList[cd] : null,
          cd === 0 ? 'Radiographie membre antérieur, analyse bactériologique du pus' : cd === 3 ? 'Examen bactériologique du lait + CMI' : null,
          cd % 2 === 0 ? daysFromNow(rndInt(7, 30)) : null,
          cd >= 3 ? 'RESOLVED' : 'OPEN',
          cd % 2 === 0 ? 'Cas suivi en collaboration avec l\'éleveur. Bonne observance thérapeutique.' : 'En attente de la visite de contrôle pour confirmer le diagnostic.'
        ]);
      }
    }
  }

  // ─── 3b. Expert Consultations (15+ linked to farmers by activity type) ────────
  console.log('[ZirIA] Seeding Expert Consultations...');
  const consultRepo = dataSource.getRepository(ExpertConsultation);
  const now = new Date();
  const daysAgoConsult = (d: number) => new Date(now.getTime() - d * 86400000);

  const consultTemplates: Record<string, { type: string; descriptions: string[] }> = {
    [ExpertType.PHYTOPATHOLOGIST]: {
      type: 'DIAGNOSTIC',
      descriptions: [
        'Dépérissement rapide des jeunes pousses d\'olivier. Les feuilles présentent des taches brunes avec un jaunissement généralisé. Possible attaque de Verticillium ou de cercosporiose.',
        'Taches chlorotiques sur feuilles d\'amandier avec chute précoce des fruits. Présence de filaments blancs sur les branches.',
        'Fruits d\'agrumes montrent des lésions brunes et une pourriture au niveau du pédoncule. Le champignon semble se propager rapidement dans le verger.',
        'Feuilles de pêcher s\'enroulent et présentent des cloques rougeâtres. La production est réduite de moitié cette saison.',
        'Champignon blanc sur tronc d\'olivier centenaire. L\'écorce se détache par plaques. Urgence de sauvegarde du patrimoine.'
      ]
    },
    [ExpertType.AGRONOMIST]: {
      type: 'FERTILISATION',
      descriptions: [
        'Analyse de sol montre un pH de 8.7 et un déficit critique en phosphore (8 ppm). La parcelle de tomates de 3 ha ne produit que 12 tonnes/ha contre 35 attendues.',
        'Les plants de piment jaunissent après la transplantation. Analyse foliaire nécessaire pour carence en fer et zinc suspectée.',
        'Fertilisation NPK déséquilibrée sur blé dur (5 ha). Les épis sont petits et clairsemés. Besoin d\'un plan de fumure de rattrapage urgent.',
        'Culture d\'oignons montre des bulbes mal formés avec pourriture basale. Probable carence en bore combinée à un excès d\'azote.',
        'Verger d\'olivier intensif (8 ha) en production montre des signes d\'épuisement du sol. Les analyses indiquent une matière organique inférieure à 1%.'
      ]
    },
    [ExpertType.HYDRAULIC_ENGINEER]: {
      type: 'IRRIGATION',
      descriptions: [
        'Système goutte-à-goutte bouché sur 2 ha de pommiers. La pression chute en bout de rampe. Débit réduit de 60%. Diagnostic du réseau urgent.',
        'Conception d\'un réseau d\'irrigation pour nouvelle plantation d\'oliviers super-intensifs (12 ha) en zone semi-aride. Étude de faisabilité hydraulique requise.',
        'Bassin de stockage d\'eau de pluie (500 m³) présente des fuites. La capacité de rétention a chuté de 30% cette année.',
        'Problème de drainage sur parcelle irriguée de 4 ha — les racines des arbres fruitiers asphyxient. Remontée de nappe phréatique constatée.',
        'Calibration des débits pour irrigation localisée de 6 ha de cultures maraîchères sous serre. Pression et uniformité insuffisantes.'
      ]
    },
    [ExpertType.HYDROGEOLOGIST]: {
      type: 'EAU_SOUTERRAINE',
      descriptions: [
        'Puits artésien (60 m) voit son débit chuter de 15 m³/h à 7 m³/h en 3 mois. Baisse du niveau statique de 8 mètres. Épuisement de la nappe suspecté.',
        'Eau de puits montre une salinité de 4.5 g/l — les cultures irriguées présentent un stress salin sévère. Analyse du cône de rabattement nécessaire.',
        'Étude hydrogéologique pour implantation d\'un nouveau forage agricole dans la délégation de Sbeïtla. Caractérisation de l\'aquifère requis.',
        'Puits traditionnel s\'est effondré partiellement. Remplacement par forage tubé moderne demandé pour sécuriser l\'approvisionnement d\'un cheptel de 80 têtes.',
        'Rebouchage et abandon d\'un puits contaminé par des nitrates (120 mg/l). Plan de protection de la nappe phréatique à établir.'
      ]
    },
    [ExpertType.ZOOTECHNICIAN]: {
      type: 'NUTRITION_ANIMALE',
      descriptions: [
        'Troupeau bovin laitier (25 vaches Holstein) en chute de production : 12 l/j au lieu de 25 l/j. Ration déséquilibrée. Analyse des fourrages recommandée.',
        'Agneaux Barbarin présentent un retard de croissance à 3 mois. Sevrage précoce et alimentation concentrée inadaptée. Programme de rattrapage urgent.',
        'Troupeau caprin (50 chèvres) montre des problèmes de fertilité — taux de gestation inférieur à 40%. Bilan nutritionnel et ajustement de la ration.',
        'Conception d\'une unité d\'alimentation de bétail pour 100 bovins avec stockage d\'ensilage et rationnement automatisé. Étude technico-économique.',
        'Vaches taries mal suivies — problème de vêlage et reprise de lactation retardée. Programme de transition alimentaire à mettre en place.'
      ]
    },
    [ExpertType.VETERINARY_EPIDEMIOLOGIST]: {
      type: 'PROPHYLAXIE',
      descriptions: [
        'Campagne de vaccination anti-aphteuse pour 120 bovins dans la région de Kasserine. 45 animaux non vaccinés — couverture insuffisante. Risque épidémiologique.',
        'Foyer de clostridiose suspecté dans un troupeau ovin — 3 brebis mortes en 48h. Autopsie et prélèvements nécessaire diagnostic d\'urgence.',
        'Plan prophylactique annuel pour élevage bovin mixte (60 têtes) : programme de vaccination, vermifugation et dépistage brucellose/tuberculose.',
        'Suspicion de mammite contagieuse dans un troupeau laitier — cellules somatiques élevées (>800 000). Bactériologie du lait et isolement des animaux atteints.',
        'Certification sanitaire pour export d\'agneaux vers la Libye (300 têtes). Protocole de vaccination et sérologie conformes au cahier des charges.'
      ]
    }
  };

  const consultationTypes = ['DIAGNOSTIC', 'FERTILISATION', 'IRRIGATION', 'EAU_SOUTERRAINE', 'NUTRITION_ANIMALE', 'PROPHYLAXIE'];
  const allStatuses = [ConsultationStatus.OPEN, ConsultationStatus.IN_PROGRESS, ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED];

  for (let i = 0; i < expertsList.length; i++) {
    const expert = expertsList[i];
    const expertType = expert.expert_type as ExpertType;
    const template = consultTemplates[expertType];
    if (!template) continue;
    const isCrdaAgent = expertTypes[i].statuses.includes('CRDA_AGENT');

    // Get the right farmers for this expert type
    let relevantFarmers: User[];
    if (expertType === ExpertType.ZOOTECHNICIAN || expertType === ExpertType.VETERINARY_EPIDEMIOLOGIST) {
      relevantFarmers = livestockFarmers;
    } else {
      relevantFarmers = cropFarmers;
    }

    // 3 consultations per expert
    for (let j = 0; j < 3; j++) {
      const farmer = relevantFarmers[(i + j) % relevantFarmers.length];
      const descIndex = j % template.descriptions.length;
      const status = allStatuses[j % allStatuses.length];
      const isCompleted = status === ConsultationStatus.COMPLETED;
      const isInProgress = status === ConsultationStatus.IN_PROGRESS;

      let grossAmount = 0;
      if (isCompleted || isInProgress) {
        grossAmount = isCrdaAgent ? 0 : 45 + Math.round(Math.random() * 55);
      }

      const consultation = consultRepo.create({
        farmer_id: farmer.id,
        expert_id: isInProgress || isCompleted ? expert.id : null,
        expert_type: expertType,
        consultation_type: template.type,
        description: template.descriptions[descIndex],
        status: isInProgress ? ConsultationStatus.IN_PROGRESS : isCompleted ? ConsultationStatus.COMPLETED : ConsultationStatus.OPEN,
        gross_amount_tnd: grossAmount,
        net_to_expert_tnd: isCompleted ? grossAmount * 0.88 : 0,
        platform_commission_tnd: isCompleted ? grossAmount * 0.12 : 0,
        expert_response: isCompleted
          ? randomItem([
              'Suite à mon analyse, voici mes recommandations : appliquer un traitement fongicide à base de cuivre (3 kg/ha) et éliminer les parties infectées. Revoir le programme d\'irrigation pour éviter l\'excès d\'humidité.',
              'Diagnostic confirmé après examen. Préconise un apport de 150 unités d\'azote fractionné en 3 passages, 80 unités de phosphore au semis, et 120 unités de potassium. Chaulage recommandé pour corriger le pH.',
              'Après étude du dossier et visite de terrain, le réseau d\'irrigation nécessite un rinçage acide des gaines suivi d\'un remplacement des goutteurs colmatés. Devis d\'intervention transmis.',
              'Plan de prophylaxie établi : vaccination FCO + Fièvre Aphteuse rappel, vermifugation stratégique avant mise à l\'herbe, et complémentation minérale en oligo-éléments. Suivi dans 30 jours.'
            ])
          : null,
        completed_at: isCompleted ? daysAgoConsult(Math.round(Math.random() * 30 + 5)) : null,
        created_at: daysAgoConsult(Math.round(Math.random() * 45 + 1)),
        consultation_photo_url: null
      });

      await consultRepo.save(consultation);
    }
  }

  // Also create 3 extra OPEN consultations with no expert assigned (for the queue)
  for (let i = 0; i < 3; i++) {
    const expertType = expertsList[i % expertsList.length].expert_type as ExpertType;
    const template = consultTemplates[expertType];
    if (!template) continue;
    const relevantFarmers = (expertType === ExpertType.ZOOTECHNICIAN || expertType === ExpertType.VETERINARY_EPIDEMIOLOGIST)
      ? livestockFarmers : cropFarmers;
    const farmer = relevantFarmers[(i + 5) % relevantFarmers.length];

    const consultation = consultRepo.create({
      farmer_id: farmer.id,
      expert_id: null,
      expert_type: expertType,
      consultation_type: template.type,
      description: template.descriptions[0],
      status: ConsultationStatus.OPEN,
      gross_amount_tnd: 0,
      net_to_expert_tnd: 0,
      platform_commission_tnd: 0,
      created_at: daysAgoConsult(Math.round(Math.random() * 5 + 1))
    });
    await consultRepo.save(consultation);
  }

  // ─── 3c. Prescriptions for each expert type ─────────────────────────────────
  console.log('[ZirIA] Seeding Expert Prescriptions...');
  const prescriptRepo = dataSource.getRepository(Prescription);

  const prescriptionData: { expertIdx: number; farmerIdx: number; product: string; dosage: string; method: ApplicationMethod; days: number; notes: string }[] = [
    // PHYTOPATHOLOGIST (index 0)
    { expertIdx: 0, farmerIdx: 0, product: 'Bouillie Bordelaise (Cuivre 20%)', dosage: '3 kg/ha', method: ApplicationMethod.SPRAY, days: 14, notes: 'Traitement préventif oïdium et mildiou sur olivier. Renouveler après pluie.' },
    { expertIdx: 0, farmerIdx: 0, product: 'Soufre Micronisé 80 WG', dosage: '5 kg/ha', method: ApplicationMethod.SPRAY, days: 7, notes: 'Application curative sur taches foliaires détectées. Traiter tôt le matin.' },
    { expertIdx: 0, farmerIdx: 1, product: 'Fongicide systémique (Azoxystrobine 250SC)', dosage: '1 l/ha', method: ApplicationMethod.SPRAY, days: 21, notes: 'Pour pourriture des fruits. Respecter DAR de 21 jours.' },
    { expertIdx: 0, farmerIdx: 2, product: 'Huile blanche paraffinique', dosage: '8 l/ha', method: ApplicationMethod.SPRAY, days: 0, notes: 'Traitement d\'hiver contre cochenilles sur agrumes. Appliquer avant débourrement.' },
    // AGRONOMIST (index 1)
    { expertIdx: 1, farmerIdx: 0, product: 'Ammonitrate 33.5%', dosage: '200 kg/ha', method: ApplicationMethod.SOIL, days: 30, notes: 'Apport azoté fractionné : 1/3 maintenant, 1/3 tallage, 1/3 montaison.' },
    { expertIdx: 1, farmerIdx: 1, product: 'Fumure organique (Fumier bovin composté)', dosage: '15 t/ha', method: ApplicationMethod.SOIL, days: 0, notes: 'Incorporation avant labour pour améliorer la matière organique du sol.' },
    { expertIdx: 1, farmerIdx: 2, product: 'NPK 15-15-15 + Oligo-éléments', dosage: '350 kg/ha', method: ApplicationMethod.SOIL, days: 60, notes: 'Fertilisation de fond pour blé dur. Adapter selon analyse de sol.' },
    { expertIdx: 1, farmerIdx: 0, product: 'Chaulage (Carbonate de calcium)', dosage: '2 t/ha', method: ApplicationMethod.SOIL, days: 0, notes: 'Correction du pH de 5.8 à 6.5. Incorporer sur 20 cm de profondeur.' },
    // HYDRAULIC_ENGINEER (index 2)
    { expertIdx: 2, farmerIdx: 0, product: 'Goutteurs auto-régulants 4 l/h', dosage: '2000 unités/ha', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Remplacement des goutteurs colmatés sur réseau existant. Espacement 0.5 m.' },
    { expertIdx: 2, farmerIdx: 1, product: 'Tuyau PEHD 16 mm - 6 atm', dosage: '800 m/ha', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Réseau secondaire pour nouvelle plantation super-intensif.' },
    { expertIdx: 2, farmerIdx: 2, product: 'Filtre à disque 2" - 120 mesh', dosage: '2 unités', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Installation filtration tête de réseau pour eau de forage chargée.' },
    // HYDROGEOLOGIST (index 3)
    { expertIdx: 3, farmerIdx: 0, product: 'Tubes PVC DN 125 - PN10', dosage: '60 m', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Tubage de remplacement pour puits effondré. Crépines inox jointes.' },
    { expertIdx: 3, farmerIdx: 1, product: 'Pompe immergée Grundfos 4" - 2.2 kW', dosage: '1 unité', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Nouvelle pompe pour forage 60 m. Débit nominal 8 m³/h.' },
    { expertIdx: 3, farmerIdx: 2, product: 'Chlore stabilisé (pastilles)', dosage: '5 kg/mois', method: ApplicationMethod.IRRIGATION, days: 0, notes: 'Traitement chloration pour désinfection puits contaminé par nitrates.' },
    // ZOOTECHNICIAN (index 4)
    { expertIdx: 4, farmerIdx: 0, product: 'Aliment concentré vache laitière 18% MAT', dosage: '8 kg/tête/jour', method: ApplicationMethod.SOIL, days: 0, notes: 'Complémentation pour rattrapage de production laitière. Distribuer en 2 repas.' },
    { expertIdx: 4, farmerIdx: 1, product: 'Correcteur minéral CMV brebis', dosage: '50 g/tête/jour', method: ApplicationMethod.SOIL, days: 0, notes: 'CMV en période de lutte pour améliorer fertilité. Mélanger à la ration.' },
    { expertIdx: 4, farmerIdx: 0, product: 'Foin de luzerne déshydratée', dosage: '3 kg/tête/jour', method: ApplicationMethod.SOIL, days: 0, notes: 'Fourrage complémentaire pour bovins en stabulation. Apport protéique.' },
    { expertIdx: 4, farmerIdx: 2, product: 'Ensilage de maïs plante entière', dosage: '20 kg/tête/jour', method: ApplicationMethod.SOIL, days: 0, notes: 'Ration de base pour vaches taries. Distribuer à volonté.' },
    // VETERINARY_EPIDEMIOLOGIST (index 5)
    { expertIdx: 5, farmerIdx: 0, product: 'Vaccin Fièvre Aphteuse trivalent O/A/Asia1', dosage: '2 ml/tête SC', method: ApplicationMethod.SPRAY, days: 0, notes: 'Rappel annuel. Injection sous-cutanée. Conservation 2-8°C.' },
    { expertIdx: 5, farmerIdx: 1, product: 'Vermifuge Ivermectine 1% SC', dosage: '1 ml/50 kg', method: ApplicationMethod.SPRAY, days: 0, notes: 'Traitement antiparasitaire stratégique avant mise à l\'herbe.' },
    { expertIdx: 5, farmerIdx: 0, product: 'Antibiotique Oxytétracycline LA', dosage: '1 ml/10 kg IM', method: ApplicationMethod.SPRAY, days: 0, notes: 'Traitement présomptif de clostridiose sur 5 brebis symptomatiques.' },
    { expertIdx: 5, farmerIdx: 2, product: 'Complément vitaminé AD3E', dosage: '3 ml/tête IM', method: ApplicationMethod.SPRAY, days: 0, notes: 'Boost immunitaire avant campagne de vaccination. Injecter 7 jours avant.' },
  ];

  for (const p of prescriptionData) {
    const expert = expertsList[p.expertIdx];
    const assigned = expertAssignedFarmers[p.expertIdx];
    const farmer = assigned[p.farmerIdx % assigned.length];

    await prescriptRepo.save(prescriptRepo.create({
      expert_id: expert.id,
      farmer_id: farmer.id,
      product_name: p.product,
      dosage: p.dosage,
      application_method: p.method,
      pre_harvest_days: p.days > 0 ? p.days : null,
      notes: p.notes,
      valid_until: p.days > 0 ? daysFromNow(p.days + 30) : null,
      created_at: daysAgoConsult(Math.round(Math.random() * 30 + 5))
    }));
  }

  // ─── 3d. Expert Messages (2 conversations per expert) ────────────────────────
  console.log('[ZirIA] Seeding Expert Messages...');
  const msgRepo = dataSource.getRepository(ExpertMessage);

  const messageThreads = [
    { expertIdx: 0, farmerOffset: 0, messages: [
      'Bonjour docteur, mes oliviers perdent leurs feuilles et les fruits noircissent. Pouvez-vous passer?',
      'Bonjour, je peux passer cette semaine. Pouvez-vous m\'envoyer des photos des arbres touchés?',
      'Oui je vous envoie ça tout à l\'heure. Merci docteur.',
    ]},
    { expertIdx: 0, farmerOffset: 1, messages: [
      'Salam, j\'ai remarqué des taches jaunes sur les feuilles de mes amandiers. Qu\'est-ce que ça peut être?',
      'Salam, cela pourrait être de la cloque ou de la cercosporiose. Pouvez-vous prélever un échantillon?',
      'D\'accord je vais le faire. Merci pour votre aide.',
    ]},
    { expertIdx: 1, farmerOffset: 0, messages: [
      'Bonjour, j\'ai fait analyser mon sol et le pH est à 8.5. Que dois-je faire?',
      'Bonjour, il faut chauler et apporter de la matière organique. Je vous prépare un plan de fumure.',
      'Super merci! J\'attends votre plan.',
    ]},
    { expertIdx: 1, farmerOffset: 1, messages: [
      'Salam ingénieur, mes tomates ne grossissent pas. Je pense que c\'est un manque d\'engrais.',
      'Salam, il faudrait faire une analyse foliaire pour confirmer. Mais un apport de NPK 15-15-15 pourrait aider.',
    ]},
    { expertIdx: 2, farmerOffset: 0, messages: [
      'Bonjour, mon système goutte-à-goutte ne fonctionne plus correctement. Le débit est très faible.',
      'Bonjour, cela ressemble à un colmatage. Je peux venir faire un diagnostic demain.',
      'Parfait, à demain 9h.',
    ]},
    { expertIdx: 3, farmerOffset: 0, messages: [
      'Bonjour docteur, le débit de mon puits a beaucoup baissé. Il ne donne que 5 m³/h maintenant.',
      'Bonjour, il faudrait mesurer le niveau statique. Je passe la semaine prochaine.',
    ]},
    { expertIdx: 4, farmerOffset: 0, messages: [
      'Bonjour docteur, mes vaches produisent moins de lait. Elles étaient à 25 l/j et maintenant 12 l/j.',
      'Bonjour, cela peut être dû à la ration. Il faut analyser les fourrages. Je vous envoie un protocole.',
    ]},
    { expertIdx: 5, farmerOffset: 0, messages: [
      'Bonjour docteur, j\'ai 3 brebis mortes en 2 jours. Je ne sais pas ce qu\'elles ont.',
      'Bonjour, cela ressemble à une clostridiose. Il faut isoler les autres et vacciner d\'urgence. Je viens demain.',
    ]},
  ];

  for (const thread of messageThreads) {
    const expert = expertsList[thread.expertIdx];
    const assigned = expertAssignedFarmers[thread.expertIdx];
    const farmer = assigned[thread.farmerOffset % assigned.length];
    let daysOffset = 15;

    for (let m = 0; m < thread.messages.length; m++) {
      const isFarmer = m % 2 === 0;
      daysOffset += Math.round(Math.random() * 3 + 1);
      const msg = msgRepo.create({
        sender_id: isFarmer ? farmer.id : expert.id,
        receiver_id: isFarmer ? expert.id : farmer.id,
        body: thread.messages[m],
        read_at: m < thread.messages.length - 1 ? new Date() : null,
        created_at: daysAgoConsult(daysOffset),
      });
      await msgRepo.save(msg);
    }
  }

  // ─── 3e. Additional domain data for each expert type ─────────────────────────
  console.log('[ZirIA] Seeding Additional Expert Domain Data...');

  // PHYTOPATHOLOGIST: Additional disease detections assigned to them
  const phytoExpert = expertsList[0];
  const phytoFarmers = cropFarmers.slice(0, 4);
  for (let i = 0; i < 8; i++) {
    const farmer = phytoFarmers[i % phytoFarmers.length];
    const parcel = parcelsList.find(p => p.owner_id === farmer.id);
    const diseases = ['Oeil de paon', 'Cercosporiose', 'Cloque du pêcher', 'Verticilliose', 'Fumagine', 'Pourriture des fruits', 'Gale olive', 'Taches bactériennes'];
    const disease = diseases[i % diseases.length];
    await diseaseRepo.save(diseaseRepo.create({
      reporter_id: farmer.id,
      parcel_id: parcel?.id,
      lat: farmer.lat || 35.0,
      lng: farmer.lng || 9.0,
      crop_type: parcel?.crop_type || 'Olive',
      disease_name: disease,
      confidence_score: rnd(0.65, 0.95),
      requires_expert_validation: true,
      required_expert_type: ExpertType.PHYTOPATHOLOGIST,
      assigned_expert_id: phytoExpert.id,
      urgency: i < 2 ? DetectionUrgency.CRITICAL : i < 5 ? DetectionUrgency.MEDIUM : DetectionUrgency.LOW,
      recommendation_fr: 'Traitement fongicide recommandé après confirmation visuelle. Appliquer un cuivre ou soufre selon le pathogène identifié.',
      is_expert_validated: i < 3,
      expert_comments: i < 3 ? 'Diagnostic confirmé. Traitement cuprique préconisé à 3 kg/ha.' : null,
      created_at: daysAgoConsult(rndInt(1, 60)),
    }));
  }

  // AGRONOMIST: Additional soil analyses
  const agronomist = expertsList[1];
  const agriFarmers = expertAssignedFarmers[1];
  for (let i = 0; i < 6; i++) {
    const farmer = agriFarmers[i % agriFarmers.length];
    const parcel = parcelsList.find(p => p.owner_id === farmer.id);
    const isAlert = i % 3 === 0;
    await dataSource.query(`
      INSERT INTO soil_analyses (id, expert_id, farmer_id, parcel_id, analysis_date, ph, organic_matter_pct, nitrogen_ppm, phosphorus_ppm, potassium_ppm, conductivity_ms, notes)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      agronomist.id, farmer.id, parcel?.id || null,
      daysAgoConsult(rndInt(5, 90)),
      rnd(5.5, 8.8, 1), rnd(0.5, 4.0, 1),
      rnd(30, 180, 0), rnd(5, 60, 0), rnd(20, 150, 0),
      rnd(0.5, 3.5, 2),
      isAlert
        ? `ALERTE: ${i === 0 ? 'pH alcalin et carence phosphore' : i === 3 ? 'Excès de sels et sodium élevé' : 'Forte carence en potassium détectée'}`
        : `Sol ${i === 1 ? 'équilibré, fertilité moyenne' : i === 2 ? 'riche en matière organique' : i === 4 ? 'sain avec bonne structure' : 'convenable pour cultures maraîchères'}.`
    ]);
  }

  // HYDRAULIC_ENGINEER: Additional water projects
  const hydraulicExpert = expertsList[2];
  const hydraulicFarmers = expertAssignedFarmers[2];
  for (let i = 0; i < 6; i++) {
    const farmer = hydraulicFarmers[i % hydraulicFarmers.length];
    const projectNames = ['Irrigation localisée verger', 'Goutte-à-goutte oliveraie', 'Micro-aspersion sous serre', 'Pivot centre blé', 'Réseau californien maraîchage', 'Aspersion couverture totale'];
    const irrigationTypes = ['GOUTTE_A_GOUTTE', 'MICRO_ASPERSEUR', 'ASPERSEUR', 'PIVOT', 'GOUTTE_A_GOUTTE', 'ASPERSEUR'];
    const statuses = ['DESIGN', 'INSTALLATION', 'COMPLETED', 'DESIGN', 'INSTALLATION', 'COMPLETED'];
    const isOverdue = i % 4 === 0;

    await dataSource.query(`
      INSERT INTO water_projects (id, expert_id, farmer_id, project_name, irrigation_type, status, area_ha, installation_date, estimated_completion_date, notes)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      hydraulicExpert.id, farmer.id,
      projectNames[i] + ' ' + farmer.delegation,
      irrigationTypes[i], statuses[i],
      rnd(2, 15, 1),
      statuses[i] === 'DESIGN' ? null : daysAgoConsult(rndInt(10, 90)),
      isOverdue ? daysAgoConsult(5) : daysFromNow(rndInt(10, 60)),
      isOverdue
        ? 'URGENT: Retard d\'exécution. Les travaux n\'ont pas commencé à la date prévue.'
        : statuses[i] === 'COMPLETED' ? 'Projet livré et réceptionné par l\'agriculteur. Satisfaction client.' : 'Conception en cours, plans validés.'
    ]);
  }

  // HYDROGEOLOGIST: Additional wells with measurements
  const hydroExpert = expertsList[3];
  const hydroFarmers = expertAssignedFarmers[3];
  for (let i = 0; i < 6; i++) {
    const farmer = hydroFarmers[i % hydroFarmers.length];
    const hasAnomaly = i % 3 === 1;
    const wellRes = await dataSource.query(`
      INSERT INTO wells (id, expert_id, farmer_id, well_name, lat, lng, depth_m, water_level_m, salinity_g_l, tds_mg_l, status, geological_notes, anomaly_drawdown, anomaly_salinity)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      hydroExpert.id, farmer.id,
      `Puits ${farmer.delegation} #${i + 1}`,
      rnd(35.0, 36.5, 4), rnd(8.5, 10.5, 4),
      rndInt(40, 120),
      rndInt(15, 80),
      hasAnomaly ? rnd(2.5, 5.5, 1) : rnd(0.3, 1.8, 1),
      hasAnomaly ? rnd(1500, 3500, 0) : rnd(200, 1000, 0),
      hasAnomaly ? 'WARNING' : 'ACTIVE',
      hasAnomaly
        ? `Salinité élevée détectée. Risque de dégradation de la qualité d'eau pour irrigation.`
        : i % 2 === 0 ? 'Niveau stable, bonne qualité d\'eau.' : 'Aquifère productif, débit satisfaisant.',
      false, hasAnomaly
    ]);

    if (wellRes[0]?.id) {
      // Add 2 measurements per well
      for (let m = 0; m < 2; m++) {
        await dataSource.query(`
          INSERT INTO well_measurements (id, well_id, water_level_m, salinity_g_l, notes, measured_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        `, [
          wellRes[0].id,
          rnd(20, 75, 1),
          hasAnomaly ? rnd(2.0, 5.0, 1) : rnd(0.3, 1.5, 1),
          m === 0 ? 'Mesure de référence' : hasAnomaly ? 'ALERTE: Hausse de salinité confirmée' : 'Mesure de routine - valeurs normales',
          daysAgoConsult(rndInt(5, 60))
        ]);
      }
    }
  }

  // ZOOTECHNICIAN: Additional herd records
  const zooExpert = expertsList[4];
  const zooFarmers = expertAssignedFarmers[4];
  for (let i = 0; i < 8; i++) {
    const farmer = zooFarmers[i % zooFarmers.length];
    const species = ['BOVINE', 'OVINE', 'BOVINE', 'CAPRINE', 'OVINE', 'BOVINE', 'CAPRINE', 'OVINE'];
    const breeds = ['Holstein', 'Barbarine', 'Montbéliarde', 'Marka', 'Queue Fine de l\'Ouest', 'Holstein', 'Nubienne', 'Barbarine'];
    const isAlert = i % 3 === 1;
    const herdRepo = dataSource.getRepository(HerdRecord);
    await herdRepo.save(herdRepo.create({
      expert_id: zooExpert.id,
      farmer_id: farmer.id,
      species: species[i],
      breed: breeds[i],
      herd_size: rndInt(15, 150),
      daily_milk_yield_kg: species[i] === 'BOVINE' ? rnd(8, 28, 1) : 0,
      birth_rate_pct: isAlert ? rnd(40, 55, 0) : rnd(75, 95, 0),
      mortality_rate_pct: isAlert ? rnd(8, 15, 1) : rnd(1, 4, 1),
      last_visit_date: daysAgoConsult(rndInt(3, 45)),
      feed_program: isAlert
        ? randomItem(['Ration déséquilibrée (foin seul)', 'Concentré insuffisant pour lactation', 'Pâturage dégradé, complément nécessaire'])
        : randomItem(['Avoine + Concentré 18% MAT', 'Luzerne + Orge + CMV', 'Pâturage + Ensilage maïs', 'Ration complète mélangée']),
      notes: isAlert
        ? randomItem(['ALERTE: Chute de production laitière', 'Taux de mortalité anormalement élevé', 'Problème de fertilité détecté'])
        : randomItem(['Troupeau en bonne santé', 'Performances stables', 'Bon état corporel général']),
      performance_alert: isAlert,
    }));
  }

  // VETERINARY_EPIDEMIOLOGIST: Additional vaccination records
  const vetExpert = expertsList[5];
  const vetFarmers = expertAssignedFarmers[5];
  for (let i = 0; i < 8; i++) {
    const farmer = vetFarmers[i % vetFarmers.length];
    const speciesList = ['bovin', 'ovin', 'bovin', 'caprin', 'ovin', 'bovin', 'caprin', 'ovin'];
    const vaccines = ['Fièvre Aphteuse', 'Clostridiose', 'Brucellose (RB51)', 'PPR', 'Fièvre Aphteuse', 'Charbon Bactéridien', 'Enterotoxémie', 'Rage'];
    const isUpcoming = i % 3 === 0;
    const vetVaccRepo = dataSource.getRepository(VaccinationRecord);
    await vetVaccRepo.save(vetVaccRepo.create({
      expert_id: vetExpert.id,
      farmer_id: farmer.id,
      species: speciesList[i],
      animal_count: rndInt(10, 120),
      vaccine_name: vaccines[i],
      batch_number: `VAC-${2026}-${String(i + 1).padStart(3, '0')}`,
      vaccination_date: isUpcoming ? daysAgoConsult(rndInt(150, 200)) : daysAgoConsult(rndInt(30, 120)),
      next_reminder_date: isUpcoming ? daysFromNow(rndInt(3, 15)) : daysFromNow(rndInt(30, 90)),
      is_reminder_sent: false,
      notes: isUpcoming
        ? 'RAPPEL: Vaccination de rappel imminente! Planifier la visite.'
        : randomItem(['Campagne vaccinale terminée avec succès.', 'Vaccination de routine effectuée.', 'Couverture vaccinale satisfaisante.']),
    }));
  }

  // ─── 3f. Field reports for ambassadors in expert zones ───────────────────────
  console.log('[ZirIA] Seeding Field Reports...');
  try {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS field_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ambassador_id UUID NOT NULL,
        farmer_id UUID,
        zone_id UUID,
        severity VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(30) DEFAULT 'PENDING',
        description TEXT,
        affected_crop_type VARCHAR(100),
        affected_area_ha NUMERIC(8,2),
        photo_urls JSONB DEFAULT '[]',
        gps_lat NUMERIC(10,7), gps_lng NUMERIC(10,7),
        observations TEXT, recommendations TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
  } catch (e) { /* table already exists */ }

  for (let i = 0; i < 12; i++) {
    const farmer = farmersList[i % farmersList.length];
    const zone = zonesList[i % zonesList.length];
    const ambassador = ambassadorsList[i % ambassadorsList.length];
    const isCritical = i % 4 === 0;
    const severity = isCritical ? 'CRITICAL' : i % 3 === 0 ? 'HIGH' : 'MEDIUM';
    const crops = ['Olive', 'Amandier', 'Blé dur', 'Tomate', 'Piment', 'Orge', 'Pommier', 'Agrumes', 'Abricotier', 'Figuier', 'Grenadier', 'Pêcher'];

    await dataSource.query(`
      INSERT INTO field_reports (id, ambassador_id, farmer_id, zone_id, severity, status, description, affected_crop_type, affected_area_ha, gps_lat, gps_lng, observations, recommendations, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      ambassador.id, farmer.id, zone.id, severity,
      isCritical
        ? randomItem(['Attaque sévère de criquets pèlerins signalée dans le secteur', 'Maladie fongique rapide détectée sur les cultures irriguées', 'Dégâts de grêle importants sur vergers', 'Feux de broussailles menaçant les parcelles agricoles'])
        : randomItem(['Présence de pucerons sur jeunes pousses', 'Déficit hydrique observé sur les cultures', 'Mildiou détecté sur parcelles de tomates', 'Symptômes de carence sur blé dur', 'Population de rongeurs en augmentation']),
      crops[i],
      rnd(1, 12, 1), farmer.lat || 35.0, farmer.lng || 9.0,
      isCritical
        ? 'Les dégâts sont importants, une intervention urgente des autorités compétentes est requise.'
        : 'Observation de routine. Nécessite une évaluation par un expert de la CRDA.',
      isCritical
        ? 'URGENT: Contacter immédiatement la CRDA et les services de protection des végétaux.'
        : 'Programmer une visite d\'évaluation dans les plus brefs délais.',
      daysAgoConsult(rndInt(1, 30))
    ]);
  }

  // ─── 4. Workers & Jobs (10+ Workers, 15+ Jobs) ──────────────────────────────
  console.log('[ZirIA] Seeding Workers & Job Ecosystem...');
  const workersList: WorkerProfile[] = [];
  for (let i = 0; i < 10; i++) {
    const loc = randomItem(REGIONS);
    const user = await userRepo.save(userRepo.create({
      email: `worker${i+1}@ziria.tn`, name: `Ouvrier ${TUNISIAN_NAMES[(i+7)%20]}`,
      role: Role.WORKER, password_hash: passwordHash, verified: true
    }));
    const profile = await workerRepo.save(workerRepo.create({
      user_id: user.id,
      skills: ['Récolte', 'Taille', 'Irrigation'],
      daily_rate_tnd: rndInt(40, 70),
      is_available: true,
      lat: loc.lat, lng: loc.lng,
      rating: rnd(4, 5, 1)
    }) as any);
    workersList.push(profile);
  }

  for (let i = 0; i < 15; i++) {
    const farmer = randomItem(farmersList);
    const offer = await jobOfferRepo.save(jobOfferRepo.create({
      employer_id: farmer.id,
      task_type: randomItem(['Récolte', 'Taille', 'Désherbage', 'Plantation']),
      description: `Besoin de bras pour la campagne de ${randomItem(CROPS).cat} à ${farmer.delegation}.`,
      start_date: daysFromNow(rndInt(2, 20)),
      duration_days: rndInt(5, 15),
      daily_pay_tnd: rndInt(45, 65),
      status: JobOfferStatus.OPEN
    }) as any);

    // Random applications
    for (let j = 0; j < 2; j++) {
      await jobAppRepo.save(jobAppRepo.create({
        job_offer_id: offer.id,
        worker_profile_id: randomItem(workersList).id,
        status: ApplicationStatus.PENDING,
        cover_message: 'Je suis disponible et expérimenté.'
      }) as any);
    }
  }

  // ─── 5. Drivers & Transport (10+ Drivers, 15+ Requests) ─────────────────────
  console.log('[ZirIA] Seeding Drivers & Transport Requests...');
  const driversList: DriverProfile[] = [];
  for (let i = 0; i < 10; i++) {
    const loc = randomItem(REGIONS);
    let email = `driver${i+1}@ziria.tn`;
    if (i === 0) email = 'drivier1@ziria.tn';
    if (i === 1) email = 'driver1@ziria.tn';

    const user = await userRepo.save(userRepo.create({
      email, name: `Chauffeur ${TUNISIAN_NAMES[(i+3)%20]}`,
      role: Role.DRIVER, password_hash: passwordHash, verified: true
    }));
    const profile = await driverRepo.save(driverRepo.create({
      user_id: user.id,
      vehicle_type: randomItem([VehicleType.TRUCK, VehicleType.VAN, VehicleType.PICKUP]),
      capacity_tonnes: rndInt(5, 25),
      vehicle_plate: `TN ${rndInt(100, 255)} ${rndInt(1000, 9999)}`,
      is_available: true,
      lat: loc.lat, lng: loc.lng,
      rating: rnd(4.5, 5, 1)
    }) as any);
    driversList.push(profile);
  }

  for (let i = 0; i < 15; i++) {
    const farmer = randomItem(farmersList);
    await transportRepo.save(transportRepo.create({
      requester_id: farmer.id,
      origin_address: `${farmer.delegation}, ${farmer.governorate}`,
      destination_address: 'Marché de Gros Bir El Kassaâ, Tunis',
      cargo_type: randomItem(CROPS).cat,
      weight_tonnes: rnd(2, 10),
      proposed_price_tnd: rndInt(250, 750),
      status: TransportStatus.PENDING,
      pickup_date: daysFromNow(rndInt(1, 10)),
      origin_lat: (farmer.lat || 35.0),
      origin_lng: (farmer.lng || 9.0),
      destination_lat: 36.7,
      destination_lng: 10.2
    } as any));
  }

  // ─── 6. Equipment & Owners (5+ Owners, 15+ Reservations) ────────────────────
  console.log('[ZirIA] Seeding Equipment & Reservations...');
  const equipOwnersList: User[] = [];
  const allEquipList: Equipment[] = [];
  for (let i = 0; i < 5; i++) {
    const owner = await userRepo.save(userRepo.create({
      email: `equip_owner${i+1}@ziria.tn`, name: `Propriétaire ${TUNISIAN_NAMES[i+15]}`,
      role: Role.EQUIP_OWNER, password_hash: passwordHash, verified: true
    }));
    equipOwnersList.push(owner);

    for (let j = 0; j < 3; j++) {
      const loc = randomItem(REGIONS);
      const equip = await equipRepo.save(equipRepo.create({
        owner_id: owner.id,
        type: randomItem(['Tracteur New Holland', 'Moissonneuse-Batteuse Claas', 'Atomiseur 1000L', 'Drone Agri-Mantis']),
        daily_rate_tnd: rndInt(150, 450),
        available: true,
        lat: loc.lat, lng: loc.lng
      } as any) as any) as any;
      allEquipList.push(equip);
    }
  }

  for (let i = 0; i < 15; i++) {
    const farmer = randomItem(farmersList);
    const equip = randomItem(allEquipList);
    await equipResRepo.save(equipResRepo.create({
      equipment_id: equip.id,
      lessee_id: farmer.id,
      start_date: daysFromNow(rndInt(1, 15)),
      end_date: daysFromNow(rndInt(16, 20)),
      total_price_tnd: equip.daily_rate_tnd * 5,
      status: 'CONFIRMED'
    } as any));
  }

  // ─── 7. Diversified Marketplace Listings (22+ Items) ────────────────────────
  console.log('[ZirIA] Seeding Diversified Marketplace Listings (20+)...');
  const IMG = (id: string) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

  const MARKET_PRODS: Array<{
    title: string;
    qty: number;
    price: number;
    unit: string;
    place: string;
    desc: string;
    imgs: string[];
  }> = [
    {
      title: 'Tracteur Massey Ferguson 265 occasion',
      qty: 1, price: 24000, unit: 'unité', place: 'Foussana, Kasserine',
      desc: 'Tracteur robuste en excellent état mécanique, année 1985, révisé. Disponible à Foussana, Kasserine.',
      imgs: [IMG('photo-1595974482597-4b8da8879bc5'), IMG('photo-1625246330308-2fb927781a05')],
    },
    {
      title: 'Béliers de race Barbarine pour Aïd',
      qty: 10, price: 850, unit: 'tête', place: 'Regueb, Sidi Bouzid',
      desc: 'Béliers nourris sainement pour la fête, poids moyen 55 kg. Élevage traditionnel à Regueb, Sidi Bouzid.',
      imgs: [IMG('photo-1484557985045-edf25e08da73'), IMG('photo-1454496948207-99ee9788c849')],
    },
    {
      title: 'Vache Laitière Holstein Croisée',
      qty: 2, price: 6200, unit: 'tête', place: 'Sbeitla, Kasserine',
      desc: 'Vache productive, environ 22 L de lait par jour. Située à Sbeitla, Kasserine.',
      imgs: [IMG('photo-1570042225831-d9bfe7e557eb'), IMG('photo-1500598297459-704fa9a0f9d0')],
    },
    {
      title: 'Citerne d\'eau tractée 3000L',
      qty: 1, price: 3500, unit: 'unité', place: 'Thala, Kasserine',
      desc: 'Citerne galvanisée en bon état, montée sur châssis solide. Retrait à Thala, Kasserine.',
      imgs: [IMG('photo-1581092160562-40a4464b0e3a'), IMG('photo-1581092918056-0c4c3a591337')],
    },
    {
      title: 'Tomates Rio Grande fraîches en vrac',
      qty: 2, price: 0.90, unit: 'kg', place: 'Meknassy, Sidi Bouzid',
      desc: 'Récolte fraîche du jour, idéale pour conserverie ou marché. Production locale à Meknassy, Sidi Bouzid.',
      imgs: [IMG('photo-1592417817098-8f3d6eb19675'), IMG('photo-1546095667-f5f5a2ca30f8')],
    },
    {
      title: 'Pommes Starking du Kef',
      qty: 5000, price: 2.20, unit: 'kg', place: 'Dahmani, Le Kef',
      desc: 'Pommes rouges juteuses de qualité supérieure. Verger certifié à Dahmani, Le Kef.',
      imgs: [IMG('photo-1560806887-1e4cd0b6cbd6'), IMG('photo-1570913149827-b40626849797')],
    },
    {
      title: 'Charrue 3 disques occasion',
      qty: 1, price: 1800, unit: 'unité', place: 'Tajerouine, Le Kef',
      desc: 'Charrue agricole robuste pour labours profonds. À récupérer à Tajerouine, Le Kef.',
      imgs: [IMG('photo-1565299624946-b28f40a677ca'), IMG('photo-1500937386664-56d1dfef3854')],
    },
    {
      title: 'Balles de foin d\'avoine de cette saison',
      qty: 500, price: 12, unit: 'balle', place: 'Foussana, Kasserine',
      desc: 'Foin sec de haute qualité, stocké à l\'abri de l\'humidité. Stock à Foussana, Kasserine.',
      imgs: [IMG('photo-1500382013588-424906849824'), IMG('photo-1625246330308-2fb927781a05')],
    },
    {
      title: 'Motopompe Lombardini Diesel occasion',
      qty: 1, price: 2100, unit: 'unité', place: 'Regueb, Sidi Bouzid',
      desc: 'Moteur diesel fiable pour grand débit d\'irrigation. Disponible à Regueb, Sidi Bouzid.',
      imgs: [IMG('photo-1558618666-fcd25c85cd64'), IMG('photo-1581092160562-40a4464b0e3a')],
    },
    {
      title: 'Ruches d\'abeilles peuplées',
      qty: 20, price: 180, unit: 'ruche', place: 'Thala, Kasserine',
      desc: 'Ruches complètes avec colonies saines, prêtes pour le printemps. Apiculture à Thala, Kasserine.',
      imgs: [IMG('photo-1587049352846-4a222e784d38'), IMG('photo-1558642452-9d2a7deb7f62')],
    },
    {
      title: 'Olives de table Chemchali en caisses',
      qty: 3000, price: 3.50, unit: 'kg', place: 'Métlaoui, Gafsa',
      desc: 'Olives vertes calibrées manuellement. Récolte et conditionnement à Métlaoui, Gafsa.',
      imgs: [IMG('photo-1541432901042-2d8bd64b4a9b'), IMG('photo-1474979266404-7eaacbcd87c5')],
    },
    {
      title: 'Broyeur de branches forestier occasion',
      qty: 1, price: 4500, unit: 'unité', place: 'Sbeitla, Kasserine',
      desc: 'Broyeur robuste de marque italienne, peu servi. Enlèvement à Sbeitla, Kasserine.',
      imgs: [IMG('photo-1581091226825-a6a2a5aee158'), IMG('photo-1599819811279-d5ad9cccf838')],
    },
    {
      title: 'Caisses plastiques empilables',
      qty: 100, price: 5, unit: 'unité', place: 'Meknassy, Sidi Bouzid',
      desc: 'Caisses rigides pour fruits et légumes. Lot disponible à Meknassy, Sidi Bouzid.',
      imgs: [IMG('photo-1601493700531-0e7b9b4e0b6a'), IMG('photo-1592417817098-8f3d6eb19675')],
    },
    {
      title: 'Oranges Thomson de Béja',
      qty: 4000, price: 1.60, unit: 'kg', place: 'Testour, Béja',
      desc: 'Oranges douces et juteuses de la vallée de Béja. Expédition depuis Testour, Béja.',
      imgs: [IMG('photo-1611080626919-7cf5a9dbab5b'), IMG('photo-1547514701-42782101795e')],
    },
    {
      title: 'Lot de tuyaux d\'irrigation 16mm d\'occasion',
      qty: 5, price: 60, unit: 'couronne 100m', place: 'Foussana, Kasserine',
      desc: 'Tuyaux PE avec goutteurs intégrés tous les 30 cm. Stock à Foussana, Kasserine.',
      imgs: [IMG('photo-1416879595882-3373a0480b5b'), IMG('photo-1625246330308-2fb927781a05')],
    },
    {
      title: 'Miel de thym sauvage 100% naturel',
      qty: 150, price: 45, unit: 'pot 1kg', place: 'Tajerouine, Le Kef',
      desc: 'Miel pur des montagnes du Nord-Ouest tunisien. Miellerie à Tajerouine, Le Kef.',
      imgs: [IMG('photo-1558642452-9d2a7deb7f62'), IMG('photo-1587049352846-4a222e784d38')],
    },
    {
      title: 'Paille de blé en petites balles',
      qty: 300, price: 8, unit: 'balle', place: 'Dahmani, Le Kef',
      desc: 'Paille bien pressée pour litière ou fourrage. Entrepôt à Dahmani, Le Kef.',
      imgs: [IMG('photo-1574323347407-f5e1ad6d020b'), IMG('photo-1500382013588-424906849824')],
    },
    {
      title: 'Atomiseur thermique à dos 20L',
      qty: 2, price: 280, unit: 'unité', place: 'Regueb, Sidi Bouzid',
      desc: 'Atomiseur puissant pour traitement foliaire, état neuf. Vente à Regueb, Sidi Bouzid.',
      imgs: [IMG('photo-1574943328592-7a56b26388a4'), IMG('photo-1581092918056-0c4c3a591337')],
    },
    {
      title: 'Agneaux de race Barbarine sevrés',
      qty: 15, price: 420, unit: 'tête', place: 'Meknassy, Sidi Bouzid',
      desc: 'Agneaux pour élevage ou engraissement, vaccinés. Bergerie à Meknassy, Sidi Bouzid.',
      imgs: [IMG('photo-1454496948207-99ee9788c849'), IMG('photo-1484557985045-edf25e08da73')],
    },
    {
      title: 'Huile d\'olive Extra Vierge biologique',
      qty: 500, price: 22, unit: 'litre', place: 'Sbeitla, Kasserine',
      desc: 'Huile pressée à froid, huilerie traditionnelle. Produit à Sbeitla, Kasserine.',
      imgs: [IMG('photo-1474979266404-7eaacbcd87c5'), IMG('photo-1541432901042-2d8bd64b4a9b')],
    },
    {
      title: 'Engrais organique de mouton composté',
      qty: 200, price: 15, unit: 'sac 40kg', place: 'Thala, Kasserine',
      desc: 'Fumier décomposé sans odeur, enrichi pour potager. Production à Thala, Kasserine.',
      imgs: [IMG('photo-1416879543552-2741f0c185f2'), IMG('photo-1599819811279-d5ad9cccf838')],
    },
    {
      title: 'Arbres fruitiers (Goyaviers et Figuiers)',
      qty: 80, price: 12, unit: 'plant', place: 'Foussana, Kasserine',
      desc: 'Jeunes plants vigoureux en pots, prêts pour la mise en terre. Pépinière à Foussana, Kasserine.',
      imgs: [IMG('photo-1520414282249-64fa41268204'), IMG('photo-1560806887-1e4cd0b6cbd6')],
    },
  ];

  const ahmedFarmer =
    farmersList.find((f) => f.name === 'Ahmed Ben Salah') ??
    farmersList.find((f) => f.email === 'farmer1@ziria.tn')!;

  /** Annonces publiées par Ahmed Ben Salah (farmer1@ziria.tn) — visibles dans Mes Annonces et le marketplace public */
  const AHMED_PUBLISHED_TITLES = new Set([
    'Tomates Rio Grande fraîches en vrac',
    'Huile d\'olive Extra Vierge biologique',
    'Olives de table Chemchali en caisses',
    'Pommes Starking du Kef',
    'Miel de thym sauvage 100% naturel',
    'Motopompe Lombardini Diesel occasion',
    'Balles de foin d\'avoine de cette saison',
    'Tracteur Massey Ferguson 265 occasion',
    'Lot de tuyaux d\'irrigation 16mm d\'occasion',
    'Engrais organique de mouton composté',
  ]);

  const ahmedPlace = `${ahmedFarmer.delegation}, ${ahmedFarmer.governorate}`;

  console.log(`[ZirIA] Seeding marketplace: ${AHMED_PUBLISHED_TITLES.size} annonces pour Ahmed Ben Salah (${ahmedFarmer.email})...`);

  for (const listIt of MARKET_PRODS) {
    const isAhmedListing = AHMED_PUBLISHED_TITLES.has(listIt.title);
    const farmer = isAhmedListing
      ? ahmedFarmer
      : randomItem(farmersList.filter((f) => f.id !== ahmedFarmer.id));
    const parcel = parcelsList.find((p) => p.owner_id === farmer.id);
    const isPerKg = listIt.unit === 'kg';
    await marketRepo.save(marketRepo.create({
      seller_id: farmer.id,
      parcel_id: parcel?.id || null,
      title: listIt.title,
      description: isAhmedListing
        ? `${listIt.desc} Annonce publiée par Ahmed Ben Salah sur ZirIA.`
        : listIt.desc,
      category: inferListingCategory(listIt.title),
      crop_type: listIt.title,
      media_items: listIt.imgs.map((url, idx) => ({ type: 'photo', url, position: idx })),
      primary_media_url: listIt.imgs[0] || null,
      listing_quality_score: 75,
      quantity_value: listIt.qty,
      quantity_unit: listIt.unit,
      quantity_tonnes: isPerKg ? listIt.qty / 1000 : listIt.qty,
      price_tnd: listIt.price,
      price_per_kg: isPerKg ? listIt.price : null,
      price_on_request: false,
      location_label: isAhmedListing ? ahmedPlace : listIt.place,
      contact_phone: farmer.phone || '+216 98 000 000',
      contact_email: farmer.email,
      status: ListingStatus.ACTIVE,
    } as any));
  }

  // ─── 8. Suppliers & Products (3 Suppliers, Exactly 50 Luxurious Products) ───────────
  console.log('[ZirIA] Seeding Suppliers & 50 Luxurious Products...');
  const suppliersList: User[] = [];
  const prodItemsList: any[] = [];
  for (let i = 0; i < 3; i++) {
    const sup = await userRepo.save(userRepo.create({
      email: `supplier${i+1}@ziria.tn`,
      name: `Agro-Fournisseur ${['Kasserine', 'Sidi Bouzid', 'Le Kef'][i]}`,
      role: Role.SUPPLIER, password_hash: passwordHash, verified: true,
      lat: REGIONS[i*2].lat, lng: REGIONS[i*2].lng
    }));
    suppliersList.push(sup);
  }

  const LUX_PRODS = [
    // Fertilizers (12)
    { name: 'Engrais NPK 15-15-15 Premium', cat: 'FERTILIZER', price: 89.5, unit: 'sac 50kg', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFmg0K0KHCsxw5qtWS-mxh86FszR3tfX0nLw&s' },
    { name: 'Bio-Stimulant Elite Grow', cat: 'FERTILIZER', price: 120.0, unit: 'litre', img: 'https://i.ebayimg.com/00/s/MTYwMFgxNjAw/z/oR8AAOSwGxBnyNHD/$_57.JPG?set_id=880000500F' },
    { name: 'Compost Organique Actif Bio', cat: 'FERTILIZER', price: 25.0, unit: 'sac 40kg', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },
    { name: 'Engrais Liquide Azoté ZirPlus', cat: 'FERTILIZER', price: 68.0, unit: 'bidon 10L', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Engrais NPK 20-20-20 Soluble', cat: 'FERTILIZER', price: 95.0, unit: 'sac 25kg', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Superphosphate Triple 45%', cat: 'FERTILIZER', price: 74.0, unit: 'sac 50kg', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800' },
    { name: 'Nitrate d\'Ammoniaque 33.5%', cat: 'FERTILIZER', price: 82.0, unit: 'sac 50kg', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' },
    { name: 'Potasse Soluble Haute Pureté', cat: 'FERTILIZER', price: 110.0, unit: 'sac 25kg', img: 'https://images.unsplash.com/photo-1570042225831-d9bfe7e557eb?w=800' },
    { name: 'Bio-stimulant Algues Marines', cat: 'FERTILIZER', price: 42.0, unit: 'litre', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800' },
    { name: 'Oligo-éléments Chélatés Mix', cat: 'FERTILIZER', price: 38.5, unit: 'sachet 1kg', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Sulfate de Magnésium Soluble', cat: 'FERTILIZER', price: 49.0, unit: 'sac 25kg', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Humus Actif Régénérateur', cat: 'FERTILIZER', price: 30.0, unit: 'sac 25kg', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },

    // Seeds (12)
    { name: 'Semences Tomate Rio Grande F1', cat: 'SEED', price: 95.0, unit: 'sachet 10g', img: 'https://www.potagerornemental.com/wp-content/uploads/2025/12/IMG_8309-002.jpg' },
    { name: 'Semences Blé Dur Or de Tunisie', cat: 'SEED', price: 2.100, unit: 'kg', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?q=80&w=800' },
    { name: 'Semences Piment Fort Kairouan', cat: 'SEED', price: 15.5, unit: 'sachet 20g', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Semences Courgette d\'Alger', cat: 'SEED', price: 18.0, unit: 'sachet 50g', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Semences Pastèque Giza Elite', cat: 'SEED', price: 35.0, unit: 'sachet 100g', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' },
    { name: 'Semences Melon Ananas Tunisien', cat: 'SEED', price: 28.0, unit: 'sachet 50g', img: 'https://images.unsplash.com/photo-1570042225831-d9bfe7e557eb?w=800' },
    { name: 'Semences Oignon Rouge de Béja', cat: 'SEED', price: 24.5, unit: 'sachet 100g', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800' },
    { name: 'Semences Laitue Romaine Verte', cat: 'SEED', price: 12.0, unit: 'sachet 50g', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Semences Fenouil Doux de Béja', cat: 'SEED', price: 19.0, unit: 'sachet 50g', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Semences Carotte Nantaise Pro', cat: 'SEED', price: 22.0, unit: 'sachet 100g', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },
    { name: 'Substrat de Semis Terreau Pro', cat: 'SEED', price: 45.0, unit: 'sac 70L', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800' },
    { name: 'Pots biodégradables de repiquage', cat: 'SEED', price: 15.0, unit: 'lot de 100', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' },

    // Pesticides (10)
    { name: 'Fongicide Cuivre Excellence', cat: 'PESTICIDE', price: 34.0, unit: 'kg', img: 'https://agriculture.action-pin.com/uploads/images/1761648286_packshot-jpg-fr-3343-heliocuivre-5l---site-web.jpg' },
    { name: 'Insecticide NeemShield 100% Bio', cat: 'PESTICIDE', price: 49.9, unit: 'litre', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },
    { name: 'Fongicide Soufre Mouillable Pro', cat: 'PESTICIDE', price: 28.0, unit: 'sachet 1kg', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Traitement Hivernal Huile Blanche', cat: 'PESTICIDE', price: 39.0, unit: 'bidon 5L', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Anti-Limaces Ferramol Écologique', cat: 'PESTICIDE', price: 24.0, unit: 'boîte 1kg', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800' },
    { name: 'Bacillus Thuringiensis Curatif', cat: 'PESTICIDE', price: 58.0, unit: 'sachet 500g', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' },
    { name: 'Bio-Fongicide Trichoderma Plus', cat: 'PESTICIDE', price: 62.0, unit: 'sachet 1kg', img: 'https://images.unsplash.com/photo-1570042225831-d9bfe7e557eb?w=800' },
    { name: 'Herbicide Sélectif Céréales', cat: 'PESTICIDE', price: 88.0, unit: 'bidon 1L', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800' },
    { name: 'Anti-Pucerons Systémique Fort', cat: 'PESTICIDE', price: 31.5, unit: 'flacon 250ml', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Anti-Cochenille Soluble Premium', cat: 'PESTICIDE', price: 44.0, unit: 'flacon 500ml', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },

    // Tools & Equipment (16)
    { name: 'Pompe Solaire Inox Pro 3HP', cat: 'TOOL', price: 2450.0, unit: 'unité', img: 'https://nakeba.sn/wp-content/uploads/2025/02/IMG-20250224-WA0008.jpg' },
    { name: 'Système Goutte-à-Goutte Intelligent', cat: 'TOOL', price: 15.5, unit: 'mètre', img: 'https://ae01.alicdn.com/kf/S0271f6a94c344848aafe07a43a05e1d5u.jpg' },
    { name: 'Tracteur New Holland T6 (Neuf)', cat: 'TOOL', price: 185000, unit: 'unité', img: 'https://motors.tn/magazine/wp-content/uploads/2023/07/New-Holland-TT55.webp' },
    { name: 'Sécateur Pneumatique Professionnel', cat: 'TOOL', price: 320.0, unit: 'unité', img: 'https://blog.agrieuro.fr/wp-content/uploads/sites/5/2022/03/image_principale.jpg' },
    { name: 'Atomiseur Tracté 1000 Litres', cat: 'TOOL', price: 8500.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },
    { name: 'Drone Agricole Inspecteur Pro', cat: 'TOOL', price: 14500.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Station Météo Connectée IoT', cat: 'TOOL', price: 680.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Capteur Humidité Sol Smart Zir', cat: 'TOOL', price: 145.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800' },
    { name: 'Bâche Polyéthylène Serre 200µ', cat: 'TOOL', price: 3.2, unit: 'mètre carré', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' },
    { name: 'Caisse de Récolte Aérée Verte', cat: 'TOOL', price: 8.5, unit: 'unité', img: 'https://images.unsplash.com/photo-1570042225831-d9bfe7e557eb?w=800' },
    { name: 'Tuyau PEHD Ø63 PN10 (100m)', cat: 'TOOL', price: 320.0, unit: 'couronne', img: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800' },
    { name: 'Programmateur Irrigation Hunter', cat: 'TOOL', price: 420.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800' },
    { name: 'Électrovanne Pro RainBird 24V', cat: 'TOOL', price: 65.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800' },
    { name: 'Filtre à Disques 2" Irrigation', cat: 'TOOL', price: 110.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800' },
    { name: 'Cisaille à Haies Professionnelle', cat: 'TOOL', price: 48.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800' },
    { name: 'Brouette Renforcée Double Roue', cat: 'TOOL', price: 160.0, unit: 'unité', img: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800' }
  ];

  for (const lp of LUX_PRODS) {
    const p = await productRepo.save(productRepo.create({
      name: lp.name, category: lp.cat, price_tnd: lp.price, unit: lp.unit, photo_url: lp.img,
      description: 'Produit certifié haute performance pour agriculture d\'élite ZirIA.',
      stock_qty: 500, is_active: true, supplier_id: randomItem(suppliersList).id
    }) as any);
    prodItemsList.push(p);
  }

  // ─── 9. Orders & Transactions (25+) ──────────────────────────────────────────
  console.log('[ZirIA] Seeding Orders & Financials...');
  for (let i = 0; i < 30; i++) {
    const farmer = randomItem(farmersList);
    const prod = randomItem(prodItemsList);
    await orderRepo.save(orderRepo.create({
      buyer_id: farmer.id,
      supplier_id: prod.supplier_id,
      product_id: prod.id,
      quantity_ordered: rndInt(1, 10),
      unit_price_tnd: prod.price_tnd,
      total_tnd: prod.price_tnd * 2,
      status: randomItem(['DELIVERED', 'SHIPPED', 'PENDING']),
      delivery_address: `${farmer.delegation}, ${farmer.governorate}`
    }) as any);

    // Financial Record (Expense)
    await financeRepo.save(financeRepo.create({
      user_id: farmer.id,
      record_type: RecordType.EXPENSE,
      category: RecordCategory.OTHER,
      amount_tnd: rndInt(100, 2000),
      description: `Achat ${prod.name}`
    }));
  }

  // Additional Income Records for Finance Dashboard
  console.log('[ZirIA] Seeding Financial Income...');
  for (let i = 0; i < 20; i++) {
    const farmer = randomItem(farmersList);
    await financeRepo.save(financeRepo.create({
      user_id: farmer.id,
      record_type: RecordType.INCOME,
      category: RecordCategory.SALE,
      amount_tnd: rndInt(3000, 15000),
      description: `Vente de récolte ${randomItem(CROPS).cat}`
    }));
  }

  // Inventory Seeding for Stock Management
  console.log('[ZirIA] Seeding Farmer Inventory (Stock)...');
  for (const farmer of farmersList) {
    for (let i = 0; i < 3; i++) {
      const crop = randomItem(CROPS);
      await inventoryRepo.save(inventoryRepo.create({
        owner_id: farmer.id,
        crop_type: crop.name,
        quantity_tonnes: rnd(0.5, 5.0)
      } as any));
    }
  }

  // ─── 10. Disease & Notifications (12+) ───────────────────────────────────────
  console.log('[ZirIA] Seeding Disease Detections & Notifications...');
  for (let i = 0; i < 12; i++) {
    const farmer = randomItem(farmersList);
    const parcel = parcelsList.find(p => p.owner_id === farmer.id);
    await diseaseRepo.save(diseaseRepo.create({
      reporter_id: farmer.id,
      parcel_id: parcel?.id,
      crop_type: parcel?.crop_type || 'Olive',
      disease_name: randomItem(['Oeil de paon', 'Mildiou', 'Rouille jaune', 'Cochenille']),
      confidence_score: rnd(0.7, 0.98),
      requires_expert_validation: i % 3 === 0,
      required_expert_type: i % 3 === 0 ? ExpertType.PHYTOPATHOLOGIST : null,
      urgency: i % 4 === 0 ? DetectionUrgency.CRITICAL : DetectionUrgency.MEDIUM,
      lat: (farmer.lat || 35.0), 
      lng: (farmer.lng || 9.0),
      photo_url: randomItem(LUX_PRODS).img,
      recommendation_fr: 'Appliquer un traitement fongicide ciblé et surveiller l\'humidité.'
    } as any));

    await notificationRepo.save(notificationRepo.create({
      user_id: farmer.id,
      type: randomItem(['WEATHER', 'SYSTEM', 'MARKET']),
      title: 'Alerte ZirIA',
      body: 'Une action est requise sur votre parcelle.',
      is_read: false
    }));
  }

  // ─── 11. ZIRFEED SOCIAL UNIVERSE SEEDING ────────────────────────────────────
  console.log('[ZirIA] Seeding ZirFeed Profiles, Groups, Pages, Posts...');

  const ahmed = farmersList.find(f => f.name === 'Ahmed Ben Salah') || farmersList[0];
  const expertYoussef = expertsList.find(e => e.name.includes('Youssef')) || expertsList[0];
  const activeFarmers = farmersList.slice(0, 8);

  // ZirFeed user profiles
  for (const u of [...activeFarmers, expertYoussef, admin]) {
    await zirProfileRepo.save(zirProfileRepo.create({
      user_id: u.id,
      bio: `Agriculteur passionné de la région de ${u.delegation || 'Kasserine'}. Membre actif de ZirIA.`,
      profile_visibility: 'PUBLIC',
      show_groups: true,
      show_following: true
    }));
  }

  // Seed Follows (followers & following relationships)
  for (let i = 0; i < activeFarmers.length; i++) {
    // Follow the expert
    await zirFollowRepo.save(zirFollowRepo.create({
      follower_id: activeFarmers[i].id,
      following_id: expertYoussef.id
    }));
    // Follow Ahmed Ben Salah
    if (activeFarmers[i].id !== ahmed.id) {
      await zirFollowRepo.save(zirFollowRepo.create({
        follower_id: activeFarmers[i].id,
        following_id: ahmed.id
      }));
      await zirFollowRepo.save(zirFollowRepo.create({
        follower_id: ahmed.id,
        following_id: activeFarmers[i].id
      }));
    }
  }

  // ZirFeed Groups (5 Groups)
  const groupsList = await zirGroupRepo.save(zirGroupRepo.create([
    {
      creator_id: admin.id,
      name: 'Céréaliculteurs du Nord-Ouest',
      description: 'Groupe d\'entraide pour l\'amélioration des rendements de blé dur et d\'orge en Tunisie.',
      category: 'Cereal Farming',
      privacy: 'PUBLIC',
      posting_permission: 'ALL'
    },
    {
      creator_id: admin.id,
      name: 'Oléiculture Tunisienne Moderne',
      description: 'Partage de conseils agronomiques sur la taille, l\'irrigation et le traitement des maladies de l\'olivier.',
      category: 'Olive Cultivation',
      privacy: 'PUBLIC',
      posting_permission: 'ALL'
    },
    {
      creator_id: admin.id,
      name: 'Élevage et Nutrition Animale',
      description: 'Espace communautaire pour discuter de la gestion du bétail, ovins et bovins en Tunisie.',
      category: 'Livestock',
      privacy: 'MEMBERS_ONLY',
      posting_permission: 'ALL'
    },
    {
      creator_id: admin.id,
      name: 'Zeitouniers de Sfax',
      description: 'Collectif des oléiculteurs et producteurs d\'huile d\'olive de la région de Sfax. Discussions sur les périodes de récolte, prix de trituration et rendements des pressoirs.',
      category: 'Olive Cultivation',
      privacy: 'PUBLIC',
      posting_permission: 'ALL'
    },
    {
      creator_id: admin.id,
      name: 'Mrabiin Tounsi',
      description: 'Réseau d\'échange pour les éleveurs de moutons et bovins. Prix du fourrage, calendrier de vaccination nationale, préparatifs pour Aïd El-Adha et cours du bétail.',
      category: 'Livestock',
      privacy: 'PUBLIC',
      posting_permission: 'ALL'
    }
  ]));

  // Add members to groups
  for (const grp of groupsList) {
    for (const f of activeFarmers) {
      await zirMemberRepo.save(zirMemberRepo.create({
        group_id: grp.id,
        user_id: f.id,
        role: f.id === ahmed.id ? 'CO_ADMIN' : 'MEMBER',
        status: 'APPROVED'
      }));
    }
    // Add admin as admin member
    await zirMemberRepo.save(zirMemberRepo.create({
      group_id: grp.id,
      user_id: admin.id,
      role: 'ADMIN',
      status: 'APPROVED'
    }));
  }

  // Institutional Pages (3 Pages)
  const pageBna = await zirPageRepo.save(zirPageRepo.create({
    creator_id: admin.id,
    name: 'Banque Nationale Agricole (BNA)',
    category: 'Bank',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_BNA.jpg',
    description: 'Institution financière leader pour le soutien aux investissements agricoles en Tunisie.',
    verification_doc_url: 'https://res.cloudinary.com/demo/image/upload/sample.png',
    status: 'APPROVED',
    follower_count: 2450,
    post_count: 7,
    is_promoted: true
  }));

  const pageZitouna = await zirPageRepo.save(zirPageRepo.create({
    creator_id: admin.id,
    name: 'Zitouna Takaful',
    category: 'Insurance',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Logo-zitouna-takaful.png',
    description: 'Assurances agricoles innovantes, couverture contre la sécheresse et les sinistres climatiques.',
    verification_doc_url: 'https://res.cloudinary.com/demo/image/upload/sample.png',
    status: 'APPROVED',
    follower_count: 1280,
    post_count: 5,
    is_promoted: false
  }));

  const pageMinAgri = await zirPageRepo.save(zirPageRepo.create({
    creator_id: admin.id,
    name: 'Ministère de l\'Agriculture (MARHP)',
    category: 'Government',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Coat_of_arms_of_Tunisia.svg',
    description: 'Page officielle du Ministère de l\'Agriculture, des Ressources Hydrauliques et de la Pêche de Tunisie.',
    verification_doc_url: 'https://res.cloudinary.com/demo/image/upload/sample.png',
    status: 'APPROVED',
    follower_count: 8520,
    post_count: 8,
    is_promoted: true
  }));

  // Seed Follows for Pages
  for (const f of activeFarmers) {
    await zirFollowRepo.save(zirFollowRepo.create({ follower_id: f.id, following_page_id: pageBna.id }));
    await zirFollowRepo.save(zirFollowRepo.create({ follower_id: f.id, following_page_id: pageZitouna.id }));
    await zirFollowRepo.save(zirFollowRepo.create({ follower_id: f.id, following_page_id: pageMinAgri.id }));
  }

  // ZirFeed Social Posts (20 Real Publications including REELs and Voice Notes)
  const postsList = await zirPostRepo.save(zirPostRepo.create([
    {
      author_id: ahmed.id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'نصيحة للإخوة مزارعي القمح: مع موجة الحرارة القادمة، يجب تعديل أوقات الري لتفادي ذبول الأوراق والتبخر السريع للرطوبة. بالتوفيق للجميع.',
      media_urls: ['https://youtube.com/shorts/fbuejGNfUlE?si=HMIg3XnjwIkHpCSR'],
      hashtags: ['irrigation', 'wheat', 'kasserine'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 185,
      created_at: daysAgo(10)
    },
    {
      author_id: expertYoussef.id,
      author_type: 'USER',
      post_type: 'MIXED',
      content_text: 'Voici un guide rapide sur la lutte contre l\'Oeil de Paon sur olivier. Un traitement préventif au cuivre après la taille permet de limiter drastiquement l\'extension du champignon.',
      media_urls: ['https://www.youtube.com/shorts/tqiFpL_05Dw'],
      hashtags: ['expert', 'olive', 'maladie'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 320,
      created_at: daysAgo(9)
    },
    {
      author_id: activeFarmers[1].id,
      author_type: 'USER',
      post_type: 'VOICE_NOTE',
      content_text: 'تسجيل صوتي حول أسعار الأسمدة الحالية في السوق التونسية ومشاكل النقص في سيدي بوزيد.',
      voice_note_url: 'https://res.cloudinary.com/demo/video/upload/sample.mp3',
      voice_note_duration: 35,
      voice_note_waveform: Array.from({ length: 70 }, () => +(Math.random() * 0.8 + 0.1).toFixed(2)),
      hashtags: ['engrais', 'tarifs', 'sidibouzid'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 98,
      created_at: daysAgo(8)
    },
    {
      author_id: pageBna.creator_id,
      author_type: 'PAGE',
      page_id: pageBna.id,
      post_type: 'TEXT',
      content_text: 'Nous annonçons le lancement des crédits de campagne céréalière 2026. Taux préférentiels pour les membres des SMSA agréés.\n\n*(Ce contenu est publié par un partenaire institutionnel de ZirIA. ZirIA ne garantit pas les offres présentées.)*',
      hashtags: ['bna', 'credit', 'cooperative'],
      language_detected: 'FR',
      status: 'APPROVED',
      is_promoted: true,
      views_count: 1420,
      created_at: daysAgo(7)
    },
    {
      author_id: pageZitouna.creator_id,
      author_type: 'PAGE',
      page_id: pageZitouna.id,
      post_type: 'TEXT',
      content_text: 'Protégez vos cultures céréalières et arboricoles contre les risques climatiques de la saison 2026 avec nos solutions de Takaful agricole.\n\n*(Ce contenu est publié par un partenaire institutionnel de ZirIA. ZirIA ne garantit pas les offres présentées.)*',
      hashtags: ['assurance', 'takaful'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 650,
      created_at: daysAgo(6)
    },
    // Olive Harvest Sfax Group Posts
    {
      author_id: activeFarmers[2].id,
      author_type: 'USER',
      group_id: groupsList[3].id,
      post_type: 'TEXT',
      content_text: 'يا جماعة صفاقس، قداش أسعار العصر السنا في المعاصر؟ فما شكون يقلي 150 مليم اللترة وفما شكون يقلي أكثر. شكون عندو فكرة صحيحة؟',
      hashtags: ['sfax', 'olive', 'معاصر'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 245,
      created_at: daysAgo(5)
    },
    {
      author_id: ahmed.id,
      author_type: 'USER',
      group_id: groupsList[3].id,
      post_type: 'TEXT',
      content_text: 'Campagne d\'olives prometteuse cette saison a Sfax.',
      hashtags: ['sfax', 'olive'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 120,
      created_at: daysAgo(5)
    },
    // Reels (3 Reels with stable URLs)
    {
      author_id: expertYoussef.id,
      author_type: 'USER',
      post_type: 'REEL',
      content_text: 'Démonstration pratique de la taille de rajeunissement d\'un vieil olivier en Tunisie.',
      media_urls: ['https://www.youtube.com/shorts/RY-_8Jl__Cg'],
      thumbnail_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
      caption: 'Taille de l\'olivier ✂️🌳',
      hashtags: ['reel', 'taille', 'olive'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 1540,
      created_at: daysAgo(2)
    },
    {
      author_id: ahmed.id,
      author_type: 'USER',
      post_type: 'REEL',
      content_text: 'جولة سريعة في الحقل لمتابعة نمو شتلات الطماطم Rio Grande واستعمال الري بالتنقيط الذكي.',
      media_urls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'],
      thumbnail_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400',
      caption: 'مزرعة الطماطم الذكية 🍅💧',
      hashtags: ['reel', 'tomate', 'agriculture'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 2890,
      created_at: daysAgo(1)
    },
    {
      author_id: activeFarmers[4].id,
      author_type: 'USER',
      post_type: 'REEL',
      content_text: 'لحظة وصول الجرار الجديد وتجربته في حرث الأرض الوعرة في تالة.',
      media_urls: ['https://www.youtube.com/shorts/AQi8BOMYx3c'],
      thumbnail_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400',
      caption: 'الحرث الميكانيكي 🚜🌾',
      hashtags: ['tractor', 'machinerie', 'thala'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 980,
      created_at: daysAgo(1)
    },
    // General Posts to reach 20
    {
      author_id: activeFarmers[0].id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'Est-ce que quelqu\'un a testé les engrais foliaires organiques à base d\'algues sur les amandiers ? J\'ai entendu dire que ça améliore le calibre des fruits de 15%.',
      hashtags: ['amande', 'engrais', 'bio'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 145,
      created_at: daysAgo(2)
    },
    {
      author_id: expertYoussef.id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'Attention! Alerte mildiou sur tomate dans les zones basses du Kef suite aux dernières pluies isolées. Pensez à aérer vos tunnels.',
      hashtags: ['alerte', 'mildiou', 'tomate'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 360,
      created_at: daysAgo(2)
    },
    {
      author_id: activeFarmers[1].id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'يا جماعة الخير، شكون ينصحني بماركة باهية متع مضخة ماء غاطسة 10 حصان وتخدم بالطاقة الشمسية؟ الأسعار في صفاقس برشا غالية.',
      hashtags: ['energie', 'pompage', 'solaire'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 154,
      created_at: daysAgo(2)
    },
    {
      author_id: pageBna.creator_id,
      author_type: 'PAGE',
      page_id: pageBna.id,
      post_type: 'TEXT',
      content_text: 'Découvrez notre pack d\'investissement agricole digital ZirIA-BNA: financez vos capteurs d\'humidité du sol à des taux réduits de moitié.\n\n*(Ce contenu est publié par un partenaire institutionnel de ZirIA. ZirIA ne garantit pas les offres présentées.)*',
      hashtags: ['bna', 'investment', 'digital'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 1100,
      created_at: daysAgo(2)
    },
    {
      author_id: pageMinAgri.creator_id,
      author_type: 'PAGE',
      page_id: pageMinAgri.id,
      post_type: 'TEXT',
      content_text: 'تحت رعاية السيد وزير الفلاحة، تم إطلاق المنصة الوطنية الرقمية لمتابعة الموارد المائية ومستوى السدود بشكل فوري وحيني لمكافحة الشح المائي.',
      hashtags: ['marhp', 'eau', 'sante'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 1750,
      created_at: daysAgo(1)
    },
    {
      author_id: activeFarmers[3].id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'اليوم قمت بتركيب جهاز قياس رطوبة التربة ZirIA في حقل الفستق بماطر. النتيجة خيالية، وليت نعرف وقتاش نسقي بالظبط ونوفر 30% ماء!',
      hashtags: ['pistache', 'ziria', 'innovation'],
      language_detected: 'AR',
      status: 'APPROVED',
      views_count: 220,
      created_at: daysAgo(1)
    },
    {
      author_id: activeFarmers[4].id,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: 'Une très belle journée passée à la foire agricole de Regueb. Beaucoup de contacts intéressants pour la vente de nos pommes.',
      hashtags: ['foire', 'pomme', 'regueb'],
      language_detected: 'FR',
      status: 'APPROVED',
      views_count: 135,
      created_at: daysAgo(1)
    }
  ]));

  // Seed Reactions for Posts (At least 10 reactions)
  const reactionTypes = ['ADMIRE', 'THINKING', 'COLLABORATE', 'INSIGHTFUL'];
  for (const post of postsList) {
    for (let k = 0; k < Math.min(activeFarmers.length, 4); k++) {
      if (activeFarmers[k].id !== post.author_id) {
        await zirReactionRepo.save(zirReactionRepo.create({
          post_id: post.id,
          user_id: activeFarmers[k].id,
          reaction_type: randomItem(reactionTypes)
        }));
      }
    }
  }

  // Seed Comments under posts (15 real comments, some threaded)
  const commentsData = [
    { postIdx: 0, author: expertYoussef, text: 'كلام سليم يا سي أحمد، يفضل الري في الصباح البaكر أو بعد غروب الشمس لتقليل خسائر المياه.' },
    { postIdx: 0, author: ahmed, text: 'شكرا دكتور يوسف على التوضيح والإضافة القيمة.', parentIdx: 0 },
    { postIdx: 0, author: activeFarmers[1], text: 'حتى أحنا في سيدي بوزيد نتبعو في نفس البرنامج ربي ينوب بالخير.', parentIdx: 0 },
    { postIdx: 1, author: ahmed, text: 'Est-ce que le traitement au cuivre est efficace s\'il pleut juste après ?' },
    { postIdx: 1, author: expertYoussef, text: 'Non Ahmed, s\'il pleut dans les 24h, il est fortement conseillé de renouveler le traitement car le cuivre est lessivable.', parentIdx: 3 },
    { postIdx: 5, author: activeFarmers[3], text: 'أنا المعصرة متعنا تفكت بـ170 مليم للترة السنا، صفاقس ديما أغلى شوية.' },
    { postIdx: 5, author: activeFarmers[4], text: 'بصراحة أسعار مشطة برشا! لازم تحديد الأسعار من النقابة الوطنية.' },
    { postIdx: 7, author: expertYoussef, text: 'Il faut essayer d\'intégrer d\'autres sources comme les grignons d\'olive traités ou le son local pour baisser la facture.' },
    { postIdx: 7, author: activeFarmers[3], text: 'فكرة ممتازة دكتور، اتوا نجرب نخلطهم مع النخالة ونشوف النتيجة.', parentIdx: 7 },
    { postIdx: 10, author: ahmed, text: 'Très belle démonstration! Merci docteur pour le partage.' },
    { postIdx: 11, author: expertYoussef, text: 'ما شاء الله تبارك الله، تجربة رائدة ومنتجة!' },
    { postIdx: 11, author: activeFarmers[2], text: 'قداش تكلفت عليك المنظومة كاملة يا سي أحمد؟' },
    { postIdx: 11, author: ahmed, text: 'تكلفت حكاية 1200 دينار مع الدعم متع BNA والتركيب كان ساهل برشا.', parentIdx: 11 },
    { postIdx: 13, author: activeFarmers[1], text: 'Je conseille la marque italienne Pedrollo, elle est très robuste pour le pompage solaire.' },
    { postIdx: 14, author: ahmed, text: 'Merci pour l\'alerte, je viens de traiter préventivement mes tomates aujourd\'hui.' }
  ];

  const dbComments: ZirfeedComment[] = [];
  for (const c of commentsData) {
    let parentId: string | null = null;
    if (c.parentIdx !== undefined && dbComments[c.parentIdx]) {
      parentId = dbComments[c.parentIdx].id;
    }
    const savedComment = await zirCommentRepo.save(zirCommentRepo.create({
      post_id: postsList[c.postIdx].id,
      author_id: c.author.id,
      parent_id: parentId,
      content_text: c.text,
      status: 'APPROVED',
      created_at: daysAgo(2)
    }));
    dbComments.push(savedComment);
  }

  // Seed Saved Collections & Saved Posts
  const coll1 = await zirCollectionRepo.save(zirCollectionRepo.create({
    user_id: ahmed.id,
    collection_name: 'Conseils Techniques Irrigation',
    cover_image: ''
  }));
  const coll2 = await zirCollectionRepo.save(zirCollectionRepo.create({
    user_id: ahmed.id,
    collection_name: 'Fiches Maladies Céréales',
    cover_image: ''
  }));

  await zirSavedPostRepo.save(zirSavedPostRepo.create({ user_id: ahmed.id, collection_id: coll1.id, post_id: postsList[0].id }));
  await zirSavedPostRepo.save(zirSavedPostRepo.create({ user_id: ahmed.id, collection_id: coll2.id, post_id: postsList[1].id }));

  // Seed Social Events (5 Events with dynamic future dates)
  const eventsList = await zirEventRepo.save(zirEventRepo.create([
    {
      creator_id: admin.id,
      name: 'Foire Nationale de la Datte à Tozeur',
      description: 'Le rendez-vous incontournable des producteurs de Deglet Nour en Tunisie. Ateliers sur l\'exportation et les techniques de conservation thermique.',
      start_date: daysFromNow(14),
      end_date: daysFromNow(16),
      location: 'Palais des Congrès de Tozeur, Tunisie',
      category: 'Agricultural Fair',
      attendee_count: 145,
      interested_count: 240,
      cover_image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800'
    },
    {
      creator_id: admin.id,
      name: 'Atelier Pratique : Irrigation Solaire Connectée ZirIA',
      description: 'Formation technique gratuite sur la configuration des capteurs d\'humidité de sol et leur couplage avec les pompes photovoltaïques.',
      start_date: daysFromNow(30),
      end_date: daysFromNow(30),
      location: 'Chambre d\'Agriculture du Kef, Tunisie',
      category: 'Training Workshop',
      attendee_count: 58,
      interested_count: 110,
      cover_image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800'
    },
    {
      creator_id: admin.id,
      name: 'Forum de l\'Investissement Céréalier en Tunisie',
      description: 'Discussions autour du plan national d\'autosuffisance en blé dur avec des interventions de la BNA et du Ministère de l\'Agriculture.',
      start_date: daysFromNow(45),
      end_date: daysFromNow(46),
      location: 'Hôtel Africa, Tunis, Tunisie',
      category: 'Investment Forum',
      attendee_count: 23,
      interested_count: 75,
      cover_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800'
    },
    {
      creator_id: admin.id,
      name: 'Journée Champêtre : Traitements Phyto Écologiques',
      description: 'Démonstrations de pulvérisation assistée par drone et de lutte intégrée contre les maladies de l\'olivier.',
      start_date: daysFromNow(60),
      end_date: daysFromNow(60),
      location: 'Verger Expérimental, Sfax, Tunisie',
      category: 'Field Day',
      attendee_count: 90,
      interested_count: 180,
      cover_image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=800'
    },
    {
      creator_id: admin.id,
      name: 'Grand Marché des Semences et du Foin',
      description: 'Bourse d\'échange physique et digitale de fourrages, foins, pailles et semences certifiées sous contrôle de l\'État.',
      start_date: daysFromNow(90),
      end_date: daysFromNow(92),
      location: 'Souk El-Khemis, Béja, Tunisie',
      category: 'Market Day',
      attendee_count: 310,
      interested_count: 520,
      cover_image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800'
    }
  ]));

  // Seed Event Attendees (5-20 per event)
  for (const event of eventsList) {
    for (let k = 0; k < rndInt(5, 12); k++) {
      await zirAttendeeRepo.save(zirAttendeeRepo.create({
        event_id: event.id,
        user_id: activeFarmers[k % activeFarmers.length].id,
        status: randomItem(['GOING', 'INTERESTED']) as 'GOING' | 'INTERESTED'
      }));
    }
  }

  // Seed Social Notifications
  await zirNotificationRepo.save(zirNotificationRepo.create([
    {
      recipient_id: ahmed.id,
      sender_id: expertYoussef.id,
      notification_type: 'COMMENT',
      item_type: 'POST',
      item_id: postsList[0].id,
      is_read: false,
      created_at: new Date()
    },
    {
      recipient_id: ahmed.id,
      sender_id: activeFarmers[2].id,
      notification_type: 'REACTION',
      item_type: 'POST',
      item_id: postsList[0].id,
      is_read: false,
      created_at: daysAgo(1)
    }
  ]));

  // ─── 12. Final Subscriptions & Campaign Offers ─────────────────────────────
  const starterPlan = await planRepo.findOne({ where: { code: SubscriptionPlanCode.STARTER } });
  const proPlan = await planRepo.findOne({ where: { code: SubscriptionPlanCode.PRO } });
  if (ahmed && proPlan) {
    console.log(`[ZirIA] Subscribing Ahmed Ben Salah to PRO plan (unlimited listings)...`);
    const subRepo = dataSource.getRepository(UserSubscription);
    await subRepo.save(subRepo.create({
      user_id: ahmed.id,
      plan_id: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      expires_at: daysFromNow(365)
    }));
  }

  if (ahmed) {
    console.log(`[ZirIA] Creating Job Offers for Ahmed Ben Salah...`);
    await jobOfferRepo.save(jobOfferRepo.create([
      {
        employer_id: ahmed.id,
        task_type: 'Récolte Tomates',
        description: 'Besoin de 5 ouvriers pour la récolte des tomates Rio Grande. Transport assuré.',
        start_date: daysFromNow(2),
        duration_days: 7,
        daily_pay_tnd: 35,
        status: JobOfferStatus.OPEN,
        governorate: ahmed.governorate || 'Kasserine'
      },
      {
        employer_id: ahmed.id,
        task_type: 'Taille des Oliviers',
        description: 'Taille saisonnière des oliviers Chemlali.',
        start_date: daysFromNow(10),
        duration_days: 15,
        daily_pay_tnd: 45,
        status: JobOfferStatus.OPEN,
        governorate: ahmed.governorate || 'Kasserine'
      }
    ] as any));
  }
  
  console.log(`[ZirIA] Creating Transport Requests...`);
  const reqRepo = dataSource.getRepository(TransportRequest);
  await reqRepo.save(reqRepo.create([
    {
      requester_id: ahmed ? ahmed.id : farmersList[0].id,
      origin_lat: REGIONS[0].lat,
      origin_lng: REGIONS[0].lng,
      origin_address: 'Ferme Ahmed Ben Salah, Kasserine',
      destination_lat: 36.7200,
      destination_lng: 10.2100,
      destination_address: 'Marché de Gros Bir El Kassaâ, Tunis',
      cargo_type: 'Tomate Rio Grande',
      weight_tonnes: 8.5,
      proposed_price_tnd: 350.0,
      pickup_date: daysFromNow(1),
      status: TransportStatus.PENDING,
      notes: 'Récolte fraîche, besoin d\'un camion frigo si possible.'
    },
    {
      requester_id: farmersList[1].id,
      origin_lat: REGIONS[1].lat,
      origin_lng: REGIONS[1].lng,
      origin_address: 'Coopérative El Baraka, Sbeitla',
      destination_lat: 34.7400,
      destination_lng: 10.7600,
      destination_address: 'Port de Sfax',
      cargo_type: 'Huile d\'olive Extra Vierge',
      weight_tonnes: 2.0,
      proposed_price_tnd: 150.0,
      pickup_date: daysFromNow(2),
      status: TransportStatus.PENDING,
      notes: 'Fûts scellés, fragile.'
    },
    {
      requester_id: ahmed ? ahmed.id : farmersList[0].id,
      origin_lat: REGIONS[0].lat,
      origin_lng: REGIONS[0].lng,
      origin_address: 'Ferme Ahmed Ben Salah, Kasserine',
      destination_lat: 35.8200,
      destination_lng: 10.6300,
      destination_address: 'Usine de transformation, Sousse',
      cargo_type: 'Piment de Kairouan',
      weight_tonnes: 12.0,
      proposed_price_tnd: 450.0,
      pickup_date: daysFromNow(3),
      status: TransportStatus.PENDING,
      notes: 'Volume important, semi-remorque requis.'
    }
  ] as any));

  console.log('[ZirIA] Seeding Governorate Centroids...');
  const centroids = [
    { governorate: 'Tunis', latitude: 36.8065, longitude: 10.1815 },
    { governorate: 'Ariana', latitude: 36.8624, longitude: 10.1956 },
    { governorate: 'Ben Arous', latitude: 36.7531, longitude: 10.2222 },
    { governorate: 'Manouba', latitude: 36.8078, longitude: 10.0864 },
    { governorate: 'Nabeul', latitude: 36.4561, longitude: 10.7376 },
    { governorate: 'Zaghouan', latitude: 36.4029, longitude: 10.1429 },
    { governorate: 'Bizerte', latitude: 37.2744, longitude: 9.8739 },
    { governorate: 'Béja', latitude: 36.7333, longitude: 9.1833 },
    { governorate: 'Jendouba', latitude: 36.5011, longitude: 8.7802 },
    { governorate: 'Le Kef', latitude: 36.1681, longitude: 8.7096 },
    { governorate: 'Siliana', latitude: 36.0844, longitude: 9.3708 },
    { governorate: 'Kairouan', latitude: 35.6781, longitude: 10.0963 },
    { governorate: 'Kassérine', latitude: 35.1675, longitude: 8.8308 },
    { governorate: 'Kasserine', latitude: 35.1675, longitude: 8.8308 },
    { governorate: 'Sidi Bouzid', latitude: 35.0382, longitude: 9.4849 },
    { governorate: 'Sousse', latitude: 35.8256, longitude: 10.6369 },
    { governorate: 'Monastir', latitude: 35.7833, longitude: 10.8333 },
    { governorate: 'Mahdia', latitude: 35.5047, longitude: 11.0622 },
    { governorate: 'Sfax', latitude: 34.7400, longitude: 10.7600 },
    { governorate: 'Gafsa', latitude: 34.4250, longitude: 8.7842 },
    { governorate: 'Tozeur', latitude: 33.9197, longitude: 8.1335 },
    { governorate: 'Kebili', latitude: 33.7043, longitude: 8.9690 },
    { governorate: 'Gabès', latitude: 33.8814, longitude: 10.0982 },
    { governorate: 'Médenine', latitude: 33.3549, longitude: 10.4933 },
    { governorate: 'Tataouine', latitude: 32.9297, longitude: 10.4518 }
  ];
  const centroidRepo = dataSource.getRepository(GovernorateCentroid);
  await centroidRepo.save(centroidRepo.create(centroids));

  console.log('[ZirIA] Seeding FAO Crop Kc Values...');
  const kcValues = [
    { crop_type: 'blé', kc_ini: 0.30, kc_mid: 1.15, kc_end: 0.25 },
    { crop_type: 'orge', kc_ini: 0.30, kc_mid: 1.15, kc_end: 0.25 },
    { crop_type: 'tomate', kc_ini: 0.60, kc_mid: 1.15, kc_end: 0.80 },
    { crop_type: 'poivron', kc_ini: 0.60, kc_mid: 1.05, kc_end: 0.90 },
    { crop_type: 'concombre', kc_ini: 0.60, kc_mid: 1.00, kc_end: 0.75 },
    { crop_type: 'melon', kc_ini: 0.50, kc_mid: 1.05, kc_end: 0.75 },
    { crop_type: 'olive', kc_ini: 0.65, kc_mid: 0.70, kc_end: 0.65 },
    { crop_type: 'vigne', kc_ini: 0.30, kc_mid: 0.85, kc_end: 0.45 },
    { crop_type: 'grenade', kc_ini: 0.50, kc_mid: 0.85, kc_end: 0.50 },
    { crop_type: 'amandier', kc_ini: 0.40, kc_mid: 0.90, kc_end: 0.60 },
    { crop_type: 'palmier', kc_ini: 0.90, kc_mid: 0.95, kc_end: 0.95 }
  ];
  const kcRepo = dataSource.getRepository(CropKcValue);
  await kcRepo.save(kcRepo.create(kcValues));

  console.log('[ZirIA] Seeding Animal Nutritional Norms...');
  const norms = [
    { species: 'bovin lait', stage: 'entretien', ufl: 5.5, pdin: 350.0, pdie: 380.0 },
    { species: 'bovin lait', stage: 'lactation', ufl: 12.0, pdin: 950.0, pdie: 980.0 },
    { species: 'bovin viande', stage: 'croissance', ufl: 8.0, pdin: 600.0, pdie: 620.0 },
    { species: 'ovin', stage: 'gestation', ufl: 1.2, pdin: 90.0, pdie: 95.0 },
    { species: 'ovin', stage: 'lactation', ufl: 1.8, pdin: 140.0, pdie: 145.0 },
    { species: 'caprin', stage: 'entretien', ufl: 0.8, pdin: 60.0, pdie: 65.0 },
    { species: 'poule pondeuse', stage: 'ponte', ufl: 0.3, pdin: 18.0, pdie: 19.0 },
    { species: 'poulet de chair', stage: 'croissance', ufl: 0.25, pdin: 22.0, pdie: 23.0 }
  ];
  const normRepo = dataSource.getRepository(AnimalNutritionalNorm);
  await normRepo.save(normRepo.create(norms));

  console.log('[ZirIA] Seeding Seasonal Crop Risks...');
  const risks = [
    { crop_type: 'Tomate', month: 5, risk_level: 'HIGH', risk_description: 'Risque élevé de mildiou en raison de l\'humidité élevée' },
    { crop_type: 'Tomate', month: 6, risk_level: 'MEDIUM', risk_description: 'Risque de virus TYLC et d\'attaques de mouche blanche' },
    { crop_type: 'Blé', month: 3, risk_level: 'HIGH', risk_description: 'Risque de septoriose et rouille jaune si pluies printanières' },
    { crop_type: 'Blé', month: 4, risk_level: 'HIGH', risk_description: 'Risque de rouille brune et oïdium lors de la montaison' },
    { crop_type: 'Olive', month: 10, risk_level: 'MEDIUM', risk_description: 'Risque de mouche de l\'olive avant la récolte' },
    { crop_type: 'Olive', month: 4, risk_level: 'HIGH', risk_description: 'Risque d\'oeil de paon sur le feuillage humide' },
    { crop_type: 'Amande', month: 2, risk_level: 'HIGH', risk_description: 'Risque de moniliose lors de la floraison précoce' },
    { crop_type: 'Vigne', month: 6, risk_level: 'HIGH', risk_description: 'Risque élevé d\'oïdium et de mildiou de la vigne' },
    { crop_type: 'Melon', month: 7, risk_level: 'HIGH', risk_description: 'Risque de fusariose et d\'oïdium sous forte chaleur' },
    { crop_type: 'Piment', month: 8, risk_level: 'HIGH', risk_description: 'Risque d\'anthracnose et de flétrissement bactérien' }
  ];
  const riskRepo = dataSource.getRepository(SeasonalCropRisk);
  await riskRepo.save(riskRepo.create(risks));

  console.log('[ZirIA] Seeding Product Prescription Rules...');
  const rules = [
    { disease_name: 'Mildiou', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '2.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 7, notes: 'Appliquer préventivement par temps humide ou dès les premiers symptômes.' },
    { disease_name: 'Oïdium', allowed_product: 'Fongicide Soufre Mouillable Pro', default_dosage: '3 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 5, notes: 'Traiter de préférence tôt le matin pour éviter les brûlures foliaires.' },
    { disease_name: 'Septoriose', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '2 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 14, notes: 'À appliquer sur céréales entre le stade 2 noeuds et fin floraison.' },
    { disease_name: 'Rouille jaune', allowed_product: 'Fongicide Soufre Mouillable Pro', default_dosage: '4 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 21, notes: 'Intervenir dès l\'apparition des premières pustules jaunes.' },
    { disease_name: 'Cochenille', allowed_product: 'Anti-Cochenille Soluble Premium', default_dosage: '1.5 L/ha', default_application_method: 'SPRAY', pre_harvest_days: 15, notes: 'Associer à de l\'huile blanche pour une meilleure efficacité.' },
    { disease_name: 'Oeil de paon', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '3 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 14, notes: 'Traiter les oliviers après la récolte d\'automne et au printemps.' },
    { disease_name: 'Pucerons', allowed_product: 'Anti-Pucerons Systémique Fort', default_dosage: '0.5 L/ha', default_application_method: 'SPRAY', pre_harvest_days: 3, notes: 'Traiter dès l\'apparition des premières colonies de pucerons.' },
    { disease_name: 'Mouche blanche', allowed_product: 'Insecticide NeemShield 100% Bio', default_dosage: '2 L/ha', default_application_method: 'SPRAY', pre_harvest_days: 1, notes: 'Traitement biologique à renouveler tous les 7 jours.' },
    { disease_name: 'Alternariose', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '2.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 7, notes: 'Éviter les irrigations par aspersion en fin de journée.' },
    { disease_name: 'Fusariose', allowed_product: 'Bio-Fongicide Trichoderma Plus', default_dosage: '1.5 kg/ha', default_application_method: 'SOIL', pre_harvest_days: 0, notes: 'Application au sol lors de la plantation pour protéger les racines.' },
    { disease_name: 'Botrytis (Pourriture grise)', allowed_product: 'Fongicide Soufre Mouillable Pro', default_dosage: '2.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 7, notes: 'Favoriser l\'aération de la canopée par effeuillage.' },
    { disease_name: 'Teigne de l\'olivier', allowed_product: 'Bacillus Thuringiensis Curatif', default_dosage: '1 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 0, notes: 'Cible la génération anthophage ou phyllophage.' },
    { disease_name: 'Anthracnose', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '3 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 10, notes: 'Traiter après les épisodes de grêle ou de forte pluie.' },
    { disease_name: 'Rouille brune', allowed_product: 'Fongicide Soufre Mouillable Pro', default_dosage: '3.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 21, notes: 'Surveiller les parcelles de blé dur de fin mars à mai.' },
    { disease_name: 'Tuta absoluta', allowed_product: 'Bacillus Thuringiensis Curatif', default_dosage: '1.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 1, notes: 'Traiter dès la détection des premières galeries sur feuilles.' },
    { disease_name: 'Cladosporiose', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '2 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 7, notes: 'Maintenir une humidité relative faible sous serre.' },
    { disease_name: 'Moniliose', allowed_product: 'Fongicide Soufre Mouillable Pro', default_dosage: '3 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 14, notes: 'Traiter au gonflement des bourgeons puis à la chute des pétales.' },
    { disease_name: 'Acariens', allowed_product: 'Insecticide NeemShield 100% Bio', default_dosage: '3 L/ha', default_application_method: 'SPRAY', pre_harvest_days: 2, notes: 'Mouiller abondamment le dessous des feuilles.' },
    { disease_name: 'Flétrissement bactérien', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '2.5 kg/ha', default_application_method: 'SOIL', pre_harvest_days: 7, notes: 'Arrosage du collet pour limiter la propagation.' },
    { disease_name: 'Feu bactérien', allowed_product: 'Fongicide Cuivre Excellence', default_dosage: '3.5 kg/ha', default_application_method: 'SPRAY', pre_harvest_days: 28, notes: 'Taille et destruction des rameaux infectés obligatoires.' }
  ];
  const ruleRepo = dataSource.getRepository(ProductPrescriptionRule);
  await ruleRepo.save(ruleRepo.create(rules));

  console.log('[ZirIA] Seeding Vaccine Types...');
  const vaccines = [
    { species: 'bovin', disease_prevented: 'Fièvre Aphteuse', injection_method: 'Intramusculaire', age_weeks: 12, interval_months: 6 },
    { species: 'bovin', disease_prevented: 'Brucellose', injection_method: 'Sous-cutanée', age_weeks: 16, interval_months: 12 },
    { species: 'ovin', disease_prevented: 'Clostridiose (Entérotoxémie)', injection_method: 'Sous-cutanée', age_weeks: 8, interval_months: 12 },
    { species: 'ovin', disease_prevented: 'Fièvre Catarrhale Ovine (FCO)', injection_method: 'Sous-cutanée', age_weeks: 12, interval_months: 12 },
    { species: 'caprin', disease_prevented: 'Ecthyma Contagieux', injection_method: 'Scarification', age_weeks: 4, interval_months: 12 },
    { species: 'poulet de chair', disease_prevented: 'Maladie de Newcastle', injection_method: 'Oculaire/Eau de boisson', age_weeks: 1, interval_months: 3 },
    { species: 'poule pondeuse', disease_prevented: 'Bronchite Infectieuse', injection_method: 'Nébulisation', age_weeks: 2, interval_months: 6 }
  ];
  const vaccineRepo = dataSource.getRepository(VaccineType);
  await vaccineRepo.save(vaccineRepo.create(vaccines));

  console.log('[ZirIA] Seeding CRDA Zones...');
  const crdaRepo = dataSource.getRepository(CrdaZone);
  const crdaZones = [
    { region_name: 'Tunis', district_name: 'Tunis' },
    { region_name: 'Tunis', district_name: 'La Marsa' },
    { region_name: 'Ariana', district_name: 'Ariana Ville' },
    { region_name: 'Ariana', district_name: 'Soukra' },
    { region_name: 'Ben Arous', district_name: 'Ben Arous' },
    { region_name: 'Ben Arous', district_name: 'Mohammedia' },
    { region_name: 'Manouba', district_name: 'Manouba' },
    { region_name: 'Manouba', district_name: 'Oued Ellil' },
    { region_name: 'Nabeul', district_name: 'Nabeul' },
    { region_name: 'Nabeul', district_name: 'Hammamet' },
    { region_name: 'Nabeul', district_name: 'Kélibia' },
    { region_name: 'Zaghouan', district_name: 'Zaghouan' },
    { region_name: 'Bizerte', district_name: 'Bizerte Nord' },
    { region_name: 'Bizerte', district_name: 'Menzel Bourguiba' },
    { region_name: 'Bizerte', district_name: 'Mateur' },
    { region_name: 'Béja', district_name: 'Béja Nord' },
    { region_name: 'Béja', district_name: 'Béja Sud' },
    { region_name: 'Béja', district_name: 'Medjez El Bab' },
    { region_name: 'Jendouba', district_name: 'Jendouba' },
    { region_name: 'Jendouba', district_name: 'Tabarka' },
    { region_name: 'Jendouba', district_name: 'Aïn Draham' },
    { region_name: 'Kef', district_name: 'Kef Ouest' },
    { region_name: 'Kef', district_name: 'Kef Est' },
    { region_name: 'Siliana', district_name: 'Siliana' },
    { region_name: 'Siliana', district_name: 'Bouarada' },
    { region_name: 'Kasserine', district_name: 'Kasserine Nord' },
    { region_name: 'Kasserine', district_name: 'Kasserine Sud' },
    { region_name: 'Kasserine', district_name: 'Fériana' },
    { region_name: 'Sidi Bouzid', district_name: 'Sidi Bouzid Est' },
    { region_name: 'Sidi Bouzid', district_name: 'Sidi Bouzid Ouest' },
    { region_name: 'Kairouan', district_name: 'Kairouan Nord' },
    { region_name: 'Kairouan', district_name: 'Kairouan Sud' },
    { region_name: 'Kairouan', district_name: 'Haffouz' },
    { region_name: 'Sousse', district_name: 'Sousse' },
    { region_name: 'Sousse', district_name: 'Msaken' },
    { region_name: 'Monastir', district_name: 'Monastir' },
    { region_name: 'Monastir', district_name: 'Moknine' },
    { region_name: 'Mahdia', district_name: 'Mahdia' },
    { region_name: 'Mahdia', district_name: 'Ksour Essef' },
    { region_name: 'Sfax', district_name: 'Sfax Nord' },
    { region_name: 'Sfax', district_name: 'Sfax Sud' },
    { region_name: 'Sfax', district_name: 'Mahres' },
    { region_name: 'Gabès', district_name: 'Gabès Nord' },
    { region_name: 'Gabès', district_name: 'Gabès Sud' },
    { region_name: 'Médenine', district_name: 'Médenine Nord' },
    { region_name: 'Médenine', district_name: 'Médenine Sud' },
    { region_name: 'Médenine', district_name: 'Zarzis' },
    { region_name: 'Tataouine', district_name: 'Tataouine Nord' },
    { region_name: 'Tataouine', district_name: 'Tataouine Sud' },
    { region_name: 'Gafsa', district_name: 'Gafsa Nord' },
    { region_name: 'Gafsa', district_name: 'Gafsa Sud' },
    { region_name: 'Tozeur', district_name: 'Tozeur' },
    { region_name: 'Tozeur', district_name: 'Nefta' },
    { region_name: 'Kébili', district_name: 'Kébili Nord' },
    { region_name: 'Kébili', district_name: 'Kébili Sud' },
    { region_name: 'Kébili', district_name: 'Douz' },
  ];
  for (const z of crdaZones) {
    await crdaRepo.save(crdaRepo.create(z));
  }
  console.log(`[ZirIA] Seeded ${crdaZones.length} CRDA zones`);

  console.log('[ZirIA] Seeding Tunisian Governorate Boundaries...');
  const govRepo = dataSource.getRepository(GovernorateBoundary);
  // Approximate bounding polygons for all 24 governorates (SRID 4326)
  const govs: { name_fr: string; name_ar: string; polygon: string }[] = [
    { name_fr: 'Tunis', name_ar: 'تونس', polygon: 'POLYGON((10.05 36.70, 10.30 36.70, 10.30 36.90, 10.05 36.90, 10.05 36.70))' },
    { name_fr: 'Ariana', name_ar: 'أريانة', polygon: 'POLYGON((10.05 36.88, 10.25 36.88, 10.25 37.00, 10.05 37.00, 10.05 36.88))' },
    { name_fr: 'Ben Arous', name_ar: 'بن عروس', polygon: 'POLYGON((10.12 36.60, 10.40 36.60, 10.40 36.78, 10.12 36.78, 10.12 36.60))' },
    { name_fr: 'Manouba', name_ar: 'منوبة', polygon: 'POLYGON((9.90 36.70, 10.15 36.70, 10.15 36.88, 9.90 36.88, 9.90 36.70))' },
    { name_fr: 'Nabeul', name_ar: 'نابل', polygon: 'POLYGON((10.50 36.30, 11.10 36.30, 11.10 36.90, 10.50 36.90, 10.50 36.30))' },
    { name_fr: 'Zaghouan', name_ar: 'زغوان', polygon: 'POLYGON((9.80 36.20, 10.30 36.20, 10.30 36.50, 9.80 36.50, 9.80 36.20))' },
    { name_fr: 'Bizerte', name_ar: 'بنزرت', polygon: 'POLYGON((9.50 37.00, 10.20 37.00, 10.20 37.40, 9.50 37.40, 9.50 37.00))' },
    { name_fr: 'Béja', name_ar: 'باجة', polygon: 'POLYGON((8.80 36.50, 9.50 36.50, 9.50 36.90, 8.80 36.90, 8.80 36.50))' },
    { name_fr: 'Jendouba', name_ar: 'جندوبة', polygon: 'POLYGON((8.50 36.30, 9.00 36.30, 9.00 36.80, 8.50 36.80, 8.50 36.30))' },
    { name_fr: 'Kef', name_ar: 'الكاف', polygon: 'POLYGON((8.50 35.90, 9.00 35.90, 9.00 36.40, 8.50 36.40, 8.50 35.90))' },
    { name_fr: 'Siliana', name_ar: 'سليانة', polygon: 'POLYGON((9.00 35.80, 9.80 35.80, 9.80 36.30, 9.00 36.30, 9.00 35.80))' },
    { name_fr: 'Kasserine', name_ar: 'القصرين', polygon: 'POLYGON((8.50 34.90, 9.20 34.90, 9.20 35.60, 8.50 35.60, 8.50 34.90))' },
    { name_fr: 'Sidi Bouzid', name_ar: 'سيدي بوزيد', polygon: 'POLYGON((9.20 34.70, 10.00 34.70, 10.00 35.30, 9.20 35.30, 9.20 34.70))' },
    { name_fr: 'Kairouan', name_ar: 'القيروان', polygon: 'POLYGON((9.50 35.20, 10.30 35.20, 10.30 35.90, 9.50 35.90, 9.50 35.20))' },
    { name_fr: 'Sousse', name_ar: 'سوسة', polygon: 'POLYGON((10.30 35.70, 10.70 35.70, 10.70 36.10, 10.30 36.10, 10.30 35.70))' },
    { name_fr: 'Monastir', name_ar: 'المنستير', polygon: 'POLYGON((10.60 35.60, 10.90 35.60, 10.90 35.85, 10.60 35.85, 10.60 35.60))' },
    { name_fr: 'Mahdia', name_ar: 'المهدية', polygon: 'POLYGON((10.40 35.20, 11.10 35.20, 11.10 35.60, 10.40 35.60, 10.40 35.20))' },
    { name_fr: 'Sfax', name_ar: 'صفاقس', polygon: 'POLYGON((10.20 34.30, 11.10 34.30, 11.10 35.20, 10.20 35.20, 10.20 34.30))' },
    { name_fr: 'Gabès', name_ar: 'قابس', polygon: 'POLYGON((9.80 33.60, 10.40 33.60, 10.40 34.20, 9.80 34.20, 9.80 33.60))' },
    { name_fr: 'Médenine', name_ar: 'مدنين', polygon: 'POLYGON((10.00 33.00, 11.30 33.00, 11.30 33.60, 10.00 33.60, 10.00 33.00))' },
    { name_fr: 'Tataouine', name_ar: 'تطاوين', polygon: 'POLYGON((9.80 31.80, 11.00 31.80, 11.00 33.00, 9.80 33.00, 9.80 31.80))' },
    { name_fr: 'Gafsa', name_ar: 'قفصة', polygon: 'POLYGON((8.50 34.20, 9.40 34.20, 9.40 34.80, 8.50 34.80, 8.50 34.20))' },
    { name_fr: 'Tozeur', name_ar: 'توزر', polygon: 'POLYGON((7.80 33.70, 8.60 33.70, 8.60 34.20, 7.80 34.20, 7.80 33.70))' },
    { name_fr: 'Kébili', name_ar: 'قبلي', polygon: 'POLYGON((8.60 33.20, 9.50 33.20, 9.50 34.00, 8.60 34.00, 8.60 33.20))' },
  ];
  const qr = dataSource.createQueryRunner();
  const existingCount = await qr.query(`SELECT COUNT(*) FROM tunisian_governorate_boundaries`);
  if (parseInt(existingCount[0].count, 10) === 0) {
    for (const g of govs) {
      await qr.query(
        `INSERT INTO tunisian_governorate_boundaries (name_fr, name_ar, polygon)
         VALUES ($1, $2, ST_SetSRID(ST_GeomFromText($3), 4326))`,
        [g.name_fr, g.name_ar, g.polygon],
      );
    }
    console.log(`[ZirIA] Seeded ${govs.length} governorate boundaries`);
  } else {
    console.log(`[ZirIA] Governorate boundaries already seeded, skipping.`);
  }

  console.log('[ZirIA] SUCCESS: Database V7.0 successfully seeded with 150+ realistic records!');
  console.log('[ZirIA] Use passwords "Ziria2026!" for all @ziria.tn accounts.');
  console.log('\n=========================================');
  console.log('      DEMO EXPERTS CONNECTION DETAILS    ');
  console.log('=========================================');
  console.log('1. Phytopathologist: expert1@ziria.tn (Dr. Yassine Khaldi, CRDA Agent)');
  console.log('2. Agronomist:       expert2@ziria.tn (Ing. Salma Touati, Private)');
  console.log('3. Hydraulic Eng:    expert3@ziria.tn (Ing. Karim Dridi, CRDA Agent)');
  console.log('4. Hydrogeologist:   expert4@ziria.tn (Dr. Amel Rezgui, Private)');
  console.log('5. Zootechnician:    expert5@ziria.tn (Dr. Sami Hammami, Private)');
  console.log('6. Veterinary Epid:  expert6@ziria.tn (Dr. Olfa Riahi, Private)');
  console.log('=========================================\n');

  await app.close();
  process.exit(0);
}

bootstrap();
