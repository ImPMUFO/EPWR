const { getOrCreatePlayer } = require('../../game/player');
const { getPlayerHeroes } = require('../../game/battle');
const { heroStats, heroTroopsPower } = require('../../game/troops');
const { getDefenseBonus } = require('../../game/buildings');
const { getPlayerAlliance } = require('../../game/alliance');
const { processHeroRest } = require('../../game/rest');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

async function getRealmBg() {
  const db = getSupabase();
  const { data } = await db.from('bot_assets').select('file_id').eq('key', 'realm_bg').maybeSingle();
  return data?.file_id || null;
}

async function getGenInfo(telegramId) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('gold_progress').eq('telegram_id', telegramId).single();
  const { data: items } = await db.from('player_items').select('id, item:shop_items (type, effect_value)').eq('telegram_id', telegramId).eq('is_active', true);
  const gen = (items || []).find(i => i.item && i.item.type === 'generator');
  if (!gen) return null;
  const perDay = gen.item.effect_value || 600;
  const ratePerMin = perDay / 1440;
  const prog = player?.gold_progress || 0;
  const seconds = Math.max(1, Math.ceil(((1 - prog) / ratePerMin) * 60));
  return { perDay, seconds };
}

async function showRealm(ctx) {
  await processHeroRest(ctx.from.id);
  const player = await getOrCreatePlayer(ctx.from);
  const heroes = await getPlayerHeroes(ctx.from.id);
  const alliance = await getPlayerAlliance(ctx.from.id);
  const defBonus = await getDefenseBonus(ctx.from.id);
  const genInfo = await getGenInfo(ctx.from.id);

  let atk = 0, def = 0;
  for (const h of heroes) { const st = heroStats(h); atk += st.attack + heroTroopsPower(h); def += st.defense; }
  def += defBonus;

  let msg = `🏰 *${player.realm_name || 'قلمرو'}*\n`;
  msg += `👑 ${player.commander_name} | ⭐ Lv.${player.level}\n`;
  msg += `✨ ${player.xp || 0}/${player.xp_to_next || 100}\n\n`;
  msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n`;
  msg += `🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0}\n`;
  msg += `🍖 ${player.food || 0}/${player.food_capacity || 1000} | 🥚 ${player.eggs || 0}\n`;
  msg += `🌾 ${player.wheat || 0} | 🥡 ${player.flour || 0} | 🍞 ${player.bread || 0}\n\n`;
  msg += `⚔️ قدرت حمله: ${atk}\n`;
  msg += `🛡 قدرت دفاع: ${def}\n`;
  msg += `🦸 قهرمان‌ها: ${heroes.length} | 🤝 ${alliance ? alliance.alliance.name : '—'}\n\n`;
  if (genInfo) msg += `⚙️ دستگاه سکه‌ساز: +${genInfo.perDay} 💰/روز\n⏰ +1 💰 در ${genInfo.seconds} ثانیه`;
  else msg += `💡 _دستگاه سکه‌ساز از فروشگاه بخر_`;

  const markup = { inline_keyboard: [
    [{ text: '🔄 به‌روزرسانی', callback_data: cb('realm', ctx.from.id) }],
    [{ text: '🏗️ ساختمان‌ها', callback_data: cb('buildings', ctx.from.id) }, { text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }],
    [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]
  ] };

  await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: markup });
}

module.exports = function registerRealm(bot) {
  bot.command('realm', async (ctx) => { await showRealm(ctx); });
  bot.action(/^realm\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showRealm(ctx); });
};

module.exports.showRealm = showRealm;