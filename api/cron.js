const { getSupabase } = require('../src/core/supabase');
const { processKitchenProduction } = require('../src/game/buildings');

// ═══ هر دقیقه توسط Vercel صدا زده میشه ═══
module.exports = async (req, res) => {
  const start = Date.now();
  try {
    const db = getSupabase();
    const { data: players } = await db.from('players').select('telegram_id');
    let n = 0;
    for (const p of players || []) {
      if (Date.now() - start > 8000) break; // نمیره توی محدودیت زمانی serverless
      await processKitchenProduction(p.telegram_id);
      n++;
    }
    res.status(200).json({ ok: true, processed: n });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};