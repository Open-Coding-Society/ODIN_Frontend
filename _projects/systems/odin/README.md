# ODIN

ODIN is the website for ODIN Diagnostics. It is a registered system project like
[Login](../login/README.md): the sources live in this folder, and `make`
copies them to the paths Jekyll reads.

It has the layout every ODIN page uses (the shared OCS frame with ODIN's footer),
the scripts that read content from the backend, the three pages of the site (home,
About and Contact Us), the contact block that home and Contact Us share, one page
that checks the connection, and the drawings and motion that make the pages move.

## Content comes from the backend

The website's text and numbers belong in the Flask backend, and pages load them
from its API. Keep them out of this folder. These words do live in the frontend:
the menus and the site's `title` in `_config.yml`, each page's `title` in its front
matter (the browser tab's label and the page's entry in the top bar), and the
loading and error messages.

The pages show none of ODIN's own photos or logo files. Every picture is drawn
here instead: the eye in the home page's header (`js/eye-hero.js`), the headset
beside the features (`_includes/headset.html`), the moving chart beside the steps
(`js/wave.js`), the network behind the About and Contact Us headers
(`js/network.js`), the icons and the eye mark beside the company's name in the
footer (`_includes/mark.html`). They are decoration, so each is hidden from screen
readers and the words around it say what matters. The backend's sections still
name their images, which the pages no longer ask for.

## The layout and the menus

A page uses the layout with `layout: projects/odin/site`. That layout is built
on the shared OCS layout, `opencs`, so an ODIN page has the same frame as every
OCS page: the OCS head, the top bar with the site menu and Login, and the page
column. The top bar is not restyled. The ODIN layout adds ODIN's headline font
(Sora, from Google Fonts), a soft glow of the theme's colors behind the page
(`.odin__aurora`), the footer and the script that fills it. The three site pages
set `full_width: true`, which the shared layout turns into a page as wide as the
window.

The site menu is the OCS one: `minima.nav_pages` in `_config.yml` lists the ODIN
pages by their published paths, in menu order, and the top bar shows each page's
`title`. Sign-in is the shared Login page at `/login`, which signs in to the
same Flask backend the content comes from. The footer's two lists are under
`odin:` in `_config.yml`: `footer_nav` and `social`. `_includes/footer.html`
only loops over them. The menus show even when the backend is down.

The browser tab's title is the page's `title` and the site's `title` from
`_config.yml`, written by the shared head.

The footer's company name, tagline, social link addresses and copyright line come
from the site basics. Each part that shows them is marked `data-odin-frame` and
stays hidden until `js/site-frame.js` has filled it.

## Styles

Styles are in `sass/main.scss`, and every class starts with `odin__`. Everything
is scoped to `.odin`, so the top bar and other pages are untouched.

- **Colors come only from the visitor's theme**, so the pages follow the
  Preferences page. `--odin-a1` is the theme's accent, and `--odin-a2` and
  `--odin-a3` are the accent with its hue turned 60 degrees one way and 50 the
  other (CSS relative colors). `js/palette.js` turns the hue by the same amounts
  for the drawings. Tints are `color-mix()` over those and the theme's text and
  panel colors. There are no fixed colors.
- **Headlines** use Sora; body text keeps the theme's font.
- Some themes force the color of every link and text element with `!important`.
  Text drawn with a gradient, and the words on the main button, set
  `-webkit-text-fill-color`, which a theme does not force, so they stay readable.
- A visitor who asks the system for less motion gets everything in place with
  nothing moving by itself. High-contrast modes turn the gradient text off.

A page's main heading is an `h1`. Another project's stylesheet hides every `h1`
on the site, and `sass/main.scss` shows them again inside the ODIN layout.

## The scripts

- `js/content.js` asks Flask for content. `createContent(flask).site()` returns
  the ten site basics from `GET /api/odin/site`, such as `name`, `phone` and
  `logo_dark`. It throws `ContentUnavailableError` when Flask is down, takes
  longer than eight seconds, or answers without text for one of them.
  `page(name)` returns the sections of one page from
  `GET /api/odin/page?name=<name>`. It throws the same error when the answer is
  not a list of named sections.
  `imageUrl(name)` gives the address of an image by its file name.
- `js/content-view.js` shows a record in the page. `showContent` shows one of
  three blocks marked `data-odin-state`: `loading`, `ready` or `unavailable`.
  It fills the marked elements: `data-odin-field` for text and `data-odin-href`
  for a link, which must be an https address. When the content cannot be loaded
  the visitor sees the unavailable block and no content.
- `js/page-view.js` shows a page built from sections. `showPage` uses the same
  three blocks. Each section's element is marked `data-odin-section="<name>"`,
  and inside it:
  - `data-odin-field="<part>"` takes a part's text: `kicker`, `title`, `text` or
    `action`.
  - `data-odin-href="link"` takes the section's link.
  - `data-odin-image` takes the section's image and its description.
  - `data-odin-items` marks a list. The `<template>` inside it is copied once
    per item of the section. In the template, `data-odin-field` takes the item's
    `title` or `text`, and an item must have both.

  Anywhere inside the element handed to `showPage`, `data-odin-basic="<key>"`
  takes a site basic, such as `phone`. Add `data-odin-opens="tel"` or `"mailto"`
  to make it a link that opens the phone or email app. Text that makes no clean
  link, such as a number with an extension, is shown without one. `load`
  resolves to `{ sections, site }`, and `site` is only needed by a page that
  shows site basics.

  The backend must send text for every part the markup asks for, or the whole
  page is unavailable. Do not nest one section's element in another's: a section
  fills every mark inside its element. The same section may be marked more than
  once, as the hero's two buttons and the contact block's `details` are. A page
  can show sections of more than one backend page, as long as no two have the
  same name.
- `js/site-frame.js` runs the footer: `startFrame` fills the parts marked
  `data-odin-frame`. It also exports `watchTheme`, which the drawings use to
  repaint when the visitor changes theme.
- `js/effects.js` starts the motion once a page is showing. Call
  `prepareMotion(page)` before `showPage` and `startEffects(page)` after it.
  - `data-odin-reveal` rises and fades in as it scrolls into view.
  - `data-odin-count` counts up to its figure; a screen reader reads the figure itself.
  - `data-odin-glow` gets a light that follows the pointer.
  - `data-odin-stepper` is a list whose items take turns being active and can be
    picked by pointing, clicking or tabbing.
  - Links to `#part` scroll there smoothly.
- `js/canvas-loop.js` runs a drawing on a canvas: it sizes the canvas for the
  screen and redraws only while the canvas is on screen and the tab is showing.
- `js/eye-hero.js`, `js/wave.js` and `js/network.js` are the drawings named above.
- `js/follow-dot.js` is the home page's "follow the dot" demo, and
  `js/dot-path.js` its math (where the dot is, and the share of the time the
  visitor stayed close). The demo shows the idea of eye tracking; its words say
  it is not a medical test.
- `js/figures.js` reads and writes figures such as `$131,500,000` for the count,
  and `js/palette.js` reads the theme's colors for the drawings.

A page's own script imports `assets/js/api/config.js` and Login's
`assets/js/login/backend.js` with `{{ site.baseurl }}`, builds the Flask backend
and hands it to these modules, as `pages/connection.md` does. The modules never
import `config.js`. They import each other with `./` paths.

The wording of the loading and unavailable blocks is in the page's markup. A
page needs all three blocks. Put each state on a plain `div`, because a class
that sets `display` would override the `hidden` attribute. Give the element
around the loading and unavailable blocks `role="status"`, so a screen reader
announces those two messages. Keep the ready block outside it, or the whole page
is read out as one announcement. On the home, About and Contact Us pages all
three start hidden, so a visitor without JavaScript sees only the note that the
page needs it.

## Resources

`distribution.json` lists each source and where it is published. Each
destination must be an `odin` folder inside one of the shared `projects/` folders;
`tests/distribution.test.mjs` checks this. `scripts/publish_project.rb`
(`DESTINATIONS`) lists the top-level folders any manifest may publish under. Git
ignores the published copies (see "Project distributions" in `.gitignore`), so
edit the sources here.

| Source | Published destination |
| --- | --- |
| `pages/` | `navigation/projects/odin/` |
| `layouts/` | `_layouts/projects/odin/` |
| `_includes/` | `_includes/projects/odin/` |
| `js/` | `assets/js/projects/odin/` |
| `sass/main.scss` | `_sass/projects/odin/main.scss` |

`_includes/contact.html` is the contact block: a card each for the phone number,
the email and the address, then the partner with a link to its site. A page that
includes it loads the backend's `contact` page and the site basics, as
`pages/home.md` and `pages/contact.md` do. Contact Us includes it with
`heading=false`, because its own heading says the same.

`pages/home.md` is the home page, at the site root: the header with the eye, the
statistics, the features beside the headset, how it works with its steps, the
"follow the dot" demo, the comparison, the closing pitch and the FDA notice, then
the contact block. It took the place of the template's placeholder `index.md`, so
keep the root free of another index page.

`pages/about.md` is the About page, at `/about/`: the title over the moving
network, the mission beside turning rings, and the pillars. It took the place of
the template's own `navigation/about.md`, which was removed with its photos in
`images/about/` and its `nav_pages` entry in `_config.yml`. Keep that file from
coming back, or two pages claim `/about/`.

`pages/contact.md` is the Contact Us page, at `/contact/`: the page's title and
the line under it over the moving network, then the contact block.

`pages/connection.md` is the connection check. Its permalink is
`/odin/connection/`, which `baseurl` puts at `/ODIN_Frontend/odin/connection/`.
It is for the team and is left out of the menu and of the site's own search.

The system is registered as `systems/odin:dev` in `_projects/.makeprojects` and
uses the generated Makefile.

## Validation

```sh
make generate-makefiles
make -C _projects/systems/odin build
node --test _projects/systems/odin/tests/*.test.mjs
```

To check the pages in a browser, start Flask on port 8587 and the site with
`make`. The home page is at `http://localhost:4500/ODIN_Frontend/`, with About at
`/ODIN_Frontend/about/`, Contact Us at `/ODIN_Frontend/contact/` and the
connection check at `/ODIN_Frontend/odin/connection/`. After a kit build, if a
running site does not pick up the change, `touch /tmp/.jekyll_rebuild_trigger`.
Try a few themes from the Preferences page, and a phone width. Stop Flask and
reload to see the unavailable message.
