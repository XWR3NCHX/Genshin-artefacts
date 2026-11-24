const API_BASE = "https://genshin-impact.up.railway.app";
const STORAGE_KEY = "genshin-artefacts-wishlist-v1";
const PLAN_STORAGE_KEY = "genshin-artefacts-days-v1";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const EN_DAYS = {
  Monday: "Lundi", Tuesday: "Mardi", Wednesday: "Mercredi",
  Thursday: "Jeudi", Friday: "Vendredi", Saturday: "Samedi",
  Sunday: "Dimanche",
  monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi",
  thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi",
  sunday: "Dimanche"
};

const state = {
  artifacts: [],
  materials: [],
  bosses: [],
  bossDrops: [],
  wishlist: new Set(),
  farmDays: {},
  view: "catalogue",
  category: "artifacts",
  selected: null
};

const el = id => document.getElementById(id);

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

const normalize = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


/* =========================
   SAUVEGARDE
========================= */

function loadWishlist() {
  try {
    state.wishlist = new Set(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(String)
    );
  } catch {
    state.wishlist = new Set();
  }

  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "{}");

    state.farmDays =
      saved && typeof saved === "object" && !Array.isArray(saved)
        ? saved
        : {};

    Object.keys(state.farmDays).forEach(key => {
      state.farmDays[key] = Array.isArray(state.farmDays[key])
        ? [...new Set(state.farmDays[key].filter(day => DAYS.includes(day)))]
        : [];
    });
  } catch {
    state.farmDays = {};
  }
}

function saveWishlist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.wishlist]));
  updateCounts();
}

function saveFarmDays() {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(state.farmDays));
}

function updateCounts() {
  const count = state.wishlist.size;

  if (el("wishlistCount")) el("wishlistCount").textContent = count;
  if (el("wishlistCount2")) el("wishlistCount2").textContent = count;

  if (el("plannerSummary")) {
    el("plannerSummary").textContent = count
      ? `${count} élément${count > 1 ? "s" : ""} dans ta liste.`
      : "Aucun élément dans ta liste.";
  }
}


/* =========================
   INFORMATIONS GÉNÉRALES
========================= */

function getName(x) {
  return x.name || x.Name || x.title || x.key || "Élément";
}

function getKey(x) {
  if (x.kind === "material") {
    return `material:${String(x.key || x.id || getName(x))}`;
  }

  if (x.kind === "bossdrop") {
    return `bossdrop:${x.bossId}:${x.id}`;
  }

  return String(x.key || x.slug || x.id || getName(x));
}

function getRarity(x) {
  const value = x.rarity ?? x.Rarity ?? x.maxRarity ?? 5;

  if (Array.isArray(value)) {
    return Math.max(...value.map(Number).filter(Number.isFinite), 1);
  }

  if (typeof value === "string" && value.includes(",")) {
    return Math.max(...value.split(",").map(Number).filter(Number.isFinite), 1);
  }

  return Number(value) || 1;
}

function getImage(x) {
  return x.img ||
    x.image ||
    x.icon ||
    x.Icon ||
    x.iconUrl ||
    x.images?.flower ||
    x.pieces?.flower?.img ||
    "";
}

function getDomain(x) {
  return x.domain ||
    x.Domain ||
    x.source ||
    x.obtain ||
    x.obtainable ||
    "Domaine d’artéfacts";
}

function normalizeDays(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .map(value => EN_DAYS[value] || EN_DAYS[String(value).toLowerCase()] || value)
      .filter(value => DAYS.includes(value))
  )];
}

function getAvailability(x) {
  if (x.kind === "material") return x.farmingDays || [];
  return normalizeDays(x.farmingDays || x.farming_days || x.days || x.availability || []);
}

function getPieces(item) {
  const pieces = item.pieces || item.Pieces || {};

  return [
    ["flower", "Fleur"],
    ["plume", "Plume"],
    ["sands", "Sablier"],
    ["goblet", "Coupe"],
    ["circlet", "Couronne"]
  ].map(([key, label]) => {
    const piece = pieces[key] || pieces[label.toLowerCase()] || {};

    return {
      label,
      name: piece.name || piece.Name || "",
      img: piece.img || piece.image || "",
      description: piece.description || piece.Description || ""
    };
  }).filter(piece => piece.name || piece.img || piece.description);
}


/* =========================
   DOMAINES D'ARTÉFACTS
========================= */

const DOMAIN_INFO = [
  { names: ["Midsummer Courtyard"], region: "Mondstadt", area: "Falaises Starsnatch", image: "", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Peak of Vindagnyr"], region: "Mondstadt", area: "Dosdragon", image: "", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Ridge Watch"], region: "Liyue", area: "Porte de Pierre", image: "https://img.gamewith.net/img/b3698d197329c2e55c1aa535b0c4beae.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Valley of Remembrance"], region: "Mondstadt", area: "Vignoble de l'Aube", image: "https://img.gamewith.net/img/5a64fca546783317536a96e0b73592b4.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Clear Pool and Mountain Cavern"], region: "Liyue", area: "Mont Aocang", image: "https://img.gamewith.net/img/b29ea616d9f890c1f028f08f74e4cd23.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Domain of Guyun"], region: "Liyue", area: "Forêt de pierres de Guyun", image: "https://img.gamewith.net/img/3666c676326833c032671321faf8a752.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Hidden Palace of Zhou Formula"], region: "Liyue", area: "Colline Wuwang", image: "https://img.gamewith.net/img/59bf860f7b9a4c5dfa6d819a4ba129be.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["The Lost Valley"], region: "Liyue", area: "Gouffre", image: "https://img.gamewith.net/img/7540f04434c4450b68356f25fc608648.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Momiji-Dyed Court"], region: "Inazuma", area: "Île Yashiori", image: "https://img.gamewith.net/img/27e857661fe27f7bbdf1f88bea05d6b4.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Slumbering Court"], region: "Inazuma", area: "Île Seirai", image: "https://img.gamewith.net/img/d2748b8bce3ac6da0fddf96d04cd4e47.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["City of Gold"], region: "Sumeru", area: "Désert de Sumeru", image: "https://img.gamewith.net/img/c5f8e060022fdc30050ec109b9c2acfd.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Molten Iron Fortress"], region: "Sumeru", area: "Gavireh Lajavard", image: "https://img.gamewith.net/img/f8b13e7c4a871a2bbbb6ab70ce6bb24f.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Spire of Solitary Enlightenment"], region: "Sumeru", area: "Colline Gandha", image: "https://img.gamewith.net/img/2c79ddbb90b6a2ae9fc1d7628f8fde03.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Denouement of Sin"], region: "Fontaine", area: "Région de Beryl", image: "https://img.gamewith.net/img/e10fac31e2bae644fb6fbc6d3de3ed83.jpg", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Faded Theater"], region: "Fontaine", area: "Pétrichor", image: "https://img.gamewith.net/img/7b7d843308aca574e54baea8081be1c9.png", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Waterfall Wen"], region: "Fontaine", area: "Versant Est du Mont Automnéqui", image: "https://img.gamewith.net/img/316ba51c4733ec3cf757e46fac396896.png", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Sanctum of Rainbow Spirits"], region: "Natlan", area: "Eaux d'Ameyalco", image: "https://img.gamewith.net/img/962b95b50cd3ccf215240dd5201336da.png", map: "https://gamewith.net/genshin-impact/article/show/22392" },
  { names: ["Moonchild's Treasures"], region: "Nod-Krai", area: "Pic Ashveil", image: "", map: "https://gamewith.net/genshin-impact/article/show/22392" }
];

const SET_DOMAIN = {
  "thundering fury": "Midsummer Courtyard",
  "thundersoother": "Midsummer Courtyard",
  "blizzard strayer": "Peak of Vindagnyr",
  "heart of depth": "Peak of Vindagnyr",
  "tenacity of the millelith": "Ridge Watch",
  "pale flame": "Ridge Watch",
  "viridescent venerer": "Valley of Remembrance",
  "maiden beloved": "Valley of Remembrance",
  "bloodstained chivalry": "Clear Pool and Mountain Cavern",
  "noblesse oblige": "Clear Pool and Mountain Cavern",
  "archaic petra": "Domain of Guyun",
  "retracing bolide": "Domain of Guyun",
  "lavawalker": "Hidden Palace of Zhou Formula",
  "crimson witch of flames": "Hidden Palace of Zhou Formula",
  "vermillion hereafter": "The Lost Valley",
  "echoes of an offering": "The Lost Valley",
  "shimenawa's reminiscence": "Momiji-Dyed Court",
  "emblem of severed fate": "Momiji-Dyed Court",
  "ocean-hued clam": "Slumbering Court",
  "husk of opulent dreams": "Slumbering Court",
  "desert pavilion chronicle": "City of Gold",
  "flower of paradise lost": "City of Gold",
  "vourukasha's glow": "Molten Iron Fortress",
  "nymph's dream": "Molten Iron Fortress",
  "deepwood memories": "Spire of Solitary Enlightenment",
  "gilded dreams": "Spire of Solitary Enlightenment",
  "golden troupe": "Denouement of Sin",
  "marechaussee hunter": "Denouement of Sin",
  "fragment of harmonic whimsy": "Faded Theater",
  "unfinished reverie": "Faded Theater",
  "nighttime whispers in the echoing woods": "Waterfall Wen",
  "song of days past": "Waterfall Wen",
  "obsidian codex": "Sanctum of Rainbow Spirits",
  "scroll of the hero of cinder city": "Sanctum of Rainbow Spirits"
};

function getDomainInfo(item) {
  const raw = normalize(getDomain(item));

  let found = DOMAIN_INFO.find(domain =>
    domain.names.some(name => raw.includes(normalize(name)))
  );

  if (!found) {
    const name = normalize(getName(item));
    const domainName = Object.entries(SET_DOMAIN)
      .find(([set]) => name.includes(set))?.[1];

    found = DOMAIN_INFO.find(domain =>
      domainName && domain.names.includes(domainName)
    );
  }

  return found || null;
}

function renderDomainLocation(item) {
  const info = getDomainInfo(item);

  if (!info) {
    return `
      <section class="domain-location">
        <h3>Où farmer ce set ?</h3>
        <p>Le domaine et sa région ne sont pas encore renseignés pour cet artéfact.</p>
        <p class="domain-source">Source : ${escapeHtml(getDomain(item))}</p>
      </section>
    `;
  }

  const image = info.image
    ? `<img class="domain-map-image" src="${escapeHtml(info.image)}" alt="Carte de localisation du domaine ${escapeHtml(info.names[0])}" loading="lazy" onerror="this.remove()">`
    : `<div class="domain-map-placeholder">Image de carte à compléter</div>`;

  return `
    <section class="domain-location">
      <h3>Où farmer ce set ?</h3>
      <div class="domain-location-meta">
        <span><small>DOMAINE</small><strong>${escapeHtml(info.names[0])}</strong></span>
        <span><small>RÉGION</small><strong>${escapeHtml(info.region)}</strong></span>
        <span><small>SECTEUR</small><strong>${escapeHtml(info.area)}</strong></span>
      </div>
      <div class="domain-map-frame">${image}</div>
      <a class="domain-map-link" href="${escapeHtml(info.map)}" target="_blank" rel="noopener noreferrer">
        Ouvrir la carte de localisation
      </a>
    </section>
  `;
}


/* =========================
   CHARGEMENT DES DONNÉES
========================= */

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return response.json();
}

function unwrapList(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}


/* ARTÉFACTS : ON CONSERVE TON API D'ORIGINE */

async function loadArtifacts() {
  try {
    const payload = await fetchJson(
      `${API_BASE}/artifacts?details=true&sort=name`
    );

    const list = unwrapList(payload, ["artifacts", "data", "results"]);

    if (!list.length) throw new Error("Catalogue vide");

    state.artifacts = list.map((item, index) => ({
      ...item,
      kind: "artifact",
      key: String(item.key || item.slug || item.id || item.name || `artifact-${index}`),
      name: getName(item)
    }));

    if (el("artifactStatus")) {
      el("artifactStatus").textContent =
        `${state.artifacts.length} artéfacts chargés.`;
    }
  } catch (error) {
    console.error("Erreur de chargement des artéfacts :", error);
    state.artifacts = [];

    if (el("artifactStatus")) {
      el("artifactStatus").textContent =
        "Impossible de charger les artéfacts depuis l'API. Vérifie ta connexion ou réessaie plus tard.";
    }
  }

  renderCatalog();
  renderPlanner();
}


/* MATÉRIAUX */

async function loadMaterials() {
  try {
    const response = await fetch("./materiaux.json", {
      cache: "no-cache"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Le JSON doit contenir une liste de matériaux.");
    }

    state.materials = data.map(item => ({
      ...item,
      kind: "material",
      key: item.id,
      img: item.image ? `./${item.image}` : "",
      farmingDays: Array.isArray(item.days) ? item.days : []
    }));

    if (el("materialStatus")) {
      el("materialStatus").textContent =
        `${state.materials.length} matériaux d'aptitude chargés depuis materiaux.json.`;
    }
  } catch (error) {
    state.materials = [];

    if (el("materialStatus")) {
      el("materialStatus").textContent =
        "Impossible de charger materiaux.json. Vérifie que le fichier est dans le même dossier que index.html et app.js.";
    }

    console.error("Erreur de chargement des matériaux :", error);
  }

  if (state.category === "materials") renderCatalog();

  renderPlanner();
}


/* BOSS HEBDOMADAIRES */

async function loadBosses() {
  try {
    const response = await fetch("./boss_hebdomadaires.json", {
      cache: "no-cache"
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Le JSON des boss doit contenir une liste.");
    }

    state.bosses = data;

    state.bossDrops = data.flatMap(boss =>
      (boss.drops || []).map(drop => ({
        ...drop,
        kind: "bossdrop",
        bossId: boss.id,
        bossName: boss.name,
        bossLocation: boss.location,
        bossImage: boss.image,
        key: `bossdrop:${boss.id}:${drop.id}`,
        img: drop.image ? `./${drop.image}` : ""
      }))
    );

    if (el("bossStatus")) {
      el("bossStatus").textContent =
        `${state.bosses.length} boss et ${state.bossDrops.length} drops chargés.`;
    }
  } catch (error) {
    state.bosses = [];
    state.bossDrops = [];

    if (el("bossStatus")) {
      el("bossStatus").textContent =
        "Impossible de charger boss_hebdomadaires.json. Vérifie que le fichier est présent.";
    }

    console.error("Erreur de chargement des boss :", error);
  }

  if (state.category === "bosses") renderCatalog();

  renderPlanner();
}


/* =========================
   CATALOGUE
========================= */

function allItems() {
  return [
    ...state.artifacts,
    ...state.materials,
    ...state.bossDrops
  ];
}

function currentItems() {
  if (state.category === "materials") return state.materials;
  if (state.category === "bosses") return state.bossDrops;
  return state.artifacts;
}

function filteredItems() {
  const query = normalize(el("searchInput").value.trim());
  const rarity = el("rarityFilter").value;

  return currentItems().filter(item => {
    const searchText = normalize(
      `${item.name} ${getDomain(item)} ${item.region || ""} ${item.bossName || ""} ${item.bossLocation || ""}`
    );

    const matchesSearch = !query || searchText.includes(query);
    const matchesRarity =
      rarity === "all" || getRarity(item) === Number(rarity);

    return matchesSearch && matchesRarity;
  });
}

function imageMarkup(src, name, cls = "") {
  return src
    ? `
      <img class="${cls}" src="${escapeHtml(src)}"
        alt="${escapeHtml(name)}"
        loading="lazy"
        onerror="this.hidden=true;this.nextElementSibling.hidden=false">
      <span class="fallback" hidden>✦</span>
    `
    : `<div class="fallback ${cls}" aria-label="${escapeHtml(name)}">✦</div>`;
}

function renderCatalog() {
  if (!el("artifactGrid")) return;

  const items = filteredItems();

  el("setCount").textContent = currentItems().length || "—";

  const statLabel = document.querySelector(".stat-card small");

  if (statLabel) {
    if (state.category === "artifacts") {
      statLabel.textContent = "artéfacts chargés";
    } else if (state.category === "materials") {
      statLabel.textContent = "livres chargés";
    } else {
      statLabel.textContent = "drops de boss chargés";
    }
  }

  el("artifactGrid").innerHTML = items.map(item => {
    const key = getKey(item);
    const wished = state.wishlist.has(key);
    const rarity = getRarity(item);
    const availability = getAvailability(item);

    let subtitle = "";

    if (item.kind === "material") {
      subtitle = availability.length
        ? `Disponible : ${availability.join(" · ")}`
        : "Livre d'aptitude";
    } else if (item.kind === "bossdrop") {
      subtitle = `Boss : ${escapeHtml(item.bossName)}`;
    } else {
      subtitle = escapeHtml(getDomain(item));
    }

    return `
      <button class="artifact-card"
        data-open="${escapeHtml(key)}"
        aria-label="Afficher ${escapeHtml(item.name)}">

        <span class="wish-mark">${wished ? "♥" : "♡"}</span>

        <div class="artifact-art">
          ${imageMarkup(getImage(item), item.name)}
        </div>

        <div class="card-copy">
          <h3>${escapeHtml(item.name)}</h3>
          <div class="rarity">${"★".repeat(Math.min(5, rarity))}</div>
          <p class="card-domain">${subtitle}</p>
        </div>
      </button>
    `;
  }).join("");

  el("emptyState").classList.toggle("hidden", items.length > 0);
}


/* =========================
   LISTE DE FARM ET PLANNING
========================= */

function removeWishlistItem(key) {
  state.wishlist.delete(key);
  delete state.farmDays[key];

  saveWishlist();
  saveFarmDays();

  renderCatalog();
  renderPlanner();
}

function setPlannerDay(key, day) {
  const item = allItems().find(entry => getKey(entry) === key);

  if (!item) return;

  /* Pour un boss : tous ses drops sélectionnés changent de jour ensemble */
  if (item.kind === "bossdrop") {
    const bossDropsInWishlist = state.bossDrops.filter(drop =>
      drop.bossId === item.bossId &&
      state.wishlist.has(getKey(drop))
    );

    const alreadySelected = (state.farmDays[key] || []).includes(day);

    bossDropsInWishlist.forEach(drop => {
      const dropKey = getKey(drop);
      state.farmDays[dropKey] = alreadySelected ? [] : [day];
    });
  }

  /* Pour un matériau : on choisit un seul jour à la fois */
  else if (item.kind === "material") {
    const selected = state.farmDays[key] || [];

    state.farmDays[key] = selected.includes(day) ? [] : [day];
  }

  /* Pour un artéfact : plusieurs jours restent possibles */
  else {
    state.farmDays[key] ||= [];

    state.farmDays[key] = state.farmDays[key].includes(day)
      ? state.farmDays[key].filter(value => value !== day)
      : [...state.farmDays[key], day];
  }

  saveFarmDays();
  renderPlanner();
}

function renderPlanner() {
  if (!el("planner")) return;

  const wished = [...state.wishlist]
    .map(key => allItems().find(item => getKey(item) === key))
    .filter(Boolean);

  el("plannerEmpty").classList.toggle("hidden", wished.length > 0);
  el("planner").classList.toggle("hidden", !wished.length);

  if (!wished.length) {
    el("planner").innerHTML = "";
    updateCounts();
    return;
  }

  const choices = `
    <section class="planner-choices">
      <h2>Choisis tes jours de farm</h2>
      <p>
        Choisis un jour pour chaque matériau ou drop de boss.
        Les drops d'un même boss sont déplacés ensemble.
      </p>

      <div class="planner-choice-list">
        ${wished.map(item => {
          const key = getKey(item);
          const selected = state.farmDays[key] || [];
          const availability = getAvailability(item);

          let description = "";

          if (item.kind === "material") {
            description = availability.length
              ? `Disponible : ${availability.join(", ")}`
              : "Disponibilité non fournie par la source";
          } else if (item.kind === "bossdrop") {
            description = `Drop de ${escapeHtml(item.bossName)}`;
          } else {
            description = "Artéfact · domaine accessible tous les jours";
          }

          return `
            <article class="planner-choice">
              <div class="planner-choice-info">
                ${imageMarkup(getImage(item), item.name)}
                <div>
                  <strong>${escapeHtml(item.name)}</strong>
                  <p class="card-domain">${description}</p>
                </div>
              </div>

              <div class="day-selector">
                ${DAYS.map(day => {
                  const on = selected.includes(day);

                  return `
                    <button type="button"
                      class="day-toggle ${on ? "selected" : ""}"
                      data-day-toggle="${escapeHtml(key)}"
                      data-day="${day}"
                      aria-pressed="${on}"
                      title="Choisir ${day}">
                      ${day}
                    </button>
                  `;
                }).join("")}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;

  const week = `
    <section class="planner-week">
      <h2>Mon planning de farm</h2>

      <div class="planner-week-grid">
        ${DAYS.map(day => {
          const dayItems = wished.filter(item =>
            (state.farmDays[getKey(item)] || []).includes(day)
          );

          return `
            <section class="day-column">
              <h3>${day}</h3>

              <div class="day-items">
                ${dayItems.length
                  ? dayItems.map(item => `
                    <article class="planner-item">
                      <button class="remove-item"
                        data-remove="${escapeHtml(getKey(item))}"
                        aria-label="Retirer ${escapeHtml(item.name)}">
                        ×
                      </button>

                      ${imageMarkup(getImage(item), item.name)}

                      <strong>${escapeHtml(item.name)}</strong>

                      ${item.kind === "bossdrop"
                        ? `<small>${escapeHtml(item.bossName)}</small>`
                        : ""}
                    </article>
                  `).join("")
                  : `<p class="no-farm">Rien de prévu</p>`
                }
              </div>
            </section>
          `;
        }).join("")}
      </div>
    </section>
  `;

  el("planner").innerHTML = choices + week;

  updateCounts();
}


/* =========================
   FICHE DÉTAILLÉE
========================= */

function openDetails(key) {
  const item = allItems().find(entry => getKey(entry) === key);

  if (!item) return;

  const wished = state.wishlist.has(key);
  const rarity = getRarity(item);
  const material = item.kind === "material";
  const bossDrop = item.kind === "bossdrop";
  const availability = getAvailability(item);

  const bonus2 = item.bonus?.["2pc"] || item["2pc"] || "";
  const bonus4 = item.bonus?.["4pc"] || item["4pc"] || "";

  let extra = "";

  if (material) {
    extra = `
      <div class="bonus-block">
        <h3>Disponibilité</h3>
        <p>
          ${availability.length
            ? `Ce livre se récupère le : <strong>${availability.join(", ")}</strong>.`
            : "Les jours de disponibilité ne sont pas indiqués par la source de données."
          }
        </p>
      </div>

      <div class="bonus-block">
        <h3>Rareté</h3>
        <p>${"★".repeat(Math.min(5, rarity))} · ${rarity}★ (rareté maximale des livres d’aptitude)</p>
      </div>
    `;
  }

  else if (bossDrop) {
    extra = `
      <div class="bonus-block">
        <h3>Boss hebdomadaire</h3>
        <p><strong>${escapeHtml(item.bossName)}</strong></p>
        <p>${escapeHtml(item.bossLocation)}</p>
      </div>

      <div class="bonus-block">
        <h3>Récompense</h3>
        <p>${escapeHtml(item.probability || "Récompense possible")}</p>
      </div>

      <div class="bonus-block">
        <h3>Organisation du planning</h3>
        <p>
          Lorsque tu changes le jour de ce drop, les autres drops de
          ${escapeHtml(item.bossName)} présents dans ta liste sont déplacés
          avec lui.
        </p>
      </div>
    `;
  }

  else {
    extra = `
      <div class="bonus-block">
        <h3>Bonus 2 pièces</h3>
        <p>${escapeHtml(bonus2 || "Bonus non disponible dans la source de données.")}</p>
      </div>

      <div class="bonus-block">
        <h3>Bonus 4 pièces</h3>
        <p>${escapeHtml(bonus4 || "Bonus non disponible dans la source de données.")}</p>
      </div>

      ${renderDomainLocation(item)}

      ${getPieces(item).length ? `
        <div class="bonus-block">
          <h3>Pièces du set</h3>
          <div class="piece-grid">
            ${getPieces(item).map(piece => `
              <div class="piece">
                ${piece.img
                  ? `<img src="${escapeHtml(piece.img)}" alt="" loading="lazy">`
                  : ""}
                <strong>${escapeHtml(piece.name || piece.label)}</strong>
                <p>${escapeHtml(piece.description)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }

  const heading = material
    ? "MATÉRIAU D'APTITUDE"
    : bossDrop
      ? "DROP DE BOSS HEBDOMADAIRE"
      : "SET D’ARTÉFACTS";

  const subtitle = material
    ? "Philosophie d'aptitude · palier maximal"
    : bossDrop
      ? escapeHtml(item.bossName)
      : escapeHtml(getDomain(item));

  el("detailContent").innerHTML = `
    <div class="detail-head">
      ${imageMarkup(getImage(item), item.name, "detail-image")}

      <div>
        <p class="eyebrow">${heading} · ${rarity}★</p>
        <h2 id="detailTitle">${escapeHtml(item.name)}</h2>
        <p class="detail-domain">${subtitle}</p>
      </div>
    </div>

    ${extra}

    <button class="button detail-action" id="toggleWishlist">
      ${wished ? "♥ Retirer de ma liste" : "♡ Ajouter à ma liste de farm"}
    </button>
  `;

  el("detailDialog").showModal();

  el("toggleWishlist").addEventListener("click", () => {
    if (state.wishlist.has(key)) {
      state.wishlist.delete(key);
      delete state.farmDays[key];
    } else {
      state.wishlist.add(key);

      if (material && availability.length) {
        state.farmDays[key] = [...availability];
      }
    }

    saveWishlist();
    saveFarmDays();

    renderCatalog();
    renderPlanner();

    el("detailDialog").close();
  });
}


/* =========================
   NAVIGATION
========================= */

function setView(view) {
  state.view = view;

  el("catalogueView").classList.toggle("hidden", view !== "catalogue");
  el("planifView").classList.toggle("hidden", view !== "planif");

  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.view === view;

    tab.classList.toggle("active", active);

    if (active) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  if (view === "planif") renderPlanner();
}

function setCategory(category) {
  state.category = category;

  document.querySelectorAll(".category-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.category === category);
  });

  el("rarityFilter").value = "all";
  el("searchInput").value = "";

  if (category === "artifacts") {
    el("catalogueHeading").textContent = "Trouve ton prochain set";
    el("catalogueDescription").textContent =
      "Recherche un artéfact, consulte ses bonus et ajoute-le à ta liste de farm.";
    el("rarityFilter").innerHTML = `
      <option value="all">Toutes</option>
      <option value="2">2★</option>
      <option value="3">3★</option>
      <option value="4">4★</option>
      <option value="5">5★</option>
    `;
  }

  else if (category === "materials") {
    el("catalogueHeading").textContent = "Trouve tes livres d'aptitude";
    el("catalogueDescription").textContent =
      "Retrouve uniquement les Philosophies, le palier maximal des livres d'aptitude.";
    el("rarityFilter").innerHTML = `
      <option value="all">Toutes</option>
      <option value="4">4★ · palier maximal</option>
    `;
  }

  else {
    el("catalogueHeading").textContent = "Boss hebdomadaires";
    el("catalogueDescription").textContent =
      "Retrouve les récompenses possibles des boss hebdomadaires et ajoute-les à ton planning.";
    el("rarityFilter").innerHTML = `
      <option value="all">Toutes</option>
      <option value="5">5★</option>
    `;
  }

  renderCatalog();
}


/* =========================
   ÉVÉNEMENTS
========================= */

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

document.querySelectorAll(".category-tab").forEach(tab => {
  tab.addEventListener("click", () => setCategory(tab.dataset.category));
});

el("searchInput").addEventListener("input", renderCatalog);
el("rarityFilter").addEventListener("change", renderCatalog);

el("showWishlist").addEventListener("click", () => setView("planif"));
el("backToCatalog").addEventListener("click", () => setView("catalogue"));

el("artifactGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-open]");

  if (card) openDetails(card.dataset.open);
});


/* CLICS DANS LE PLANNING */

el("planner").addEventListener("click", event => {
  const dayButton = event.target.closest("[data-day-toggle]");

  if (dayButton) {
    const key = dayButton.dataset.dayToggle;
    const day = dayButton.dataset.day;

    setPlannerDay(key, day);
    return;
  }

  const removeButton = event.target.closest("[data-remove]");

  if (removeButton) {
    removeWishlistItem(removeButton.dataset.remove);
  }
});


/* VIDER TOUTE LA LISTE */

el("clearWishlist").addEventListener("click", () => {
  if (
    state.wishlist.size &&
    confirm("Supprimer tous les artéfacts, matériaux et drops de boss de ta liste ?")
  ) {
    state.wishlist.clear();
    state.farmDays = {};

    saveWishlist();
    saveFarmDays();

    renderCatalog();
    renderPlanner();
  }
});


/* FERMETURE DE LA FENÊTRE */

el("closeDialog").addEventListener("click", () => {
  el("detailDialog").close();
});

el("detailDialog").addEventListener("click", event => {
  if (event.target === el("detailDialog")) {
    el("detailDialog").close();
  }
});


/* =========================
   DÉMARRAGE
========================= */

loadWishlist();
updateCounts();

loadArtifacts();
loadMaterials();
loadBosses();
