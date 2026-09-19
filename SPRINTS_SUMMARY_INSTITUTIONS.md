# Synthèse Globale des Sprints — Module Institutions (APIA & CRDA)

Projet : **ZirIA (Plateforme Agricole Intelligente Tunisienne)**  
Période : **Sprints 0 à 8**  
Stack : **NestJS (PostgreSQL / TypeORM) + Angular 21 Standalone**

---

## 1. Objectifs & Principes Directeurs
- **Rôle Unique `INSTITUTION`** : Décliné par sous-types via `InstitutionType` (`APIA` / `CRDA`), sans prolifération de rôles globaux.
- **Cloisonnement Territorial & Sécurité** : Filtrage strict par gouvernorat et niveau via `InstitutionScopeGuard`.
- **Moteur de Confidentialité & Consentement** : Accès aux données exploitant assujetti au consentement explicite (`DataSharingConsent`). Interdiction absolue d'accès direct à l'ERP privé, Marketplace ou Wallet.
- **Régionalisation Réaliste** : Déploiement sur 7 gouvernorats pilotes (Kasserine, Sidi Bouzid, Le Kef, Kairouan, Siliana, Gafsa, Jendouba) avec montants en TND (précision 3 décimales) et fuseau Africa/Tunis.

---

## 2. Récapitulatif par Sprint

### Sprint 0 — Architecture, Rôles & Sécurité
- Création des entités `Institution` et `InstitutionMember`.
- Définition des énumérations : `InstitutionType`, `InstitutionLevel`, `OfficeRole`.
- Implémentation du `InstitutionScopeGuard` pour l'isolation multi-tenant régionale.

### Sprint 1 — Moteur de Confidentialité & Consentement
- Création de `DataSharingConsent` et de la table d'audit des accès `DataAccessLog`.
- Mise en place du filtrage dynamique des fiches agriculteurs selon les scopes accordés (`PROFILE`, `PARCELS`, `DOSSIERS`, `SOIL_ANALYSES`).

### Sprint 2 — Moteur de Dossiers d'Investissement & Guichet Unique
- Entités `InstitutionDossier`, `DossierDocument`, `DossierStatusHistory`.
- Workflow d'instruction d'investissement et primes (`DossierType` : `INVESTMENT`, `CREDIT`, `SUBSIDY_APPLICATION`, `TECHNICAL_REQUEST`).
- Suivi des délais de traitement et alertes de dépassement (`isOverdue`, `daysInCurrentStatus`).

### Sprint 3 — Interface Agriculteur "Mes Dossiers" & Centre de Consentement
- Composant Angular `farmer-dossiers.component.ts` pour le suivi des aides en temps réel.
- Composant `consent-center.component.ts` permettant à l'exploitant d'octroyer ou révoquer les accès institutionnels.

### Sprint 4 — Espace de Travail APIA (Frontend)
- Conception du tableau de bord APIA (`apia-dashboard.component.ts`).
- Vues spécialisées : Instruction de crédit (`apia-credit`), suivi de projets d'investissement (`apia-projects`), porteurs de projets (`apia-porteurs`), opportunités et calendrier d'instruction (`apia-calendrier`).
- Fiche de l'antenne régionale et gestion des officiers (`apia-mon-bureau`).

### Sprint 5 — Données de Référence Régionales APIA
- Script de peuplement `seed-institutions.ts` couvrant les 7 gouvernorats cibles.
- Création des comptes directeurs, agents régionaux et dossiers réalistes d'irrigation et d'énergie solaire.

### Sprint 6 — Moteur Métier CRDA (Backend)
- **Campagnes de Vulgarisation & Santé Animale** : `CrdaCampaign` et `CrdaCampaignEnrollment` (vaccination ovine, rationalisation de l'eau, semences certifiées).
- **Guichet de Requêtes & Assistance Terrain** : `CrdaServiceRequest` avec attribution d'agents et rapports de résolution.
- **Programmes de Subventions & Décompte Budgétaire** : `SubsidyProgram` et `SubsidyApplication` avec gestion transactionnelle des quotas budgétaires.
- `CrdaService`, `CrdaController` et `CrdaModule` intégrant l'authentification JWT et le scope institutionnel.

### Sprint 7 — Données de Référence & Vues CRDA
- `seed-crda.ts` : 4 modèles de campagnes, 3 programmes de subventions et 35 requêtes d'assistance avec cartographie fine des délégations par gouvernorat.
- Composants frontend CRDA : `crda-campaigns.component.ts`, `crda-service-requests.component.ts`, `crda-subventions.component.ts`.

### Sprint 8 — Durcissement, Cartographie Territoriale & Validation Complète
- **Cartographie Interactive** : `crda-territory-map.component.ts` avec Leaflet (Périmètres Publics Irrigués PPI, points d'eau/forages, alertes phytosanitaires et foyers épidémiques).
- **Profil de Délégation CRDA** : `crda-mon-bureau.component.ts` pour l'annuaire de l'équipe locale.
- **Résolution des Incohérences** : Harmonisation des énumérations `DossierType` dans le seed, sécurisation du fallback `req.institutionScope`.
- **Compilations & Tests** :
  - Backend : `nest build` validé (Code 0).
  - Frontend : `ng build` validé (Code 0).
  - Base de données : `seed.ts` exécuté avec succès sur l'ensemble des 7 gouvernorats (Code 0).

---

## 3. Matrice des Livrables

| Composant | Type | Rôle / Portée |
| :--- | :--- | :--- |
| `InstitutionScopeGuard` | Backend Guard | Isolation régionale et contrôle d'accès APIA/CRDA |
| `CrdaService` / `CrdaController` | Backend Core | API REST complète campagnes, demandes, subventions |
| `seed-institutions.ts` / `seed-crda.ts` | Backend Seed | Données complètes 7 gouvernorats |
| `ApiaDashboardComponent` + sous-modules | Frontend UI | Espace d'investissement & crédit APIA |
| `CrdaDashboardComponent` + sous-modules | Frontend UI | Espace vulgarisation, requêtes & subventions CRDA |
| `CrdaTerritoryMapComponent` | Frontend UI | Cartographie SIG des périmètres PPI et alertes |
| `CrdaMonBureauComponent` | Frontend UI | Gestion du bureau local et agents techniques |
| `FarmerDossiersComponent` | Frontend UI | Guichet exploitant pour le suivi des aides |
