const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems } = require('../../game/shop');
const { getSupabase } = require('../../core/supabase');
const { TROOP_TYPES, troopsPower, troopsCount, troopsText } = require('../../game/troops');
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
    if (result.success) await showShop(ctx, 2);
  });

  bot.command('myheroes', async (ctx) => { await showMyHeroes(ctx); });
  bot.action(/^myheroes\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showMyHeroes(ctx); });

  // ═══ جزئیات قهرمان (با دفاع/سرباز متنوع) ═══
  bot.action(/^hero\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters')
      .select('id, level, current_health, xp, is_defender, troops_data, max_troops, template:character_templates (id, name, base_attack, base_defense, base_health, rarity)')
      .eq('id', ctx.match[1]).single();
    if (!hero) return;
    const t = hero.template;
    const hp = Math.floor((hero.current_health / (t.base_health * hero.level)) * 100);
    let msg = `${rarityEmoji(t.rarity)} *${t.name}* Lv.${hero.level}\n❤ ${hp}% | 🗡${t.base_attack} 🛡${t.base_defense}\n`;
    msg += `${hero.is_defender ? '🛡 دفاعی' : '⚔️ حمله'} | ⚔️ سرباز: ${troopsCount(hero.troops_data)}/${hero.max_troops}\n`;
    msg += `🪖 ${troopsText(hero.troops_data)}`;
    const buttons = [];
    buttons.push([
      { text: hero.is_defender ? '⚔️ حالت حمله' : '🛡 حالت دفاع', callback_data: `hero_def|${hero.id}|${ctx.from.id}` }
    ]);
    buttons.push([
      { text: `🛡 نیزه‌دار (${TROOP_TYPES.spear.cost}💰)`, callback_data: `recruit_spear|${hero.id}|${ctx.from.id}` },
      { text: `🏹 کماندار (${TROOP_TYPES.archer.cost}💰)`, callback_data: `recruit_archer|${hero.id}|${ctx.from.id}` }
    ]);
    buttons.push([
      { text: `🐴 شوالیه (${TROOP_TYPES.knight.cost}💰)`, callback_data: `recruit_knight|${hero.id}|${ctx.from.id}` },
      { text: `🎯 منجنیق (${TROOP_TYPES.catapult.cost}💰)`, callback_data: `recruit_catapult|${hero.id}|${ctx.from.id}` }
    ]);
    if (hero.current_health < t.base_health * hero.level) {
      buttons.push([{ text: '🧪 معجون', callback_data: `use_potion|${hero.id}|${ctx.from.id}` }]);
    }
    buttons.push([{ text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }, { text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  // ═══ تغییر حالت دفاع/حمله ═══
  bot.action(/^hero_def\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('is_defender').eq('id', ctx.match[1]).maybeSingle();
    if (!hero) return;
    await db.from('player_characters').update({ is_defender: !hero.is_defender }).eq('id', ctx.match[1]);
    await ctx.answerCbQuery(!hero.is_defender ? '🛡 برای دفاع تنظیم شد!' : '⚔️ برای حمله تنظیم شد!', { show_alert: true });
  });

  // ═══ استخدام سرباز متنوع ═══
  bot.action(/^recruit_(\w+)\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const heroId = ctx.match[2];
    const tt = TROOP_TYPES[type];
    if (!tt) return;
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('*').eq('id', heroId).maybeSingle();
    if (!hero) return;
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', ctx.from.id).single();
    if (player.gold < tt.cost) return ctx.answerCbQuery(`❌ سکه کافی نداری! (${tt.cost})`, { show_alert: true });
    const data = hero.troops_data || {};
    if (troopsCount(data) >= hero.max_troops) return ctx.answerCbQuery('❌ ظرفیت سرباز پره!', { show_alert: true });
    data[type] = (data[type] || 0) + 1;
    await db.from('players').update({ gold: player.gold - tt.cost }).eq('telegram_id', ctx.from.id);
    await db.from('player_characters').update({ troops_data: data }).eq('id', heroId);
    await ctx.answerCbQuery(`✅ ${tt.name} به قهرمان پیوست!`, { show_alert: true });
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
    msg += `🪵 ${player.wood || 0} | 🪨 ${player.stone || 0} | ⚙️ ${player.iron || 0} | 🍖 ${player.food || 0} | 🥚 ${player.eggs || 0}\n\n`;

    const buttons = [];
    const totalPages = 2;

    if (page === 1) {
      msg += `🎭 *قهرمانان* (1/2)\n\n`;
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
      msg += `📦 *منابع و دستگاه‌ها* (2/2)\n\n`;
      const usable = items.filter(i => i.type === 'resource' || i.type === 'generator');
      for (let i = 0; i < usable.length; i += 2) {
        const row = [];
        row.push({ text: `${usable[i].name} 💰${usable[i].price_gold}`, callback_data: `buy_item|${usable[i].id}|${uid}` });
        if (i + 1 < usable.length) {
          row.push({ text: `${usable[i + 1].name} 💰${usable[i + 1].price_gold}`, callback_data: `buy_item|${usable[i + 1].id}|${uid}` });
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
    const db = getSupabase();
    const { data: heroes } = await db.from('player_characters')
      .select('id, level, current_health, is_defender, troops_data, template:character_templates (name, base_health, rarity)')
      .eq('telegram_id', ctx.from.id)
      .gt('current_health', 0);
    if (!heroes || heroes.length === 0) return ctx.answerCbQuery('👥 قهرمانی نداری!', { show_alert: true });
    const uid = ctx.from.id;
    let msg = '👥 *قهرمانان*\n\n';
    const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const hp1 = Math.floor((h1.current_health / (h1.template.base_health * h1.level)) * 100);
      const icon1 = h1.is_defender ? '🛡' : '⚔️';
      row.push({ text: `${icon1} ${h1.template.name} ❤${hp1}%`, callback_data: `hero|${h1.id}|${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const hp2 = Math.floor((h2.current_health / (h2.template.base_health * h2.level)) * 100);
        const icon2 = h2.is_defender ? '🛡' : '⚔️';
        row.push({ text: `${icon2} ${h2.template.name} ❤${hp2}%`, callback_data: `hero|${h2.id}|${uid}` });
      }
      buttons.push(row);
    }
    buttons.push([{ text: '🛒 فروشگاه', callback_data: cb('shop', uid) }, { text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};