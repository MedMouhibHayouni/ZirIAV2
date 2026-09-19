import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionMember } from '../institutions/entities/institution-member.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { InstitutionType, InstitutionLevel, OfficeRole } from '../institutions/enums/institution.enums';
import { DossierType } from '../dossiers/entities/dossier.entity';

export interface SeedResult {
  officesCreated: number;
  membersCreated: number;
  credentialsTable: Array<{
    office: string;
    role: string;
    email: string;
    governorate: string;
  }>;
}

export async function seedInstitutions(dataSource: DataSource): Promise<SeedResult> {
  const instRepo = dataSource.getRepository(Institution);
  const memberRepo = dataSource.getRepository(InstitutionMember);
  const userRepo = dataSource.getRepository(User);

  const password_hash = await bcrypt.hash('ZirIA_Inst_2026!', 10);

  const regions = [
    { code: 'KAS', name: 'Kasserine', lat: 35.1676, lng: 8.8365 },
    { code: 'SBZ', name: 'Sidi Bouzid', lat: 35.0382, lng: 9.4849 },
    { code: 'KEF', name: 'Le Kef', lat: 36.1742, lng: 8.7049 },
    { code: 'KAI', name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
    { code: 'SIL', name: 'Siliana', lat: 36.0849, lng: 9.3708 },
    { code: 'GAF', name: 'Gafsa', lat: 34.4250, lng: 8.7842 },
    { code: 'JEN', name: 'Jendouba', lat: 36.5011, lng: 8.7802 },
  ];

  let officesCreated = 0;
  let membersCreated = 0;
  const credentialsTable: Array<{ office: string; role: string; email: string; governorate: string }> = [];

  // 1. Create National APIA Office
  let nationalApia = await instRepo.findOne({ where: { name: 'APIA Direction Nationale' } });
  if (!nationalApia) {
    nationalApia = instRepo.create({
      type: InstitutionType.APIA,
      level: InstitutionLevel.NATIONAL,
      governorate: null,
      name: 'APIA Direction Nationale',
      address: 'Avenue Alain Savary, Tunis',
      phone: '+216 71 771 600',
      email: 'contact@apia.nat.tn',
      openingHours: '08:00 - 16:30',
      location: { type: 'Point', coordinates: [10.1815, 36.8065] },
      isActive: true,
    });
    nationalApia = await instRepo.save(nationalApia);
    officesCreated++;
  }

  // National Viewer User
  let natViewerUser = await userRepo.findOne({ where: { email: 'national.viewer@apia.nat.tn' } });
  if (!natViewerUser) {
    natViewerUser = userRepo.create({
      name: 'Superviseur National APIA',
      email: 'national.viewer@apia.nat.tn',
      phone: '+216 71 000 001',
      role: Role.INSTITUTION,
      governorate: undefined,
      password_hash,
      verified: true,
    });
    natViewerUser = await userRepo.save(natViewerUser);

    const natMember = memberRepo.create({
      userId: natViewerUser.id,
      institutionId: nationalApia.id,
      officeRole: OfficeRole.VIEWER,
      isActive: true,
    });
    await memberRepo.save(natMember);
    membersCreated++;
    credentialsTable.push({
      office: nationalApia.name,
      role: 'VIEWER',
      email: natViewerUser.email,
      governorate: 'NATIONAL',
    });
  }

  // 2. Create Regional APIA and CRDA Offices
  for (const reg of regions) {
    const types = [InstitutionType.APIA, InstitutionType.CRDA];

    for (const instType of types) {
      const officeName = `${instType} Bureau Régional de ${reg.name}`;
      let office = await instRepo.findOne({ where: { name: officeName } });

      if (!office) {
        office = instRepo.create({
          type: instType,
          level: InstitutionLevel.REGIONAL,
          governorate: reg.name,
          name: officeName,
          address: `Avenue Principale, ${reg.name}`,
          phone: `+216 77 ${Math.floor(100000 + Math.random() * 900000)}`,
          email: `${instType.toLowerCase()}.${reg.code.toLowerCase()}@institution.tn`,
          openingHours: '08:00 - 15:30',
          location: { type: 'Point', coordinates: [reg.lng, reg.lat] },
          isActive: true,
        });
        office = await instRepo.save(office);
        officesCreated++;
      }

      // Create Director
      const dirEmail = `director.${instType.toLowerCase()}.${reg.code.toLowerCase()}@institution.tn`;
      let dirUser = await userRepo.findOne({ where: { email: dirEmail } });
      if (!dirUser) {
        dirUser = userRepo.create({
          name: `Directeur ${instType} ${reg.name}`,
          email: dirEmail,
          phone: `+216 98 ${Math.floor(100000 + Math.random() * 900000)}`,
          role: Role.INSTITUTION,
          governorate: reg.name,
          password_hash,
          verified: true,
        });
        dirUser = await userRepo.save(dirUser);

        const member = memberRepo.create({
          userId: dirUser.id,
          institutionId: office.id,
          officeRole: OfficeRole.DIRECTOR,
          isActive: true,
        });
        await memberRepo.save(member);
        membersCreated++;
        credentialsTable.push({
          office: office.name,
          role: 'DIRECTOR',
          email: dirEmail,
          governorate: reg.name,
        });
      }

      // Create 3 Agents
      for (let a = 1; a <= 3; a++) {
        const agentEmail = `agent${a}.${instType.toLowerCase()}.${reg.code.toLowerCase()}@institution.tn`;
        let agentUser = await userRepo.findOne({ where: { email: agentEmail } });
        if (!agentUser) {
          agentUser = userRepo.create({
            name: `Agent ${a} ${instType} ${reg.name}`,
            email: agentEmail,
            phone: `+216 97 ${Math.floor(100000 + Math.random() * 900000)}`,
            role: Role.INSTITUTION,
            governorate: reg.name,
            password_hash,
            verified: true,
          });
          agentUser = await userRepo.save(agentUser);

          const member = memberRepo.create({
            userId: agentUser.id,
            institutionId: office.id,
            officeRole: OfficeRole.AGENT,
            isActive: true,
          });
          await memberRepo.save(member);
          membersCreated++;
          credentialsTable.push({
            office: office.name,
            role: `AGENT_${a}`,
            email: agentEmail,
            governorate: reg.name,
          });
        }
      }

      // Create 1 Viewer
      const viewerEmail = `viewer.${instType.toLowerCase()}.${reg.code.toLowerCase()}@institution.tn`;
      let viewerUser = await userRepo.findOne({ where: { email: viewerEmail } });
      if (!viewerUser) {
        viewerUser = userRepo.create({
          name: `Observateur ${instType} ${reg.name}`,
          email: viewerEmail,
          phone: `+216 96 ${Math.floor(100000 + Math.random() * 900000)}`,
          role: Role.INSTITUTION,
          governorate: reg.name,
          password_hash,
          verified: true,
        });
        viewerUser = await userRepo.save(viewerUser);

        const member = memberRepo.create({
          userId: viewerUser.id,
          institutionId: office.id,
          officeRole: OfficeRole.VIEWER,
          isActive: true,
        });
        await memberRepo.save(member);
        membersCreated++;
        credentialsTable.push({
          office: office.name,
          role: 'VIEWER',
          email: viewerEmail,
          governorate: reg.name,
        });
      }
    }
  }

  // 3. Seed Realistic Dossiers and Consents per Regional Office
  const dossierRepo = dataSource.getRepository('InstitutionDossier');
  const consentRepo = dataSource.getRepository('DataSharingConsent');
  const farmers = await userRepo.find({ where: { role: Role.FARMER } });

  if (farmers.length > 0) {
    const allApiaOffices = await instRepo.find({ where: { type: InstitutionType.APIA, level: InstitutionLevel.REGIONAL } });
    const allCrdaOffices = await instRepo.find({ where: { type: InstitutionType.CRDA, level: InstitutionLevel.REGIONAL } });

    const programNames = [
      'Mise a niveau exploitation oleicole',
      'Prime d\'investissement agricole',
      'Aide a l\'acquisition materiel agricole',
      'Financement reseau irrigation goutte-a-goutte',
      'Prime a la valorisation sous-produits',
      'Subvention pomiculture intensive',
      'Credit campagne ble',
      'Aide installation jeune agriculteur',
      'Prime mecanisation agricole',
      'Financement serre tunnel haute technologie',
    ];

    const statusPool = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INCOMPLETE', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];
    let dossierSeq = 1;

    for (const office of allApiaOffices) {
      const regionFarmers = farmers.filter(f => f.governorate === office.governorate);
      const usableFarmers = regionFarmers.length >= 2 ? regionFarmers : farmers;
      const numDossiers = 2 + Math.floor(Math.random() * 2); // 2-3 per region

      for (let i = 0; i < numDossiers && i < usableFarmers.length; i++) {
        const ref = `APIA-2026-${String(dossierSeq++).padStart(4, '0')}`;
        const existing = await dossierRepo.findOne({ where: { referenceNumber: ref } });
        if (existing) continue;

        const farmer = usableFarmers[i % usableFarmers.length];
        const amount = 8000 + Math.floor(Math.random() * 52000);
        const status = statusPool[Math.floor(Math.random() * statusPool.length)];

        const entity = dossierRepo.create({
          institutionId: office.id,
          farmerId: farmer.id,
          referenceNumber: ref,
          type: DossierType.INVESTMENT,
          status,
          programName: programNames[dossierSeq % programNames.length],
          requestedAmountTnd: amount,
          approvedAmountTnd: status === 'APPROVED' ? Math.floor(amount * 0.85) : null,
          projectSummary: `Dossier d'investissement ${office.governorate} — ${programNames[dossierSeq % programNames.length]}.`,
        });
        await dossierRepo.save(entity);

        const consent = consentRepo.create({
          farmerId: farmer.id,
          institutionId: office.id,
          scopes: ['PROFILE', 'PARCELS', 'DOSSIERS', 'SOIL_ANALYSES'],
          dossierId: (entity as any).id,
          status: 'ACTIVE',
        });
        await consentRepo.save(consent);
      }
    }

    for (const office of allCrdaOffices) {
      const regionFarmers = farmers.filter(f => f.governorate === office.governorate);
      const usableFarmers = regionFarmers.length >= 1 ? regionFarmers : farmers;
      const numDossiers = 1 + Math.floor(Math.random() * 2);

      for (let i = 0; i < numDossiers && i < usableFarmers.length; i++) {
        const ref = `CRDA-2026-${String(dossierSeq++).padStart(4, '0')}`;
        const existing = await dossierRepo.findOne({ where: { referenceNumber: ref } });
        if (existing) continue;

        const farmer = usableFarmers[i % usableFarmers.length];
        const amount = 3000 + Math.floor(Math.random() * 17000);
        const status = statusPool[Math.floor(Math.random() * statusPool.length)];

        const entity = dossierRepo.create({
          institutionId: office.id,
          farmerId: farmer.id,
          referenceNumber: ref,
          type: DossierType.TECHNICAL_REQUEST,
          status,
          programName: programNames[(dossierSeq + 5) % programNames.length],
          requestedAmountTnd: amount,
          approvedAmountTnd: status === 'APPROVED' ? Math.floor(amount * 0.9) : null,
          projectSummary: `Demande technique CRDA ${office.governorate}.`,
        });
        await dossierRepo.save(entity);

        const consent = consentRepo.create({
          farmerId: farmer.id,
          institutionId: office.id,
          scopes: ['PROFILE', 'PARCELS', 'DOSSIERS'],
          dossierId: (entity as any).id,
          status: 'ACTIVE',
        });
        await consentRepo.save(consent);
      }
    }
  }

  return {
    officesCreated,
    membersCreated,
    credentialsTable,
  };
}
