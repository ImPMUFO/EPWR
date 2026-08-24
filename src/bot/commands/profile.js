const { getOrCreatePlayer } = require('../../game/player');
const { getPlayerHeroes } = require('../../game/battle');
const { heroStats, heroTroopsPower } = require('../../game/troops');
const { getDefenseBonus } = require('../../game/buildings');
const { getPlayerAlliance } = require('../../game/alliance');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerProfile(bot) {
  bot.command('profile', async (ctx) => { await showProfile(ctx); });
  bot.action(/^profile\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showProfile(ctx); });

  async function showProfile(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const heroes = await getPlayerHeroes(ctx.from.id);
    const alliance = await getPlayerAlliance(ctx.from.id);
    const defBonus = await getDefenseBonus(ctx.from.id);

    let totalAtk = 0, totalDef = 0;
    for (const h of heroes) {
      const st = heroStats(h);
      totalAtk += st.attack + heroTroopsPower(h);
      totalDef += st.defense;
    }
    totalDef += defBonus;

    let msg = `👑 *${player.commander_name}*\n⭐ Lv.${player.level}\n\n`;
    msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n`;
    msg += `🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0}\n`;
    msg += `🍖 ${player.food || 0}/${player.food_capacity || 1000} | 🥚 ${player.eggs || 0}\n`;
    msg += `🌾 ${player.wheat || 0} | 🥡 ${player.flour || 0} | 🍞 ${player.bread || 0}\n\n`;
    msg += `⚔️ *قدرت کل حمله: ${totalAtk}*\n`;
    msg += `🛡 *قدرت کل دفاع: ${totalDef}*\n\n`;
    msg += `🦸 قهرمان‌ها: ${heroes.length}\n`;
    msg += `🤝 اتحاد: ${alliance ? alliance.alliance.name : 'نداری'}`;

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
      [{ text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }, { text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]
    ] } });
  }
};