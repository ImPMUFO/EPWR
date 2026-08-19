function rarityEmoji(rarity) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[rarity] || '⚪';
}

function rarityName(rarity) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[rarity] || 'معمولی';
}

function formatGold(amount) {
  return Number(amount).toLocaleString('en-US');
}

function cb(action, userId) {
  return `${action}|${userId}`;
}

function isOwner(ctx) {
  if (!ctx.callbackQuery) return true;
  const data = ctx.callbackQuery.data;
  const parts = data.split('|');
  if (parts.length < 2) return true;
  const ownerId = parseInt(parts[parts.length - 1]);
  return ctx.from.id === ownerId;
}

function getReplyParams(ctx) {
  if (ctx.message) return { message_id: ctx.message.message_id };
  return undefined;
}

async function reply(ctx, text, options = {}) {
  const reply_parameters = getReplyParams(ctx);
  return ctx.reply(text, { ...options, reply_parameters });
}

module.exports = { rarityEmoji, rarityName, formatGold, cb, isOwner, reply };