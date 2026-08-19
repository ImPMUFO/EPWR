const { getBot } = require('../src/bot/index');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const bot = await getBot();
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    }
    res.status(200).json({
      ok: true,
      service: 'EPWR',
      message: 'EPWR is alive ⚔️'
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error: ' + err.message);
  }
};