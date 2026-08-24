const { cb } = require('../core/helpers');

function buildMainMenu(userId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ نبرد', callback_data: cb('battle', userId) }, { text: '🛒 فروشگاه', callback_data: cb('shop', userId) }],
        [{ text: '👥 قهرمانان', callback_data: cb('myheroes', userId) }, { text: '🏗️ ساختمان‌ها', callback_data: cb('buildings', userId) }],
        [{ text: '⚖️ بازارچه', callback_data: cb('market', userId) }, { text: '🏰 قلمرو من', callback_data: cb('realm', userId) }],
        [{ text: '🤝 اتحاد', callback_data: cb('alliance', userId) }, { text: '📜 مأموریت', callback_data: cb('quest', userId) }],
        [{ text: '🔔 اعلان‌ها', callback_data: cb('notifications', userId) }, { text: '🏆 رتبه‌بندی', callback_data: cb('ranking', userId) }],
        [{ text: '🎁 کد هدیه', callback_data: cb('gift', userId) }, { text: '📚 راهنما', callback_data: cb('guide', userId) }]
      ]
    }
  };
}

module.exports = { buildMainMenu };