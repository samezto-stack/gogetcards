# Products by CSV

`/admin/products/import` takes a spreadsheet of products and creates or
updates them in one go, the way Shopify's product import does. The same
page exports the current catalogue as a CSV you can edit and re-import,
offers a template with every column filled in, and can draft the
spreadsheet from a list of image links.

## The rules

- **One row per product.** The first row is the header. Column order
  does not matter; headers are matched case-insensitively, and a file
  exported from Shopify is understood (Handle, Title, Body (HTML), Vendor,
  Type, Variant Price, Variant SKU, Image Src …).
- **Handle is the key.** A row whose `handle` (the URL slug) matches an
  existing product updates it. With no handle, a matching `sku` is used.
  Otherwise the row creates a product, and the handle is made from the
  title.
- **A column you leave out is left alone** on products that already
  exist. **A column you include is what the product becomes**, even when
  the cell is blank, because what you see in the sheet should be what you
  get. A new product gets the form's defaults for anything missing.
- **Nothing is written at Preview.** The page shows, per row, whether it
  would create, update, or fail, and why. Errors (no title, no price, a
  duplicate handle inside the file) skip the row. Warnings (a price off
  the $49.99 grid, no line collection, no image, an odd barcode) go
  through as they are.
- **The same validation as the form.** Every row is turned into the body
  the product form posts and runs through the same parser, so the import
  cannot be more lenient than typing the product in by hand.

## Columns

Lists inside a cell (images, specs, collections, tags) are separated by
`|`. true/false cells also accept yes/no and 1/0. Prices are written the
way you would say them: `149.97`, never `14997`.

| Column | Meaning |
|---|---|
| `handle` | URL slug. Blank: made from the title. |
| `title` | Required for a new product. |
| `vendor` | Publisher or manufacturer as shown on the page. |
| `product_type` | Booster Box, Elite Trainer Box, Hobby Box, Case … |
| `price` | USD. Must be a multiple of 49.99 to be sold through a partner site. |
| `compare_price` | The "was" price. |
| `stock` | Units on hand, or the allocation for a preorder. |
| `available`, `preorder`, `featured`, `stock_hold` | true/false. |
| `preorder_ships` | Display text: "Q2 2026". |
| `release_date` | YYYY-MM-DD. Drives the page and Google's availabilityDate. |
| `badge` | Hot, Limited, Preorder, Rare, New. |
| `image_url` | The main photo. A product without one is left out of the Google feed. |
| `images` | More photo URLs, `|`-separated. |
| `description` | HTML allowed. |
| `specs` | `Label: Value` pairs, `|`-separated. |
| `collections` | Collection handles, `|`-separated. Include the line (pokemon, mtg, one-piece, lorcana, baseball, basketball, football). |
| `tags` | `|`-separated. |
| `sku`, `gtin`, `mpn`, `brand` | Google Shopping identifiers. Copy a GTIN; never guess one. |
| `language`, `edition`, `set_code` | Facts a buyer asks for by name. |
| `variant_group`, `variant_name`, `variant_axis`, `variant_order` | Boxes of one product. See the product form. |
| `allocation_limit` | Max units per customer. 0 = unlimited. |
| `superseded_by` | Handle of the replacement offered at a stock-hold refusal. |
| `price_CA`, `compare_CA`, `available_CA` (and UK, EU) | Per-market prices in that currency. Blank price: not sold there. |

## From image links

Paste one image URL per line under "Start from image links". Each
product becomes a row with the handle, title, line, vendor and photos
filled in from the file name (`pokemon-prismatic-evolutions-etb-front.jpg`
is enough to write the title and pick Pokémon). Views of one product
(`…-front`, `…-back`, `…-2`) fold into one row. The price is never
guessed; the preview refuses the row until it is typed in.

## Where the code is

- `services/productCsv.js` owns the column list, the parser, the
  planner and the draft builder. It never touches the database.
- `routes/admin.js` serves the page, the template, the export, the
  preview and the import. The import loads the catalogue once, plans,
  then saves row by row through the same `parseProductBody` the form
  uses, reporting any row Mongo refuses.
- `test/productCsv.test.js` covers parsing, the round trip, matching,
  Shopify headers and the draft.
