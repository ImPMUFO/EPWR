const { BUILDINGS, getBuildings, buildBuilding, hasBuilding } = require('../../game/buildings');
const { buyFood } = require('../../game/food');
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

  bot.action(/^buy_food\|(\d+)\|(\d+)$/, async (ctx) => {
    const amount = parseInt(ctx.match[1]);
    const result = await buyFood(ctx.from.id, amount);
    await ctx.answerCbQuery(result.success ? `✅ ${amount} غذا خریدی!` : result.message, { show_alert: true });
    if (result.success) await showBuildings(ctx);
  });

  async function showBuildings(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const buildings = await getBuildings(ctx.from.id);
    const uid = ctx.from.id;

    let msg = `🏗️ *ساختمان‌ها*\n\n`;
    msg += `💰 ${formatGold(player.gold)} | 🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0}\n`;
    msg += `🍖 غذا: ${player.food || 0}/${player.food_capacity || 1000}\n\n`;

    const buttons = [];
    const builtTypes = buildings.map(b => b.type);

    // دکمه‌های ساختمان
    for (const [key, b] of Object.entries(BUILDINGS)) {
      const built = builtTypes.includes(key);
      if (!built) {
        const costStr = Object.entries(b.cost).map(([r, a]) => `${a} ${getResIcon(r)}`).join(' + ');
        msg += `${b.name}\n   📖 ${b.desc}\n   💵 ${costStr}\n\n`;
        buttons.push([{ text: `🔨 ساخت ${b.name}`, callback_data: `build|${key}|${uid}` }]);
      }
    }

    // دکمه خرید غذا
    msg += `🍖 *خرید غذا* (هر واحد = 1 Gold)\n`;
    buttons.push([
      { text: '🍖 +100 (💰100)', callback_data: `buy_food|100|${uid}` },
      { text: '🍖 +500 (💰500)', callback_data: `buy_food|500|${uid}` }
    ]);

    if (buttons.length > 2) {
      // دکمه‌ها رو دوتا-دوتا کنار هم بذار
      const newButtons = [];
      for (let i = 0; i < buttons.length - 2; i += 2) {
        if (i + 1 < buttons.length - 2) {
          newButtons.push([buttons[i][0], buttons[i + 1][0]]);
        } else {
          newButtons.push([buttons[i][0]]);
        }
      }
      newButtons.push(buttons[buttons.length - 2]);
      newButtons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: newButtons } });
    } else {
      buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    }
  }

  function getResIcon(res) {
    return { gold: '💰', wood: '🪵', stone: '🪨', iron: '⚙️', food: '🍖' }[res] || '';
  }
};