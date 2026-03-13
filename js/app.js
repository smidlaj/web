(() => {
  'use strict';

  /** @type {any} */
  const config = window.appConfig;
  if (!config) {
    document.body.textContent = 'Missing appConfig (js/config.js)';
    return;
  }

  // --- DOM refs
  const els = {
    gate: document.getElementById('gate'),
    gateBg: document.querySelector('.gate__bg'),
    gateTitle: document.querySelector('[data-i18n="gateTitle"]'),
    gateText: document.querySelector('[data-i18n="gateText"]'),
    gateAccept: document.getElementById('gateAccept'),
    gateDecline: document.getElementById('gateDecline'),
    gateAcceptImg: document.getElementById('gateAcceptImg'),
    gateDeclineImg: document.getElementById('gateDeclineImg'),

    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    albumList: document.getElementById('albumList'),
    seriesSidebarList: document.getElementById('seriesSidebarList'),

    hamburger: document.getElementById('hamburger'),
    search: document.getElementById('search'),

    subheader: document.getElementById('subheader'),

    grid: document.getElementById('grid'),
    pagination: document.getElementById('pagination'),

    lightbox: document.getElementById('lightbox'),
    lbImage: document.getElementById('lbImage'),
    lbCaption: document.getElementById('lbCaption'),
    lbClose: document.getElementById('lbClose'),
    lbPrev: document.getElementById('lbPrev'),
    lbNext: document.getElementById('lbNext'),
  };

  // --- App state
  const state = {
    lang: loadLang(),

    // Views: 'photos' | 'seriesMeta' | 'seriesGallery'
    view: 'photos',
    selectedAlbumId: 'all',
    selectedSeriesId: null,

    searchQuery: '',
    page: 1,

    // Gate = adult consent (simple two-button screen)
    gateAccepted: false,
    adultAllowed: false,

    // Per-photo UI state (keyed by filename)
    openResults: new Set(),

    // Lightbox
    lightboxOpen: false,
    lightboxList: /** @type {any[]} */ ([]),
    lightboxIndex: 0,
  };

  // --- Data
  const data = {
    models: /** @type {any[]} */ ([]),
    salons: /** @type {any[]} */ ([]),
    photos: /** @type {any[]} */ ([]),
    series: /** @type {any[]} */ ([]),

    modelsById: new Map(),
    salonsByAnyId: new Map(),
    seriesById: new Map(),
  };

  // --- Init
  main().catch((err) => {
    console.error(err);
    els.grid.innerHTML = `<div class="loading">${escapeHtml(String(err))}</div>`;
  });

  async function main() {
    setupResponsive();
    setupGlobalEvents();

    // Show loading text before data arrives
    els.grid.innerHTML = `<div class="loading">${escapeHtml(t('loading'))}</div>`;

    await loadAllData();
    buildIndexes();

    setupGate();

    renderStaticBits();
    render();
  }

  // --- Data loading
  async function loadAllData() {
    const [models, salons, photos, series] = await Promise.all([
      loadJson(config.data.models),
      loadJson(config.data.salons),
      loadJson(config.data.photos),
      loadJsonOptional(config.data.series, []),
    ]);

    data.models = Array.isArray(models) ? models : [];
    data.salons = Array.isArray(salons) ? salons : [];
    data.photos = Array.isArray(photos) ? photos : [];
    data.series = Array.isArray(series) ? series : [];
  }

  async function loadJson(path) {
    const resp = await fetch(path, { cache: 'no-store' });
    if (!resp.ok) {
      throw new Error(`Failed to load ${path}: ${resp.status} ${resp.statusText}`);
    }
    return resp.json();
  }

  async function loadJsonOptional(path, fallback) {
    try {
      const resp = await fetch(path, { cache: 'no-store' });
      if (!resp.ok) return fallback;
      return resp.json();
    } catch {
      return fallback;
    }
  }

  function buildIndexes() {
    data.modelsById.clear();
    for (const m of data.models) {
      if (m && typeof m.id === 'string') data.modelsById.set(m.id, m);
    }

    // salons.json: each item contains ids[]; photos.results[].id points to one of those ids
    data.salonsByAnyId.clear();
    for (const s of data.salons) {
      const ids = Array.isArray(s?.ids) ? s.ids : [];
      for (const id of ids) {
        if (typeof id === 'string' && id.trim()) {
          data.salonsByAnyId.set(id, s);
        }
      }
    }

    data.seriesById.clear();
    for (const sr of data.series) {
      if (sr && typeof sr.id === 'string') data.seriesById.set(sr.id, sr);
    }
  }

  // --- Gate
  function setupGate() {
    const gateEnabled = !!config.gate?.enabled;

    // Configure gate visuals
    if (els.gateBg && config.gate?.backgroundImage) {
      els.gateBg.style.backgroundImage = `url('${cssUrl(config.gate.backgroundImage)}')`;
    }
    if (els.gateAcceptImg && config.gate?.acceptButtonImage) {
      els.gateAcceptImg.src = config.gate.acceptButtonImage;
      els.gateAcceptImg.alt = t('gateAcceptAlt');
    }
    if (els.gateDeclineImg && config.gate?.declineButtonImage) {
      els.gateDeclineImg.src = config.gate.declineButtonImage;
      els.gateDeclineImg.alt = t('gateDeclineAlt');
    }

    // Show/hide gate
    const acceptedBefore = gateEnabled && config.gate?.rememberChoice
      ? window.localStorage.getItem(config.storageKeys.gateAccepted) === 'true'
      : false;

    state.gateAccepted = acceptedBefore;
    state.adultAllowed = acceptedBefore;

    if (!gateEnabled || acceptedBefore) {
      openApp();
      els.gate.classList.add('hidden');
      return;
    }

    // Show gate overlay
    els.gate.classList.remove('hidden');

    // Texts
    if (els.gateTitle) els.gateTitle.textContent = t('gateTitle');
    if (els.gateText) els.gateText.textContent = t('gateText');

    els.gateAccept.addEventListener('click', () => {
      state.gateAccepted = true;
      state.adultAllowed = true;
      if (config.gate?.rememberChoice) {
        window.localStorage.setItem(config.storageKeys.gateAccepted, 'true');
      }
      els.gate.classList.add('hidden');
      openApp();
      render();
    });

    els.gateDecline.addEventListener('click', () => {
      const url = config.gate?.declineUrl;
      if (typeof url === 'string' && url.trim()) {
        window.location.href = url;
      }
    });
  }

  function openApp() {
    els.app.hidden = false;
  }

  // --- Responsive / mobile
  function setupResponsive() {
    const update = () => {
      const isMobile = window.innerWidth < (config.mobileBreakpoint || 900);
      document.body.classList.toggle('mobile', isMobile);
      if (!isMobile) closeMobileSidebar();
    };

    update();
    window.addEventListener('resize', update);
  }

  function openMobileSidebar() {
    if (!document.body.classList.contains('mobile')) return;
    els.sidebar.classList.add('open');

    let overlay = document.getElementById('mobileOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mobileOverlay';
      overlay.addEventListener('click', closeMobileSidebar);
      document.body.appendChild(overlay);
    }
  }

  function closeMobileSidebar() {
    els.sidebar.classList.remove('open');
    const overlay = document.getElementById('mobileOverlay');
    if (overlay) overlay.remove();
  }

  // --- Global events
  function setupGlobalEvents() {
    // Language switch
    document.querySelectorAll('.lang__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang === 'hu' || lang === 'en') {
          state.lang = lang;
          window.localStorage.setItem(config.storageKeys.lang, lang);
          applyLangUi();
          renderSidebar();
          render();
        }
      });
    });

    // Search
    els.search.addEventListener('input', () => {
      state.searchQuery = String(els.search.value || '');
      state.page = 1;
      render();
    });

    // Hamburger
    els.hamburger.addEventListener('click', () => {
      if (els.sidebar.classList.contains('open')) closeMobileSidebar();
      else openMobileSidebar();
    });

    // Lightbox controls
    els.lbClose.addEventListener('click', closeLightbox);
    els.lbPrev.addEventListener('click', () => stepLightbox(-1));
    els.lbNext.addEventListener('click', () => stepLightbox(1));

    // Click outside image closes
    els.lightbox.addEventListener('click', (ev) => {
      if (ev.target === els.lightbox) closeLightbox();
    });

    // Keyboard
    window.addEventListener('keydown', (ev) => {
      if (!state.lightboxOpen) return;
      if (ev.key === 'Escape') closeLightbox();
      if (ev.key === 'ArrowLeft') stepLightbox(-1);
      if (ev.key === 'ArrowRight') stepLightbox(1);
    });

    // Basic prevention of context menu on images (does not provide true protection)
    document.addEventListener('contextmenu', (ev) => {
      const target = /** @type {HTMLElement|null} */ (ev.target instanceof HTMLElement ? ev.target : null);
      if (!target) return;
      if (target.closest('.card__thumb') || target.closest('.lightbox')) {
        ev.preventDefault();
      }
    });

    // Prevent dragging images
    document.addEventListener('dragstart', (ev) => {
      const target = /** @type {HTMLElement|null} */ (ev.target instanceof HTMLElement ? ev.target : null);
      if (!target) return;
      if (target.tagName === 'IMG' && (target.closest('.card__thumb') || target.closest('.lightbox'))) {
        ev.preventDefault();
      }
    });

    // Touch swipe in lightbox
    let touchStartX = null;
    els.lightbox.addEventListener('pointerdown', (ev) => {
      if (!state.lightboxOpen) return;
      touchStartX = ev.clientX;
    });
    els.lightbox.addEventListener('pointerup', (ev) => {
      if (!state.lightboxOpen || touchStartX === null) return;
      const dx = ev.clientX - touchStartX;
      touchStartX = null;
      const threshold = 60;
      if (dx > threshold) stepLightbox(-1);
      else if (dx < -threshold) stepLightbox(1);
    });
  }

  // --- Rendering
  function renderStaticBits() {
    // Set placeholder from i18n
    els.search.placeholder = t('searchPlaceholder');
    applyLangUi();

    renderSidebar();
  }

  function applyLangUi() {
    document.documentElement.lang = state.lang;

    // Active lang buttons
    document.querySelectorAll('.lang__btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === state.lang);
    });

    // Sidebar headings
    document.querySelectorAll('[data-i18n="albums"]').forEach((n) => (n.textContent = t('albums')));
    document.querySelectorAll('[data-i18n="series"]').forEach((n) => (n.textContent = t('series')));

    // Search placeholder
    els.search.placeholder = t('searchPlaceholder');

    // Gate texts (if gate is visible)
    if (els.gateTitle) els.gateTitle.textContent = t('gateTitle');
    if (els.gateText) els.gateText.textContent = t('gateText');
    if (els.gateAcceptImg) els.gateAcceptImg.alt = t('gateAcceptAlt');
    if (els.gateDeclineImg) els.gateDeclineImg.alt = t('gateDeclineAlt');
  }

  function renderSidebar() {
    // Albums
    els.albumList.innerHTML = '';
    for (const album of config.albums || []) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebtn';
      btn.textContent = textOf(album?.name);
      btn.dataset.albumId = String(album.id);
      btn.addEventListener('click', () => {
        state.view = 'photos';
        state.selectedSeriesId = null;
        state.selectedAlbumId = String(album.id);
        state.page = 1;
        closeMobileSidebar();
        render();
      });
      els.albumList.appendChild(btn);
    }

    // Series section
    els.seriesSidebarList.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'sidebtn small';
    allBtn.textContent = t('allSeries');
    allBtn.dataset.seriesId = '__all__';
    allBtn.addEventListener('click', () => {
      state.view = 'seriesMeta';
      state.selectedSeriesId = null;
      state.page = 1;
      closeMobileSidebar();
      render();
    });
    els.seriesSidebarList.appendChild(allBtn);

    const visibleSeries = getVisibleSeries();
    for (const sr of visibleSeries) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebtn small';
      btn.textContent = textOf(sr.title);
      btn.dataset.seriesId = sr.id;
      btn.addEventListener('click', () => {
        state.view = 'seriesGallery';
        state.selectedSeriesId = sr.id;
        state.page = 1;
        closeMobileSidebar();
        render();
      });
      els.seriesSidebarList.appendChild(btn);
    }
  }

  

  function renderSubheader() {
    if (!els.subheader) return;
    els.subheader.innerHTML = '';

    if (state.view === 'seriesGallery') {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'subheader__btn';
      backBtn.textContent = t('backToSeries');
      backBtn.addEventListener('click', () => {
        state.view = 'seriesMeta';
        state.selectedSeriesId = null;
        state.page = 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      const title = document.createElement('span');
      title.className = 'subheader__title';

      const sr = state.selectedSeriesId ? data.seriesById.get(state.selectedSeriesId) : null;
      title.textContent = sr ? textOf(sr.title) : '';

      els.subheader.appendChild(backBtn);
      if (title.textContent) els.subheader.appendChild(title);
    }
  }
function render() {
    // Update active buttons (albums + series)
    // Simpler: just iterate inside album list
    els.albumList.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', state.view === 'photos' && btn.dataset.albumId === state.selectedAlbumId);
    });
    els.seriesSidebarList.querySelectorAll('button').forEach((btn) => {
      const sid = btn.dataset.seriesId;
      const isActive =
        (state.view === 'seriesMeta' && sid === '__all__') ||
        (state.view === 'seriesGallery' && sid === state.selectedSeriesId);
      btn.classList.toggle('active', isActive);
    });

    els.search.placeholder = t('searchPlaceholder');

    renderSubheader();

    // Render view
    if (state.view === 'seriesMeta') {
      renderSeriesMeta();
      return;
    }

    // Photos view (main or series gallery)
    renderPhotoGallery();
  }

  function renderPhotoGallery() {
    const allVisiblePhotos = getVisiblePhotos();
    const filtered = filterPhotosForCurrentView(allVisiblePhotos);

    // Lightbox navigation uses the full filtered list (not only the current page)
    const pages = Math.max(1, Math.ceil(filtered.length / (config.pageSize || 12)));
    state.page = clamp(state.page, 1, pages);

    const start = (state.page - 1) * (config.pageSize || 12);
    const pageItems = filtered.slice(start, start + (config.pageSize || 12));

    els.grid.innerHTML = '';

    if (pageItems.length === 0) {
      els.grid.innerHTML = `<div class="loading">${escapeHtml(t('noResults'))}</div>`;
      els.pagination.innerHTML = '';
      return;
    }

    for (const photo of pageItems) {
      els.grid.appendChild(renderPhotoCard(photo, filtered));
    }

    renderPagination(pages);
  }

  function renderPagination(pages) {
    els.pagination.innerHTML = '';
    if (pages <= 1) return;

    for (let p = 1; p <= pages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pagebtn';
      btn.textContent = String(p);
      btn.classList.toggle('active', p === state.page);
      btn.addEventListener('click', () => {
        state.page = p;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      els.pagination.appendChild(btn);
    }
  }

  function renderPhotoCard(photo, lightboxList) {
    const card = document.createElement('article');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'card__thumb';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = textOf(photo.title);
    img.draggable = false;

    const thumbPath = typeof photo.thumb === 'string' && photo.thumb.trim()
      ? photo.thumb
      : photo.filename;

    img.src = safeJoin(config.imagesBase, thumbPath);

    const overlay = document.createElement('div');
    overlay.className = 'card__thumbOverlay';
    overlay.title = textOf(photo.title);
    overlay.addEventListener('click', () => {
      openLightbox(lightboxList, photo);
    });

    thumb.appendChild(img);
    thumb.appendChild(overlay);

    const body = document.createElement('div');
    body.className = 'card__body';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = textOf(photo.title);

    const meta = document.createElement('p');
    meta.className = 'card__meta';
    meta.appendChild(document.createTextNode(`${t('modelsLabel')} `));

    const modelLinks = renderModelList(photo.models || []);
    if (modelLinks.childNodes.length === 0) {
      meta.appendChild(document.createTextNode('—'));
    } else {
      meta.appendChild(modelLinks);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card__btn';
    btn.innerHTML = `<span aria-hidden="true">📄</span><span>${escapeHtml(
      state.openResults.has(photo.filename) ? t('resultsButtonHide') : t('resultsButtonShow')
    )}</span>`;

    const results = document.createElement('div');
    results.className = 'card__results';
    if (!state.openResults.has(photo.filename)) {
      results.classList.add('hidden');
    }

    results.appendChild(renderResultsList(photo));

    btn.addEventListener('click', () => {
      if (state.openResults.has(photo.filename)) state.openResults.delete(photo.filename);
      else state.openResults.add(photo.filename);
      render();
    });

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(btn);
    body.appendChild(results);

    card.appendChild(thumb);
    card.appendChild(body);

    return card;
  }

  function renderResultsList(photo) {
    const wrap = document.createElement('div');

    const results = Array.isArray(photo.results) ? photo.results : [];
    if (results.length === 0) {
      wrap.innerHTML = `<span class="muted">—</span>`;
      return wrap;
    }

    const ul = document.createElement('ul');
    for (const r of results) {
      const li = document.createElement('li');

      const line = document.createElement('div');
      line.className = 'result__line';

      // Name
      const salon = data.salonsByAnyId.get(r.id);
      const salonText = salon
        ? `${salon.name} (${salon.country}, ${salon.year})`
        : String(r.id || '');

      const nameSpan = document.createElement('span');
      nameSpan.textContent = salonText;

      line.appendChild(nameSpan);

      // Accepted badge
      if (r.accepted === true) {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = '✓';
        b.title = 'Accepted';
        line.appendChild(b);
      }

      // Awarded badge
      if (r.awarded === true) {
        const b = document.createElement('span');
        b.className = 'badge award';
        b.textContent = '🏅';
        b.title = 'Awarded';
        line.appendChild(b);
      }

      li.appendChild(line);

      // Award name + certificate link
      if (r.awarded === true && typeof r.awardName === 'string' && r.awardName.trim()) {
        const awardLine = document.createElement('div');
        awardLine.className = 'result__line';

        const certPath = typeof r.certificateImage === 'string' && r.certificateImage.trim()
          ? safeJoin(config.certificateBase, r.certificateImage)
          : null;

        if (certPath) {
          const a = document.createElement('a');
          a.href = certPath;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = r.awardName;
          awardLine.appendChild(a);
        } else {
          const span = document.createElement('span');
          span.textContent = r.awardName;
          awardLine.appendChild(span);
        }

        li.appendChild(awardLine);
      }

      ul.appendChild(li);
    }

    wrap.appendChild(ul);
    return wrap;
  }

  function renderModelList(modelIds) {
    const span = document.createElement('span');

    const ids = Array.isArray(modelIds) ? modelIds : [];
    const visibleModels = [];

    for (const id of ids) {
      const m = data.modelsById.get(id);
      if (m) visibleModels.push(m);
    }

    visibleModels.forEach((m, idx) => {
      if (idx > 0) span.appendChild(document.createTextNode(', '));

      const links = Array.isArray(m.links) ? m.links.filter((x) => typeof x === 'string' && x.trim()) : [];
      if (links.length > 0) {
        const a = document.createElement('a');
        a.href = links[0];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = m.name;
        span.appendChild(a);
      } else {
        span.appendChild(document.createTextNode(m.name));
      }
    });

    return span;
  }

  function renderSeriesMeta() {
    const series = getVisibleSeries();
    const filtered = filterSeriesBySearch(series);

    const pages = Math.max(1, Math.ceil(filtered.length / (config.pageSize || 12)));
    state.page = clamp(state.page, 1, pages);

    const start = (state.page - 1) * (config.pageSize || 12);
    const pageItems = filtered.slice(start, start + (config.pageSize || 12));

    els.grid.innerHTML = '';

    if (pageItems.length === 0) {
      els.grid.innerHTML = `<div class="loading">${escapeHtml(t('noResults'))}</div>`;
      els.pagination.innerHTML = '';
      return;
    }

    for (const sr of pageItems) {
      els.grid.appendChild(renderSeriesCard(sr));
    }

    renderPagination(pages);
  }

  function renderSeriesCard(sr) {
    const card = document.createElement('article');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'card__thumb';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = textOf(sr.title);
    img.draggable = false;

    img.src = safeJoin(config.imagesBase, sr.cover || '');

    const overlay = document.createElement('div');
    overlay.className = 'card__thumbOverlay';
    overlay.title = textOf(sr.title);
    overlay.addEventListener('click', () => {
      state.view = 'seriesGallery';
      state.selectedSeriesId = sr.id;
      state.page = 1;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    thumb.appendChild(img);
    thumb.appendChild(overlay);

    const body = document.createElement('div');
    body.className = 'card__body';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = textOf(sr.title);

    const meta = document.createElement('p');
    meta.className = 'card__meta';

    const models = Array.isArray(sr.models) ? sr.models : [];
    meta.appendChild(document.createTextNode(`${t('modelsLabel')} `));
    meta.appendChild(renderModelList(models));

    body.appendChild(title);
    body.appendChild(meta);

    const note = textOf(sr.note);
    if (note) {
      const p = document.createElement('p');
      p.className = 'card__meta muted';
      p.textContent = note;
      body.appendChild(p);
    }

    card.appendChild(thumb);
    card.appendChild(body);
    return card;
  }

  // --- Filtering
  function getVisiblePhotos() {
    const out = [];

    for (const p of data.photos) {
      if (!p || typeof p.filename !== 'string') continue;

      // Photo hidden flag (optional extension)
      if (p.visible === false) continue;

      // Model visibility
      const modelIds = Array.isArray(p.models) ? p.models : [];
      let ok = true;
      for (const mid of modelIds) {
        const m = data.modelsById.get(mid);
        if (!m) continue;
        if (m.visible === false) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      // Adult gating
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const isAdult = tags.includes('adult');
      if (isAdult && !state.adultAllowed) continue;

      // Model-level adultVisible: if any model does not allow adult visibility, hide adult photos
      if (isAdult) {
        for (const mid of modelIds) {
          const m = data.modelsById.get(mid);
          if (m && m.adultVisible === false) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }

      out.push(p);
    }

    return out;
  }

  function filterPhotosForCurrentView(visiblePhotos) {
    let base = visiblePhotos;

    if (state.view === 'seriesGallery' && state.selectedSeriesId) {
      base = filterPhotosBySeries(base, state.selectedSeriesId);
    }

    base = filterPhotosByAlbum(base);
    base = filterPhotosBySearch(base);

    return base;
  }

  function filterPhotosBySeries(photos, seriesId) {
    const sr = data.seriesById.get(seriesId);
    if (!sr) return [];

    // Supported series membership modes:
    // 1) sr.photos: explicit list of filenames
    // 2) sr.tag: a tag that must be present in photo.tags
    const explicit = Array.isArray(sr.photos) ? sr.photos.filter((x) => typeof x === 'string' && x.trim()) : [];
    const tag = typeof sr.tag === 'string' && sr.tag.trim() ? sr.tag.trim() : null;

    if (explicit.length > 0) {
      const set = new Set(explicit);
      return photos.filter((p) => set.has(p.filename));
    }

    if (tag) {
      return photos.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
    }

    return [];
  }

  function filterPhotosByAlbum(photos) {
    if (state.view !== 'photos' && state.view !== 'seriesGallery') return photos;

    const album = (config.albums || []).find((a) => String(a.id) === String(state.selectedAlbumId));
    if (!album) return photos;

    if (album.type === 'all') return photos;

    if (album.type === 'awarded') {
      return photos.filter(isAwardedPhoto);
    }

    if (typeof album.tag === 'string' && album.tag.trim()) {
      const tag = album.tag.trim();
      return photos.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
    }

    return photos;
  }

  function filterPhotosBySearch(photos) {
    const tokens = tokenize(state.searchQuery);
    if (tokens.length === 0) return photos;

    return photos.filter((p) => photoMatchesTokens(p, tokens));
  }

  function photoMatchesTokens(photo, tokens) {
    const haystackParts = [];

    // Photo title (supports string OR {hu,en})
    haystackParts.push(textOf(photo.title, 'hu'));
    haystackParts.push(textOf(photo.title, 'en'));

    // Models
    const modelIds = Array.isArray(photo.models) ? photo.models : [];
    for (const id of modelIds) {
      const m = data.modelsById.get(id);
      if (m?.name) haystackParts.push(m.name);
    }

    // Salon names for results
    const results = Array.isArray(photo.results) ? photo.results : [];
    for (const r of results) {
      if (typeof r?.id === 'string') {
        const s = data.salonsByAnyId.get(r.id);
        if (s?.name) haystackParts.push(s.name);
        if (s?.country) haystackParts.push(s.country);
        if (s?.year) haystackParts.push(String(s.year));
        haystackParts.push(r.id);
      }
      if (typeof r?.awardName === 'string') haystackParts.push(r.awardName);
    }

    const haystack = normalize(haystackParts.join(' | '));
    return tokens.every((tkn) => haystack.includes(tkn));
  }

  function isAwardedPhoto(photo) {
    const tags = Array.isArray(photo.tags) ? photo.tags : [];
    if (tags.includes('awarded')) return true;

    const results = Array.isArray(photo.results) ? photo.results : [];
    return results.some((r) => r && r.awarded === true);
  }

  function getVisibleSeries() {
    const series = Array.isArray(data.series) ? data.series : [];

    // filter visible
    const visible = series.filter((s) => s && s.visible !== false);

    // sort by order, then title
    visible.sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : 999999;
      const bo = typeof b.order === 'number' ? b.order : 999999;
      if (ao !== bo) return ao - bo;

      const at = normalize(textOf(a.title) || '');
      const bt = normalize(textOf(b.title) || '');
      return at.localeCompare(bt);
    });

    return visible;
  }

  function filterSeriesBySearch(series) {
    const tokens = tokenize(state.searchQuery);
    if (tokens.length === 0) return series;

    return series.filter((sr) => {
      const haystackParts = [];
      haystackParts.push(textOf(sr.title, 'hu'));
      haystackParts.push(textOf(sr.title, 'en'));
      haystackParts.push(textOf(sr.note, 'hu'));
      haystackParts.push(textOf(sr.note, 'en'));

      const modelIds = Array.isArray(sr.models) ? sr.models : [];
      for (const id of modelIds) {
        const m = data.modelsById.get(id);
        if (m?.name) haystackParts.push(m.name);
      }

      const haystack = normalize(haystackParts.join(' | '));
      return tokens.every((tkn) => haystack.includes(tkn));
    });
  }

  // --- Lightbox
  function openLightbox(list, photo) {
    if (!Array.isArray(list) || list.length === 0) return;

    const idx = list.findIndex((p) => p?.filename === photo?.filename);
    if (idx < 0) return;

    state.lightboxList = list;
    state.lightboxIndex = idx;
    state.lightboxOpen = true;

    updateLightbox();

    els.lightbox.classList.remove('hidden');
    els.lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    state.lightboxOpen = false;
    els.lightbox.classList.add('hidden');
    els.lightbox.setAttribute('aria-hidden', 'true');
  }

  function stepLightbox(delta) {
    if (!state.lightboxOpen) return;
    const n = state.lightboxList.length;
    if (n === 0) return;
    state.lightboxIndex = (state.lightboxIndex + delta + n) % n;
    updateLightbox();
  }

  function updateLightbox() {
    const photo = state.lightboxList[state.lightboxIndex];
    if (!photo) return;

    els.lbImage.src = safeJoin(config.imagesBase, photo.filename);
    els.lbImage.alt = textOf(photo.title);

    const modelNames = (Array.isArray(photo.models) ? photo.models : [])
      .map((id) => data.modelsById.get(id))
      .filter(Boolean)
      .map((m) => m.name);

    const caption = modelNames.length > 0
      ? `${textOf(photo.title)} — ${modelNames.join(', ')}`
      : `${textOf(photo.title)}`;

    els.lbCaption.textContent = caption;
  }

  // --- Helpers
  function t(key) {
    const dict = config.i18n?.[state.lang] || config.i18n?.hu || {};
    return String(dict[key] ?? key);
  }

  /**
   * Returns text from a value that can be:
   * - string
   * - {hu: string, en: string}
   */
  function textOf(value, forceLang) {
    const lang = forceLang || state.lang;

    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';

    const v = value[lang] ?? value.hu ?? value.en;
    return typeof v === 'string' ? v : '';
  }

  function tokenize(query) {
    return normalize(String(query || ''))
      .split(/\s+/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeJoin(base, path) {
    const b = String(base || '');
    const p = String(path || '');
    if (!b) return p;
    if (!p) return b;

    const bHas = b.endsWith('/');
    const pHas = p.startsWith('/');

    if (bHas && pHas) return b + p.slice(1);
    if (!bHas && !pHas) return b + '/' + p;
    return b + p;
  }

  function cssUrl(url) {
    // Basic escaping for CSS url('...')
    return String(url || '').replace(/'/g, "%27");
  }

  function loadLang() {
    const stored = window.localStorage.getItem(config.storageKeys.lang);
    if (stored === 'hu' || stored === 'en') return stored;
    return 'hu';
  }
})();
