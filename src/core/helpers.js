const { getSupabase } = require('./supabase');

// ═══ هوشمندترین smartReply ═══
// اگه callbackQuery باشه → حتماً همون پیام قبلی رو edit کنه
// اگه پیام عادی باشه → reply کنه
async function smartReply(ctx, text, extra = {}) {
  try {
    // حالت ۱: دکمه فشرده شده (callbackQuery) → editMessageText
    if (ctx.callbackQuery) {
      try {
        return await ctx.editMessageText(text, extra);
      } catch (e1) {
        // اگه editMessageText شکست خورد (مثلاً عکس بوده)، editMessageMedia رو امتحان کن
        if (extra.reply_markup) {
          try {
            return await ctx.editMessageCaption(text, extra);
          } catch (e2) {
            // اگه اون هم نشد، پیام جدید بفرست (آخرین راه)
            return await ctx.reply(text, extra);
          }
        }
        return await ctx.reply(text, extra);
      }
    }
    
    // حالت ۲: پیام عادی (/command یا message)
    // اگه updateType=message هست، reply کن
    if (ctx.message || ctx.updateType === 'message') {
      return await ctx.reply(text, extra);
    }
    
    // حالت ۳: هر حالت دیگه‌ای → reply
    return await ctx.reply(text, extra);
  } catch (err) {
    console.error('smartReply error:', err.message);
    try {
      return await ctx.reply(text, extra);
    } catch (e) {}
  }
}

// ═══ reply ساده ═══
async function reply(ctx, text, extra = {}) {
  try { return await ctx.reply(text, extra); } catch (e) { console.error('reply error:', e.message); }
}

// ═══ ساخت callback_data با چک کاربر ═══
function cb(action, userId) {
  return `${action}|${userId}`;
}

// ═══ چک می‌کنه کاربر همون کسی هست که منو براش ساخته ═══
function isOwner(ctx) {
  if (!ctx.callbackQuery) return true;
  const data = ctx.callbackQuery.data || '';
  const parts = data.split('|');
  const ownerId = parseInt(parts[parts.length - 1]);
  return ctx.from.id === ownerId || !ownerId;
}

// ═══ فرمت عدد با کاما ═══
function formatGold(n) {
  return (n || 0).toLocaleString('en-US');
}

// ═══ ایموجی کمیابی ═══
function rarityEmoji(r) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[r] || '⚪';
}

function rarityName(r) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[r] || 'معمولی';
}

module.exports = { smartReply, reply, cb, isOwner, formatGold, rarityEmoji, rarityName };