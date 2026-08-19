const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getCharacterById, purchaseCharacter } = require('../../game/shop');
const { getPlayerHeroes, getHeroById, equipHero, unequipHero } = require('../../game/heroes');
const { rarityEmoji, rarityName, formatGold } = require('../../core/helpers');

module.exports = function registerShop(bot) {

  // دستور /shop
  bot.command('shop', async (ctx) => {
    try { await showShop(ctx); }
    catch (e) { ctx.reply('⚠️ خطا: ' + e.message); }
  });

  // دکمه فروشگاه
  bot.action('shop', async (ctx) => {
    await ctx.answerCbQuery();
    await showShop(ctx);
  });

  // خرید شخصیت
  bot.action(/^buy:(\d+)$/, async (ctx) => {
    const templateId = parseInt(ctx.match[1]);
    await handleBuy(ctx, templateId);
  });

  // لیست قهرمانان
  bot.command('myheroes', async (ctx) => {
    try { await showMyHeroes(ctx); }
    catch (e) { ctx.reply('⚠️ خطا: ' + e.message); }
  });

  bot.action('myheroes', async (ctx) => {
    await ctx.answerCbQuery();
    await showMyHeroes(ctx);
  });

  // جزئیات قهرمان
  bot.action(/^hero:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showHeroDetails(ctx, ctx.match[1]);
  });

  // تجهیز
  bot.action(/^equip:(.+)$/, async (ctx) => {
    await equipHero(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery('✅ تجهیز شد!', { show_alert: true });
    await showMyHeroes(ctx);
  });

  bot.action(/^unequip:(.+)$/, async (ctx) => {
    await unequipHero(ctx.match[1]);
    await ctx.answerCbQuery('🚫 غیرفعال شد', { show_alert: true });
    await showMyHeroes(ctx);
  });

  // ═══════════════ توابع کمکی ═══════════════

  async function showShop(ctx) {
    const characters = await getAllCharacters();
    const player = await getOrCreatePlayer(ctx.from);

    if (characters.length === 0) {
      return ctx.reply('⚠️ فروشگاه خالی است.');
    }

    let message = `🛒 *فروشگاه قهرمانان*\n\n💰 موجودی: ${formatGold(player.gold)} Gold | 💎 ${player.gems} Gems\n\n`;

    const buttons = [];
    characters.forEach(char => {
      const priceText = char.price_gold > 0 
        ? `💰 ${formatGold(char.price_gold)}`
        : `💎 ${char.price_gems}`;
      
      message += `${rarityEmoji(char.rarity)} *${char.name}* _(${rarityName(char.rarity)})_\n`;
      message += `   ❤ ${char.base_health} | 🗡 ${char.base_attack} | 🛡 ${char.base_defense}\n`;
      message += `   💵 قیمت: ${priceText}\n\n`;

      buttons.push([{
        text: `خرید ${char.name} (${priceText})`,
        callback_data: `buy:${char.id}`
      }]);
    });

    buttons.push([
      { text: '👥 قهرمانان من', callback_data: 'myheroes' },
      { text: '🔙 بازگشت', callback_data: 'mainmenu' }
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  async function handleBuy(ctx, templateId) {
    const template = await getCharacterById(templateId);
    if (!template) {
      return ctx.answerCbQuery('❌ شخصیت پیدا نشد!', { show_alert: true });
    }

    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseCharacter(ctx.from.id, player, template);

    if (!result.success) {
      return ctx.answerCbQuery(result.message, { show_alert: true });
    }

    await ctx.answerCbQuery(`✅ ${template.name} خریداری شد!`, { show_alert: true });

    await ctx.editMessageText(
      `🎉 *مبارک!*\n\n${rarityEmoji(template.rarity)} *${template.name}* به ارتش شما پیوست!\n\n❤️ ${template.base_health} | 🗡 ${template.base_attack} | 🛡 ${template.base_defense}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 قهرمانان من', callback_data: 'myheroes' }],
            [{ text: '🛒 ادامه خرید', callback_data: 'shop' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      }
    );
  }

  async function showMyHeroes(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);

    if (heroes.length === 0) {
      return ctx.reply(
        `👥 *قهرمانان من*\n\nهنوز قهرمانی نداری!\n\nاز فروشگاه شروع کن:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 رفتن به فروشگاه', callback_data: 'shop' }],
              [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
            ]
          }
        }
      );
    }

    let message = `👥 *قهرمانان من* _(تعداد: ${heroes.length})_\n\n`;
    const buttons = [];

    heroes.forEach(hero => {
      const t = hero.template;
      const equipped = hero.is_equipped ? ' ✅' : '';
      message += `${rarityEmoji(t.rarity)} *${t.name}* _Lv.${hero.level}_${equipped}\n`;
      message += `   ❤ ${hero.current_health}/${t.base_health * hero.level} | 🗡 ${t.base_attack} | 🛡 ${t.base_defense}\n\n`;

      buttons.push([{
        text: `${hero.is_equipped ? '✅' : '⚔️'} ${t.name}`,
        callback_data: `hero:${hero.id}`
      }]);
    });

    buttons.push([
      { text: '🛒 فروشگاه', callback_data: 'shop' },
      { text: '🔙 بازگشت', callback_data: 'mainmenu' }
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  async function showHeroDetails(ctx, heroId) {
    const hero = await getHeroById(heroId);
    if (!hero) {
      return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    }

    const t = hero.template;
    const maxHp = t.base_health * hero.level;
    
    let message = `${rarityEmoji(t.rarity)} *${t.name}* _(${rarityName(t.rarity)})_\n\n`;
    message += `📖 ${t.description}\n\n`;
    message += `⭐ سطح: ${hero.level}\n`;
    message += `❤ سلامتی: ${hero.current_health}/${maxHp}\n`;
    message += `🗡 حمله: ${t.base_attack + (hero.level - 1) * 2}\n`;
    message += `🛡 دفاع: ${t.base_defense + (hero.level - 1) * 2}\n`;
    message += `✨ XP: ${hero.xp}\n`;

    const buttons = [];
    if (!hero.is_equipped) {
      buttons.push([{ text: '⚔️ تجهیز کردن', callback_data: `equip:${hero.id}` }]);
    } else {
      buttons.push([{ text: '🚫 غیرفعال کردن', callback_data: `unequip:${hero.id}` }]);
    }
    buttons.push([
      { text: '👥 لیست قهرمانان', callback_data: 'myheroes' },
      { text: '🔙 بازگشت', callback_data: 'mainmenu' }
    ]);

    if (t.image_url) {
      try {
        await ctx.replyWithPhoto(t.image_url, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
        return;
      } catch (e) {
        console.error('Photo error:', e.message);
      }
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
};