# ⚔️ EPWR | نبرد حماسی 💎

**EPWR — Epic Powers, Wars & Realms**

ربات بازی استراتژیک تلگرامی.

## نسخه اولیه

- Telegram Webhook
- دستور `/start`
- ساخت پروفایل اولیه فرمانده
- منوی اصلی
- قلمرو
- ارتش
- منابع
- جهان
- رتبه‌بندی
- تنظیمات

> دیتای بازیکن در این نسخه موقتاً در حافظه نگهداری می‌شود. قبل از انتشار واقعی، Supabase جایگزین آن خواهد شد.

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
```

## Deploy

Repository را به Vercel وصل کن، Environment Variables را اضافه کن و Deploy بگیر.

سپس Webhook تلگرام را روی:

```text
https://YOUR-DOMAIN.vercel.app/api/webhook
```

تنظیم کن.
