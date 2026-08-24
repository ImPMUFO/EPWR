const { getOrCreatePlayer } = require('../../game/player');
const { collectGold } = require('../../game/realm');
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

// ═══ صفحه یکپارچه قلمرو ═══
async function showRealm(ctx) {
  await processHeroRest(ctx.from.id);
  const player = await getOrCreatePlayer(ctx.from);
  const heroes = await getPlayerHeroes(ctx.from.id);
  const alliance = await getPlayerAlliance(ctx.from.id);
  const defBonus = await getDefenseBonus(ctx.from.id);

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
  msg += `🦸 قهرمان‌ها: ${heroes.length} | 🤝 ${alliance ? alliance.alliance.name : '—'}`;

  const markup = {
    inline_keyboard: [
      [{ text: '💰 جمع‌آوری', callback_data: cb('resources', ctx.from.id) }, { text: '🏗️ ساختمان‌ها', callback_data: cb('buildings', ctx.from.id) }],
      [{ text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }, { text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]
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

  // ═══ جمع‌آوری سکه دستگاه‌ها ═══
  bot.action(/^resources\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await collectGold(ctx.from.id);
    if (result.totalGold > 0) {
      await ctx.answerCbQuery(`💰 +${formatGold(result.totalGold)} جمع شد!`, { show_alert: true });
    } else {
      await ctx.answerCbQuery('⏳ چیزی نیست! دستگاه‌ها هر ۱۰ دقیقه سکه میدن.', { show_alert: true });
    }
    await showRealm(ctx);
  });
};

module.exports.showRealm = showRealm;