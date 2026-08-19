const { getOrCreatePlayer } = require('../../game/player');
const { collectGold } = require('../../game/realm');
const { getSupabase } = require('../../core/supabase');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerRealm(bot) {

  // ═══ قلمرو ═══
  bot.action('realm', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const db = getSupabase();

    // دریافت دستگاه‌های فعال
    const { data: devices } = await db
      .from('player_items')
      .select('id, item:shop_items (name, effect_value, type), is_active, last_collected_at')
      .eq('telegram_id', ctx.from.id)
      .eq('is_active', true);

    // دریافت قهرمان‌ها
    const { data: heroes } = await db
      .from('player_characters')
      .select('id, level, current_health, template:character_templates (name, base_health)')
      .eq('telegram_id', ctx.from.id);

    let msg = `🏰 *قلمرو: ${player.realm_name}*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `⭐ سطح: ${player.level}\n`;
    msg += `💰 Gold: ${formatGold(player.gold)}\n`;
    msg += `💎 Gems: ${player.gems}\n`;
    msg += `🍖 Food: ${formatGold(player.food)}\n`;
    msg += `🪵 Wood: ${formatGold(player.wood)}\n`;
    msg += `🪨 Stone: ${formatGold(player.stone)}\n`;
    msg += `⚙️ Iron: ${formatGold(player.iron)}\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;

    // دستگاه‌ها
    if (devices && devices.length > 0) {
      msg += `🏭 *دستگاه‌های فعال:*\n`;
      devices.forEach(d => {
        msg += `   ⚡ ${d.item.name} (+${d.item.effect_value}/ساعت)\n`;
      });
      msg += `\n`;
    } else {
      msg += `🏭 دستگاهی ندارید!\nاز فروشگاه دستگاه سکه‌ساز بخرید.\n\n`;
    }

    // قهرمان‌ها
    if (heroes && heroes.length > 0) {
      msg += `⚔️ *قهرمانان: ${heroes.length}*\n`;
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💰 جمع‌آوری منابع', callback_data: 'resources' }],
          [{ text: '🛒 فروشگاه', callback_data: 'shop' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });

  // ═══ منابع ═══
  bot.action('resources', async (ctx) => {
    await ctx.answerCbQuery();
    const result = await collectGold(ctx.from.id);
    const player = await getOrCreatePlayer(ctx.from);

    let msg = `💰 *مرکز منابع*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;

    if (result.totalGold > 0) {
      msg += `✅ *جمع‌آوری شد!*\n\n`;
      result.details.forEach(d => {
        msg += `   💵 ${d}\n`;
      });
      msg += `\n💰 مجموع: +${formatGold(result.totalGold)} Gold\n`;
    } else {
      msg += `⏳ منابعی برای جمع‌آوری نیست.\n`;
      msg += `دستگاه‌ها هر ساعت سکه تولید می‌کنند!\n`;
    }

    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `💰 موجودی فعلی: *${formatGold(player.gold)} Gold*\n`;
    msg += `💎 الماس: *${player.gems}*\n`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏰 قلمرو', callback_data: 'realm' }],
          [{ text: '🛒 فروشگاه', callback_data: 'shop' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });
};