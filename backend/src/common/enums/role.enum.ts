/**
 * ZirIA Sentinel V1.0 — Énumération des rôles RBAC du système
 * 11 rôles couvrant l'ensemble de la boucle économique agricole.
 */
export enum Role {
  // ─── Rôles d'administration ───────────────────────────────────────────────
  /** Superviseur global AiKup Tech */
  ADMIN = 'ADMIN',

  // ─── Rôles de production agricole ────────────────────────────────────────
  /** Agriculteur autonome avec parcelles GPS, GDD et diagnostic IA */
  FARMER = 'FARMER',
  /** Agriculteur connecté / Capteur terrain IA (rétrocompatible) */
  FARMER_AMBASSADOR = 'FARMER_AMBASSADOR',
  /** Président de coopérative SMSA (gérant 50+ membres) */
  COOP_PRESIDENT = 'COOP_PRESIDENT',

  // ─── Rôles de commerce et logistique ─────────────────────────────────────
  /** Grossiste / Exportateur B2B */
  B2B_BUYER = 'B2B_BUYER',
  /** Fournisseur d'intrants et d'équipements */
  SUPPLIER = 'SUPPLIER',
  /** Chauffeur de transport agricole (B2B) */
  DRIVER = 'DRIVER',

  // ─── Rôles de main-d'œuvre ───────────────────────────────────────────────
  /** Travailleur saisonnier qualifié avec profil de compétences */
  WORKER = 'WORKER',
  /** Travailleur saisonnier (rétrocompatible) */
  AGRI_WORKER = 'AGRI_WORKER',

  // ─── Rôles fonciers et expertise ─────────────────────────────────────────
  /** Propriétaire foncier publiant des offres de vente/location de terres */
  LAND_OWNER = 'LAND_OWNER',
  /** Propriétaire de matériel agricole */
  EQUIP_OWNER = 'EQUIP_OWNER',
  /** Expert agronome CRDA validant les diagnostics IA douteux */
  EXPERT = 'EXPERT',
  /** Institution publique / organisme de tutelle (APIA, CRDA) */
  INSTITUTION = 'INSTITUTION',
}
