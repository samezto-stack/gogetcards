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

/* Sample catalogue: one real product per line, both kinds. Prices are
   placeholders in cents, no images (the card renders its placeholder), so
   nothing here can be mistaken for live stock. Delete these from the admin
   before launch or replace them with the real list. */
const PRODUCTS = [
  {
    title: "Pokémon Prismatic Evolutions — Elite Trainer Box",
    slug: "pokemon-prismatic-evolutions-etb",
    price: 9998, comparePrice: 10999,
    description: "Nine Prismatic Evolutions booster packs plus 65 sleeves, 45 energy cards, dice, markers and the player's guide. Factory sealed, shrink wrap intact, photographed before it ships.",
    vendor: "The Pokémon Company", productType: "Elite Trainer Box", setCode: "SV8.5",
    specs: [{ label: "Configuration", value: "9 Booster Packs" }, { label: "Cards Per Pack", value: "10" }, { label: "Also Includes", value: "65 Card Sleeves, 45 Energy Cards, Dice & Counters" }, { label: "Language", value: "English" }],
    collections: ["pokemon", "etbs", "best-sellers"],
    tags: ["pokemon", "etb", "prismatic-evolutions", "sealed", "hot"],
    available: true, stock: 4, badge: "Hot", featured: true,
  },
  {
    title: "Magic: The Gathering — Final Fantasy Collector Booster Box",
    slug: "mtg-final-fantasy-collector-booster-box",
    price: 44991, comparePrice: 47999,
    description: "Twelve Collector Boosters of the Final Fantasy set, weighted toward foil, extended-art and borderless treatments. Factory sealed from Wizards of the Coast distribution.",
    vendor: "Wizards of the Coast", productType: "Collector Booster Box",
    specs: [{ label: "Configuration", value: "12 Collector Booster Packs" }, { label: "Cards Per Pack", value: "15" }, { label: "Language", value: "English" }],
    collections: ["mtg", "booster-boxes", "high-value"],
    tags: ["mtg", "booster-box", "final-fantasy", "collector", "sealed"],
    available: true, stock: 6, badge: "New", featured: true,
  },
  {
    title: "One Piece Card Game — OP-11 Booster Box (Japanese)",
    slug: "one-piece-op-11-booster-box-japanese",
    price: 14997, comparePrice: 15999,
    description: "Twenty-four packs of twelve cards, Japanese print, in the original Bandai wrap. Set code OP-11.",
    vendor: "Bandai", productType: "Booster Box", language: "Japanese", setCode: "OP-11",
    specs: [{ label: "Configuration", value: "24 Booster Packs" }, { label: "Cards Per Pack", value: "12" }, { label: "Language", value: "Japanese" }],
    collections: ["one-piece", "booster-boxes", "japanese"],
    tags: ["one-piece", "booster-box", "op-11", "japanese", "sealed"],
    available: true, stock: 10, badge: "", featured: true,
  },
  {
    title: "Disney Lorcana — Fabled Booster Box",
    slug: "lorcana-fabled-booster-box",
    price: 14997, comparePrice: 15499,
    description: "Twenty-four packs of twelve cards from the Fabled set, factory sealed in the original Ravensburger wrap.",
    vendor: "Ravensburger", productType: "Booster Box",
    specs: [{ label: "Configuration", value: "24 Booster Packs" }, { label: "Cards Per Pack", value: "12" }, { label: "Language", value: "English" }],
    collections: ["lorcana", "booster-boxes"],
    tags: ["lorcana", "booster-box", "fabled", "sealed"],
    available: true, stock: 8, badge: "", featured: false,
  },
  {
    title: "2025 Topps Chrome Baseball — Hobby Box",
    slug: "2025-topps-chrome-baseball-hobby-box",
    price: 29994, comparePrice: 31999,
    description: "The hobby configuration of 2025 Topps Chrome Baseball, with the guaranteed autographs printed on the box. Factory sealed, bought by the case, never searched.",
    vendor: "Topps", productType: "Hobby Box",
    specs: [{ label: "Configuration", value: "Hobby Box" }, { label: "Packs Per Box", value: "24" }, { label: "Cards Per Pack", value: "4" }, { label: "Guaranteed Hits", value: "2 Autographs" }, { label: "Sport", value: "Baseball" }, { label: "Season", value: "2025" }],
    collections: ["baseball", "hobby-boxes", "best-sellers"],
    tags: ["baseball", "topps", "chrome", "hobby-box", "sealed"],
    available: true, stock: 12, badge: "", featured: true,
  },
  {
    title: "2024-25 Panini Prizm Basketball — Hobby Box",
    slug: "2024-25-panini-prizm-basketball-hobby-box",
    price: 119976, comparePrice: 127500,
    description: "The hobby box of 2024-25 Prizm Basketball, two autographs per box as printed. Factory sealed in the original Panini wrap, photographed before shipping.",
    vendor: "Panini", productType: "Hobby Box",
    specs: [{ label: "Configuration", value: "Hobby Box" }, { label: "Packs Per Box", value: "12" }, { label: "Cards Per Pack", value: "12" }, { label: "Guaranteed Hits", value: "2 Autographs" }, { label: "Sport", value: "Basketball" }, { label: "Season", value: "2024-25" }],
    collections: ["basketball", "hobby-boxes", "high-value"],
    tags: ["basketball", "panini", "prizm", "hobby-box", "sealed", "high-value"],
    available: true, stock: 3, badge: "Hot", featured: true,
  },
  {
    title: "2025 Panini Select Football — Hobby Box (Preorder)",
    slug: "2025-panini-select-football-hobby-box-preorder",
    price: 49990,
    description: "Reserve the 2025 Select Football hobby box from our allocation. Charged at checkout, shipped on street date; a short allocation is refunded first.",
    vendor: "Panini", productType: "Hobby Box",
    specs: [{ label: "Configuration", value: "Hobby Box" }, { label: "Packs Per Box", value: "" }, { label: "Cards Per Pack", value: "" }, { label: "Guaranteed Hits", value: "" }, { label: "Sport", value: "Football" }, { label: "Season", value: "2025" }],
    collections: ["football", "hobby-boxes", "preorders"],
    tags: ["football", "panini", "select", "hobby-box", "preorder"],
    available: true, stock: 24, badge: "Preorder",
    preorder: true, preorderShips: "On release day", featured: true,
  },
  {
    title: "2025 Bowman Baseball — Jumbo Box (Preorder)",
    slug: "2025-bowman-baseball-jumbo-box-preorder",
    price: 39992,
    description: "Reserve the 2025 Bowman Baseball jumbo box from our allocation. Charged at checkout, shipped on street date.",
    vendor: "Topps", productType: "Jumbo Box",
    specs: [{ label: "Configuration", value: "Jumbo Hobby Box" }, { label: "Packs Per Box", value: "" }, { label: "Cards Per Pack", value: "" }, { label: "Guaranteed Hits", value: "" }, { label: "Sport", value: "Baseball" }, { label: "Season", value: "2025" }],
    collections: ["baseball", "jumbo-boxes", "preorders"],
    tags: ["baseball", "topps", "bowman", "jumbo-box", "preorder"],
    available: true, stock: 12, badge: "Preorder",
    preorder: true, preorderShips: "On release day", featured: false,
  },
  {
    title: "Pokémon Destined Rivals — Booster Bundle",
    slug: "pokemon-destined-rivals-booster-bundle",
    price: 4999, comparePrice: 5499,
    description: "Six Destined Rivals booster packs in the sealed retail bundle. Factory sealed from Pokémon distribution.",
    vendor: "The Pokémon Company", productType: "Booster Bundle", setCode: "SV10",
    specs: [{ label: "Configuration", value: "6 Booster Packs" }, { label: "Cards Per Pack", value: "10" }, { label: "Language", value: "English" }],
    collections: ["pokemon", "bundles"],
    tags: ["pokemon", "booster-bundle", "destined-rivals", "sealed"],
    available: true, stock: 30, badge: "", featured: false,
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
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16) {
      await User.create({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      console.log(`👤 Created admin user (${process.env.ADMIN_EMAIL})`);
    } else {
      console.log('👤 No admin user created: set ADMIN_EMAIL and ADMIN_PASSWORD (16+ chars)');
    }

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
