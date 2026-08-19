const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems } = require('../../game/shop');
const { getPlayerHeroes, getHeroById } = require('../../game/heroes');
const { rarityEmoji, formatGold, reply, cb } = require('../../core/helpers');
const { buildMainMenu } = require('../keyboards');

module.exports = function registerShop(bot) {

  bot.command('shop', async (ctx) => { try { await showShop(ctx); } catch(e) { await reply(ctx, '⚠️ ' + e.message); } });
  bot.action(/shop:uid:(\d+)/, async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });

  bot.action(/buy_char:(\d+):uid:(\d+)/, async (ctx) => {
    const template = await getCharacterById(parseInt(ctx.match[1]));
    if (!template) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseCharacter(ctx.from.id, player, template);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${template.name} خریداری شد!`, { show_alert: true });
  });

  bot.action(/buy_item:(\d+):uid:(\d+)/, async (ctx) => {
    const item = await getItemById(parseInt(ctx.match[1]));
    if (!item) return ctx.answerCbQuery('❌ پیدا نشد', { show_alert: true });
    const player = await getOrCreatePlayer(ctx.from);
    const result = await purchaseItem(ctx.from.id, player, item);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    await ctx.answerCbQuery(`✅ ${item.name} خریداری شد!`, { show_alert: true });
  });

  bot.command('myheroes', async (ctx) => { try { await showMyHeroes(ctx); } catch(e) { await reply(ctx, '⚠️ ' + e.message); } });
  bot.action(/myheroes:uid:(\d+)/, async (ctx) => { await ctx.answerCbQuery(); await showMyHeroes(ctx); });

  bot.action(/hero:(.+):uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const hero = await getHeroById(ctx.match[1]);
    if (!hero) return;
    const t = hero.template;
    const maxHp = t.base_health * hero.level;
    const hpPercent = Math.floor((hero.current_health / maxHp) * 100);
    const uid = ctx.from.id;

    let msg = `${rarityEmoji(t.rarity)} *${t.name}* Lv.${hero.level}\n`;
    msg += `❤ ${hpPercent}% | 🗡 ${t.base_attack} | 🛡 ${t.base_defense}\n`;
    msg += `✨ XP: ${hero.xp || 0}`;

    const buttons = [];
    if (hero.current_health < maxHp) {
      buttons.push([{ text: '🧪 معجون', callback_data: `use_potion:${hero.id}:uid:${uid}` }]);
    }
    buttons.push([
      { text: '👥 قهرمانان', callback_data: cb('myheroes', uid) },
      { text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }
    ]);

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/use_potion:(.+):uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await usePotion(ctx.from.id, ctx.match[1]);
    if (result.success) {
      await ctx.answerCbQuery(`✅ درمان شد! ❤${result.newHp}/${result.maxHp}`, { show_alert: true });
    } else {
      await ctx.answerCbQuery(result.message, { show_alert: true });
    }
  });

  bot.action(/myitems:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const items = await getPlayerItems(ctx.from.id);
    if (items.length === 0) {
      return ctx.answerCbQuery('📦 آیتمی نداری!', { show_alert: true });
    }
    let msg = `📦 *آیتم‌ها*\n\n`;
    items.forEach(i => {
      msg += `• ${i.item.name} ${i.is_active ? '⚡' : ''}\n`;
    });
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]] }
    });
  });

  async function showShop(ctx) {
    const player = await getOrCreatePlayer(ctx.from);
    const characters = await getAllCharacters();
    const items = await getAllItems();
    const uid = ctx.from.id;

    let msg = `🛒 *فروشگاه*\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n\n`;
    const buttons = [];

    if (characters.length > 0) {
      msg += `🎭 *قهرمانان*\n`;
      for (let i = 0; i < characters.length; i += 2) {
        const row = [];
        const c1 = characters[i];
        const p1 = c1.price_gold > 0 ? `💰${c1.price_gold}` : `💎${c1.price_gems}`;
        row.push({ text: `${rarityEmoji(c1.rarity)} ${c1.name} ${p1}`, callback_data: `buy_char:${c1.id}:uid:${uid}` });
        if (i + 1 < characters.length) {
          const c2 = characters[i + 1];
          const p2 = c2.price_gold > 0 ? `💰${c2.price_gold}` : `💎${c2.price_gems}`;
          row.push({ text: `${rarityEmoji(c2.rarity)} ${c2.name} ${p2}`, callback_data: `buy_char:${c2.id}:uid:${uid}` });
        }
        buttons.push(row);
      }
      msg += `\n`;
    }

    if (items.length > 0) {
      msg += `🎁 *آیتم‌ها*\n`;
      for (let i = 0; i < items.length; i += 2) {
        const row = [];
        row.push({ text: `📦 ${items[i].name} 💰${items[i].price_gold}`, callback_data: `buy_item:${items[i].id}:uid:${uid}` });
        if (i + 1 < items.length) {
          row.push({ text: `📦 ${items[i+1].name} 💰${items[i+1].price_gold}`, callback_data: `buy_item:${items[i+1].id}:uid:${uid}` });
        }
        buttons.push(row);
      }
    }

    buttons.push([
      { text: '👥 قهرمانان من', callback_data: cb('myheroes', uid) },
      { text: '📦 آیتم‌های من', callback_data: cb('myitems', uid) }
    ]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  async function showMyHeroes(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    if (heroes.length === 0) {
      return ctx.answerCbQuery('👥 قهرمانی نداری!', { show_alert: true });
    }

    const uid = ctx.from.id;
    let msg = `👥 *قهرمانان*\n\n`;
    const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const maxHp1 = h1.template.base_health * h1.level;
      const hp1 = Math.floor((h1.current_health / maxHp1) * 100);
      row.push({ text: `${rarityEmoji(h1.template.rarity)} ${h1.template.name} ❤${hp1}%`, callback_data: `hero:${h1.id}:uid:${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const maxHp2 = h2.template.base_health * h2.level;
        const hp2 = Math.floor((h2.current_health / maxHp2) * 100);
        row.push({ text: `${rarityEmoji(h2.template.rarity)} ${h2.template.name} ❤${hp2}%`, callback_data: `hero:${h2.id}:uid:${uid}` });
      }
      buttons.push(row);
    }
    buttons.push([
      { text: '🛒 فروشگاه', callback_data: cb('shop', uid) },
      { text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }
    ]);

    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};