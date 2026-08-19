const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem } = require('../../game/shop');
const { getPlayerHeroes, getHeroById } = require('../../game/heroes');
const { rarityEmoji, rarityName, formatGold } = require('../../core/helpers');

module.exports = function registerShop(bot) {

  bot.command('shop', async (ctx) => { try { await showShop(ctx); } catch(e) { ctx.reply('⚠️ ' + e.message); } });
  bot.action('shop', async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });

  bot.action(/^buy_char:(\d+)$/, async (ctx) => {
    const template = await getCharacterById(parseInt(ctx.match[1]));
    if (!template) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseCharacter(ctx.from.id, player, template);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${template.name} خریداری شد!`, { show_alert: true });
    await showShop(ctx);
  });

  bot.action(/^buy_item:(\d+)$/, async (ctx) => {
    const item = await getItemById(parseInt(ctx.match[1]));
    if (!item) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseItem(ctx.from.id, player, item);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${item.name} خریداری شد!`, { show_alert: true });
    await showShop(ctx);
  });

  bot.command('myheroes', async (ctx) => { try { await showMyHeroes(ctx); } catch(e) { ctx.reply('⚠️ ' + e.message); } });
  bot.action('myheroes', async (ctx) => { await ctx.answerCbQuery(); await showMyHeroes(ctx); });

  bot.action(/^hero:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const hero = await getHeroById(ctx.match[1]);
    if (!hero) return;
    const t = hero.template;
    const maxHp = t.base_health * hero.level;
    let msg = `${rarityEmoji(t.rarity)} *${t.name}* Lv.${hero.level}\n\n`;
    msg += `❤ سلامتی: ${hero.current_health}/${maxHp}\n`;
    msg += `🗡 حمله: ${t.base_attack + (hero.level-1)*2}\n`;
    msg += `🛡 دفاع: ${t.base_defense + (hero.level-1)*2}\n`;
    msg += `✨ XP: ${hero.xp}`;
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '👥 لیست قهرمانان', callback_data: 'myheroes' }], [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]] }
    });
  });

  async function showShop(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const characters = await getAllCharacters();
    const items = await getAllItems();

    let msg = `🛒 *فروشگاه EPWR*\n\n💰 موجودی: ${formatGold(player.gold)} Gold | 💎 ${player.gems} Gems\n\n`;

    const buttons = [];

    if (characters.length > 0) {
      msg += `━━━ 🎭 قهرمانان ━━━\n\n`;
      characters.forEach(c => {
        const price = c.price_gold > 0 ? `💰${formatGold(c.price_gold)}` : `💎${c.price_gems}`;
        msg += `${rarityEmoji(c.rarity)} *${c.name}* | ❤${c.base_health} 🗡${c.base_attack} 🛡${c.base_defense} | ${price}\n`;
        buttons.push([{ text: `🎭 خرید ${c.name} (${price})`, callback_data: `buy_char:${c.id}` }]);
      });
      msg += `\n`;
    }

    if (items.length > 0) {
      msg += `━━━ 🎁 آیتم‌ها ━━━\n\n`;
      items.forEach(i => {
        msg += `📦 *${i.name}* | ${i.description} | 💰${formatGold(i.price_gold)}\n`;
        buttons.push([{ text: `📦 خرید ${i.name} (💰${formatGold(i.price_gold)})`, callback_data: `buy_item:${i.id}` }]);
      });
    }

    buttons.push([{ text: '👥 قهرمانان من', callback_data: 'myheroes' }, { text: '🔙 بازگشت', callback_data: 'mainmenu' }]);

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  async function showMyHeroes(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    if (heroes.length === 0) {
      return ctx.reply('👥 قهرمانی نداری! از فروشگاه بخر.', {
        reply_markup: { inline_keyboard: [[{ text: '🛒 فروشگاه', callback_data: 'shop' }]] }
      });
    }

    let msg = `👥 *قهرمانان من*\n\n`;
    const buttons = [];
    heroes.forEach(h => {
      const t = h.template;
      msg += `${rarityEmoji(t.rarity)} *${t.name}* Lv.${h.level} | ❤${h.current_health}/${t.base_health*h.level}\n`;
      buttons.push([{ text: `${rarityEmoji(t.rarity)} ${t.name}`, callback_data: `hero:${h.id}` }]);
    });
    buttons.push([{ text: '🛒 فروشگاه', callback_data: 'shop' }, { text: '🔙 بازگشت', callback_data: 'mainmenu' }]);

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};