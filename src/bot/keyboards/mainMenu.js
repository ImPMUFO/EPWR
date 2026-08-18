function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏰 قلمرو', callback_data: 'realm' },
          { text: '⚔️ ارتش', callback_data: 'army' }
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
}

module.exports = { getMainMenuKeyboard };