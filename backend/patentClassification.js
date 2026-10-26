// Shared classification helpers used by both the Published patents and
// Patent filed tabs.

// Confirmed by hand against the client folder structure — anything not
// listed here shows up as "Unclassified" instead of being guessed.
const MAHE_PREFIXES = [
  'AR', 'BR', 'CD', 'CH', 'DA', 'DH', 'HK', 'HP', 'KM', 'MA', 'MB', 'MCODS',
  'MK', 'MN', 'MP', 'MS', 'MT', 'PH', 'SP', 'AP', 'LT', 'MI', 'DST',
];
const NON_MAHE_PREFIXES = [
  'AAIS', 'CC', 'CMRIT', 'DSU', 'M', 'P', 'PRS', 'RV', 'SCEM', 'SJEC', 'SM',
  'WP', 'NK', 'WTMS', 'YIT',
];

function classifyMahe(code) {
  const match = String(code || '').trim().match(/^[A-Za-z_]+/);
  const prefix = match ? match[0].toUpperCase() : '';
  if (MAHE_PREFIXES.includes(prefix)) return 'MAHE';
  if (NON_MAHE_PREFIXES.includes(prefix)) return 'Non-MAHE';
  return 'Unclassified';
}

// The LR Sheet lists institutions as "1. Foo, 2. Bar" with the numbering
// and each entry often wrapped across several lines. This flattens it to
// one line, splits on the numbering, dedupes repeats, and joins with " / ".
function cleanInstitution(raw) {
  if (!raw) return '';
  const flat = String(raw).replace(/[\r\n]+/g, ' ').trim();
  const pieces = flat
    .split(/\d+\s*\.\s*/)
    .map((s) => s.trim().replace(/\s+/g, ' ').replace(/,\s*$/, ''))
    .filter(Boolean);
  const list = pieces.length > 0 ? pieces : [flat];

  const seen = new Set();
  const deduped = [];
  list.forEach((p) => {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  });
  return deduped.join(' / ');
}

module.exports = { classifyMahe, cleanInstitution, MAHE_PREFIXES, NON_MAHE_PREFIXES };
