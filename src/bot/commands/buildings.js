const { BUILDINGS, getBuildings, getBuilding, buildBuilding, upgradeBuilding, processKitchenProduction, getResName } = require('../../game/buildings');
const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerBuildings(bot) {
  bot.command('buildings', async (ctx) => { await showBuildings(ctx); });
  bot.action(/^buildings\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showBuildings(ctx); });

  bot.action(/^build\|(.+)\|(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const result = await buildBuilding(ctx.from.id, type);
    await ctx.answerCbQuery(result.success ? `✅ ${BUILDINGS[type].name} ساخته شد!` : result.message, { show_alert: true });
    if (result.success) await showBuildings(ctx);
  });

  bot.action(/^upgrade\|(.+)\|(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const result = await upgradeBuilding(ctx.from.id, type);
    await ctx.answerCbQuery(result.success ? `✅ ارتقا به سطح ${result.newLevel}!` : result.message, { show_alert: true });
    if (result.success) await showBuildings(ctx);
  });

  async function showBuildings(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const buildings = await getBuildings(ctx.from.id);
    const uid = ctx.from.id;

    let msg = `🏗️ *ساختمان‌ها*\n\n`;
    msg += `💰 ${formatGold(player.gold)} | 🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0}\n`;
    msg += `🍖 ${player.food || 0}/${player.food_capacity || 1000}\n\n`;

    const buttons = [];
    const builtMap = {};
    buildings.forEach(b => builtMap[b.type] = b.level);

    for (const [key, b] of Object.entries(BUILDINGS)) {
      const level = builtMap[key] || 0;
      if (level === 0) {
        const costStr = Object.entries(b.base_cost).map(([r, a]) => `${a} ${getResIcon(r)}`).join(' + ');
        msg += `${b.name}\n   📖 ${b.desc}\n   💵 ${costStr}\n\n`;
        buttons.push([{ text: `🔨 ساخت ${b.name}`, callback_data: `build|${key}|${uid}` }]);
      } else {
        const isMax = level >= b.max_level;
        msg += `${b.name} *Lv.${level}*\n   📖 ${b.desc}\n`;
        if (!isMax) {
          const upgradeCost = Object.entries(b.base_cost).map(([r, a]) => `${Math.floor(a * (1 + level * 0.5))} ${getResIcon(r)}`).join(' + ');
          msg += `   ⬆️ ارتقا: ${upgradeCost}\n\n`;
          buttons.push([{ text: `⬆️ ارتقا ${b.name} (Lv.${level}→${level + 1})`, callback_data: `upgrade|${key}|${uid}` }]);
        } else {
          msg += `   🏆 حداکثر سطح!\n\n`;
        }
      }
    }

    msg += `\n💡 *راهنمای منابع:*\n`;
    msg += `🪵 چوب: از فروشگاه منابع\n`;
    msg += `🪨 سنگ: از فروشگاه منابع\n`;
    msg += `⚙️ آهن: از فروشگاه منابع\n`;
    msg += `💰 سکه: از جنگ و دستگاه‌ها`;

    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  function getResIcon(res) {
    return { gold: '💰', wood: '🪵', stone: '🪨', iron: '⚙️', food: '🍖' }[res] || '';
  }
};