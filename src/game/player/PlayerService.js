const { getSupabase } = require('../../core/supabase');
const logger = require('../../core/logger');

class PlayerService {
  constructor() {
    this.supabase = getSupabase();
  }

  async getOrCreate(telegramUser) {
    const telegramId = telegramUser.id;
    const username = telegramUser.username || null;
    const firstName = telegramUser.first_name || 'Commander';

    // بررسی وجود بازیکن
    const { data: existing, error: fetchErr } = await this.supabase
      .from('players')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      logger.error('خطا در دریافت بازیکن', fetchErr);
      throw fetchErr;
    }

    if (existing) {
      logger.info(`بازیکن موجود: ${telegramId}`);
      // به‌روزرسانی last_active
      await this.supabase
        .from('players')
        .update({
          telegram_username: username,
          first_name: firstName,
          last_active_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);
      return existing;
    }

    // ساخت بازیکن جدید
    logger.info(`ساخت بازیکن جدید: ${telegramId}`);
    const { data: newPlayer, error: createErr } = await this.supabase
      .from('players')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        first_name: firstName,
        commander_name: firstName,
        realm_name: `${firstName}'s Realm`
      })
      .select()
      .single();

    if (createErr) {
      logger.error('خطا در ساخت بازیکن', createErr);
      throw createErr;
    }

    // ساخت قلمرو اولیه
    await this.createInitialRealm(newPlayer);

    return newPlayer;
  }

  async createInitialRealm(player) {
    const position = await this.findFreePosition();
    
    await this.supabase.from('realms').insert({
      owner_telegram_id: player.telegram_id,
      name: player.realm_name,
      map_x: position.x,
      map_y: position.y,
      territory_level: 1,
      wall_level: 0,
      population: 100
    });

    logger.info(`قلمرو ساخته شد: ${position.x}, ${position.y}`);
  }

  async findFreePosition() {
    for (let radius = 0; radius < 100; radius++) {
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
          
          const { data } = await this.supabase
            .from('realms')
            .select('id')
            .eq('map_x', x)
            .eq('map_y', y)
            .maybeSingle();
          
          if (!data) return { x, y };
        }
      }
    }
    throw new Error('موقعیت آزاد پیدا نشد');
  }
}

module.exports = { PlayerService };