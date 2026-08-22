const { BUILDINGS, getBuildings, buildBuilding, upgradeBuilding, processKitchenProduction, craftFlour, craftBread, eatBread, getResName } = require('../../game/buildings');
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

  // ═══ زنجیره تولید ═══
  bot.action(/^production\|(\d+)$/, async (ctx) => { await showProduction(ctx); });

  bot.action(/^craft_flour\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await craftFlour(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '✅ 10 گندم → 5 آرد' : result.message, { show_alert: true });
    await showProduction(ctx);
  });

  bot.action(/^craft_bread\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await craftBread(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '✅ 5 آرد → 5 نان' : result.message, { show_alert: true });
    await showProduction(ctx);
  });

  bot.action(/^eat_bread\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await eatBread(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '✅ +100 غذا' : result.message, { show_alert: true });
    await showProduction(ctx);
  });

  async function showProduction(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const uid = ctx.from.id;
    let msg = `🍞 *زنجیره تولید*\n\n`;
    msg += `🌾 گندم: ${player.wheat || 0}\n`;
    msg += `🥡 آرد: ${player.flour || 0}\n`;
    msg += `🍞 نان: ${player.bread || 0}\n\n`;
    msg += `💡 گندم از 🌾 مزرعه میاد!\n`;
    msg += `💡 نان رو بفروش یا بخور (+100 غذا)`;
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
      [{ text: '🌾→🥡 تبدیل (10 گندم)', callback_data: cb('craft_flour', uid) }],
      [{ text: '🥡→ پخت (5 آرد)', callback_data: cb('craft_bread', uid) }],
      [{ text: '🍞 خوردن نان (+100🍖)', callback_data: cb('eat_bread', uid) }],
      [{ text: '🔙', callback_data: cb('buildings', uid) }]
    ] } });
  }

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
        msg += `${b.name}\n   📖 ${b.desc}\n   💵 *هزینه ساخت:*\n`;
        for (const [res, amount] of Object.entries(b.base_cost)) {
          const have = player[res] || 0;
          const enough = have >= amount ? '✅' : '❌';
          msg += `      ${getResIcon(res)} ${amount} ${getResName(res)} (داری: ${have}) ${enough}\n`;
        }
        msg += `\n`;
        buttons.push([{ text: `🔨 ساخت ${b.name}`, callback_data: `build|${key}|${uid}` }]);
      } else {
        const isMax = level >= b.max_level;
        msg += `${b.name} *Lv.${level}*\n   📖 ${b.desc}\n`;
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

    buttons.push([{ text: '🍞 زنجیره تولید', callback_data: cb('production', uid) }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  function getResIcon(res) {
    return { gold: '💰', wood: '🪵', stone: '🪨', iron: '⚙️', food: '🍖' }[res] || '';
  }
};