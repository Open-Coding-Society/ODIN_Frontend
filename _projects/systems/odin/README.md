# ODIN

The ODIN Diagnostics website. It is its own site, built with the OCS SASS grammar: this kit is
where its layout, pages, scripts and styles go, and `make` copies them to the paths Jekyll builds
from. This file lists what the kit holds as each part is added.

## Who owns what

- The backend (ODIN_Backend, Flask) owns the content: every word, number, image and link a visitor
  reads.
- This kit owns the presentation: layout, SCSS, JS and each page's address.
- No site text or image is kept here. When the backend cannot be reached, a page shows a
  connection error and nothing else.

## Files

| Path | What it is |
|---|---|
| `distribution.json` | Where each source is published. Every destination is an `odin` folder that `.gitignore` covers. |
| `layouts/site.html` | The whole document of every ODIN page: its own head and body, with no OCS top bar. It loads the OCS stylesheet and the theme script. |
| `pages/` | One file per page. Each names the ODIN layout and its own address. |
| `data/ui.yml` | The words of the site's own interface: the skip link, the loading line and the connection error. Not ODIN's content. |
| `js/content.js` | Asks the backend for the site basics, the page list, one page and an image's address. |
| `js/bind.js` | Writes content into markup, by the marks listed below. |
| `js/page.js` | Shows one page: loads its content, writes it, names the tab and switches the page's state. |
| `sass/` | The kit's styles. `main.scss` imports the partials; `_tokens.scss` is the only file that names a colour or a typeface. |
| `tests/` | Node tests. Run `node --test _projects/systems/odin/tests/*.test.mjs` from the repo root. |

Edit the sources here. Never edit a published copy.

## How a page gets its content

1. `_config.yml` lists each page's address under `odin.routes`, by the name the backend gives the
   page. A page file's `permalink` is one of those addresses. The layout finds the page's name
   from it.
2. The layout's script hands `pythonURI` and `fetchOptions` from `assets/js/api/config.js` to
   `createContent`, and calls `startPage`.
3. `startPage` asks for `/api/odin/site`, `/api/odin/pages` and `/api/odin/page?name=<name>` at
   once, and writes the answers into the marked places of the whole document.
4. The page has three states, on parts marked `data-odin-state`: `loading`, `error` and `ready`.
   One shows at a time. Everything is written, or nothing is: content with a missing value the
   page asks for shows the error state, the same as a backend that is down. The error state has a
   button that tries again.

A mark is a data attribute whose value is a path into the content: `site.<key>` (the site basics),
`page.<title|description|tab>`, `menu` (the pages with menu words and an address here) and
`sections.<section name>.<part>`.

| Mark | What is written |
|---|---|
| `data-odin-text` | The element's text. |
| `data-odin-paragraphs` | The element's text, one `p` for each paragraph of the value. |
| `data-odin-src`, `data-odin-alt` | An image's address (from its file name) and its description. |
| `data-odin-content` | A `meta` element's content. |
| `data-odin-href` | A link to another site. Only an `https` address is accepted. |
| `data-odin-tel`, `data-odin-mail`, `data-odin-map` | A link that opens the phone app, the email app or a map, from a phone number, an email address or a street address. |
| `data-odin-route` | A link to one of this site's pages, from the page's name. |
| `data-odin-current` | `aria-current="page"` on the link of the page being shown. |
| `data-odin-if` | Shows the element only when the content has the value. Use it for a part a section may not have. |
| `data-odin-each` | Repeats the element's `template` once for each item of a list. Inside it, `item.<part>` reads from that item. |

Values go in as text and attributes, never as HTML.

## Styles

- Markup uses the OCS grammar (`ocs__` classes) first. A class of the kit's own is `odin__name`,
  written the same way: block, `-part`, `--variant`, then plain modifier words.
- Every rule is under `.odin`, the class on the page's `body`. The kit's SCSS is part of the
  site-wide stylesheet, so the scope keeps it off other pages.
- Colours: `_tokens.scss` sets ODIN's defaults (the white of the headset, the black of the logo,
  the green of the lit lens) into the site's theme variables, for a visitor who has not picked a
  theme. A picked theme replaces all of them. Other files use the `--odin-*` aliases and never
  name a colour.
- No inline styles, no style blocks, no CSS files.

## Build

```bash
make                                    # whole site on http://localhost:4500
make -C _projects/systems/odin build    # this kit only, after make has run once
```
