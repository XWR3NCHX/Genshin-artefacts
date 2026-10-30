
const API_BASE = "https://genshin-impact.up.railway.app";
const STORAGE_KEY = "genshin-artefacts-wishlist-v1";
const PLAN_STORAGE_KEY = "genshin-artefacts-days-v1";

const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche"
];

const state = {
  artifacts: [],
  wishlist: new Set(),
  farmDays: {},
  view: "catalogue",
  selected: null
};

const el = (id) => document.getElementById(id);

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/* ========================================
   SAUVEGARDE ET CHARGEMENT
======================================== */

function loadWishlist() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    state.wishlist = new Set(
      Array.isArray(saved) ? saved.map(String) : []
    );
  } catch {
    state.wishlist = new Set();
  }

  try {
    const savedDays = JSON.parse(
      localStorage.getItem(PLAN_STORAGE_KEY) || "{}"
    );

    state.farmDays =
      savedDays && typeof savedDays === "object" && !Array.isArray(savedDays)
        ? savedDays
        : {};

    // Ne conserver que les jours valides.
    Object.keys(state.farmDays).forEach(key => {
      const days = state.farmDays[key];

      state.farmDays[key] = Array.isArray(days)
        ? [...new Set(days.filter(day => DAYS.includes(day)))]
        : [];
    });
  } catch {
    state.farmDays = {};
  }
}

function saveWishlist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...state.wishlist])
  );

  updateCounts();
}

function saveFarmDays() {
  localStorage.setItem(
    PLAN_STORAGE_KEY,
    JSON.stringify(state.farmDays)
  );
}

function updateCounts() {
  el("wishlistCount").textContent = state.wishlist.size;
  el("wishlistCount2").textContent = state.wishlist.size;

  el("plannerSummary").textContent = state.wishlist.size
    ? `${state.wishlist.size} set${state.wishlist.size > 1 ? "s" : ""} dans ta liste.`
    : "Aucun artéfact dans ta liste.";
}

/* ========================================
   INFORMATIONS DES ARTÉFACTS
======================================== */

function getName(item) {
  return item.name || item.Name || item.title || item.key || "Artéfact";
}

function getKey(item) {
  return String(item.key || item.slug || item.id || getName(item));
}

function getRarity(item) {
  const value =
    item.rarity ??
    item.Rarity ??
    item.maxRarity ??
    5;

  if (Array.isArray(value)) {
    return Math.max(
      ...value.map(Number).filter(Number.isFinite),
      5
    );
  }

  if (typeof value === "string" && value.includes(",")) {
    return Math.max(
      ...value.split(",").map(Number).filter(Number.isFinite),
      5
    );
  }

  return Number(value) || 5;
}

function getBonus(item, kind) {
  const bonus = item.bonus || item.Bonus || {};

  return (
    bonus[kind] ||
    bonus[kind.replace("pc", "Pc")] ||
    item[kind] ||
    item[kind.toUpperCase()] ||
    ""
  );
}

function getImage(item) {
  return (
    item.img ||
    item.image ||
    item.icon ||
    item.Icon ||
    item.images?.flower ||
    item.pieces?.flower?.img ||
    ""
  );
}

function getDomain(item) {
  return (
    item.domain ||
    item.Domain ||
    item.source ||
    item.obtain ||
    item.obtainable ||
    "Domaine d’artéfacts"
  );
}



/* ========================================
   CARTES DES DOMAINES D'ARTÉFACTS
   Images de localisation : GameWith
======================================== */
const DOMAIN_INFO = [
  { names: ["Midsummer Courtyard", "Courtyard of Parting"], region: "Mondstadt", area: "Falaises Starsnatch", image: "", map: "https://gamewith.net/genshin-impact/article/show/22392" },
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
  { names: ["Moonchild's Treasures", "Moochild's Treasures"], region: "Nod-Krai", area: "Pic Ashveil", image: "", map: "https://gamewith.net/genshin-impact/article/show/22392" }
];

// Correspondance par nom de set lorsque l'API ne fournit pas le domaine.
const SET_DOMAIN = {
  "thundering fury": "Midsummer Courtyard", "thundersoother": "Midsummer Courtyard",
  "blizzard strayer": "Peak of Vindagnyr", "heart of depth": "Peak of Vindagnyr",
  "tenacity of the millelith": "Ridge Watch", "pale flame": "Ridge Watch",
  "viridescent venerer": "Valley of Remembrance", "maiden beloved": "Valley of Remembrance",
  "bloodstained chivalry": "Clear Pool and Mountain Cavern", "noblesse oblige": "Clear Pool and Mountain Cavern",
  "archaic petra": "Domain of Guyun", "retracing bolide": "Domain of Guyun",
  "lavawalker": "Hidden Palace of Zhou Formula", "crimson witch of flames": "Hidden Palace of Zhou Formula",
  "vermillion hereafter": "The Lost Valley", "echoes of an offering": "The Lost Valley",
  "shimenawa's reminiscence": "Momiji-Dyed Court", "emblem of severed fate": "Momiji-Dyed Court",
  "ocean-hued clam": "Slumbering Court", "husk of opulent dreams": "Slumbering Court",
  "desert pavilion chronicle": "City of Gold", "flower of paradise lost": "City of Gold",
  "vourukasha's glow": "Molten Iron Fortress", "nymph's dream": "Molten Iron Fortress",
  "deepwood memories": "Spire of Solitary Enlightenment", "gilded dreams": "Spire of Solitary Enlightenment",
  "golden troupe": "Denouement of Sin", "marechaussee hunter": "Denouement of Sin",
  "fragment of harmonic whimsy": "Faded Theater", "unfinished reverie": "Faded Theater",
  "nighttime whispers in the echoing woods": "Waterfall Wen", "song of days past": "Waterfall Wen",
  "obsidian codex": "Sanctum of Rainbow Spirits", "scroll of the hero of cinder city": "Sanctum of Rainbow Spirits"
};

function getDomainInfo(item) {
  const raw = normalize(getDomain(item));
  let found = DOMAIN_INFO.find(domain =>
    domain.names.some(name => raw.includes(normalize(name)))
  );
  if (!found) {
    const setName = normalize(getName(item));
    const domainName = Object.entries(SET_DOMAIN).find(([set]) => setName.includes(set))?.[1];
    found = DOMAIN_INFO.find(domain => domainName && domain.names.includes(domainName));
  }
  return found || null;
}

function renderDomainLocation(item) {
  const info = getDomainInfo(item);
  if (!info) {
    return `<section class="domain-location"><h3>Où farmer ce set ?</h3><p>Le domaine et la région ne sont pas encore renseignés pour cet artéfact.</p><p class="domain-source">Source : ${escapeHtml(getDomain(item))}</p></section>`;
  }
  const mapImage = info.image
    ? `<img class="domain-map-image" src="${escapeHtml(info.image)}" alt="Carte de localisation du domaine ${escapeHtml(info.names[0])}" loading="lazy" onerror="this.closest('.domain-map-frame').classList.add('map-image-error');this.remove()">`
    : `<div class="domain-map-placeholder">Carte bientôt disponible</div>`;
  return `
    <section class="domain-location">
      <h3>Où farmer ce set ?</h3>
      <div class="domain-location-meta">
        <span><small>DOMAINE</small><strong>${escapeHtml(info.names[0])}</strong></span>
        <span><small>RÉGION</small><strong>${escapeHtml(info.region)}</strong></span>
        <span><small>SECTEUR</small><strong>${escapeHtml(info.area)}</strong></span>
      </div>
      <div class="domain-map-frame">${mapImage}</div>
      <p class="domain-map-caption">Carte de localisation du domaine · ${escapeHtml(info.region)}</p>
      <a class="domain-map-link" href="${escapeHtml(info.map)}" target="_blank" rel="noopener noreferrer">Ouvrir la carte interactive</a>
    </section>
  `;
}

function getPieces(item) {
  const p = item.pieces || item.Pieces || {};

  const map = [
    ["flower", "Fleur"],
    ["plume", "Plume"],
    ["sands", "Sablier"],
    ["goblet", "Coupe"],
    ["circlet", "Couronne"]
  ];

  return map.map(([key, label]) => {
    const piece = p[key] || p[label.toLowerCase()] || {};

    return {
      label,
      name: piece.name || piece.Name || "",
      img: piece.img || piece.image || "",
      description: piece.description || piece.Description || ""
    };
  }).filter(piece =>
    piece.name || piece.img || piece.description
  );
}

function makeFallback(name, index) {
  return {
    key: `fallback-${index}-${name}`,
    name,
    rarity: 5,
    bonus: {},
    img: "",
    domain: "Domaine d’artéfacts"
  };
}

/* ========================================
   CHARGEMENT DU CATALOGUE
======================================== */

async function loadArtifacts() {
  el("status").textContent =
    "Chargement du catalogue depuis la base communautaire…";

  try {
    const response = await fetch(
      `${API_BASE}/artifacts?details=true&rarity=5&sort=name`,
      {
        headers: {
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API indisponible (${response.status})`);
    }

    const payload = await response.json();

    const list = Array.isArray(payload)
      ? payload
      : (
          payload.artifacts ||
          payload.data ||
          payload.results ||
          []
        );

    if (!list.length) {
      throw new Error(
        "La réponse de l’API ne contient aucun artéfact."
      );
    }

    state.artifacts = list.map((item, i) => ({
      ...item,
      key: getKey(item) || `artifact-${i}`,
      name: getName(item),
      rarity: getRarity(item)
    }));

    el("status").textContent =
      `${state.artifacts.length} sets récupérés. Sélectionne une carte pour voir les détails.`;

  } catch (error) {
    state.artifacts = [];

    el("status").textContent =
      "Impossible de charger les données d’artéfacts. Vérifie ta connexion puis recharge la page. " +
      error.message;
  }

  el("setCount").textContent =
    state.artifacts.length || "—";

  renderCatalog();
  renderPlanner();
}

/* ========================================
   RECHERCHE ET FILTRES
======================================== */

function filteredArtifacts() {
  const query = normalize(
    el("searchInput").value.trim()
  );

  const rarity = el("rarityFilter").value;

  return state.artifacts.filter(item =>
    (!query ||
      normalize(`${item.name} ${getDomain(item)}`).includes(query)
    ) &&
    (
      rarity === "all" ||
      (rarity === "5" ? getRarity(item) >= 5 : getRarity(item) <= 4)
    )
  );
}

/* ========================================
   AFFICHAGE DES IMAGES
======================================== */

function imageMarkup(src, name, cls = "") {
  if (!src) {
    return `
      <div class="fallback ${cls}" aria-label="${escapeHtml(name)}">
        ✦
      </div>
    `;
  }

  return `
    <img
      class="${cls}"
      src="${escapeHtml(src)}"
      alt="${escapeHtml(name)}"
      loading="lazy"
      onerror="this.hidden=true;this.nextElementSibling.hidden=false"
    >
    <span class="fallback" hidden>✦</span>
  `;
}

/* ========================================
   AFFICHAGE DU CATALOGUE
======================================== */

function renderCatalog() {
  const items = filteredArtifacts();

  el("artifactGrid").innerHTML = items.map(item => {
    const wished = state.wishlist.has(getKey(item));

    return `
      <button
        class="artifact-card"
        data-open="${escapeHtml(getKey(item))}"
        aria-label="Afficher ${escapeHtml(item.name)}"
      >
        <span class="wish-mark" aria-hidden="true">
          ${wished ? "♥" : "♡"}
        </span>

        <div class="artifact-art">
          ${imageMarkup(getImage(item), item.name)}
        </div>

        <div class="card-copy">
          <h3>${escapeHtml(item.name)}</h3>

          <div class="rarity">
            ${"★".repeat(Math.min(5, getRarity(item)))}
          </div>

          <p class="card-domain">
            ${escapeHtml(getDomain(item))}
          </p>
        </div>
      </button>
    `;
  }).join("");

  el("emptyState").classList.toggle(
    "hidden",
    items.length > 0
  );
}

/* ========================================
   PLANIFICATION DES JOURS DE FARM
======================================== */

function renderPlanner() {
  const wishedItems = state.artifacts.filter(item =>
    state.wishlist.has(getKey(item))
  );

  el("plannerEmpty").classList.toggle(
    "hidden",
    wishedItems.length > 0
  );

  el("planner").classList.toggle(
    "hidden",
    wishedItems.length === 0
  );

  if (!wishedItems.length) {
    el("planner").innerHTML = "";
    updateCounts();
    return;
  }

  /* Sélection des jours pour chaque artéfact */

  const choices = `
    <section class="planner-choices">

      <h2>Choisis tes jours de farm</h2>

      <p>
        Sélectionne un ou plusieurs jours pour chaque set.
        Tes choix seront automatiquement sauvegardés.
      </p>

      <div class="planner-choice-list">

        ${wishedItems.map(item => {
          const key = getKey(item);
          const selectedDays = state.farmDays[key] || [];

          return `
            <article class="planner-choice">

              <div class="planner-choice-info">

                ${getImage(item)
                  ? `
                    <img
                      src="${escapeHtml(getImage(item))}"
                      alt=""
                      loading="lazy"
                    >
                  `
                  : `
                    <div class="fallback">✦</div>
                  `
                }

                <strong>
                  ${escapeHtml(item.name)}
                </strong>

              </div>

              <div class="day-selector">

                ${DAYS.map(day => {
                  const selected = selectedDays.includes(day);

                  return `
                    <button
                      type="button"
                      class="day-toggle ${selected ? "selected" : ""}"
                      data-day-toggle="${escapeHtml(key)}"
                      data-day="${day}"
                      aria-pressed="${selected}"
                    >
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

  /* Affichage du planning hebdomadaire */

  const week = `
    <section class="planner-week">

      <h2>Mon planning de farm</h2>

      <div class="planner-week-grid">

        ${DAYS.map(day => {
          const dayItems = wishedItems.filter(item =>
            (state.farmDays[getKey(item)] || []).includes(day)
          );

          return `
            <section class="day-column">

              <h3>${day}</h3>

              <div class="day-items">

                ${dayItems.length
                  ? dayItems.map(item => `
                    <article class="planner-item">

                      <button
                        class="remove-item"
                        data-remove="${escapeHtml(getKey(item))}"
                        aria-label="Retirer ${escapeHtml(item.name)} de la liste"
                      >
                        ×
                      </button>

                      ${getImage(item)
                        ? `
                          <img
                            src="${escapeHtml(getImage(item))}"
                            alt=""
                            loading="lazy"
                          >
                        `
                        : `
                          <div class="fallback">✦</div>
                        `
                      }

                      <strong>
                        ${escapeHtml(item.name)}
                      </strong>

                    </article>
                  `).join("")
                  : `
                    <p class="no-farm">
                      Aucun set prévu
                    </p>
                  `
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

/* ========================================
   FICHE DÉTAILLÉE D'UN ARTÉFACT
======================================== */

function openDetails(key) {
  const item = state.artifacts.find(candidate =>
    getKey(candidate) === key
  );

  if (!item) return;

  state.selected = item;

  const pieces = getPieces(item);
  const wished = state.wishlist.has(key);

  const bonus2 =
    getBonus(item, "2pc") ||
    "Bonus 2 pièces non disponible dans la source de données.";

  const bonus4 =
    getBonus(item, "4pc") ||
    "Bonus 4 pièces non disponible dans la source de données.";

  el("detailContent").innerHTML = `
    <div class="detail-head">

      ${getImage(item)
        ? `
          <img
            class="detail-image"
            src="${escapeHtml(getImage(item))}"
            alt=""
          >
        `
        : `
          <div class="detail-image fallback">✦</div>
        `
      }

      <div>
        <p class="eyebrow">
          SET D’ARTÉFACTS · ${getRarity(item)}★ MAX.
        </p>

        <h2 id="detailTitle">
          ${escapeHtml(item.name)}
        </h2>

        <p class="detail-domain">
          ${escapeHtml(getDomain(item))}
        </p>
      </div>

    </div>

    ${renderDomainLocation(item)}

    <div class="bonus-block">
      <h3>Bonus 2 pièces</h3>
      <p>${escapeHtml(bonus2)}</p>
    </div>

    <div class="bonus-block">
      <h3>Bonus 4 pièces</h3>
      <p>${escapeHtml(bonus4)}</p>
    </div>

    ${pieces.length
      ? `
        <div class="bonus-block">

          <h3>Pièces du set</h3>

          <div class="piece-grid">

            ${pieces.map(piece => `
              <div class="piece">

                ${piece.img
                  ? `
                    <img
                      src="${escapeHtml(piece.img)}"
                      alt=""
                    >
                  `
                  : ""
                }

                <strong>
                  ${escapeHtml(piece.name || piece.label)}
                </strong>

                <p>
                  ${escapeHtml(piece.description)}
                </p>

              </div>
            `).join("")}

          </div>
        </div>
      `
      : ""
    }

    <button class="button detail-action" id="toggleWishlist">
      ${wished
        ? "♥ Retirer de ma liste de souhaits"
        : "♡ Ajouter à ma liste de souhaits"
      }
    </button>
  `;

  el("detailDialog").showModal();

  el("toggleWishlist").addEventListener("click", () => {
    if (state.wishlist.has(key)) {
      state.wishlist.delete(key);
      delete state.farmDays[key];
    } else {
      state.wishlist.add(key);
    }

    saveWishlist();
    saveFarmDays();

    renderCatalog();
    renderPlanner();

    // Fermer la fiche après la modification.
    el("detailDialog").close();
  });
}

/* ========================================
   NAVIGATION
======================================== */

function setView(view) {
  state.view = view;

  el("catalogueView").classList.toggle(
    "hidden",
    view !== "catalogue"
  );

  el("planifView").classList.toggle(
    "hidden",
    view !== "planif"
  );

  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.view === view;

    tab.classList.toggle("active", active);

    if (active) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  if (view === "planif") {
    renderPlanner();
  }
}

/* ========================================
   ÉVÉNEMENTS DE NAVIGATION
======================================== */

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    setView(tab.dataset.view);
  });
});

el("searchInput").addEventListener("input", renderCatalog);

el("rarityFilter").addEventListener("change", renderCatalog);

el("showWishlist").addEventListener("click", () => {
  setView("planif");
});

el("backToCatalog").addEventListener("click", () => {
  setView("catalogue");
});

/* ========================================
   CLIC SUR LES CARTES DU CATALOGUE
======================================== */

el("artifactGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-open]");

  if (card) {
    openDetails(card.dataset.open);
  }
});

/* ========================================
   CLICS DANS LE PLANNING
======================================== */

el("planner").addEventListener("click", event => {

  // Sélection ou désélection d'un jour.
  const dayButton = event.target.closest("[data-day-toggle]");

  if (dayButton) {
    const key = dayButton.dataset.dayToggle;
    const day = dayButton.dataset.day;

    if (!state.farmDays[key]) {
      state.farmDays[key] = [];
    }

    const selectedDays = state.farmDays[key];

    if (selectedDays.includes(day)) {
      state.farmDays[key] = selectedDays.filter(
        value => value !== day
      );
    } else {
      state.farmDays[key].push(day);
    }

    saveFarmDays();
    renderPlanner();

    return;
  }

  // Retirer un artéfact de la liste.
  const removeButton = event.target.closest("[data-remove]");

  if (removeButton) {
    const key = removeButton.dataset.remove;

    state.wishlist.delete(key);
    delete state.farmDays[key];

    saveWishlist();
    saveFarmDays();

    renderCatalog();
    renderPlanner();
  }
});

/* ========================================
   SUPPRESSION DE LA LISTE DE SOUHAITS
======================================== */

el("clearWishlist").addEventListener("click", () => {
  if (!state.wishlist.size) return;

  if (
    confirm("Supprimer tous les artéfacts de ta liste de souhaits ?")
  ) {
    state.wishlist.clear();
    state.farmDays = {};

    saveWishlist();
    saveFarmDays();

    renderCatalog();
    renderPlanner();
  }
});

/* ========================================
   FERMETURE DE LA FENÊTRE DE DÉTAILS
======================================== */

el("closeDialog").addEventListener("click", () => {
  el("detailDialog").close();
});

el("detailDialog").addEventListener("click", event => {
  if (event.target === el("detailDialog")) {
    el("detailDialog").close();
  }
});

/* ========================================
   INITIALISATION
======================================== */

loadWishlist();
updateCounts();
loadArtifacts();
