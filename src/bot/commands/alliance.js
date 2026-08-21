const { createAlliance, getPlayerAlliance, getAllAlliances, getTopAlliances, getAllianceMembers, joinAlliance, updateAllianceInfo, leaveAlliance, deleteAlliance, depositToTreasury, claimDailyReward, upgradeAlliance, startAllianceWar, getAllianceWars, MAX_MEMBERS_PER_LEVEL, WAR_POWER_PER_LEVEL, DAILY_REWARD_PER_LEVEL } = require('../../game/alliance');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

const allianceState = new Map();

async function getAllianceByIndex(index) {
  const alliances = await getTopAlliances(10);
  return alliances[index] || null;
}

module.exports = function registerAlliance(bot) {
  bot.command('alliance', async (ctx) => { await showAllianceMenu(ctx); });
  bot.action(/^alliance\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showAllianceMenu(ctx); });

  // ═══ ۱۰ اتحاد برتر ═══
  bot.action(/^alliance_top\|(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const uid = ctx.from.id;
      const alliances = await getTopAlliances(10);

      if (!alliances || alliances.length === 0) {
        return await smartReply(ctx, '🤝 اتحادی نیست!\n\nخودت یه اتحاد بساز.', {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '➕ ساخت اتحاد', callback_data: cb('alliance_create', uid) }],
            [{ text: '🔙', callback_data: cb('alliance', uid) }]
          ] }
        });
      }

      let playerAlliance = null;
      try { playerAlliance = await getPlayerAlliance(uid); } catch(e) {}

      let msg = '🏆 *۱۰ اتحاد برتر*\n\n';
      const medals = ['🥇', '🥈', ''];
      const buttons = [];

      alliances.forEach((a, i) => {
        const groupIcon = a.linked_group_id ? ' 🎏' : '';
        const medal = i < 3 ? medals[i] : `${i + 1}.`;
        msg += `${medal} *${a.name}*${groupIcon}\n`;
        msg += `   ⭐ Lv.${a.level || 1} | 💰 ${formatGold(a.treasury_gold || 0)}\n\n`;

        buttons.push([{ text: `${medal} ${a.name}`, callback_data: `aview|${i}|${uid}` }]);
        if (!playerAlliance) {
          buttons.push([{ text: `📥 عضویت`, callback_data: `ajoin|${i}|${uid}` }]);
        }
      });

      buttons.push([{ text: '🔙', callback_data: cb('alliance', uid) }]);
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    } catch(e) {
      console.error('alliance_top error:', e.message);
      await ctx.answerCbQuery('⚠️ خطا: ' + e.message, { show_alert: true });
    }
  });

  // ═══ مشاهده اتحاد ═══
  bot.action(/^aview\|(\d+)\|(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const alliance = await getAllianceByIndex(parseInt(ctx.match[1]));
      if (!alliance) return ctx.answerCbQuery('❌ اتحاد پیدا نشد!', { show_alert: true });

      const uid = ctx.from.id;
      const members = await getAllianceMembers(alliance.id);

      const groupIcon = alliance.linked_group_id ? ' 🎏 گروه' : '';
      let msg = `⚜️ *${alliance.name}*${groupIcon}\n\n`;
      msg += `⭐ سطح: ${alliance.level || 1}\n`;
      msg += `💰 خزانه: ${formatGold(alliance.treasury_gold || 0)}\n`;
      msg += `⚔️ قدرت جنگ: ${WAR_POWER_PER_LEVEL[alliance.level] || 100}\n`;
      msg += `👥 اعضا: ${members.length}/${MAX_MEMBERS_PER_LEVEL[alliance.level] || 10}\n\n`;
      msg += `👑 *اعضا:*\n`;
      members.forEach(m => {
        const roleIcon = m.role === 'leader' ? '👑' : '👤';
        msg += `${roleIcon} ${m.players?.commander_name || 'Unknown'} Lv.${m.players?.level || 1}\n`;
      });

      const buttons = [];
      let playerAlliance = null;
      try { playerAlliance = await getPlayerAlliance(uid); } catch(e) {}

      if (!playerAlliance) {
        buttons.push([{ text: '📥 عضویت در اتحاد', callback_data: `ajoin|${ctx.match[1]}|${uid}` }]);
      }
      buttons.push([{ text: '🔙', callback_data: cb('alliance_top', uid) }]);
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    } catch(e) {
      console.error('aview error:', e.message);
      await ctx.answerCbQuery('⚠️ خطا', { show_alert: true });
    }
  });

  // ═══ عضویت ═══
  bot.action(/^ajoin\|(\d+)\|(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const alliance = await getAllianceByIndex(parseInt(ctx.match[1]));
      if (!alliance) return ctx.answerCbQuery('❌ اتحاد پیدا نشد!', { show_alert: true });

      const result = await joinAlliance(ctx.from.id, alliance.id);
      if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });

      const roleMsg = result.role === 'leader' ? ' (به عنوان رهبر 👑)' : '';
      await ctx.answerCbQuery(`✅ به اتحاد "${alliance.name}" پیوستی${roleMsg}!`, { show_alert: true });
      await showAllianceMenu(ctx);
    } catch(e) {
      console.error('ajoin error:', e.message);
      await ctx.answerCbQuery('⚠️ خطا در عضویت', { show_alert: true });
    }
  });

  // ═══ ساخت اتحاد ═══
  bot.action(/^alliance_create\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'name', data: {} });
    await smartReply(ctx, '⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۱ از ۳*\n\nنام اتحاد رو تایپ کن:', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance', ctx.from.id) }]] }
    });
  });

  // ═══ منوی ویرایش ═══
  bot.action(/^alliance_edit\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const uid = ctx.from.id;
    await smartReply(ctx, '✏️ *ویرایش اتحاد*\n\nکدوم بخش رو تغییر میدی؟', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '📝 نام', callback_data: cb('alliance_edit_name', uid) }, { text: '🔤 تگ', callback_data: cb('alliance_edit_tag', uid) }],
        [{ text: '📖 بیوگرافی', callback_data: cb('alliance_edit_desc', uid) }],
        [{ text: '🔙', callback_data: cb('alliance', uid) }]
      ] }
    });
  });

  bot.action(/^alliance_edit_name\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'edit_name', data: {} });
    await smartReply(ctx, '📝 *تغییر نام*\n\nنام جدید رو تایپ کن:', {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance_edit', ctx.from.id) }]] }
    });
  });

  bot.action(/^alliance_edit_tag\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'edit_tag', data: {} });
    await smartReply(ctx, '🔤 *تغییر تگ*\n\nتگ جدید رو تایپ کن:', {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance_edit', ctx.from.id) }]] }
    });
  });

  bot.action(/^alliance_edit_desc\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'edit_desc', data: {} });
    await smartReply(ctx, '📖 *تغییر بیوگرافی*\n\nبیوگرافی جدید رو تایپ کن:', {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance_edit', ctx.from.id) }]] }
    });
  });

  // ═══ لینک دعوت ═══
  bot.action(/^alliance_invite\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const member = await getPlayerAlliance(ctx.from.id);
    if (!member) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });

    const inviteCode = member.alliance.invite_code;
    const botUsername = ctx.botInfo.username;
    const inviteLink = `https://t.me/${botUsername}?start=alliance_${inviteCode}`;

    await smartReply(ctx,
      `🔗 *لینک دعوت*\n\n⚜️ ${member.alliance.name}\n\n📋 *لینک:*\n\`${inviteLink}\`\n\n💡 به دوستانت بده!`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } }
    );
  });

  // ═══ جایزه روزانه ═══
  bot.action(/^alliance_daily\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await claimDailyReward(ctx.from.id);
    if (result.success) {
      await ctx.answerCbQuery(`🎁 +${result.reward} سکه گرفتی!`, { show_alert: true });
    } else {
      await ctx.answerCbQuery(result.message, { show_alert: true });
    }
    await showAllianceMenu(ctx);
  });

  // ═══ ترک اتحاد ═══
  bot.action(/^alliance_leave\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await leaveAlliance(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '👋 خارج شدی' : result.message, { show_alert: true });
    await showAllianceMenu(ctx);
  });

  // ═══ حذف اتحاد ═══
  bot.action(/^alliance_delete\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const member = await getPlayerAlliance(ctx.from.id);
    if (!member) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });
    if (member.role !== 'leader') return ctx.answerCbQuery('❌ فقط رهبر!', { show_alert: true });

    await smartReply(ctx,
      `⚠️ *حذف اتحاد*\n\nاتحاد *${member.alliance.name}* حذف خواهد شد.\n\n❌ *قابل بازگشت نیست!*\n\nمطمئن هستی؟`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '✅ بله، حذف کن', callback_data: cb('alliance_delete_confirm', ctx.from.id) }],
        [{ text: '❌ لغو', callback_data: cb('alliance', ctx.from.id) }]
      ] } }
    );
  });

  bot.action(/^alliance_delete_confirm\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await deleteAlliance(ctx.from.id);
    if (result.success) {
      await ctx.answerCbQuery('🗑️ اتحاد حذف شد!', { show_alert: true });
      await showAllianceMenu(ctx);
    } else {
      await ctx.answerCbQuery(result.message, { show_alert: true });
    }
  });

  // ═══ واریز به خزانه ═══
  bot.action(/^alliance_deposit\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'deposit', data: {} });
    await smartReply(ctx, '💰 *واریز به خزانه*\n\nچقدر سکه واریز می‌کنی؟', {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance', ctx.from.id) }]] }
    });
  });

  // ═══ ارتقا اتحاد ═══
  bot.action(/^alliance_upgrade\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await upgradeAlliance(ctx.from.id);
    await ctx.answerCbQuery(result.success ? `✅ ارتقا به سطح ${result.newLevel}!` : result.message, { show_alert: true });
    if (result.success) await showAllianceMenu(ctx);
  });

  // ═══ لیست اعضا ═══
  bot.action(/^alliance_members\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const member = await getPlayerAlliance(ctx.from.id);
    if (!member) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });

    const members = await getAllianceMembers(member.alliance.id);
    let msg = `👥 *اعضای ${member.alliance.name}*\n\n`;
    members.forEach(m => {
      const roleIcon = m.role === 'leader' ? '👑' : '👤';
      msg += `${roleIcon} ${m.players?.commander_name || 'Unknown'} Lv.${m.players?.level || 1}\n`;
    });

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } });
  });

  // ═══ جنگ اتحادها ═══
  bot.action(/^alliance_war\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAlliance = await getPlayerAlliance(ctx.from.id);
    if (!playerAlliance) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });
    if (playerAlliance.role !== 'leader') return ctx.answerCbQuery('❌ فقط رهبر!', { show_alert: true });

    const alliances = await getAllAlliances();
    const others = alliances.filter(a => a.id !== playerAlliance.alliance.id);
    if (others.length === 0) return ctx.answerCbQuery('❌ اتحاد دیگری نیست!', { show_alert: true });

    const uid = ctx.from.id;
    let msg = '⚔️ *جنگ اتحادها*\n\nحریف رو انتخاب کن:\n\n';
    const buttons = [];
    others.forEach((a, i) => {
      const groupIcon = a.linked_group_id ? ' 🎏' : '';
      msg += `⚜️ ${a.name} Lv.${a.level || 1}${groupIcon}\n`;
      buttons.push([{ text: `⚔️ ${a.name}`, callback_data: `awar|${i}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('alliance', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  // ═══ حمله به اتحاد ═══
  bot.action(/^awar\|(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAlliance = await getPlayerAlliance(ctx.from.id);
    if (!playerAlliance) return;

    const alliances = await getAllAlliances();
    const others = alliances.filter(a => a.id !== playerAlliance.alliance.id);
    const target = others[parseInt(ctx.match[1])];
    if (!target) return ctx.answerCbQuery('❌ حریف پیدا نشد!', { show_alert: true });

    const result = await startAllianceWar(playerAlliance.alliance.id, target.id);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });

    const title = result.attackerWins ? '🏆 پیروزی!' : '💀 شکست!';
    let msg = `⚔️ *${title}*\n\n⚡ قدرت ما: ${result.attackerPower}\n⚡ قدرت حریف: ${result.defenderPower}\n`;
    if (result.attackerWins && result.goldStolen > 0) msg += `\n💰 ${result.goldStolen} سکه دزدیدی!`;

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } });
  });

  // ═══ تاریخچه جنگ‌ها ═══
  bot.action(/^alliance_wars\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAlliance = await getPlayerAlliance(ctx.from.id);
    if (!playerAlliance) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });

    const wars = await getAllianceWars(playerAlliance.alliance.id);
    const db = getSupabase();

    let msg = '⚔️ *تاریخچه جنگ‌ها*\n\n';
    if (wars.length === 0) {
      msg += '📭 جنگی ثبت نشده!';
    } else {
      for (const war of wars) {
        const isAttacker = war.attacker_alliance_id === playerAlliance.alliance.id;
        const won = war.winner_alliance_id === playerAlliance.alliance.id;
        const { data: opponent } = await db.from('alliances').select('name').eq('id', isAttacker ? war.defender_alliance_id : war.attacker_alliance_id).single();
        msg += `${won ? '🏆' : '💀'} ${isAttacker ? 'حمله به' : 'دفاع در برابر'} ${opponent?.name || 'Unknown'}\n`;
        if (war.gold_stolen > 0) msg += `   💰 ${war.gold_stolen} سکه\n`;
        msg += '\n';
      }
    }

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } });
  });

  // ═══ دریافت متن ═══
  bot.on('text', async (ctx, next) => {
    const state = allianceState.get(ctx.from.id);
    if (!state || ctx.message.text.startsWith('/')) return next();

    const text = ctx.message.text.trim();

    if (state.step === 'name') {
      state.data.name = text;
      state.step = 'tag';
      await ctx.reply(`⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۲ از ۳*\n\nنام: ${text} ✅\n\nتگ اتحاد رو تایپ کن:`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'tag') {
      state.data.tag = text.toUpperCase();
      state.step = 'desc';
      await ctx.reply(`⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۳ از ۳*\n\nنام: ${state.data.name} ✅\nتگ: ${state.data.tag} ✅\n\nبیوگرافی اتحاد رو تایپ کن:`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'desc') {
      state.data.desc = text;
      const result = await createAlliance(ctx.from.id, state.data.name, state.data.tag, state.data.desc);
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ اتحاد *${result.alliance.name}* ساخته شد!` : result.message, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'edit_name') {
      const result = await updateAllianceInfo(ctx.from.id, { name: text });
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ نام اتحاد به "${text}" تغییر کرد!` : result.message);
      return;
    }

    if (state.step === 'edit_tag') {
      const result = await updateAllianceInfo(ctx.from.id, { tag: text });
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ تگ اتحاد به "${text.toUpperCase()}" تغییر کرد!` : result.message);
      return;
    }

    if (state.step === 'edit_desc') {
      const result = await updateAllianceInfo(ctx.from.id, { description: text });
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ بیوگرافی اتحاد تغییر کرد!` : result.message);
      return;
    }

    if (state.step === 'deposit') {
      const amount = parseInt(text);
      if (!amount || amount <= 0) {
        await ctx.reply('❌ مقدار نامعتبر!');
        return;
      }
      const result = await depositToTreasury(ctx.from.id, amount);
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ ${formatGold(amount)} سکه واریز شد!` : result.message);
      return;
    }

    return next();
  });

  // ═══ منوی اصلی اتحاد ═══
  async function showAllianceMenu(ctx) {
    try {
      const member = await getPlayerAlliance(ctx.from.id);
      const uid = ctx.from.id;

      if (member) {
        const alliance = member.alliance;
        const currentLevel = alliance.level || 1;
        const upgradeCost = currentLevel * 500;
        const groupIcon = alliance.linked_group_id ? ' 🎏 گروه' : '';

        let msg = `⚜️ *${alliance.name}*${groupIcon}\n`;
        msg += `⭐ Lv.${currentLevel} | 💰 خزانه: ${formatGold(alliance.treasury_gold || 0)}\n`;
        msg += `⚔️ قدرت: ${WAR_POWER_PER_LEVEL[currentLevel] || 100} (+${Math.floor((alliance.treasury_gold || 0) / 100)} بونوس خزانه)\n`;
        msg += `👑 نقش: ${member.role === 'leader' ? 'رهبر' : 'عضو'}\n`;
        if (alliance.description) msg += `📖 ${alliance.description}\n`;
        msg += `\n💰 *فایده خزانه:*\n`;
        msg += `• 🎁 جایزه روزانه اعضا\n`;
        msg += `• ⚔️ بونوس قدرت جنگ\n`;
        msg += `• ⬆️ ارتقای اتحاد\n`;

        const buttons = [];
        buttons.push([
          { text: '💰 واریز', callback_data: cb('alliance_deposit', uid) },
          { text: '🎁 جایزه روزانه', callback_data: cb('alliance_daily', uid) }
        ]);
        buttons.push([
          { text: '👥 اعضا', callback_data: cb('alliance_members', uid) },
          { text: '🔗 دعوت', callback_data: cb('alliance_invite', uid) }
        ]);
        buttons.push([
          { text: '⚔️ جنگ', callback_data: cb('alliance_war', uid) },
          { text: '📜 تاریخچه', callback_data: cb('alliance_wars', uid) }
        ]);
        if (member.role === 'leader') {
          buttons.push([
            { text: '✏️ ویرایش', callback_data: cb('alliance_edit', uid) },
            { text: '🗑️ حذف', callback_data: cb('alliance_delete', uid) }
          ]);
          buttons.push([
            { text: `⬆️ ارتقا به Lv.${currentLevel + 1} (${formatGold(upgradeCost)})`, callback_data: cb('alliance_upgrade', uid) }
          ]);
        }
        buttons.push([
          { text: '🚪 ترک اتحاد', callback_data: cb('alliance_leave', uid) },
          { text: '🔙', callback_data: cb('mainmenu', uid) }
        ]);

        await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
      } else {
        let msg = `🤝 *اتحاد*\n\nعضو اتحادی نیستی!\n\n💡 اتحاد بساز یا به اتحاد برتر بپیوند!\n🎏 گروه‌ها خودکار اتحاد می‌سازن!`;
        await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
          [{ text: '➕ ساخت اتحاد', callback_data: cb('alliance_create', uid) }, { text: '🏆 برترین‌ها', callback_data: cb('alliance_top', uid) }],
          [{ text: '🔙', callback_data: cb('mainmenu', uid) }]
        ] } });
      }
    } catch(e) {
      console.error('showAllianceMenu error:', e.message);
      await ctx.reply('⚠️ خطا در بارگذاری منوی اتحاد');
    }
  }
};