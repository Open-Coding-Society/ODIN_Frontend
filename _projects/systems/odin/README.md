# ODIN

The ODIN Diagnostics website. It is its own site, built with the OCS SASS grammar: this kit is
where its layout, pages, scripts and styles go, and `make` copies them to the paths Jekyll builds
from. This file lists what the kit holds as each part is added.

## Who owns what

- The backend (ODIN_Backend, Flask) owns the content: every word, number, image and link a visitor
  reads.
- This kit owns the presentation: layout, SCSS, JS and each page's address.
- No site text or image is kept here.

## Files

| Path | What it is |
|---|---|
| `distribution.json` | Where each source is published. Every destination is an `odin` folder that `.gitignore` covers. |
| `layouts/site.html` | The whole document of every ODIN page: its own head and body, with no OCS top bar. It loads the OCS stylesheet and the theme script. |
| `pages/` | One file per page. Each names the ODIN layout and its own address. |
| `data/ui.yml` | The words of the site's own interface, such as the skip link. Not ODIN's content. |
| `sass/` | The kit's styles. `main.scss` imports the partials; `_tokens.scss` is the only file that names a colour or a typeface. |
| `tests/` | Node tests. Run `node --test _projects/systems/odin/tests/*.test.mjs` from the repo root. |

Edit the sources here. Never edit a published copy.

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
