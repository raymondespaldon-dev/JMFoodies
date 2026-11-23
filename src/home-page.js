import { supabase, isConfigured } from './supabase.js';
import { logoMark } from './brand.js';

const app = document.querySelector('#app');
const money = value => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2
}).format(Number(value || 0));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const heroSlides = [
  {
    title: '01: Adobo Feast',
    alt: 'Filipino chicken adobo with rice and vegetables',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=86'
  },
  {
    title: '02: Pancit Palabok',
    alt: 'A generous plate of Filipino noodles with shrimp',
    image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=86'
  },
  {
    title: '03: Crispy Pata',
    alt: 'Crispy pata served for a Filipino celebration',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=86'
  },
  {
    title: '04: Sinigang na Hipon',
    alt: 'Sinigang na hipon with shrimp and vegetables',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=86'
  },
  {
    title: '05: Lechon Kawali',
    alt: 'Sliced crispy pork with herbs and dipping sauce',
    image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1200&q=86'
  }
];

const navIcon = name => {
  const paths = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>'
  };
  return `<svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

function packageCard(pkg) {
  return `<article class="home-package-card">
    <div class="home-package-art" aria-hidden="true"><span>${pkg.image_url ? '' : 'JM'}</span>${pkg.image_url ? `<img src="${esc(pkg.image_url)}" alt="">` : ''}</div>
    <div class="home-package-body">
      <p class="home-eyebrow">${esc(pkg.minimum_guests || '')}${pkg.minimum_guests ? ' GUEST MINIMUM' : ' MENU COLLECTION'}</p>
      <h3>${esc(pkg.name)}</h3>
      <p>${esc(pkg.description || 'A thoughtfully prepared menu for your celebration.')}</p>
      <div class="home-package-footer"><strong>${money(pkg.price_per_person)} <small>/ person</small></strong><a href="/booking.html?package=${encodeURIComponent(pkg.id)}">Customize ${navIcon('arrow')}</a></div>
    </div>
  </article>`;
}

function markup() {
  return `<div class="homepage">
    <header class="home-nav" data-home-nav>
      <a class="home-brand" href="/index.html" aria-label="JMFoodies home"><span class="home-brand-logo">${logoMark(72)}</span></a>
      <button class="home-menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="home-navigation">${navIcon('menu')}</button>
      <nav id="home-navigation" class="home-navigation" aria-label="Main navigation">
        <a class="is-current" href="/index.html">Home</a>
        <a href="#services">Services</a>
        <a href="#packages">Packages</a>
        <a href="#contact">Contact</a>
      </nav>
      <a class="home-nav-login" href="/login.html">Sign in ${navIcon('arrow')}</a>
    </header>

    <main>
      <section class="home-hero-new" aria-labelledby="home-title">
        <div class="home-hero-pattern" aria-hidden="true"></div>
        <div class="home-hero-copy">
          <p class="home-eyebrow home-eyebrow-gold">WE CATER, YOU CELEBRATE</p>
          <h1 id="home-title">Filipino flavors<br><em>made for gathering.</em></h1>
          <p class="home-hero-lede">From family milestones to team celebrations, JMFoodies brings comforting food and thoughtful catering to the table.</p>
          <div class="home-actions"><a class="home-button home-button-gold" href="/booking.html">Plan your event ${navIcon('arrow')}</a><a class="home-text-button" href="#packages">Explore packages <span aria-hidden="true">↓</span></a></div>
          <div class="home-proof"><span class="home-proof-mark">✦</span><span><strong>Masarap na handa.</strong><small>Masayang salu-salo.</small></span></div>
        </div>
        <div class="home-hero-plate" aria-label="Featured JMFoodies dishes">
          <div class="home-plate-glow" aria-hidden="true"></div>
          <div class="home-slide-frame" data-home-slider tabindex="0">
            <div class="home-slide-track"></div>
            <div class="home-slide-badge">Made to<br>share</div>
            <button class="home-slide-control home-slide-prev" type="button" aria-label="Previous featured dish">‹</button>
            <button class="home-slide-control home-slide-next" type="button" aria-label="Next featured dish">›</button>
            <div class="home-slide-meta"><span class="home-slide-dots" aria-label="Featured dish slides"></span></div>
          </div>
          <div class="home-plate-caption"><span>JMFOODIES</span><small>Great food · great memories</small></div>
        </div>
      </section>

      <section class="home-services" id="services" aria-labelledby="services-title">
        <div class="home-section-intro"><p class="home-eyebrow">WHAT WE DO</p><h2 id="services-title">Good food is<br><em>the start of it all.</em></h2><p>Choose the kind of gathering you’re planning and let’s make the menu feel just right.</p></div>
        <div class="home-service-grid"><a class="home-service-card" href="/booking.html"><span class="home-service-number">01</span><h3>Event catering</h3><p>Build a menu around your celebration, your guests, and your occasion.</p><span class="home-service-link">Plan a menu ${navIcon('arrow')}</span></a><a class="home-service-card home-service-card-accent" href="/packages.html"><span class="home-service-number">02</span><h3>Food packages</h3><p>Start with a prepared package, then customize it with dishes you love.</p><span class="home-service-link">View packages ${navIcon('arrow')}</span></a><a class="home-service-card" href="/track-booking.html"><span class="home-service-number">03</span><h3>Booking updates</h3><p>Keep track of your request from submission through confirmation.</p><span class="home-service-link">Track a booking ${navIcon('arrow')}</span></a></div>
      </section>

      <section class="home-packages-section" id="packages" aria-labelledby="packages-title"><div class="home-section-heading"><div><p class="home-eyebrow home-eyebrow-gold">OUR MENU COLLECTIONS</p><h2 id="packages-title">A package for every<br><em>kind of celebration.</em></h2></div><a class="home-outline-button" href="/packages.html">See all packages ${navIcon('arrow')}</a></div><div id="home-package-list" class="home-package-grid"><p class="home-loading">Loading available packages…</p></div></section>

      <section class="home-contact-band" id="contact" aria-labelledby="contact-title"><p class="home-eyebrow home-eyebrow-gold">READY WHEN YOU ARE</p><h2 id="contact-title">Let’s put something<br><em>delicious together.</em></h2><p>Start with a package or send us the details of your next gathering.</p><div class="home-actions"><a class="home-button home-button-gold" href="/booking.html">Book an event ${navIcon('arrow')}</a><a class="home-button home-button-light" href="/register.html">Create an account</a></div></section>
    </main>
    <footer class="home-footer"><span>© JMFoodies</span><span>Thoughtfully prepared for your celebrations.</span><a href="/login.html">Sign in</a></footer>
  </div>`;
}

export async function renderHomePage() {
  app.innerHTML = markup();
  const nav = document.querySelector('[data-home-nav]');
  const toggle = document.querySelector('.home-menu-toggle');
  const navigation = document.querySelector('#home-navigation');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  navigation?.addEventListener('click', event => {
    if (event.target.closest('a')) {
      nav.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });
  window.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', window.scrollY > 10), { passive: true });

  const slider = document.querySelector('[data-home-slider]');
  const track = slider?.querySelector('.home-slide-track');
  const dots = slider?.querySelector('.home-slide-dots');
  let activeSlide = 0;
  let timer;
  let transitionTimer;
  if (slider && track && dots) {
    track.innerHTML = heroSlides.map((slide, index) => `<figure class="home-slide${index === 0 ? ' is-active' : ''}" data-slide="${index}"><img src="${slide.image}" alt="${esc(slide.alt)}" loading="${index === 0 ? 'eager' : 'lazy'}"><figcaption>${esc(slide.title)}</figcaption></figure>`).join('');
    dots.innerHTML = heroSlides.map((slide, index) => `<button type="button" class="home-slide-dot${index === 0 ? ' is-active' : ''}" data-slide-to="${index}" aria-label="Show ${esc(slide.title)}" aria-pressed="${index === 0}"></button>`).join('');
    const showSlide = (index, direction = 1) => {
      const nextSlide = (index + heroSlides.length) % heroSlides.length;
      const slides = [...slider.querySelectorAll('.home-slide')];
      if (nextSlide === activeSlide || !slides[nextSlide]) return;
      clearTimeout(transitionTimer);
      const current = slides[activeSlide];
      const incoming = slides[nextSlide];
      slides.forEach(slide => slide.classList.remove('is-active', 'is-leaving', 'is-entering', 'slide-forward', 'slide-backward'));
      current.classList.add('is-active', 'is-leaving', direction > 0 ? 'slide-forward' : 'slide-backward');
      incoming.classList.add('is-entering', direction > 0 ? 'slide-forward' : 'slide-backward');
      transitionTimer = window.setTimeout(() => {
        incoming.classList.add('is-active');
        transitionTimer = window.setTimeout(() => { current.classList.remove('is-active'); slides.forEach(slide => slide.classList.remove('is-leaving', 'is-entering', 'slide-forward', 'slide-backward')); }, 720);
      }, 180);
      activeSlide = nextSlide;
      slider.querySelectorAll('.home-slide-dot').forEach((dot, dotIndex) => { const active = dotIndex === activeSlide; dot.classList.toggle('is-active', active); dot.setAttribute('aria-pressed', String(active)); });
    };
    const stop = () => clearInterval(timer);
    const start = () => { stop(); timer = window.setInterval(() => showSlide(activeSlide + 1), 5000); };
    slider.querySelector('.home-slide-prev')?.addEventListener('click', () => { showSlide(activeSlide - 1, -1); start(); });
    slider.querySelector('.home-slide-next')?.addEventListener('click', () => { showSlide(activeSlide + 1, 1); start(); });
    dots.addEventListener('click', event => { const dot = event.target.closest('[data-slide-to]'); if (!dot) return; const next = Number(dot.dataset.slideTo); showSlide(next, next >= activeSlide ? 1 : -1); start(); });
    slider.addEventListener('mouseenter', stop); slider.addEventListener('mouseleave', start); slider.addEventListener('focusin', stop); slider.addEventListener('focusout', event => { if (!slider.contains(event.relatedTarget)) start(); });
    slider.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(activeSlide - 1, -1); start(); } if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(activeSlide + 1, 1); start(); } });
    start();
  }

  const list = document.querySelector('#home-package-list');
  if (!isConfigured || !supabase) {
    list.innerHTML = '<p class="home-empty">Packages will appear here once the catalogue is connected.</p>';
    return;
  }
  const { data, error } = await supabase.from('packages').select('*').eq('is_active', true).order('sort_order');
  list.innerHTML = error
    ? '<p class="home-empty">Packages could not be loaded right now. Please try again later.</p>'
    : data?.length ? data.slice(0, 3).map(packageCard).join('') : '<p class="home-empty">No packages are published yet. Please check back soon.</p>';
}
