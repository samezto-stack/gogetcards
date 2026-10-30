/**
 * Seed data module — can be called from seed.js or auto-seed in memory mode
 */
const Product = require('./models/Product');
const Collection = require('./models/Collection');
const User = require('./models/User');
const Page = require('./models/Page');

const PRODUCTS = [
  { title: "Pokémon TCG: Perfect Order [ME03] — Booster Box", slug: "pokemon-tcg-perfect-order-me03-booster-display-box-pre-order", price: 14999, comparePrice: 17999, imageUrl: "https://images.pokemontcg.io/sv1/logo.png", images: ["https://images.pokemontcg.io/sv1/logo.png"], description: "The Pokémon Scarlet & Violet Booster Box contains 36 booster packs. Factory sealed direct from distributor.", vendor: "The Pokémon Company", productType: "Booster Box", collections: ["pokemon", "booster-boxes"], tags: ["pokemon", "booster-box", "sealed", "hot"], available: true, stock: 12, badge: "Hot", featured: true },
  { title: "One Piece TCG [OP-16] — The Time of Battle", slug: "one-piece-tcg-op-16-the-time-of-battle-factory-sealed-booster-box-english-edition", price: 5999, comparePrice: 6999, imageUrl: "https://images.pokemontcg.io/sv3/logo.png", description: "The Time of Battle BB — 24 packs with Straw Hat crew leaders.", vendor: "Bandai", productType: "Booster Box", collections: ["one-piece", "booster-boxes"], tags: ["one-piece", "booster-box", "sealed", "hot"], available: true, stock: 24, badge: "Hot" },
  { title: "Pokémon Paldea Evolved — Master Case (6 Boxes)", slug: "pokemon-paldea-evolved-master-case", price: 79999, comparePrice: 94999, imageUrl: "https://images.pokemontcg.io/sv2/logo.png", description: "Full sealed Master Case of Paldea Evolved — 6 booster boxes (216 packs).", vendor: "The Pokémon Company", productType: "Master Case", collections: ["pokemon", "master-cases"], tags: ["pokemon", "master-case", "sealed", "limited"], available: true, stock: 4, badge: "Limited", featured: true },
  { title: "Pokémon 151 — Booster Box (Japanese)", slug: "pokemon-151-booster-box", price: 18999, comparePrice: 22999, imageUrl: "https://images.pokemontcg.io/sv3pt5/logo.png", description: "Pokémon 151 Japanese Booster Box with high SAR pull rates.", vendor: "The Pokémon Company", productType: "Booster Box", collections: ["pokemon", "booster-boxes"], tags: ["pokemon", "booster-box", "151", "sealed", "hot"], available: true, stock: 8, badge: "Hot", featured: true },
  { title: "Pokémon Twilight Masquerade — Booster Box (Preorder)", slug: "pokemon-twilight-masquerade-booster-box-preorder", price: 13999, description: "Secure your Twilight Masquerade BB at preorder pricing.", vendor: "The Pokémon Company", productType: "Booster Box", collections: ["pokemon", "preorders"], tags: ["pokemon", "booster-box", "preorder"], available: true, stock: 50, badge: "Preorder", preorder: true, preorderShips: "Q2 2026", featured: true },
  { title: "Yu-Gi-Oh! Rarity Collection Quarter Century — Booster Box", slug: "yugioh-rarity-collection-quarter-century", price: 24999, comparePrice: 29999, description: "Quarter Century Rarity Collection. 24 packs with Quarter Century Secret Rares.", vendor: "Konami", productType: "Booster Box", collections: ["yugioh", "booster-boxes"], tags: ["yugioh", "booster-box", "sealed", "hot"], available: true, stock: 6, badge: "Hot", featured: true },
  { title: "Yu-Gi-Oh! Phantom Nightmare — Booster Box", slug: "yugioh-phantom-nightmare-booster-box", price: 7999, comparePrice: 9499, description: "Phantom Nightmare BB — 24 packs of new archetypes.", vendor: "Konami", productType: "Booster Box", collections: ["yugioh", "booster-boxes"], tags: ["yugioh", "booster-box", "sealed"], available: true, stock: 18 },
  { title: "MTG Final Fantasy — Collector Booster Box", slug: "mtg-final-fantasy-collectors-booster-box", price: 34999, comparePrice: 39999, description: "MTG Final Fantasy Collector Booster Box with serialized cards.", vendor: "Wizards of the Coast", productType: "Booster Box", collections: ["mtg", "booster-boxes"], tags: ["mtg", "booster-box", "sealed", "hot"], available: true, stock: 9, badge: "Hot", featured: true },
  { title: "MTG Murders at Karlov Manor — Collector Booster Box", slug: "mtg-murders-at-karlov-manor-collector-box", price: 27999, comparePrice: 31999, description: "Karlov Manor Collector Booster Box with Sol Ring treatments.", vendor: "Wizards of the Coast", productType: "Booster Box", collections: ["mtg", "booster-boxes"], tags: ["mtg", "booster-box", "sealed"], available: true, stock: 14 },
  { title: "One Piece TCG — Wings of the Captain Booster Box", slug: "one-piece-wings-of-the-captain-booster-box", price: 9999, comparePrice: 11999, description: "Wings of the Captain BB — 24 packs with Straw Hat crew leaders.", vendor: "Bandai", productType: "Booster Box", collections: ["one-piece", "booster-boxes"], tags: ["one-piece", "booster-box", "sealed", "hot"], available: true, stock: 20, badge: "Hot", featured: true },
  { title: "One Piece TCG — Awakening of the New Era (Preorder)", slug: "one-piece-awakening-heroes-preorder", price: 10999, description: "Awakening of the New Era at pre-release pricing.", vendor: "Bandai", productType: "Booster Box", collections: ["one-piece", "preorders"], tags: ["one-piece", "booster-box", "preorder"], available: true, stock: 35, badge: "Preorder", preorder: true, preorderShips: "Q3 2026" },
  { title: "Pokémon Shrouded Fable — Master Case (6 Boxes)", slug: "pokemon-shrouded-fable-master-case", price: 84999, comparePrice: 99999, description: "Sealed Master Case of Shrouded Fable — 216 packs.", vendor: "The Pokémon Company", productType: "Master Case", collections: ["pokemon", "master-cases"], tags: ["pokemon", "master-case", "sealed", "limited"], available: true, stock: 3, badge: "Limited" },
  { title: "Yu-Gi-Oh! 25th Anniversary Tin — Case of 12", slug: "yugioh-25th-anniversary-tin-series", price: 59999, comparePrice: 71999, description: "Sealed case of 12 Yu-Gi-Oh! 25th Anniversary Tins.", vendor: "Konami", productType: "Case", collections: ["yugioh"], tags: ["yugioh", "tin", "sealed", "hot"], available: true, stock: 5, badge: "Hot" },
  { title: "Pokémon Vintage Booster Pack Lot — WOTC Era (x10)", slug: "pokemon-vintage-booster-pack-lot", price: 199999, description: "Curated lot of 10 sealed WOTC-era booster packs.", vendor: "The Pokémon Company", productType: "Vintage", collections: ["pokemon", "vintage"], tags: ["pokemon", "vintage", "sealed", "rare"], available: true, stock: 2, badge: "Rare", featured: true },
];

const COLLECTIONS = [
  { name: "Pokémon", handle: "pokemon", description: "Booster boxes, ETBs, Master Cases & vintage lots", accentColor: "#FACC15", iconName: "zap", brandSvg: "pokemon.svg", sortOrder: 1 },
  { name: "Yu-Gi-Oh!", handle: "yugioh", description: "Booster boxes, tins, collector sets", accentColor: "#A78BFA", iconName: "diamond", brandSvg: "yugioh.svg", sortOrder: 2 },
  { name: "MTG", handle: "mtg", description: "Draft boosters, collector boxes", accentColor: "#06B6D4", iconName: "sparkles", brandSvg: "mtg.svg", sortOrder: 3 },
  { name: "One Piece", handle: "one-piece", description: "Japanese & English booster boxes", accentColor: "#22C55E", iconName: "globe", brandSvg: "onepiece.svg", sortOrder: 4 },
  { name: "Preorders", handle: "preorders", description: "Lock in your price. Ships on release day.", accentColor: "#06B6D4", iconName: "bell", sortOrder: 5 },
  { name: "All Products", handle: "all", description: "Browse our full catalogue.", accentColor: "#7C3AED", iconName: "package", sortOrder: 0 },
];

/* ═══════════════════════════════════════════════════════
   FULL POLICY PAGE CONTENT (#6)
   ═══════════════════════════════════════════════════════ */

const PAGES = [
  {
    title: "Privacy Policy", slug: "privacy-policy", category: "legal",
    content: `<div class="legal-page">
  <h2>Privacy Policy</h2>
  <p class="legal-updated">Last updated: January 15, 2026</p>

  <p>At Zyphera TCG ("we", "our", "us"), your privacy is critically important. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <strong>zypheratcg.com</strong> and make purchases from our store. Please read this policy carefully.</p>

  <h3>1. Information We Collect</h3>

  <h4>Personal Information You Provide</h4>
  <p>When you create an account, place an order, or contact us, we may collect:</p>
  <ul>
    <li><strong>Identity Information:</strong> Full name, username, date of birth</li>
    <li><strong>Contact Information:</strong> Email address, phone number, billing and shipping addresses</li>
    <li><strong>Payment Information:</strong> Credit/debit card numbers (processed securely via our payment providers — we never store card details on our servers)</li>
    <li><strong>Transaction Information:</strong> Order history, purchase amounts, payment methods used</li>
    <li><strong>Communication Information:</strong> Messages you send to our support team, survey responses, product reviews</li>
  </ul>

  <h4>Information Collected Automatically</h4>
  <p>When you browse our website, we automatically collect:</p>
  <ul>
    <li><strong>Device Information:</strong> IP address, browser type and version, operating system, device type</li>
    <li><strong>Usage Information:</strong> Pages visited, time spent on pages, links clicked, referring URLs</li>
    <li><strong>Cookies & Tracking Technologies:</strong> Session cookies for cart functionality, analytics cookies for improving our service (see Section 5 for details)</li>
  </ul>

  <h3>2. How We Use Your Information</h3>
  <p>We use the information we collect for the following purposes:</p>
  <ul>
    <li><strong>Order Fulfillment:</strong> Processing, shipping, and delivering your purchases</li>
    <li><strong>Customer Support:</strong> Responding to inquiries, troubleshooting issues, and handling returns</li>
    <li><strong>Account Management:</strong> Maintaining your account details and order history</li>
    <li><strong>Marketing Communications:</strong> Sending promotional emails, preorder alerts, and drop notifications (only with your explicit consent — you can opt out at any time)</li>
    <li><strong>Website Improvement:</strong> Analyzing usage patterns to improve our site's design, performance, and product offerings</li>
    <li><strong>Fraud Prevention:</strong> Detecting and preventing fraudulent transactions and abuse</li>
    <li><strong>Legal Compliance:</strong> Meeting regulatory requirements and responding to lawful requests</li>
  </ul>

  <h3>3. How We Share Your Information</h3>
  <p>We <strong>never sell</strong> your personal data to third parties. We may share information with:</p>
  <ul>
    <li><strong>Payment Processors:</strong> our card payment provider, who process your transaction on their own encrypted page. We never see or store your card number.</li>
    <li><strong>Shipping Partners:</strong> Royal Mail, DHL, UPS, FedEx, and other carriers to deliver your orders</li>
    <li><strong>Analytics Providers:</strong> Google Analytics and similar services to understand how our site is used</li>
    <li><strong>Legal Authorities:</strong> When required by law, subpoena, or government request</li>
  </ul>

  <h3>4. Data Security</h3>
  <p>We implement industry-standard security measures including:</p>
  <ul>
    <li>256-bit SSL encryption on all pages and transactions</li>
    <li>PCI DSS-compliant payment processing</li>
    <li>Regular security audits and vulnerability assessments</li>
    <li>Access controls and employee data handling training</li>
    <li>Encrypted database storage with automated backups</li>
  </ul>
  <p>While we take every reasonable precaution, no method of internet transmission is 100% secure. We cannot guarantee absolute security.</p>

  <h3>5. Cookies Policy</h3>
  <p>We use the following types of cookies:</p>
  <ul>
    <li><strong>Essential Cookies:</strong> Required for cart functionality, user sessions, and checkout</li>
    <li><strong>Analytics Cookies:</strong> Help us understand site performance and user behavior</li>
    <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (only with your consent)</li>
  </ul>
  <p>You can manage cookie preferences in your browser settings. Disabling essential cookies may affect site functionality.</p>

  <h3>6. Your Rights</h3>
  <p>Depending on your jurisdiction, you may have the right to:</p>
  <ul>
    <li>Access the personal data we hold about you</li>
    <li>Request correction of inaccurate information</li>
    <li>Request deletion of your personal data</li>
    <li>Object to or restrict processing of your data</li>
    <li>Data portability — receive your data in a structured, machine-readable format</li>
    <li>Withdraw consent for marketing communications at any time</li>
  </ul>
  <p>To exercise any of these rights, email us at <a href="mailto:privacy@zypheratcg.com">privacy@zypheratcg.com</a>.</p>

  <h3>7. Data Retention</h3>
  <p>We retain your personal information for as long as your account is active or as needed to provide services. Order data is retained for 7 years for tax and legal compliance. You may request early deletion by contacting us.</p>

  <h3>8. Children's Privacy</h3>
  <p>Our services are not directed to individuals under 16. We do not knowingly collect personal information from children. If we discover we have collected information from a child, we will delete it promptly.</p>

  <h3>9. Changes to This Policy</h3>
  <p>We may update this policy periodically. We will notify you of significant changes via email or a prominent notice on our website. Continued use of our services after changes constitutes acceptance.</p>

  <h3>10. Contact Us</h3>
  <p>For privacy-related questions or concerns:</p>
  <ul>
    <li><strong>Email:</strong> <a href="mailto:privacy@zypheratcg.com">privacy@zypheratcg.com</a></li>
    <li><strong>Mail:</strong> Zyphera TCG, Data Protection Team, London, United Kingdom</li>
  </ul>
</div>`
  },

  {
    title: "Terms of Service", slug: "terms-of-service", category: "legal",
    content: `<div class="legal-page">
  <h2>Terms of Service</h2>
  <p class="legal-updated">Last updated: January 15, 2026</p>

  <p>Welcome to Zyphera TCG. By accessing or using our website <strong>zypheratcg.com</strong> (the "Site") and purchasing products from us, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before making a purchase.</p>

  <h3>1. Acceptance of Terms</h3>
  <p>By browsing, registering, or purchasing from Zyphera TCG, you confirm that you are at least 16 years of age and that you agree to comply with and be bound by these Terms. If you do not agree, you must not use our services.</p>

  <h3>2. Products & Descriptions</h3>
  <ul>
    <li>All products sold on Zyphera TCG are <strong>guaranteed factory sealed</strong> and sourced directly from licensed distributors.</li>
    <li>We make every effort to ensure product descriptions, images, and prices are accurate. However, we reserve the right to correct errors and update information without prior notice.</li>
    <li>Product images are for illustrative purposes. Actual packaging may differ slightly due to regional variations or manufacturer updates.</li>
  </ul>

  <h3>3. Pricing & Payment</h3>
  <ul>
    <li>All prices are listed and charged in <strong>USD</strong>. Import duty, VAT and customs handling fees on international orders are set by the destination country, are charged to you separately by the carrier or customs authority, and are <strong>not</strong> included in the price you pay us.</li>
    <li>Prices are subject to change without notice. However, prices for confirmed orders will not be altered after purchase.</li>
    <li><strong>Preorder pricing</strong> is locked at the time of purchase. You will never pay more than your confirmed preorder price.</li>
    <li>Payment is processed by our card payment provider on their own encrypted page. We do not see or store your card details at any point.</li>
  </ul>

  <h3>4. Orders & Fulfillment</h3>
  <ul>
    <li>Placing an order constitutes an offer to purchase. We reserve the right to decline or cancel orders due to pricing errors, stock limitations, or suspected fraud.</li>
    <li>You will receive an <strong>order confirmation email</strong> upon successful purchase. This does not guarantee fulfillment until the order has been shipped.</li>
    <li>Orders placed before <strong>2:00 PM GMT</strong> on business days are typically dispatched the same day.</li>
    <li>We are not responsible for delays caused by shipping carriers, customs processing, or force majeure events.</li>
  </ul>

  <h3>5. Preorders</h3>
  <ul>
    <li>Preorder products are charged at the time of purchase to secure your allocation.</li>
    <li>Preorders ship on or within 2 business days of the official release date.</li>
    <li>You may cancel a preorder at any time before dispatch for a <strong>full refund</strong>.</li>
    <li>Allocation limits may apply to certain high-demand products and are enforced per customer.</li>
  </ul>

  <h3>6. Intellectual Property</h3>
  <p>All content on this website — including logos, text, images, graphics, and software — is the property of Zyphera TCG or its content suppliers and is protected by international copyright laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>

  <h3>7. User Conduct</h3>
  <p>You agree not to:</p>
  <ul>
    <li>Use bots, scripts, or automated tools to access or interact with our website</li>
    <li>Attempt to circumvent allocation limits or create multiple accounts for the same household</li>
    <li>Submit false or misleading information during registration or checkout</li>
    <li>Engage in any activity that disrupts or interferes with our services</li>
  </ul>

  <h3>8. Limitation of Liability</h3>
  <p>To the maximum extent permitted by law, Zyphera TCG shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services, even if we have been advised of the possibility of such damages. Our total liability shall not exceed the amount you paid for the specific product(s) giving rise to the claim.</p>

  <h3>9. Governing Law</h3>
  <p>These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

  <h3>10. Contact</h3>
  <p>For questions about these Terms, contact us at <a href="mailto:legal@zypheratcg.com">legal@zypheratcg.com</a>.</p>
</div>`
  },

  {
    title: "Refund Policy", slug: "refund-policy", category: "legal",
    content: `<div class="legal-page">
  <h2>Refund Policy</h2>
  <p class="legal-updated">Last updated: January 15, 2026</p>

  <p>At Zyphera TCG, we want every customer to be completely satisfied with their purchase. This Refund Policy outlines the terms and conditions for returns, exchanges, and refunds.</p>

  <h3>1. Return Eligibility</h3>
  <p>You may return a product within <strong>14 days</strong> of delivery if:</p>
  <ul>
    <li>The product is in its <strong>original, factory-sealed condition</strong> — unopened and undamaged</li>
    <li>The product packaging (shrink wrap, outer box) has not been tampered with or removed</li>
    <li>You have your <strong>order confirmation email</strong> or order number</li>
  </ul>

  <p><strong>We cannot accept returns on:</strong></p>
  <ul>
    <li>Products that have been opened, unsealed, or tampered with</li>
    <li>Products damaged by the customer after delivery</li>
    <li>Personalized or custom orders</li>
  </ul>

  <h3>2. Damaged or Defective Items</h3>
  <p>If your order arrives damaged, defective, or incorrect:</p>
  <ul>
    <li>Contact us within <strong>48 hours</strong> of delivery with photos of the item and packaging</li>
    <li>We will arrange a <strong>free replacement, full refund, or store credit</strong> — your choice</li>
    <li>Do not discard the damaged packaging until we have resolved your claim</li>
    <li>We cover all return shipping costs for damaged or defective items</li>
  </ul>

  <h3>3. Preorder Cancellations</h3>
  <ul>
    <li>You may cancel any preorder at <strong>any time before dispatch</strong> for a full refund</li>
    <li>Refunds for preorder cancellations are processed within <strong>3-5 business days</strong></li>
    <li>Once a preorder has shipped, standard return policy applies</li>
  </ul>

  <h3>4. How to Request a Refund</h3>
  <ol>
    <li>Email <a href="mailto:returns@zypheratcg.com">returns@zypheratcg.com</a> with your order number and reason for return</li>
    <li>Our team will respond within <strong>24 hours</strong> with a return authorization and shipping instructions</li>
    <li>Ship the item back using a tracked service (we recommend keeping proof of postage)</li>
    <li>Once we receive and inspect the item, your refund will be processed within <strong>5-7 business days</strong></li>
  </ol>

  <h3>5. Refund Method</h3>
  <ul>
    <li>Refunds are issued to the <strong>original payment method</strong> used at checkout</li>
    <li>Credit and debit card refunds typically take 5-10 business days to appear on your statement, depending on your bank</li>
    <li>Store credit is issued instantly and never expires</li>
  </ul>

  <h3>6. Return Shipping Costs</h3>
  <ul>
    <li><strong>Damaged/defective items:</strong> We cover all return shipping costs</li>
    <li><strong>Change of mind:</strong> The customer is responsible for return shipping costs</li>
    <li>We recommend using a tracked shipping service — we are not responsible for items lost in return transit</li>
  </ul>

  <h3>7. Contact</h3>
  <p>For refund-related questions: <a href="mailto:returns@zypheratcg.com">returns@zypheratcg.com</a></p>
</div>`
  },

  {
    title: "Shipping & Returns", slug: "shipping-and-returns", category: "legal",
    content: `<div class="legal-page">
  <h2>Shipping & Returns</h2>
  <p class="legal-updated">Last updated: January 15, 2026</p>

  <h3>Shipping</h3>

  <h4>Processing Times</h4>
  <ul>
    <li>Orders placed before <strong>2:00 PM GMT</strong> on business days ship the same day</li>
    <li>Orders placed after 2:00 PM GMT or on weekends/holidays ship the next business day</li>
    <li>Preorders ship on or within 2 business days of the official release date</li>
  </ul>

  <h4>Delivery Estimates</h4>
  <table class="legal-table">
    <thead>
      <tr><th>Destination</th><th>Carrier</th><th>Estimated Delivery</th><th>Cost</th></tr>
    </thead>
    <tbody>
      <tr><td>United Kingdom</td><td>Royal Mail Tracked 24</td><td>1-2 business days</td><td>$4.99 / Free over $100</td></tr>
      <tr><td>United States</td><td>USPS / UPS</td><td>5-7 business days</td><td>$9.99 / Free over $150</td></tr>
      <tr><td>Canada</td><td>UPS / FedEx</td><td>5-8 business days</td><td>$12.99 / Free over $200</td></tr>
      <tr><td>Europe (EU)</td><td>DHL Express</td><td>3-5 business days</td><td>$11.99 / Free over $200</td></tr>
      <tr><td>Australia / NZ</td><td>DHL / FedEx</td><td>7-10 business days</td><td>$14.99 / Free over $250</td></tr>
      <tr><td>Rest of World</td><td>DHL Express</td><td>7-14 business days</td><td>$19.99 / Free over $300</td></tr>
    </tbody>
  </table>

  <h4>Insurance & Tracking</h4>
  <ul>
    <li><strong>All orders are fully tracked</strong> — you'll receive a tracking number via email once dispatched</li>
    <li><strong>All orders are fully insured</strong> against loss, damage, and theft during transit</li>
    <li>Orders over $500 are shipped with <strong>signature-required delivery</strong> for added security</li>
  </ul>

  <h4>Packaging</h4>
  <ul>
    <li>Booster boxes and ETBs are individually wrapped in <strong>heavy-duty bubble wrap</strong></li>
    <li>All orders are shipped in <strong>rigid corrugated cardboard boxes</strong> sized to prevent movement</li>
    <li>Master Cases are shipped in their <strong>original sealed shippers</strong> from the distributor</li>
    <li>High-value orders receive additional protective packaging and reinforced sealing</li>
  </ul>

  <h3>Returns</h3>
  <p>We accept returns on sealed, unopened products within <strong>14 days</strong> of delivery. Items must be in their original factory-sealed condition.</p>
  <ul>
    <li><strong>Damaged items:</strong> Contact us within 48 hours with photos. We cover return shipping and offer replacement, refund, or store credit.</li>
    <li><strong>Change of mind:</strong> Customer is responsible for return shipping costs. Item must be factory sealed.</li>
    <li><strong>Preorder cancellations:</strong> Cancel anytime before dispatch for a full refund.</li>
  </ul>
  <p>For full details, see our <a href="/page/refund-policy">Refund Policy</a>. Current rates and delivery estimates are on the <a href="/shipping">Shipping &amp; Delivery</a> page.</p>

  <h3>International Orders & Customs</h3>
  <ul>
    <li>International orders may be subject to <strong>import duties, taxes, and customs fees</strong> imposed by the destination country</li>
    <li>These charges are the responsibility of the customer and are not included in our prices</li>
    <li>We accurately declare all customs values — we do not mark items as "gifts" or undervalue shipments</li>
  </ul>

  <h3>Contact</h3>
  <p>For shipping questions: <a href="mailto:shipping@zypheratcg.com">shipping@zypheratcg.com</a></p>
</div>`
  },

  {
    title: "Disclaimer", slug: "disclaimer", category: "legal",
    content: `<div class="legal-page">
  <h2>Disclaimer</h2>
  <p class="legal-updated">Last updated: January 15, 2026</p>

  <h3>General Disclaimer</h3>
  <p>The information contained on the Zyphera TCG website (<strong>zypheratcg.com</strong>) is provided for general informational purposes only. While we strive to keep the information accurate and up to date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the website or the products we sell.</p>

  <h3>No Investment Advice</h3>
  <p><strong>Zyphera TCG does not provide investment, financial, tax, or legal advice.</strong></p>
  <ul>
    <li>While sealed TCG products <em>may</em> appreciate in value over time, <strong>past performance is not indicative of future results</strong></li>
    <li>The value of sealed products can <strong>go down as well as up</strong></li>
    <li>Purchasing sealed TCG products should be considered a hobby or collecting activity, not a financial investment strategy</li>
    <li>Any mentions of "investment potential", "appreciation", or "hold value" on our website or marketing materials are opinions and should not be construed as financial advice</li>
    <li>We strongly recommend consulting a qualified financial advisor before making purchasing decisions based on potential future value</li>
  </ul>

  <h3>Product Authenticity</h3>
  <ul>
    <li>All products sold by Zyphera TCG are sourced through <strong>authorized distribution channels</strong></li>
    <li>We guarantee every product is <strong>100% authentic and factory sealed</strong></li>
    <li>Our chain of custody runs directly from manufacturer → licensed distributor → Zyphera TCG → customer</li>
    <li>We do not purchase products from individual sellers, secondary markets, or unauthorized resellers</li>
  </ul>

  <h3>Trademark Notice</h3>
  <p>Zyphera TCG is <strong>not affiliated with, endorsed by, or sponsored by</strong> any of the following companies or their subsidiaries:</p>
  <ul>
    <li><strong>The Pokémon Company International</strong> — Pokémon and all related marks are trademarks of Nintendo, Creatures Inc., and GAME FREAK Inc.</li>
    <li><strong>Konami Holdings Corporation</strong> — Yu-Gi-Oh! and all related marks are trademarks of Kazuki Takahashi and Konami</li>
    <li><strong>Wizards of the Coast / Hasbro Inc.</strong> — Magic: The Gathering and all related marks are trademarks of Wizards of the Coast</li>
    <li><strong>Bandai Co., Ltd.</strong> — One Piece Card Game and all related marks are trademarks of Eiichiro Oda, Shueisha, and Bandai</li>
  </ul>
  <p>All trademarks, logos, and brand names mentioned on this website are the property of their respective owners and are used for identification purposes only.</p>

  <h3>Limitation of Liability</h3>
  <p>In no event shall Zyphera TCG, its owners, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our website or the purchase of our products, including but not limited to loss of profits, data, or goodwill.</p>

  <h3>External Links</h3>
  <p>Our website may contain links to external websites. We have no control over the content or practices of these sites and accept no responsibility for them.</p>

  <h3>Contact</h3>
  <p>If you have questions about this disclaimer, contact <a href="mailto:legal@zypheratcg.com">legal@zypheratcg.com</a>.</p>
</div>`
  },
  {
    title: "Frequently Asked Questions", slug: "faq", category: "information",
    content: `<div class="legal-page">
  <h2>Frequently Asked Questions</h2>
  <h3>Do you ship internationally?</h3>
  <p>Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by destination. Please see our Shipping & Returns page for more details.</p>
  <h3>Are your products authentic and factory sealed?</h3>
  <p>Absolutely. All our products are sourced directly from authorized distributors and are guaranteed to be 100% authentic and factory sealed.</p>
  <h3>Can I cancel a preorder?</h3>
  <p>Yes, preorders can be canceled at any time before they are dispatched for a full refund.</p>
  <h3>How do you package high-value items?</h3>
  <p>We take extreme care in packaging. Booster boxes and ETBs are individually wrapped in heavy-duty bubble wrap and shipped in rigid corrugated cardboard boxes.</p>
</div>`
  },
  {
    title: "Track Your Order", slug: "track-order", category: "information",
    content: `<div class="legal-page">
  <h2>Track Your Order</h2>
  <p>Once your order has been dispatched, you will receive a shipping confirmation email containing your tracking number.</p>
  <p>You can use that tracking number on the respective courier's website (e.g., USPS, UPS, DHL, Royal Mail) to monitor your delivery status.</p>
  <p>If you have not received a tracking number within 2 business days of your order (for in-stock items), please contact our support team at <a href="mailto:support@zypheratcg.com">support@zypheratcg.com</a>.</p>
</div>`
  }
];

module.exports = async function seedAll() {
  await Product.deleteMany({});
  await Collection.deleteMany({});
  await Page.deleteMany({});

  await Product.insertMany(PRODUCTS);
  await Collection.insertMany(COLLECTIONS);
  await Page.insertMany(PAGES);

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({ email: 'admin@zypheratcg.com', password: 'changeme123' });
  }
};
