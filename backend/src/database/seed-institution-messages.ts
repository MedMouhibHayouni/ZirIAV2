/**
 * Seed: institutional messages + project calls + appointments
 * Run: npx ts-node src/database/seed-institution-messages.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ziria_db',
  });

  await ds.initialize();
  console.log('[InstitutionMessages Seed] Connected to DB');

  // ── 1. Fetch APIA institutions and members ──────────────────────────
  const apias = await ds.query(`SELECT id, name, governorate FROM institutions WHERE type = 'APIA' AND level = 'REGIONAL'`);
  console.log(`[Seed] Found ${apias.length} APIA regional offices`);

  const allMembers: any[] = [];
  for (const api of apias) {
    const members = await ds.query(
      `SELECT im.id as member_id, im."userId", im."institutionId", im."officeRole",
              u.name as user_name
       FROM institution_members im
       JOIN users u ON u.id = im."userId"
       WHERE im."institutionId" = $1 AND im."isActive" = true`,
      [api.id],
    );
    allMembers.push(...members);
  }
  console.log(`[Seed] Found ${allMembers.length} total APIA members`);

  // ── 2. Fetch farmers (for DOSSIER messages) ─────────────────────────
  const farmers = await ds.query(`SELECT id, name FROM users WHERE role = 'FARMER' LIMIT 8`);
  console.log(`[Seed] Found ${farmers.length} farmers`);

  // ── 3. Fetch dossiers ───────────────────────────────────────────────
  const dossiers = await ds.query(`SELECT id, "referenceNumber", "institutionId" FROM institution_dossiers LIMIT 15`);
  console.log(`[Seed] Found ${dossiers.length} dossiers`);

  // ── 4. Seed internal messages (between APIA members) ────────────────
  const internalMessages = [
    // Kasserine conversations
    { gov: 'Kasserine', from: 0, to: 1, content: 'Bonjour, est-ce que tu as pu vérifier le dossier APIA-2026-0001 ? Le farmer a envoyé les pièces manquantes.' },
    { gov: 'Kasserine', from: 1, to: 0, content: 'Oui, j\'ai reçu les documents ce matin. Je vais les examiner cet après-midi et mettre à jour le statut.' },
    { gov: 'Kasserine', from: 0, to: 1, content: 'Parfait. N\'oublie pas de vérifier aussi le devis du matériel agricole, il doit être conforme aux normes.' },
    { gov: 'Kasserine', from: 1, to: 0, content: 'Bien noté. Je te tiens au courant dès que j\'ai terminé l\'analyse.' },
    // Sidi Bouzid conversations
    { gov: 'Sidi Bouzid', from: 0, to: 1, content: 'Le dossier de subvention pomiculture est en attente de documents complémentaires. Tu peux relancer le farmer ?' },
    { gov: 'Sidi Bouzid', from: 1, to: 0, content: 'Je vais l\'appeler aujourd\'hui. Il nous avait promis les relevés fonciers la semaine dernière.' },
    { gov: 'Sidi Bouzid', from: 0, to: 1, content: 'Merci. Et pour le crédit campagne blé, l\'approbation est presque finalisée.' },
    // Le Kef conversations
    { gov: 'Le Kef', from: 0, to: 1, content: 'As-tu regardé la demande d\'installation jeune agriculteur ? Le projet semble intéressant.' },
    { gov: 'Le Kef', from: 1, to: 0, content: 'Oui, le plan d\'affaires est bien structuré. Je recommande une validation rapide.' },
    { gov: 'Le Kef', from: 0, to: 1, content: 'D\'accord, prépare le rapport de visite technique pour la semaine prochaine.' },
    // Kairouan conversations
    { gov: 'Kairouan', from: 0, to: 1, content: 'La serre tunnel haute technologie est un bon projet mais le budget est élevé. Tu peux négocier ?' },
    { gov: 'Kairouan', from: 1, to: 0, content: 'Je vais contactez le fournisseur pour obtenir un devis plus compétitif.' },
    { gov: 'Kairouan', from: 0, to: 1, content: 'Bonnes nouvelles, on a reçu une offre réduite de 12%. Je mets à jour le dossier.' },
  ];

  let internalCount = 0;
  for (const msg of internalMessages) {
    const office = apias.find((a: any) => a.governorate === msg.gov);
    if (!office) continue;
    const officeMembers = allMembers.filter((m: any) => m.institutionId === office.id);
    if (officeMembers.length < 2) continue;

    const sender = officeMembers[msg.from % officeMembers.length];
    const receiver = officeMembers[msg.to % officeMembers.length];

    const result = await ds.query(
      `INSERT INTO institution_messages ("senderId", "institutionId", content, context, "createdAt")
       VALUES ($1, $2, $3, 'INTERNAL', NOW() - interval '${Math.floor(Math.random() * 48)} hours')
       RETURNING id`,
      [sender.userId, office.id, msg.content],
    );
    // Mark as read by receiver
    const memberId = (await ds.query(
      `SELECT id FROM institution_members WHERE "userId" = $1 AND "institutionId" = $2`,
      [receiver.userId, office.id],
    ))[0];
    if (memberId) {
      await ds.query(
        `INSERT INTO institution_message_reads ("messageId", "memberId", "readAt")
         VALUES ($1, $2, NOW() - interval '${Math.floor(Math.random() * 24)} hours') ON CONFLICT DO NOTHING`,
        [result[0].id, memberId.id],
      );
    }
    internalCount++;
  }
  console.log(`[Seed] Inserted ${internalCount} internal messages`);

  // ── 5. Seed dossier messages (farmer → APIA) ────────────────────────
  const dossierMessages: Array<{ farmerIdx: number; dossierIdx: number; content: string; replies: string[] }> = [
    {
      farmerIdx: 0, dossierIdx: 0,
      content: 'Bonjour, je voudrais connaître l\'avancement de mon dossier d\'investissement pour l\'acquisition de matériel agricole. Merci.',
      replies: ['Bonjour Ahmed, votre dossier est en cours de traitement. Nous attendons encore la vérification du devis.', 'Mis à jour : le dossier est maintenant en phase d\'approbation. Vous recevrez une notification sous 48h.'],
    },
    {
      farmerIdx: 1, dossierIdx: 3,
      content: 'Bonjour, j\'ai déposé les documents complémentaires pour ma subvention pomiculture. Pouvez-vous vérifier ?',
      replies: ['Nous avons bien reçu vos documents. Un agent va les examiner cette semaine.', 'Examen terminé. Votre dossier est complet et sera transmis au comité d\'évaluation.'],
    },
    {
      farmerIdx: 2, dossierIdx: 5,
      content: 'Bonjour, mon dossier d\'installation jeune agriculteur est bloqué depuis 2 semaines. Qu\'est-ce qui manque ?',
      replies: ['Bonjour Youssef, nous avons besoin de votre plan d\'affaires mis à jour et du certificat de propriété.', 'Merci, nous avons bien reçu les documents. Le dossier est relancé.'],
    },
    {
      farmerIdx: 3, dossierIdx: 7,
      content: 'Bonjour, pour le financement serre tunnel, est-ce que je peux bénéficier d\'une aide supplémentaire ?',
      replies: ['Bonjour, le programme actuel prévoit une subvention de 40% maximum. Je vais vérifier les disponibilités.'],
    },
    {
      farmerIdx: 4, dossierIdx: 4,
      content: 'Bonjour, le crédit campagne blé a-t-il été approuvé ? J\'ai besoin de savoir pour planifier mes achats.',
      replies: ['Bonjour Mohamed, le crédit est approuvé. Vous pouvez passer à l\'agence pour finaliser les formalités.', 'Formalités terminées. Le montant sera viré sur votre compte sous 5 jours.'],
    },
    {
      farmerIdx: 0, dossierIdx: 1,
      content: 'Bonjour, pour le réseau irrigation goutte-à-goutte, pouvez-vous me recommander un fournisseur ?',
      replies: ['Bonjour, nous avons une liste de fournisseurs agréés. Je vous l\'envoie par email.', 'La liste a été envoyée. N\'hésitez pas si vous avez des questions.'],
    },
  ];

  let dossierCount = 0;
  for (const dm of dossierMessages) {
    const farmer = farmers[dm.farmerIdx % farmers.length];
    const dossier = dossiers[dm.dossierIdx % dossiers.length];
    if (!farmer || !dossier) continue;

    // Farmer message
    const farmerMsg = await ds.query(
      `INSERT INTO institution_messages ("senderId", "institutionId", content, context, "dossierId", "createdAt")
       VALUES ($1, $2, $3, 'DOSSIER', $4, NOW() - interval '${(dossierMessages.indexOf(dm) + 1) * 3} hours')
       RETURNING id`,
      [farmer.id, dossier.institutionId, dm.content, dossier.id],
    );

    // APIA agent replies
    const officeMembers = allMembers.filter((m: any) => m.institutionId === dossier.institutionId);
    for (let i = 0; i < dm.replies.length; i++) {
      const agent = officeMembers[i % officeMembers.length];
      if (!agent) continue;
      const reply = await ds.query(
        `INSERT INTO institution_messages ("senderId", "institutionId", content, context, "dossierId", "parentId", "createdAt")
         VALUES ($1, $2, $3, 'DOSSIER', $4, $5, NOW() - interval '${(dossierMessages.indexOf(dm) + 1) * 3 - 1} hours')
         RETURNING id`,
        [agent.userId, dossier.institutionId, dm.replies[i], dossier.id, farmerMsg[0].id],
      );
      // Mark reply as read by some members
      if (officeMembers.length > 0) {
        const memberId = (await ds.query(
          `SELECT id FROM institution_members WHERE "userId" = $1 AND "institutionId" = $2`,
          [officeMembers[(i + 1) % officeMembers.length].userId, dossier.institutionId],
        ))[0];
        if (memberId) {
          await ds.query(
            `INSERT INTO institution_message_reads ("messageId", "memberId", "readAt")
             VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
            [reply[0].id, memberId.id],
          );
        }
      }
    }
    dossierCount++;
  }
  console.log(`[Seed] Inserted ${dossierCount} dossier conversations with replies`);

  // ── 6. Seed project calls ───────────────────────────────────────────
  for (const api of apias) {
    const hasCalls = await ds.query(`SELECT COUNT(1) as cnt FROM institution_project_calls WHERE "institutionId" = $1`, [api.id]);
    if (hasCalls[0].cnt > 0) continue;

    const calls = [
      { title: 'Aide à l\'acquisition de matériel agricole', sector: 'Matériel', deadline: '2026-12-31', grantRate: '40%', description: 'Programme de subvention pour l\'acquisition de tracteurs, moissonneuses et équipements de irrigation.' },
      { title: 'Financement réseaux irrigation goutte-à-goutte', sector: 'Irrigation', deadline: '2026-10-15', grantRate: '50%', description: 'Aide à l\'installation de systèmes d\'irrigation localisée pour les exploitations de plus de 2 ha.' },
      { title: 'Prime mécanisation agricole', sector: 'Mécanisation', deadline: '2026-11-30', grantRate: '35%', description: 'Prime pour l\'acquisition de machines agricoles destinées à la mécanisation des cultures.' },
    ];

    for (const call of calls) {
      await ds.query(
        `INSERT INTO institution_project_calls ("institutionId", title, sector, deadline, "grantRate", description, "publishedToZirFeed", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [api.id, call.title, call.sector, call.deadline, call.grantRate, call.description],
      );
    }
  }
  console.log(`[Seed] Project calls seeded`);

  // ── 7. Seed appointments ────────────────────────────────────────────
  for (const api of apias) {
    const hasAppts = await ds.query(`SELECT COUNT(1) as cnt FROM institution_appointments WHERE "institutionId" = $1`, [api.id]);
    if (hasAppts[0].cnt > 0) continue;

    const appts = [
      { farmer: 'Ahmed Ben Salah', phone: '+216 98 123 456', date: '2026-09-22', slot: '09:00-09:30', topic: 'Consultation dossier investissement', status: 'CONFIRMED' },
      { farmer: 'Mohamed Trabelsi', phone: '+216 97 234 567', date: '2026-09-22', slot: '10:00-10:30', topic: 'Relance subvention pomiculture', status: 'PENDING' },
      { farmer: 'Youssef Ben Ali', phone: '+216 99 345 678', date: '2026-09-23', slot: '11:00-11:30', topic: 'Installation jeune agriculteur', status: 'CONFIRMED' },
      { farmer: 'Fatma Zahra Mansour', phone: '+216 95 456 789', date: '2026-09-24', slot: '14:00-14:30', topic: 'Demande crédit campagne blé', status: 'PENDING' },
      { farmer: 'Ali Bouazizi', phone: '+216 98 567 890', date: '2026-09-25', slot: '09:30-10:00', topic: 'Financement serre tunnel', status: 'CONFIRMED' },
    ];

    for (const a of appts) {
      await ds.query(
        `INSERT INTO institution_appointments ("institutionId", "farmerName", "farmerPhone", date, "timeSlot", topic, status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [api.id, a.farmer, a.phone, a.date, a.slot, a.topic, a.status],
      );
    }
  }
  console.log(`[Seed] Appointments seeded`);

  console.log('[InstitutionMessages Seed] Done!');
  await ds.destroy();
}

seed().catch((e) => {
  console.error('[Seed] Error:', e);
  process.exit(1);
});
