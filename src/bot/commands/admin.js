const { ADMIN_ID, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources } = require('../../game/gift');
const { getSupabase } = require('../../core/supabase');
const { formatGold, cb } = require('../../core/helpers');

const adminState = new Map();

module.exports = function registerAdmin(bot) {
  bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی ندارید!');
    await showAdminPanel(ctx);
  });

  bot.action(/^admin\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.delete(ctx.from.id);
    await showAdminPanel(ctx);
  });

  bot.action(/^admin_create_gift\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, 'create_gift');
    await ctx.editMessageText('🎁 *ساخت کد*\n\nبفرست:\n`کد\nسکه\nالماس\nتعداد\nساعت`', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('admin', ctx.from.id) }]] } });
  });

  bot.action(/^admin_add_resources\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, 'add_resources');
    await ctx.editMessageText('💰 *اضافه منابع*\n\nبفرست:\n`آیدی\nسکه\nالماس`', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('admin', ctx.from.id) }]] } });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.from.id !== ADMIN_ID) return next();
    const state = adminState.get(ctx.from.id);
    if (!state) return next();
    if (ctx.message.text.startsWith('/')) {
      adminState.delete(ctx.from.id);
      return next();
    }
    const lines = ctx.message.text.split('\n').map(l => l.trim());
    if (state === 'create_gift' && lines.length >= 4) {
      const hours = parseInt(lines[4]) || 0;
      const result = await createGiftCode(lines[0], parseInt(lines[1]) || 0, parseInt(lines[2]) || 0, parseInt(lines[3]) || 0, hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null);
      adminState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ \`${lines[0].toUpperCase()}\`` : result.message, { parse_mode: 'Markdown' });
    }
    if (state === 'add_resources' && lines.length === 3) {
      const result = await addResources(parseInt(lines[0]), parseInt(lines[1]) || 0, parseInt(lines[2]) || 0);
      adminState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ ${lines[0]}` : result.message);
    }
    return next();
  });

  bot.action(/^admin_list_gifts\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await showAdminGiftList(ctx);
  });

  bot.action(/^admin_toggle\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await toggleGiftCode(ctx.match[1]);
    await showAdminGiftList(ctx);
  });

  bot.action(/^admin_delete\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await deleteGiftCode(ctx.match[1]);
    await ctx.answerCbQuery('🗑️ حذف شد', { show_alert: true });
    await showAdminGiftList(ctx);
  });

  bot.action(/^admin_stats\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const db = getSupabase();
    const { count: p } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: g } = await db.from('gift_codes').select('*', { count: 'exact', head: true });
    const { count: b } = await db.from('battles').select('*', { count: 'exact', head: true });
    await ctx.editMessageText(`📊 *آمار*\n\n👥 ${p || 0}\n🎁 ${g || 0}\n⚔️ ${b || 0}`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('admin', ctx.from.id) }]] } });
  });

  async function showAdminPanel(ctx) {
    const uid = ctx.from.id;
    await ctx.reply('👑 *پنل مدیریت*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🎁 ساخت کد', callback_data: cb('admin_create_gift', uid) }], [{ text: '📋 لیست', callback_data: cb('admin_list_gifts', uid) }], [{ text: '💰 منابع', callback_data: cb('admin_add_resources', uid) }], [{ text: '📊 آمار', callback_data: cb('admin_stats', uid) }], [{ text: '🔙', callback_data: cb('mainmenu', uid) }]] } });
  }

  async function showAdminGiftList(ctx) {
    const codes = await getAllGiftCodes();
    const uid = ctx.from.id;
    if (codes.length === 0) return ctx.editMessageText('📭 کدی نیست!', { reply_markup: { inline_keyboard: [[{ text: '➕', callback_data: cb('admin_create_gift', uid) }], [{ text: '🔙', callback_data: cb('admin', uid) }]] } });
    let msg = '🎁 *کدها*\n\n';
    const buttons = [];
    codes.forEach(c => {
      msg += `${c.is_active ? '✅' : '❌'} \`${c.code}\` | 💰${formatGold(c.gold_reward)} 💎${c.gems_reward}\n`;
      buttons.push([{ text: `${c.is_active ? '🚫' : '✅'} ${c.code}`, callback_data: `admin_toggle|${c.id}|${uid}` }, { text: '🗑️', callback_data: `admin_delete|${c.id}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('admin', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};