# ZirIA — Plateforme Agricole Intelligente

## Les Points Forts de ZirIA

**1. Un écosystème complet à 360°**
ZirIA n'est pas un simple outil agricole — c'est une place de marché digitale qui couvre toute la chaîne de valeur agricole tunisienne : du diagnostic des maladies à la vente des récoltes, en passant par le suivi des parcelles, la gestion des élevages, les services de transport, la main-d'œuvre saisonnière, la location d'équipements, la messagerie experte, et un réseau social agricole complet.

**2. L'intelligence Artificielle au cœur**
Chaque agriculteur dispose d'un diagnostic IA pour ses plantes (photo → maladie détectée) et pour ses animaux (symptômes → diagnostic vétérinaire). Les experts valident ou corrigent ces diagnostics. Un agent conversationnel IA (ZirPulse) assiste l'agriculteur au quotidien. Les suggestions IA aident les experts à rédiger leurs réponses aux consultations.

**3. 11 rôles interconnectés**
Chaque acteur du monde agricole a son propre tableau de bord, ses propres fonctionnalités, et interagit avec les autres rôles via des flux de travail intégrés : l'agriculteur consulte un expert, l'expert prescrit un produit, le fournisseur l'approvisionne, le chauffeur le transporte, l'ouvrier le récolte, le coopérative le commercialise.

**4. Un réseau social agricole (ZirFeed)**
Une plateforme sociale complète avec posts, stories, reels, groupes, pages, événements, messagerie — dédiée à l'agriculture tunisienne. Les agriculteurs partagent leurs expériences, les experts diffusent des alertes, les marques agricoles animent leurs communautés.

**5. Géolocalisation et cartographie avancée**
Parcelles GPS, heatmap des maladies, zones de quarantaine, carte des puits, suivi piézométrique, zones CRDA, itinéraires de transport — toute la plateforme est ancrée dans le territoire tunisien avec PostGIS.

**6. Un système de contrats intelligent**
Contrats de travail saisonnier, contrats de transport, contrats de location d'équipement, conventions de commission entre experts et fournisseurs — le tout avec négociation, signature, suivi et évaluation.

**7. Abonnements progressifs**
De FREE à BUSINESS, chaque palier débloque plus de fonctionnalités : stock & finances pour le PRO, API pour le BUSINESS, CRM clients pour les fournisseurs.

---

## Les Acteurs de ZirIA (Rôles et Sous-Types)

ZirIA distingue deux niveaux : le **Role** (le métier principal) et le **RoleType** (la spécialisation à l'intérieur du métier).

### Les 11 Rôles Principaux

#### 1. ADMIN — Super Administrateur
**Pas de sous-type.** Vue globale sur toute la plateforme, gestion des utilisateurs, des experts, des transactions financières, de la santé système et de la modération du ZirFeed.

#### 2. FARMER — Agriculteur
**3 sous-types (activité agricole) :**
- **CROP** — Agriculture végétale (céréales, maraîchage, arboriculture)
- **LIVESTOCK** — Élevage (bovin, ovin, caprin, volaille)
- **MIXED** — Mixte (végétal + animal + apiculture)

Le sous-type détermine les menus visibles dans le tableau de bord. Un agriculteur CROP voit "Mes Parcelles" et "Diagnostic Plante", un LIVESTOCK voit "Mon Cheptel" et "Diagnostic Animal", un MIXED voit tout.

**Fonctionnalités :**
- ZirPulse IA — Assistant vocal conversationnel (tous)
- Analytiques — Suivi des cultures, GDD, stades phénologiques (tous)
- Mes Parcelles — Cartographie GPS des parcelles (CROP, MIXED)
- Diagnostic Plante — Photo → Maladie → Solution (CROP, MIXED)
- Diagnostic Animal IA — Symptômes → Diagnostic vétérinaire (LIVESTOCK, MIXED)
- Mon Cheptel — Gestion du troupeau (LIVESTOCK, MIXED)
- Apiculture — Gestion des ruches (MIXED)
- Stock & Finances — ERP embarqué (PRO)
- Services — Hub de services (location équipement, main-d'œuvre, transport)
- Alertes — Météo, ravageurs, marchés
- Marketplace — Vente des récoltes
- Boutique Intrants — Achat d'intrants
- Réseau d'Experts — Découvrir, contacter, consulter des experts
- Messagerie — Temps réel avec experts et autres acteurs
- Contrats — Gestion des contrats de travail/transport/location
- ZirFeed — Réseau social agricole
- Abonnement — Gestion du plan (FREE/STARTER/PRO/BUSINESS)

#### 3. FARMER_AMBASSADOR — Ambassadeur Terrain
**Pas de sous-type.** Agriculteur connecté qui fait le relais entre le terrain et la plateforme. Il inscrit de nouveaux agriculteurs, soumet des signalements terrain, valide des certifications, et diffuse les alertes dans sa zone.

**Fonctionnalités :**
- Vue d'ensemble — KPIs de sa zone
- Mes Agriculteurs — Gestion des agriculteurs suivis
- Carte de Zone — Cartographie de sa zone d'intervention
- Alertes Zone — Diffusion d'alertes locales
- Diagnostics — Validation des diagnostics terrain
- Signalements Terrain — Rapports de culture avec photos
- Validations Certifications — Aide à la certification des agriculteurs
- Inscrire Agriculteur — Formulaire d'inscription terrain
- Messagerie

#### 4. COOP_PRESIDENT — Président de Coopérative (SMSA)
**Pas de sous-type.** Gère une coopérative de 50+ membres. Tableau de bord spécifique pour la gestion collective.

**Fonctionnalités :**
- Tableau de bord — Vue d'ensemble de la coopérative
- Gérer Membres — Gestion des adhérents
- Parcelles GPS — Cartographie collective
- Mes Ventes — Mise en marché groupée
- Alertes Phyto — Diffusion aux membres

#### 5. B2B_BUYER — Acheteur Gros / Exportateur
**Pas de sous-type.** Approvisionnement en gros pour l'exportation ou la transformation.

**Fonctionnalités :**
- Sourcing Hub — Recherche de fournisseurs et produits
- Mes Contrats — Gestion des contrats d'approvisionnement
- Insights Marché — Tendances des prix et volumes

#### 6. SUPPLIER — Fournisseur d'Intrants
**Pas de sous-type.** Fournisseur de semences, engrais, pesticides, équipements.

**Fonctionnalités :**
- Vue d'ensemble — KPIs commerciaux
- Mon Catalogue — Gestion des produits et stocks
- Commandes — Gestion des commandes entrantes
- CRM Clients — Gestion de la relation client
- Promotions — Campagnes marketing
- Ma Vitrine — Boutique en ligne publique
- Mon Bureau — Factures, devis, documents
- Analytiques — Tableaux de bord commerciaux
- Mon Abonnement — Gestion du plan

#### 7. DRIVER — Chauffeur Agricole
**Pas de sous-type.** Transport de récoltes et d'intrants.

**Fonctionnalités :**
- Mon Profil — Compétences, véhicule, disponibilités
- Missions Disponibles — Offres de transport
- Mission en Cours — Suivi GPS de la mission active
- Historique — Missions terminées
- Mes Revenus — Gains cumulés
- Notifications — Alertes de nouvelles missions
- Mon Véhicule — Gestion du/des véhicules
- Mes Contrats — Contrats de transport

#### 8. WORKER — Ouvrier Agricole Saisonnier
**Pas de sous-type.** Main-d'œuvre qualifiée pour les travaux agricoles.

**Fonctionnalités :**
- Mon Profil — Compétences, disponibilités, évaluations
- Offres d'Emploi — Recherche de missions
- Mes Candidatures — Suivi des candidatures
- Mes Revenus — Historique des gains
- Notifications
- Mes Contrats

#### 9. LAND_OWNER — Propriétaire Foncier
**Pas de sous-type.** Publie des offres de vente ou location de terres agricoles.

**Fonctionnalités :**
- Mes Terres (Cadastre) — Gestion du foncier
- Demandes Location — Gestion des demandes entrantes
- Offres — Publication d'annonces

#### 10. EQUIP_OWNER — Propriétaire d'Équipement
**Pas de sous-type.** Loue du matériel agricole (tracteurs, moissonneuses, etc.).

**Fonctionnalités :**
- Mes Locations — Gestion des locations en cours
- Flotte — Gestion des équipements
- Calendrier — Planning de disponibilité
- Demandes — Demandes de location entrantes
- Revenus — Gains
- Mes Contrats

#### 11. EXPERT — Expert Agricole
**6 sous-types (spécialité) — voir section dédiée plus bas.**

---

## Les 6 Types d'Experts

Un expert appartient à un **seul type** (défini lors de la création du profil), ce qui détermine l'intégralité de son tableau de bord, ses menus, ses outils et les types de consultations qu'il reçoit.

### 11.1 Phytopathologiste
**Spécialité** : Maladies des cultures (fongiques, bactériennes, virales)

**Menus et fonctionnalités :**
| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + triage urgent + top maladies de la semaine |
| Triage IA | File de validation des diagnostics IA avec nomenclature trilingue obligatoire |
| Heatmap | Carte interactive des foyers de maladie par région |
| Mes Agriculteurs | Liste des agriculteurs liés + dossier complet |
| Alertes & Bulletins | Création et diffusion d'alertes phytosanitaires géolocalisées |
| Prescriptions | Création d'ordonnances avec auto-suggestions par maladie |
| Consultations | File d'attente → accepter → répondre avec suggestions IA → paiement |
| Messages | Messagerie temps réel avec agriculteurs et confrères |
| Revenus | Tableau de bord financier avec historique mensuel et commissions |
| Mon Profil | Gestion complète du profil |

### 11.2 Agronome
**Spécialité** : Fertilisation, sols, optimisation des rendements

| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + analyses sol hors norme + dernières analyses + calculateur NPK |
| Mes Agriculteurs | Liste + dossier + chips "dernière analyse sol" |
| Cahiers de Culture | Journal des cultures par agriculteur (semis → récolte) |
| Analyses de Sol | Gestion des analyses : pH, NPK, matière organique, conductivité |
| Ordonnances | Prescriptions de fertilisation |
| Consultations | → accepter → répondre → paiement |
| Messages | Messagerie temps réel |
| Revenus | Finances + commissions |
| Mon Profil | |

### 11.3 Ingénieur Hydraulique
**Spécialité** : Irrigation, drainage, hydraulique agricole

| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + projets retardés + projets en cours + calculateur ETc |
| Mes Agriculteurs | Liste + chips "projets irrigation actifs" |
| Projets Irrigation | Création et suivi des projets d'irrigation |
| Calcul ETc | Calculateur besoins en eau (ETo, Kc, ETc mm/j, m³/ha/j) |
| Consultations | → accepter → répondre → paiement |
| Messages | |
| Revenus | |
| Mon Profil | |

### 11.4 Hydrogéologue
**Spécialité** : Eaux souterraines, nappes phréatiques, puits

| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + puits en anomalie + tableau de bord nappe + relevés |
| Mes Agriculteurs | Liste + chips "puits suivis" |
| Carte des Puits | Liste, création, relevés des puits |
| Piézométrie | Graphiques niveau d'eau et salinité dans le temps |
| Consultations | → accepter → répondre → paiement |
| Messages | |
| Revenus | |
| Mon Profil | |

### 11.5 Spécialiste Élevage (Zootechnicien)
**Spécialité** : Nutrition animale, troupeaux, reproduction

| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + troupeaux sous-performants + fiches + rations express |
| Mes Agriculteurs | Liste + chips "taille troupeau" |
| Mes Élevages | Fiches d'élevage par espèce avec alertes de performance |
| Rations & Nutrition | Calculateur UFL/PDIN/PDIE par espèce et stade |
| Calendrier Repro | Inséminations, gestations, naissances imminentes |
| Consultations | → accepter → répondre → paiement |
| Messages | |
| Revenus | |
| Mon Profil | |

### 11.6 Vétérinaire Épidémiologiste
**Spécialité** : Santé animale, vaccinations, prophylaxie

| Menu | Fonction |
|------|----------|
| Vue d'ensemble | KPIs + actions prioritaires (vaccins + consultations) |
| Mes Agriculteurs | Liste + chips "rappels vaccins à venir" |
| Dossiers Cliniques | Dossiers vétérinaires (symptômes, diagnostic, traitement) |
| Vaccinations | Calendrier vaccinal avec rappels imminents |
| Carte Quarantaine | Zones de quarantaine cliquables + diffusion alerte |
| Alertes Sanitaires | Diffusion d'alertes sanitaires régionales |
| Consultations | → accepter → répondre → paiement |
| Messages | |
| Revenus | |
| Mon Profil | |

---

## ZirFeed — Le Réseau Social Agricole Tunisien

ZirFeed est un réseau social complet embarqué dans ZirIA, accessible à tous les utilisateurs authentifiés depuis `/dashboard/feed`. C'est le Fil d'actualité de l'agriculture tunisienne.

### Pourquoi ZirFeed ?

L'agriculture est un métier de partage. Un agriculteur à Kasserine a besoin de savoir ce qui se passe à Sidi Bouzid. Un expert veut diffuser une alerte mildiou à tous les producteurs de tomates. Une coopérative veut annoncer ses prix. Une marque d'engrais veut présenter ses nouveaux produits. ZirFeed est ce lieu d'échange — un espace social 100% agricole, en français, arabe et darija.

### Les 8 Onglets de ZirFeed

**1. Feed (Fil d'actualité)**
- Barre de stories éphémères (24h) — photos, vidéos, posts partagés
- Composeur de post avec chips contextuelles : CONSEIL, ALERTE, QUESTION, CÉLÉBRATION, ACTUALITÉ
- Fil infini avec posts des utilisateurs suivis, pages, groupes
- Réactions longue-pression (5 types : ADMIRE, RÉFLÉCHIR, COLLABORER, PERTINENT, D'ACCORD)
- Commentaires threadés (réponses imbriquées)
- Partage de post (dans le feed, en story)
- Sauvegarde dans des collections (favoris thématiques)
- Signalement de contenu (5 motifs)
- Marquage "Pertinent"
- Insertion automatique d'actualités FAO tous les 15 posts

**2. Reels**
- Lecteur immersif vertical type TikTok
- Deux onglets : Pour Toi / Abonnements
- Navigation verticale, muet/activé
- Compteur de vues (seuil 3 secondes)

**3. Groupes**
- Annuaire des groupes agricoles (par catégorie, privés/publics)
- Création de groupe avec paramètres de confidentialité
- Intérieur du groupe : fil dédié, composeur, panneau d'administration
- Gestion des membres (ADMIN, CO-ADMIN, MEMBRE)
- Demandes d'adhésion avec approbation/rejet
- Permissions de publication

**4. Pages**
- Pages institutionnelles : banques agricoles, assurances, marques, coopératives, organismes publics
- Abonnement aux pages
- Intérieur de page : fil dédié avec composeur et programmation de publications
- Calendrier éditorial

**5. Événements**
- Calendrier des événements agricoles : foires, ateliers, forums, journées champêtres, marchés
- Création d'événement avec lieu, dates, image de couverture, lien d'inscription
- Participation : INTÉRESSÉ / PARTICIPE
- Liste des participants
- Événements archivés

**6. Sauvegardés (Collections)**
- Collections de favoris personnelles (ex: "Conseils Techniques Irrigation", "Fiches Maladies Céréales")
- Création de collection avec image de couverture
- Sauvegarde de posts, reels et événements
- Glisser-déposer pour organiser

**7. Profil Social**
- Profil public de chaque utilisateur sur ZirFeed
- Statistiques : posts, abonnés, abonnements
- Bio, photo de couverture
- Onglets : Posts / Reels / Soutenu

**8. Modération Admin**
- File de modération du contenu signalé
- Score IA de chaque contenu (Gemini 2.0 Flash)
- Approbation / rejet avec motif
- Gestion des restrictions utilisateur (bannissement post ou total)

### Fonctionnalités Transversales ZirFeed

- **Recherche globale** : posts, utilisateurs, groupes, pages, événements
- **Notifications sociales** : follow, réaction, commentaire, partage
- **Hashtags tendance** : volume d'utilisation en temps réel
- **Suggestion d'agriculteurs** : widget "Agriculteurs à suivre"
- **Ma Communauté** : widget sidebar avec les membres actifs
- **Actualités FAO** : crawler RSS du fil FAO actualités agricoles
- **Temps réel (SSE)** : nouveaux posts, réactions, commentaires et notifications apparaissent sans rafraîchissement

### Les Types de Publications

| Type | Description |
|------|-------------|
| TEXTE | Publication textuelle simple |
| PHOTO | Image unique |
| VIDÉO | Vidéo courte |
| VOICE_NOTE | Note vocale enregistrée |
| REEL | Vidéo verticale courte (format TikTok) |
| DOCUMENT | Fichier PDF ou document |
| MIXED | Texte + média combinés |

---

## Les Tableaux de Bord par Rôle (Synthèse)

| Rôle | Nombre de pages | Fonctionnalité principale | Acteurs connectés |
|------|----------------|---------------------------|-------------------|
| **ADMIN** | 5 | Supervision globale | Tous |
| **FARMER** | 22 | Production agricole | Experts, Chauffeurs, Ouvriers, Fournisseurs |
| **AMBASSADOR** | 10 | Relais terrain | Agriculteurs, Experts |
| **COOP_PRESIDENT** | 5 | Gestion collective | Agriculteurs membres |
| **B2B_BUYER** | 3 | Approvisionnement gros | Agriculteurs, Fournisseurs |
| **SUPPLIER** | 11 | Vente intrants | Agriculteurs, Experts |
| **DRIVER** | 8 | Transport | Agriculteurs |
| **WORKER** | 5 | Main-d'œuvre | Agriculteurs |
| **LAND_OWNER** | 3 | Foncier | Agriculteurs, Investisseurs |
| **EQUIP_OWNER** | 5 | Location matériel | Agriculteurs |
| **EXPERT** | 22 (6 variantes) | Conseil & validation | Agriculteurs, Fournisseurs |

---

## Les Flux de Travail Inter-Rôles

**Parcours type d'une récolte :**

```
1. FARMER (CROP) → Diagnostic IA plante malade
2. FARMER → Demande consultation EXPERT (Phytopathologiste)
3. EXPERT → Valide le diagnostic, rédige prescription
4. FARMER → Achète produit chez SUPPLIER via la prescription
5. SUPPLIER → EXPERT reçoit commission sur l'achat
6. FARMER → Embauche WORKER pour le traitement
7. FARMER → Récolte → Publie annonce sur MARKETPLACE
8. B2B_BUYER → Achète la récolte en gros
9. FARMER → Fait appel à DRIVER pour le transport
10. Tout le monde → Partage l'expérience sur ZirFeed
```

---

## Les Abonnements (Plans)

| Plan | Prix | Fonctionnalités débloquées |
|------|------|---------------------------|
| **FREE** | 0 TND | ZirPulse IA, Parcelles, Diagnostic, Services, Alerts, Feed, Marketplace |
| **STARTER** | Payant | Analytiques + Contrats + Boutique Intrants |
| **PRO** | Payant | Stock & Finances (ERP) + Diagnostics illimités |
| **BUSINESS** | Payant | API, Commandes groupées, GDD détaillé, CRM fournisseur |

L'abonnement est géré depuis `/dashboard/subscription/checkout` et chaque palier déverrouille des entrées de menu dans le tableau de bord.

---

## Chiffres Clés

- **11 rôles** interconnectés
- **6 sous-types d'experts** avec tableaux de bord distincts
- **3 sous-types d'agriculteurs** avec menus adaptés
- **102+ composants** tableaux de bord
- **20+ entités** dans le module ZirFeed
- **65+ endpoints** API pour le module expert
- **65 000+ lignes de code** frontend et backend combinés
- **3 plans d'abonnement** progressifs (5 en comptant les paliers intermédiaires)
- **5 types de réactions** sociales sur ZirFeed
- **7 types de publications** possibles
- **8 onglets** dans le réseau social
