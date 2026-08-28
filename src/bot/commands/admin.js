async function showAdminPanel(ctx) {
    const db = getSupabase();
    const { count: pc } = await db.from('players').select('*', { count: 'exact', head: true });
    const { count: hc } = await db.from('player_characters').select('*', { count: 'exact', head: true });
    const { count: gc } = await db.from('bot_groups').select('*', { count: 'exact', head: true });
    const uid = ctx.from.id;
    let msg = `👑 *پنل مدیریت EPWR*\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `👥 بازیکنان: ${pc || 0}\n`;
    msg += `🦸 قهرمان‌ها: ${hc || 0}\n`;
    msg += `👥 گروه‌ها: ${gc || 0}\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `یه بخش رو انتخاب کن:`;
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
      [{ text: 'مدیریت قهرمان‌ها', callback_data: cb('admin_heroes', uid) }, { text: 'تصویر آیتم‌ها', callback_data: cb('admin_items_img', uid) }],
      [{ text: 'کدهای هدیه', callback_data: cb('admin_list_gifts', uid) }, { text: 'هدیه به همه', callback_data: cb('admin_gift_all', uid) }],
      [{ text: 'سکه به کاربر', callback_data: cb('admin_add_resources', uid) }, { text: 'پیام همگانی', callback_data: cb('admin_broadcast', uid) }],
      [{ text: 'آمار', callback_data: cb('admin_stats', uid) }, { text: 'گروه‌ها', callback_data: cb('admin_sync_groups', uid) }],
      [{ text: 'تصویر قلمرو', callback_data: cb('admin_img_realm', uid) }],
      [{ text: 'بازگشت', callback_data: cb('mainmenu', uid) }]
    ] } });
  }