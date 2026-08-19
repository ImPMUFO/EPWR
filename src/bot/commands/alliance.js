const { createAlliance, getPlayerAlliance, getAllAlliances, requestJoin, leaveAlliance, getMembers } = require('../../game/alliance');
const { formatGold } = require('../../core/helpers');

const allianceState = new Map();

module.exports = function registerAlliance(bot) {

  bot.action('alliance', async (ctx) => {
    await ctx.answerCbQuery();
    await showAllianceMenu(ctx);
  });

  bot.action('alliance_list', async (ctx) => {
    await ctx.answerCbQuery();
    const alliances = await getAllAlliances();
    if (alliances.length === 0) {
      return ctx.editMessageText('🤝 هیچ اتحادی وجود ندارد! خودت یکی بساز.', {
        reply_markup: { inline_keyboard: [[{ text: '➕ ساخت اتحاد', callback_data: 'alliance_create' }], [{ text: '🔙 بازگشت', callback_data: 'alliance' }]] }
      });
    }

    let msg = `🤝 *اتحادهای EPWR*\n\n`;
    const buttons = [];
    alliances.forEach(a => {
      msg += `⚜️ *${a.name}* [${a.tag}] | Lv.${a.level}\n`;
      buttons.push([{ text: `⚜️ ${a.name}`, callback_data: `alliance_view:${a.id}` }]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: 'alliance' }]);

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action('alliance_create', async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, 'create');
    await ctx.editMessageText(
      `⚜️ *ساخت اتحاد جدید*\n\nبه این شکل بفرست:\n\`نام اتحاد\nتگ (۲-۵ حرف)\nتوضیحات\`\n\n*مثال:*\n\`جنگجویان ایران\nIRAN\nاتحاد قدرتمند\``,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'alliance' }]] } }
    );
  });

  bot.action(/^alliance_join:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await requestJoin(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ درخواست ارسال شد!' : result.message, { show_alert: true });
  });

  bot.action('alliance_leave', async (ctx) => {
    await ctx.answerCbQuery();
    const result = await leaveAlliance(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '👋 از اتحاد خارج شدی' : result.message, { show_alert: true });
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
    let msg = `🤝 *اتحاد*\n\n`;

    if (member) {
      const a = member.alliance;
      msg += `⚜️ عضو: *${a.name}* [${a.tag}]\n`;
      msg += `👑 نقش: ${member.role}\n`;
      msg += `💰 خزانه: ${formatGold(a.treasury_gold)}\n\n`;
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 اعضای اتحاد', callback_data: `alliance_members:${a.id}` }],
            [{ text: '🚪 ترک اتحاد', callback_data: 'alliance_leave' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      });
    } else {
      msg += `هنوز عضو اتحادی نیستی!\n\nاتحاد بساز یا به یکی بپیوند.`;
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ ساخت اتحاد', callback_data: 'alliance_create' }],
            [{ text: '📋 لیست اتحادها', callback_data: 'alliance_list' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      });
    }
  }
};