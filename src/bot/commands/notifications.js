const { getNotifications, getUnreadCount, markAllAsRead } = require('../../game/notification');
const { smartReply, cb } = require('../../core/helpers');

module.exports = function registerNotifications(bot) {
  bot.command('notifications', async (ctx) => { await showNotifications(ctx); });
  bot.action(/^notifications\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showNotifications(ctx);
  });

  bot.action(/^mark_read\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await markAllAsRead(ctx.from.id);
    await ctx.answerCbQuery('✅ همه خوانده شدند', { show_alert: true });
    await showNotifications(ctx);
  });

  async function showNotifications(ctx) {
    const notifications = await getNotifications(ctx.from.id);
    const unreadCount = await getUnreadCount(ctx.from.id);
    const uid = ctx.from.id;

    let msg = `🔔 *اعلان‌ها*\n📅 هفته اخیر | خوانده نشده: ${unreadCount}\n\n`;
    const buttons = [];

    if (notifications.length === 0) {
      msg += `📭 اعلانی نداری!`;
    } else {
      notifications.slice(0, 10).forEach(n => {
        const timeAgo = getTimeAgo(n.created_at);
        const icon = n.is_read ? '📩' : '📬';
        if (n.type === 'attack') {
          msg += `${icon} ⚔️ ${n.message}\n`;
          if (n.gold_amount > 0) msg += `   💰 -${n.gold_amount}\n`;
        } else if (n.type === 'defense') {
          msg += `${icon} 🛡️ ${n.message}\n`;
        } else {
          msg += `${icon} ${n.message}\n`;
        }
        msg += `   ⏰ ${timeAgo}\n\n`;
      });
      if (unreadCount > 0) {
        buttons.push([{ text: '✅ خواندم', callback_data: cb('mark_read', uid) }]);
      }
    }
    buttons.push([{ text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  function getTimeAgo(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'الان';
    if (minutes < 60) return `${minutes} دقیقه پیش`;
    if (hours < 24) return `${hours} ساعت پیش`;
    return `${days} روز پیش`;
  }
};