# Vanilla JS Photo Gallery (rewrite)

## Futtatás

Mivel a böngészők a `file://` alól nem engedik a `fetch()`-et JSON fájlokra, a projektet **HTTP szerverrel** érdemes futtatni.

Példa (Python):

```bash
cd gallery_rewrite
python -m http.server 8000
```

Ezután: `http://localhost:8000`

## Mappastruktúra

- `index.html` – egyoldalas alkalmazás
- `css/styles.css` – stílusok + mobilnézet
- `js/config.js` – beállítások (albumok, gate képek, URL, adatfájl utak, i18n)
- `js/app.js` – logika (szűrés, lapozás, lightbox, sorozatok)
- `data/models.json` – modellek
- `data/salons.json` – szalonok
- `data/photos.json` – fotók
- `data/series.json` – **ÚJ** sorozatok (opcionális)

## Képek

- Fotók: `images/<photo.filename>`
- Certificate-ek: `images/cert/<result.certificateImage>`
- Gate (figyelmeztető oldal) képei: a `js/config.js`-ben állítható

## Sorozatok (series)

A `data/series.json` sorozat tag-alapú vagy explicit listás is lehet:

- `tag`: ha megadod, akkor a sorozat fotói azok, amelyeknek `photo.tags` tartalmazza ezt a taget.
- `photos`: ha megadod, akkor a sorozat fotói a felsorolt `filename`-ek.

Példa:

```json
{
  "id": "my_series",
  "title": {"hu": "Sorozat címe", "en": "Series title"},
  "note": {"hu": "Leírás", "en": "Description"},
  "models": ["lucfenyo"],
  "cover": "series/my_series/cover.jpg",
  "tag": "series_my_series",
  "visible": true,
  "order": 1
}
```

## Megjegyzés a képmentés tiltásáról

A jobb-klikk/drag tiltás csak **alap védelmet** ad (context menu + dragstart blokkolás). Teljes, 100%-os védelem kliensoldalon nem lehetséges.
