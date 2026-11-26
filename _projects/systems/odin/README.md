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
| `layouts/site.html` | The whole document of every ODIN page: its own head, header, menu and footer, with no OCS top bar. It loads the OCS stylesheet and the theme script, and no font. The menu is built from the pages the backend lists that have an address in `_config.yml`. The footer carries the notice of the device's regulatory status on every page, and the head takes the tab's icon from the backend. |
| `pages/` | One file per page. Each names the ODIN layout and its own address. |
| `data/ui.yml` | The words of the site's own interface: the skip link, the loading line, the error message, the labels of the two menus and the names of the two social networks. Not ODIN's content. |
| `js/content.js` | Asks the backend for the site basics, the page list, one page and an image's address. |
| `js/bind.js` | Writes content into markup, by the marks listed below. |
| `js/page.js` | Shows one page: loads its content, writes it, names the tab and switches the page's state. |
| `js/tone.js` | Writes `data-odin-tone` (`light` or `dark`) on the html element from the page's real background. The styles use it to turn the black logo white on a dark theme. The backend's `logo_light` is not used: its mark is black, so it is lost on a dark ground. |
| `sass/` | The kit's styles. `main.scss` imports the partials; `_tokens.scss` holds the sizes, the spaces and the colour aliases. |
| `tests/` | Node tests. Run `node --test _projects/systems/odin/tests/*.test.mjs` from the repo root. |

Edit the sources here. Never edit a published copy.

## How a page gets its content

1. `_config.yml` lists each page's address under `odin.routes`, by the name the backend gives the
   page. A page file's `permalink` is one of those addresses. The layout finds the page's name
   from it.
2. The layout's script hands `pythonURI` from `assets/js/api/config.js` to `createContent`, and
   calls `startPage`.
3. `startPage` asks for `/api/odin/site`, `/api/odin/pages` and `/api/odin/page?name=<name>` at
   once, and writes the answers into the marked places of the whole document.
4. The page has three states, on parts marked `data-odin-state`: `loading`, `error` and `ready`.
   One shows at a time. Everything is written, or nothing is: content with a missing value the
   page asks for shows the error state, the same as a backend that is down. The error state has a
   button that tries again.

A mark is a data attribute whose value is a path into the content: `site.<key>` (the site basics),
`page.<title|description|tab>`, `menu` (the pages with menu words and an address here),
`pages.<page name>.<name|title|menu>` (any page with an address here, for a link from one page
to another) and `sections.<section name>.<part>`.

| Mark | What is written |
|---|---|
| `data-odin-text` | The element's text. |
| `data-odin-paragraphs` | The element's text, one `p` for each paragraph of the value. |
| `data-odin-src`, `data-odin-alt` | An image's address (from its file name) and its description. |
| `data-odin-image-href` | A `link` element's address, from an image's file name. The tab's icon. |
| `data-odin-content` | A `meta` element's content. |
| `data-odin-href` | A link to another site. Only an `https` address is accepted. |
| `data-odin-tel`, `data-odin-mail` | A link that opens the phone app or the email app, from a phone number or an email address. Text that makes no clean address gets no link and still shows. |
| `data-odin-route` | A link to one of this site's pages, from the page's name. |
| `data-odin-current` | `aria-current="page"` on the link of the page being shown. |
| `data-odin-if` | Shows the element only when the content has the value. Use it for a part a section may not have. |
| `data-odin-each` | Repeats the element's `template` once for each item of a list. Inside it, `item.<part>` reads from that item. The list element takes no other mark. |

Values go in as text and attributes, never as HTML.

Two choices that differ from other kits, and why:

- `content.js` is the kit's own client. Login's `Backend` has no time limit, and a page here must
  give up on a backend that never answers and show its error state.
- The content is public, so it is asked for with `credentials: 'omit'` and no extra headers, not
  with the shared `fetchOptions`. That sends no login cookie for a public page and needs no CORS
  preflight, which halves the requests a page makes.

## Pages

| Page file | Address | Shows |
|---|---|---|
| `pages/home.md` | `/` | The opening (the short line, ODIN's name, the one line, the regulatory notice, the contact button and the headset photo), the figures as a list with thin rules, and the closing paragraph with a link on to the how it works page. |
| `pages/how-it-works.md` | `/how-it-works/` | The page title, the explanation with the regulatory notice under it beside the eye tracking picture, and the headset photo beside the features as a list of named facts. |
| `pages/about.md` | `/about/` | The page title, the page's one line, the lens photo as a band across the page, and the mission's paragraphs. |
| `pages/not-found.md` | `/404.html` | What a visitor sees at an address the site does not have: the backend's words and a button home. |
| `pages/contact.md` | `/contact/` | The page title, the line under it, phone, email and address as a list of named facts, and the EvoNexus logo with its link. |

The parts pages are built from are in `sass/_content.scss`: `odin__page-head` (a page's title and
the line under it), `odin__photo` (a photo; `odin__photo--wide` is a band across the page),
`odin__prose` (running text), `odin__pair` (two things side by side), `odin__facts` with
`odin__fact` rows (named facts with a thin rule between
them) and `odin__partner` with `odin__partner-logo` (another organisation's logo and its link).
Also there: `odin__facts--figures` (numbers as the named facts, set large), `odin__section` (a
part of a page with its own heading), `odin__onward` (the link on to the next page) and
`odin__aside` (a line that belongs to what is above it). The home page's own parts are in
`sass/_home.scss`: `odin__opening` with `odin__opening-words`, and `odin__overline`.

## Styles

- Markup uses the OCS grammar (`ocs__` classes) first. A class of the kit's own is `odin__name`,
  written the same way: block, `-part`, `--variant`, then plain modifier words.
- Every rule is under `.odin`, the class on the page's `body`. The kit's SCSS is part of the
  site-wide stylesheet, so the scope keeps it off other pages.
- Colours and type: no new colours and no new fonts. Every colour and the typeface come from the
  OCS theme (`--pref-*`), its default or the one a visitor picks. `_tokens.scss` maps them to the
  `--odin-*` aliases the other files use, and no file names a colour or a typeface.
  `tests/sass.test.mjs` checks contrast in every OCS theme.
- No inline styles, no style blocks, no CSS files.

## What the site publishes

This repo began as the OCS portfolio template, which holds its own pages, lessons, games and
media. A visitor to ODIN's site should reach none of them, so:

- `_projects/.makeprojects` registers this kit only. The template's other kits are commented
  out there, not deleted.
- `_config.yml` has an `exclude` list for everything else the template would publish. The files
  stay in the repo untouched, so an upstream sync still applies.

The built site is ODIN's five pages, `assets/css/style.css`, `assets/js/api/config.js`,
`assets/js/user-preferences.js` and this kit's four scripts: twelve files. `tests/site.test.mjs` fails when a file
or folder appears that would be published and is not in the list, such as one an upstream sync
adds.

After changing which kits are registered, remove the copies the old ones published:
`git clean -fdX -- navigation _includes/projects _layouts/projects _data/projects _plugins/projects assets/js/projects assets/css/projects assets/js/login assets/js/api _sass/projects images/projects _posts/projects`,
then `make`. Do not use the publisher's `clean` action for a template kit: some of them publish
over tracked files, and it deletes those.

## Build

```bash
make                                    # whole site on http://localhost:4500
make -C _projects/systems/odin build    # this kit only, after make has run once
```
