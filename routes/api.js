const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Event = require('../models/Event');
const Lead = require('../models/Lead');

/* ── Collect Leads (Newsletter/Cart) ───────────────────── */
router.post('/leads', async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });
    
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

/* ── Add to Cart ───────────────────────────────────────── */
router.post('/cart/add', async (req, res) => {
  try {
    const { slug, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity) || 1);

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
  const { slug, quantity } = req.body;
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
