const { getSupabase } = require('../core/supabase');

const RESOURCE_NAMES = { wood: '🪵 چوب', stone: '🪨 سنگ', iron: '⚙️ آهن', food: '🍖 غذا', egg: '🥚 تخم مرغ', wheat: '🌾 گندم', flour: '🥡 آرد', bread: '🍞 نان' };

function colName(res) { return res === 'egg' ? 'eggs' : res; }

async function listResource(telegramId, resourceType, amount, price) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  const col = colName(resourceType);
  if ((player[col] || 0) < amount) return { success: false, message: '❌ به اندازه کافی نداری!' };
  await db.from('players').update({ [col]: player[col] - amount }).eq('telegram_id', telegramId);
  await db.from('market_listings').insert({ seller_id: telegramId, item_type: 'resource', resource_type: resourceType, amount, price_gold: price });
  return { success: true };
}

async function listHero(telegramId, heroId, price) {
  const db = getSupabase();
  const { data: hero } = await db.from('player_characters').select('*').eq('id', heroId).eq('telegram_id', telegramId).maybeSingle();
  if (!hero) return { success: false, message: '❌ قهرمان پیدا نشد!' };
  await db.from('market_listings').insert({ seller_id: telegramId, item_type: 'hero', hero_id: heroId, price_gold: price });
  return { success: true };
}

async function getActiveListings() {
  const db = getSupabase();
  const { data } = await db.from('market_listings').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20);
  return data || [];
}

async function getMyListings(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('market_listings').select('*').eq('seller_id', telegramId).eq('is_active', true);
  return data || [];
}

async function getListedHeroIds(telegramId) {
  const listings = await getMyListings(telegramId);
  return listings.filter(l => l.item_type === 'hero').map(l => l.hero_id);
}

// ═══ خرید با Claim اتمیک (رفع Race Condition) ═══
async function buyListing(buyerId, listingId) {
  const db = getSupabase();

  const { data: claimed } = await db.from('market_listings')
    .update({ is_active: false })
    .eq('id', listingId).eq('is_active', true)
    .select();
  if (!claimed || claimed.length === 0) return { success: false, message: '❌ دیگه موجود نیست!' };
  const listing = claimed[0];

  const revert = async () => { await db.from('market_listings').update({ is_active: true }).eq('id', listingId); };

  if (listing.seller_id === buyerId) { await revert(); return { success: false, message: '❌ جنس خودته!' }; }

  const { data: buyer } = await db.from('players').select('*').eq('telegram_id', buyerId).single();
  if (buyer.gold < listing.price_gold) { await revert(); return { success: false, message: '❌ سکه کافی نداری!' }; }

  if (listing.item_type === 'resource') {
    const col = colName(listing.resource_type);
    await db.from('players').update({ gold: buyer.gold - listing.price_gold, [col]: (buyer[col] || 0) + listing.amount }).eq('telegram_id', buyerId);
  } else {
    const { data: hero } = await db.from('player_characters').select('telegram_id').eq('id', listing.hero_id).maybeSingle();
    if (!hero || hero.telegram_id !== listing.seller_id) { await revert(); return { success: false, message: '❌ قهرمان دیگه در دسترس فروشنده نیست!' }; }
    await db.from('players').update({ gold: buyer.gold - listing.price_gold }).eq('telegram_id', buyerId);
    await db.from('player_characters').update({ telegram_id: buyerId, is_defender: false }).eq('id', listing.hero_id);
  }

  const { data: seller } = await db.from('players').select('gold').eq('telegram_id', listing.seller_id).single();
  if (seller) await db.from('players').update({ gold: seller.gold + listing.price_gold }).eq('telegram_id', listing.seller_id);

  return { success: true };
}

async function cancelListing(telegramId, listingId) {
  const db = getSupabase();
  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).eq('seller_id', telegramId).eq('is_active', true).maybeSingle();
  if (!listing) return { success: false };
  if (listing.item_type === 'resource') {
    const col = colName(listing.resource_type);
    const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
    await db.from('players').update({ [col]: (player[col] || 0) + listing.amount }).eq('telegram_id', telegramId);
  }
  await db.from('market_listings').update({ is_active: false }).eq('id', listingId);
  return { success: true };
}

module.exports = { RESOURCE_NAMES, listResource, listHero, getActiveListings, getMyListings, getListedHeroIds, buyListing, cancelListing };