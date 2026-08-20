const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems } = require('../../game/shop');
const { getPlayerHeroes, getHeroById } = require('../../game/heroes');
const { rarityEmoji, formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerShop(bot) {
  bot.command('shop', async (ctx) => { await showShop(ctx); });
  bot.action(/^shop\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });

  bot.action(/^shop_page\|(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1]);
    await showShop(ctx, page);
  });

  bot.action(/^buy_char\|(\d+)\|(\d+)$/, async (ctx) => {
    const template = await getCharacterById(parseInt(ctx.match[1]));
    if (!template) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseCharacter(ctx.from.id, player, template);
    await ctx.answerCbQuery(result.success ? `✅ ${template.name} خریداری شد!` : result.message, { show_alert: true });
    if (result.success) await showShop(ctx, 1);
  });

  bot.action(/^buy_item\|(\d+)\|(\d+)$/, async (ctx) => {
    const item = await getItemById(parseInt(ctx.match[1]));
    if (!item) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseItem(ctx.from.id, player, item);
    await ctx.answerCbQuery(result.success ? `✅ ${item.name} خریداری شد!` : result.message, { show_alert: true });
    if (result.success) {
      const page = item.type === 'resource' ? 3 : 2;
      await showShop(ctx, page);
    }
  });

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

  async function showShop(ctx, page = 1) {
    const player = await getOrCreatePlayer(ctx.from);
    const chars = await getAllCharacters();
    const items = await getAllItems();
    const uid = ctx.from.id;

    let msg = `🛒 *فروشگاه*\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n`;
    msg += `🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0} | 🍖 ${player.food || 0}\n\n`;

    const buttons = [];
    const totalPages = 3;

    if (page === 1) {
      msg += `🎭 *قهرمانان* (1/3)\n\n`;
      for (let i = 0; i < chars.length; i += 2) {
        const row = [];
        const c1 = chars[i];
        const price1 = c1.price_gold > 0 ? `💰${c1.price_gold}` : `💎${c1.price_gems}`;
        row.push({ text: `${rarityEmoji(c1.rarity)} ${c1.name} ${price1}`, callback_data: `buy_char|${c1.id}|${uid}` });
        if (i + 1 < chars.length) {
          const c2 = chars[i + 1];
          const price2 = c2.price_gold > 0 ? `💰${c2.price_gold}` : `💎${c2.price_gems}`;
          row.push({ text: `${rarityEmoji(c2.rarity)} ${c2.name} ${price2}`, callback_data: `buy_char|${c2.id}|${uid}` });
        }
        buttons.push(row);
      }
    } else if (page === 2) {
      msg += `🎁 *آیتم‌ها و معجون‌ها* (2/3)\n\n`;
      const potions = items.filter(i => i.type === 'potion');
      for (let i = 0; i < potions.length; i += 2) {
        const row = [];
        row.push({ text: `${potions[i].name} 💰${potions[i].price_gold}`, callback_data: `buy_item|${potions[i].id}|${uid}` });
        if (i + 1 < potions.length) {
          row.push({ text: `${potions[i + 1].name} 💰${potions[i + 1].price_gold}`, callback_data: `buy_item|${potions[i + 1].id}|${uid}` });
        }
        buttons.push(row);
      }
    } else if (page === 3) {
      msg += `📦 *منابع* (3/3)\n\n`;
      const resources = items.filter(i => i.type === 'resource');
      for (let i = 0; i < resources.length; i += 2) {
        const row = [];
        row.push({ text: `${resources[i].name} 💰${resources[i].price_gold}`, callback_data: `buy_item|${resources[i].id}|${uid}` });
        if (i + 1 < resources.length) {
          row.push({ text: `${resources[i + 1].name} 💰${resources[i + 1].price_gold}`, callback_data: `buy_item|${resources[i + 1].id}|${uid}` });
        }
        buttons.push(row);
      }
      msg += `\n💡 *راهنمای منابع:*\n`;
      msg += `🪵 چوب → برای ساختمان‌ها\n`;
      msg += `🪨 سنگ → قلعه و برج\n`;
      msg += `⚙️ آهن → آهنگری\n`;
      msg += `🍖 غذا → قهرمان‌ها`;
    }

    const navRow = [];
    if (page > 1) navRow.push({ text: '◀️ قبلی', callback_data: `shop_page|${page - 1}|${uid}` });
    navRow.push({ text: `${page}/${totalPages}`, callback_data: `shop_page|${page}|${uid}` });
    if (page < totalPages) navRow.push({ text: 'بعدی ▶️', callback_data: `shop_page|${page + 1}|${uid}` });
    buttons.push(navRow);

    buttons.push([
      { text: '👥 قهرمانان من', callback_data: cb('myheroes', uid) },
      { text: '📦 آیتم‌های من', callback_data: cb('myitems', uid) }
    ]);
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