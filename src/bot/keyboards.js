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
        { text: '🎁 کد هدیه', callback_data: 'gift' },
        { text: '🏆 رتبه‌بندی', callback_data: 'ranking' }
      ],
      [
        { text: '🤝 اتحاد', callback_data: 'alliance' },
        { text: '⚙️ تنظیمات', callback_data: 'settings' }
      ]
    ]
  }
};

const adminMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🎁 ساخت کد هدیه', callback_data: 'admin_create_gift' }],
      [{ text: '📋 لیست کدهای هدیه', callback_data: 'admin_list_gifts' }],
      [{ text: '💰 اضافه کردن منابع', callback_data: 'admin_add_resources' }],
      [{ text: '📊 آمار ربات', callback_data: 'admin_stats' }],
      [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
    ]
  }
};

module.exports = { mainMenu, adminMenu };