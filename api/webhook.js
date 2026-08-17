// ===== api/webhook.js =====
const { Telegraf } = require('telegraf');

// ===== بررسی توکن =====
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN تنظیم نشده!');
  throw new Error('TELEGRAM_BOT_TOKEN not set!');
}

const bot = new Telegraf(token);

// ===== دستور /start =====
bot.start((ctx) => {
  ctx.reply('⚔️ سلام فرمانده! به EPWR خوش اومدی!');
});

// ===== پیام‌های معمولی =====
bot.on('text', (ctx) => {
  ctx.reply('❓ از /start استفاده کن.');
});

// ===== هندلر اصلی =====
module.exports = async function handler(req, res) {
  console.log('📩 درخواست جدید:', req.method);
  
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
      res.status(200).send('OK');
    } else {
      res.status(200).send('✅ Webhook آماده است! از POST استفاده کن.');
    }
  } catch (error) {
    console.error('❌ خطا:', error.message);
    res.status(200).send('OK');
  }
};