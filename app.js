
"use strict";

/* =========================================
   CONFIGURATION
========================================= */

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

/* =========================================
   ÉTAT DE L'APPLICATION
========================================= */

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

/* =========================================
   OUTILS
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function setHidden(element, hidden) {
  if (!element) return;

  element.hidden = Boolean(hidden);
  element.classList.toggle("hidden", Boolean(hidden));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getName(item) {
  if (!item) return "Sans nom";

  if (typeof item.name === "string") return item.name;
  if (typeof item.name === "object") {
    return item.name.fr
      || item.name.French
      || item.name.en
      || "Sans nom";
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
  const rarity = Number(
    item?.rarity ??
    item?.max_rarity ??
    item?.maxRarity ??
    item?.stars ??
    5
  );

  return Number.isFinite(rarity) ? rarity : 5;
}

function getKey(item) {
  if (item.kind === "material") {
    return `material:${item.key || item.id}`;
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
    return item.farmingDays || [];
  }

  return (
    item.farmingDays ||
    item.farming_days ||
    item.days ||
    item.availability ||
    []
  );
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

  return DOMAIN_INFO.find(
    (entry) => normalizeText(entry.name) === normalizeText(domain)
  )?.name || domain;
}

function renderDomainLocation(item) {
  const location = getDomainLocation(item);
  return location
    ? `<p class="item-location">${escapeHTML(location)}</p>`
    : "";
}

function getImageHTML(image, name, className = "") {
  if (!image) {
    return `<div class="image-placeholder ${className}">?</div>`;
  }

  return `
    <img
      class="${className}"
      src="${escapeHTML(image)}"
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

/* =========================================
   SAUVEGARDE LOCALE
========================================= */

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

/* =========================================
   CHARGEMENT DES ARTEFACTS
========================================= */

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
    updateCounts();

  } catch (error) {
    console.error("Erreur de chargement des artefacts :", error);

    if (el("artifactStatus")) {
      el("artifactStatus").textContent =
        "Impossible de charger les artefacts.";
    }

    renderCatalog();
  }
}

/* =========================================
   CHARGEMENT DES MATÉRIAUX
========================================= */

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
      image: item.image
        ? `./${String(item.image).replace(/^\.?\//, "")}`
        : "",
      farmingDays: Array.isArray(item.days) ? item.days : []
    }));

    renderCatalog();
    updateCounts();

  } catch (error) {
    console.error("Erreur de chargement des matériaux :", error);

    if (el("materialStatus")) {
      el("materialStatus").textContent =
        "Impossible de charger les matériaux.";
    }

    renderCatalog();
  }
}

/* =========================================
   CHARGEMENT DES BOSS HEBDOMADAIRES
========================================= */

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
        bossImage: boss.image
          ? `./${String(boss.image).replace(/^\.?\//, "")}`
          : "",
        image: drop.image
          ? `./${String(drop.image).replace(/^\.?\//, "")}`
          : "",
        rarity: 5
      }));
    });

    renderCatalog();
    updateCounts();

  } catch (error) {
    console.error("Erreur de chargement des boss :", error);

    if (el("bossStatus")) {
      el("bossStatus").textContent =
        "Impossible de charger les boss.";
    }

    renderCatalog();
  }
}

/* =========================================
   DONNÉES DU CATALOGUE
========================================= */

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
    return state.bossDrops;
  }

  return state.artifacts;
}

function findItem(key) {
  return allItems().find((item) => getKey(item) === key);
}

function isInWishlist(item) {
  const key = getKey(item);
  return state.wishlist.includes(key);
}

/* =========================================
   NAVIGATION
========================================= */

function setView(view) {
  state.view = view;

  const catalogue = el("catalogueView");
  const planner = el("planifView");

  setHidden(catalogue, view !== "catalogue");
  setHidden(planner, view !== "planif");

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
      title: "Artefacts",
      description: "Découvre les sets d'artefacts disponibles."
    },
    materials: {
      title: "Matériaux",
      description: "Retrouve les matériaux nécessaires à ta progression."
    },
    bosses: {
      title: "Boss hebdomadaires",
      description: "Retrouve les récompenses des boss hebdomadaires."
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

/* =========================================
   AFFICHAGE DU CATALOGUE
========================================= */

function renderCatalog() {
  const grid = el("artifactGrid");
  if (!grid) return;

  const search = normalizeText(state.search);

  let items = currentItems().filter((item) => {
    const name = normalizeText(getName(item));

    const bossName = normalizeText(item.bossName || "");
    const location = normalizeText(item.bossLocation || "");

    const matchesSearch =
      !search ||
      name.includes(search) ||
      bossName.includes(search) ||
      location.includes(search);

    const matchesRarity =
      state.rarity === "all" ||
      String(getRarity(item)) === state.rarity;

    return matchesSearch && matchesRarity;
  });

  grid.innerHTML = items.map((item) => {
    const key = getKey(item);
    const name = getName(item);
    const image = getImage(item);
    const rarity = getRarity(item);
    const added = isInWishlist(item);

    let subtitle = "";

    if (item.kind === "material") {
      subtitle = item.family || item.region || "Matériau";
    } else if (item.kind === "bossdrop") {
      subtitle = `Récompense de ${item.bossName}`;
    } else {
      subtitle = getDomainLocation(item);
    }

    return `
      <article class="artifact-card" data-key="${escapeHTML(key)}">
        <button
          class="card-main"
          type="button"
          data-action="details"
          data-key="${escapeHTML(key)}"
        >
          <div class="card-image">
            ${getImageHTML(image, name)}
          </div>

          <div class="card-info">
            <h3>${escapeHTML(name)}</h3>
            <p>${escapeHTML(subtitle)}</p>

            <div class="rarity">
              ${"★".repeat(Math.min(5, Math.max(1, rarity)))}
            </div>
          </div>
        </button>

        <button
          class="wishlist-button ${added ? "active" : ""}"
          type="button"
          data-action="toggle"
          data-key="${escapeHTML(key)}"
          aria-label="${added ? "Retirer de" : "Ajouter à"} la liste"
        >
          ${added ? "✓" : "+"}
        </button>
      </article>
    `;
  }).join("");

  const empty = el("emptyState");
  setHidden(empty, items.length !== 0);

  updateCounts();
}

/* =========================================
   AJOUT / SUPPRESSION DE LA WISHLIST
========================================= */

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
  updateCounts();
  renderCatalog();
  renderPlanner();
}

function removeWishlistItem(key) {
  state.wishlist = state.wishlist.filter(
    (itemKey) => itemKey !== key
  );

  delete state.farmDays[key];

  saveWishlist();
  updateCounts();
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
  updateCounts();
  renderCatalog();
  renderPlanner();
}

/* =========================================
   PLANIFICATION DES JOURS
========================================= */

function setPlannerDay(key, day) {
  const item = findItem(key);
  if (!item) return;

  const currentDays = state.farmDays[key] || [];
  const alreadySelected = currentDays.includes(day);

  /*
   * Les récompenses d'un même boss sont déplacées ensemble.
   */
  if (item.kind === "bossdrop") {
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
    const updatedDays = [...currentDays];

    if (alreadySelected) {
      state.farmDays[key] = updatedDays.filter(
        (selectedDay) => selectedDay !== day
      );
    } else {
      updatedDays.push(day);
      state.farmDays[key] = updatedDays;
    }
  }

  saveWishlist();
  renderPlanner();
}

/* =========================================
   AFFICHAGE DU PLANIFICATEUR
========================================= */

function renderPlanner() {
  const planner = el("planner");
  const empty = el("plannerEmpty");

  if (!planner) return;

  const items = state.wishlist
    .map((key) => findItem(key))
    .filter(Boolean);

  const isEmpty = items.length === 0;

  setHidden(empty, !isEmpty);
  setHidden(planner, isEmpty);

  if (isEmpty) {
    planner.innerHTML = "";
    updateCounts();
    return;
  }

  const choices = `
    <div class="planner-choices">
      <h2>Mes éléments</h2>

      ${items.map((item) => {
        const key = getKey(item);
        const name = getName(item);
        const image = getImage(item);
        const selectedDays = state.farmDays[key] || [];
        const availableDays = getAvailability(item);

        const subtitle = item.kind === "bossdrop"
          ? `Récompense de ${item.bossName}`
          : item.kind === "material"
            ? (item.family || "Matériau")
            : "Artefact";

        return `
          <article class="planner-choice">
            <div class="planner-choice-info">
              ${getImageHTML(image, name)}

              <div>
                <h3>${escapeHTML(name)}</h3>
                <p>${escapeHTML(subtitle)}</p>
              </div>
            </div>

            <div class="day-selector">
              ${DAYS.map((day) => {
                const selected = selectedDays.includes(day.id);

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
  `;

  const week = `
    <div class="planner-week">
      <h2>Mon planning de farm</h2>

      <div class="planner-week-grid">
        ${DAYS.map((day) => {
          const dayItems = items.filter((item) => {
            const key = getKey(item);
            return (state.farmDays[key] || []).includes(day.id);
          });

          return `
            <section class="planner-day">
              <h3>${day.label}</h3>

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
            </section>
          `;
        }).join("")}
      </div>
    </div>
  `;

  planner.innerHTML = choices + week;

  updateCounts();
  updatePlannerSummary();
}

function updatePlannerSummary() {
  const summary = el("plannerSummary");
  if (!summary) return;

  const total = state.wishlist.length;

  const planned = state.wishlist.filter((key) => {
    return (state.farmDays[key] || []).length > 0;
  }).length;

  summary.textContent =
    `${total} élément${total > 1 ? "s" : ""} dans ta liste · ` +
    `${planned} planifié${planned > 1 ? "s" : ""}`;
}

/* =========================================
   COMPTEURS
========================================= */

function updateCounts() {
  const count = state.wishlist.length;

  if (el("wishlistCount")) {
    el("wishlistCount").textContent = count;
  }

  if (el("wishlistCount2")) {
    el("wishlistCount2").textContent = count;
  }

  updatePlannerSummary();
}

/* =========================================
   FENÊTRE DE DÉTAILS
========================================= */

function openDetails(item) {
  if (!item) return;

  state.selected = item;

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const key = getKey(item);
  const name = getName(item);
  const image = getImage(item);
  const rarity = getRarity(item);
  const added = isInWishlist(item);

  let extra = "";

  if (item.kind === "artifact") {
    const pieces = getPieces(item);

    if (pieces.length) {
      extra = `
        <div class="detail-pieces">
          <h3>Pièces du set</h3>

          <div class="pieces-grid">
            ${pieces.map((piece) => {
              const pieceName =
                piece.data.name ||
                piece.data.Name ||
                piece.label;

              const pieceImage =
                piece.data.img ||
                piece.data.image ||
                "";

              return `
                <div class="piece-item">
                  ${getImageHTML(pieceImage, pieceName)}
                  <span>${escapeHTML(pieceName)}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
  }

  if (item.kind === "material") {
    const days = getAvailability(item);

    extra = `
      <div class="detail-availability">
        <h3>Jours de disponibilité</h3>
        <p>${days.length
          ? days.map((day) => escapeHTML(day)).join(", ")
          : "Disponibilité non renseignée"
        }</p>
      </div>
    `;
  }

  if (item.kind === "bossdrop") {
    extra = `
      <div class="detail-boss">
        <h3>${escapeHTML(item.bossName)}</h3>
        <p>${escapeHTML(item.bossLocation || "")}</p>
        <p>${escapeHTML(item.probability || "")}</p>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="detail-main">
      <div class="detail-image">
        ${getImageHTML(image, name)}
      </div>

      <div class="detail-info">
        <p class="eyebrow">
          ${item.kind === "artifact"
            ? "ARTEFACT"
            : item.kind === "material"
              ? "MATÉRIAU"
              : "BOSS HEBDOMADAIRE"}
        </p>

        <h2>${escapeHTML(name)}</h2>

        <div class="rarity">
          ${"★".repeat(Math.min(5, Math.max(1, rarity)))}
        </div>

        ${renderDomainLocation(item)}

        ${item.description
          ? `<p>${escapeHTML(item.description)}</p>`
          : ""}
      </div>
    </div>

    ${extra}

    <button
      id="toggleWishlist"
      class="primary-button"
      type="button"
      data-key="${escapeHTML(key)}"
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

/* =========================================
   ÉVÉNEMENTS
========================================= */

// Navigation principale
document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

// Catégories
document.querySelectorAll(".category-tab").forEach((button) => {
  button.addEventListener("click", () => {
    setCategory(button.dataset.category);
  });
});

// Recherche
if (el("searchInput")) {
  el("searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCatalog();
  });
}

// Filtre de rareté
if (el("rarityFilter")) {
  el("rarityFilter").addEventListener("change", (event) => {
    state.rarity = event.target.value;
    renderCatalog();
  });
}

// Clics dans le catalogue
if (el("artifactGrid")) {
  el("artifactGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const item = findItem(button.dataset.key);
    if (!item) return;

    if (button.dataset.action === "details") {
      openDetails(item);
    }

    if (button.dataset.action === "toggle") {
      toggleWishlist(item);
    }
  });
}

// Clics dans le planificateur
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

// Bouton retour au catalogue
if (el("backToCatalog")) {
  el("backToCatalog").addEventListener("click", () => {
    setView("catalogue");
  });
}

// Afficher la liste
if (el("showWishlist")) {
  el("showWishlist").addEventListener("click", () => {
    setView("planif");
  });
}

// Tout supprimer
if (el("clearWishlist")) {
  el("clearWishlist").addEventListener("click", () => {
    if (!state.wishlist.length) return;

    if (confirm("Veux-tu vraiment supprimer toute ta liste ?")) {
      clearWishlist();
    }
  });
}

// Fermer les détails
if (el("closeDialog")) {
  el("closeDialog").addEventListener("click", closeDetails);
}

// Fermer en cliquant à l'extérieur de la fenêtre
if (el("detailDialog")) {
  el("detailDialog").addEventListener("click", (event) => {
    if (event.target === el("detailDialog")) {
      closeDetails();
    }
  });

  el("detailDialog").addEventListener("click", (event) => {
    const button = event.target.closest("#toggleWishlist");
    if (!button || !state.selected) return;

    toggleWishlist(state.selected);

    const updatedItem = findItem(getKey(state.selected));
    if (updatedItem) {
      openDetails(updatedItem);
    } else {
      closeDetails();
    }
  });
}

/* =========================================
   INITIALISATION
========================================= */

function init() {
  loadWishlist();

  // Affiche immédiatement les bonnes vues.
  setHidden(el("catalogueView"), false);
  setHidden(el("planifView"), true);
  setHidden(el("planner"), true);
  setHidden(el("plannerEmpty"), false);

  updateCounts();
  renderCatalog();

  // Chargement des trois sources de données.
  loadArtifacts();
  loadMaterials();
  loadBosses();
}

init();
