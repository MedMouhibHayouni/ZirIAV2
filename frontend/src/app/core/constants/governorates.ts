/**
 * Liste canonique unique des 24 gouvernorats tunisiens (Fix 5 — Phase 3).
 * Source de vérité partagée : register, worker-profile et tout autre
 * formulaire doivent importer cette constante au lieu de dupliquer la liste.
 * Une seule valeur sélectionnable côté formulaires (pas de multi-select).
 */
export const TUNISIA_GOVERNORATES: readonly string[] = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir',
  'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];
