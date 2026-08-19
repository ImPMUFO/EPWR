# ⚔️ EPWR | نبرد حماسی 💎

> **یک ربات تلگرام ترافورمی برای بازی نقش‌آفرینی آنلاین (MMORPG) با گیم‌پلی نوبتی و سیستم‌های پیشرفته**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)](#)

---

## 🎮 ویژگی‌های کلیدی

### ⚔️ **سیستم نبرد**
- نبردهای **نوبتی** با سیستم تاکتیکی عمیق
- مهارات خاص برای هر کلاس شخصیت
- سیستم آسیب و دفاع فیزیکی/جادویی
- رتبه‌بندی شکست خوردگی و پیروزی

### 🏰 **ساخت و سازی**
- مدیریت منابع (سکه، انرژی، آب)
- ساخت ساختمان‌های دفاعی
- سطح‌بندی قلعه و بهبود
- حملات و دفاع در زمان واقعی

### 👥 **چندنفره و اتحادیه‌ها**
- سیستم اتحادیه‌های چندنفره
- جنگ‌های گروهی بین اتحادیه‌ها
- چت داخل بازی و سیستم دوستیابی
- لیدربورد و رنک‌های عمومی

### 🎁 **جوایز و مأموریت**
- **جوایز روزانه** خودکار (لاگین بونوس)
- **مأموریت‌های ویژه** (روزانه، هفتگی، فصلی)
- **رویدادهای موقتی** و فصلی
- **باکس خزانه** و آیتم‌های نادر

### 📊 **سیستم پیشرفت**
- تجربه و سطح شخصیت
- نوار مهارات و درختی گسترش
- اایتم‌سازی و تقویت تجهیزات
- سیستم نشان‌ها و دستاوردها

---

## 🚀 شروع سریع

### پیش‌نیازها

| مورد | ورژن |
|------|------|
| **Node.js** | 18+ |
| **npm / yarn** | آخرین نسخه |
| **MySQL** | 5.7+ |
| **Telegram Bot Token** | [از BotFather](https://t.me/BotFather) |

### نصب و اجرا

#### 1️⃣ **کلون مخزن**
```bash
git clone https://github.com/ImPMUFO/EPWR.git
cd EPWR
```

#### 2️⃣ **وابستگی‌ها را نصب کن**
```bash
npm install
```

#### 3️⃣ **متغیرهای محیطی را تنظیم کن**
```bash
cp .env.example .env
```

سپس فایل `.env` را ویرایش کن و مقادیر زیر را وارد کن:
```env
# Telegram Bot
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
BOT_WEBHOOK=https://your-domain.com/webhook

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=epwr_game

# API
API_PORT=3000
NODE_ENV=production

# Vercel (اگر استفاده میکنی)
VERCEL_URL=https://your-project.vercel.app
```

#### 4️⃣ **دیتابیس را راه‌اندازی کن**
```bash
mysql -u root -p < sql/schema.sql
```

#### 5️⃣ **ربات را اجرا کن**
```bash
# محیط توسعه
npm run dev

# محیط تولید
npm start
```

---

## 📁 ساختار پروژه

```
EPWR/
├── 📂 api/              # توابع API و وب‌هوک‌های تلگرام
│   ├── handler.js       # دریافت آپدیت‌ها
│   └── webhook.js       # اتصال Vercel
│
├── 📂 src/              # منطق اصلی بازی
│   ├── commands/        # دستورات بات
│   ├── handlers/        # مدیران رویدادها
│   ├── utils/           # توابع کمکی
│   ├── database.js      # اتصال MySQL
│   ├── game.js          # محرک بازی
│   └── bot.js           # تنظیمات اصلی بات
│
├── 📂 sql/              # اسکریپت‌های دیتابیس
│   ├── schema.sql       # ساختار جداول
│   └── seed.sql         # داده‌های اولیه
│
├── .env.example         # نمونه متغیرهای محیطی
├── package.json         # وابستگی‌ها و اسکریپت‌ها
├── vercel.json          # تنظیمات Vercel
└── README.md            # این فایل
```

---

## 🛠️ تکنولوژی و وابستگی‌ها

| لایه | تکنولوژی |
|------|---------|
| **Runtime** | Node.js |
| **Bot Framework** | Telegraf 4.x / node-telegram-bot-api |
| **Database** | MySQL 5.7+ |
| **Hosting** | Vercel (Serverless) |
| **HTTP Client** | Axios |
| **Environment** | dotenv |

**وابستگی‌های اصلی:**
```json
{
  "telegraf": "^4.15.0",
  "mysql2": "^3.6.0",
  "axios": "^1.6.0",
  "dotenv": "^16.3.0"
}
```

---

## 🎮 نحوه بازی

### **شروع بازی**
```
/start - ایجاد کاراکتر جدید
/help - راهنمای بازی
```

### **دستورات اصلی**
| دستور | توضیح |
|-------|-------|
| `/profile` | نمایش پروفایل و آمار |
| `/inventory` | مشاهده اشیاء و تجهیزات |
| `/battle @user` | شروع نبرد با کاربر |
| `/castle` | مدیریت قلعه و ساخت‌و‌سازی |
| `/quests` | لیست مأموریت‌های موجود |
| `/leaderboard` | رنک‌بندی بازیکنان |
| `/guild` | مدیریت اتحادیه |

---

## 🔧 توسعه و مشارکت

### **اجرا در محیط توسعه**

```bash
npm run dev
```

سپس ربات را تست کن با ارسال پیام‌ها

### **Debugging**

فعال کردن لاگ تفصیلی:
```env
DEBUG=*
LOG_LEVEL=debug
```

### **مشارکت در پروژه**

1. Fork کن ✔️
2. branch جدید بساز (`git checkout -b feature/AmazingFeature`)
3. تغییرات رو commit کن (`git commit -m 'Add some AmazingFeature'`)
4. branch رو push کن (`git push origin feature/AmazingFeature`)
5. Pull Request باز کن 🚀

---

## 🐛 مشکل‌گیری و رفع‌ مسائل

### **مشکل: ربات جواب نمی‌دهد**

```bash
# 1. وابستگی‌ها رو تازه کن
npm install
npm start

# 2. .env رو چک کن (token و db)
cat .env

# 3. لاگ را مشاهده کن
npm run dev  # برای توسعه
```

### **مشکل: دیتابیس متصل نشده**

```bash
# MySQL رو شروع کن (Linux)
sudo systemctl start mysql

# تست اتصال
mysql -h DB_HOST -u DB_USER -p DB_NAME
```

### **مشکل: Vercel Webhook کار نمی‌کند**

✅ توکن را در تنظیمات Telegram داخل اپ عوض کن
✅ URL webhook درست باشد: `https://your-domain.com/api/webhook`

---

## 📊 آمار و عملکرد

- ⚡ **سرعت**: پاسخ < 100ms
- 🔒 **امنیت**: تصدیق کاربر و رمزگذاری رمز عبور
- 💾 **داده**: تا 10,000+ بازیکن فعال
- 📈 **مقیاس‌پذیری**: Vercel Serverless Architecture

---

## 📄 مجوز

این پروژه تحت **مجوز MIT** منتشر شده است.  
برای جزئیات بیشتر به فایل [LICENSE](LICENSE) مراجعه کنید.

```
MIT License - استفاده برای اهداف تجاری و شخصی آزاد است
```

---

## 📞 تماس و پشتیبانی

- **سازنده**: [@ImPMUFO](https://github.com/ImPMUFO)
- **Issues**: [GitHub Issues](https://github.com/ImPMUFO/EPWR/issues)
- **نسخه**: 1.0.0
- **آخرین آپدیت**: 1403/05/28
- **وضعیت**: 🟢 فعال و در حال توسعه

---

## 🌟 نکات بیشتر

- ⭐ اگر پروژه برایت مفید بود، ستاره بده!
- 🐛 مشکلی پیدا کردی؟ Issue بساز
- 💡 ایده‌ای داری؟ Pull Request بفرست

---

**ساخته شده با ❤️ برای جامعه بازی‌سازی فارسی**

```
╔══════════════════════════════════════════════════════╗
║        EPWR - جنگ حماسی شروع شود! ⚔️ 💎              ║
╚══════════════════════════════════════════════════════╝
```
