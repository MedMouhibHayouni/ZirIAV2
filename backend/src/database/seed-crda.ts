/**
 * seed-crda.ts — Sprint 7 regional seed for CRDA data
 * Populates realistic campaigns, subsidy programs, and service requests
 * for each seeded CRDA regional office.
 */
import { DataSource } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { InstitutionType } from '../institutions/enums/institution.enums';
import { CrdaCampaign, CampaignType, CampaignStatus } from '../crda/entities/crda-campaign.entity';
import { CrdaCampaignEnrollment, EnrollmentStatus } from '../crda/entities/crda-campaign-enrollment.entity';
import { CrdaServiceRequest, ServiceRequestType, ServiceRequestStatus } from '../crda/entities/crda-service-request.entity';
import { SubsidyProgram } from '../crda/entities/subsidy-program.entity';
import { SubsidyApplication } from '../crda/entities/subsidy-application.entity';

export async function seedCrdaData(dataSource: DataSource): Promise<void> {
  const crdaOffices = await dataSource.getRepository(Institution).find({
    where: { type: InstitutionType.CRDA },
  });

  const farmers = await dataSource.getRepository(User).find({
    where: { role: Role.FARMER },
    take: 20,
  });

  if (crdaOffices.length === 0) {
    console.warn('[CRDA Seed] No CRDA offices found. Run institution seed first.');
    return;
  }
  if (farmers.length === 0) {
    console.warn('[CRDA Seed] No farmers found. Skipping campaign enrollments & service requests.');
  }

  const campaignRepo = dataSource.getRepository(CrdaCampaign);
  const enrollmentRepo = dataSource.getRepository(CrdaCampaignEnrollment);
  const serviceRequestRepo = dataSource.getRepository(CrdaServiceRequest);
  const subsidyProgramRepo = dataSource.getRepository(SubsidyProgram);
  const subsidyApplicationRepo = dataSource.getRepository(SubsidyApplication);

  // ── Per-region seed data ──────────────────────────────────────────────────────
  const campaignTemplates: Array<Partial<CrdaCampaign>> = [
    {
      title: 'Campagne Vaccination Bétail — Printemps 2026',
      type: CampaignType.VACCINATION,
      description: 'Vaccination préventive contre la fièvre aphteuse et la brucellose bovine.',
      targetCropOrLivestock: 'Bovin / Ovin',
      startDate: '2026-03-15',
      endDate: '2026-04-30',
      status: CampaignStatus.COMPLETED,
      targetParticipantsCount: 120,
    },
    {
      title: 'Traitement Phytosanitaire Céréales — Campagne 2026',
      type: CampaignType.PHYTOSANITARY_TREATMENT,
      description: 'Application préventive contre la septoriose et la rouille jaune sur blé tendre.',
      targetCropOrLivestock: 'Blé tendre / Orge',
      startDate: '2026-04-01',
      endDate: '2026-05-15',
      status: CampaignStatus.ACTIVE,
      targetParticipantsCount: 200,
    },
    {
      title: 'Déclaration Surfaces Semées — Automne 2026',
      type: CampaignType.SOWING_DECLARATION,
      description: 'Collecte officielle des déclarations de semis dans le cadre de l\'enquête nationale.',
      targetCropOrLivestock: 'Céréales / Légumineuses',
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      status: CampaignStatus.PLANNED,
      targetParticipantsCount: 350,
    },
    {
      title: 'Gestion Ressource Eau — Bilan été 2026',
      type: CampaignType.WATER_MANAGEMENT,
      description: 'Recensement des pompages et des niveaux des nappes phréatiques superficielles.',
      targetCropOrLivestock: 'Toutes cultures irriguées',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: CampaignStatus.ACTIVE,
      targetParticipantsCount: 80,
    },
  ];

  const subsidyTemplates: Array<Partial<SubsidyProgram>> = [
    {
      name: 'Programme Intrants Subventionnés — Engrais de fond',
      criteria: 'Exploitations céréalières de moins de 10 ha, cotisantes CNSS Agricole.',
      totalBudgetTnd: 500000.000,
      allocatedBudgetTnd: 182400.000,
      applicationWindowStart: '2026-01-15',
      applicationWindowEnd: '2026-03-31',
      isOpen: false,
      beneficiariesPublished: true,
    },
    {
      name: 'Aide à l\'Irrigation Localisée — Goutte-à-Goutte',
      criteria: 'Agriculteurs avec parcelle cadastrée et consommation eau > 500 m³/saison.',
      totalBudgetTnd: 850000.000,
      allocatedBudgetTnd: 310000.000,
      applicationWindowStart: '2026-04-01',
      applicationWindowEnd: '2026-06-30',
      isOpen: true,
      beneficiariesPublished: false,
    },
    {
      name: 'Prime Reconversion Arboriculture — Olivier / Amandier',
      criteria: 'Parcelles arides Bour, superficie > 1 ha, engagement plantation certifiée.',
      totalBudgetTnd: 1200000.000,
      allocatedBudgetTnd: 0.000,
      applicationWindowStart: '2026-09-01',
      applicationWindowEnd: '2026-12-31',
      isOpen: true,
      beneficiariesPublished: false,
    },
  ];

  const serviceRequestTemplates: Array<{
    type: ServiceRequestType;
    subject: string;
    description: string;
    status: ServiceRequestStatus;
  }> = [
    {
      type: ServiceRequestType.WATER_AUTHORIZATION,
      subject: 'Autorisation creusement puits surface parcelle #K-142',
      description: 'Demande d\'autorisation pour creusement d\'un puits de surface (profondeur ≤ 20 m) sur parcelle enregistrée K-142. Situation hydrogéologique favorable selon étude préliminaire.',
      status: ServiceRequestStatus.RESOLVED,
    },
    {
      type: ServiceRequestType.TECHNICAL_VISIT,
      subject: 'Visite technique urgente : attaque charançon dattier',
      description: 'Signalement d\'une infestation de charançon rouge du palmier sur exploitation de 3 ha. Demande d\'intervention rapide d\'un technicien phytosanitaire CRDA.',
      status: ServiceRequestStatus.IN_PROGRESS,
    },
    {
      type: ServiceRequestType.LAND_REGULARIZATION,
      subject: 'Régularisation titre foncier — mutation héritiers',
      description: 'Suite au décès du chef d\'exploitation, les héritiers demandent l\'accompagnement CRDA pour la régularisation du titre foncier et la mise à jour du registre agricole.',
      status: ServiceRequestStatus.RECEIVED,
    },
    {
      type: ServiceRequestType.INPUT_SUBSIDY,
      subject: 'Demande subvention semences certifiées blé dur',
      description: 'Exploitation de 8 ha en blé dur, demande d\'accès au programme de subvention semences certifiées variété Karim pour campagne 2026–2027.',
      status: ServiceRequestStatus.ASSIGNED,
    },
    {
      type: ServiceRequestType.PHYTO_ASSISTANCE,
      subject: 'Assistance diagnostic maladie de la tomate',
      description: 'Apparition de symptômes foliaires anormaux sur culture de tomate sous serre (brunissement, dépérissement). Suspicion mildiou. Demande de diagnostic urgent.',
      status: ServiceRequestStatus.RESOLVED,
    },
  ];

  let ticketCounter = 1000;

  for (const office of crdaOffices) {
    // ── Campaigns ────────────────────────────────────────────────────────────────
    for (const tmpl of campaignTemplates) {
      const exists = await campaignRepo.findOne({
        where: { institutionId: office.id, title: tmpl.title },
      });
      if (exists) continue;

      const targetDelegations = getDelegationsForGovernorate(office.governorate ?? '');
      const campaign = campaignRepo.create({
        ...tmpl,
        institutionId: office.id,
        targetDelegations,
      } as Partial<CrdaCampaign>);
      const savedCampaign = await campaignRepo.save(campaign);

      // Enroll 2–5 farmers in active/completed campaigns
      if (
        savedCampaign.status === CampaignStatus.ACTIVE ||
        savedCampaign.status === CampaignStatus.COMPLETED
      ) {
        const enrollCount = Math.min(3, farmers.length);
        for (let i = 0; i < enrollCount; i++) {
          const farmer = farmers[i];
          const existingEnroll = await enrollmentRepo.findOne({
            where: { campaignId: savedCampaign.id, farmerId: farmer.id },
          });
          if (existingEnroll) continue;
          const enrollment = enrollmentRepo.create({
            campaignId: savedCampaign.id,
            farmerId: farmer.id,
            status:
              savedCampaign.status === CampaignStatus.COMPLETED
                ? EnrollmentStatus.COMPLETED
                : EnrollmentStatus.OPTED_IN,
            completedAt:
              savedCampaign.status === CampaignStatus.COMPLETED
                ? new Date('2026-05-10')
                : null,
          });
          await enrollmentRepo.save(enrollment);
        }
      }
    }

    // ── Subsidy Programs ─────────────────────────────────────────────────────────
    for (const tmpl of subsidyTemplates) {
      const exists = await subsidyProgramRepo.findOne({
        where: { institutionId: office.id, name: tmpl.name },
      });
      if (exists) continue;

      const program = subsidyProgramRepo.create({
        ...tmpl,
        institutionId: office.id,
      } as Partial<SubsidyProgram>);
      const savedProgram = await subsidyProgramRepo.save(program);

      // Seed a couple of applications for programs that have budget allocated
      if (Number(savedProgram.allocatedBudgetTnd) > 0 && farmers.length > 0) {
        const appCount = Math.min(2, farmers.length);
        for (let i = 0; i < appCount; i++) {
          const farmer = farmers[i % farmers.length];
          const existsApp = await subsidyApplicationRepo.findOne({
            where: { programId: savedProgram.id, farmerId: farmer.id },
          });
          if (existsApp) continue;

          const app = subsidyApplicationRepo.create({
            programId: savedProgram.id,
            farmerId: farmer.id,
            justification: `Exploitation de ${5 + i * 2} ha, objectif modernisation irrigation. Justificatifs joints.`,
            requestedAmountTnd: Math.round((8000 + i * 3000) * 1000) / 1000,
            grantedAmountTnd: i === 0 ? Math.round((7500 + i * 2500) * 1000) / 1000 : null,
            status: i === 0 ? 'APPROVED' : 'PENDING',
            decidedAt: i === 0 ? new Date('2026-04-20') : null,
          });
          await subsidyApplicationRepo.save(app);
        }
      }
    }

    // ── Service Requests ─────────────────────────────────────────────────────────
    for (let i = 0; i < serviceRequestTemplates.length; i++) {
      const tmpl = serviceRequestTemplates[i];
      const ticketNumber = `CRDA-SR-${String(ticketCounter++).padStart(5, '0')}`;
      const exists = await serviceRequestRepo.findOne({ where: { ticketNumber } });
      if (exists) continue;

      const farmer = farmers.length > 0 ? farmers[i % farmers.length] : null;
      if (!farmer) continue;

      const sr = serviceRequestRepo.create({
        ticketNumber,
        institutionId: office.id,
        farmerId: farmer.id,
        type: tmpl.type,
        subject: tmpl.subject,
        description: tmpl.description,
        status: tmpl.status,
        agentResolutionReport:
          tmpl.status === ServiceRequestStatus.RESOLVED
            ? 'Dossier traité avec succès. Notification envoyée à l\'agriculteur.'
            : null,
      });
      await serviceRequestRepo.save(sr);
    }
  }

  console.log(`[CRDA Seed] Completed. Processed ${crdaOffices.length} CRDA offices.`);
}

function getDelegationsForGovernorate(governorate: string): string[] {
  const delegationMap: Record<string, string[]> = {
    Kasserine:    ['Kasserine Nord', 'Kasserine Sud', 'Sbeitla', 'Foussana', 'Ezzouhour'],
    'Sidi Bouzid': ['Sidi Bouzid Ouest', 'Regueb', 'Bir El Hafey', 'Meknassy', 'Souk Jedid'],
    'Le Kef':      ['Le Kef Ouest', 'Le Kef Est', 'Nebeur', 'Sakiet Sidi Youssef', 'Tajerouine'],
    Kairouan:     ['Kairouan Nord', 'Kairouan Sud', 'Bouhajla', 'Oueslatia', 'Sbikha'],
    Siliana:      ['Siliana Nord', 'Siliana Sud', 'Bou Arada', 'El Aroussa', 'Gaâfour'],
    Gafsa:        ['Gafsa Nord', 'Gafsa Sud', 'El Ksar', 'Moulares', 'Redeyef'],
    Jendouba:     ['Jendouba Nord', 'Jendouba Sud', 'Bou Salem', 'Tabarka', 'Aïn Draham'],
  };
  return delegationMap[governorate] ?? ['Délégation Centrale'];
}
