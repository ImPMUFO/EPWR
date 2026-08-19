const { getBotRealms, getDefeatedNPCs } = require('../../game/battle');
const { getSupabase } = require('../../core/supabase');

module.exports = function registerWorld(bot) {
  bot.command('world', async (ctx) => { await showWorld(ctx); });
  bot.action('world', async (ctx) => { await ctx.answerCbQuery(); await showWorld(ctx); });

  async function showWorld(ctx) {
    const bots = await getBotRealms();
    const defeated = await getDefeatedNPCs(ctx.from.id);
    const db = getSupabase();

    // آمار بازیکنان
    const { count: totalPlayers } = await db.from('players')
      .select('*', { count: 'exact', head: true });
    const { count: totalBattles } = await db.from('battles')
      .select('*', { count: 'exact', head: true });

    let msg = `🗺️ *نقشه جهان EPWR*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `👥 بازیکنان: ${totalPlayers || 0}\n`;
    msg += `⚔️ جنگ‌های انجام شده: ${totalBattles || 0}\n`;
    msg += `🏆 فتح‌های تو: ${defeated.length}/${bots.length}\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;

    msg += `🏰 *سرزمین‌های قابل فتح:*\n\n`;

    const buttons = [];

    bots.forEach(b => {
      const isDefeated = defeated.includes(b.id);
      const stars = '⭐'.repeat(b.difficulty);

      if (isDefeated) {
        msg += `✅ ~~${b.emoji} ${b.name}~~ (فتح شده)\n`;
      } else {
        msg += `${b.emoji} *${b.name}* ${stars}\n`;
        msg += `   📖 ${b.description}\n`;
        msg += `   💰 پاداش: ${b.gold_reward_min}-${b.gold_reward_max} Gold\n`;
        msg += `   ⚡ قدرت: ${b.bot_power}\n\n`;
        buttons.push([{ text: `${b.emoji} ${b.name}`, callback_data: `battle_npc:${b.id}` }]);
      }
    });

    if (buttons.length === 0) {
      msg += `\n🎉 *تبریک! همه سرزمین‌ها رو فتح کردی!*\n`;
      msg += `🚧 سرزمین‌های جدید به زودی اضافه می‌شوند!`;
    }

    buttons.push([{ text: '⚔️ رفتن به نبرد', callback_data: 'battle' }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
};