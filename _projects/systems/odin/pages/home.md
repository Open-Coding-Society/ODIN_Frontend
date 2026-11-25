---
layout: projects/odin/site
permalink: /
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="odin__opening">
  <div class="odin__opening-words">
    <p class="odin__overline" data-odin-if="sections.hero.kicker" data-odin-text="sections.hero.kicker"></p>
    <h1 data-odin-text="sections.hero.title"></h1>
    <p class="ocs__lead" data-odin-text="sections.hero.text"></p>
    <p data-odin-if="pages.contact"><a class="ocs__btn large accent fill" data-odin-route="pages.contact.name" data-odin-text="sections.hero.action"></a></p>
  </div>
  <figure>
    <img class="odin__photo" data-odin-src="sections.hero.image" data-odin-alt="sections.hero.image_alt">
  </figure>
</div>
<section class="odin__section">
  <h2 data-odin-text="sections.statistics.title"></h2>
  <dl class="odin__ledger" data-odin-each="sections.statistics.items">
    <template>
      <div class="odin__ledger-row">
        <dt data-odin-text="item.text"></dt>
        <dd data-odin-text="item.title"></dd>
      </div>
    </template>
  </dl>
</section>
<section class="odin__section">
  <h2 data-odin-text="sections.pitch.title"></h2>
  <div class="odin__prose" data-odin-paragraphs="sections.pitch.text"></div>
  <p class="odin__onward" data-odin-if="pages.how_it_works"><a data-odin-route="pages.how_it_works.name" data-odin-text="pages.how_it_works.menu"></a></p>
</section>
<!-- markdownlint-restore -->
