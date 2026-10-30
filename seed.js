/**
 * GoGetCards — Database Seeder
 * Seeds products, collections, admin user, settings, and policy pages
 * Run: node seed.js
 */
require('dotenv').config();
const catalog = require('./config/catalog');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Collection = require('./models/Collection');
const User = require('./models/User');
const Page = require('./models/Page');

const PRODUCTS = [
  {
    title: "Pokémon Scarlet & Violet — Booster Box",
    slug: "pokemon-scarlet-violet-booster-box",
    price: 14999, comparePrice: 17999,
    imageUrl: "https://images.pokemontcg.io/sv1/logo.png",
    images: ["https://images.pokemontcg.io/sv1/logo.png", "https://images.pokemontcg.io/sv1/symbol.png"],
    description: "The Pokémon Scarlet & Violet Booster Box contains 36 booster packs, each with 10 cards and 1 basic Energy. Pull powerful Pokémon ex, Tera Pokémon ex, and Illustration Rare cards. Factory sealed direct from distributor — never resealed.",
    vendor: "The Pokémon Company", productType: "Booster Box",
    collections: ["pokemon", "booster-boxes", "best-sellers"],
    tags: ["pokemon", "booster-box", "scarlet-violet", "sealed", "in-stock", "hot"],
    available: true, stock: 12, badge: "Hot", featured: true,
  },
  {
    title: "Pokémon Obsidian Flames — Elite Trainer Box",
    slug: "pokemon-obsidian-flames-etb",
    price: 5999, comparePrice: 6999,
    imageUrl: "https://images.pokemontcg.io/sv3/logo.png",
    description: "The Obsidian Flames Elite Trainer Box includes 9 booster packs, 65 card sleeves, 45 Energy cards, a collector's pin, and more. The ultimate collector's accessory for the Obsidian Flames set.",
    vendor: "The Pokémon Company", productType: "Elite Trainer Box",
    collections: ["pokemon", "etbs"],
    tags: ["pokemon", "etb", "obsidian-flames", "sealed", "hot"],
    available: true, stock: 24, badge: "Hot",
  },
  {
    title: "Pokémon Paldea Evolved — Master Case (6 Boxes)",
    slug: "pokemon-paldea-evolved-master-case",
    price: 79999, comparePrice: 94999,
    imageUrl: "https://images.pokemontcg.io/sv2/logo.png",
    description: "A full sealed Master Case of Paldea Evolved containing 6 booster boxes (216 packs total). Shipped in the original sealed shipper from our distributor. Perfect for the serious investor or collector.",
    vendor: "The Pokémon Company", productType: "Master Case",
    collections: ["pokemon", "master-cases", "high-value"],
    tags: ["pokemon", "master-case", "paldea-evolved", "sealed", "high-value", "limited"],
    available: true, stock: 4, badge: "Limited", featured: true,
  },
  {
    title: "Pokémon 151 — Booster Box (Japanese)",
    slug: "pokemon-151-booster-box",
    price: 18999, comparePrice: 22999,
    imageUrl: "https://images.pokemontcg.io/sv3pt5/logo.png",
    description: "The beloved Pokémon 151 Japanese Booster Box. Features stunning art for all original 151 Pokémon, with a high pull rate for SAR cards. Factory sealed, direct import.",
    vendor: "The Pokémon Company", productType: "Booster Box",
    collections: ["pokemon", "booster-boxes", "japanese", "best-sellers"],
    tags: ["pokemon", "booster-box", "151", "japanese", "sealed", "hot"],
    available: true, stock: 8, badge: "Hot", featured: true,
  },
  {
    title: "Pokémon Twilight Masquerade — Booster Box (Preorder)",
    slug: "pokemon-twilight-masquerade-booster-box-preorder",
    price: 13999,
    description: "Secure your Twilight Masquerade Booster Box at the lowest price before release. Ships directly from our distributor on release day. Preorders guarantee allocation for this high-demand set.",
    vendor: "The Pokémon Company", productType: "Booster Box",
    collections: ["pokemon", "booster-boxes", "preorders"],
    tags: ["pokemon", "booster-box", "twilight-masquerade", "preorder"],
    available: true, stock: 50, badge: "Preorder",
    preorder: true, preorderShips: "Q2 2026", featured: true,
  },
  {
    title: "Yu-Gi-Oh! Rarity Collection Quarter Century — Booster Box",
    slug: "yugioh-rarity-collection-quarter-century",
    price: 24999, comparePrice: 29999,
    description: "The Ultimate Quarter Century Rarity Collection Booster Box. Each box contains 24 packs with stunning Quarter Century Secret Rare reprints of iconic cards. Factory sealed.",
    vendor: "Konami", productType: "Booster Box",
    collections: ["yugioh", "booster-boxes", "best-sellers"],
    tags: ["yugioh", "booster-box", "rarity-collection", "quarter-century", "sealed", "hot"],
    available: true, stock: 6, badge: "Hot", featured: true,
  },
  {
    title: "Yu-Gi-Oh! Phantom Nightmare — Booster Box",
    slug: "yugioh-phantom-nightmare-booster-box",
    price: 7999, comparePrice: 9499,
    description: "Phantom Nightmare Booster Box — 24 packs, 9 cards per pack. Introduces powerful new archetypes and supports for existing strategies. Factory sealed.",
    vendor: "Konami", productType: "Booster Box",
    collections: ["yugioh", "booster-boxes"],
    tags: ["yugioh", "booster-box", "phantom-nightmare", "sealed"],
    available: true, stock: 18,
  },
  {
    title: "MTG Final Fantasy — Collector Booster Box",
    slug: "mtg-final-fantasy-collectors-booster-box",
    price: 34999, comparePrice: 39999,
    description: "The MTG Final Fantasy Collector Booster Box. Each box contains 12 Collector Booster packs loaded with foils, special treatments, and stunning anime-style artwork. Guaranteed serialized cards in every box.",
    vendor: "Wizards of the Coast", productType: "Booster Box",
    collections: ["mtg", "booster-boxes", "best-sellers", "high-value"],
    tags: ["mtg", "booster-box", "final-fantasy", "collector", "sealed", "hot"],
    available: true, stock: 9, badge: "Hot", featured: true,
  },
  {
    title: "MTG Murders at Karlov Manor — Collector Booster Box",
    slug: "mtg-murders-at-karlov-manor-collector-box",
    price: 27999, comparePrice: 31999,
    description: "Murders at Karlov Manor Collector Booster Box. 12 packs per box, each packed with serialized Sol Ring treatments and foil borderless commanders. Factory sealed.",
    vendor: "Wizards of the Coast", productType: "Booster Box",
    collections: ["mtg", "booster-boxes"],
    tags: ["mtg", "booster-box", "karlov-manor", "collector", "sealed"],
    available: true, stock: 14,
  },
  {
    title: "One Piece TCG — Wings of the Captain Booster Box",
    slug: "one-piece-wings-of-the-captain-booster-box",
    price: 9999, comparePrice: 11999,
    description: "One Piece TCG Wings of the Captain Booster Box. 24 packs with iconic Straw Hat crew leaders and powerful new mechanics. Factory sealed, direct from distributor.",
    vendor: "Bandai", productType: "Booster Box",
    collections: ["one-piece", "booster-boxes"],
    tags: ["one-piece", "booster-box", "wings-of-captain", "sealed", "hot"],
    available: true, stock: 20, badge: "Hot", featured: true,
  },
  {
    title: "One Piece TCG — Awakening of the New Era (Preorder)",
    slug: "one-piece-awakening-heroes-preorder",
    price: 10999,
    description: "Secure your Awakening of the New Era Booster Box at pre-release pricing. The most anticipated One Piece TCG set of 2026. Ships on release day.",
    vendor: "Bandai", productType: "Booster Box",
    collections: ["one-piece", "booster-boxes", "preorders"],
    tags: ["one-piece", "booster-box", "awakening", "preorder"],
    available: true, stock: 35, badge: "Preorder",
    preorder: true, preorderShips: "Q3 2026",
  },
  {
    title: "Pokémon Shrouded Fable — Master Case (6 Boxes)",
    slug: "pokemon-shrouded-fable-master-case",
    price: 84999, comparePrice: 99999,
    description: "Sealed Master Case of Shrouded Fable, 6 booster boxes (216 packs). A must-have for the serious Pokémon investor. Ships in original sealed shipper.",
    vendor: "The Pokémon Company", productType: "Master Case",
    collections: ["pokemon", "master-cases", "high-value"],
    tags: ["pokemon", "master-case", "shrouded-fable", "sealed", "high-value", "limited"],
    available: true, stock: 3, badge: "Limited",
  },
  {
    title: "Yu-Gi-Oh! 25th Anniversary Tin — Dueling Heroes (Case of 12)",
    slug: "yugioh-25th-anniversary-tin-series",
    price: 59999, comparePrice: 71999,
    description: "Sealed case of 12 Yu-Gi-Oh! 25th Anniversary Tins. Featuring Dueling Heroes tin artwork with mega-pack reprints and exclusive promos. Factory sealed.",
    vendor: "Konami", productType: "Case",
    collections: ["yugioh", "high-value"],
    tags: ["yugioh", "tin", "25th-anniversary", "case", "sealed", "hot"],
    available: true, stock: 5, badge: "Hot",
  },
  {
    title: "Pokémon Vintage Booster Pack Lot — WOTC Era (x10)",
    slug: "pokemon-vintage-booster-pack-lot",
    price: 199999,
    description: "A curated lot of 10 sealed WOTC-era Pokémon booster packs. Packs are authenticated and stored in ideal conditions. Includes Base Set, Jungle, and Fossil packs.",
    vendor: "The Pokémon Company", productType: "Vintage",
    collections: ["pokemon", "high-value", "vintage"],
    tags: ["pokemon", "vintage", "wotc", "booster-pack", "sealed", "high-value", "rare"],
    available: true, stock: 2, badge: "Rare", featured: true,
  },
];

const COLLECTIONS = [
  ...catalog.all().map((line, i) => ({
    name: line.name, handle: line.handle, description: line.description,
    accentColor: line.accent, iconName: line.kind === 'sport' ? 'trophy' : 'sparkles', brandSvg: line.icon, sortOrder: i + 1,
  })),
  { name: "Preorders", handle: "preorders", description: "Lock in your price today. We ship directly from our distributor on release day.", accentColor: "#C2410C", iconName: "bell", sortOrder: 20 },
  { name: "All Products", handle: "all", description: "Browse our full catalogue of factory-sealed TCG and sports card products.", accentColor: "#0F2A4A", iconName: "package", sortOrder: 0 },
];

const PAGES = [
  {
    title: "Privacy Policy", slug: "privacy-policy", category: "legal",
    content: `<h2>Privacy Policy</h2>
<p>At GoGetCards, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information when you visit our website and make purchases.</p>
<h3>Information We Collect</h3>
<p>We collect information you provide directly, including your name, email address, shipping address, and payment details when you make a purchase. We also collect browsing data through cookies to improve your shopping experience.</p>
<h3>How We Use Your Information</h3>
<ul><li>Process and fulfill your orders</li><li>Send order confirmations and shipping updates</li><li>Improve our website and services</li><li>Send marketing communications (with your consent)</li></ul>
<h3>Data Protection</h3>
<p>All payment information is processed securely through our payment providers. We do not store credit card details on our servers. Your data is protected using industry-standard SSL encryption.</p>
<h3>Contact</h3>
<p>For privacy-related inquiries, contact us at <a href="mailto:support@gogetcards.com">support@gogetcards.com</a>.</p>`
  },
  {
    title: "Terms of Service", slug: "terms-of-service", category: "legal",
    content: `<h2>Terms of Service</h2>
<p>By accessing and using the GoGetCards website, you agree to be bound by these Terms of Service. Please read them carefully before making a purchase.</p>
<h3>Products</h3>
<p>All products sold on GoGetCards are guaranteed factory sealed. We source directly from licensed distributors and maintain strict chain-of-custody protocols.</p>
<h3>Pricing</h3>
<p>All prices are listed in USD. Prices are subject to change without notice. Preorder prices are locked at the time of purchase.</p>
<h3>Preorders</h3>
<p>Preorder products are not charged until they ship. You may cancel a preorder at any time before dispatch for a full refund.</p>
<h3>Limitation of Liability</h3>
<p>GoGetCards is not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>`
  },
  {
    title: "Refund Policy", slug: "refund-policy", category: "legal",
    content: `<h2>Refund Policy</h2>
<p>We want you to be completely satisfied with your purchase from GoGetCards.</p>
<h3>Returns</h3>
<p>You may return any sealed, unopened product within 14 days of delivery for a full refund. The item must be in its original condition — factory sealed and undamaged.</p>
<h3>Damaged Items</h3>
<p>If your order arrives damaged, contact us within 48 hours with photos. We will offer a replacement, full refund, or store credit — your choice.</p>
<h3>Preorder Cancellations</h3>
<p>Preorders may be cancelled at any time before dispatch for a full refund. Once shipped, standard return policy applies.</p>
<h3>How to Request a Refund</h3>
<p>Email <a href="mailto:support@gogetcards.com">support@gogetcards.com</a> with your order number and reason for return.</p>`
  },
  {
    title: "Shipping & Returns", slug: "shipping-and-returns", category: "legal",
    content: `<h2>Shipping & Returns</h2>
<h3>Shipping</h3>
<p>Orders placed before 2PM GMT ship the same business day. All orders are fully tracked and insured.</p>
<ul><li><strong>UK:</strong> 1-2 business days (Royal Mail Tracked)</li><li><strong>EU:</strong> 3-5 business days (DHL Express)</li><li><strong>US/CA:</strong> 5-7 business days (UPS/FedEx)</li><li><strong>Rest of World:</strong> 7-14 business days</li></ul>
<h3>Free Shipping</h3>
<p>Orders over $150 qualify for free tracked shipping within the UK and US.</p>
<h3>Returns</h3>
<p>We accept returns on sealed, unopened products within 14 days of delivery. See our Refund Policy for full details.</p>`
  },
  {
    title: "Disclaimer", slug: "disclaimer", category: "legal",
    content: `<h2>Disclaimer</h2>
<p>GoGetCards does not provide investment, financial, or tax advice. All information on this website is provided for general informational purposes only.</p>
<p>While sealed TCG products may appreciate in value over time, past performance is not indicative of future results. The value of sealed products can go down as well as up.</p>
<p>GoGetCards is not affiliated with, endorsed by, or sponsored by The Pokémon Company, Konami, Wizards of the Coast, Bandai, or any other trading card game manufacturer.</p>
<p>All trademarks, logos, and brand names are the property of their respective owners.</p>`
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Product.deleteMany({}),
      Collection.deleteMany({}),
      User.deleteMany({}),
      Page.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed products
    await Product.insertMany(PRODUCTS);
    console.log(`📦 Seeded ${PRODUCTS.length} products`);

    // Seed collections
    await Collection.insertMany(COLLECTIONS);
    console.log(`📁 Seeded ${COLLECTIONS.length} collections`);

    // Seed admin user
    await User.create({
      email: 'admin@gogetcards.com',
      password: 'changeme123',
    });
    console.log('👤 Created admin user (admin@gogetcards.com / changeme123)');

    // Seed pages
    await Page.insertMany(PAGES);
    console.log(`📄 Seeded ${PAGES.length} policy pages`);

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
