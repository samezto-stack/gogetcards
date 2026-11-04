const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Event = require('../models/Event');
const Lead = require('../models/Lead');

/* ── Collect Leads (Newsletter/Cart) ───────────────────── */
router.post('/leads', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const source = String(req.body.source || '').slice(0, 60);
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Email required' });
    
    // Upsert so we don't crash on duplicates
    await Lead.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $setOnInsert: { source: source || 'newsletter' } },
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ── Cart helpers ──────────────────────────────────────── */
function getCart(req) {
  if (!req.session.cart) {
    req.session.cart = { items: [], totalItems: 0, totalPrice: 0 };
  }
  return req.session.cart;
}

function recalcCart(cart) {
  /* Units, not packs: the header badge says how many things are in the bag. */
  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity * Math.max(1, parseInt(item.packSize, 10) || 1), 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/* ── Instant search ──────────────────────────────────────
   The eight best matches for what is being typed, for the dropdown under
   the header box. Same fields the collection search matches, same
   escaping (an unescaped user string in a $regex can make the engine
   backtrack forever). Set codes are what collectors type, so a code hit
   ranks above a title hit. Priced in the storefront's own market and
   left out when the product is not sold there, like every other card.
   Rate limited: it fires on every keystroke pause. */
const searchLimiter = require('express-rate-limit')({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return res.json({ results: [] });
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    const markets = require('../config/markets');
    const marketService = require('../services/market');
    const productImage = require('../helpers/productImage');
    const catalog = require('../config/catalog');
    const market = (req.market && markets.byId(req.market.id)) || markets.defaultMarket();
    const found = await Product.find({ $or: [{ title: rx }, { setCode: rx }, { vendor: rx }, { productType: rx }, { tags: rx }] })
      .select('slug title setCode vendor productType tags collections price marketPrices imageUrl images preorder available packSize')
      .sort({ available: -1, featured: -1, createdAt: -1 })
      .limit(24)
      .lean();
    const score = (p) => (rx.test(p.setCode || '') ? 3 : 0) + (new RegExp('^' + safe, 'i').test(p.title || '') ? 2 : 0) + (rx.test(p.title || '') ? 1 : 0) + (p.available ? 1 : 0);
    const results = found
      .map((p) => ({ p, local: marketService.priceFor(p, market) }))
      .filter((x) => x.local)
      .sort((a, b) => score(b.p) - score(a.p))
      .slice(0, 8)
      .map(({ p, local }) => {
        const pack = parseInt(p.packSize, 10) > 1 ? parseInt(p.packSize, 10) : 1;
        const line = catalog.detect(p);
        const img = p.imageUrl || (p.images && p.images[0]) || '';
        return {
          slug: p.slug,
          title: p.title,
          line: line ? line.shortName : '',
          type: p.productType || '',
          setCode: p.setCode || '',
          price: markets.format(Math.round(local.amount / pack), local.currency) + (pack > 1 ? ' each' : ''),
          preorder: !!p.preorder,
          available: p.available !== false,
          image: img ? productImage.at(img, 96) : '',
          url: markets.path(market, `/products/${p.slug}`),
        };
      });
    res.set('Cache-Control', 'private, max-age=30');
    res.json({ results, more: markets.path(market, `/collection/all?q=${encodeURIComponent(q)}`) });
  } catch (err) {
    console.error('[api/search]', err.message);
    res.status(500).json({ results: [] });
  }
});

/* ── Add to Cart ───────────────────────────────────────── */
router.post('/cart/add', async (req, res) => {
  try {
    const slug = String(req.body.slug || '');
    const qty = Math.max(1, parseInt(req.body.quantity) || 1);

    const product = await Product.findOne({ slug }).lean();
    if (!product) return res.json({ success: false, error: 'Product not found' });

    const cart = getCart(req);
    const existing = cart.items.find(i => i.slug === slug);
    const limit = product.allocationLimit || 0;

    /* What the cart held before, so the response can tell the customer
       what happened to it. The replacement below was already correct and
       already silent: someone added a second product, their first one
       vanished, and nothing on screen said so. Losing a customer's cart
       without a word is worse than the multi-product checkout this
       prevents. */
    const displaced = (!existing && cart.items.length) ? cart.items[0].title : null;

    if (existing) {
      // Same product already in the cart — just bump its quantity.
      existing.quantity += qty;
      if (limit > 0 && existing.quantity > limit) existing.quantity = limit;
    } else {
      // Single-product cart: adding a different product replaces the cart
      // entirely, so it never holds more than one distinct product. The
      // partner/Whop checkout handles exactly one product per order, and the
      // cart's Secure Checkout routes that single product to it.
      cart.items = [{
        slug: product.slug,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl || (product.images && product.images[0]) || '',
        vendor: product.vendor,
        productType: product.productType,
        variantId: product.variantId || '',
        preorder: product.preorder || false,
        /* Packs: `quantity` counts packs, `packSize` says how many units
           each one is, so the drawer can show the count the customer
           chose. helpers/packs.js. */
        packSize: Math.max(1, parseInt(product.packSize, 10) || 1),
        quantity: limit > 0 ? Math.min(qty, limit) : qty,
      }];
    }

    recalcCart(cart);

    /* Flags the client uses to explain what just happened, rather than
       leaving the customer to notice on their own. `capped` fires when an
       allocation limit trimmed the requested quantity, which was also
       silent before. */
    const requested = existing ? qty : Math.max(1, qty);
    const nowInCart = (cart.items[0] && cart.items[0].quantity) || 0;
    const capped = limit > 0 && nowInCart === limit && (existing ? true : requested > limit);

    req.session.save(() => {
      res.json({
        success: true,
        cart,
        replaced: displaced,
        capped: capped ? limit : null,
      });
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Server error' });
  }
});

/* ── Get Cart (JSON) ───────────────────────────────────── */
router.get('/cart', (req, res) => {
  res.json({ success: true, cart: getCart(req) });
});

/* ── Update Cart Item ──────────────────────────────────── */
router.post('/cart/update', async (req, res) => {
  const slug = String(req.body.slug || '');
  const quantity = req.body.quantity;
  const qty = parseInt(quantity) || 0;
  const cart = getCart(req);
  const item = cart.items.find(i => i.slug === slug);

  if (item) {
    if (qty <= 0) {
      cart.items = cart.items.filter(i => i.slug !== slug);
    } else {
      const product = await Product.findOne({ slug }).lean();
      const limit = product ? (product.allocationLimit || 0) : 0;
      item.quantity = limit > 0 ? Math.min(qty, limit) : qty;
    }
    recalcCart(cart);
  }

  req.session.save(() => {
    res.json({ success: true, cart });
  });
});

/* ── Remove Cart Item ──────────────────────────────────── */
router.post('/cart/remove', (req, res) => {
  const { slug } = req.body;
  const cart = getCart(req);
  cart.items = cart.items.filter(i => i.slug !== slug);
  recalcCart(cart);
  req.session.save(() => {
    res.json({ success: true, cart });
  });
});

/* ── Cart Drawer HTML (for AJAX refresh) ───────────────── */
router.get('/cart/drawer', (req, res) => {
  const cart = getCart(req);
  res.render('partials/cart-drawer-inner', { ...res.locals, cart, layout: false });
});

/* ── Track Event ───────────────────────────────────────── */
router.post('/track-event', async (req, res) => {
  try {
    const { type, productSlug, quantity, page } = req.body;
    const validTypes = ['view_product', 'add_to_cart', 'checkout_click'];
    if (!validTypes.includes(type)) return res.json({ success: false });

    await Event.create({
      type,
      productSlug: productSlug || null,
      quantity: quantity || null,
      page: page || '',
      sessionId: req.sessionID || '',
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
    });

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

module.exports = router;
