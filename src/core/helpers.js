function rarityEmoji(rarity) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[rarity] || '⚪';
}

function rarityName(rarity) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[rarity] || 'معمولی';
}

function formatGold(amount) {
  return Number(amount).toLocaleString('en-US');
}

// ریپلای روی پیام کاربر
function getReplyParams(ctx) {
  if (ctx.message) {
    return { message_id: ctx.message.message_id };
  }
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    return { message_id: ctx.callbackQuery.message.message_id };
  }
  return undefined;
}

async function reply(ctx, text, options = {}) {
  const reply_parameters = getReplyParams(ctx);
  return ctx.reply(text, { ...options, reply_parameters });
}

module.exports = { rarityEmoji, rarityName, formatGold, getReplyParams, reply };