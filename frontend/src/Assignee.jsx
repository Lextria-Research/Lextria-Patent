const AVATAR_COLORS = [
  '#3A86FF', '#C98A2C', '#4E9E56', '#C23B2E',
  '#8A63D2', '#2BA6A6', '#D1668A', '#5B7FDB',
];

// Fixed colors for known drafters so nobody's color shifts if the team
// grows later — a name not listed here falls back to the old hash pick.
const NAME_COLORS = {
  'Abhishek': '#3A86FF',
  'Amith': '#C98A2C',
  'Anusha': '#4E9E56',
  'Ayush': '#C23B2E',
  'Fiona': '#8A63D2',
  'Paralegal': '#2BA6A6',
  'pranav bhat': '#D1668A',
  'Pramith': '#5B7FDB',
  'Pratham': '#7A8C23',
  'Thanush': '#5C7A8A',
  'Thilak': '#A6467D',
};

function colorFor(name) {
  if (NAME_COLORS[name]) return NAME_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Picks readable text color for a given fill, same idea Sheets uses for
// its colored dropdown chips.
function textColorFor(bgHex) {
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1a1a1a' : '#ffffff';
}

function Assignee({ name }) {
  if (!name) return <span className="assignee-empty">—</span>;
  const bg = colorFor(name);
  return (
    <span className="assignee-pill" style={{ background: bg, color: textColorFor(bg) }}>
      {name}
    </span>
  );
}

export default Assignee;
