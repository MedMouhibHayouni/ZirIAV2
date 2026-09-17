# 🌌 ZirIA Sentinel — Full Backend Audit Manifest V1.1 (Production Ready)

Ce manifeste détaille l'audit complet du backend **ZirIA Sentinel**. Il inclut l'architecture, les services d'infrastructure optimisés (GAP 3, 4, 5), et l'intégralité des routes API vérifiées.

---

## 🏛️ Infrastructure & Audit de Performance (Optimisations Récentes)

### 1. 🛡️ Sécurité & Rate Limiting
- **Global Throttling** : Limite de 100 requêtes par minute appliquée via `ThrottlerModule`.
- **Overrides de Sécurité** : Limites plus strictes (5 req/min) sur `/auth/login`, `/upload/*` et `/agent/*` pour prévenir le brute-force et le spam média.
- **WebSocket Auth** : Migration complète vers une authentification par `handshake.auth.token`. Les connexions anonymes sont rejetées par les gateways `NotificationGateway` et `LandAuctionGateway`.

### 2. ⚡ Caching Hybride
- **Production** : Utilisation de **Redis** (`ioredis`) via la variable d'environnement `REDIS_URL`.
- **Développement** : Fallback automatique en **In-Memory Store** (Cache-Manager).
- **Routes Cachées** : `GET /admin/kpis`, `GET /marketplace`, `GET /market-prices`, `GET /weather` (TTL: 5 min).

### 3. 📄 Pagination Standardisée
- Implémentation du format `PaginatedResult<T>` (items, total, page, limit, hasNext).
- **Routes paginées** : `/disease-detections/my`, `/notifications`, `/marketplace`, `/workers/offers`, `/finance/records/me`.

### 4. 🎤 Pipeline Audio & IA
- **Audio Upload** : Pipeline optimisé dans `UploadService` utilisant Cloudinary (type 'video' pour les fichiers audio). Supporte MP3, WAV, AAC, WEBM (max 50MB).
- **Gemini Integration** : L'agent IA (`AgentService`) consomme désormais les `audio_url` pour une extraction d'intention multimodale.

### 5. 🌱 Database Seeding & Stabilité
- **Seed Script** : `npm run seed` génère un environnement complet avec utilisateurs (Admin, SMSA, B2B, etc.), parcelles, détections, et annonces marketplace.
- **Test de Connectivité** : `npm run test:connectivity` audite l'état des services externes (Cloudinary, Gemini, DB, Redis).

---

## 🛠️ Catalogue Exhaustif des Modules & API Routes

### 1. 🔑 Authentification (`/auth`)
- **`POST /auth/register`** : Inscription avec hashage Bcrypt (Round 12).
- **`POST /auth/login`** : Authentification et génération de JWT (Access + Refresh).
- **`GET /auth/me`** : Profil de l'utilisateur connecté.

### 2. 🛡️ Administration Globale (`/admin`)
- **`GET /admin/kpis`** : Métriques temps réel (utilisateurs, transactions). [CACHÉ]
- **`GET /admin/users`** : Gestion des comptes (pagination, filtres).
- **`POST /admin/users/:id/verify`** : Certification officielle d'un compte.
- **`POST /admin/users/:id/suspend`** : Suspension administrative.
- **`GET /admin/system/health`** : Monitorage Hardware/DB (OS, Memory, Connections).
- **`GET /admin/transactions`** : Audit financier global.

### 3. 🏥 Détections de Maladies (`/disease-detections`)
- **`POST /disease-detections`** : Soumission d'une détection (terrain).
- **`POST /disease-detections/analyze`** : Alias pour l'analyse IA.
- **`GET /disease-detections/my`** : Historique personnel. [PAGINÉ]
- **`GET /disease-detections/pending-validation`** : File d'attente pour les experts CRDA.
- **`GET /disease-detections/heatmap`** : Données GeoJSON pour Leaflet/Google Maps.
- **`PATCH /disease-detections/:id/link-parcel`** : Liaison cadastrale.
- **`POST /disease-detections/:id/request-validation`** : Demande d'expertise manuelle.
- **`POST /disease-detections/validate`** : Feedback expert (MLOps Loop).

### 4. 👨‍🔬 Expertise CRDA (`/expert`)
- **`GET /expert/phyto-alerts/my`** : Historique des alertes diffusées.
- **`POST /expert/phyto-alerts`** : Création d'alerte.
- **`POST /expert/broadcast-alert`** : Diffusion Push + WS géociblée (PostGIS ST_DWithin).
- **`GET /expert/reports/generate`** : Rapport de synthèse régionale (PDF Stub).

### 5. 🚜 SMSA & Coopératives (`/cooperatives`)
- **`POST /cooperatives`** : Création de SMSA.
- **`GET /cooperatives/my/stats`** : KPIs membres et volumes.
- **`GET /cooperatives/my/activity-feed`** : Flux d'activité en temps réel.
- **`GET /cooperatives/my/members`** : Liste des affiliés.
- **`POST /cooperatives/my/broadcast`** : Message de masse (Push/SMS).

### 6. 🗺️ Parcelles & Cadastre (`/parcels`)
- **`POST /parcels`** : Création avec Polygon GeoJSON.
- **`GET /parcels/my`** : Liste des propriétés de l'utilisateur.
- **`GET /parcels/:id/crop-zones`** : Gestion des zones de culture.
- **`POST /parcels/:id/crop-zones`** : Ajout de culture (démarre le suivi GDD).

### 7. 💰 Finance (`/finance`)
- **`GET /finance/records/me`** : Grand livre personnel (Revenus/Dépenses). [PAGINÉ]
- **`POST /finance/records`** : Ajout de transaction externe.
- **`GET /finance/export`** : Export PDF des 30 derniers jours (PDF Stub).
- **`GET /finance/commissions`** : Statistiques des prélèvements plateforme.

### 8. 🏗️ Matériel & Équipement (`/equipment`)
- **`POST /equipment`** : Mise en location de machinerie.
- **`GET /equipment/my`** : Flotte personnelle.
- **`GET /equipment/reservations/my`** : Gestion des locations entrantes.
- **`PATCH /equipment/reservations/:id/respond`** : Accepter/Refuser (ACCEPT/REJECT).
- **`GET /equipment/revenue/summary`** : Bilan financier par matériel.

### 9. 👷 Marché du Travail (`/workers`)
- **`GET /workers/offers`** : Recherche spatiale d'emploi. [PAGINÉ, ST_DWithin]
- **`POST /workers/job-offers`** : Publication d'offre.
- **`POST /workers/job-offers/:id/apply`** : Candidature travailleur.
- **`PATCH /workers/applications/:id`** : Validation candidat par l'agriculteur.

### 10. 🚚 Transport & Logistique (`/drivers`)
- **`POST /drivers/transport-requests`** : Demande de fret (B2B/Farmer).
- **`GET /drivers/transport-requests/available`** : Bourse de fret (Driver).
- **`PATCH /drivers/transport-requests/:id/accept`** : Engagement chauffeur.

### 11. 🏔️ Foncier & Enchères (`/land`)
- **`POST /land`** : Publication foncière.
- **`GET /land/listings`** : Catalogue foncier.
- **`POST /land/auctions`** : Démarrage d'enchère live.
- **`POST /land/bids`** : Soumission d'enchère (Sync WS).

### 12. 🛒 Marketplace B2B (`/marketplace`)
- **`GET /marketplace`** : Catalogue des récoltes. [CACHÉ, PAGINÉ]
- **`POST /marketplace/:id/interest`** : Mise en relation B2B.
- **`PATCH /marketplace/connections/:connectionId/respond`** : Conclusion de contrat.

### 13. 🤖 Agent IA (`/agent`)
- **`POST /agent/message`** : Chat/Vocal avec Gemini. [RATE-LIMITED]
- **`GET /agent/conversations`** : Sessions actives.
- **`GET /agent/conversations/:id/messages`** : Historique session.

### 14. ☁️ Upload (`/upload`)
- **`POST /upload/image`** : Images générales.
- **`POST /upload/disease-photo`** : Photos haute résolution maladies.
- **`POST /upload/audio`** : Fichiers vocaux pour IA (Gemini/ZirPulse). [RATE-LIMITED]

---

## 📡 Gateways WebSockets (Temps Réel)
1. **`/auctions`** (LandAuctionGateway) : Gestion des enchères foncières (`joinAuction`, `placeBid`, `newBid`).
2. **`/notifications`** (NotificationGateway) : Alertes critiques, alertes météo, messages P2P.

---

## ⚙️ Services d'Arrière-Plan (Cron Jobs)
1. **`FinanceCronService`** : `@Cron(EVERY_DAY_AT_MIDNIGHT)` - Agrégation du revenu plateforme et stats quotidiennes.
2. **`GddCronService`** : `@Cron(EVERY_DAY_AT_MIDNIGHT)` - Calcul des Degrés-Jours pour prédiction de récolte.

---
*Fin de l'Audit Officiel Backend — ZirIA Sentinel AgriTech Platform V1.1*
