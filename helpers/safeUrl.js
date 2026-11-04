/**
 * Refuse server-side requests to anything that is not a public host.
 *
 * Two places fetch a URL an operator typed into the admin: the partner
 * token issuer (services/partnerClient) and the feed image probe
 * (services/distribution/imageProbe). Both are admin-only, but an admin
 * form is exactly where a pasted link ends up, and a URL that resolves to
 * 127.0.0.1, the cloud metadata address or a private subnet would make
 * this server fetch it on the operator's behalf. Resolve first, then
 * refuse loopback, private, link-local and multicast ranges, and http on
 * anything but localhost.
 */
const dns = require('dns').promises;
const net = require('net');

function privateV4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224;
}
function privateV6(ip) {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('::ffff:')) return privateV4(v.slice(7));
  return /^(fc|fd|fe[89ab])/.test(v) || v.startsWith('ff');
}
function isPrivateIp(ip) {
  return net.isIPv4(ip) ? privateV4(ip) : net.isIPv6(ip) ? privateV6(ip) : true;
}

/**
 * Throws when `url` is not a public https URL (or http://localhost in
 * development). Returns the parsed URL otherwise.
 */
async function assertPublicUrl(url) {
  let u;
  try { u = new URL(String(url)); } catch (_) { throw new Error('invalid URL'); }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local && process.env.NODE_ENV !== 'production')) {
    throw new Error('only https URLs are allowed');
  }
  if (local) {
    if (process.env.NODE_ENV === 'production') throw new Error('refusing a local address');
    return u;
  }
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
  if (!addrs.length) throw new Error('host does not resolve');
  for (const { address } of addrs) {
    if (isPrivateIp(address)) throw new Error('refusing a private or local address');
  }
  return u;
}

module.exports = { assertPublicUrl, isPrivateIp };
