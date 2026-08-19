const { createAlliance, getPlayerAlliance, getAllAlliances, requestJoin, leaveAlliance } = require('../../game/alliance');
const { formatGold, reply, cb } = require('../../core/helpers');

const allianceState = new Map();

module.exports = function registerAlliance(bot) {

  bot.action(/alliance:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await showAllianceMenu(ctx);
  });

  bot.action(/alliance_list:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const alliances = await getAllAlliances();
    const uid = ctx.from.id;
    if (alliances.length === 0) {
      return ctx.editMessageText('🤝 اتحادی نیست! خودت بساز.', {
        reply_markup: { inline_keyboard: [
          [{ text: '➕ ساخت اتحاد', callback_data: cb('alliance_create', uid) }],
          [{ text: '🔙 بازگشت', callback_data: cb('alliance', uid) }]
        ]}
      });
    }

    let msg = `🤝 *اتحادها*\n\n`;
    const buttons = [];
    alliances.forEach(a => {
      msg += `⚜️ ${a.name} [${a.tag}] | Lv.${a.level}\n`;
      buttons.push([{ text: `⚜️ ${a.name}`, callback_data: `alliance_view:${a.id}:uid:${uid}` }]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('alliance', uid) }]);

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/alliance_create:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, 'create');
    await ctx.editMessageText(
      `⚜️ *ساخت اتحاد*\n\nبفرست:\n\`نام\nتگ\nتوضیحات\``,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('alliance', ctx.from.id) }]] } }
    );
  });

  bot.action(/^alliance_join:(.+):uid:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await requestJoin(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ درخواست ارسال شد!' : result.message, { show_alert: true });
  });

  bot.action(/alliance_leave:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await leaveAlliance(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '👋 خارج شدی' : result.message, { show_alert: true });
    await showAllianceMenu(ctx);
  });

  bot.on('text', async (ctx, next) => {
    const state = allianceState.get(ctx.from.id);
    if (!state || ctx.message.text.startsWith('/')) return next();
    if (state === 'create') {
      const lines = ctx.message.text.split('\n').map(l => l.trim());
      if (lines.length >= 3) {
        const result = await createAlliance(ctx.from.id, lines[0], lines[1], lines[2]);
        allianceState.delete(ctx.from.id);
        await ctx.reply(result.success ? `✅ اتحاد ${result.alliance.name} ساخته شد!` : result.message);
      }
    }
    return next();
  });

  async function showAllianceMenu(ctx) {
    const member = await getPlayerAlliance(ctx.from.id);
    const uid = ctx.from.id;
    let msg = `🤝 *اتحاد*\n\n`;

    if (member) {
      const a = member.alliance;
      msg += `⚜️ ${a.name} [${a.tag}] | 👑 ${member.role}`;
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚪 ترک اتحاد', callback_data: cb('alliance_leave', uid) }],
            [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]
          ]
        }
      });
    } else {
      msg += `عضو اتحادی نیستی!`;
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ ساخت اتحاد', callback_data: cb('alliance_create', uid) }],
            [{ text: '📋 لیست اتحادها', callback_data: cb('alliance_list', uid) }],
            [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]
          ]
        }
      });
    }
  }
};