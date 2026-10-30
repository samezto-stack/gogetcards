/* =========================================
   ZYPHERA TCG — FRONTEND JS v2.0
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

             The cart holds one product at a time because the checkout
             takes one product per order, so adding a second replaces the
             first. That was already true and entirely silent: the previous
             item simply disappeared. */
          refreshCartDrawerHTML().then(() => {
            if (data.replaced) {
              showCartNotice('"' + data.replaced + '" was removed. Your cart holds one product at a time, '
                + 'because each order is checked out on its own.');
            } else if (data.capped) {
              showCartNotice('Limited to ' + data.capped + ' per customer, so the quantity was adjusted.');
            }
          });

          // Track add_to_cart event
          trackEvent('add_to_cart', slug, qty);
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
    
    let val = Math.max(1, parseInt(input.value || 1) + delta);
    
    if (allocLimit > 0 && val > allocLimit) {
      val = allocLimit;
    }
    
    input.value = val;
    const display = wrap.querySelector('[data-qty-display]');
    if (display) display.textContent = val;

    updateStockVisuals(val);
    updateStickyPrice(val);
  }

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
    const qty = parseInt(input.value);
    fetch('/api/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, quantity: qty }),
    }).then(() => { location.reload(); }).catch(() => {});
  });

  /* ── Initialise ──────────────────────────────────────── */
  // Initialize dynamic stock bar if present on page load
  const qtyInput = document.querySelector('input[name="quantity"]');
  if (document.getElementById('dynamic-stock-wrapper')) {
    updateStockVisuals(qtyInput ? parseInt(qtyInput.value || 1, 10) : 1);
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
     no-op if already run); declining records the refusal and loads
     nothing, now or on any future visit.

     Both buttons are the same size and weight in the markup. Making
     refusal the harder path is the dark pattern regulators name
     specifically, and it is not worth the extra sessions. */
  const consent = window.__zypheraConsent;
  const notice = document.getElementById('cookie-notice');
  if (consent && notice && !consent.get()) {
    notice.hidden = false;
    const choose = (value) => {
      consent.set(value);
      notice.hidden = true;
      if (value === 'accepted' && typeof consent.load === 'function') consent.load();
    };
    const accept = document.getElementById('cookie-accept');
    const decline = document.getElementById('cookie-decline');
    if (accept) accept.addEventListener('click', () => choose('accepted'));
    if (decline) decline.addEventListener('click', () => choose('declined'));
  }

})();
