const { ADMIN_ID, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources } = require('../../game/gift');
const { getSupabase } = require('../../core/supabase');
const { formatGold } = require('../../core/helpers');

// State برای ادمین
const adminState = new Map();

module.exports = function registerAdmin(bot) {

  bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ شما دسترسی ندارید!');
    await showAdminPanel(ctx);
  });

  bot.action('admin', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.delete(ctx.from.id);
    await showAdminPanel(ctx);
  });

  // ═══ ساخت کد هدیه ═══
  bot.action('admin_create_gift', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    
    adminState.set(ctx.from.id, 'create_gift');
    
    await ctx.editMessageText(
      `🎁 *ساخت کد هدیه جدید*\n\n` +
      `اطلاعات رو به این شکل بفرستید:\n\n` +
      `📝 \`کد هدیه\`\n` +
      `💰 \`مقدار سکه\`\n` +
      `💎 \`مقدار الماس\`\n` +
      `👥 \`تعداد مجاز (0 = نامحدود)\`\n` +
      `⏰ \`ساعت انقضا (0 = بدون انقضا)\`\n\n` +
      `*مثال:*\n` +
      `\`EPWR2026\n1000\n50\n100\n24\`\n\n` +
      `⚠️ الان منتظر اطلاعات هستم...`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'admin' }]] }
      }
    );
  });

  // ═══ اضافه کردن منابع ═══
  bot.action('admin_add_resources', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    
    adminState.set(ctx.from.id, 'add_resources');
    
    await ctx.editMessageText(
      `💰 *اضافه کردن منابع*\n\n` +
      `به این شکل بفرستید:\n\n` +
      `\`آیدی عددی بازیکن\nمقدار سکه\nمقدار الماس\`\n\n` +
      `*مثال:*\n\`123456789\n1000\n50\`\n\n` +
      `⚠️ الان منتظر اطلاعات هستم...`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'admin' }]] }
      }
    );
  });

  // ═══ دریافت متن از ادمین ═══
  bot.on('text', async (ctx, next) => {
    if (ctx.from.id !== ADMIN_ID) return next();
    
    const state = adminState.get(ctx.from.id);
    if (!state) return next();
    
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      adminState.delete(ctx.from.id);
      return next();
    }

    const lines = text.split('\n').map(l => l.trim());

    if (state === 'create_gift' && lines.length >= 4) {
      const code = lines[0];
      const gold = parseInt(lines[1]) || 0;
      const gems = parseInt(lines[2]) || 0;
      const maxUses = parseInt(lines[3]) || 0;
      const hours = parseInt(lines[4]) || 0;

      let expiresAt = null;
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const result = await createGiftCode(code, gold, gems, maxUses, expiresAt);
      adminState.delete(ctx.from.id);

      if (result.success) {
        await ctx.reply(
          `✅ *کد هدیه ساخته شد!*\n\n` +
          `📝 کد: \`${code.toUpperCase()}\`\n` +
          `💰 سکه: ${formatGold(gold)}\n` +
          `💎 الماس: ${gems}\n` +
          `👥 تعداد مجاز: ${maxUses || 'نامحدود'}\n` +
          `⏰ انقضا: ${expiresAt ? new Date(expiresAt).toLocaleString('fa-IR') : 'بدون انقضا'}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(result.message);
      }
      return;
    }

    if (state === 'add_resources' && lines.length === 3) {
      const targetId = parseInt(lines[0]);
      const gold = parseInt(lines[1]) || 0;
      const gems = parseInt(lines[2]) || 0;

      adminState.delete(ctx.from.id);

      if (!targetId) {
        await ctx.reply('❌ آیدی نامعتبر است!');
        return;
      }

      const result = await addResources(targetId, gold, gems);
      if (result.success) {
        await ctx.reply(`✅ *منابع اضافه شد!*\n\n🆔 بازیکن: ${targetId}\n💰 سکه: +${formatGold(gold)}\n💎 الماس: +${gems}`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(result.message);
      }
      return;
    }

    return next();
  });

  // ═══ لیست کدها ═══
  bot.action('admin_list_gifts', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await showAdminGiftList(ctx);
  });

  bot.action(/^admin_toggle:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const result = await toggleGiftCode(ctx.match[1]);
    if (result.success) {
      await ctx.answerCbQuery(result.newState ? '✅ فعال شد' : '🚫 غیرفعال شد', { show_alert: true });
    }
    await showAdminGiftList(ctx);
  });

  bot.action(/^admin_delete:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await deleteGiftCode(ctx.match[1]);
    await ctx.answerCbQuery('🗑️ حذف شد', { show_alert: true });
    await showAdminGiftList(ctx);
  });

  // ═══ آمار ═══
  bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const db = getSupabase();
    const { count: playerCount } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: giftCount } = await db.from('gift_codes').select('*', { count: 'exact', head: true });
    const { count: battleCount } = await db.from('battles').select('*', { count: 'exact', head: true });

    await ctx.editMessageText(
      `📊 *آمار EPWR*\n\n👥 بازیکنان: ${playerCount || 0}\n🎁 کدهای هدیه: ${giftCount || 0}\n⚔️ جنگ‌ها: ${battleCount || 0}`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'admin' }]] } }
    );
  });

  async function showAdminPanel(ctx) {
    await ctx.reply(
      `👑 *پنل مدیریت EPWR*\n\nخوش آمدی سازنده! 🛠️`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎁 ساخت کد هدیه', callback_data: 'admin_create_gift' }],
            [{ text: '📋 لیست کدهای هدیه', callback_data: 'admin_list_gifts' }],
            [{ text: '💰 اضافه کردن منابع', callback_data: 'admin_add_resources' }],
            [{ text: '📊 آمار ربات', callback_data: 'admin_stats' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      }
    );
  }

  async function showAdminGiftList(ctx) {
    const codes = await getAllGiftCodes();
    if (codes.length === 0) {
      return ctx.editMessageText('📭 کد هدیه‌ای وجود ندارد.', {
        reply_markup: { inline_keyboard: [[{ text: '➕ ساخت کد جدید', callback_data: 'admin_create_gift' }], [{ text: '🔙 بازگشت', callback_data: 'admin' }]] }
      });
    }

    let msg = `🎁 *لیست کدهای هدیه*\n\n`;
    const buttons = [];
    codes.forEach(c => {
      const status = c.is_active ? '✅' : '❌';
      const uses = c.max_uses ? `${c.current_uses}/${c.max_uses}` : c.current_uses;
      msg += `${status} \`${c.code}\` | 💰${formatGold(c.gold_reward)} 💎${c.gems_reward} | 👥${uses}\n`;
      buttons.push([
        { text: `${c.is_active ? '🚫' : '✅'} ${c.code}`, callback_data: `admin_toggle:${c.id}` },
        { text: '🗑️', callback_data: `admin_delete:${c.id}` }
      ]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: 'admin' }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};