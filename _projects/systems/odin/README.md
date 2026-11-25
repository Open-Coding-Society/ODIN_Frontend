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
| `tests/` | Node tests. Run `node --test _projects/systems/odin/tests/*.test.mjs` from the repo root. |

Edit the sources here. Never edit a published copy.

## Build

```bash
make                                    # whole site on http://localhost:4500
make -C _projects/systems/odin build    # this kit only, after make has run once
```
