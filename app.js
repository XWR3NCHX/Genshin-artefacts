
"use strict";

/* =====================================================
   TEYVAT — APPLICATION PRINCIPALE
===================================================== */

const API_BASE = "https://genshin-impact.up.railway.app";

const STORAGE_KEYS = {
  wishlist: "genshin-artefacts-wishlist-v1",
  days: "genshin-artefacts-days-v1"
};

const DAYS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" }
];

const DOMAIN_INFO = [
  { id: "mondstadt", name: "Mondstadt" },
  { id: "liyue", name: "Liyue" },
  { id: "inazuma", name: "Inazuma" },
  { id: "sumeru", name: "Sumeru" },
  { id: "fontaine", name: "Fontaine" },
  { id: "natlan", name: "Natlan" },
  { id: "nod-krai", name: "Nod-Krai" }
];

const SET_DOMAIN = {
  "gladiator's finale": "Mondstadt",
  "wanderer's troupe": "Mondstadt"
};

const state = {
  artifacts: [],
  materials: [],
  bosses: [],
  bossDrops: [],
  wishlist: [],
  farmDays: {},
  view: "catalogue",
  category: "artifacts",
  selected: null,
  search: "",
  rarity: "all"
};

const el = (id) => document.getElementById(id);

/* =====================================================
   OUTILS
===================================================== */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeDay(day) {
  const value = normalizeText(day);

  const knownDays = {
    lundi: "lundi",
    mardi: "mardi",
    mercredi: "mercredi",
    jeudi: "jeudi",
    vendredi: "vendredi",
    samedi: "samedi",
    dimanche: "dimanche"
  };

  return knownDays[value] || value;
}

function normalizeImage(path) {
  if (!path) return "";

  const value = String(path).trim();

  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  return `./${value.replace(/^\.?\//, "")}`;
}

function getName(item) {
  if (!item) return "Sans nom";

  if (typeof item.name === "string") {
    return item.name;
  }

  if (item.name && typeof item.name === "object") {
    return (
      item.name.fr ||
      item.name.French ||
      item.name.en ||
      item.name.English ||
      Object.values(item.name)[0] ||
      "Sans nom"
    );
  }

  return item.title || item.id || "Sans nom";
}

function getImage(item) {
  if (!item) return "";

  return (
    item.img ||
    item.image ||
    item.icon ||
    item.Icon ||
    item.iconUrl ||
    item.images?.flower ||
    item.pieces?.flower?.img ||
    ""
  );
}

function getRarity(item) {
  const value = Number(
    item?.rarity ??
    item?.max_rarity ??
    item?.maxRarity ??
    item?.stars ??
    5
  );

  return Number.isFinite(value) ? value : 5;
}

function getKey(item) {
  if (item.kind === "material") {
    return `material:${item.id || item.key}`;
  }

  if (item.kind === "bossdrop") {
    return `bossdrop:${item.bossId}:${item.id}`;
  }

  return String(
    item.key ||
    item.slug ||
    item.id ||
    getName(item)
  );
}

function getAvailability(item) {
  if (item.kind === "material") {
    return (item.farmingDays || []).map(normalizeDay);
  }

  const days =
    item.farmingDays ||
    item.farming_days ||
    item.days ||
    item.availability ||
    [];

  return Array.isArray(days) ? days.map(normalizeDay) : [];
}

function getPieces(item) {
  const pieces = item?.pieces || {};

  return [
    { id: "flower", label: "Fleur", data: pieces.flower },
    { id: "plume", label: "Plume", data: pieces.plume },
    { id: "sands", label: "Sablier", data: pieces.sands },
    { id: "goblet", label: "Coupe", data: pieces.goblet },
    { id: "circlet", label: "Diadème", data: pieces.circlet }
  ].filter((piece) => piece.data);
}

function getDomain(item) {
  if (item.domain) return item.domain;

  const name = normalizeText(getName(item));

  for (const [setName, domain] of Object.entries(SET_DOMAIN)) {
    if (name.includes(normalizeText(setName))) {
      return domain;
    }
  }

  return item.location || "";
}

function getDomainLocation(item) {
  const domain = getDomain(item);
  if (!domain) return "";

  return (
    DOMAIN_INFO.find(
      (entry) =>
        normalizeText(entry.name) === normalizeText(domain)
    )?.name || domain
  );
}

function getDomainHTML(item) {
  const location = getDomainLocation(item);

  return location
    ? `<p class="detail-domain">${escapeHTML(location)}</p>`
    : "";
}

function getImageHTML(image, name, className = "") {
  if (!image) {
    return `<div class="image-fallback ${className}">✧</div>`;
  }

  return `
    <img
      class="${className}"
      src="${escapeHTML(normalizeImage(image))}"
      alt="${escapeHTML(name)}"
      loading="lazy"
      onerror="this.style.display='none'"
    >
  `;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }

  return response.json();
}

function setHidden(element, hidden) {
  if (!element) return;

  element.hidden = Boolean(hidden);
}

/* =====================================================
   SAUVEGARDE
===================================================== */

function loadWishlist() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.wishlist) || "[]"
    );

    state.wishlist = Array.isArray(saved) ? saved : [];
  } catch {
    state.wishlist = [];
  }

  try {
    const savedDays = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.days) || "{}"
    );

    state.farmDays =
      savedDays && typeof savedDays === "object"
        ? savedDays
        : {};
  } catch {
    state.farmDays = {};
  }

  // Normalisation des jours déjà sauvegardés.
  Object.keys(state.farmDays).forEach((key) => {
    if (Array.isArray(state.farmDays[key])) {
      state.farmDays[key] =
        state.farmDays[key].map(normalizeDay);
    } else {
      state.farmDays[key] = [];
    }
  });
}

function saveWishlist() {
  localStorage.setItem(
    STORAGE_KEYS.wishlist,
    JSON.stringify(state.wishlist)
  );

  localStorage.setItem(
    STORAGE_KEYS.days,
    JSON.stringify(state.farmDays)
  );
}

/* =====================================================
   CHARGEMENT DES ARTEFACTS
===================================================== */

async function loadArtifacts() {
  try {
    const data = await fetchJson(
      `${API_BASE}/artifacts?details=true&sort=name`
    );

    const list = Array.isArray(data)
      ? data
      : data.artifacts || data.data || [];

    state.artifacts = list.map((item) => ({
      ...item,
      kind: "artifact",
      key: String(
        item.key ||
        item.slug ||
        item.id ||
        getName(item)
      )
    }));

    renderCatalog();

  } catch (error) {
    console.error("Erreur de chargement des artefacts :", error);

    renderCatalog();

    const status = el("artifactStatus");
    if (status) {
      status.textContent =
        "Impossible de charger les artefacts.";
    }
  }
}

/* =====================================================
   CHARGEMENT DES MATÉRIAUX
===================================================== */

async function loadMaterials() {
  try {
    const data = await fetchJson("./materiaux.json");

    const list = Array.isArray(data)
      ? data
      : data.materials || data.data || [];

    state.materials = list.map((item) => ({
      ...item,
      kind: "material",
      key: item.id,
      id: item.id,
      name: getName(item),
      image: normalizeImage(item.image),
      farmingDays: Array.isArray(item.days)
        ? item.days.map(normalizeDay)
        : []
    }));

    renderCatalog();

  } catch (error) {
    console.error("Erreur de chargement des matériaux :", error);

    const status = el("materialStatus");
    if (status) {
      status.textContent =
        "Impossible de charger les matériaux.";
    }

    renderCatalog();
  }
}

/* =====================================================
   CHARGEMENT DES BOSS
===================================================== */

async function loadBosses() {
  try {
    const data = await fetchJson("./boss_hebdomadaires.json");

    state.bosses = Array.isArray(data) ? data : [];

    state.bossDrops = state.bosses.flatMap((boss) => {
      const drops = Array.isArray(boss.drops)
        ? boss.drops
        : [];

      return drops.map((drop) => ({
        ...drop,
        kind: "bossdrop",
        key: `bossdrop:${boss.id}:${drop.id}`,
        bossId: boss.id,
        bossName: boss.name,
        bossLocation: boss.location,
        bossImage: normalizeImage(boss.image),
        image: normalizeImage(drop.image),
        rarity: 5
      }));
    });

    renderCatalog();

  } catch (error) {
    console.error("Erreur de chargement des boss :", error);

    const status = el("bossStatus");
    if (status) {
      status.textContent =
        "Impossible de charger les boss.";
    }

    renderCatalog();
  }
}

/* =====================================================
   DONNÉES
===================================================== */

function allItems() {
  return [
    ...state.artifacts,
    ...state.materials,
    ...state.bossDrops
  ];
}

function currentItems() {
  if (state.category === "materials") {
    return state.materials;
  }

  if (state.category === "bosses") {
    return state.bosses;
  }

  return state.artifacts;
}

function findItem(key) {
  return allItems().find(
    (item) => getKey(item) === key
  );
}

function isInWishlist(item) {
  return state.wishlist.includes(getKey(item));
}

/* =====================================================
   NAVIGATION
===================================================== */

function setView(view) {
  state.view = view;

  setHidden(
    el("catalogueView"),
    view !== "catalogue"
  );

  setHidden(
    el("planifView"),
    view !== "planif"
  );

  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.view === view
    );
  });

  if (view === "planif") {
    renderPlanner();
  }
}

function setCategory(category) {
  state.category = category;

  document.querySelectorAll(".category-tab").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.category === category
    );
  });

  const headings = {
    artifacts: {
      title: "Artéfacts",
      description: "Découvrez les ensembles d'artéfacts disponibles."
    },
    materials: {
      title: "Matériaux",
      description: "Retrouvez les matériaux nécessaires à votre progression."
    },
    bosses: {
      title: "Boss hebdomadaires",
      description: "Découvrez les boss et leurs récompenses."
    }
  };

  const heading = headings[category];

  if (heading) {
    if (el("catalogueHeading")) {
      el("catalogueHeading").textContent = heading.title;
    }

    if (el("catalogueDescription")) {
      el("catalogueDescription").textContent =
        heading.description;
    }
  }

  renderCatalog();
}

/* =====================================================
   FILTRAGE
===================================================== */

function matchesSearch(item) {
  const search = normalizeText(state.search);

  if (!search) return true;

  const searchable = [
    getName(item),
    item.bossName,
    item.bossLocation,
    item.family,
    item.region,
    item.location
  ].map(normalizeText);

  return searchable.some((value) => value.includes(search));
}

function matchesRarity(item) {
  return (
    state.rarity === "all" ||
    String(getRarity(item)) === state.rarity
  );
}

/* =====================================================
   CARTES DES ARTEFACTS ET MATÉRIAUX
===================================================== */

function renderStandardCard(item) {
  const key = getKey(item);
  const name = getName(item);
  const image = getImage(item);
  const rarity = getRarity(item);
  const added = isInWishlist(item);

  const subtitle = item.kind === "material"
    ? (item.family || item.region || "Matériau")
    : getDomainLocation(item);

  return `
    <article class="artifact-card">

      <button
        class="card-open"
        type="button"
        data-action="details"
        data-key="${escapeHTML(key)}"
      >
        <div class="artifact-art">
          ${getImageHTML(image, name)}
        </div>

        <div class="card-copy">
          <h3>${escapeHTML(name)}</h3>

          <p class="card-domain">
            ${escapeHTML(subtitle)}
          </p>

          <div class="rarity">
            ${"★".repeat(Math.min(5, Math.max(1, rarity)))}
          </div>
        </div>
      </button>

      <button
        class="wish-mark ${added ? "selected" : ""}"
        type="button"
        data-action="toggle"
        data-key="${escapeHTML(key)}"
        aria-label="${added ? "Retirer de" : "Ajouter à"} la liste"
        title="${added ? "Retirer de ma liste" : "Ajouter à ma liste"}"
      >
        ${added ? "✓" : "+"}
      </button>

    </article>
  `;
}

/* =====================================================
   CARTES DES BOSS
===================================================== */

function renderBossCard(boss) {
  const drops = state.bossDrops.filter(
    (drop) => drop.bossId === boss.id
  );

  return `
    <article class="artifact-card boss-card">

      <button
        class="card-open"
        type="button"
        data-action="boss-details"
        data-boss="${escapeHTML(boss.id)}"
      >
        <div class="artifact-art">
          ${getImageHTML(boss.image, boss.name)}
        </div>

        <div class="card-copy">
          <h3>${escapeHTML(boss.name)}</h3>

          <p class="card-domain boss-location">
            ${escapeHTML(boss.location || "Localisation inconnue")}
          </p>

          <div class="boss-drop-preview">
            ${drops.map((drop) => `
              ${getImageHTML(drop.image, drop.name)}
            `).join("")}
          </div>

          <p class="card-domain">
            ${drops.length} récompenses
          </p>
        </div>
      </button>

    </article>
  `;
}

/* =====================================================
   AFFICHAGE DU CATALOGUE
===================================================== */

function renderCatalog() {
  const grid = el("artifactGrid");
  if (!grid) return;

  let items = currentItems().filter((item) => {
    return matchesSearch(item) && matchesRarity(item);
  });

  if (state.category === "bosses") {
    grid.innerHTML = items
      .map(renderBossCard)
      .join("");
  } else {
    grid.innerHTML = items
      .map(renderStandardCard)
      .join("");
  }

  setHidden(
    el("emptyState"),
    items.length !== 0
  );

  if (el("setCount")) {
    el("setCount").textContent = items.length;
  }

  updateCounts();
}

/* =====================================================
   LISTE DE SOUHAITS
===================================================== */

function addWishlistItem(item) {
  const key = getKey(item);

  if (state.wishlist.includes(key)) return;

  state.wishlist.push(key);

  if (!state.farmDays[key]) {
    if (item.kind === "material") {
      state.farmDays[key] = [...getAvailability(item)];
    } else {
      state.farmDays[key] = [];
    }
  }

  saveWishlist();
  renderCatalog();
  renderPlanner();
}

function removeWishlistItem(key) {
  state.wishlist = state.wishlist.filter(
    (savedKey) => savedKey !== key
  );

  delete state.farmDays[key];

  saveWishlist();
  renderCatalog();
  renderPlanner();
}

function toggleWishlist(item) {
  const key = getKey(item);

  if (state.wishlist.includes(key)) {
    removeWishlistItem(key);
  } else {
    addWishlistItem(item);
  }
}

function clearWishlist() {
  state.wishlist = [];
  state.farmDays = {};

  saveWishlist();
  renderCatalog();
  renderPlanner();
}

/* =====================================================
   PLANIFICATION DES JOURS
===================================================== */

function setPlannerDay(key, day) {
  const item = findItem(key);
  if (!item) return;

  const currentDays = state.farmDays[key] || [];
  const alreadySelected = currentDays.includes(day);

  if (item.kind === "material") {
    // Les matériaux ne peuvent être planifiés
    // que les jours où ils sont disponibles.
    const availableDays = getAvailability(item);

    if (
      availableDays.length &&
      !availableDays.includes(day)
    ) {
      return;
    }

    state.farmDays[key] = alreadySelected
      ? currentDays.filter((value) => value !== day)
      : [...currentDays, day];

  } else if (item.kind === "bossdrop") {
    /*
     * Toutes les récompenses ajoutées d'un même boss
     * sont déplacées ensemble.
     */
    const bossKeys = state.wishlist.filter((wishlistKey) => {
      const wishlistItem = findItem(wishlistKey);

      return (
        wishlistItem &&
        wishlistItem.kind === "bossdrop" &&
        wishlistItem.bossId === item.bossId
      );
    });

    bossKeys.forEach((bossKey) => {
      state.farmDays[bossKey] = alreadySelected ? [] : [day];
    });

  } else {
    // Les artefacts peuvent être planifiés
    // sur plusieurs jours.
    state.farmDays[key] = alreadySelected
      ? currentDays.filter((value) => value !== day)
      : [...currentDays, day];
  }

  saveWishlist();
  renderPlanner();
}

/* =====================================================
   AFFICHAGE DU PLANIFICATEUR
===================================================== */

function renderPlanner() {
  const planner = el("planner");
  const empty = el("plannerEmpty");

  if (!planner) return;

  const items = state.wishlist
    .map(findItem)
    .filter(Boolean);

  const isEmpty = items.length === 0;

  setHidden(empty, !isEmpty);
  setHidden(planner, isEmpty);

  if (isEmpty) {
    planner.innerHTML = "";
    updateCounts();
    return;
  }

  /* Liste des éléments */

  const choices = `
    <div class="planner-choices">
      <h2>Mes éléments sélectionnés</h2>

      <div class="planner-choice-list">

        ${items.map((item) => {
          const key = getKey(item);
          const name = getName(item);
          const image = getImage(item);

          const selectedDays = state.farmDays[key] || [];
          const availableDays = getAvailability(item);

          const subtitle =
            item.kind === "bossdrop"
              ? `Récompense de ${item.bossName}`
              : item.kind === "material"
                ? (item.family || item.region || "Matériau")
                : "Artéfact";

          return `
            <article class="planner-choice">

              <div class="planner-choice-info">
                ${getImageHTML(image, name)}

                <div>
                  <strong>${escapeHTML(name)}</strong>
                  <small>${escapeHTML(subtitle)}</small>
                </div>
              </div>

              <div class="day-selector">

                ${DAYS.map((day) => {
                  const selected =
                    selectedDays.includes(day.id);

                  const disabled =
                    item.kind === "material" &&
                    availableDays.length > 0 &&
                    !availableDays.includes(day.id);

                  return `
                    <button
                      class="day-toggle ${selected ? "active" : ""}"
                      type="button"
                      data-action="day"
                      data-key="${escapeHTML(key)}"
                      data-day="${day.id}"
                      ${disabled ? "disabled" : ""}
                      title="${day.label}"
                    >
                      ${day.label.slice(0, 3)}
                    </button>
                  `;
                }).join("")}

              </div>

              <button
                class="remove-item"
                type="button"
                data-action="remove"
                data-key="${escapeHTML(key)}"
                aria-label="Retirer ${escapeHTML(name)}"
                title="Retirer cet élément"
              >
                ✕
              </button>

            </article>
          `;
        }).join("")}

      </div>
    </div>
  `;

  /* Planning de la semaine */

  const week = `
    <div class="planner-week">
      <h2>Mon planning de farm</h2>

      <div class="planner-week-grid">

        ${DAYS.map((day) => {
          const dayItems = items.filter((item) => {
            const key = getKey(item);

            return (
              state.farmDays[key] || []
            ).includes(day.id);
          });

          return `
            <section class="day-column">

              <h3>${day.label}</h3>

              <div class="day-items">

                ${
                  dayItems.length
                    ? dayItems.map((item) => `
                        <div class="planner-item">
                          ${getImageHTML(getImage(item), getName(item))}
                          <span>${escapeHTML(getName(item))}</span>
                        </div>
                      `).join("")
                    : `<p class="no-farm">Rien de prévu</p>`
                }

              </div>

            </section>
          `;
        }).join("")}

      </div>
    </div>
  `;

  planner.innerHTML = choices + week;

  updateCounts();
}

/* =====================================================
   COMPTEURS
===================================================== */

function updateCounts() {
  const count = state.wishlist.length;

  if (el("wishlistCount")) {
    el("wishlistCount").textContent = count;
  }

  if (el("wishlistCount2")) {
    el("wishlistCount2").textContent = count;
  }

  const summary = el("plannerSummary");

  if (summary) {
    const planned = state.wishlist.filter((key) => {
      return (state.farmDays[key] || []).length > 0;
    }).length;

    summary.textContent =
      `${count} élément${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""} · ` +
      `${planned} planifié${planned > 1 ? "s" : ""}`;
  }
}

/* =====================================================
   DÉTAILS DES ARTEFACTS ET MATÉRIAUX
===================================================== */

function renderArtifactDetails(item) {
  const pieces = getPieces(item);

  const piecesHTML = pieces.length
    ? `
      <div class="bonus-block">
        <h3>Pièces de l'ensemble</h3>

        <div class="pieces-grid">
          ${pieces.map((piece) => {
            const name =
              piece.data.name ||
              piece.data.Name ||
              piece.label;

            const image =
              piece.data.img ||
              piece.data.image ||
              "";

            return `
              <div class="piece-item">
                ${getImageHTML(image, name)}
                <span>${escapeHTML(name)}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `
    : "";

  const twoPieceBonus =
    item["2pc"] ||
    item.two_piece_bonus ||
    item.twoPieceBonus ||
    item.bonus_2 ||
    "";

  const fourPieceBonus =
    item["4pc"] ||
    item.four_piece_bonus ||
    item.fourPieceBonus ||
    item.bonus_4 ||
    "";

  const bonusHTML = `
    ${twoPieceBonus ? `
      <div class="bonus-block">
        <h3>Bonus 2 pièces</h3>
        <p>${escapeHTML(twoPieceBonus)}</p>
      </div>
    ` : ""}

    ${fourPieceBonus ? `
      <div class="bonus-block">
        <h3>Bonus 4 pièces</h3>
        <p>${escapeHTML(fourPieceBonus)}</p>
      </div>
    ` : ""}
  `;

  return piecesHTML + bonusHTML;
}

function renderMaterialDetails(item) {
  const days = getAvailability(item);

  return `
    <div class="bonus-block">
      <h3>Informations</h3>

      <p>
        Région : ${escapeHTML(item.region || "Non renseignée")}
      </p>

      <p>
        Famille : ${escapeHTML(item.family || "Non renseignée")}
      </p>
    </div>

    <div class="bonus-block">
      <h3>Jours de disponibilité</h3>

      <p>
        ${
          days.length
            ? days.map((day) => {
                const label = DAYS.find(
                  (entry) => entry.id === day
                )?.label || day;

                return escapeHTML(label);
              }).join(", ")
            : "Disponibilité non renseignée"
        }
      </p>
    </div>
  `;
}

/* =====================================================
   DÉTAILS DES BOSS
===================================================== */

function openBossDetails(boss) {
  if (!boss) return;

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const drops = state.bossDrops.filter(
    (drop) => drop.bossId === boss.id
  );

  content.innerHTML = `
    <div class="boss-detail-head">

      <div class="boss-large-image">
        ${getImageHTML(boss.image, boss.name)}
      </div>

      <div>
        <p class="eyebrow">BOSS HEBDOMADAIRE</p>

        <h2>${escapeHTML(boss.name)}</h2>

        <p>${escapeHTML(boss.location || "")}</p>
      </div>

    </div>

    <div class="bonus-block">
      <h3>Récompenses possibles</h3>

      <div class="boss-drop-list">

        ${drops.map((drop) => {
          const added = isInWishlist(drop);
          const key = getKey(drop);

          return `
            <div class="boss-drop-row">

              <div class="boss-drop-copy">
                ${getImageHTML(drop.image, drop.name)}

                <div>
                  <strong>${escapeHTML(drop.name)}</strong>

                  <p class="boss-probability">
                    ${escapeHTML(
                      drop.probability || "Probabilité non renseignée"
                    )}
                  </p>
                </div>
              </div>

              <button
                class="button ${added ? "button-quiet" : ""}"
                type="button"
                data-action="boss-drop-toggle"
                data-key="${escapeHTML(key)}"
              >
                ${added ? "Retirer" : "Ajouter"}
              </button>

            </div>
          `;
        }).join("")}

      </div>
    </div>
  `;

  state.selected = boss;

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

/* =====================================================
   OUVERTURE DES DÉTAILS
===================================================== */

function openDetails(item) {
  if (!item) return;

  state.selected = item;

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const name = getName(item);
  const image = getImage(item);
  const rarity = getRarity(item);
  const added = isInWishlist(item);

  let extra = "";

  if (item.kind === "artifact") {
    extra = renderArtifactDetails(item);
  }

  if (item.kind === "material") {
    extra = renderMaterialDetails(item);
  }

  if (item.kind === "bossdrop") {
    extra = `
      <div class="bonus-block">
        <h3>${escapeHTML(item.bossName)}</h3>

        <p>${escapeHTML(item.bossLocation || "")}</p>

        <p class="boss-probability">
          ${escapeHTML(item.probability || "")}
        </p>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="detail-head">

      <div class="detail-image">
        ${getImageHTML(image, name)}
      </div>

      <div>
        <p class="eyebrow">
          ${
            item.kind === "artifact"
              ? "ARTÉFACT"
              : item.kind === "material"
                ? "MATÉRIAU"
                : "RÉCOMPENSE DE BOSS"
          }
        </p>

        <h2>${escapeHTML(name)}</h2>

        <div class="rarity">
          ${"★".repeat(Math.min(5, Math.max(1, rarity)))}
        </div>

        ${getDomainHTML(item)}
      </div>

    </div>

    ${
      item.description
        ? `
          <div class="bonus-block">
            <h3>Description</h3>
            <p>${escapeHTML(item.description)}</p>
          </div>
        `
        : ""
    }

    ${extra}

    <button
      id="toggleWishlist"
      class="button detail-action"
      type="button"
      data-key="${escapeHTML(getKey(item))}"
    >
      ${added ? "Retirer de ma liste" : "Ajouter à ma liste"}
    </button>
  `;

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDetails() {
  const dialog = el("detailDialog");

  if (!dialog) return;

  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }

  state.selected = null;
}

/* =====================================================
   ÉVÉNEMENTS DU CATALOGUE
===================================================== */

if (el("artifactGrid")) {
  el("artifactGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "boss-details") {
      const boss = state.bosses.find(
        (entry) => String(entry.id) === button.dataset.boss
      );

      openBossDetails(boss);
      return;
    }

    const item = findItem(button.dataset.key);
    if (!item) return;

    if (action === "details") {
      openDetails(item);
    }

    if (action === "toggle") {
      toggleWishlist(item);
    }
  });
}

/* =====================================================
   ÉVÉNEMENTS DU PLANIFICATEUR
===================================================== */

if (el("planner")) {
  el("planner").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const key = button.dataset.key;

    if (button.dataset.action === "remove") {
      removeWishlistItem(key);
    }

    if (button.dataset.action === "day") {
      setPlannerDay(key, button.dataset.day);
    }
  });
}

/* =====================================================
   ÉVÉNEMENTS DE LA FENÊTRE DE DÉTAILS
===================================================== */

if (el("detailDialog")) {
  el("detailDialog").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (button?.dataset.action === "boss-drop-toggle") {
      const item = findItem(button.dataset.key);

      if (item) {
        toggleWishlist(item);
        openBossDetails(state.selected);
      }

      return;
    }

    if (event.target === el("detailDialog")) {
      closeDetails();
      return;
    }

    if (button?.id === "toggleWishlist" && state.selected) {
      const item = findItem(button.dataset.key);

      if (item) {
        toggleWishlist(item);
        openDetails(item);
      }
    }
  });
}

if (el("closeDialog")) {
  el("closeDialog").addEventListener("click", closeDetails);
}

/* =====================================================
   NAVIGATION ET FILTRES
===================================================== */

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

document.querySelectorAll(".category-tab").forEach((button) => {
  button.addEventListener("click", () => {
    setCategory(button.dataset.category);
  });
});

if (el("searchInput")) {
  el("searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCatalog();
  });
}

if (el("rarityFilter")) {
  el("rarityFilter").addEventListener("change", (event) => {
    state.rarity = event.target.value;
    renderCatalog();
  });
}

/* =====================================================
   BOUTONS DU PLANIFICATEUR
===================================================== */

if (el("backToCatalog")) {
  el("backToCatalog").addEventListener("click", () => {
    setView("catalogue");
  });
}

if (el("showWishlist")) {
  el("showWishlist").addEventListener("click", () => {
    setView("planif");
  });
}

if (el("clearWishlist")) {
  el("clearWishlist").addEventListener("click", () => {
    if (!state.wishlist.length) return;

    if (confirm("Veux-tu vraiment supprimer toute ta liste ?")) {
      clearWishlist();
    }
  });
}

/* =====================================================
   INITIALISATION
===================================================== */

function init() {
  loadWishlist();

  setHidden(el("catalogueView"), false);
  setHidden(el("planifView"), true);
  setHidden(el("planner"), true);
  setHidden(el("plannerEmpty"), false);

  updateCounts();
  renderCatalog();

  loadArtifacts();
  loadMaterials();
  loadBosses();
}

init();
