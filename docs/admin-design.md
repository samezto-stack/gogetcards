# Admin design system

The admin is a light, dense workbench built on the storefront's palette:
navy for structure, one orange for the figure that matters, grey hairlines
for everything else. One typeface (Public Sans), a monospace for ids and
codes, no serif, no uppercase mono labels, no glow, no shadows except on
menus and modals. `public/css/admin.css` is the whole system; a page that
only uses it needs no CSS of its own.

## Shell

Every admin page is one full HTML document:

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <%- include('_head', { title: 'Orders' }) %>
  <style>/* page-only rules, if any */</style>
</head>
<body class="admin-body">
  <%- include('_sidebar', { currentPath: '/admin/orders' }) %>
  <main class="admin-main">
    <header class="admin-header">
      <div>
        <h1 class="admin-header__title">Orders <span class="admin-header__count">128</span></h1>
        <p class="admin-header__sub">One line of context, optional.</p>
      </div>
      <div class="admin-header__actions"> …buttons… </div>
    </header>
    <div class="admin-content"> …page… </div>
  </main>
</body>
</html>
```

`_head.ejs` carries the meta, favicon, fonts and stylesheet. `_sidebar.ejs`
renders the navy top bar and the white navigation column; it takes
`currentPath`, and `unreadChatCount` / `unreadMessageCount` for badges.
Never link Google Fonts from a page; never add a second stylesheet other
than `distribution.css` where it is already used.

## Tokens

Use these and nothing hardcoded. Every token clears AA on white.

| Purpose | Token |
|---|---|
| canvas / panel / inset | `--admin-bg`, `--admin-card`, `--admin-panel-2`, `--admin-panel-3` |
| hairline / strong line | `--admin-border`, `--admin-border-2` |
| ink | `--admin-text`, `--admin-muted`, `--admin-faint` |
| brand | `--admin-primary` (navy), `--admin-primary-soft` (link blue), `--admin-primary-tint`, `--admin-primary-ink` (white on navy) |
| the orange | `--admin-accent`, `--admin-accent-tint` (one headline figure per page, never decoration) |
| status | `--admin-ok/-tint/-line`, `--admin-warn/…`, `--admin-crit/…`, `--admin-info/…` |
| type | `--admin-font-ui`, `--admin-font-mono` |
| shape | `--admin-r-sm` 6, `--admin-r` 8, `--admin-r-lg` 12, `--admin-focus`, `--admin-shadow-pop` |

Forbidden in views and page styles: `#fff` / `white` as text colour,
`rgba(255,255,255,…)`, `rgba(0,0,0,…)` backgrounds, `#4ade80`, `#f87171`,
`#FCA5A5`, purple (`#7C3AED`, `#A78BFA`, `rgba(124,58,237,…)`), gradients,
`box-shadow` on cards, `'Outfit'`/`'Inter'` font families, emoji in
labels or alerts, `--admin-cyan`, `--admin-bordeaux`, `--admin-font-display`.

## Components

- **Panel** `.admin-panel` > `.admin-panel__head` (`.admin-panel__title`,
  `.admin-panel__sub`, right-side controls) + `.admin-panel__body`
  (`--flush` for a table) + optional `.admin-panel__foot`.
  `--warn` / `--crit` tint the head.
- **Stat strip** `.admin-stats-grid` > `.admin-stat-card` with `__num`,
  `__label`, optional `__delta` (`.is-good` / `.is-bad` / `.is-neutral`).
  `--accent` on the one card that is the headline figure.
- **Table** `.admin-table-wrap` > `table.admin-table`. Cells: `.num`
  (right-aligned, tabular), `.mono`, `.nowrap`; rows `.is-clickable`,
  `.is-dim`; `td.admin-table__empty` for the empty row;
  `.admin-cell-link`, `.admin-cell-sub` for a title with a second line.
  `.admin-table-head` / `.admin-table-foot` for a toolbar or pager inside
  the wrap.
- **Toolbar** `.admin-filter-bar` (inline, no box) with
  `.admin-search-input`, `.admin-select`, `.admin-input`, buttons.
- **Segmented control** `.admin-seg` > `.admin-seg__item.is-on` for range
  pickers. **Tabs** `.admin-tabs` > `.admin-tab.is-on` (`.admin-tab__n`
  for a count).
- **Buttons** `.admin-btn` (default white), `--primary` (navy),
  `--accent` (orange, rare), `--danger` (red outline, fills on hover),
  `--ghost` (text), sizes `--sm`, `--xs`, `--block`. `.admin-btn-row` to
  group. `.admin-link-btn` for a text button.
- **Tags** `.admin-tag` + `--ok`, `--warn`, `--crit`, `--info`, `--navy`,
  `--accent`, `--mono`. `.status-pill status-pill--ok|warn|err|neutral`
  with `.status-pill__dot` for a state word.
- **Alerts** `.admin-alert` + `--success`, `--error`, `--warn`, `--info`.
  Text only, no emoji.
- **Empty state** `.admin-empty` (`--inset` inside a panel).
- **Forms** `.admin-form` > `.admin-form__row` (two columns) >
  `.form-group` (label, control, `small` hint). `.admin-fieldset` or a
  panel to group. `.admin-form__checks` for a row of checkboxes;
  `label.check` for a single one. `.admin-form__actions` at the end.
- **Detail** `.admin-kv` > `.admin-kv__k` / `.admin-kv__v`; or
  `dl.admin-dl`.
- **Bars** `.admin-bar` > `.admin-bar__fill` (`--accent`).
- **Pager** `.admin-pager` > `.admin-page` (`.is-on`, `.is-off`),
  `.admin-page-gap`.
- **Modal** `.admin-modal-backdrop[hidden]` > `.admin-modal` >
  `__head` (`__title`, `__sub`, `__close`) + `__body`.
- **Code** `.admin-code` inline, `.admin-code--block`.
- **Utilities** `.muted .faint .small .tiny .mono .num .ok .warn .crit
  .nowrap .truncate .pre-wrap .stack .stack--tight .row .row--between
  .grid-2 .grid-3 .mb-sm .mb-md .mb-0 .mt-0 .sr-only`.

## Page-level CSS

A page may keep a `<style>` block for layout that is genuinely its own
(a chat thread, a funnel, a globe). Rules there use the tokens above,
follow the same type scale (13 to 14 px body, 12 px secondary, 20 px page
title), and prefix their classes with the page's short code (`ot-`,
`an-`, `ab-`, …). Anything that is a panel, table, tag, button, alert or
form control uses the shared class instead of a local copy.

## What never changes in a redesign

Routes, form `action`s and `method`s, input `name`s and `id`s, hidden
fields, `data-*` attributes, the JavaScript behaviour, `jsonForScript`
usage, every `<%= %>` / `<%- %>` expression and every comment that
explains a decision. Markup around them is free to change; the behaviour
is not.
