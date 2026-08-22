const { RESOURCE_NAMES, listResource, listHero, getActiveListings, getMyListings, buyListing, cancelListing } = require('../../game/market');
const { getPlayerHeroes } = require('../../game/battle');
const { formatGold, smartReply, cb } = require('../../core/helpers');

const marketState = new Map();

module.exports = function registerMarket(bot) {
  bot.command('market', async (ctx) => { await showMarket(ctx); });
  bot.action(/^market\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showMarket(ctx); });

  bot.action(/^mkt_sell_res\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const uid = ctx.from.id;
    await smartReply(ctx, '📦 *فروش مصالح*\n\nکدوم منبع رو می‌فروشی؟', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '🪵 چوب', callback_data: `mkt_res_wood|${uid}` }, { text: '🪨 سنگ', callback_data: `mkt_res_stone|${uid}` }],
        [{ text: '⚙️ آهن', callback_data: `mkt_res_iron|${uid}` }, { text: '🍖 غذا', callback_data: `mkt_res_food|${uid}` }],
        [{ text: '🥚 تخم مرغ', callback_data: `mkt_res_egg|${uid}` }],
        [{ text: '🔙', callback_data: cb('market', uid) }]
      ] }
    });
  });

  bot.action(/^mkt_res_(\w+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    marketState.set(ctx.from.id, { step: 'res_amount', data: { type: ctx.match[1] } });
    await smartReply(ctx, `📦 *فروش ${RESOURCE_NAMES[ctx.match[1]]}*\n\nچند تا می‌فروشی؟`, {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('market', ctx.from.id) }]] }
    });
  });

  bot.action(/^mkt_sell_hero\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroes = await getPlayerHeroes(ctx.from.id);
    const uid = ctx.from.id;
    if (heroes.length === 0) return ctx.answerCbQuery('❌ قهرمانی نداری!', { show_alert: true });
    const buttons = [];
    heroes.forEach((h, i) => {
      buttons.push([{ text: `🦸 ${h.template.name} Lv.${h.level}`, callback_data: `mkt_hero_${i}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('market', uid) }]);
    await smartReply(ctx, '🦸 *فروش قهرمان*\n\nکدوم رو می‌فروشی؟', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^mkt_hero_(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroes = await getPlayerHeroes(ctx.from.id);
    const hero = heroes[parseInt(ctx.match[1])];
    if (!hero) return;
    marketState.set(ctx.from.id, { step: 'hero_price', data: { heroId: hero.id, name: hero.template.name } });
    await smartReply(ctx, `🦸 *فروش ${hero.template.name}*\n\nقیمت رو به سکه بنویس:`, {
      reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('market', ctx.from.id) }]] }
    });
  });

  bot.action(/^mkt_buy_list\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const listings = await getActiveListings();
    const uid = ctx.from.id;
    if (listings.length === 0) return smartReply(ctx, '🛒 بازاری خالیه!', { reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('market', uid) }]] } });
    let msg = '🛒 *بازار تجارت*\n\n';
    const buttons = [];
    listings.forEach((l, i) => {
      if (l.item_type === 'resource') {
        msg += `${i + 1}. ${RESOURCE_NAMES[l.resource_type]} ×${l.amount} | 💰${l.price_gold}\n`;
      } else {
        msg += `${i + 1}. 🦸 قهرمان | 💰${l.price_gold}\n`;
      }
      buttons.push([{ text: `🛒 خرید ${i + 1} (💰${l.price_gold})`, callback_data: `mkt_buy_${i}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('market', uid) }]);
    marketState.set(uid, { step: null, data: { listings } });
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^mkt_buy_(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const state = marketState.get(ctx.from.id);
    const listing = state?.data?.listings?.[parseInt(ctx.match[1])];
    if (!listing) return ctx.answerCbQuery('❌ پیدا نشد!', { show_alert: true });
    const result = await buyListing(ctx.from.id, listing.id);
    await ctx.answerCbQuery(result.success ? '✅ خریدی!' : result.message, { show_alert: true });
  });

  bot.action(/^mkt_my\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const listings = await getMyListings(ctx.from.id);
    const uid = ctx.from.id;
    if (listings.length === 0) return smartReply(ctx, '📭 چیزی برای فروش نزاشتی!', { reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('market', uid) }]] } });
    let msg = '📋 *فروش‌های من*\n\n';
    const buttons = [];
    listings.forEach((l, i) => {
      if (l.item_type === 'resource') msg += `${RESOURCE_NAMES[l.resource_type]} ×${l.amount} | 💰${l.price_gold}\n`;
      else msg += `🦸 قهرمان | 💰${l.price_gold}\n`;
      buttons.push([{ text: `❌ لغو ${i + 1}`, callback_data: `mkt_cancel_${i}|${uid}` }]);
    });
    buttons.push([{ text: '🔙', callback_data: cb('market', uid) }]);
    marketState.set(uid, { step: null, data: { my: listings } });
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^mkt_cancel_(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const state = marketState.get(ctx.from.id);
    const listing = state?.data?.my?.[parseInt(ctx.match[1])];
    if (!listing) return;
    await cancelListing(ctx.from.id, listing.id);
    await ctx.answerCbQuery('❌ لغو شد و برگشت!', { show_alert: true });
    await showMarket(ctx);
  });

  bot.on('text', async (ctx, next) => {
    const state = marketState.get(ctx.from.id);
    if (!state || !state.step || ctx.message.text.startsWith('/')) return next();
    const text = ctx.message.text.trim();
    const num = parseInt(text);

    if (state.step === 'res_amount') {
      if (!num || num <= 0) return ctx.reply('❌ عدد معتبر بفرست!');
      state.data.amount = num;
      state.step = 'res_price';
      await ctx.reply(`📦 ${RESOURCE_NAMES[state.data.type]} ×${num}\n\n💰 قیمت کل رو بنویس:`);
      return;
    }

    if (state.step === 'res_price') {
      if (!num || num <= 0) return ctx.reply('❌ عدد معتبر بفرست!');
      const result = await listResource(ctx.from.id, state.data.type, state.data.amount, num);
      marketState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ ${RESOURCE_NAMES[state.data.type]} ×${state.data.amount} برای فروش گذاشته شد!` : result.message);
      return;
    }

    if (state.step === 'hero_price') {
      if (!num || num <= 0) return ctx.reply('❌ عدد معتبر بفرست!');
      const result = await listHero(ctx.from.id, state.data.heroId, num);
      marketState.delete(ctx.from.id);
      await ctx.reply(result.success ? `✅ ${state.data.name} برای فروش گذاشته شد!` : result.message);
      return;
    }

    return next();
  });

  async function showMarket(ctx) {
    const uid = ctx.from.id;
    let msg = `🏪 *بازار تجارت*\n\n`;
    msg += `💡 مصالح و قهرمان‌هات رو با قیمت دلخواه بفروش!\n`;
    msg += `🥚 تخم مرغ مرغداری رو هم می‌تونی بفروشی!`;
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
      [{ text: '📦 فروش مصالح', callback_data: cb('mkt_sell_res', uid) }, { text: '🦸 فروش قهرمان', callback_data: cb('mkt_sell_hero', uid) }],
      [{ text: '🛒 خرید', callback_data: cb('mkt_buy_list', uid) }, { text: '📋 فروش‌های من', callback_data: cb('mkt_my', uid) }],
      [{ text: '🔙', callback_data: cb('mainmenu', uid) }]
    ] } });
  }
};