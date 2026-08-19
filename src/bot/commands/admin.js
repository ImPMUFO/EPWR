const { ADMIN_ID, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources } = require('../../game/gift');
const { getSupabase } = require('../../core/supabase');
const { formatGold } = require('../../core/helpers');

module.exports = function registerAdmin(bot) {

  // فقط ادمین می‌تونه /admin بزنه
  bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply('⛔ شما دسترسی به این بخش ندارید!');
    }
    await showAdminPanel(ctx);
  });

  bot.action('admin', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی ندارید!');
    await showAdminPanel(ctx);
  });

  // ═══ ساخت کد هدیه ═══
  bot.action('admin_create_gift', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `🎁 *ساخت کد هدیه جدید*\n\n` +
      `لطفاً اطلاعات رو به این شکل بفرستید:\n\n` +
      `📝 \`کد هدیه\`\n` +
      `💰 \`مقدار سکه\`\n` +
      `💎 \`مقدار الماس\`\n` +
      `👥 \`تعداد مجاز (0 = نامحدود)\`\n` +
      `⏰ \`ساعت انقضا (0 = بدون انقضا)\`\n\n` +
      `*مثال:*\n` +
      `\`EPWR2026\n1000\n50\n100\n24\``,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'admin' }]] }
      }
    );
  });

  // دریافت اطلاعات کد هدیه
  bot.on('text', async (ctx, next) => {
    if (ctx.from.id !== ADMIN_ID) return next();
    const text = ctx.message.text;
    if (!text.startsWith('/')) {
      const lines = text.split('\n').map(l => l.trim());
      if (lines.length >= 4) {
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
    }
    return next();
  });

  // ═══ لیست کدهای هدیه ═══
  bot.action('admin_list_gifts', async (ctx) => {
    await ctx.answerCbQuery();
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
  });

  // فعال/غیرفعال کردن
  bot.action(/^admin_toggle:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const result = await toggleGiftCode(ctx.match[1]);
    if (result.success) {
      await ctx.answerCbQuery(result.newState ? '✅ فعال شد' : '🚫 غیرفعال شد', { show_alert: true });
    }
    await showAdminGiftList(ctx);
  });

  // حذف کد
  bot.action(/^admin_delete:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await deleteGiftCode(ctx.match[1]);
    await ctx.answerCbQuery('🗑️ حذف شد', { show_alert: true });
    await showAdminGiftList(ctx);
  });

  // ═══ اضافه کردن منابع ═══
  bot.action('admin_add_resources', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `💰 *اضافه کردن منابع به بازیکن*\n\n` +
      `به این شکل بفرستید:\n\n` +
      `\`آیدی عددی بازیکن\nمقدار سکه\nمقدار الماس\`\n\n` +
      `*مثال:*\n\`123456789\n1000\n50\``,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'admin' }]] }
      }
    );
  });

  // دریافت اطلاعات اضافه کردن منابع
  bot.on('text', async (ctx, next) => {
    if (ctx.from.id !== ADMIN_ID) return next();
    const text = ctx.message.text;
    if (!text.startsWith('/')) {
      const lines = text.split('\n').map(l => l.trim());
      if (lines.length === 3) {
        const targetId = parseInt(lines[0]);
        const gold = parseInt(lines[1]) || 0;
        const gems = parseInt(lines[2]) || 0;

        if (!targetId) return next();

        const result = await addResources(targetId, gold, gems);
        if (result.success) {
          await ctx.reply(`✅ *منابع اضافه شد!*\n\n🆔 بازیکن: ${targetId}\n💰 سکه: +${formatGold(gold)}\n💎 الماس: +${gems}`, { parse_mode: 'Markdown' });
        } else {
          await ctx.reply(result.message);
        }
        return;
      }
    }
    return next();
  });

  // ═══ آمار ═══
  bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { count: playerCount } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: giftCount } = await db.from('gift_codes').select('*', { count: 'exact', head: true });
    const { count: battleCount } = await db.from('battles').select('*', { count: 'exact', head: true });

    await ctx.editMessageText(
      `📊 *آمار EPWR*\n\n` +
      `👥 بازیکنان: ${playerCount || 0}\n` +
      `🎁 کدهای هدیه: ${giftCount || 0}\n` +
      `⚔️ جنگ‌ها: ${battleCount || 0}`,
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