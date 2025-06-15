// i18n.js

const I18n = (function () {
  let translations = {};

  async function load(lang, path = "locales/") {
    const res = await fetch(`${path}${lang}.json`);
    if (!res.ok) throw new Error(`Could not load language: ${lang}`);
    translations = await res.json();
  }

  function t(key, ...args) {
    let str = translations[key] || key;
    args.forEach((val, i) => {
      str = str.replaceAll(`$${i + 1}`, val);
    });
    return str;
  }

  function translateDOM() {
    document.querySelectorAll("[data-i18n]").forEach(elem => {
      const key = elem.getAttribute("data-i18n");
      const argsAttr = elem.getAttribute("data-args");
      const args = argsAttr ? JSON.parse(argsAttr) : [];
      elem.innerText = t(key, ...args);
    });
  }

  return {
    load,
    t,
    translateDOM
  };
})();
