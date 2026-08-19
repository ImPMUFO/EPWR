function rarityEmoji(rarity) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[rarity] || '⚪';
}

function rarityName(rarity) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[rarity] || 'معمولی';
}

function formatGold(amount) {
  return Number(amount).toLocaleString('en-US');
}

// Cache ساده برای کاهش query ها
const cache = new Map();

function getCached(key, ttlMs = 60000) {
  const item = cache.get(key);
  if (item && Date.now() - item.time < ttlMs) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function clearCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

// ساخت callback_data کوتاه با uid
function cb(action, userId) {
  return `${action}:${userId}`;
}

// استخراج uid از callback_data
function parseCb(callbackData) {
  const lastColon = callbackData.lastIndexOf(':');
  if (lastColon === -1) return { action: callbackData, ownerId: null };
  const possibleId = callbackData.slice(lastColon + 1);
  const num = parseInt(possibleId);
  if (!isNaN(num) && num > 100000000) {
    return { action: callbackData.slice(0, lastColon), ownerId: num };
  }
  return { action: callbackData, ownerId: null };
}

// چک سریع مالک
function isOwner(ctx) {
  if (!ctx.callbackQuery) return true;
  const { ownerId } = parseCb(ctx.callbackQuery.data);
  if (ownerId === null) return true;
  return ctx.from.id === ownerId;
}

function getReplyParams(ctx) {
  if (ctx.message) return { message_id: ctx.message.message_id };
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    return { message_id: ctx.callbackQuery.message.message_id };
  }
  return undefined;
}

async function reply(ctx, text, options = {}) {
  const reply_parameters = getReplyParams(ctx);
  return ctx.reply(text, { ...options, reply_parameters });
}

module.exports = { 
  rarityEmoji, rarityName, formatGold, 
  getCached, setCache, clearCache,
  cb, parseCb, isOwner, 
  getReplyParams, reply 
};