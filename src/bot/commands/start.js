const { getOrCreatePlayer } = require('../../game/player');
const { joinAllianceByInvite } = require('../../game/alliance');
const { processFoodConsumption } = require('../../game/food');
const { processKitchenProduction } = require('../../game/buildings');
const { processHeroRest } = require('../../game/rest');
const { formatGold, reply } = require('../../core/helpers');
const { buildMainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);

      const startPayload = ctx.startPayload;
      if (startPayload && startPayload.startsWith('alliance_')) {
        const inviteCode = startPayload.replace('alliance_', '');
        const result = await joinAllianceByInvite(ctx.from.id, inviteCode);
        if (result.success) await reply(ctx, `🎉 *به اتحاد "${result.alliance.name}" خوش آمدی!*`, { parse_mode: 'Markdown' });
        else await reply(ctx, result.message);
      }

      await processKitchenProduction(ctx.from.id);
      await processFoodConsumption(ctx.from.id);
      await processHeroRest(ctx.from.id);

      const fresh = await getOrCreatePlayer(ctx.from);
      const xpToNext = fresh.xp_to_next || 100;
      const greetings = ['⚔️ فرمانده، آماده نبرد هستی؟', '🛡️ قلمرو تو منتظر دستوراتته!', '🔥 امروز روز فتح سرزمین‌هاست!', '👑 ارتش تو آماده جنگه!', '⚡ قدرت تو هر روز بیشتر میشه!'];
      const g = greetings[Math.floor(Math.random() * greetings.length)];
      const msg = `⚔️ *E P W R*\n━━━━━━━━━━━━━━━\n${g}\n\n👑 *${fresh.commander_name}*\n⭐ Lv.${fresh.level} | ✨ ${fresh.xp || 0}/${xpToNext}\n💰 ${formatGold(fresh.gold)} | 💎 ${fresh.gems}\n🍖 ${fresh.food || 0}/${fresh.food_capacity || 1000}\n━━━━━━━━━━━━━━━\n🎯 فرماندهی کن، فتح کن، حکومت کن!`;
      await reply(ctx, msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
    } catch (e) {
      await reply(ctx, '⚠️ خطا: ' + e.message);
    }
  });

  bot.action(/^mainmenu\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await processHeroRest(ctx.from.id);
    const player = await getOrCreatePlayer(ctx.from);
    const xpToNext = player.xp_to_next || 100;
    const greetings = ['⚔️ آماده نبرد بعدی هستی؟', '🛡️ قلمرو تو امنه، ولی برای چقدر؟', '🔥 دشمنان منتظر حمله تو هستن!', '👑 فرمانده، ارتشت آماده‌ست!', '⚡ قدرتت داره بیشتر میشه!'];
    const g = greetings[Math.floor(Math.random() * greetings.length)];
    const msg = `⚔️ *E P W R*\n━━━━━━━━━━━━━━━\n${g}\n\n👑 *${player.commander_name}*\n⭐ Lv.${player.level} | ✨ ${player.xp || 0}/${xpToNext}\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n🍖 ${player.food || 0}/${player.food_capacity || 1000}\n━━━━━━━━━━━━━━━\n🎯 فرماندهی کن، فتح کن، حکومت کن!`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
  });
};