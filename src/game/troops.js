const TROOP_TYPES = {
  spear: { name: '🛡 نیزه‌دار', power: 2, cost: 30 },
  archer: { name: '🏹 کماندار', power: 3, cost: 50 },
  knight: { name: '🐴 شوالیه', power: 5, cost: 100 },
  catapult: { name: '🎯 منجنیق', power: 8, cost: 200 }
};

function troopsPower(troopsData) {
  let p = 0;
  for (const [k, v] of Object.entries(troopsData || {})) {
    p += (TROOP_TYPES[k]?.power || 0) * v;
  }
  return p;
}

function troopsCount(troopsData) {
  return Object.values(troopsData || {}).reduce((a, b) => a + b, 0);
}

function troopsText(troopsData) {
  const parts = [];
  for (const [k, v] of Object.entries(troopsData || {})) {
    if (v > 0) parts.push(`${TROOP_TYPES[k].name}×${v}`);
  }
  return parts.join(' ') || '—';
}

module.exports = { TROOP_TYPES, troopsPower, troopsCount, troopsText };