import { Telegraf } from 'telegraf';

// ===== بررسی توکن =====
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN not set!');
}

const bot = new Telegraf(token);

// ===== ساده‌ترین پاسخ برای /start =====
bot.start((ctx) => {
  ctx.reply('⚔️ سلام فرمانده! ربات فعال است!');
});

// ===== پاسخ به پیام‌های معمولی =====
bot.on('text', (ctx) => {
  ctx.reply('از /start استفاده کن.');
});

// ===== هندلر اصلی با try/catch =====
export default async function handler(req, res) {
  console.log('📩 درخواست جدید:', req.method);
  
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
      res.status(200).send('OK');
    } else {
      // پاسخ به درخواست‌های GET (برای تست)
      res.status(200).send('Webhook is ready! Use POST.');
    }
  } catch (error) {
    console.error('❌ خطا:', error.message);
    res.status(200).send('OK'); // حتی با خطا، به تلگرام بگو OK
  }
}