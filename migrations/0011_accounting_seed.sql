-- ============================================================
-- Billio — Accounting seed data (SYSCOHADA Système Normal)
-- Safe to re-run: uses INSERT … ON CONFLICT DO NOTHING
-- Depends on: 0010_accounting_schema.sql
-- ============================================================


-- ------------------------------------------------------------
-- 1. Account classes  (SYSCOHADA classes 1–9)
-- ------------------------------------------------------------

insert into public.account_classes (id, name, short, nature, color) values
  (1, 'Ressources durables',                    'Financement',     'C', '#7C3AED'),
  (2, 'Actif immobilisé',                        'Immobilisations', 'D', '#0369A1'),
  (3, 'Stocks',                                  'Stocks',          'D', '#0891B2'),
  (4, 'Comptes de tiers',                        'Tiers',           'M', '#059669'),
  (5, 'Trésorerie',                              'Trésorerie',      'D', '#2563EB'),
  (6, 'Charges des activités ordinaires',        'Charges',         'D', '#DC2626'),
  (7, 'Produits des activités ordinaires',       'Produits',        'C', '#16A34A'),
  (8, 'Autres charges et produits (HAO)',         'HAO',             'M', '#9333EA'),
  (9, 'Engagements et comptabilité analytique',  'Analytique',      'M', '#EA580C')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Standard chart of accounts (SYSCOHADA Système Normal)
--    org_id IS NULL → shared reference, no per-org ownership
-- ------------------------------------------------------------

insert into public.accounts (num, label, nature, class_id) values
  -- Classe 1 · Ressources durables
  ('101',   'Capital social',                                      'C', 1),
  ('104',   'Primes liées au capital social',                      'C', 1),
  ('106',   'Réserves',                                            'C', 1),
  ('110',   'Report à nouveau créditeur',                          'C', 1),
  ('119',   'Report à nouveau débiteur',                           'D', 1),
  ('130',   'Résultat net de l''exercice — bénéfice',             'C', 1),
  ('139',   'Résultat net de l''exercice — perte',                'D', 1),
  ('162',   'Emprunts auprès des établissements de crédit',        'C', 1),
  ('163',   'Emprunts obligataires',                               'C', 1),
  ('181',   'Dettes de location-financement',                      'C', 1),

  -- Classe 2 · Actif immobilisé
  ('211',   'Frais de développement immobilisés',                  'D', 2),
  ('212',   'Brevets, licences, logiciels',                        'D', 2),
  ('213',   'Fonds commercial',                                    'D', 2),
  ('221',   'Terrains',                                            'D', 2),
  ('222',   'Terrains bâtis',                                      'D', 2),
  ('231',   'Bâtiments',                                           'D', 2),
  ('2341',  'Matériel industriel',                                 'D', 2),
  ('2441',  'Matériel de bureau',                                  'D', 2),
  ('2451',  'Matériel de transport',                               'D', 2),
  ('281',   'Amortissements des immobilisations incorporelles',    'C', 2),
  ('2818',  'Amortissements du matériel',                          'C', 2),

  -- Classe 3 · Stocks
  ('301',   'Marchandises',                                        'D', 3),
  ('311',   'Matières premières et fournitures liées',             'D', 3),
  ('321',   'Matières consommables',                               'D', 3),
  ('341',   'Produits en cours',                                   'D', 3),
  ('351',   'Produits intermédiaires',                             'D', 3),
  ('361',   'Produits finis',                                      'D', 3),

  -- Classe 4 · Comptes de tiers
  ('401',   'Fournisseurs',                                        'C', 4),
  ('402',   'Fournisseurs, effets à payer',                        'C', 4),
  ('408',   'Fournisseurs, factures non parvenues',                'C', 4),
  ('409',   'Fournisseurs débiteurs (avances, acomptes)',          'D', 4),
  ('411',   'Clients',                                             'D', 4),
  ('412',   'Clients, effets à recevoir',                          'D', 4),
  ('418',   'Clients, produits non encore facturés',               'D', 4),
  ('419',   'Clients créditeurs (avances, acomptes)',              'C', 4),
  ('421',   'Personnel, rémunérations dues',                       'C', 4),
  ('422',   'Personnel, avances et acomptes',                      'D', 4),
  ('431',   'Sécurité sociale (CNSS)',                             'C', 4),
  ('434',   'Impôt sur le revenu des personnes physiques (IUTS)',  'C', 4),
  ('441',   'État, impôts et taxes recouvrables',                  'D', 4),
  ('442',   'État, impôts et taxes à payer',                       'C', 4),
  ('443',   'État, TVA facturée (collectée)',                      'C', 4),
  ('4441',  'État, TVA due (à reverser)',                          'C', 4),
  ('445',   'État, TVA récupérable (déductible)',                  'D', 4),
  ('447',   'État, autres impôts et taxes',                        'C', 4),
  ('451',   'Groupe, comptes courants',                            'C', 4),
  ('471',   'Débiteurs divers',                                    'D', 4),
  ('481',   'Charges constatées d''avance',                        'D', 4),
  ('491',   'Dépréciation des comptes clients',                    'C', 4),

  -- Classe 5 · Trésorerie
  ('511',   'Valeurs à l''encaissement',                           'D', 5),
  ('521',   'Banques',                                             'D', 5),
  ('531',   'Chèques postaux',                                     'D', 5),
  ('551',   'Instruments de monnaie électronique (Wave / MoMo)',   'D', 5),
  ('571',   'Caisse',                                              'D', 5),
  ('591',   'Dépréciation des titres de placement',                'C', 5),

  -- Classe 6 · Charges
  ('601',   'Achats de marchandises',                              'D', 6),
  ('602',   'Achats de matières premières',                        'D', 6),
  ('605',   'Autres achats',                                       'D', 6),
  ('608',   'Achats, frais accessoires',                           'D', 6),
  ('611',   'Transports sur achats',                               'D', 6),
  ('621',   'Sous-traitance générale',                             'D', 6),
  ('622',   'Locations et charges locatives',                      'D', 6),
  ('623',   'Redevances de crédit-bail',                           'D', 6),
  ('624',   'Entretien, réparations et maintenance',               'D', 6),
  ('625',   'Primes d''assurance',                                 'D', 6),
  ('626',   'Études, recherches et documentation',                 'D', 6),
  ('627',   'Publicité, publications, relations publiques',        'D', 6),
  ('628',   'Frais de télécommunications',                         'D', 6),
  ('629',   'Services bancaires et charges assimilées',            'D', 6),
  ('631',   'Frais de personnel temporaire',                       'D', 6),
  ('641',   'Impôts et taxes directs',                             'D', 6),
  ('642',   'Droits d''enregistrement et de timbre',               'D', 6),
  ('661',   'Rémunérations directes versées au personnel',         'D', 6),
  ('664',   'Charges sociales patronales',                         'D', 6),
  ('671',   'Intérêts des emprunts et dettes financières',         'D', 6),
  ('681',   'Dotations aux amortissements d''exploitation',        'D', 6),
  ('691',   'Dotations aux dépréciations d''exploitation',         'D', 6),

  -- Classe 7 · Produits
  ('701',   'Ventes de marchandises',                              'C', 7),
  ('702',   'Ventes de produits finis',                            'C', 7),
  ('706',   'Services vendus (honoraires, commissions)',           'C', 7),
  ('707',   'Produits accessoires',                                'C', 7),
  ('721',   'Production immobilisée',                              'C', 7),
  ('731',   'Variation des stocks de produits finis',              'C', 7),
  ('771',   'Revenus des créances',                                'C', 7),
  ('781',   'Reprises d''amortissements',                          'C', 7),

  -- Classe 8 · HAO
  ('81',    'Valeurs comptables des cessions d''immobilisations',  'D', 8),
  ('82',    'Produits des cessions d''immobilisations',            'C', 8),
  ('83',    'Charges HAO décaissées',                              'D', 8),
  ('84',    'Produits HAO encaissés',                              'C', 8),
  ('85',    'Dotations HAO',                                       'D', 8),
  ('86',    'Reprises HAO',                                        'C', 8),
  ('87',    'Participation des travailleurs',                      'D', 8),
  ('88',    'Subventions d''équilibre',                            'C', 8),
  ('89',    'Impôt sur le résultat',                               'D', 8)
on conflict (num) do nothing;


-- ------------------------------------------------------------
-- 3. Helper: provision default accounting data for a new org
--    Call once per org after creation.
--    Usage: SELECT public.seed_org_accounting('<org_uuid>', 2026);
-- ------------------------------------------------------------

create or replace function public.seed_org_accounting(
  p_org_id      uuid,
  p_exercise_year int default date_part('year', now())::int
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m int;
begin
  -- 3a. Default journals (SYSCOHADA Système Normal)
  insert into public.journals (org_id, code, name, color) values
    (p_org_id, 'VE', 'Ventes',              '#16A34A'),
    (p_org_id, 'AC', 'Achats',              '#DC2626'),
    (p_org_id, 'BQ', 'Banque',              '#2563EB'),
    (p_org_id, 'CA', 'Caisse',              '#F59E0B'),
    (p_org_id, 'OD', 'Opérations diverses', '#7C3AED')
  on conflict (org_id, code) do nothing;

  -- 3b. Twelve fiscal periods for the requested exercise year
  for m in 1..12 loop
    insert into public.fiscal_periods (org_id, year, month, status)
    values (
      p_org_id,
      p_exercise_year,
      m,
      case when m < date_part('month', now()) then 'closed' else 'open' end
    )
    on conflict (org_id, year, month) do nothing;
  end loop;
end;
$$;

comment on function public.seed_org_accounting is
  'Creates the 5 standard SYSCOHADA journals and 12 fiscal periods for a new org. '
  'Call once after org creation, or when the accounting module is first enabled.';
