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
        msg += `${b.name}\n`;
        msg += `   📖 ${b.desc}\n`;
        msg += `   💵 *هزینه ساخت:*\n`;
        for (const [res, amount] of Object.entries(b.base_cost)) {
          const have = player[res] || 0;
          const enough = have >= amount ? '✅' : '❌';
          msg += `      ${getResIcon(res)} ${amount} ${getResName(res)} (داری: ${have}) ${enough}\n`;
        }
        msg += `\n`;
        buttons.push([{ text: `🔨 ساخت ${b.name}`, callback_data: `build|${key}|${uid}` }]);
      } else {
        const isMax = level >= b.max_level;
        msg += `${b.name} *Lv.${level}*\n`;
        msg += `   📖 ${b.desc}\n`;
        if (!isMax) {
          msg += `   ⬆️ *هزینه ارتقا:*\n`;
          for (const [res, amount] of Object.entries(b.base_cost)) {
            const upgradeAmount = Math.floor(amount * (1 + level * 0.5));
            const have = player[res] || 0;
            const enough = have >= upgradeAmount ? '✅' : '❌';
            msg += `      ${getResIcon(res)} ${upgradeAmount} ${getResName(res)} (داری: ${have}) ${enough}\n`;
          }
          msg += `\n`;
          buttons.push([{ text: `⬆️ ارتقا ${b.name} (Lv.${level}→${level + 1})`, callback_data: `upgrade|${key}|${uid}` }]);
        } else {
          msg += `   🏆 حداکثر سطح!\n\n`;
        }
      }
    }

    msg += `💡 *راهنمای منابع:*\n`;
    msg += `🪵 چوب: از فروشگاه → منابع\n`;
    msg += `🪨 سنگ: از فروشگاه → منابع\n`;
    msg += `⚙️ آهن: از فروشگاه → منابع\n`;
    msg += `💰 سکه: از جنگ و دستگاه‌ها`;

    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  function getResIcon(res) {
    return { gold: '💰', wood: '🪵', stone: '🪨', iron: '⚙️', food: '🍖' }[res] || '';
  }
};