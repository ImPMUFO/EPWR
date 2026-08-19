function rarityEmoji(rarity) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[rarity] || '⚪';
}

function rarityName(rarity) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[rarity] || 'معمولی';
}

function formatGold(amount) {
  return Number(amount).toLocaleString('en-US');
}

// ساخت callback_data با شناسه کاربر
function cb(action, userId) {
  return `${action}:uid:${userId}`;
}

// استخراج uid از callback_data
function parseCb(callbackData) {
  const parts = callbackData.split(':uid:');
  return {
    action: parts[0],
    ownerId: parts[1] ? parseInt(parts[1]) : null
  };
}

// چک مالک منو
function isOwner(ctx) {
  if (!ctx.callbackQuery) return true;
  const { ownerId } = parseCb(ctx.callbackQuery.data);
  if (ownerId === null) return true;
  return ctx.from.id === ownerId;
}

// ریپلای روی پیام کاربر
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

module.exports = { rarityEmoji, rarityName, formatGold, cb, parseCb, isOwner, getReplyParams, reply };