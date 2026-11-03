# GoGetCards partner batch 1 — twenty sites

Twenty partner sites for gogetcards.com, built from the batch-12 partner
template with the GoGetCards conversion (`scripts/partner/make-gogetcards-partner.py`
in the gogetcards repo). Same partner logic as zypheratcg; every site has its
own name, copy, palette, font, Whop business and Render service.

| | |
|---|---|
| Market | US only |
| Ladder | 24 one-time USD plans, rung n = n × $49.99 ($49.99 … $1,199.76) |
| Shared secrets | `THANK_YOU_SIGNING_SECRET`, `EXPERIENCE_API_KEY` — the GoGetCards pair, identical on every site and on gogetcards.com |
| Per-site secret | `EXPERIENCE_SIGNING_SECRET` — generated fresh for each site, unique |
| Parent origins | gogetcards.com, www.gogetcards.com, *.onrender.com |
| Plan ids | `plan_PENDING_01…24` until the Whop business exists — the checkout shows "not open yet" and keeps the brief |

`sites.csv` lists every repo, Render service, URL and Whop store.

## Order of operations

1. **Repos.** Create the 20 GitHub repos named in `sites.csv` (`repo` column)
   and give **turanozsoy** write access. Send the list; each site is a
   one-commit repo ready to push to `main`.
2. **Whop.** For each site, open the Whop business being repurposed and
   paste that site's prompt from `whop-prompts.md`. Send back the block each
   reply ends with (`SITE: … / WHOP: … / USD-01: plan_… … USD-24: plan_…`).
   Several blocks can be pasted in one message.
3. **Plan ids.** `python3 fill-plans.py replies.txt` writes the 24 ids into
   each site, commits, and rewrites `gogetcards-import.csv`. A block with any
   missing, duplicated or malformed id changes nothing.
4. **Render.** New → Blueprint → select the repo. `render.yaml` sets the
   service name, `npm install && npm run build`, `npm run start`, and
   `NODE_ENV=production`. No other environment variables are needed: the
   secrets are compiled in as fallbacks, and `SITE_URL` falls back to
   Render's own external URL. If Render appends a suffix to the hostname
   (name already taken), tell Claude — the `returnUrl` in the site's content,
   the Whop description and the import CSV all carry the hostname.
5. **gogetcards.** `/admin/settings` → import `gogetcards-import.csv`.
   Only sites whose 24 ids are all filled appear in it.

## Rebuilding a site

```
python3 make-site.py specs/<repo>.json   # regenerate from _template
./build-one.sh <repo> <port>              # build, boot, probe every route
```

`make-site.py` refuses to finish if any of the template's identity
(Business Plan, business-plan-review, $74.99, the old fallback plan id)
survives anywhere in the output, and `npm run build` refuses to build if the
shared secrets do not match the GoGetCards fingerprints.

In the saved copy, `_template/server/secrets.js` carries placeholders instead
of the two shared values; set `GGC_THANK_YOU_SIGNING_SECRET` and
`GGC_EXPERIENCE_API_KEY` in the environment and `make-site.py` fills them in.
