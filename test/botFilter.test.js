const { test } = require('node:test');
const assert = require('node:assert');
const { BOT_UA, HUMAN_EVENT } = require('../middleware/tracking');

test('real browsers are not treated as bots', () => {
  for (const ua of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0',
  ]) assert.strictEqual(BOT_UA.test(ua), false, ua);
});

test('crawlers, scripts, headless browsers and AI agents are bots', () => {
  for (const ua of [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36',
    'curl/8.5.0', 'python-requests/2.31.0', 'axios/1.7.2', 'Go-http-client/2.0',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
    'Mozilla/5.0 (compatible; UptimeRobot/2.0)',
  ]) assert.strictEqual(BOT_UA.test(ua), true, ua);
});

test('HUMAN_EVENT is a Mongo $not-regex on userAgent', () => {
  assert.ok(HUMAN_EVENT.userAgent.$not instanceof RegExp);
});
