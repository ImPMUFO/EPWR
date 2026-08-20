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
  if (!data || !data.includes('|')) return true;
  const parts = data.split('|');
  const ownerId = parseInt(parts[parts.length - 1]);
  if (isNaN(ownerId)) return true;
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

// ═══ تابع هوشمند: ویرایش پیام به جای فرستادن پیام جدید ═══
async function smartReply(ctx, text, options = {}) {
  // اگه از دکمه اومده، پیام رو ویرایش کن
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    try {
      return await ctx.editMessageText(text, options);
    } catch(e) {
      // اگه ویرایش نشد، پیام جدید بفرست
      return await ctx.reply(text, options);
    }
  }
  // اگه دستور بود، reply کن
  const reply_parameters = getReplyParams(ctx);
  return ctx.reply(text, { ...options, reply_parameters });
}

module.exports = { rarityEmoji, rarityName, formatGold, cb, isOwner, reply, smartReply };