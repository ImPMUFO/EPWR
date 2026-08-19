const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '⚔️ نبرد', callback_data: 'battle' },
        { text: '🛒 فروشگاه', callback_data: 'shop' }
      ],
      [
        { text: '👥 قهرمانان', callback_data: 'myheroes' },
        { text: '🗺️ جهان', callback_data: 'world' }
      ],
      [
        { text: '🏰 قلمرو', callback_data: 'realm' },
        { text: '💰 منابع', callback_data: 'resources' }
      ],
      [
        { text: '🤝 اتحاد', callback_data: 'alliance' },
        { text: '📜 مأموریت', callback_data: 'quest' }
      ],
      [
        { text: '🎁 کد هدیه', callback_data: 'gift' },
        { text: '🏆 رتبه‌بندی', callback_data: 'ranking' }
      ],
      [
        { text: '⚙️ تنظیمات', callback_data: 'settings' }
      ]
    ]
  }
};

module.exports = { mainMenu };