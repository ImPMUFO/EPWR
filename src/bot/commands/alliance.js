const { createAlliance, getPlayerAlliance, getAllAlliances, getAllianceMembers, requestJoin, leaveAlliance, depositToTreasury, upgradeAlliance, startAllianceWar, getAllianceWars, MAX_MEMBERS_PER_LEVEL } = require('../../game/alliance');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

const allianceState = new Map();

module.exports = function registerAlliance(bot) {
  bot.command('alliance', async (ctx) => { await showAllianceMenu(ctx); });
  bot.action(/^alliance\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showAllianceMenu(ctx); });

  // ═══ لیست اتحادها ═══
  bot.action(/^alliance_list\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const alliances = await getAllAlliances();
    const uid = ctx.from.id;
    if (alliances.length === 0) {
      return ctx.editMessageText('🤝 اتحادی نیست! خودت بساز.', { reply_markup: { inline_keyboard: [[{ text: '➕ ساخت', callback_data: cb('alliance_create', uid) }], [{ text: '🔙', callback_data: cb('alliance', uid) }]] } });
    }
    let msg = '🤝 *اتحادها*\n\n';
    const buttons = [];
    alliances.forEach(a => {
      msg += `⚜️ *${a.name}* [${a.tag}]\n`;
      msg += `   ⭐ Lv.${a.level} | 💰 ${formatGold(a.treasury_gold || 0)}\n\n`;
      buttons.push([{ text: `⚜️ ${a.name}`, callback_data: `alliance_view|${a.id}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('alliance', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  // ═══ مشاهده اتحاد ═══
  bot.action(/^alliance_view\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const allianceId = ctx.match[1];
    const uid = ctx.from.id;
    const db = getSupabase();
    const { data: alliance } = await db.from('alliances').select('*').eq('id', allianceId).single();
    const members = await getAllianceMembers(allianceId);

    let msg = `⚜️ *${alliance.name}* [${alliance.tag}]\n\n`;
    msg += `⭐ سطح: ${alliance.level}\n`;
    msg += `💰 خزانه: ${formatGold(alliance.treasury_gold || 0)}\n`;
    msg += `👥 اعضا: ${members.length}/${MAX_MEMBERS_PER_LEVEL[alliance.level] || 10}\n\n`;
    msg += `👑 *اعضا:*\n`;
    members.forEach(m => {
      const roleIcon = m.role === 'leader' ? '👑' : '👤';
      msg += `${roleIcon} ${m.players?.commander_name || 'Unknown'} Lv.${m.players?.level || 1}\n`;
    });

    const buttons = [];
    const playerAlliance = await getPlayerAlliance(uid);
    if (!playerAlliance) {
      buttons.push([{ text: '📥 درخواست عضویت', callback_data: `alliance_join|${allianceId}|${uid}` }]);
    }
    buttons.push([{ text: '🔙', callback_data: cb('alliance_list', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  // ═══ ساخت اتحاد ═══
  bot.action(/^alliance_create\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'name', data: {} });
    await ctx.editMessageText('⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۱ از ۳*\n\nنام اتحاد رو تایپ کن:', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('alliance', ctx.from.id) }]] }
    });
  });

  // ═══ درخواست عضویت ═══
  bot.action(/^alliance_join\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await requestJoin(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ درخواست ارسال شد!' : result.message, { show_alert: true });
  });

  // ═══ ترک اتحاد ═══
  bot.action(/^alliance_leave\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await leaveAlliance(ctx.from.id);
    await ctx.answerCbQuery(result.success ? '👋 خارج شدی' : result.message, { show_alert: true });
    await showAllianceMenu(ctx);
  });

  // ═══ واریز به خزانه ═══
  bot.action(/^alliance_deposit\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    allianceState.set(ctx.from.id, { step: 'deposit', data: {} });
    await ctx.editMessageText('💰 *واریز به خزانه*\n\nچقدر سکه واریز می‌کنی؟', {
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

  // ═══ جنگ اتحادها ═══
  bot.action(/^alliance_war\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAlliance = await getPlayerAlliance(ctx.from.id);
    if (!playerAlliance) return ctx.answerCbQuery('❌ عضو اتحاد نیستی!', { show_alert: true });
    if (playerAlliance.role !== 'leader') return ctx.answerCbQuery('❌ فقط رهبر می‌تواند جنگ اعلام کند!', { show_alert: true });

    const alliances = await getAllAlliances();
    const others = alliances.filter(a => a.id !== playerAlliance.alliance.id);
    if (others.length === 0) return ctx.answerCbQuery('❌ اتحاد دیگری نیست!', { show_alert: true });

    const uid = ctx.from.id;
    let msg = '⚔️ *جنگ اتحادها*\n\nحریف رو انتخاب کن:\n\n';
    const buttons = [];
    others.forEach(a => {
      msg += `⚜️ ${a.name} Lv.${a.level}\n`;
      buttons.push([{ text: `⚔️ ${a.name}`, callback_data: `alliance_attack|${a.id}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('alliance', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  // ═══ حمله به اتحاد ═══
  bot.action(/^alliance_attack\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAlliance = await getPlayerAlliance(ctx.from.id);
    if (!playerAlliance) return;
    
    const result = await startAllianceWar(playerAlliance.alliance.id, ctx.match[1]);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });

    const db = getSupabase();
    const { data: defenderAlliance } = await db.from('alliances').select('name').eq('id', ctx.match[1]).single();

    const title = result.attackerWins ? '🏆 پیروزی!' : '💀 شکست!';
    let msg = `⚔️ *${title}*\n\n`;
    msg += `⚡ قدرت ما: ${result.attackerPower}\n`;
    msg += `⚡ قدرت حریف: ${result.defenderPower}\n`;
    if (result.attackerWins && result.goldStolen > 0) {
      msg += `\n💰 ${result.goldStolen} سکه دزدیدی!`;
    }

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } });
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

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('alliance', ctx.from.id) }]] } });
  });

  // ═══ دریافت متن ═══
  bot.on('text', async (ctx, next) => {
    const state = allianceState.get(ctx.from.id);
    if (!state || ctx.message.text.startsWith('/')) return next();

    const text = ctx.message.text.trim();

    if (state.step === 'name') {
      state.data.name = text;
      state.step = 'tag';
      await ctx.reply(`⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۲ از ۳*\n\nنام: ${text} ✅\n\nتگ اتحاد رو تایپ کن:\n(مثلاً: EPWR)`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'tag') {
      state.data.tag = text.toUpperCase();
      state.step = 'desc';
      await ctx.reply(`⚜️ *ساخت اتحاد*\n\n📝 *مرحله ۳ از ۳*\n\nنام: ${state.data.name} ✅\nتگ: ${state.data.tag} ✅\n\nتوضیحات اتحاد رو تایپ کن:`, { parse_mode: 'Markdown' });
      return;
    }

    if (state.step === 'desc') {
      state.data.desc = text;
      const result = await createAlliance(ctx.from.id, state.data.name, state.data.tag, state.data.desc);
      allianceState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ اتحاد *${result.alliance.name}* ساخته شد!\n\n🏆 ${result.alliance.tag}` : result.message, { parse_mode: 'Markdown' });
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

  async function showAllianceMenu(ctx) {
    const member = await getPlayerAlliance(ctx.from.id);
    const uid = ctx.from.id;

    if (member) {
      const alliance = member.alliance;
      const upgradeCost = alliance.level * 500;
      const maxMembers = MAX_MEMBERS_PER_LEVEL[alliance.level] || 10;

      let msg = `⚜️ *${alliance.name}* [${alliance.tag}]\n\n`;
      msg += `⭐ سطح: ${alliance.level}\n`;
      msg += `💰 خزانه: ${formatGold(alliance.treasury_gold || 0)}\n`;
      msg += `👑 نقش: ${member.role === 'leader' ? 'رهبر' : 'عضو'}\n\n`;
      msg += `💡 *کارها:*\n`;
      msg += `• 💰 واریز به خزانه\n`;
      msg += `• ⚔️ جنگ با اتحادها\n`;
      msg += `• 📜 تاریخچه جنگ‌ها\n`;
      if (member.role === 'leader') {
        msg += `• ⬆️ ارتقا اتحاد (${formatGold(upgradeCost)} سکه)`;
      }

      const buttons = [];
      buttons.push([{ text: '💰 واریز به خزانه', callback_data: cb('alliance_deposit', uid) }]);
      buttons.push([{ text: '⚔️ جنگ اتحادها', callback_data: cb('alliance_war', uid) }, { text: '📜 تاریخچه', callback_data: cb('alliance_wars', uid) }]);
      if (member.role === 'leader') {
        buttons.push([{ text: `⬆️ ارتقا (${formatGold(upgradeCost)})`, callback_data: cb('alliance_upgrade', uid) }]);
      }
      buttons.push([{ text: '🚪 ترک اتحاد', callback_data: cb('alliance_leave', uid) }]);
      buttons.push([{ text: '🔙', callback_data: cb('mainmenu', uid) }]);

      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    } else {
      let msg = `🤝 *اتحاد*\n\nعضو اتحادی نیستی!\n\n💡 *کارها:*\n• اتحاد بساز\n• به اتحاد دیگران بپیوند\n• با اتحادها بجنگ`;
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '➕ ساخت اتحاد', callback_data: cb('alliance_create', uid) }],
        [{ text: '📋 لیست اتحادها', callback_data: cb('alliance_list', uid) }],
        [{ text: '🔙', callback_data: cb('mainmenu', uid) }]
      ] } });
    }
  }
};