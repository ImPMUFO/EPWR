const TROOP_TYPES = {
  spear: { name: '🛡 نیزه‌دار', power: 2, cost: 30 },
  archer: { name: '🏹 کماندار', power: 3, cost: 50 },
  knight: { name: '🐴 شوالیه', power: 5, cost: 100 },
  catapult: { name: '🎯 منجنیق', power: 8, cost: 200 }
};

function troopsCount(troopsData) {
  return Object.values(troopsData || {}).reduce((a, b) => a + b, 0);
}

function troopsText(troopsData) {
  const parts = [];
  for (const [k, v] of Object.entries(troopsData || {})) if (v > 0) parts.push(`${TROOP_TYPES[k].name}×${v}`);
  return parts.join(' ') || '—';
}

// قدرت سرباز خاص هر قهرمان (متفاوت + ضربدر سطح سرباز)
function heroTroopsPower(hero) {
  const per = (hero.template && hero.template.troop_power) || 2;
  const lvl = hero.troop_level || 1;
  return per * lvl * troopsCount(hero.troops_data);
}

// حداکثر سرباز بر اساس لول قهرمان
function heroMaxTroops(hero) {
  return (hero.level || 1) * ((hero.template && hero.template.troops_per_level) || 2);
}

module.exports = { TROOP_TYPES, troopsCount, troopsText, heroTroopsPower, heroMaxTroops };