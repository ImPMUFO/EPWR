import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('سلام فرمانده! به EPWR خوش اومدی 🎮');
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body, res);
    res.status(200).send('OK');
  } else {
    res.status(405).send('فقط POST');
  }
}