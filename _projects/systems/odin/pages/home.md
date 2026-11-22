---
layout: projects/odin/site
full_width: true
title: Home
permalink: /
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
    <section class="odin__hero">
      <div class="odin__wrap odin__hero-grid">
        <div class="odin__hero-copy" data-odin-reveal>
          <div data-odin-section="hero">
            <p class="odin__kicker"><span class="odin__pulse" aria-hidden="true"></span><span data-odin-field="kicker"></span></p>
            <h1 class="odin__title" data-odin-field="title"></h1>
            <p class="odin__lead" data-odin-field="text"></p>
          </div>
          <div class="odin__actions">
            <span data-odin-section="hero"><a class="odin__btn odin__btn--primary" href="#contact" data-odin-field="action"></a></span>
            <span data-odin-section="demo"><a class="odin__btn odin__btn--ghost" href="#demo" data-odin-field="kicker"></a></span>
          </div>
        </div>
        <div class="odin__hero-visual" data-odin-reveal>
          <span class="odin__ring odin__ring--outer" aria-hidden="true"></span>
          <span class="odin__ring odin__ring--inner" aria-hidden="true"></span>
          <canvas class="odin__eye" data-odin-eye aria-hidden="true"></canvas>
        </div>
      </div>
      <span class="odin__scroll-cue" aria-hidden="true"></span>
    </section>

    <section class="odin__section" id="statistics" data-odin-section="statistics">
      <div class="odin__wrap">
        <div class="odin__head" data-odin-reveal>
          <h2 class="odin__h2" data-odin-field="title"></h2>
        </div>
        <div class="odin__stats" data-odin-items>
          <template>
            <article class="odin__card odin__stat" data-odin-reveal data-odin-glow>
              <span class="odin__stat-value" data-odin-field="title" data-odin-count></span>
              <span class="odin__stat-bar" aria-hidden="true"></span>
              <p class="odin__stat-label" data-odin-field="text"></p>
            </article>
          </template>
        </div>
      </div>
    </section>

    <section class="odin__section" id="features">
      <div class="odin__wrap odin__features">
        <div class="odin__headset" data-odin-reveal>
          {% include projects/odin/headset.html %}
        </div>
        <div data-odin-section="features">
          <div class="odin__feature-grid" data-odin-items>
            <template>
              <article class="odin__card odin__feature" data-odin-reveal data-odin-glow>
                <span class="odin__icon" aria-hidden="true">{% include projects/odin/glyphs-features.html %}</span>
                <h3 data-odin-field="title"></h3>
                <p data-odin-field="text"></p>
              </article>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="odin__section odin__section--tint" id="how">
      <div class="odin__wrap odin__how">
        <div class="odin__how-intro" data-odin-reveal data-odin-section="how_it_works">
          <h2 class="odin__h2" data-odin-field="title"></h2>
          <p class="odin__lead" data-odin-field="text"></p>
          <canvas class="odin__wave" data-odin-wave aria-hidden="true"></canvas>
        </div>
        <div class="odin__card odin__steps-card" data-odin-reveal data-odin-section="steps">
          <p class="odin__kicker" data-odin-field="kicker"></p>
          <h3 class="odin__h3" data-odin-field="title"></h3>
          <ol class="odin__steps" data-odin-items data-odin-stepper>
            <template>
              <li class="odin__step">
                <h4 data-odin-field="title"></h4>
                <p data-odin-field="text"></p>
              </li>
            </template>
          </ol>
        </div>
      </div>
    </section>

    <section class="odin__section" id="demo" data-odin-section="demo">
      <div class="odin__wrap odin__demo">
        <div class="odin__demo-copy" data-odin-reveal>
          <p class="odin__kicker" data-odin-field="kicker"></p>
          <h2 class="odin__h2" data-odin-field="title"></h2>
          <p class="odin__text" data-odin-field="text"></p>
          <button type="button" class="odin__btn odin__btn--primary" data-odin-demo-start data-odin-field="action"></button>
          <div class="odin__demo-result" data-odin-demo-result hidden>
            <span class="odin__demo-score" data-odin-demo-score></span>
            <div data-odin-items>
              <template>
                <div class="odin__demo-label">
                  <strong data-odin-field="title"></strong>
                  <span data-odin-field="text"></span>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="odin__demo-stage" data-odin-reveal>
          <canvas data-odin-demo aria-hidden="true"></canvas>
        </div>
      </div>
    </section>

    <section class="odin__section" data-odin-section="compare">
      <div class="odin__wrap">
        <div class="odin__head" data-odin-reveal>
          <p class="odin__kicker" data-odin-field="kicker"></p>
          <h2 class="odin__h2" data-odin-field="title"></h2>
        </div>
        <div class="odin__compare" data-odin-items>
          <template>
            <article class="odin__card odin__compare-card" data-odin-reveal data-odin-glow>
              <span class="odin__icon" aria-hidden="true">{% include projects/odin/glyphs-compare.html %}</span>
              <h3 data-odin-field="title"></h3>
              <p data-odin-field="text"></p>
            </article>
          </template>
        </div>
      </div>
    </section>

    <section class="odin__section">
      <div class="odin__wrap">
        <div class="odin__pitch" data-odin-reveal data-odin-section="pitch">
          <h2 class="odin__h2" data-odin-field="title"></h2>
          <p class="odin__lead" data-odin-field="text"></p>
        </div>
        <div class="odin__notice" data-odin-reveal data-odin-section="fda">
          <svg class="odin__glyph" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z"/><path d="M12 8v5M12 16v.5"/></svg>
          <div>
            <h3 data-odin-field="title"></h3>
            <p data-odin-field="text"></p>
          </div>
        </div>
      </div>
    </section>

    {% include projects/odin/contact.html %}
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
  import { startEye } from '{{ site.baseurl }}/assets/js/projects/odin/eye-hero.js';
  import { startWave } from '{{ site.baseurl }}/assets/js/projects/odin/wave.js';
  import { startDemo } from '{{ site.baseurl }}/assets/js/projects/odin/follow-dot.js';

  const content = createContent(new Backend(pythonURI, fetchOptions));
  // The contact block's words are the backend's contact page, so that page is loaded here too.
  const load = async () => {
    const [home, contact, site] = await Promise.all([content.page('home'), content.page('contact'), content.site()]);
    return { sections: [...home, ...contact], site };
  };
  const page = document.querySelector('[data-odin-page]');
  prepareMotion(page);
  const shown = await showPage({ root: page, load, imageUrl: content.imageUrl });
  if (shown) {
    startEffects(page);
    startEye(page.querySelector('[data-odin-eye]'));
    startWave(page.querySelector('[data-odin-wave]'));
    startDemo(page.querySelector('#demo'));
  }
  // A link to a part of the page, such as #contact, arrives before that part is showing
  const target = shown && location.hash ? document.getElementById(location.hash.slice(1)) : null;
  if (target) target.scrollIntoView();
</script>
<!-- markdownlint-restore -->
