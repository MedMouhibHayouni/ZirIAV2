# ZirIA — Modules & Fonctionnalités des Experts

## 1. Acteurs de la Plateforme

La plateforme ZirIA connecte **11 rôles** autour de la boucle agricole tunisienne :

| Rôle | Description |
|------|-------------|
| **ADMIN** | Super-administrateur technique (AiKup Tech) |
| **FARMER** | Agriculteur autonome — parcelles GPS, diagnostic IA |
| **FARMER_AMBASSADOR** | Agriculteur ambassadeur terrain — rapports de terrain |
| **COOP_PRESIDENT** | Président de coopérative (SMSA) — jusqu'à 50+ membres |
| **B2B_BUYER** | Grossiste / exportateur |
| **SUPPLIER** | Fournisseur d'intrants et équipements |
| **DRIVER** | Chauffeur transport agricole |
| **WORKER** | Ouvrier saisonnier qualifié |
| **LAND_OWNER** | Propriétaire foncier — publie offres vente/location |
| **EQUIP_OWNER** | Propriétaire d'équipement agricole |
| **EXPERT** | Expert CRDA/privé — valide les diagnostics IA, consulte, suit les exploitations |

---

## 2. Les 6 Types d'Experts

Chaque expert appartient à **un seul type** (défini à la création du profil) et hérite d'un tableau de bord spécifique avec des fonctionnalités propres.

### 2.1 Phytopathologiste
**Rôle** : Diagnostic et traitement des maladies des cultures (fongiques, bactériennes, virales)

**Fonctionnalités exclusives :**
- **File de triage IA** — Valide/invalide les diagnostics automatiques soumis par les agriculteurs. Pour chaque cas, il voit la photo, la maladie suspectée par l'IA, le score de confiance. Il doit remplir une nomenclature trilingue (français, arabe, latin) et peut ajouter des observations + envoyer une prescription rapide
- **Heatmap des maladies** — Carte interactive Leaflet de la Tunisie avec clusters de détection par maladie, filtrage par nom de maladie et score de confiance minimal
- **Alerte phytosanitaire** — Crée et diffuse des alertes régionales (bulletin) aux agriculteurs dans un rayon donné (1–50 km) autour d'un point GPS, avec notification push

**Fonctionnalités partagées :**
- Prescriptions agronomiques (création, auto-suggestion par nom de maladie, historique)
- Rapports de synthèse agronomique
- Dashboard overview avec triage urgent + top maladies de la semaine

---

### 2.2 Agronome
**Rôle** : Optimisation des cultures, fertilisation, gestion des sols

**Fonctionnalités exclusives :**
- **Analyses de sol** — Liste et gestion des analyses : pH (code couleur), N/P/K en ppm, matière organique %, conductivité électrique. Graphiques à barres colorées. Création de nouvelle analyse
- **Cahiers de culture** — Suivi des journaux de culture par agriculteur : saison, type de culture, dates semis/récolte, rendement kg/ha, fertilisants, pesticides, observations, recommandations
- **Calculateur NPK** — Calculateur rapide d'apport N/P/K : culture + superficie + pH → recommandation kg/ha avec alertes pH

**Fonctionnalités partagées :**
- Prescriptions agronomiques
- Dashboard overview avec analyses de sol hors norme + dernières analyses + calculateur NPK express

---

### 2.3 Ingénieur Hydraulique
**Rôle** : Conception et suivi des systèmes d'irrigation et drainage

**Fonctionnalités exclusives :**
- **Projets d'irrigation** — Gestion des projets (création, suivi) : nom, superficie, agriculteur, type d'irrigation, statut (DESIGN/INSTALLATION/COMPLETED), dates
- **Calculateur ETc** — Calcul des besoins en eau : culture + stade (INITIAL/MI_SAISON/FIN) + gouvernorat + superficie → ETo, Kc, ETc en mm/j et m³/ha/j, fréquence d'irrigation recommandée. Sauvegarde avec lien agriculteur optionnel. Export/impression
- **Calculs hydriques** — Historique des calculs ETc sauvegardés

**Fonctionnalités partagées :**
- Dashboard overview avec projets retardés + projets en cours + calculateur ETc express

---

### 2.4 Hydrogéologue
**Rôle** : Prospection et gestion des eaux souterraines, suivi des nappes phréatiques

**Fonctionnalités exclusives :**
- **Carte des puits** — Liste des puits suivis : statut, profondeur, niveau d'eau, salinité. Création de nouveau puits (agriculteur, nom, profondeur, type, coordonnées). Ajout de relevés (niveau, salinité, notes)
- **Piézométrie** — Graphiques Chart.js double courbe : niveau d'eau dans le temps + salinité dans le temps. Sélecteur de puits avec niveau/salinité actuels. Badges d'alerte salinité (> 3 g/L)
- **Projets hydriques** — Gestion des projets d'eau

**Fonctionnalités partagées :**
- Dashboard overview avec puits en anomalie + tableau de bord nappe + relevés récents

---

### 2.5 Spécialiste Élevage (Zootechnicien)
**Rôle** : Nutrition animale, gestion des troupeaux, reproduction

**Fonctionnalités exclusives :**
- **Fiches d'élevage** — Gestion des fiches par exploitation : espèce, race, effectif, production laitière quotidienne, taux de natalité/mortalité, programme alimentaire, alerte de performance. Filtre par espèce. Création de nouvelle fiche
- **Calculateur de rations** — Calcul UFL/PDIN/PDIE : espèce + stade physiologique + effectif. Résultats avec exemple de ration type
- **Calendrier de reproduction** — Inséminations planifiées, gestations actives, naissances imminentes (30 jours). Tableau : animal, espèce, date insémination, statut gestation, date naissance prévue. Actions : confirmer gestation, marquer naissance
- **Référentiel INRA** — Normes nutritionnelles animales par espèce et stade

**Fonctionnalités partagées :**
- Dashboard overview avec troupeaux sous-performants + fiches sous attention + calculateur de rations express

---

### 2.6 Vétérinaire Épidémiologiste
**Rôle** : Santé animale, prophylaxie, vaccinations, vigilance sanitaire

**Fonctionnalités exclusives :**
- **Dossiers cliniques** — Gestion des dossiers vétérinaires : animal, espèce, symptômes, diagnostic, traitement prescrit, plan de suivi. Statut OUVERT/RÉSOLU. Création et mise à jour
- **Suivi vaccination** — Calendrier vaccinal : vaccin, espèce, agriculteur, date, date de rappel, lot, notes. Filtres par espèce et statut (imminent/à jour). Cartes avec style urgent pour rappels
- **Carte de quarantaine** — Carte Leaflet avec création de zones de quarantaine cliquables : titre, maladie suspectée, rayon (100–20000m), instructions sanitaires. Liste des zones actives avec suppression et diffusion d'alerte aux agriculteurs dans la zone
- **Alertes sanitaires** — Diffusion d'alertes sanitaires régionales (identique aux alertes phyto)

**Fonctionnalités partagées :**
- Dashboard overview avec actions prioritaires (vaccinations + consultations) + file d'attente des consultations
- Alertes sanitaires (broadcast)

---

## 3. Fonctionnalités Communes à TOUS les Experts

Ces fonctionnalités sont disponibles pour les 6 types d'experts, avec parfois des adaptations par type.

### 3.1 Vue d'Ensemble (Dashboard)
Page d'accueil du tableau de bord. Affiche :
- **KPIs** : nombre de cas en attente, validations, agriculteurs liés, consultations
- **Actions prioritaires** : adaptées au type d'expert (triage urgent, analyses hors norme, projets retardés, puits en anomalie, troupeaux sous-performants, rappels vaccins)
- **Calculateurs rapides** : NPK (Agronome), ETc (Hydraulique), Rations (Zootechnicien)
- **File d'attente consultations** : dernières consultations en attente

### 3.2 Gestion des Agriculteurs
- **Mes agriculteurs** : liste des agriculteurs liés (relation ACCEPTED) avec recherche/filtre par gouvernorat
- **Chips contextuelles** : chaque carte d'agriculteur affiche des infos propres au type d'expert (dernière analyse sol, nombre de projets irrigation, puits suivis, taille troupeau, rappels vaccins)
- **Dossier complet** : panneau coulissant avec parcelles, diagnostics, consultations, prescriptions de l'agriculteur
- **Demandes en attente** : gestion des demandes de liaison entrantes
- **Trouver un confrère** : modal de recherche d'autres experts par type/gouvernorat avec messagerie directe
- **Envoyer une demande de liaison** à un agriculteur non lié

### 3.3 Consultations (Cœur de Revenu)
Processus complet de consultation rémunérée :
- **File d'attente** : consultations OPEN, classées par type d'expert
- **Acceptation** : l'expert accepte une consultation (OPEN → IN_PROGRESS)
- **Réponse** : l'expert rédige sa réponse et la soumet (IN_PROGRESS → COMPLETED)
- **Demande d'infos complémentaires** : l'expert peut demander des documents/photos supplémentaires à l'agriculteur
- **Suggestions IA contextuelles** : pour chaque type de consultation, l'IA propose des éléments de réponse pré-rédigés (diagnostic, fertilisation, irrigation, eau souterraine, nutrition animale, prophylaxie)
- **Gains** : affichage des montants, commission plateforme, montant net
- **Statuts** : OPEN → IN_PROGRESS → COMPLETED / CANCELLED / AWAITING_INFO

### 3.4 Messagerie Temps Réel
- **WebSocket Socket.IO** (namespace `expert-dashboard`) pour les messages en temps réel
- **Liste de conversations** avec tabs (Tous, Agriculteurs, Experts)
- **Recherche** par nom/gouvernorat
- **Badges de messages non lus** (dans la sidebar aussi)
- **Chat complet** : bulles, timestamps, accusés de réception (envoyé/lu), séparateurs de date
- **Pièces jointes** : images (prévisualisation + lightbox), documents PDF/docs (téléchargement)
- **Appels** : boutons appel/vidéo (UI uniquement, fonctionnalité à venir)
- **Deep linking** : ouvre directement une conversation via query params

### 3.5 Revenus (Dashboard Financier)
- **KPIs** : gains nets totaux, montant brut facturé, commission plateforme, consultations complétées
- **Tarif** : affichage et édition en ligne du taux de consultation (TND) — verrouillé à 0 si statut exclusif CRDA_AGENT
- **Note moyenne** : évaluation des agriculteurs (1–5 étoiles)
- **Tableau mensuel** : mois, nombre de consultations, brut, commission, net, tendance, total cumulé
- **Transactions récentes** : liste des dernières consultations payées
- **Commissions prescriptions** : achats effectués via les prescriptions de l'expert — montant, commission %, gains (Phase 5)

### 3.6 Profil Expert
- **Photo de profil** : upload avec aperçu (FileReader base64)
- **Informations personnelles** : nom, téléphone, email, gouvernorat/délégation, langue
- **Informations professionnelles** : bio, spécialité, statut professionnel (multi-sélection), affiliation, institution, consultations à distance
- **Zones d'intervention** : sélection par chips des gouvernorats
- **Certifications** : chips prédéfinies + certification personnalisée
- **Tarifs** : taux de consultation (TND) avec note explicative
- **Mot de passe** : changement avec validation (6 caractères min, confirmation)

### 3.7 Profil Public
Page publique visible sans authentification :
- Carte héros avec avatar, nom, badge type, score
- Statistiques : consultations complétées, note, temps de réponse, satisfaction
- Bio, certifications, statuts, zones d'intervention
- Bouton de demande de contact

### 3.8 Données de Référence Partagées
- **Coefficients Kc FAO** : par type de culture (blé, tomate, olive, vigne, palmier, etc.)
- **Normes nutritionnelles INRA/INRAT** : par espèce animale et stade physiologique
- **Types de vaccins** : par espèce avec méthode d'injection, âge, intervalle
- **Risques saisonniers** : par culture et mois avec niveau de risque
- **Règles de prescription** : maladie → produit autorisé, dosage, méthode, délai avant récolte
- **Zones CRDA** : découpage régional CRDA de la Tunisie
- **Limites des gouvernorats** : données PostGIS des frontières tunisiennes
- **Centroïdes des gouvernorats** : coordonnées GPS

---

## 4. Architecture par Dashboard — Mapping Parcours Expert

### 4.1 Parcours Phytopathologiste
```
Vue d'ensemble → KPIs + triage urgent + top maladies
    ├── Triage IA → File d'attente → Valider/Invalider + nomenclature trilingue → Prescription rapide
    ├── Heatmap → Carte maladies + filtres
    ├── Mes Agriculteurs → Liste + dossier complet
    ├── Alertes & Bulletins → Création alerte + historique + diffusion
    ├── Prescriptions → Création + historique + auto-suggestions
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

### 4.2 Parcours Agronome
```
Vue d'ensemble → KPIs + analyses hors norme + dernieres analyses + NPK express
    ├── Mes Agriculteurs → Liste + dossier + chips analyses sol
    ├── Cahiers de Culture → Création + suivi par agriculteur
    ├── Analyses de Sol → Liste + KPIs + création
    ├── Prescriptions → Création + historique
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

### 4.3 Parcours Ingénieur Hydraulique
```
Vue d'ensemble → KPIs + projets retardés + projets en cours + ETc express
    ├── Mes Agriculteurs → Liste + dossier + chips projets irrigation
    ├── Projets Irrigation → Création + suivi
    ├── Calcul ETc → Calculateur + sauvegarde + historique
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

### 4.4 Parcours Hydrogéologue
```
Vue d'ensemble → KPIs + puits en anomalie + tableau nappe + relevés
    ├── Mes Agriculteurs → Liste + dossier + chips puits suivis
    ├── Carte des Puits → Liste + création + relevés
    ├── Piézométrie → Graphiques niveau + salinité
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

### 4.5 Parcours Spécialiste Élevage
```
Vue d'ensemble → KPIs + troupeaux sous-performants + fiches + rations express
    ├── Mes Agriculteurs → Liste + dossier + chips troupeau
    ├── Mes Élevages → Fiches par espèce + création + alertes
    ├── Rations & Nutrition → Calculateur UFL/PDIN/PDIE
    ├── Calendrier Repro → Inséminations + gestations + naissances
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

### 4.6 Parcours Vétérinaire Épidémiologiste
```
Vue d'ensemble → KPIs + actions prioritaires (vaccins + consultations)
    ├── Mes Agriculteurs → Liste + dossier + chips rappels vaccins
    ├── Dossiers Cliniques → Création + suivi statut
    ├── Vaccinations → Calendrier + création + rappels
    ├── Carte Quarantaine → Zones cliquables + diffusion alerte
    ├── Alertes Sanitaires → Création + historique
    ├── Consultations → File attente → Accepter → Répondre → Paiement
    ├── Messages → Conversations temps réel
    ├── Revenus → KPIs + historique + commissions
    └── Mon Profil → Gestion complète
```

---

## 5. Interactions entre Acteurs

### Expert ↔ Agriculteur (FARMER)
- L'agriculteur soumet un diagnostic IA → l'expert le valide ou le corrige
- L'agriculteur demande une consultation payante → l'expert l'accepte et répond
- L'agriculteur accepte une demande de liaison → l'expert suit son exploitation
- L'expert rédige des prescriptions → l'agriculteur les reçoit et peut acheter les produits
- L'expert diffuse une alerte → les agriculteurs dans la zone sont notifiés
- Messagerie directe temps réel entre les deux

### Expert ↔ Ambassadeur
- L'ambassadeur soumet des rapports de terrain visibles par les experts
- L'ambassadeur réfère des agriculteurs vers les experts

### Expert ↔ Fournisseur (SUPPLIER)
- L'expert peut créer une convention de commission avec un fournisseur
- Quand un agriculteur achète un produit via une prescription, le fournisseur reverse une commission à l'expert

### Expert ↔ Admin
- L'admin crée/gère les comptes experts
- L'admin supervise l'activité des experts sur la plateforme

### Expert ↔ Expert (Confrère)
- Recherche d'autres experts par type et gouvernorat
- Messagerie directe entre experts
- Consultation de profil public

---

## 6. Règles Métier Clés

- **Statut CRDA exclusif** : taux de consultation forcé à 0 TND, pas de revenu privé. Si l'expert a aussi un statut LIBERAL, il peut fixer son tarif
- **Validation obligatoire** : un expert ne peut pas utiliser le dashboard tant que son profil n'est pas complété (type, statut, bio, certifications)
- **Commission plateforme** : chaque consultation payante génère une commission (pourcentage configurable) prélevée sur le montant versé à l'expert
- **Suggestion IA** : avant de répondre à une consultation, l'expert reçoit des suggestions automatiques générées par l'IA en fonction du type de consultation
- **Nomenclature trilingue** : pour valider un diagnostic IA, le phytopathologiste doit fournir le nom de la maladie en français, arabe et latin
- **Notification push** : les alertes phytosanitaires et les nouvelles consultations génèrent des notifications aux agriculteurs concernés
