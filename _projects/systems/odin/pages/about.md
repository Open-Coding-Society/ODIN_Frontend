---
layout: projects/odin/site
full_width: true
title: About
permalink: /about/
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<div data-odin-page>
  <div class="odin__wrap odin__status" role="status">
    <div data-odin-state="loading" hidden>
      <p class="odin__loading"><span class="odin__pulse" aria-hidden="true"></span>Loading the page.</p>
    </div>
    <div data-odin-state="unavailable" hidden>
      <p class="ocs__callout">This page can't load right now. Please try again in a few minutes.</p>
    </div>
  </div>
  <div data-odin-state="ready" hidden>
    <section class="odin__page-hero">
      <canvas class="odin__network" data-odin-network aria-hidden="true"></canvas>
      <div class="odin__wrap" data-odin-reveal data-odin-section="intro">
        <h1 class="odin__title" data-odin-field="title"></h1>
      </div>
    </section>

    <section class="odin__section" data-odin-section="mission">
      <div class="odin__wrap odin__mission">
        <p class="odin__mission-text" data-odin-reveal data-odin-field="text"></p>
        <div class="odin__orbit" data-odin-reveal aria-hidden="true">
          <span class="odin__orbit-ring odin__orbit-ring--1"></span>
          <span class="odin__orbit-ring odin__orbit-ring--2"></span>
          <span class="odin__orbit-ring odin__orbit-ring--3"></span>
          <span class="odin__orbit-core">{% include projects/odin/mark.html %}</span>
        </div>
      </div>
    </section>

    <section class="odin__section odin__section--tint" data-odin-section="pillars">
      <div class="odin__wrap">
        <div class="odin__head" data-odin-reveal>
          <p class="odin__kicker" data-odin-field="kicker"></p>
          <h2 class="odin__h2" data-odin-field="title"></h2>
        </div>
        <div class="odin__pillars" data-odin-items>
          <template>
            <article class="odin__card odin__pillar" data-odin-reveal data-odin-glow>
              <h3 data-odin-field="title"></h3>
              <p data-odin-field="text"></p>
            </article>
          </template>
        </div>
      </div>
    </section>
  </div>
  <noscript>
    <p class="ocs__callout">This page needs JavaScript to load its content.</p>
  </noscript>
</div>

<script type="module">
  // Jekyll fills in the site's baseurl here. The odin modules are handed the Flask backend, so they
  // never import config.js themselves.
  import { fetchOptions, pythonURI } from '{{ site.baseurl }}/assets/js/api/config.js';
  import { Backend } from '{{ site.baseurl }}/assets/js/login/backend.js';
  import { createContent } from '{{ site.baseurl }}/assets/js/projects/odin/content.js';
  import { showPage } from '{{ site.baseurl }}/assets/js/projects/odin/page-view.js';
  import { prepareMotion, startEffects } from '{{ site.baseurl }}/assets/js/projects/odin/effects.js';
  import { startNetwork } from '{{ site.baseurl }}/assets/js/projects/odin/network.js';

  const content = createContent(new Backend(pythonURI, fetchOptions));
  const load = async () => ({ sections: await content.page('about') });
  const page = document.querySelector('[data-odin-page]');
  prepareMotion(page);
  if (await showPage({ root: page, load, imageUrl: content.imageUrl })) {
    startEffects(page);
    startNetwork(page.querySelector('[data-odin-network]'));
  }
</script>
<!-- markdownlint-restore -->
