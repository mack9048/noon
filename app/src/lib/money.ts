// Money in the institution's own currency (India and the GCC). Set once the user is known.
let currency = 'INR';
const SYMBOL: Record<string, string> = { INR: '₹', GBP: '£', USD: '$' };
/** Currencies with fils/baisa show three decimals when there is a fraction. */
const THREE = new Set(['KWD', 'OMR', 'BHD']);

export const setCurrency = (c?: string | null) => { currency = c || 'INR'; };
export const currencyCode = () => currency;
export const currencySymbol = (c = currency) => SYMBOL[c] ?? `${c} `;

/** ₹1,500 · AED 1,500 · KWD 12.500 */
export function money(n: number, c = currency) {
  const v = Number(n) || 0;
  const frac = Math.round(v) !== v;
  const digits = frac ? (THREE.has(c) ? 3 : 2) : 0;
  const s = v.toLocaleString(c === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${currencySymbol(c)}${s}`;
}

/** Countries an institution can be in: currency, phone code and time zone follow the country. */
export const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', dial_code: '+91', timezone: 'Asia/Kolkata' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', dial_code: '+971', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', dial_code: '+966', timezone: 'Asia/Riyadh' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', dial_code: '+974', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', dial_code: '+965', timezone: 'Asia/Kuwait' },
  { code: 'OM', name: 'Oman', currency: 'OMR', dial_code: '+968', timezone: 'Asia/Muscat' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', dial_code: '+973', timezone: 'Asia/Bahrain' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', dial_code: '+44', timezone: 'Europe/London' },
  { code: 'US', name: 'United States', currency: 'USD', dial_code: '+1', timezone: 'America/New_York' },
];
