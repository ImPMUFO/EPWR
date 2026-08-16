export function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  telegramBotToken: getEnv("TELEGRAM_BOT_TOKEN"),
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
};
