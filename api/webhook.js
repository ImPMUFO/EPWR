const { getBot } = require('../src/bot/index');
const { verifyWebhook } = require('../src/core/telegramAuth');
const logger = require('../src/core/logger');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      // Webhook signature verification
      const signature = req.headers['x-telegram-bot-api-secret-token'];
      if (!verifyWebhook(req.body, signature, process.env.TELEGRAM_WEBHOOK_SECRET)) {
        logger.warn('Webhook unauthorized attempt');
        return res.status(401).send('Unauthorized');
      }

      const bot = await getBot();
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).json({
        ok: true,
        service: 'EPWR Telegram Bot',
        message: 'EPWR is alive ⚔️',
        uptime: process.uptime()
      });
    }
  } catch (err) {
    logger.error('Webhook error', err);
    res.status(500).send('Internal Server Error');
  }
};