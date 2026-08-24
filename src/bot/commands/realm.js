const { getOrCreatePlayer } = require('../../game/player');
const { getPlayerHeroes } = require('../../game/battle');
const { heroStats, heroTroopsPower } = require('../../game/troops');
const { getDefenseBonus, processKitchenProduction } = require('../../game/buildings');
const { getPlayerAlliance } = require('../../game/alliance');
const { processHeroRest } = require('../../game/rest');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

async function getRealmBg() {
  const db = getSupabase();
  const { data } = await db.from('bot_assets').select('file_id').eq('key', 'realm_bg').maybeSingle();
  return data?.file_id || null;
}

async function getNextTickInfo(telegramId) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('last_prod_tick').eq('telegram_id', telegramId).single();
  if (!player || !player.last_prod_tick) return null;
  const last = new Date(player.last_prod_tick).getTime();
  const next = last + 60000;
  const seconds = Math.max(0, Math.ceil((next - Date.now()) / 1000));
  return seconds;
}

async function hasGenerator(telegramId) {
  const db = getSupabase();
  const { data: items } = await db.from('player_items')
    .select('id, item:shop_items (type)')
    .eq('telegram_id', telegramId).eq('is_active', true);
  return (items || []).some(i => i.item && i.item.type === 'generator');
}

async function showRealm(ctx) {
  await processHeroRest(ctx.from.id);
  const produced = await processKitchenProduction(ctx.from.id);
  const player = await getOrCreatePlayer(ctx.from);
  const heroes = await getPlayerHeroes(ctx.from.id);
  const alliance = await getPlayerAlliance(ctx.from.id);
  const defBonus = await getDefenseBonus(ctx.from.id);
  const hasGen = await hasGenerator(ctx.from.id);
  const secondsLeft = await getNextTickInfo(ctx.from.id);

  let atk = 0, def = 0;
  for (const h of heroes) {
    const st = heroStats(h);
    atk += st.attack + heroTroopsPower(h);
    def += st.defense;
  }
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

  // ═══ نمایش وضعیت تولید ═══
  if (produced.gold > 0 || produced.eggs > 0 || produced.food > 0 || produced.wheat > 0) {
    const parts = [];
    if (produced.gold) parts.push(`💰+${produced.gold}`);
    if (produced.eggs) parts.push(`🥚+${produced.eggs}`);
    if (produced.food) parts.push(`🍖+${produced.food}`);
    if (produced.wheat) parts.push(`🌾+${produced.wheat}`);
    msg += `🎁 *این بازدید: ${parts.join(' ')}*\n`;
  }

  if (hasGen) {
    msg += `⚙️ دستگاه سکه‌ساز: فعال\n`;
    if (secondsLeft !== null) {
      msg += `⏰ +1 💰 در ${secondsLeft} ثانیه`;
    }
  } else {
    msg += `💡 _دستگاه سکه‌ساز از فروشگاه بخر_`;
  }

  const markup = {
    inline_keyboard: [
      [{ text: '🔄 به‌روزرسانی', callback_data: cb('realm', ctx.from.id) }],
      [{ text: '🏗️ ساختمان‌ها', callback_data: cb('buildings', ctx.from.id) }, { text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }],
      [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]
    ]
  };

  const bg = await getRealmBg();
  if (bg) {
    try {
      await ctx.telegram.sendPhoto(ctx.chat.id, bg, { caption: msg, parse_mode: 'Markdown', reply_markup: markup });
      return;
    } catch(e) {}
  }
  await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: markup });
}

module.exports = function registerRealm(bot) {
  bot.command('realm', async (ctx) => { await showRealm(ctx); });
  bot.action(/^realm\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showRealm(ctx); });
};

module.exports.showRealm = showRealm;