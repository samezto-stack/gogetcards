/**
 * Device, browser and OS from a User-Agent string.
 *
 * NO DEPENDENCY, DELIBERATELY. A full UA database is tens of megabytes
 * resident, and this instance already spends a fifth of its memory on the
 * GeoIP tables. What the analytics page needs is three coarse buckets and a
 * browser family, not a precise model name, and that is a dozen patterns.
 *
 * DERIVED AT QUERY TIME rather than stored. The raw User-Agent is already
 * on every Event, so nothing new is tracked and — more usefully — the whole
 * history is classifiable the moment this file changes. A stored field
 * would only ever describe events recorded after the deploy, and would be
 * wrong for ever whenever a pattern here was corrected.
 *
 * A User-Agent is self-reported and can be anything. Treat the output as a
 * strong hint, not a fact; the buckets are wide enough that a lie has to be
 * deliberate to land in the wrong one.
 */

/* Tablet BEFORE mobile: an iPad's UA contains neither "iPhone" nor
   "Android...Mobile", but plenty of Android tablets carry "Android" without
   "Mobile", and iPadOS 13+ reports itself as a Macintosh with touch. Order
   is what keeps a tablet from being counted as a phone. */
function deviceType(ua) {
  const s = String(ua || '');
  if (!s) return 'Unknown';
  if (/\biPad\b/i.test(s)) return 'Tablet';
  if (/\bTablet\b|\bKindle\b|\bSilk\b|\bPlayBook\b/i.test(s)) return 'Tablet';
  /* Android without "Mobile" is the tablet convention. */
  if (/\bAndroid\b/i.test(s) && !/\bMobile\b/i.test(s)) return 'Tablet';
  if (/\biPhone\b|\biPod\b|\bAndroid\b|\bMobile\b|\bwindows phone\b/i.test(s)) return 'Mobile';
  if (/\bMacintosh\b|\bWindows NT\b|\bX11\b|\bLinux\b|\bCrOS\b/i.test(s)) return 'Desktop';
  return 'Unknown';
}

/* Order matters throughout: Edge's UA contains "Chrome" and "Safari",
   Chrome's contains "Safari", and most in-app browsers contain all three.
   Every one of these would read as Safari if tested last. */
function browser(ua) {
  const s = String(ua || '');
  if (!s) return 'Unknown';
  if (/\bEdgA?\/|\bEdge\//i.test(s)) return 'Edge';
  if (/\bOPR\/|\bOpera\//i.test(s)) return 'Opera';
  if (/\bSamsungBrowser\//i.test(s)) return 'Samsung Internet';
  if (/\bFBAN|\bFBAV|\bFB_IAB/i.test(s)) return 'Facebook in-app';
  if (/\bInstagram\b/i.test(s)) return 'Instagram in-app';
  if (/\bTikTok\b|BytedanceWebview/i.test(s)) return 'TikTok in-app';
  if (/\bFirefox\/|\bFxiOS\//i.test(s)) return 'Firefox';
  if (/\bCriOS\//i.test(s)) return 'Chrome';           // Chrome on iOS
  if (/\bChrome\//i.test(s)) return 'Chrome';
  if (/\bSafari\//i.test(s)) return 'Safari';
  return 'Other';
}

function os(ua) {
  const s = String(ua || '');
  if (!s) return 'Unknown';
  if (/\biPhone\b|\biPad\b|\biPod\b|\biOS\b/i.test(s)) return 'iOS';
  if (/\bAndroid\b/i.test(s)) return 'Android';
  if (/\bWindows NT\b/i.test(s)) return 'Windows';
  if (/\bCrOS\b/i.test(s)) return 'ChromeOS';
  if (/\bMac OS X\b|\bMacintosh\b/i.test(s)) return 'macOS';
  if (/\bLinux\b|\bX11\b/i.test(s)) return 'Linux';
  return 'Other';
}

function classify(ua) {
  return { device: deviceType(ua), browser: browser(ua), os: os(ua) };
}

module.exports = { classify, deviceType, browser, os };
