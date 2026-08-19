const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🏰 قلمرو', callback_data: 'realm' },
        { text: '⚔️ ارتش', callback_data: 'army' }
      ],
      [
        { text: '👥 قهرمانان', callback_data: 'myheroes' },
        { text: '🛒 فروشگاه', callback_data: 'shop' }
      ],
      [
        { text: '🗺️ جهان', callback_data: 'world' },
        { text: '💰 منابع', callback_data: 'resources' }
      ],
      [
        { text: '🏆 رتبه‌بندی', callback_data: 'ranking' },
        { text: '🤝 اتحاد', callback_data: 'alliance' }
      ],
      [
        { text: '⚙️ تنظیمات', callback_data: 'settings' }
      ]
    ]
  }
};

module.exports = { mainMenu };