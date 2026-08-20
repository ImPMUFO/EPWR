const { ADMIN_ID, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources } = require('../../game/gift');
const { getSupabase } = require('../../core/supabase');
const { formatGold, cb } = require('../../core/helpers');

const adminState = new Map();

function getState(userId) {
  if (!adminState.has(userId)) {
    adminState.set(userId, { step: null, data: {} });
  }
  return adminState.get(userId);
}

function clearState(userId) {
  adminState.delete(userId);
}

module.exports = function registerAdmin(bot) {

  bot.command('admin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ شما دسترسی ندارید!');
    clearState(ctx.from.id);
    await showAdminPanel(ctx);
  });

  bot.action(/^admin\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    clearState(ctx.from.id);
    await showAdminPanel(ctx);
  });

  bot.action(/^admin_create_gift\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    state.step = 'gift_code';
    state.data = {};
    await ctx.editMessageText(
      `🎁 *ساخت کد هدیه*\n\n📝 *مرحله ۱ از ۵*\n\nکد هدیه رو تایپ کن:\n(مثلاً: EPWR2026)`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] } }
    );
  });

  bot.action(/^admin_add_resources\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    state.step = 'resource_user_id';
    state.data = {};
    await ctx.editMessageText(
      `💰 *اضافه کردن منابع*\n\n📝 *مرحله ۱ از ۳*\n\nآیدی عددی کاربر رو بفرست:\n(مثلاً: 123456789)`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] } }
    );
  });

  bot.action(/^admin_broadcast\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    state.step = 'broadcast';
    state.data = {};
    await ctx.editMessageText(
      `📢 *ارسال پیام همگانی*\n\nپیامت رو تایپ کن:\n(به همه کاربران و گروه‌ها فرستاده میشه)`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] } }
    );
  });

  bot.action(/^admin_gift_all\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    state.step = 'gift_all_gold';
    state.data = {};
    await ctx.editMessageText(
      `🎁 *هدیه به همه کاربران*\n\n📝 *مرحله ۱ از ۲*\n\nچقدر سکه به هر کاربر بدیم؟`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] } }
    );
  });

  bot.action(/^admin_stats\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await showStats(ctx);
  });

  bot.action(/^admin_list_gifts\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await showGiftList(ctx);
  });

  bot.action(/^admin_toggle\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await toggleGiftCode(ctx.match[1]);
    await showGiftList(ctx);
  });

  bot.action(/^admin_delete\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    await deleteGiftCode(ctx.match[1]);
    await ctx.answerCbQuery('🗑️ حذف شد', { show_alert: true });
    await showGiftList(ctx);
  });

  // ═══ همگام‌سازی گروه‌ها ═══
  bot.action(/^admin_sync_groups\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    
    const db = getSupabase();
    const { data: groups } = await db.from('bot_groups').select('*');
    
    let msg = `🔄 *گروه‌های ذخیره شده*\n\n`;
    if (!groups || groups.length === 0) {
      msg += `📭 گروهی ذخیره نشده!\n\n`;
      msg += `💡 وقتی ربات توی گروه پیامی بگیره، خودکار ذخیره میشه.`;
    } else {
      msg += `👥 تعداد: ${groups.length}\n\n`;
      groups.forEach(g => {
        msg += `• ${g.group_name || 'بدون نام'} (${g.group_id})\n`;
      });
    }
    
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('admin', ctx.from.id) }]] }
    });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.from.id !== ADMIN_ID) return next();
    const state = getState(ctx.from.id);
    if (!state.step) return next();
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) {
      clearState(ctx.from.id);
      return next();
    }

    if (state.step === 'gift_code') {
      state.data.code = text.toUpperCase();
      state.step = 'gift_gold';
      await ctx.reply(`🎁 *ساخت کد هدیه*\n\n📝 *مرحله ۲ از ۵*\n\nکد: \`${state.data.code}\` ✅\n\nچقدر 💰 سکه بده؟\n(0 برای هیچ)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'gift_gold') {
      state.data.gold = parseInt(text) || 0;
      state.step = 'gift_gems';
      await ctx.reply(`🎁 *ساخت کد هدیه*\n\n📝 *مرحله ۳ از ۵*\n\nکد: \`${state.data.code}\` ✅\nسکه: ${formatGold(state.data.gold)} ✅\n\nچقدر 💎 الماس بده؟\n(0 برای هیچ)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'gift_gems') {
      state.data.gems = parseInt(text) || 0;
      state.step = 'gift_max_uses';
      await ctx.reply(`🎁 *ساخت کد هدیه*\n\n📝 *مرحله ۴ از ۵*\n\nکد: \`${state.data.code}\` ✅\nسکه: ${formatGold(state.data.gold)} ✅\nالماس: ${state.data.gems} ✅\n\n👥 چند نفر بتونن استفاده کنن؟\n(0 = نامحدود)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'gift_max_uses') {
      state.data.maxUses = parseInt(text) || 0;
      state.step = 'gift_expiry';
      await ctx.reply(`🎁 *ساخت کد هدیه*\n\n📝 *مرحله ۵ از ۵*\n\nکد: \`${state.data.code}\` ✅\nسکه: ${formatGold(state.data.gold)} ✅\nالماس: ${state.data.gems} ✅\nتعداد: ${state.data.maxUses || 'نامحدود'} ✅\n\n⏰ چند ساعت وقت داشته باشن؟\n(0 = بدون انقضا)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'gift_expiry') {
      const hours = parseInt(text) || 0;
      const expiresAt = hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null;
      state.data.expiresAt = expiresAt;
      await ctx.reply(`🎁 *تأیید کد هدیه*\n\n📝 کد: \`${state.data.code}\`\n💰 سکه: ${formatGold(state.data.gold)}\n💎 الماس: ${state.data.gems}\n👥 تعداد: ${state.data.maxUses || 'نامحدود'}\n⏰ انقضا: ${expiresAt ? hours + ' ساعت' : 'بدون انقضا'}\n\n✅ بسازم؟`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '✅ بله، بساز', callback_data: cb('admin_confirm_gift', ctx.from.id) }], [{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] }
      });
      state.step = 'gift_confirm';
      return;
    }

    if (state.step === 'resource_user_id') {
      state.data.targetId = parseInt(text);
      if (!state.data.targetId) {
        await ctx.reply('❌ آیدی نامعتبره! دوباره بفرست.');
        return;
      }
      state.step = 'resource_gold';
      await ctx.reply(`💰 *اضافه کردن منابع*\n\n📝 *مرحله ۲ از ۳*\n\nآیدی: ${state.data.targetId} ✅\n\nچقدر 💰 سکه بدیم؟\n(0 برای هیچ)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'resource_gold') {
      state.data.gold = parseInt(text) || 0;
      state.step = 'resource_gems';
      await ctx.reply(`💰 *اضافه کردن منابع*\n\n📝 *مرحله ۳ از ۳*\n\nآیدی: ${state.data.targetId} ✅\nسکه: ${formatGold(state.data.gold)} ✅\n\nچقدر 💎 الماس بدیم؟\n(0 برای هیچ)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'resource_gems') {
      state.data.gems = parseInt(text) || 0;
      const result = await addResources(state.data.targetId, state.data.gold, state.data.gems);
      clearState(ctx.from.id);
      if (result.success) {
        await ctx.reply(`✅ *منابع اضافه شد!*\n\n🆔 کاربر: ${state.data.targetId}\n💰 سکه: +${formatGold(state.data.gold)}\n💎 الماس: +${state.data.gems}`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(result.message);
      }
      return;
    }

    if (state.step === 'broadcast') {
      state.data.message = text;
      await ctx.reply(`📢 *تأیید پیام همگانی*\n\n📝 پیام:\n${text}\n\n✅ به همه کاربران و گروه‌ها فرستاده بشه؟`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '✅ بله، بفرست', callback_data: cb('admin_confirm_broadcast', ctx.from.id) }], [{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] }
      });
      state.step = 'broadcast_confirm';
      return;
    }

    if (state.step === 'gift_all_gold') {
      state.data.gold = parseInt(text) || 0;
      state.step = 'gift_all_confirm';
      await ctx.reply(`🎁 *تأیید هدیه به همه*\n\n💰 سکه: ${formatGold(state.data.gold)} به هر کاربر\n\n✅ فرستاده بشه؟`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '✅ بله، بفرست', callback_data: cb('admin_confirm_gift_all', ctx.from.id) }], [{ text: '❌ لغو', callback_data: cb('admin', ctx.from.id) }]] }
      });
      return;
    }

    return next();
  });

  bot.action(/^admin_confirm_gift\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    if (state.step !== 'gift_confirm') return;
    const result = await createGiftCode(state.data.code, state.data.gold, state.data.gems, state.data.maxUses, state.data.expiresAt);
    clearState(ctx.from.id);
    if (result.success) {
      await ctx.reply(`🎉 *کد هدیه ساخته شد!*\n\n📝 کد: \`${state.data.code}\`\n\nاین کد رو به کاربران بده!`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(result.message);
    }
    await showAdminPanel(ctx);
  });

  bot.action(/^admin_confirm_broadcast\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    if (state.step !== 'broadcast_confirm') return;

    const db = getSupabase();
    clearState(ctx.from.id);

    const { data: players } = await db.from('players').select('telegram_id');
    let sentUsers = 0, failedUsers = 0;
    for (const p of players || []) {
      try {
        await ctx.telegram.sendMessage(p.telegram_id, state.data.message);
        sentUsers++;
      } catch(e) { failedUsers++; }
    }

    const { data: groups } = await db.from('bot_groups').select('group_id, group_name');
    let sentGroups = 0, failedGroups = 0;
    for (const g of groups || []) {
      try {
        await ctx.telegram.sendMessage(g.group_id, state.data.message);
        sentGroups++;
      } catch(e) { failedGroups++; }
    }

    await ctx.reply(`📢 *پیام فرستاده شد!*\n\n👤 کاربران:\n✅ ارسال: ${sentUsers}\n❌ ناموفق: ${failedUsers}\n\n👥 گروه‌ها:\n✅ ارسال: ${sentGroups}\n❌ ناموفق: ${failedGroups}`, { parse_mode: 'Markdown' });
    await showAdminPanel(ctx);
  });

  bot.action(/^admin_confirm_gift_all\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const state = getState(ctx.from.id);
    if (state.step !== 'gift_all_confirm') return;
    const db = getSupabase();
    const { data: players } = await db.from('players').select('telegram_id, gold');
    clearState(ctx.from.id);
    let count = 0;
    for (const p of players || []) {
      await db.from('players').update({ gold: p.gold + state.data.gold }).eq('telegram_id', p.telegram_id);
      count++;
    }
    await ctx.reply(`🎁 هدیه فرستاده شد!\n\n💰 ${formatGold(state.data.gold)} سکه به ${count} کاربر`);
    await showAdminPanel(ctx);
  });

  async function showAdminPanel(ctx) {
    const db = getSupabase();
    const { count: playerCount } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: giftCount } = await db.from('gift_codes').select('*', { count: 'exact', head: true });
    const { count: groupCount } = await db.from('bot_groups').select('*', { count: 'exact', head: true });
    const uid = ctx.from.id;
    let msg = `👑 *پنل مدیریت EPWR*\n\n`;
    msg += `👥 بازیکنان: ${playerCount || 0}\n`;
    msg += `👥 گروه‌ها: ${groupCount || 0}\n`;
    msg += `🎁 کدهای فعال: ${giftCount || 0}\n\n`;
    msg += `خوش آمدی سازنده! 🛠️`;
    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 ساخت کد هدیه', callback_data: cb('admin_create_gift', uid) }],
          [{ text: '📋 لیست کدها', callback_data: cb('admin_list_gifts', uid) }],
          [{ text: '💰 سکه به کاربر', callback_data: cb('admin_add_resources', uid) }],
          [{ text: '🎁 هدیه به همه', callback_data: cb('admin_gift_all', uid) }],
          [{ text: '📢 پیام همگانی', callback_data: cb('admin_broadcast', uid) }],
          [{ text: '📊 آمار', callback_data: cb('admin_stats', uid) }],
          [{ text: '🔄 گروه‌ها', callback_data: cb('admin_sync_groups', uid) }],
          [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]
        ]
      }
    });
  }

  async function showStats(ctx) {
    const db = getSupabase();
    const { count: playerCount } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: giftCount } = await db.from('gift_codes').select('*', { count: 'exact', head: true });
    const { count: battleCount } = await db.from('battles').select('*', { count: 'exact', head: true });
    const { count: heroCount } = await db.from('player_characters').select('*', { count: 'exact', head: true });
    const { count: groupCount } = await db.from('bot_groups').select('*', { count: 'exact', head: true });
    const { data: topPlayers } = await db.from('players').select('commander_name, gold').order('gold', { ascending: false }).limit(3);
    let msg = `📊 *آمار EPWR*\n\n`;
    msg += `👥 بازیکنان: ${playerCount || 0}\n`;
    msg += `👥 گروه‌ها: ${groupCount || 0}\n`;
    msg += `🎁 کدهای هدیه: ${giftCount || 0}\n`;
    msg += `⚔️ جنگ‌ها: ${battleCount || 0}\n`;
    msg += `🦸 قهرمانان: ${heroCount || 0}\n\n`;
    if (topPlayers && topPlayers.length > 0) {
      msg += `🏆 *ثروتمندترین‌ها:*\n`;
      const medals = ['🥇', '🥈', '🥉'];
      topPlayers.forEach((p, i) => { msg += `${medals[i]} ${p.commander_name}: ${formatGold(p.gold)}\n`; });
    }
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('admin', ctx.from.id) }]] } });
  }

  async function showGiftList(ctx) {
    const codes = await getAllGiftCodes();
    const uid = ctx.from.id;
    if (codes.length === 0) {
      return ctx.editMessageText('📭 کد هدیه‌ای نیست!', { reply_markup: { inline_keyboard: [[{ text: '➕ ساخت کد', callback_data: cb('admin_create_gift', uid) }], [{ text: '🔙 بازگشت', callback_data: cb('admin', uid) }]] } });
    }
    let msg = `🎁 *لیست کدهای هدیه*\n\n`;
    const buttons = [];
    codes.forEach(c => {
      const status = c.is_active ? '🟢' : '🔴';
      const uses = c.max_uses ? `${c.current_uses}/${c.max_uses}` : `${c.current_uses}∞`;
      msg += `${status} \`${c.code}\`\n   💰${formatGold(c.gold_reward)} 💎${c.gems_reward} | 👥${uses}\n\n`;
      buttons.push([
        { text: `${c.is_active ? '🚫' : '✅'} ${c.code}`, callback_data: `admin_toggle|${c.id}|${uid}` },
        { text: '🗑️', callback_data: `admin_delete|${c.id}|${uid}` }
      ]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('admin', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};