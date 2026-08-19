const { cb } = require('../core/helpers');

function buildMainMenu(userId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⚔️ نبرد', callback_data: cb('battle', userId) },
          { text: '🛒 فروشگاه', callback_data: cb('shop', userId) }
        ],
        [
          { text: '👥 قهرمانان', callback_data: cb('myheroes', userId) },
          { text: '🗺️ جهان', callback_data: cb('world', userId) }
        ],
        [
          { text: '🏰 قلمرو', callback_data: cb('realm', userId) },
          { text: '💰 منابع', callback_data: cb('resources', userId) }
        ],
        [
          { text: '🤝 اتحاد', callback_data: cb('alliance', userId) },
          { text: '📜 مأموریت', callback_data: cb('quest', userId) }
        ],
        [
          { text: '🎁 کد هدیه', callback_data: cb('gift', userId) },
          { text: '🏆 رتبه‌بندی', callback_data: cb('ranking', userId) }
        ],
        [
          { text: '⚙️ تنظیمات', callback_data: cb('settings', userId) }
        ]
      ]
    }
  };
}

module.exports = { buildMainMenu };