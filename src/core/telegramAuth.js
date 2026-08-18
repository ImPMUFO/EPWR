const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  if (!secret) return true;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

module.exports = { verifyWebhook };