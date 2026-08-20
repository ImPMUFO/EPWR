<div align="center">

# ⚔️ EPWR | نبرد حماسی

**بازی استراتژیک تلگرامی با قهرمان‌ها، جنگ، ساختمان‌ها و اقتصاد پویا**

[![Telegram](https://img.shields.io/badge/Telegram-Bot-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/EPWR_bot)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 🎮 درباره بازی

**EPWR** یک بازی استراتژیک و نقش‌آفرینی در تلگرامه که توش قهرمان جمع می‌کنی، ارتش می‌سازی، سرزمین‌ها رو فتح می‌کنی و با بازیکن‌های واقعی می‌جنگی!

### ✨ چرا EPWR؟

- 🦸 **۷ قهرمان منحصربه‌فرد** با قابلیت‌های متفاوت
- ⚔️ **جنگ NPC و PvP** با سیستم قدرت هوشمند
- 🏗️ **۶ ساختمان قابل ارتقا** برای تقویت قلمرو
- 🍖 **سیستم غذا و گرسنگی** واقعی
- 💰 **اقتصاد پویا** با سکه، الماس و مصالح
- 📜 **مأموریت‌های روزانه** با جوایز ویژه
- 🤝 **اتحاد و رتبه‌بندی** برای رقابت
- 🔔 **اعلان‌های هوشمند** برای حملات

---

## 🚀 ویژگی‌ها

### 🦸 قهرمان‌ها

| قهرمان | نوع | ویژگی |
|--------|------|--------|
| ⚔️ شمشیرزن | Melee | تعادل حمله و دفاع |
| 🏹 کماندار | Ranged | حمله بالا از دور |
| 🐎 سواره‌نظام | Cavalry | سرعت و قدرت |
| 🧙 جادوگر | Magic | حمله ویرانگر |
| 💣 بمب‌افکن | Ranged | انفجار عظیم |
| 🪓 تبردار | Melee | جنگجوی قدرتمند |
| 🛡 محافظ | Melee | دفاع بسیار بالا |

### 🏗️ ساختمان‌ها

| ساختمان | اثر |
|---------|------|
| 🏰 قلعه | دفاع قلمرو +20% هر سطح |
| 🏹 برج کمانداران | حمله +10% هر سطح |
| 🌾 مزرعه | ظرفیت غذا +500 هر سطح |
| ⚒️ آهنگری | قدرت قهرمانان +15% هر سطح |
| ⚔️ پادگان | ظرفیت قهرمان +2 هر سطح |
| 🍳 آشپزخانه | تولید 20 غذا در روز هر سطح |

---

## 🛠️ تکنولوژی‌ها

- **Backend:** Node.js + Telegraf
- **Database:** Supabase (PostgreSQL)
- **Deploy:** Vercel (Serverless)
- **Platform:** Telegram Bot API

---

## 📁 ساختار پروژه

```
EPWR/
├── api/
│   └── webhook.js          # ورودی Webhook تلگرام
├── src/
│   ├── bot/
│   │   ├── commands/       # دستورات ربات
│   │   │   ├── start.js    # شروع و منوی اصلی
│   │   │   ├── shop.js     # فروشگاه
│   │   │   ├── battle.js   # جنگ NPC
│   │   │   ├── pvp.js      # جنگ PvP
│   │   │   ├── buildings.js# ساختمان‌ها
│   │   │   ├── realm.js    # قلمرو و منابع
│   │   │   ├── world.js    # نقشه جهان
│   │   │   ├── ranking.js  # رتبه‌بندی
│   │   │   ├── alliance.js # اتحاد
│   │   │   ├── quest.js    # مأموریت‌ها
│   │   │   ├── gift.js     # کد هدیه
│   │   │   ├── notifications.js # اعلان‌ها
│   │   │   ├── guide.js    # راهنما
│   │   │   └── admin.js    # پنل مدیریت
│   │   ├── index.js        # راه‌اندازی ربات
│   │   └── keyboards.js    # کیبوردها
│   ├── core/
│   │   ├── helpers.js      # توابع کمکی
│   │   └── supabase.js     # کلاینت دیتابیس
│   └── game/
│       ├── battle.js       # منطق جنگ
│       ├── pvp.js          # منطق PvP
│       ├── shop.js         # منطق فروشگاه
│       ├── buildings.js    # منطق ساختمان‌ها
│       ├── food.js         # سیستم غذا
│       ├── player.js       # سیستم بازیکن
│       ├── heroes.js       # مدیریت قهرمان‌ها
│       ├── xp.js           # سیستم XP
│       ├── quest.js        # منطق مأموریت‌ها
│       ├── alliance.js     # منطق اتحاد
│       ├── notification.js # منطق اعلان‌ها
│       └── gift.js         # منطق کد هدیه
├── sql/
│   └── 001_initial_schema.sql
├── package.json
├── vercel.json
└── .gitignore
```

---

## ⚙️ نصب و راه‌اندازی

### پیش‌نیازها

- Node.js 18+
- حساب Supabase
- حساب Vercel
- توکن ربات تلگرام (از @BotFather)

### مراحل

1. **کلون کردن:**
```bash
git clone https://github.com/ImPMUFO/EPWR.git
cd EPWR
```

2. **نصب وابستگی‌ها:**
```bash
npm install
```

3. **تنظیم دیتابیس:**
   - فایل‌های `sql/` رو در Supabase SQL Editor اجرا کن

4. **تنظیم متغیرهای محیطی (Vercel):**
```
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

5. **تنظیم Webhook:**
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhook
```

---

## 🎯 دستورات ربات

| دستور | توضیح |
|-------|--------|
| `/start` | شروع بازی و منوی اصلی |
| `/shop` | فروشگاه |
| `/battle` | جنگ با NPC |
| `/buildings` | ساختمان‌ها |
| `/world` | نقشه جهان |
| `/ranking` | رتبه‌بندی |
| `/quest` | مأموریت‌های روزانه |
| `/guide` | راهنمای بازی |
| `/gift` | کد هدیه |
| `/notifications` | اعلان‌ها |
| `/admin` | پنل مدیریت (فقط سازنده) |

---

## 👑 پنل مدیریت

- 🎁 ساخت کد هدیه (مرحله به مرحله)
- 💰 سکه دادن به کاربران
- 📢 ارسال پیام همگانی
- 🎁 هدیه به همه کاربران
- 📊 آمار کامل بازی

---

## 🗺️ نقشه راه

- [x] سیستم قهرمان‌ها
- [x] جنگ NPC و PvP
- [x] ساختمان‌ها و ارتقا
- [x] سیستم غذا
- [x] مأموریت‌های روزانه
- [x] اتحاد و رتبه‌بندی
- [x] اعلان‌ها
- [ ] جنگ اتحادها
- [ ] رویدادهای فصلی
- [ ] بازار آزاد بین بازیکن‌ها

---

## 📄 لایسنس

این پروژه تحت لایسنس **MIT** منتشر شده.

---

<div align="center">

**ساخته شده با ❤️ توسط امیرمحمد**

⚔️ EPWR | نبرد حماسی 💎

</div>