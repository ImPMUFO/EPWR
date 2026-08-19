const { createAlliance, getPlayerAlliance, getAllAlliances, requestJoin, leaveAlliance } = require('../../game/alliance');
const { reply, cb } = require('../../core/helpers');

const allianceState = new Map();

module.exports = function registerAlliance(bot) {
  bot.action(/^alliance\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showAllianceMenu(ctx); });

  bot.action(/^alliance_list\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const alliances = await getAllAlliances();
    const uid = ctx.from.id;
    if (alliances.length === 0) return ctx.editMessageText('🤝 اتحادی نیست!', { reply_markup: { inline_keyboard: [[{ text: '➕ ساخت', callback_data: cb('alliance_create', uid) }], [{ text: '🔙', callback_data: cb('alliance', uid) }]] } });
    let msg = '🤝 *اتحادها*\n\n';
    const buttons = [];
    alliances.forEach(a => {
      msg += `⚜️ ${a.name} [${a.tag}] | Lv.${a.level}\n`;
      buttons.push([{ text: `⚜️ ${a.name}`, callback_data: `alliance_join|${a.id}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('alliance', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^alliance_create\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, 'create');
    await ctx.editMessageText('⚜️ *ساخت اتحاد*\n\nبفرست:\n`نام\nتگ\nتوضیحات`', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance', ctx.from.id) }]] } });
  });

  bot.action(/^alliance_join\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await requestJoin(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ درخواست ارسال شد!' : result.message, { show_alert: true });
  });

  bot.action(/^alliance_leave\|(\d+)$/, async (ctx) => {
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
    if (member) {
      await ctx.reply(`🤝 *${member.alliance.name}*\n👑 ${member.role}`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🚪 ترک', callback_data: cb('alliance_leave', uid) }], [{ text: '🔙', callback_data: cb('mainmenu', uid) }]] } });
    } else {
      await ctx.reply('🤝 *اتحاد*\n\nعضو نیستی!', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '➕ ساخت', callback_data: cb('alliance_create', uid) }], [{ text: '📋 لیست', callback_data: cb('alliance_list', uid) }], [{ text: '🔙', callback_data: cb('mainmenu', uid) }]] } });
    }
  }
};