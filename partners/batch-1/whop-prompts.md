# GoGetCards partner batch 1 — Whop setup prompts

One prompt per Whop business. Open the business you are repurposing, paste the prompt, and send the reply's final block back to Claude — it fills the plan ids into the site and writes the import CSV.

Every business: 24 one-time USD plans, rung n = n × $49.99 ($49.99 … $1,199.76). Transactional emails OFF.

## 01. Case Study  (`case-study`)

````text
You are setting up a Whop business for a website called Case Study. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Case Study
   - Business URL / slug: case-study   (so the store is whop.com/case-study/)
     If that slug is taken, use case-study-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Case Study reviews one customer case study at a time: the headline claim read against the evidence in the body, every figure checked for a stated baseline and period, and the quote checked against what the customer actually did. The brief, the files and the written report all live on https://case-study-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Case Study Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Case Study — 1 study | $49.99 |
|  2 | Case Study — 2 studies | $99.98 |
|  3 | Case Study — 3 studies | $149.97 |
|  4 | Case Study — 4 studies | $199.96 |
|  5 | Case Study — 5 studies | $249.95 |
|  6 | Case Study — 6 studies | $299.94 |
|  7 | Case Study — 7 studies | $349.93 |
|  8 | Case Study — 8 studies | $399.92 |
|  9 | Case Study — 9 studies | $449.91 |
| 10 | Case Study — 10 studies | $499.90 |
| 11 | Case Study — 11 studies | $549.89 |
| 12 | Case Study — 12 studies | $599.88 |
| 13 | Case Study — 13 studies | $649.87 |
| 14 | Case Study — 14 studies | $699.86 |
| 15 | Case Study — 15 studies | $749.85 |
| 16 | Case Study — 16 studies | $799.84 |
| 17 | Case Study — 17 studies | $849.83 |
| 18 | Case Study — 18 studies | $899.82 |
| 19 | Case Study — 19 studies | $949.81 |
| 20 | Case Study — 20 studies | $999.80 |
| 21 | Case Study — 21 studies | $1,049.79 |
| 22 | Case Study — 22 studies | $1,099.78 |
| 23 | Case Study — 23 studies | $1,149.77 |
| 24 | Case Study — 24 studies | $1,199.76 |

   Product description: "One case study review per study, delivered as a
   written report through https://case-study-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as marketing, copywriting, research or fact-checking, and do not promise more sales, conversions or approvals.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: case-study
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 02. White Paper  (`white-paper`)

````text
You are setting up a Whop business for a website called White Paper. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: White Paper
   - Business URL / slug: white-paper   (so the store is whop.com/white-paper/)
     If that slug is taken, use white-paper-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   White Paper reviews one white paper at a time: the problem checked for honest framing, the thesis checked for being stated and argued, every cited figure read against what its source actually says, and the turn to the product checked for whether it is earned. The brief, the files and the written report all live on https://white-paper-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "White Paper Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | White Paper — 1 paper | $49.99 |
|  2 | White Paper — 2 papers | $99.98 |
|  3 | White Paper — 3 papers | $149.97 |
|  4 | White Paper — 4 papers | $199.96 |
|  5 | White Paper — 5 papers | $249.95 |
|  6 | White Paper — 6 papers | $299.94 |
|  7 | White Paper — 7 papers | $349.93 |
|  8 | White Paper — 8 papers | $399.92 |
|  9 | White Paper — 9 papers | $449.91 |
| 10 | White Paper — 10 papers | $499.90 |
| 11 | White Paper — 11 papers | $549.89 |
| 12 | White Paper — 12 papers | $599.88 |
| 13 | White Paper — 13 papers | $649.87 |
| 14 | White Paper — 14 papers | $699.86 |
| 15 | White Paper — 15 papers | $749.85 |
| 16 | White Paper — 16 papers | $799.84 |
| 17 | White Paper — 17 papers | $849.83 |
| 18 | White Paper — 18 papers | $899.82 |
| 19 | White Paper — 19 papers | $949.81 |
| 20 | White Paper — 20 papers | $999.80 |
| 21 | White Paper — 21 papers | $1,049.79 |
| 22 | White Paper — 22 papers | $1,099.78 |
| 23 | White Paper — 23 papers | $1,149.77 |
| 24 | White Paper — 24 papers | $1,199.76 |

   Product description: "One white paper review per paper, delivered as a
   written report through https://white-paper-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as ghostwriting, research, fact-checking or peer review, and do not promise leads, downloads or sales.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: white-paper
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 03. Annual Report  (`annual-report`)

````text
You are setting up a Whop business for a website called Annual Report. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Annual Report
   - Business URL / slug: annual-report   (so the store is whop.com/annual-report/)
     If that slug is taken, use annual-report-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Annual Report reviews one annual report at a time, read as its members or investors read it: the narrative against the figures, last year's targets followed into this year, and every KPI checked for a consistent definition. It is not an audit and gives no assurance. The brief, the files and the written report all live on https://annual-report-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Annual Report Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Annual Report — 1 report | $49.99 |
|  2 | Annual Report — 2 reports | $99.98 |
|  3 | Annual Report — 3 reports | $149.97 |
|  4 | Annual Report — 4 reports | $199.96 |
|  5 | Annual Report — 5 reports | $249.95 |
|  6 | Annual Report — 6 reports | $299.94 |
|  7 | Annual Report — 7 reports | $349.93 |
|  8 | Annual Report — 8 reports | $399.92 |
|  9 | Annual Report — 9 reports | $449.91 |
| 10 | Annual Report — 10 reports | $499.90 |
| 11 | Annual Report — 11 reports | $549.89 |
| 12 | Annual Report — 12 reports | $599.88 |
| 13 | Annual Report — 13 reports | $649.87 |
| 14 | Annual Report — 14 reports | $699.86 |
| 15 | Annual Report — 15 reports | $749.85 |
| 16 | Annual Report — 16 reports | $799.84 |
| 17 | Annual Report — 17 reports | $849.83 |
| 18 | Annual Report — 18 reports | $899.82 |
| 19 | Annual Report — 19 reports | $949.81 |
| 20 | Annual Report — 20 reports | $999.80 |
| 21 | Annual Report — 21 reports | $1,049.79 |
| 22 | Annual Report — 22 reports | $1,099.78 |
| 23 | Annual Report — 23 reports | $1,149.77 |
| 24 | Annual Report — 24 reports | $1,199.76 |

   Product description: "One annual report review per report, delivered as a
   written report through https://annual-report-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as an audit, assurance, accounting or a review of financial statements, and never imply a qualified accountant or auditor is involved.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: annual-report
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 04. Lease Abstract  (`lease-abstract`)

````text
You are setting up a Whop business for a website called Lease Abstract. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Lease Abstract
   - Business URL / slug: lease-abstract   (so the store is whop.com/lease-abstract/)
     If that slug is taken, use lease-abstract-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Lease Abstract checks one lease abstract at a time against the lease and amendments it summarises: every date against its clause, the rent schedule against its reviews, and each option against its notice window. It is a document check, not legal advice. The brief, the files and the written report all live on https://lease-abstract-check.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Lease Abstract Check". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Lease Abstract — 1 abstract | $49.99 |
|  2 | Lease Abstract — 2 abstracts | $99.98 |
|  3 | Lease Abstract — 3 abstracts | $149.97 |
|  4 | Lease Abstract — 4 abstracts | $199.96 |
|  5 | Lease Abstract — 5 abstracts | $249.95 |
|  6 | Lease Abstract — 6 abstracts | $299.94 |
|  7 | Lease Abstract — 7 abstracts | $349.93 |
|  8 | Lease Abstract — 8 abstracts | $399.92 |
|  9 | Lease Abstract — 9 abstracts | $449.91 |
| 10 | Lease Abstract — 10 abstracts | $499.90 |
| 11 | Lease Abstract — 11 abstracts | $549.89 |
| 12 | Lease Abstract — 12 abstracts | $599.88 |
| 13 | Lease Abstract — 13 abstracts | $649.87 |
| 14 | Lease Abstract — 14 abstracts | $699.86 |
| 15 | Lease Abstract — 15 abstracts | $749.85 |
| 16 | Lease Abstract — 16 abstracts | $799.84 |
| 17 | Lease Abstract — 17 abstracts | $849.83 |
| 18 | Lease Abstract — 18 abstracts | $899.82 |
| 19 | Lease Abstract — 19 abstracts | $949.81 |
| 20 | Lease Abstract — 20 abstracts | $999.80 |
| 21 | Lease Abstract — 21 abstracts | $1,049.79 |
| 22 | Lease Abstract — 22 abstracts | $1,099.78 |
| 23 | Lease Abstract — 23 abstracts | $1,149.77 |
| 24 | Lease Abstract — 24 abstracts | $1,199.76 |

   Product description: "One lease abstract check per abstract, delivered as a
   written report through https://lease-abstract-check.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as legal advice or imply a lawyer, solicitor, attorney or licensed property professional is involved; do not promise savings or avoided penalties.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: lease-abstract
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 05. Brand Book  (`brand-book`)

````text
You are setting up a Whop business for a website called Brand Book. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Brand Book
   - Business URL / slug: brand-book   (so the store is whop.com/brand-book/)
     If that slug is taken, use brand-book-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Brand Book reviews one brand book at a time, read as the designer applying it reads it: every rule against the book's own examples, colour values compared across HEX, RGB, CMYK and Pantone, and type specifications checked for completeness. The brief, the files and the written report all live on https://brand-book-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Brand Book Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Brand Book — 1 book | $49.99 |
|  2 | Brand Book — 2 books | $99.98 |
|  3 | Brand Book — 3 books | $149.97 |
|  4 | Brand Book — 4 books | $199.96 |
|  5 | Brand Book — 5 books | $249.95 |
|  6 | Brand Book — 6 books | $299.94 |
|  7 | Brand Book — 7 books | $349.93 |
|  8 | Brand Book — 8 books | $399.92 |
|  9 | Brand Book — 9 books | $449.91 |
| 10 | Brand Book — 10 books | $499.90 |
| 11 | Brand Book — 11 books | $549.89 |
| 12 | Brand Book — 12 books | $599.88 |
| 13 | Brand Book — 13 books | $649.87 |
| 14 | Brand Book — 14 books | $699.86 |
| 15 | Brand Book — 15 books | $749.85 |
| 16 | Brand Book — 16 books | $799.84 |
| 17 | Brand Book — 17 books | $849.83 |
| 18 | Brand Book — 18 books | $899.82 |
| 19 | Brand Book — 19 books | $949.81 |
| 20 | Brand Book — 20 books | $999.80 |
| 21 | Brand Book — 21 books | $1,049.79 |
| 22 | Brand Book — 22 books | $1,099.78 |
| 23 | Brand Book — 23 books | $1,149.77 |
| 24 | Brand Book — 24 books | $1,199.76 |

   Product description: "One brand book review per book, delivered as a
   written report through https://brand-book-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as design, branding, trade mark clearance or legal advice, and do not promise brand recognition or consistency results.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: brand-book
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 06. Privacy Notice  (`privacy-notice`)

````text
You are setting up a Whop business for a website called Privacy Notice. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Privacy Notice
   - Business URL / slug: privacy-notice   (so the store is whop.com/privacy-notice/)
     If that slug is taken, use privacy-notice-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Privacy Notice reviews one privacy notice at a time against the customer's own inventory of what their product collects, uses, shares and keeps, and lists where the two disagree. It is a document comparison, not legal advice and not a compliance assessment. The brief, the files and the written report all live on https://privacy-notice-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Privacy Notice Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Privacy Notice — 1 notice | $49.99 |
|  2 | Privacy Notice — 2 notices | $99.98 |
|  3 | Privacy Notice — 3 notices | $149.97 |
|  4 | Privacy Notice — 4 notices | $199.96 |
|  5 | Privacy Notice — 5 notices | $249.95 |
|  6 | Privacy Notice — 6 notices | $299.94 |
|  7 | Privacy Notice — 7 notices | $349.93 |
|  8 | Privacy Notice — 8 notices | $399.92 |
|  9 | Privacy Notice — 9 notices | $449.91 |
| 10 | Privacy Notice — 10 notices | $499.90 |
| 11 | Privacy Notice — 11 notices | $549.89 |
| 12 | Privacy Notice — 12 notices | $599.88 |
| 13 | Privacy Notice — 13 notices | $649.87 |
| 14 | Privacy Notice — 14 notices | $699.86 |
| 15 | Privacy Notice — 15 notices | $749.85 |
| 16 | Privacy Notice — 16 notices | $799.84 |
| 17 | Privacy Notice — 17 notices | $849.83 |
| 18 | Privacy Notice — 18 notices | $899.82 |
| 19 | Privacy Notice — 19 notices | $949.81 |
| 20 | Privacy Notice — 20 notices | $999.80 |
| 21 | Privacy Notice — 21 notices | $1,049.79 |
| 22 | Privacy Notice — 22 notices | $1,099.78 |
| 23 | Privacy Notice — 23 notices | $1,149.77 |
| 24 | Privacy Notice — 24 notices | $1,199.76 |

   Product description: "One privacy notice review per notice, delivered as a
   written report through https://privacy-notice-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as legal advice, a compliance audit, a GDPR or CCPA assessment or certification, and never imply a lawyer or data protection officer is involved.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: privacy-notice
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 07. Investor Update  (`investor-update`)

````text
You are setting up a Whop business for a website called Investor Update. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Investor Update
   - Business URL / slug: investor-update   (so the store is whop.com/investor-update/)
     If that slug is taken, use investor-update-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Investor Update reviews one startup investor update at a time against the previous one: every metric checked for a consistent definition, last update's promises followed into this one, cash, burn and runway checked against each other, and every ask checked for being actionable. The brief, the files and the written report all live on https://investor-update-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Investor Update Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Investor Update — 1 update | $49.99 |
|  2 | Investor Update — 2 updates | $99.98 |
|  3 | Investor Update — 3 updates | $149.97 |
|  4 | Investor Update — 4 updates | $199.96 |
|  5 | Investor Update — 5 updates | $249.95 |
|  6 | Investor Update — 6 updates | $299.94 |
|  7 | Investor Update — 7 updates | $349.93 |
|  8 | Investor Update — 8 updates | $399.92 |
|  9 | Investor Update — 9 updates | $449.91 |
| 10 | Investor Update — 10 updates | $499.90 |
| 11 | Investor Update — 11 updates | $549.89 |
| 12 | Investor Update — 12 updates | $599.88 |
| 13 | Investor Update — 13 updates | $649.87 |
| 14 | Investor Update — 14 updates | $699.86 |
| 15 | Investor Update — 15 updates | $749.85 |
| 16 | Investor Update — 16 updates | $799.84 |
| 17 | Investor Update — 17 updates | $849.83 |
| 18 | Investor Update — 18 updates | $899.82 |
| 19 | Investor Update — 19 updates | $949.81 |
| 20 | Investor Update — 20 updates | $999.80 |
| 21 | Investor Update — 21 updates | $1,049.79 |
| 22 | Investor Update — 22 updates | $1,099.78 |
| 23 | Investor Update — 23 updates | $1,149.77 |
| 24 | Investor Update — 24 updates | $1,199.76 |

   Product description: "One investor update review per update, delivered as a
   written report through https://investor-update-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as investment, financial or legal advice, never imply it helps raise money, and do not promise funding outcomes.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: investor-update
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 08. Board Memo  (`board-memo`)

````text
You are setting up a Whop business for a website called Board Memo. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Board Memo
   - Business URL / slug: board-memo   (so the store is whop.com/board-memo/)
     If that slug is taken, use board-memo-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Board Memo reviews one board paper or decision memo at a time, read as a director preparing for the meeting reads it: the decision asked for, the options compared, every figure checked against the appendix and the rest of the pack, and every risk checked for an owner. The brief, the files and the written report all live on https://board-memo-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Board Memo Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Board Memo — 1 memo | $49.99 |
|  2 | Board Memo — 2 memos | $99.98 |
|  3 | Board Memo — 3 memos | $149.97 |
|  4 | Board Memo — 4 memos | $199.96 |
|  5 | Board Memo — 5 memos | $249.95 |
|  6 | Board Memo — 6 memos | $299.94 |
|  7 | Board Memo — 7 memos | $349.93 |
|  8 | Board Memo — 8 memos | $399.92 |
|  9 | Board Memo — 9 memos | $449.91 |
| 10 | Board Memo — 10 memos | $499.90 |
| 11 | Board Memo — 11 memos | $549.89 |
| 12 | Board Memo — 12 memos | $599.88 |
| 13 | Board Memo — 13 memos | $649.87 |
| 14 | Board Memo — 14 memos | $699.86 |
| 15 | Board Memo — 15 memos | $749.85 |
| 16 | Board Memo — 16 memos | $799.84 |
| 17 | Board Memo — 17 memos | $849.83 |
| 18 | Board Memo — 18 memos | $899.82 |
| 19 | Board Memo — 19 memos | $949.81 |
| 20 | Board Memo — 20 memos | $999.80 |
| 21 | Board Memo — 21 memos | $1,049.79 |
| 22 | Board Memo — 22 memos | $1,099.78 |
| 23 | Board Memo — 23 memos | $1,149.77 |
| 24 | Board Memo — 24 memos | $1,199.76 |

   Product description: "One board memo review per memo, delivered as a
   written report through https://board-memo-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as governance, legal, company secretarial or financial advice, and do not imply any director, lawyer or chartered professional is involved.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: board-memo
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 09. Safety Plan  (`safety-plan`)

````text
You are setting up a Whop business for a website called Safety Plan. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Safety Plan
   - Business URL / slug: safety-plan   (so the store is whop.com/safety-plan/)
     If that slug is taken, use safety-plan-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Safety Plan reviews one event or work safety plan at a time against the customer's own running order, site map and staffing list, and lists where the documents disagree: activities missing from the hazard section, controls without an owner, emergency routes that do not match the map. It is a document check, not a safety assessment. The brief, the files and the written report all live on https://safety-plan-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Safety Plan Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Safety Plan — 1 plan | $49.99 |
|  2 | Safety Plan — 2 plans | $99.98 |
|  3 | Safety Plan — 3 plans | $149.97 |
|  4 | Safety Plan — 4 plans | $199.96 |
|  5 | Safety Plan — 5 plans | $249.95 |
|  6 | Safety Plan — 6 plans | $299.94 |
|  7 | Safety Plan — 7 plans | $349.93 |
|  8 | Safety Plan — 8 plans | $399.92 |
|  9 | Safety Plan — 9 plans | $449.91 |
| 10 | Safety Plan — 10 plans | $499.90 |
| 11 | Safety Plan — 11 plans | $549.89 |
| 12 | Safety Plan — 12 plans | $599.88 |
| 13 | Safety Plan — 13 plans | $649.87 |
| 14 | Safety Plan — 14 plans | $699.86 |
| 15 | Safety Plan — 15 plans | $749.85 |
| 16 | Safety Plan — 16 plans | $799.84 |
| 17 | Safety Plan — 17 plans | $849.83 |
| 18 | Safety Plan — 18 plans | $899.82 |
| 19 | Safety Plan — 19 plans | $949.81 |
| 20 | Safety Plan — 20 plans | $999.80 |
| 21 | Safety Plan — 21 plans | $1,049.79 |
| 22 | Safety Plan — 22 plans | $1,099.78 |
| 23 | Safety Plan — 23 plans | $1,149.77 |
| 24 | Safety Plan — 24 plans | $1,199.76 |

   Product description: "One safety plan review per plan, delivered as a
   written report through https://safety-plan-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as a safety assessment, risk assessment, inspection, certification or approval, never imply a competent person, safety consultant or regulator is involved, and never say a reviewed plan or event is safe or compliant.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: safety-plan
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 10. Training Deck  (`training-deck`)

````text
You are setting up a Whop business for a website called Training Deck. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Training Deck
   - Business URL / slug: training-deck   (so the store is whop.com/training-deck/)
     If that slug is taken, use training-deck-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Training Deck reviews one training deck at a time, read as the learner reads it: every stated objective followed to the slides that teach it, the exercise that practises it and the quiz question that checks it, and every term checked for being defined before use. The brief, the files and the written report all live on https://training-deck-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Training Deck Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Training Deck — 1 deck | $49.99 |
|  2 | Training Deck — 2 decks | $99.98 |
|  3 | Training Deck — 3 decks | $149.97 |
|  4 | Training Deck — 4 decks | $199.96 |
|  5 | Training Deck — 5 decks | $249.95 |
|  6 | Training Deck — 6 decks | $299.94 |
|  7 | Training Deck — 7 decks | $349.93 |
|  8 | Training Deck — 8 decks | $399.92 |
|  9 | Training Deck — 9 decks | $449.91 |
| 10 | Training Deck — 10 decks | $499.90 |
| 11 | Training Deck — 11 decks | $549.89 |
| 12 | Training Deck — 12 decks | $599.88 |
| 13 | Training Deck — 13 decks | $649.87 |
| 14 | Training Deck — 14 decks | $699.86 |
| 15 | Training Deck — 15 decks | $749.85 |
| 16 | Training Deck — 16 decks | $799.84 |
| 17 | Training Deck — 17 decks | $849.83 |
| 18 | Training Deck — 18 decks | $899.82 |
| 19 | Training Deck — 19 decks | $949.81 |
| 20 | Training Deck — 20 decks | $999.80 |
| 21 | Training Deck — 21 decks | $1,049.79 |
| 22 | Training Deck — 22 decks | $1,099.78 |
| 23 | Training Deck — 23 decks | $1,149.77 |
| 24 | Training Deck — 24 decks | $1,199.76 |

   Product description: "One training deck review per deck, delivered as a
   written report through https://training-deck-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as instructional design, training delivery, accreditation or compliance certification, and do not promise learning outcomes or pass rates.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: training-deck
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 11. Product Roadmap  (`product-roadmap`)

````text
You are setting up a Whop business for a website called Product Roadmap. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Product Roadmap
   - Business URL / slug: product-roadmap   (so the store is whop.com/product-roadmap/)
     If that slug is taken, use product-roadmap-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Product Roadmap reviews one product roadmap at a time against the goals and capacity it is built on: every item traced to a stated goal, every period checked against stated capacity, dependencies checked for being scheduled in order, and commitments checked for being marked apart from hopes. The brief, the files and the written report all live on https://roadmap-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Roadmap Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Product Roadmap — 1 roadmap | $49.99 |
|  2 | Product Roadmap — 2 roadmaps | $99.98 |
|  3 | Product Roadmap — 3 roadmaps | $149.97 |
|  4 | Product Roadmap — 4 roadmaps | $199.96 |
|  5 | Product Roadmap — 5 roadmaps | $249.95 |
|  6 | Product Roadmap — 6 roadmaps | $299.94 |
|  7 | Product Roadmap — 7 roadmaps | $349.93 |
|  8 | Product Roadmap — 8 roadmaps | $399.92 |
|  9 | Product Roadmap — 9 roadmaps | $449.91 |
| 10 | Product Roadmap — 10 roadmaps | $499.90 |
| 11 | Product Roadmap — 11 roadmaps | $549.89 |
| 12 | Product Roadmap — 12 roadmaps | $599.88 |
| 13 | Product Roadmap — 13 roadmaps | $649.87 |
| 14 | Product Roadmap — 14 roadmaps | $699.86 |
| 15 | Product Roadmap — 15 roadmaps | $749.85 |
| 16 | Product Roadmap — 16 roadmaps | $799.84 |
| 17 | Product Roadmap — 17 roadmaps | $849.83 |
| 18 | Product Roadmap — 18 roadmaps | $899.82 |
| 19 | Product Roadmap — 19 roadmaps | $949.81 |
| 20 | Product Roadmap — 20 roadmaps | $999.80 |
| 21 | Product Roadmap — 21 roadmaps | $1,049.79 |
| 22 | Product Roadmap — 22 roadmaps | $1,099.78 |
| 23 | Product Roadmap — 23 roadmaps | $1,149.77 |
| 24 | Product Roadmap — 24 roadmaps | $1,199.76 |

   Product description: "One roadmap review per roadmap, delivered as a
   written report through https://roadmap-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as product strategy, consulting, prioritisation or estimation, and do not promise delivery dates or outcomes.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: product-roadmap
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 12. Launch Plan  (`launch-plan`)

````text
You are setting up a Whop business for a website called Launch Plan. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Launch Plan
   - Business URL / slug: launch-plan   (so the store is whop.com/launch-plan/)
     If that slug is taken, use launch-plan-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Launch Plan reviews one product or campaign launch plan at a time, read as the person running launch day reads it: every task checked for one owner and a date, dependencies checked for order, go/no-go criteria and rollback checked for being stated, and the announcement checked against what ships. The brief, the files and the written report all live on https://launch-plan-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Launch Plan Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Launch Plan — 1 plan | $49.99 |
|  2 | Launch Plan — 2 plans | $99.98 |
|  3 | Launch Plan — 3 plans | $149.97 |
|  4 | Launch Plan — 4 plans | $199.96 |
|  5 | Launch Plan — 5 plans | $249.95 |
|  6 | Launch Plan — 6 plans | $299.94 |
|  7 | Launch Plan — 7 plans | $349.93 |
|  8 | Launch Plan — 8 plans | $399.92 |
|  9 | Launch Plan — 9 plans | $449.91 |
| 10 | Launch Plan — 10 plans | $499.90 |
| 11 | Launch Plan — 11 plans | $549.89 |
| 12 | Launch Plan — 12 plans | $599.88 |
| 13 | Launch Plan — 13 plans | $649.87 |
| 14 | Launch Plan — 14 plans | $699.86 |
| 15 | Launch Plan — 15 plans | $749.85 |
| 16 | Launch Plan — 16 plans | $799.84 |
| 17 | Launch Plan — 17 plans | $849.83 |
| 18 | Launch Plan — 18 plans | $899.82 |
| 19 | Launch Plan — 19 plans | $949.81 |
| 20 | Launch Plan — 20 plans | $999.80 |
| 21 | Launch Plan — 21 plans | $1,049.79 |
| 22 | Launch Plan — 22 plans | $1,099.78 |
| 23 | Launch Plan — 23 plans | $1,149.77 |
| 24 | Launch Plan — 24 plans | $1,199.76 |

   Product description: "One launch plan review per plan, delivered as a
   written report through https://launch-plan-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as project management, marketing, PR or launch consulting, and do not promise a successful launch or any sales or coverage.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: launch-plan
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 13. Content Calendar  (`content-calendar`)

````text
You are setting up a Whop business for a website called Content Calendar. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Content Calendar
   - Business URL / slug: content-calendar   (so the store is whop.com/content-calendar/)
     If that slug is taken, use content-calendar-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Content Calendar reviews one content or editorial calendar at a time, read as the team who must produce it reads it: every entry checked for an owner and a draft deadline before publish, every week totalled against stated capacity, every piece traced to a theme, and every date checked against launches and holidays. The brief, the files and the written report all live on https://content-calendar-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Content Calendar Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Content Calendar — 1 calendar | $49.99 |
|  2 | Content Calendar — 2 calendars | $99.98 |
|  3 | Content Calendar — 3 calendars | $149.97 |
|  4 | Content Calendar — 4 calendars | $199.96 |
|  5 | Content Calendar — 5 calendars | $249.95 |
|  6 | Content Calendar — 6 calendars | $299.94 |
|  7 | Content Calendar — 7 calendars | $349.93 |
|  8 | Content Calendar — 8 calendars | $399.92 |
|  9 | Content Calendar — 9 calendars | $449.91 |
| 10 | Content Calendar — 10 calendars | $499.90 |
| 11 | Content Calendar — 11 calendars | $549.89 |
| 12 | Content Calendar — 12 calendars | $599.88 |
| 13 | Content Calendar — 13 calendars | $649.87 |
| 14 | Content Calendar — 14 calendars | $699.86 |
| 15 | Content Calendar — 15 calendars | $749.85 |
| 16 | Content Calendar — 16 calendars | $799.84 |
| 17 | Content Calendar — 17 calendars | $849.83 |
| 18 | Content Calendar — 18 calendars | $899.82 |
| 19 | Content Calendar — 19 calendars | $949.81 |
| 20 | Content Calendar — 20 calendars | $999.80 |
| 21 | Content Calendar — 21 calendars | $1,049.79 |
| 22 | Content Calendar — 22 calendars | $1,099.78 |
| 23 | Content Calendar — 23 calendars | $1,149.77 |
| 24 | Content Calendar — 24 calendars | $1,199.76 |

   Product description: "One content calendar review per calendar, delivered as a
   written report through https://content-calendar-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as content creation, social media management or marketing consulting, and do not promise engagement, followers, traffic or sales.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: content-calendar
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 14. Help Article  (`help-article`)

````text
You are setting up a Whop business for a website called Help Article. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Help Article
   - Business URL / slug: help-article   (so the store is whop.com/help-article/)
     If that slug is taken, use help-article-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Help Article reviews one help-centre or knowledge-base article at a time, read as a stuck customer reads it: the title against the question it answers, prerequisites before step one, every step against the labels in its screenshots, and the ending checked for a visible result. The brief, the files and the written report all live on https://help-article-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Help Article Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Help Article — 1 article | $49.99 |
|  2 | Help Article — 2 articles | $99.98 |
|  3 | Help Article — 3 articles | $149.97 |
|  4 | Help Article — 4 articles | $199.96 |
|  5 | Help Article — 5 articles | $249.95 |
|  6 | Help Article — 6 articles | $299.94 |
|  7 | Help Article — 7 articles | $349.93 |
|  8 | Help Article — 8 articles | $399.92 |
|  9 | Help Article — 9 articles | $449.91 |
| 10 | Help Article — 10 articles | $499.90 |
| 11 | Help Article — 11 articles | $549.89 |
| 12 | Help Article — 12 articles | $599.88 |
| 13 | Help Article — 13 articles | $649.87 |
| 14 | Help Article — 14 articles | $699.86 |
| 15 | Help Article — 15 articles | $749.85 |
| 16 | Help Article — 16 articles | $799.84 |
| 17 | Help Article — 17 articles | $849.83 |
| 18 | Help Article — 18 articles | $899.82 |
| 19 | Help Article — 19 articles | $949.81 |
| 20 | Help Article — 20 articles | $999.80 |
| 21 | Help Article — 21 articles | $1,049.79 |
| 22 | Help Article — 22 articles | $1,099.78 |
| 23 | Help Article — 23 articles | $1,149.77 |
| 24 | Help Article — 24 articles | $1,199.76 |

   Product description: "One help article review per article, delivered as a
   written report through https://help-article-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as technical writing, customer support or product testing, and do not promise fewer tickets or higher satisfaction.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: help-article
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 15. Offer Letter  (`offer-letter`)

````text
You are setting up a Whop business for a website called Offer Letter. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Offer Letter
   - Business URL / slug: offer-letter   (so the store is whop.com/offer-letter/)
     If that slug is taken, use offer-letter-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Offer Letter checks one job offer letter at a time against the terms the two sides agreed — an email, a summary or a term sheet — and lists where the figures, equity terms, dates and conditions in the letter differ. It is a document comparison, not legal, tax or employment advice. The brief, the files and the written report all live on https://offer-letter-check.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Offer Letter Check". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Offer Letter — 1 letter | $49.99 |
|  2 | Offer Letter — 2 letters | $99.98 |
|  3 | Offer Letter — 3 letters | $149.97 |
|  4 | Offer Letter — 4 letters | $199.96 |
|  5 | Offer Letter — 5 letters | $249.95 |
|  6 | Offer Letter — 6 letters | $299.94 |
|  7 | Offer Letter — 7 letters | $349.93 |
|  8 | Offer Letter — 8 letters | $399.92 |
|  9 | Offer Letter — 9 letters | $449.91 |
| 10 | Offer Letter — 10 letters | $499.90 |
| 11 | Offer Letter — 11 letters | $549.89 |
| 12 | Offer Letter — 12 letters | $599.88 |
| 13 | Offer Letter — 13 letters | $649.87 |
| 14 | Offer Letter — 14 letters | $699.86 |
| 15 | Offer Letter — 15 letters | $749.85 |
| 16 | Offer Letter — 16 letters | $799.84 |
| 17 | Offer Letter — 17 letters | $849.83 |
| 18 | Offer Letter — 18 letters | $899.82 |
| 19 | Offer Letter — 19 letters | $949.81 |
| 20 | Offer Letter — 20 letters | $999.80 |
| 21 | Offer Letter — 21 letters | $1,049.79 |
| 22 | Offer Letter — 22 letters | $1,099.78 |
| 23 | Offer Letter — 23 letters | $1,149.77 |
| 24 | Offer Letter — 24 letters | $1,199.76 |

   Product description: "One offer letter check per letter, delivered as a
   written report through https://offer-letter-check.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as legal, tax, HR or employment advice, never imply a lawyer, recruiter or HR professional is involved, and do not promise better pay or negotiation results.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: offer-letter
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 16. Partner Brief  (`partner-brief`)

````text
You are setting up a Whop business for a website called Partner Brief. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Partner Brief
   - Business URL / slug: partner-brief   (so the store is whop.com/partner-brief/)
     If that slug is taken, use partner-brief-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Partner Brief reviews one brief to an agency, freelancer or partner at a time, read as the partner receiving it reads it: every deliverable listed and checked for acceptance criteria, deadlines checked against review rounds, the budget checked against scope, and one named approver. The brief, the files and the written report all live on https://partner-brief-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Partner Brief Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Partner Brief — 1 brief | $49.99 |
|  2 | Partner Brief — 2 briefs | $99.98 |
|  3 | Partner Brief — 3 briefs | $149.97 |
|  4 | Partner Brief — 4 briefs | $199.96 |
|  5 | Partner Brief — 5 briefs | $249.95 |
|  6 | Partner Brief — 6 briefs | $299.94 |
|  7 | Partner Brief — 7 briefs | $349.93 |
|  8 | Partner Brief — 8 briefs | $399.92 |
|  9 | Partner Brief — 9 briefs | $449.91 |
| 10 | Partner Brief — 10 briefs | $499.90 |
| 11 | Partner Brief — 11 briefs | $549.89 |
| 12 | Partner Brief — 12 briefs | $599.88 |
| 13 | Partner Brief — 13 briefs | $649.87 |
| 14 | Partner Brief — 14 briefs | $699.86 |
| 15 | Partner Brief — 15 briefs | $749.85 |
| 16 | Partner Brief — 16 briefs | $799.84 |
| 17 | Partner Brief — 17 briefs | $849.83 |
| 18 | Partner Brief — 18 briefs | $899.82 |
| 19 | Partner Brief — 19 briefs | $949.81 |
| 20 | Partner Brief — 20 briefs | $999.80 |
| 21 | Partner Brief — 21 briefs | $1,049.79 |
| 22 | Partner Brief — 22 briefs | $1,099.78 |
| 23 | Partner Brief — 23 briefs | $1,149.77 |
| 24 | Partner Brief — 24 briefs | $1,199.76 |

   Product description: "One partner brief review per brief, delivered as a
   written report through https://partner-brief-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as procurement, project management, contract drafting or legal advice, and do not promise better work, lower prices or on-time delivery.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: partner-brief
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 17. Quality Manual  (`quality-manual`)

````text
You are setting up a Whop business for a website called Quality Manual. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Quality Manual
   - Business URL / slug: quality-manual   (so the store is whop.com/quality-manual/)
     If that slug is taken, use quality-manual-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Quality Manual reviews one quality or operations manual at a time against the procedures, forms and records it refers to: every cross-reference checked for a document that exists under that name and version, every role for a definition, and every required record for a form that creates it. It is a document consistency check, not an audit or certification. The brief, the files and the written report all live on https://quality-manual-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Quality Manual Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Quality Manual — 1 manual | $49.99 |
|  2 | Quality Manual — 2 manuals | $99.98 |
|  3 | Quality Manual — 3 manuals | $149.97 |
|  4 | Quality Manual — 4 manuals | $199.96 |
|  5 | Quality Manual — 5 manuals | $249.95 |
|  6 | Quality Manual — 6 manuals | $299.94 |
|  7 | Quality Manual — 7 manuals | $349.93 |
|  8 | Quality Manual — 8 manuals | $399.92 |
|  9 | Quality Manual — 9 manuals | $449.91 |
| 10 | Quality Manual — 10 manuals | $499.90 |
| 11 | Quality Manual — 11 manuals | $549.89 |
| 12 | Quality Manual — 12 manuals | $599.88 |
| 13 | Quality Manual — 13 manuals | $649.87 |
| 14 | Quality Manual — 14 manuals | $699.86 |
| 15 | Quality Manual — 15 manuals | $749.85 |
| 16 | Quality Manual — 16 manuals | $799.84 |
| 17 | Quality Manual — 17 manuals | $849.83 |
| 18 | Quality Manual — 18 manuals | $899.82 |
| 19 | Quality Manual — 19 manuals | $949.81 |
| 20 | Quality Manual — 20 manuals | $999.80 |
| 21 | Quality Manual — 21 manuals | $1,049.79 |
| 22 | Quality Manual — 22 manuals | $1,099.78 |
| 23 | Quality Manual — 23 manuals | $1,149.77 |
| 24 | Quality Manual — 24 manuals | $1,199.76 |

   Product description: "One quality manual review per manual, delivered as a
   written report through https://quality-manual-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as an audit, certification, registration or ISO consulting, never name or imply any standards or certification body, and never say a reviewed manual is compliant or certifiable.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: quality-manual
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 18. Maintenance Log  (`maintenance-log`)

````text
You are setting up a Whop business for a website called Maintenance Log. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Maintenance Log
   - Business URL / slug: maintenance-log   (so the store is whop.com/maintenance-log/)
     If that slug is taken, use maintenance-log-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Maintenance Log reviews one equipment, building or vehicle maintenance log at a time against the schedule it should follow: every scheduled task looked for inside its interval, every entry checked for being complete and signed, and every defect followed to its close-out. It is a record check, not an inspection. The brief, the files and the written report all live on https://maintenance-log-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Maintenance Log Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Maintenance Log — 1 log | $49.99 |
|  2 | Maintenance Log — 2 logs | $99.98 |
|  3 | Maintenance Log — 3 logs | $149.97 |
|  4 | Maintenance Log — 4 logs | $199.96 |
|  5 | Maintenance Log — 5 logs | $249.95 |
|  6 | Maintenance Log — 6 logs | $299.94 |
|  7 | Maintenance Log — 7 logs | $349.93 |
|  8 | Maintenance Log — 8 logs | $399.92 |
|  9 | Maintenance Log — 9 logs | $449.91 |
| 10 | Maintenance Log — 10 logs | $499.90 |
| 11 | Maintenance Log — 11 logs | $549.89 |
| 12 | Maintenance Log — 12 logs | $599.88 |
| 13 | Maintenance Log — 13 logs | $649.87 |
| 14 | Maintenance Log — 14 logs | $699.86 |
| 15 | Maintenance Log — 15 logs | $749.85 |
| 16 | Maintenance Log — 16 logs | $799.84 |
| 17 | Maintenance Log — 17 logs | $849.83 |
| 18 | Maintenance Log — 18 logs | $899.82 |
| 19 | Maintenance Log — 19 logs | $949.81 |
| 20 | Maintenance Log — 20 logs | $999.80 |
| 21 | Maintenance Log — 21 logs | $1,049.79 |
| 22 | Maintenance Log — 22 logs | $1,099.78 |
| 23 | Maintenance Log — 23 logs | $1,149.77 |
| 24 | Maintenance Log — 24 logs | $1,199.76 |

   Product description: "One maintenance log review per log, delivered as a
   written report through https://maintenance-log-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as an inspection, survey, certification, airworthiness or roadworthiness check, never imply an engineer or inspector is involved, and never say reviewed equipment is safe, compliant or fit for use.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: maintenance-log
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 19. Data Dictionary  (`data-dictionary`)

````text
You are setting up a Whop business for a website called Data Dictionary. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Data Dictionary
   - Business URL / slug: data-dictionary   (so the store is whop.com/data-dictionary/)
     If that slug is taken, use data-dictionary-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Data Dictionary reviews one data dictionary at a time against the schema it documents and a sample of the data: every column matched to an entry, types and units compared, allowed values checked against what the data holds, and definitions checked for agreeing with each other and with metric documents. The brief, the files and the written report all live on https://data-dictionary-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Data Dictionary Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Data Dictionary — 1 dictionary | $49.99 |
|  2 | Data Dictionary — 2 dictionaries | $99.98 |
|  3 | Data Dictionary — 3 dictionaries | $149.97 |
|  4 | Data Dictionary — 4 dictionaries | $199.96 |
|  5 | Data Dictionary — 5 dictionaries | $249.95 |
|  6 | Data Dictionary — 6 dictionaries | $299.94 |
|  7 | Data Dictionary — 7 dictionaries | $349.93 |
|  8 | Data Dictionary — 8 dictionaries | $399.92 |
|  9 | Data Dictionary — 9 dictionaries | $449.91 |
| 10 | Data Dictionary — 10 dictionaries | $499.90 |
| 11 | Data Dictionary — 11 dictionaries | $549.89 |
| 12 | Data Dictionary — 12 dictionaries | $599.88 |
| 13 | Data Dictionary — 13 dictionaries | $649.87 |
| 14 | Data Dictionary — 14 dictionaries | $699.86 |
| 15 | Data Dictionary — 15 dictionaries | $749.85 |
| 16 | Data Dictionary — 16 dictionaries | $799.84 |
| 17 | Data Dictionary — 17 dictionaries | $849.83 |
| 18 | Data Dictionary — 18 dictionaries | $899.82 |
| 19 | Data Dictionary — 19 dictionaries | $949.81 |
| 20 | Data Dictionary — 20 dictionaries | $999.80 |
| 21 | Data Dictionary — 21 dictionaries | $1,049.79 |
| 22 | Data Dictionary — 22 dictionaries | $1,099.78 |
| 23 | Data Dictionary — 23 dictionaries | $1,149.77 |
| 24 | Data Dictionary — 24 dictionaries | $1,199.76 |

   Product description: "One data dictionary review per dictionary, delivered as a
   written report through https://data-dictionary-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Do not describe the service as data engineering, consulting, governance or data-quality certification, and do not promise better analytics or decisions.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: data-dictionary
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````

## 20. Warranty Terms  (`warranty-terms`)

````text
You are setting up a Whop business for a website called Warranty Terms. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: Warranty Terms
   - Business URL / slug: warranty-terms   (so the store is whop.com/warranty-terms/)
     If that slug is taken, use warranty-terms-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   Warranty Terms reviews one product warranty at a time against what the business tells customers about it — product pages, packaging, checkout and support text — and lists where coverage, period, claim steps and exclusions disagree with those promises. It is a document comparison, not legal advice. The brief, the files and the written report all live on https://warranty-terms-review.onrender.com — customers buy here and use the purchase on that website, outside Whop.

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "Warranty Terms Review". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
|  1 | Warranty Terms — 1 warranty | $49.99 |
|  2 | Warranty Terms — 2 warranties | $99.98 |
|  3 | Warranty Terms — 3 warranties | $149.97 |
|  4 | Warranty Terms — 4 warranties | $199.96 |
|  5 | Warranty Terms — 5 warranties | $249.95 |
|  6 | Warranty Terms — 6 warranties | $299.94 |
|  7 | Warranty Terms — 7 warranties | $349.93 |
|  8 | Warranty Terms — 8 warranties | $399.92 |
|  9 | Warranty Terms — 9 warranties | $449.91 |
| 10 | Warranty Terms — 10 warranties | $499.90 |
| 11 | Warranty Terms — 11 warranties | $549.89 |
| 12 | Warranty Terms — 12 warranties | $599.88 |
| 13 | Warranty Terms — 13 warranties | $649.87 |
| 14 | Warranty Terms — 14 warranties | $699.86 |
| 15 | Warranty Terms — 15 warranties | $749.85 |
| 16 | Warranty Terms — 16 warranties | $799.84 |
| 17 | Warranty Terms — 17 warranties | $849.83 |
| 18 | Warranty Terms — 18 warranties | $899.82 |
| 19 | Warranty Terms — 19 warranties | $949.81 |
| 20 | Warranty Terms — 20 warranties | $999.80 |
| 21 | Warranty Terms — 21 warranties | $1,049.79 |
| 22 | Warranty Terms — 22 warranties | $1,099.78 |
| 23 | Warranty Terms — 23 warranties | $1,149.77 |
| 24 | Warranty Terms — 24 warranties | $1,199.76 |

   Product description: "One warranty terms review per warranty, delivered as a
   written report through https://warranty-terms-review.onrender.com. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. Never describe the service as legal advice, consumer-law compliance or a warranty provider, never imply a lawyer is involved, and do not promise fewer claims, returns or disputes.

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: warranty-terms
   WHOP: https://whop.com/<the final slug>/
   USD-01: plan_…
   USD-02: plan_…
   USD-03: plan_…
   USD-04: plan_…
   USD-05: plan_…
   USD-06: plan_…
   USD-07: plan_…
   USD-08: plan_…
   USD-09: plan_…
   USD-10: plan_…
   USD-11: plan_…
   USD-12: plan_…
   USD-13: plan_…
   USD-14: plan_…
   USD-15: plan_…
   USD-16: plan_…
   USD-17: plan_…
   USD-18: plan_…
   USD-19: plan_…
   USD-20: plan_…
   USD-21: plan_…
   USD-22: plan_…
   USD-23: plan_…
   USD-24: plan_…
````
