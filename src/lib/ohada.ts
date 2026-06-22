export interface OhadaCountry {
  name: string;
  code: string;
  currency: string;
  fiscalIdLabel: string;
  fiscalIdPlaceholder: string;
  isOhadaMember: boolean;
}

export const OHADA_COUNTRIES: OhadaCountry[] = [
  { name: 'Bénin',                           code: 'BJ', currency: 'XOF', fiscalIdLabel: 'IFU',   fiscalIdPlaceholder: '1234567890001',  isOhadaMember: true  },
  { name: 'Burkina Faso',                    code: 'BF', currency: 'XOF', fiscalIdLabel: 'IFU',   fiscalIdPlaceholder: '00012345 B',     isOhadaMember: true  },
  { name: 'Cameroun',                        code: 'CM', currency: 'XAF', fiscalIdLabel: 'NIU',   fiscalIdPlaceholder: 'M012345678901R', isOhadaMember: true  },
  { name: 'Centrafrique',                    code: 'CF', currency: 'XAF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Comores',                         code: 'KM', currency: 'KMF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Congo',                           code: 'CG', currency: 'XAF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: "Côte d'Ivoire",                  code: 'CI', currency: 'XOF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '0123456789',     isOhadaMember: true  },
  { name: 'Gabon',                           code: 'GA', currency: 'XAF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Guinée',                          code: 'GN', currency: 'GNF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Guinée-Bissau',                  code: 'GW', currency: 'XOF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Guinée équatoriale',             code: 'GQ', currency: 'XAF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Mali',                            code: 'ML', currency: 'XOF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '0001234567',     isOhadaMember: true  },
  { name: 'Niger',                           code: 'NE', currency: 'XOF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'République démocratique du Congo', code: 'CD', currency: 'CDF', fiscalIdLabel: 'NIF', fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Sénégal',                         code: 'SN', currency: 'XOF', fiscalIdLabel: 'NINEA', fiscalIdPlaceholder: '0123456789123', isOhadaMember: true  },
  { name: 'Tchad',                           code: 'TD', currency: 'XAF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '',               isOhadaMember: true  },
  { name: 'Togo',                            code: 'TG', currency: 'XOF', fiscalIdLabel: 'NIF',   fiscalIdPlaceholder: '1234567890',     isOhadaMember: true  },
  { name: 'Ghana',                           code: 'GH', currency: 'GHS', fiscalIdLabel: 'TIN',   fiscalIdPlaceholder: 'C0000000000',    isOhadaMember: false },
  { name: 'Nigeria',                         code: 'NG', currency: 'NGN', fiscalIdLabel: 'TIN',   fiscalIdPlaceholder: '12345678-0001',  isOhadaMember: false },
];

export function getFiscalIdLabel(country?: string): string {
  if (!country) return 'IFU';
  const found = OHADA_COUNTRIES.find(c => c.name === country);
  return found?.fiscalIdLabel ?? 'Identifiant fiscal';
}

export function getFiscalIdPlaceholder(country?: string): string {
  if (!country) return '';
  const found = OHADA_COUNTRIES.find(c => c.name === country);
  return found?.fiscalIdPlaceholder ?? '';
}

export const OHADA_COUNTRY_NAMES: string[] = OHADA_COUNTRIES
  .filter(c => c.isOhadaMember)
  .map(c => c.name);

export const ALL_COUNTRY_NAMES: string[] = OHADA_COUNTRIES.map(c => c.name);
