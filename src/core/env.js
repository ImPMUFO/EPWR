const { z } = require('zod');

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment Variables نامعتبر:', result.error.format());
    throw new Error('Environment Variables نامعتبر است');
  }
  return result.data;
}

module.exports = { validateEnv };