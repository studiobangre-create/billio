export type PlanId     = 'solo' | 'business' | 'cabinet' | 'enterprise';
export type PlanStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'past_due';

export const SOLO_INVOICE_LIMIT = 10;

export const PLAN_ORDER: PlanId[] = ['solo', 'business', 'cabinet', 'enterprise'];

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
// Solo: basic DGI-compliant accounting + financial statements (non-certified).
// Business: full SYSCOHADA certification, unlimited invoicing, AI reminders.
// Cabinet: multi-entity, period closing, fixed assets.
// Enterprise: ERP integrations, unlimited team members.

export type Feature =
  | 'invoices_unlimited'    // Business+ (Solo capped at 10/month)
  | 'quotes'                // Business+
  | 'ai_reminders'          // Business+ (moved from Solo in new pricing)
  | 'payments_mobilemoney'  // Business+
  | 'accounting_syscohada'  // Business+ (Solo = DGI-compliant only, non-certified)
  | 'reports'               // Business+
  | 'team_members'          // Business+ (up to 3)
  | 'multi_entity'          // Cabinet+
  | 'period_closing'        // Cabinet+
  | 'fixed_assets'          // Cabinet+
  | 'role_access'           // Cabinet+
  | 'team_unlimited'        // Enterprise
  | 'erp_api';              // Enterprise

const FEATURE_MIN_PLAN: Record<Feature, PlanId> = {
  invoices_unlimited:   'business',
  quotes:               'business',
  payments_mobilemoney: 'business',
  accounting_syscohada: 'business',
  reports:              'business',
  team_members:         'business',
  ai_reminders:         'cabinet',
  multi_entity:         'cabinet',
  period_closing:       'cabinet',
  fixed_assets:         'cabinet',
  role_access:          'cabinet',
  team_unlimited:       'enterprise',
  erp_api:              'enterprise',
};

export function hasFeature(plan: PlanId, feature: Feature): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(FEATURE_MIN_PLAN[feature]);
}

export function minPlanForFeature(feature: Feature): PlanId {
  return FEATURE_MIN_PLAN[feature];
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export interface PlanDef {
  id:       PlanId;
  name:     string;
  tagline:  string;
  price:    number | null; // null = on-quote
  currency: string;
  ctaLabel: string;
  popular:  boolean;
  perks:    string[];
}

export const PLANS: PlanDef[] = [
  {
    id:       'solo',
    name:     'Solo',
    tagline:  'Pour facturer proprement et démarrer en douceur.',
    price:    0,
    currency: 'XOF',
    ctaLabel: 'Commencer gratuitement',
    popular:  false,
    perks: [
      "Jusqu'à 10 factures / mois",
      'Clients & produits',
      'Suivi TVA de base (non certifié)',
      'Comptabilité conforme DGI',
      'États financiers & contrôle fiscal',
    ],
  },
  {
    id:       'business',
    name:     'Business',
    tagline:  'Zéro stress à la clôture, serein face à la DGI.',
    price:    25_000,
    currency: 'XOF',
    ctaLabel: 'Essai 14 jours gratuit',
    popular:  true,
    perks: [
      'Comptabilité SYSCOHADA conforme',
      'Prêt pour un contrôle fiscal à tout moment',
      'États financiers & déclarations TVA',
      'Factures & devis illimités',
      "Jusqu'à 3 membres d'équipe",
      "Relance WhatsApp",
      "Relance par email"
    ],
  },
  {
    id:       'cabinet',
    name:     'Cabinet',
    tagline:  'Pour les cabinets, serein sur tous vos dossiers clients.',
    price:    45_000,
    currency: 'XOF',
    ctaLabel: 'Contacter les ventes',
    popular:  false,
    perks: [
      'Tout le plan Business',
      'Espace multi-entités',
      'Clôture de période',
      'Immobilisations',
      'Rappels de paiement IA',
      'Accès par rôles pour le staff',
      'Support prioritaire',
    ],
  },
  {
    id:       'enterprise',
    name:     'Enterprise',
    tagline:  'Déploiement sur-mesure pour grands comptes.',
    price:    null,
    currency: 'XOF',
    ctaLabel: 'Demander une démo',
    popular:  false,
    perks: [
      'Tout le plan Cabinet',
      'Intégration Odoo',
      'Integration Sage 100',
      'SLA garanti & support dédié',
      'Onboarding & formation sur site',
      "Membres d'équipe illimités",
    ],
  },
];

export const PLAN_LABELS: Record<PlanId, string> = {
  solo:       'Solo',
  business:   'Business',
  cabinet:    'Cabinet',
  enterprise: 'Enterprise',
};

const FMT = new Intl.NumberFormat('fr-FR');
export function formatPrice(price: number): string {
  return FMT.format(price);
}
