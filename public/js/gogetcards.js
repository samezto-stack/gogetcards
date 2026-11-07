/* =========================================
   GOGETCARDS — FRONTEND JS v2.0
   (Adapted from Shopify theme for Express)
   ========================================= */

(function () {
  'use strict';

  /* ── Scroll: sticky header ────────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('site-header--scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Mobile menu ──────────────────────────────────────── */
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const backdrop  = document.getElementById('header-backdrop');

  /* The mobile nav and the cart drawer both live in the DOM on every page,
     visually hidden by a transform. Nothing was ever marked inert, so a
     keyboard user tabbing through a closed page walked into seven invisible
     nav links and every cart control, and a screen reader announced them as
     available. `inert` removes them from the tab order and the a11y tree in
     one attribute, and aria-expanded / aria-hidden are now actually kept in
     sync with the open state instead of being frozen at their initial
     server-rendered values. */
  function setPanelOpen(panel, open) {
    if (!panel) return;
    if (open) {
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden', 'false');
    } else {
      panel.setAttribute('inert', '');
      panel.setAttribute('aria-hidden', 'true');
    }
  }

  /* Focus trap. A dialog that keeps aria-modal="true" but lets Tab escape
     into the page behind it is worse than no dialog at all, because the
     screen reader still claims the rest of the page is inaccessible. */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function trapFocus(e, panel) {
    if (e.key !== 'Tab' || !panel) return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Where focus came from, so closing a panel returns it rather than
  // dumping the user back at the top of the document.
  let lastFocused = null;

  if (hamburger && mobileNav) {
    setPanelOpen(mobileNav, false);
    hamburger.addEventListener('click', function () {
      const open = mobileNav.classList.toggle('mobile-nav--open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      backdrop && backdrop.classList.toggle('visible', open);
      document.body.style.overflow = open ? 'hidden' : '';
      setPanelOpen(mobileNav, open);
      if (open) {
        lastFocused = hamburger;
        const target = mobileNav.querySelector(FOCUSABLE);
        target && target.focus();
      }
    });
    backdrop && backdrop.addEventListener('click', closeMobile);
  }

  function closeMobile() {
    const wasOpen = mobileNav && mobileNav.classList.contains('mobile-nav--open');
    mobileNav && mobileNav.classList.remove('mobile-nav--open');
    hamburger && hamburger.classList.remove('open');
    hamburger && hamburger.setAttribute('aria-expanded', 'false');
    backdrop && backdrop.classList.remove('visible');
    document.body.style.overflow = '';
    setPanelOpen(mobileNav, false);
    if (wasOpen && lastFocused) { lastFocused.focus(); lastFocused = null; }
  }

  /* ── Cart Drawer ──────────────────────────────────────── */
  const cartDrawer   = document.getElementById('cart-drawer');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const cartClose    = document.getElementById('cart-drawer-close');
  const cartTrigger  = document.getElementById('cart-drawer-trigger');

  setPanelOpen(cartDrawer, false);

  function openCartDrawer() {
    if (!cartDrawer) return;
    lastFocused = document.activeElement;
    cartDrawer.classList.add('cd--open');
    cartBackdrop && cartBackdrop.classList.add('cd-backdrop--open');
    document.body.style.overflow = 'hidden';
    setPanelOpen(cartDrawer, true);
    cartTrigger && cartTrigger.setAttribute('aria-expanded', 'true');
    const close = document.getElementById('cart-drawer-close');
    close && close.focus();
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    const wasOpen = cartDrawer.classList.contains('cd--open');
    cartDrawer.classList.remove('cd--open');
    cartBackdrop && cartBackdrop.classList.remove('cd-backdrop--open');
    document.body.style.overflow = '';
    setPanelOpen(cartDrawer, false);
    cartTrigger && cartTrigger.setAttribute('aria-expanded', 'false');
    if (wasOpen && lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  cartTrigger  && cartTrigger.addEventListener('click', openCartDrawer);
  cartClose    && cartClose.addEventListener('click', closeCartDrawer);
  cartBackdrop && cartBackdrop.addEventListener('click', closeCartDrawer);

  /* Escape closes whichever panel is open. Neither panel responded to
     Escape before, which is a WCAG 2.1.2 (No Keyboard Trap) problem once
     focus is trapped, and simply an expectation everywhere else. */
  document.addEventListener('keydown', function (e) {
    const drawerOpen = cartDrawer && cartDrawer.classList.contains('cd--open');
    const navOpen = mobileNav && mobileNav.classList.contains('mobile-nav--open');
    if (e.key === 'Escape') {
      if (drawerOpen) closeCartDrawer();
      else if (navOpen) closeMobile();
      return;
    }
    if (drawerOpen) trapFocus(e, cartDrawer);
    else if (navOpen) trapFocus(e, mobileNav);
  });

  /* ── AJAX Add to Cart ────────────────────────────────── */
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form.matches('[data-atc-form]')) return;
    e.preventDefault();

    const btn = form.querySelector('[data-atc-btn]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '⏳ Adding...'; btn.disabled = true; }

    const slug = form.querySelector('[name="slug"]')?.value;
    const qty  = parseInt(form.querySelector('[name="quantity"]')?.value || '1');

    fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, quantity: qty }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (btn) { btn.innerHTML = 'Added'; }
          updateCartCount(data.cart);
          setTimeout(() => {
            if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
          }, 2000);
          openCartDrawer();

          /* Say what happened when the server changed the request, AFTER
             the drawer has re-rendered — the refresh replaces innerHTML,
             so a notice added before it lands is thrown away.

             The cart holds several products; the whole order is limited
             to $1,199.76, and each product to its own allocation. */
          refreshCartDrawerHTML().then(() => {
            if (data.capped) {
              showCartNotice('Limited to ' + data.capped + ' per customer, so the quantity was adjusted.');
            } else if (data.orderLimit) {
              showCartNotice('Orders are limited to $' + data.orderLimit + ', so the quantity was adjusted to fit your cart.');
            }
          });

          // Track add_to_cart event
          trackEvent('add_to_cart', slug, qty);
          gaEvent('add_to_cart', form, qty);
        } else if (data.message) {
          /* A refusal with a reason (the cart is at the order limit, or
             holds the most different products it can). Show the reason in
             the drawer, where the cart it is about is visible. */
          if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
          openCartDrawer();
          refreshCartDrawerHTML().then(() => showCartNotice(data.message));
        } else {
          if (btn) { btn.innerHTML = '❌ Error — retry'; btn.disabled = false; }
        }
      })
      .catch(() => {
        if (btn) { btn.innerHTML = '❌ Error — retry'; btn.disabled = false; }
      });
  });

  /* Message shown at the top of the cart drawer when the server changed
     what was asked for. role="status" so it is announced rather than only
     seen; the drawer is a live region a sighted user is looking at anyway,
     and a screen reader user has no other signal that their previous item
     is gone. */
  function showCartNotice(message) {
    const inner = document.getElementById('cart-drawer-inner');
    if (!inner) return;
    const existing = inner.querySelector('.cd__notice');
    if (existing) existing.remove();
    const el = document.createElement('p');
    el.className = 'cd__notice';
    el.setAttribute('role', 'status');
    el.textContent = message;
    inner.prepend(el);
  }

  /* ── Update cart count badge ─────────────────────────── */
  function updateCartCount(cart) {
    const badges = document.querySelectorAll('.header__cart-count, .js-cart-count');
    const count = cart ? cart.totalItems : 0;
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ── Refresh cart drawer via AJAX ───────────────────── */
  function refreshCartDrawerHTML() {
    /* Returns the promise. It used to swallow it, so a caller wanting to
       add anything to the drawer after a refresh had no way to know when
       the innerHTML swap had happened — anything prepended beforehand was
       silently wiped by it. */
    return fetch('/api/cart/drawer')
      .then(r => r.text())
      .then(html => {
        const inner = document.getElementById('cart-drawer-inner');
        if (inner) inner.innerHTML = html;
        /* The swap destroys whatever was focused inside the dialog; put
           focus back on the close button so keyboard users are not left
           on <body> inside an open aria-modal. */
        if (cartDrawer && cartDrawer.classList.contains('cd--open')) {
          const close = document.getElementById('cart-drawer-close');
          if (close && !cartDrawer.contains(document.activeElement)) close.focus();
        }
        const live = document.getElementById('cart-live');
        if (live) live.textContent = 'Cart updated.';
      })
      .catch(() => {});
  }

  /* Remove-from-cart used to work by calling attachCartItemListeners() on
     every drawer refresh, which ran document.querySelectorAll and bound a
     fresh click handler to every matching button on the page. Buttons
     inside the drawer were replaced by the refresh so they got away with
     it, but the handler count on anything outside the drawer grew by one
     per refresh — so after N refreshes a single click fired N remove
     requests. One delegated listener, registered once, cannot drift out of
     sync with the DOM no matter how many times the drawer re-renders. */
  let removeInFlight = false;
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-cart-remove]');
    if (!btn || removeInFlight) return;
    removeInFlight = true;
    btn.disabled = true;
    fetch('/api/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: btn.dataset.cartRemove }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          updateCartCount(data.cart);
          refreshCartDrawerHTML();
        } else {
          btn.disabled = false;
        }
      })
      .catch(() => { btn.disabled = false; })
      .finally(() => { removeInFlight = false; });
  });

  /* ── Product gallery thumbnails ──────────────────────── */
  document.addEventListener('click', function (e) {
    const thumb = e.target.closest('[data-thumb-src]');
    if (!thumb) return;
    const mainImg = document.getElementById('product-main-img');
    if (mainImg) {
      /* srcset has to be swapped too, and first. The main image is
         responsive now, and a srcset always wins over src — assigning only
         src would leave the picture unchanged and make every thumbnail
         look dead. An empty data attribute clears it, which is correct for
         an image host whose URLs cannot be resized. */
      mainImg.srcset = thumb.dataset.thumbSrcset || '';
      mainImg.src = thumb.dataset.thumbSrc;
    }
    document.querySelectorAll('.pp__thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  });

  /* ── Instant search ──────────────────────────────────────
     Results under the box as you type. Everything rendered here is
     built with textContent: titles come from the catalogue, which the
     admin edits, and that is still data as far as this script is
     concerned. Enter with nothing highlighted submits the form as before,
     so the full results page is one keystroke away. */
  document.querySelectorAll('form[role="search"]').forEach(function (form) {
    var input = form.querySelector('input[type="search"]');
    var box = form.querySelector('[data-search-suggest]');
    if (!input || !box) return;
    var timer = null, lastQ = '', active = -1, items = [];
    form.style.position = 'relative';

    function hide() { box.hidden = true; box.textContent = ''; items = []; active = -1; input.removeAttribute('aria-activedescendant'); }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function render(data) {
      box.textContent = ''; items = []; active = -1;
      if (!data.results || !data.results.length) { hide(); return; }
      data.results.forEach(function (r, i) {
        var a = el('a', 'search-suggest__item'); a.href = r.url; a.setAttribute('role', 'option'); a.id = input.id + '-opt-' + i;
        var img = el('span', 'search-suggest__img');
        if (r.image) { var im = document.createElement('img'); im.src = r.image; im.alt = ''; im.width = 40; im.height = 40; im.loading = 'lazy'; img.appendChild(im); }
        a.appendChild(img);
        var body = el('span', 'search-suggest__body');
        body.appendChild(el('span', 'search-suggest__title', r.title));
        body.appendChild(el('span', 'search-suggest__meta', [r.line, r.type, r.setCode].filter(Boolean).join(' · ')));
        a.appendChild(body);
        var side = el('span', 'search-suggest__side');
        side.appendChild(el('span', 'search-suggest__price', r.price));
        if (r.preorder) side.appendChild(el('span', 'search-suggest__tag', 'Preorder'));
        else if (!r.available) side.appendChild(el('span', 'search-suggest__tag search-suggest__tag--out', 'Sold out'));
        a.appendChild(side);
        box.appendChild(a); items.push(a);
      });
      if (data.more) { var all = el('a', 'search-suggest__all', 'See all results for “' + lastQ + '”'); all.href = data.more; box.appendChild(all); items.push(all); }
      box.hidden = false;
    }
    function highlight(n) {
      items.forEach(function (it) { it.classList.remove('is-active'); });
      active = n;
      if (n >= 0 && items[n]) { items[n].classList.add('is-active'); input.setAttribute('aria-activedescendant', items[n].id || ''); }
    }
    function fetchNow() {
      var q = input.value.trim();
      if (q.length < 2) { hide(); return; }
      lastQ = q;
      fetch('/api/search?q=' + encodeURIComponent(q), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) { if (input.value.trim() === q) render(data); })
        .catch(hide);
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(fetchNow, 180); });
    input.addEventListener('focus', function () { if (items.length) box.hidden = false; });
    input.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(-1, active - 1)); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); window.location.href = items[active].href; }
      else if (e.key === 'Escape') { hide(); }
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) hide(); });
  });

  /* ── Quantity selectors ──────────────────────────────── */
  document.addEventListener('click', function (e) {
    if (e.target.matches('[data-qty-minus]')) changeQty(e.target, -1);
    if (e.target.matches('[data-qty-plus]'))  changeQty(e.target, +1);
  });

  function changeQty(btn, delta) {
    const wrap = btn.closest('[data-qty-wrap]');
    if (!wrap) return;
    const input = wrap.querySelector('input[name="quantity"]');
    if (!input) return;
    
    const limitAttr = input.getAttribute('data-allocation-limit');
    const allocLimit = limitAttr ? parseInt(limitAttr) : 0;
    /* Packs: the input counts packs, the display counts units. */
    const pack = Math.max(1, parseInt(wrap.getAttribute('data-pack-size') || '1', 10) || 1);

    let val = Math.max(1, parseInt(input.value || 1) + delta);
    
    if (allocLimit > 0 && val > allocLimit) {
      val = allocLimit;
    }
    
    setQty(wrap, input, val, pack);
  }

  function setQty(wrap, input, val, pack) {
    input.value = val;
    const display = wrap.querySelector('[data-qty-display]');
    if (display) display.textContent = val * pack;

    updateStockVisuals(Math.max(1, Math.ceil(val / pack)));
    updateStickyPrice(val);
    syncTiers(val);
  }

  /* Pack tiers: "4 for $49.99 · 8 for $99.98 · 12 for $149.97". A chip
     sets the stepper to that many packs; the stepper lights the chip whose
     count it is on, and none when it has climbed past the last one. */
  function syncTiers(packs) {
    document.querySelectorAll('[data-pack-tiers] [data-tier]').forEach(function (chip) {
      const on = parseInt(chip.getAttribute('data-tier'), 10) === packs;
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (e) {
    const chip = e.target.closest('[data-pack-tiers] [data-tier]');
    if (!chip) return;
    const wrap = document.querySelector('[data-qty-wrap]');
    const input = wrap && wrap.querySelector('input[name="quantity"]');
    if (!input) return;
    const pack = Math.max(1, parseInt(wrap.getAttribute('data-pack-size') || '1', 10) || 1);
    const limitAttr = input.getAttribute('data-allocation-limit');
    const allocLimit = limitAttr ? parseInt(limitAttr, 10) : 0;
    let val = Math.max(1, parseInt(chip.getAttribute('data-tier'), 10) || 1);
    if (allocLimit > 0 && val > allocLimit) val = allocLimit;
    setQty(wrap, input, val, pack);
  });

  /* Keeps the mobile buy bar's price in step with the quantity stepper.
     The bar was rendered once server-side at the unit price, so someone
     who chose six still saw the single-unit total on the button they were
     about to press — the one number a buyer checks before committing.

     Money is formatted here rather than by each caller so the bar rounds
     the same way the rest of the page does. */
  /* THE SAME PREFIXES THE SERVER PRINTS, deliberately not Intl's.
     Intl's narrowSymbol renders CAD as a bare "$", which on a Canadian
     storefront is indistinguishable from the US price — and its plain
     symbol form disagrees with config/markets.format in other ways. The
     bar sits directly under prices the server rendered, so it has to round
     and label money identically or the same figure appears twice in two
     shapes. Mirrors config/markets.js CURRENCIES. */
  var MONEY_PREFIX = { USD: 'US$', CAD: 'CA$', GBP: '\u00A3', EUR: '\u20AC' };

  function formatMoney(cents, currency) {
    var code = String(currency || 'USD').toUpperCase();
    var prefix = MONEY_PREFIX[code] || (code + ' ');
    return prefix + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function updateStickyPrice(qtyVal) {
    const btn = document.querySelector('[data-sticky-buy]');
    if (!btn) return;
    const target = btn.querySelector('[data-sticky-price]');
    const unit = parseInt(btn.getAttribute('data-unit-price'), 10);
    if (!target || !Number.isFinite(unit)) return;
    const qty = Math.max(1, parseInt(qtyVal, 10) || 1);
    target.textContent = formatMoney(unit * qty, btn.getAttribute('data-currency'));
  }

  function updateStockVisuals(qtyVal) {
    const wrapper = document.getElementById('dynamic-stock-wrapper');
    if (!wrapper) return;

    const dot = document.getElementById('dynamic-stock-dot');
    const text = document.getElementById('dynamic-stock-text');
    const fill = document.getElementById('dynamic-stock-fill');

    /* No invented fallback. This used to default to 15 units whenever the
       product had no real stock figure, which meant the "Only N left"
       urgency copy was manufactured out of nothing. The wrapper is now
       only rendered when product.stock is a real positive number, and if
       it somehow isn't, the meter hides rather than making one up. */
    const totalStock = parseInt(wrapper.getAttribute('data-stock-total'), 10);
    if (isNaN(totalStock) || totalStock <= 0) {
      wrapper.style.display = 'none';
      return;
    }

    let remaining = totalStock - qtyVal;
    if (remaining < 0) remaining = 0;

    // Fill is a share of this product's own stock, not of an arbitrary 20.
    let pct = (remaining / totalStock) * 100;
    if (pct > 100) pct = 100;

    if (remaining <= 5) {
      if (dot) dot.className = 'pp__stock-dot pp__stock-dot--low';
      if (text) {
        text.innerHTML = '<span style="color:#FC8181;font-weight:600">Only ' + remaining + ' left — selling fast!</span>';
      }
      if (fill) {
        fill.style.width = (100 - pct) + '%';
        fill.style.background = 'linear-gradient(90deg,#EF4444,#F59E0B)';
      }
    } else {
      if (dot) dot.className = 'pp__stock-dot pp__stock-dot--ok';
      if (text) {
        text.innerHTML = 'In Stock — ' + remaining + ' available';
      }
      if (fill) {
        fill.style.width = (100 - pct) + '%';
        fill.style.background = 'linear-gradient(90deg, var(--color-accent), var(--color-cyan))';
      }
    }
  }

  /* THE PER-PRODUCT CHECKOUT URL OVERRIDE IS GONE.
     goToCheckout() lived here: it sent the buyer to product.checkoutUrl
     when one was set, splitting A/B across comma-separated entries, and
     otherwise to /checkout-redirect. Both destinations belonged to the
     Shopify checkout, which has been removed. The Buy button now posts
     the product's own form to /checkout/start, so the quantity and slug
     travel in the request body rather than being scraped back out of the
     DOM by a global. */

  /* ── Google tag e-commerce events ───────────────────────
     gtag() is defined by views/partials/analytics.ejs only when a tag id
     is configured; without consent the calls queue in the dataLayer and
     are never sent. The item comes from the form's data-ga-item, written
     by the server from the real price (the pack price for pack products). */
  function gaEvent(name, form, qty) {
    if (typeof window.gtag !== 'function' || !form) return;
    var raw = form.getAttribute('data-ga-item');
    if (!raw) return;
    var item;
    try { item = JSON.parse(raw); } catch (e) { return; }
    var packEl = form.querySelector('[data-pack-size]') || document.querySelector('[data-qty-wrap][data-pack-size]');
    var packSize = packEl ? (parseInt(packEl.getAttribute('data-pack-size'), 10) || 1) : 1;
    var packs = Math.max(1, Math.ceil((parseInt(qty, 10) || 1) / packSize));
    item.quantity = packs;
    window.gtag('event', name, { currency: item.currency, value: Math.round(item.price * packs * 100) / 100, items: [item] });
  }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.getAttribute && /\/checkout\/start$/.test(form.getAttribute('action') || '')) {
      var q = form.querySelector('[name="quantity"]');
      gaEvent('begin_checkout', form, q ? q.value : 1);
    }
  });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="/checkout-redirect"]');
    if (!a || typeof window.gtag !== 'function') return;
    var cents = document.querySelector('.cd__subtotal-amount[data-usd-cents], .cart-total-value [data-usd-cents]');
    var value = cents ? Number(cents.getAttribute('data-usd-cents')) / 100 : undefined;
    window.gtag('event', 'begin_checkout', value !== undefined ? { currency: 'USD', value: value } : {});
  });

  /* ── Event Tracking ─────────────────────────────────── */
  function trackEvent(type, productSlug, quantity) {
    fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        productSlug: productSlug || null,
        quantity: quantity || null,
        page: window.location.pathname,
      }),
    }).catch(() => {});
  }

  /* No client-side view_product event is sent. The /products/:slug route
     already writes one Event per request server-side, so firing a second
     one here double-counted every product view and made the admin "top
     products" report show roughly twice the real traffic. The server-side
     write is the one kept: it fires for visitors with JS disabled too, and
     it cannot be inflated by a page script looping. */

  /* ── Newsletter form ─────────────────────────────────── */
  /* The real submit handler lives in views/partials/newsletter.ejs, where
     it POSTs to /api/leads. A second, document-level handler used to live
     here that swapped in the success message without sending anything, so
     both fired on one submit and the visitor saw "You're in!" whether or
     not the subscription was actually recorded. Removed; there is now
     exactly one handler and it reports the real result. */

  /* ── Cart page: remove item ──────────────────────────── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-remove-key]');
    if (!btn) return;
    const slug = btn.dataset.removeKey;
    fetch('/api/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug }),
    }).then(() => { location.reload(); }).catch(() => {});
  });

  /* ── Cart page: update quantity ──────────────────────── */
  document.addEventListener('change', function (e) {
    const input = e.target.closest('[data-cart-qty]');
    if (!input) return;
    const slug = input.dataset.cartQty;
    /* The field shows units; the cart counts packs. */
    const pack = Math.max(1, parseInt(input.getAttribute('data-pack-size') || '1', 10) || 1);
    const units = parseInt(input.value) || 0;
    const qty = units <= 0 ? 0 : Math.max(1, Math.round(units / pack));
    fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, quantity: qty }),
    }).then(() => { location.reload(); }).catch(() => {});
  });

  /* ── Initialise ──────────────────────────────────────── */
  // Initialize dynamic stock bar if present on page load
  const qtyInput = document.querySelector('input[name="quantity"]');
  const qtyWrap = qtyInput ? qtyInput.closest('[data-qty-wrap]') : null;
  const qtyPack = qtyWrap ? Math.max(1, parseInt(qtyWrap.getAttribute('data-pack-size') || '1', 10) || 1) : 1;
  if (document.getElementById('dynamic-stock-wrapper')) {
    updateStockVisuals(Math.max(1, Math.ceil((qtyInput ? parseInt(qtyInput.value || 1, 10) : 1) / qtyPack)));
  }
  /* Run once on load as well as on every stepper click. A quantity can
     arrive pre-filled (a restored form, a back-navigation), and a bar
     showing the unit price next to a quantity of three is the same defect
     as one that never updates. */
  updateStickyPrice(qtyInput ? parseInt(qtyInput.value || 1, 10) : 1);


  /* ── Cookie notice ───────────────────────────────────────
     Shown only when no choice has been recorded, so a returning visitor
     never sees it again. Accepting loads the analytics and advertising
     scripts immediately (the loader is defined in layout.ejs and is a
     no-op if already run); declining records the refusal, loads no Meta or
     Clarity script, and switches the (always-loaded) Google tag to
     Consent Mode "denied", now and on every future visit.

     Both buttons are the same size and weight in the markup. Making
     refusal the harder path is the dark pattern regulators name
     specifically, and it is not worth the extra sessions. */
  const consent = window.__gogetcardsConsent;
  const notice = document.getElementById('cookie-notice');
  if (consent && notice && !consent.get()) {
    notice.hidden = false;
    const choose = (value) => {
      consent.set(value);
      notice.hidden = true;
      if (value === 'accepted' && typeof consent.load === 'function') consent.load();
      /* The Google tag is already loaded on every page; a refusal turns
         its storage off rather than unloading it. */
      if (value === 'declined' && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      }
    };
    const accept = document.getElementById('cookie-accept');
    const decline = document.getElementById('cookie-decline');
    if (accept) accept.addEventListener('click', () => choose('accepted'));
    if (decline) decline.addEventListener('click', () => choose('declined'));
  }

})();
