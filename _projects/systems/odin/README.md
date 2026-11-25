# ODIN

The ODIN Diagnostics website. It is its own site: its own layout, menu, pages, scripts and styles,
built with the OCS SASS grammar. The sources live here, and `make` copies them to the paths Jekyll
builds from.

## Who owns what

- The backend (ODIN_Backend, Flask) owns the content: every word, number, image and link a visitor
  reads. Pages ask for it at `/api/odin/...`.
- This kit owns the presentation: layout, SCSS, JS and each page's address.
- No site text or image is kept here. When the backend cannot be reached, a page shows a
  connection error and nothing else.

## Files

| Path | What it is |
|---|---|
| `distribution.json` | Where each source is published. Every destination is inside a `projects/odin` folder, which Git ignores. |
| `tests/` | Node tests. Run `node --test _projects/systems/odin/tests/*.test.mjs` from the repo root. |

Edit the sources here. Never edit a published copy.

## Build

```bash
make                                    # whole site on http://localhost:4500
make -C _projects/systems/odin build    # this kit only
```
