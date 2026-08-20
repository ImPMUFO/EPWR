const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems } = require('../../game/shop');
const { getPlayerHeroes, getHeroById } = require('../../game/heroes');
const { rarityEmoji, formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerShop(bot) {
  bot.command('shop', async (ctx) => { await showShop(ctx); });
  bot.action(/^shop\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });

  bot.action(/^buy_char\|(\d+)\|(\d+)$/, async (ctx) => {
    const template = await getCharacterById(parseInt(ctx.match[1]));
    if (!template) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseCharacter(ctx.from.id, player, template);
    await ctx.answerCbQuery(result.success ? `✅ ${template.name}!` : result.message, { show_alert: true });
  });

  bot.action(/^buy_item\|(\d+)\|(\d+)$/, async (ctx) => {
    const item = await getItemById(parseInt(ctx.match[1]));
    if (!item) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseItem(ctx.from.id, player, item);
    await ctx.answerCbQuery(result.success ? `✅ ${item.name}!` : result.message, { show_alert: true });
  });

  bot.command('myheroes', async (ctx) => { await showMyHeroes(ctx); });
  bot.action(/^myheroes\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showMyHeroes(ctx); });

  bot.action(/^hero\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const hero = await getHeroById(ctx.match[1]);
    if (!hero) return;
    const t = hero.template;
    const hp = Math.floor((hero.current_health / (t.base_health * hero.level)) * 100);
    let msg = `${rarityEmoji(t.rarity)} *${t.name}* Lv.${hero.level}\n❤ ${hp}% | 🗡${t.base_attack} 🛡${t.base_defense}`;
    const buttons = [];
    if (hero.current_health < t.base_health * hero.level) {
      buttons.push([{ text: '🧪 معجون', callback_data: `use_potion|${hero.id}|${ctx.from.id}` }]);
    }
    buttons.push([{ text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }, { text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^use_potion\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await usePotion(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? `✅ ❤${result.newHp}` : result.message, { show_alert: true });
  });

  bot.action(/^myitems\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const items = await getPlayerItems(ctx.from.id);
    if (items.length === 0) return ctx.answerCbQuery('📦 آیتمی نداری!', { show_alert: true });
    let msg = '📦 *آیتم‌ها*\n\n';
    items.forEach(i => msg += `• ${i.item.name} ${i.is_active ? '⚡' : ''}\n`);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  });

  async function showShop(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const chars = await getAllCharacters();
    const items = await getAllItems();
    const uid = ctx.from.id;
    let msg = `🛒 *فروشگاه*\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n\n`;
    const buttons = [];
    if (chars.length > 0) {
      msg += '🎭 *قهرمانان*\n';
      for (let i = 0; i < chars.length; i += 2) {
        const row = [];
        const c1 = chars[i];
        row.push({ text: `${rarityEmoji(c1.rarity)} ${c1.name} 💰${c1.price_gold || c1.price_gems}`, callback_data: `buy_char|${c1.id}|${uid}` });
        if (i + 1 < chars.length) {
          const c2 = chars[i + 1];
          row.push({ text: `${rarityEmoji(c2.rarity)} ${c2.name} 💰${c2.price_gold || c2.price_gems}`, callback_data: `buy_char|${c2.id}|${uid}` });
        }
        buttons.push(row);
      }
      msg += '\n';
    }
    if (items.length > 0) {
      msg += '🎁 *آیتم‌ها*\n';
      for (let i = 0; i < items.length; i += 2) {
        const row = [];
        row.push({ text: `📦 ${items[i].name} 💰${items[i].price_gold}`, callback_data: `buy_item|${items[i].id}|${uid}` });
        if (i + 1 < items.length) row.push({ text: `📦 ${items[i+1].name} 💰${items[i+1].price_gold}`, callback_data: `buy_item|${items[i+1].id}|${uid}` });
        buttons.push(row);
      }
    }
    buttons.push([{ text: '👥 قهرمانان من', callback_data: cb('myheroes', uid) }, { text: '📦 آیتم‌ها', callback_data: cb('myitems', uid) }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  async function showMyHeroes(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    if (heroes.length === 0) return ctx.answerCbQuery('👥 قهرمانی نداری!', { show_alert: true });
    const uid = ctx.from.id;
    let msg = '👥 *قهرمانان*\n\n';
    const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const hp1 = Math.floor((h1.current_health / (h1.template.base_health * h1.level)) * 100);
      row.push({ text: `${rarityEmoji(h1.template.rarity)} ${h1.template.name} ❤${hp1}%`, callback_data: `hero|${h1.id}|${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const hp2 = Math.floor((h2.current_health / (h2.template.base_health * h2.level)) * 100);
        row.push({ text: `${rarityEmoji(h2.template.rarity)} ${h2.template.name} ❤${hp2}%`, callback_data: `hero|${h2.id}|${uid}` });
      }
      buttons.push(row);
    }
    buttons.push([{ text: '🛒 فروشگاه', callback_data: cb('shop', uid) }, { text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};