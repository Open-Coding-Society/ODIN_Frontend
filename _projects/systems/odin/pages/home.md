---
layout: projects/odin/site
permalink: /
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="odin__opening">
  <div class="ocs__stack">
    <p class="odin__overline" data-odin-if="sections.hero.kicker" data-odin-text="sections.hero.kicker"></p>
    <h1 data-odin-text="sections.hero.title"></h1>
    <p class="ocs__lead" data-odin-text="sections.hero.text"></p>
    <p data-odin-text="site.notice"></p>
    <p data-odin-if="pages.contact"><a class="ocs__btn large accent fill" data-odin-if="sections.hero.action" data-odin-route="pages.contact.name" data-odin-text="sections.hero.action"></a></p>
  </div>
  <figure>
    <img class="odin__photo" data-odin-src="sections.hero.image" data-odin-alt="sections.hero.image_alt">
  </figure>
</div>
<section class="odin__section" aria-labelledby="odin-figures">
  <h2 id="odin-figures" data-odin-text="sections.statistics.title"></h2>
  <dl class="odin__facts odin__facts--figures" data-odin-each="sections.statistics.items">
    <template>
      <div class="odin__fact">
        <dt data-odin-text="item.title"></dt>
        <dd data-odin-text="item.text"></dd>
      </div>
    </template>
  </dl>
  <p class="odin__aside" data-odin-if="sections.statistics.text" data-odin-text="sections.statistics.text"></p>
</section>
<section class="odin__section" aria-labelledby="odin-closing">
  <h2 id="odin-closing" data-odin-text="sections.pitch.title"></h2>
  <div class="ocs__stack odin__prose" data-odin-paragraphs="sections.pitch.text"></div>
  <p class="odin__onward" data-odin-if="pages.how_it_works.menu"><a data-odin-route="pages.how_it_works.name" data-odin-text="pages.how_it_works.menu"></a></p>
</section>
<!-- markdownlint-restore -->
