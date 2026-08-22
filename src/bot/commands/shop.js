const { getOrCreatePlayer } = require('../../game/player');
const { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems } = require('../../game/shop');
const { getSupabase } = require('../../core/supabase');
const { TROOP_TYPES, troopsCount, troopsText, heroMaxTroops } = require('../../game/troops');
const { processHeroRest, getBarracksLevel } = require('../../game/rest');
const { rarityEmoji, formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerShop(bot) {
  bot.command('shop', async (ctx) => { await showShop(ctx); });
  bot.action(/^shop\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx); });
  bot.action(/^shop_page\|(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showShop(ctx, parseInt(ctx.match[1])); });

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

  bot.action(/^hero\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters')
      .select('id, level, current_health, xp, is_defender, troops_data, troop_level, template:character_templates (id, name, base_attack, base_defense, base_health, rarity, image_url, troop_type, troop_power, troops_per_level, required_barracks)')
      .eq('id', ctx.match[1]).single();
    if (!hero) return;
    const t = hero.template;
    const hp = Math.floor((hero.current_health / (t.base_health * hero.level)) * 100);
    const troop = TROOP_TYPES[t.troop_type] || TROOP_TYPES.spear;
    const troopUpCost = (hero.troop_level || 1) * 150;
    const barracks = await getBarracksLevel(ctx.from.id);

    let msg = `${rarityEmoji(t.rarity)} *${t.name}* Lv.${hero.level}\n❤ ${hp}% | 🗡${t.base_attack} 🛡${t.base_defense}\n`;
    msg += `${hero.is_defender ? '🛡 دفاعی' : '⚔️ حمله'}\n`;
    msg += `🪖 سرباز: ${troop.name} ×${troopsCount(hero.troops_data)}/${heroMaxTroops(hero)}\n`;
    msg += `⚡ قدرت سرباز: ${t.troop_power}×Lv.${hero.troop_level || 1}`;
    if (hero.current_health === 0) {
      const req = t.required_barracks || 1;
      if (barracks === 0) msg += `\n⚠️ پادگان نداری! بسازش تا قهرمان برگرده.`;
      else if (barracks < req) msg += `\n⚠️ پادگان Lv.${req} لازمه! (داری: Lv.${barracks})`;
      else msg += `\n🛌 در حال استراحت در پادگان...`;
    } else {
      msg += `\n🏰 پادگان لازم: Lv.${t.required_barracks || 1}`;
    }

    const buttons = [];
    buttons.push([
      { text: hero.is_defender ? '⚔️ حالت حمله' : '🛡 حالت دفاع', callback_data: `hero_def|${hero.id}|${ctx.from.id}` },
      { text: '🎭 ظاهر و سلاح', callback_data: `cosmetics|${hero.id}|${ctx.from.id}` }
    ]);
    buttons.push([{ text: `🪖 استخدام ${troop.name} (${troop.cost}💰)`, callback_data: `recruit|${hero.id}|${ctx.from.id}` }]);
    buttons.push([{ text: `⬆️ ارتقای سرباز (${troopUpCost}💰)`, callback_data: `troop_up|${hero.id}|${ctx.from.id}` }]);
    if (hero.current_health > 0 && hero.current_health < t.base_health * hero.level) buttons.push([{ text: '🧪 معجون', callback_data: `use_potion|${hero.id}|${ctx.from.id}` }]);
    buttons.push([{ text: '👥 قهرمانان', callback_data: cb('myheroes', ctx.from.id) }, { text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]);
    const markup = { inline_keyboard: buttons };

    if (t.image_url) {
      try { await ctx.editMessageMedia({ type: 'photo', media: t.image_url, caption: msg, parse_mode: 'Markdown' }, { reply_markup: markup }); }
      catch(e) {
        try { await ctx.telegram.sendPhoto(ctx.chat.id, t.image_url, { caption: msg, parse_mode: 'Markdown', reply_markup: markup }); }
        catch(e2) { await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: markup }); }
      }
    } else await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: markup });
  });

  bot.action(/^hero_def\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('is_defender').eq('id', ctx.match[1]).maybeSingle();
    if (!hero) return;
    await db.from('player_characters').update({ is_defender: !hero.is_defender }).eq('id', ctx.match[1]);
    await ctx.answerCbQuery(!hero.is_defender ? '🛡 برای دفاع تنظیم شد!' : '⚔️ برای حمله تنظیم شد!', { show_alert: true });
  });

  bot.action(/^recruit\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('*, template:character_templates (troop_type, troop_power, troops_per_level)').eq('id', ctx.match[1]).maybeSingle();
    if (!hero) return;
    if (hero.current_health === 0) return ctx.answerCbQuery('❌ قهرمان در حال استراحته!', { show_alert: true });
    const tt = TROOP_TYPES[hero.template.troop_type] || TROOP_TYPES.spear;
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', ctx.from.id).single();
    if (player.gold < tt.cost) return ctx.answerCbQuery(`❌ سکه کافی نداری! (${tt.cost})`, { show_alert: true });
    const data = hero.troops_data || {};
    if (troopsCount(data) >= heroMaxTroops(hero)) return ctx.answerCbQuery('❌ ظرفیت پره! با ارتقای قهرمان بیشتر میشه.', { show_alert: true });
    data[hero.template.troop_type] = (data[hero.template.troop_type] || 0) + 1;
    await db.from('players').update({ gold: player.gold - tt.cost }).eq('telegram_id', ctx.from.id);
    await db.from('player_characters').update({ troops_data: data }).eq('id', ctx.match[1]);
    await ctx.answerCbQuery(`✅ ${tt.name} پیوست!`, { show_alert: true });
  });

  bot.action(/^troop_up\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('*').eq('id', ctx.match[1]).maybeSingle();
    if (!hero) return;
    const cost = (hero.troop_level || 1) * 150;
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', ctx.from.id).single();
    if (player.gold < cost) return ctx.answerCbQuery(`❌ سکه کافی نداری! (${cost})`, { show_alert: true });
    await db.from('players').update({ gold: player.gold - cost }).eq('telegram_id', ctx.from.id);
    await db.from('player_characters').update({ troop_level: (hero.troop_level || 1) + 1 }).eq('id', ctx.match[1]);
    await ctx.answerCbQuery(`✅ سطح سرباز شد ${(hero.troop_level || 1) + 1}!`, { show_alert: true });
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
    const buttons = []; const totalPages = 2;
    if (page === 1) {
      msg += `🎭 *قهرمانان* (1/2)\n💡 هر قهرمان فقط یک بار قابل خریده!\n\n`;
      for (let i = 0; i < chars.length; i += 2) {
        const row = [];
        const c1 = chars[i]; const p1 = c1.price_gold > 0 ? `💰${c1.price_gold}` : `💎${c1.price_gems}`;
        row.push({ text: `${rarityEmoji(c1.rarity)} ${c1.name} ${p1}`, callback_data: `buy_char|${c1.id}|${uid}` });
        if (i + 1 < chars.length) { const c2 = chars[i + 1]; const p2 = c2.price_gold > 0 ? `💰${c2.price_gold}` : `💎${c2.price_gems}`; row.push({ text: `${rarityEmoji(c2.rarity)} ${c2.name} ${p2}`, callback_data: `buy_char|${c2.id}|${uid}` }); }
        buttons.push(row);
      }
    } else {
      msg += `📦 *منابع و دستگاه‌ها* (2/2)\n\n`;
      const usable = items.filter(i => i.type === 'resource' || i.type === 'generator');
      for (let i = 0; i < usable.length; i += 2) {
        const row = [];
        row.push({ text: `${usable[i].name} 💰${usable[i].price_gold}`, callback_data: `buy_item|${usable[i].id}|${uid}` });
        if (i + 1 < usable.length) row.push({ text: `${usable[i + 1].name} 💰${usable[i + 1].price_gold}`, callback_data: `buy_item|${usable[i + 1].id}|${uid}` });
        buttons.push(row);
      }
    }
    const navRow = [];
    if (page > 1) navRow.push({ text: '◀️ قبلی', callback_data: `shop_page|${page - 1}|${uid}` });
    navRow.push({ text: `${page}/${totalPages}`, callback_data: `shop_page|${page}|${uid}` });
    if (page < totalPages) navRow.push({ text: 'بعدی ▶️', callback_data: `shop_page|${page + 1}|${uid}` });
    buttons.push(navRow);
    buttons.push([{ text: '👥 قهرمانان من', callback_data: cb('myheroes', uid) }, { text: '📦 آیتم‌های من', callback_data: cb('myitems', uid) }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  async function showMyHeroes(ctx) {
    await processHeroRest(ctx.from.id);
    const db = getSupabase();
    const { data: heroes } = await db.from('player_characters')
      .select('id, level, current_health, rest_until, is_defender, troops_data, template:character_templates (name, base_health, rarity, required_barracks)')
      .eq('telegram_id', ctx.from.id);
    if (!heroes || heroes.length === 0) return ctx.answerCbQuery('👥 قهرمانی نداری!', { show_alert: true });
    const uid = ctx.from.id;
    let msg = '👥 *قهرمانان*\n\n'; const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const s1 = h1.current_health > 0 ? `${h1.is_defender ? '🛡' : '⚔️'} ${h1.template.name} ❤${Math.floor((h1.current_health / (h1.template.base_health * h1.level)) * 100)}%` : `🛌 ${h1.template.name}`;
      row.push({ text: s1, callback_data: `hero|${h1.id}|${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const s2 = h2.current_health > 0 ? `${h2.is_defender ? '🛡' : '⚔️'} ${h2.template.name} ❤${Math.floor((h2.current_health / (h2.template.base_health * h2.level)) * 100)}%` : `🛌 ${h2.template.name}`;
        row.push({ text: s2, callback_data: `hero|${h2.id}|${uid}` });
      }
      buttons.push(row);
    }
    buttons.push([{ text: '🛒 فروشگاه', callback_data: cb('shop', uid) }, { text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};