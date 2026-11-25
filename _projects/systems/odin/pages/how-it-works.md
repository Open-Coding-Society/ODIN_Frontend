---
layout: projects/odin/site
permalink: /how-it-works/
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div class="odin__page-head">
  <h1 data-odin-text="page.title"></h1>
</div>
<div class="odin__pair">
  <p class="ocs__lead" data-odin-text="sections.how_it_works.text"></p>
  <img class="odin__photo" data-odin-src="sections.how_it_works.image" data-odin-alt="sections.how_it_works.image_alt">
</div>
<div class="odin__pair">
  <img class="odin__photo" data-odin-src="sections.features.image" data-odin-alt="sections.features.image_alt">
  <dl class="odin__facts" data-odin-each="sections.features.items">
    <template>
      <div class="odin__fact">
        <dt data-odin-text="item.title"></dt>
        <dd data-odin-text="item.text"></dd>
      </div>
    </template>
  </dl>
</div>
<!-- markdownlint-restore -->
