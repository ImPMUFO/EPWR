const { getSupabase } = require('../core/supabase');

async function getOrCreatePlayer(telegramUser) {
  const db = getSupabase();
  const telegramId = telegramUser.id;
  const username = telegramUser.username || null;
  const firstName = telegramUser.first_name || 'Commander';

  const { data: existing, error: fetchErr } = await db
    .from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    await db.from('players').update({
      telegram_username: username,
      first_name: firstName,
      last_active_at: new Date().toISOString()
    }).eq('telegram_id', telegramId);
    return existing;
  }

  const { data: newPlayer, error: createErr } = await db
    .from('players').insert({
      telegram_id: telegramId,
      telegram_username: username,
      first_name: firstName,
      commander_name: firstName,
      realm_name: firstName + "'s Realm"
    }).select().single();

  if (createErr) throw createErr;

  await createInitialRealm(db, newPlayer);
  return newPlayer;
}

async function createInitialRealm(db, player) {
  const position = await findFreePosition(db);
  await db.from('realms').insert({
    owner_telegram_id: player.telegram_id,
    name: player.realm_name,
    map_x: position.x,
    map_y: position.y,
    territory_level: 1,
    wall_level: 0,
    population: 100
  });
}

async function findFreePosition(db) {
  for (let radius = 0; radius < 100; radius++) {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
        const { data } = await db.from('realms')
          .select('id')
          .eq('map_x', x)
          .eq('map_y', y)
          .maybeSingle();
        if (!data) return { x, y };
      }
    }
  }
  throw new Error('No free position');
}

async function getPlayerByTelegramId(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  return data;
}

async function updatePlayerResources(telegramId, updates) {
  const db = getSupabase();
  return db.from('players').update(updates).eq('telegram_id', telegramId);
}

module.exports = { getOrCreatePlayer, getPlayerByTelegramId, updatePlayerResources };