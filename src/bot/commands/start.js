const { getOrCreatePlayer } = require('../../game/player');
const { joinAllianceByInvite } = require('../../game/alliance');
const { processFoodConsumption } = require('../../game/food');
const { processKitchenProduction } = require('../../game/buildings');
const { formatGold, reply, cb } = require('../../core/helpers');
const { buildMainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      
      // ═══ چک دعوت اتحاد ═══
      const startPayload = ctx.startPayload;
      if (startPayload && startPayload.startsWith('alliance_')) {
        const inviteCode = startPayload.replace('alliance_', '');
        const result = await joinAllianceByInvite(ctx.from.id, inviteCode);
        if (result.success) {
          await reply(ctx, `🎉 *به اتحاد "${result.alliance.name}" خوش آمدی!*\n\nبرای مدیریت اتحاد، /alliance بزن.`, { parse_mode: 'Markdown' });
        } else {
          await reply(ctx, result.message);
        }
      }
      
      await processKitchenProduction(ctx.from.id);
      await processFoodConsumption(ctx.from.id);

      const xpToNext = player.xp_to_next || 100;
      const xpPercent = Math.floor(((player.xp || 0) / xpToNext) * 100);
      
      // ═══ پیام خوش‌آمدگویی حماسی ═══
      const greetings = [
        '⚔️ فرمانده، آماده نبرد هستی؟',
        '🛡️ قلمرو تو منتظر دستوراتته!',
        '🔥 امروز روز فتح سرزمین‌هاست!',
        '👑 ارتش تو آماده جنگه!',
        '⚡ قدرت تو هر روز بیشتر میشه!'
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      const msg = `⚔️ *E P W R*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `${randomGreeting}\n\n` +
        `👑 *${player.commander_name}*\n` +
        `⭐ Lv.${player.level} | ✨ ${player.xp || 0}/${xpToNext}\n` +
        `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n` +
        `🍖 ${player.food || 0}/${player.food_capacity || 1000}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🎯 فرماندهی کن، فتح کن، حکومت کن!`;
      
      await reply(ctx, msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
    } catch (e) {
      await reply(ctx, '⚠️ خطا: ' + e.message);
    }
  });

  bot.action(/^mainmenu\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const xpToNext = player.xp_to_next || 100;
    const xpPercent = Math.floor(((player.xp || 0) / xpToNext) * 100);
    
    const greetings = [
      '⚔️ آماده نبرد بعدی هستی؟',
      '🛡️ قلمرو تو امنه، ولی برای چقدر؟',
      '🔥 دشمنان منتظر حمله تو هستن!',
      '👑 فرمانده، ارتشت آماده‌ست!',
      '⚡ قدرتت داره بیشتر میشه!'
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const msg = `⚔️ *E P W R*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `${randomGreeting}\n\n` +
      `👑 *${player.commander_name}*\n` +
      `⭐ Lv.${player.level} | ✨ ${player.xp || 0}/${xpToNext}\n` +
      `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n` +
      `🍖 ${player.food || 0}/${player.food_capacity || 1000}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `🎯 فرماندهی کن، فتح کن، حکومت کن!`;
    
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
  });

  // ═══ دکمه‌های ثابت پایین چت ═══
  bot.action('battle_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const { showBattleMenu } = require('./battle');
    if (showBattleMenu) await showBattleMenu(ctx);
  });

  bot.action('shop_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const { showShop } = require('./shop');
    if (showShop) await showShop(ctx);
  });

  bot.action('guide_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const { showGuide } = require('./guide');
    if (showGuide) await showGuide(ctx);
  });
};