/*
  Gallery configuration (no external dependencies).

  You can freely edit this file.

  Notes:
  - If you open index.html via file://, browsers block fetch(). Use a local web server.
    Example:  python -m http.server 8000
*/

window.appConfig = {
  // Data file locations
  data: {
    models: 'data/models.json',
    salons: 'data/salons.json',
    photos: 'data/photos.json',
    // New: photo series (optional). If the file is missing, the app still works.
    series: 'data/series.json',
  },

  // Image base folders (relative to index.html)
  imagesBase: 'images/',
  certificateBase: 'images/cert/',

  // UI behaviour
  pageSize: 12,
  mobileBreakpoint: 900, // px

  storageKeys: {
    lang: 'gallery_lang',
    gateAccepted: 'gallery_gate_accepted',
  },

  // Content warning / landing gate
  gate: {
    enabled: true,

    // Background image for the warning screen
    backgroundImage: 'images/gate/background.jpg',

    // Two image buttons
    acceptButtonImage: 'images/gate/enter.png',
    declineButtonImage: 'images/gate/leave.png',

    // Clicking decline redirects here
    declineUrl: 'https://en.wikipedia.org/wiki/Prude',

    // Always show the landing screen on every reload
    rememberChoice: false,
  },

  // Albums shown in the left sidebar.
  // Built-ins:
  // - type: 'all' => show everything
  // - type: 'awarded' => show awarded photos (tag 'awarded' OR any result.awarded)
  // - tag: '<tag>' => photo.tags contains the tag
  albums: [
    { id: 'all', type: 'all', name: { hu: 'Összes', en: 'All' } },
    { id: 'awarded', type: 'awarded', name: { hu: 'Díjazottak', en: 'Awarded' } },
    { id: 'bw', tag: 'bw', name: { hu: 'Monokróm', en: 'Monochrome' } },
    { id: 'color', tag: 'color', name: { hu: 'Színes', en: 'Color' } },

    // Custom albums (tag-based)
    { id: 'marilyn', tag: 'marilyn', name: { hu: 'Marilyn', en: 'Marilyn' } },
    { id: 'balett', tag: 'balett', name: { hu: 'Balett', en: 'Ballet' } },
    { id: 'aegis', tag: 'aegis', name: { hu: 'Áegis', en: 'Aegis' } },
    { id: 'dark', tag: 'dark', name: { hu: 'Dark', en: 'Dark' } },
    { id: 'nature', tag: 'nature', name: { hu: 'Természet', en: 'Nature' } },
  ],

  // UI texts
  i18n: {
    hu: {
      albums: 'Albumok',
      series: 'Sorozatok',
      allSeries: 'Összes sorozat',
      searchPlaceholder: 'Keresés cím, modell vagy pályázat szerint…',
      modelsLabel: 'Modellek:',
      resultsButtonShow: 'Eredmények megtekintése',
      resultsButtonHide: 'Eredmények elrejtése',
      noResults: 'Nincs találat.',
      page: 'Oldal',
      backToSeries: 'Vissza a sorozatokhoz',
      gateTitle: 'Figyelmeztetés',
      gateText:
        'A weboldal felnőtteknek (18+) szóló, művészi akt jellegű tartalmat is tartalmazhat.\n\n' +
        'Ha elmúltál 18 éves és elfogadod a feltételeket, folytathatod. Ellenkező esetben kérlek hagyd el az oldalt.',
      gateAcceptAlt: 'Belépés',
      gateDeclineAlt: 'Kilépés',
      loading: 'Betöltés…',
    },
    en: {
      albums: 'Albums',
      series: 'Series',
      allSeries: 'All series',
      searchPlaceholder: 'Search by title, model or salon…',
      modelsLabel: 'Models:',
      resultsButtonShow: 'View results',
      resultsButtonHide: 'Hide results',
      noResults: 'No results.',
      page: 'Page',
      backToSeries: 'Back to series',
      gateTitle: 'Content warning',
      gateText:
        'This website may contain 18+ artistic nude content.\n\n' +
        'If you are at least 18 and accept, you may enter. Otherwise please leave the site.',
      gateAcceptAlt: 'Enter',
      gateDeclineAlt: 'Leave',
      loading: 'Loading…',
    },
  },
};
