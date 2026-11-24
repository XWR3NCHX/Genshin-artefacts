
"use strict";

/* =====================================================
   CONFIGURATION
===================================================== */

const DATA_FILES = {
  materials: "./materiaux.json",
  bosses: "./boss_hebdomadaires.json"
};

const ARTIFACT_API =
  "https://genshin.jmp.blue/artifacts/all?lang=fr";

const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche"
];

const STORAGE_KEYS = {
  wishlist: "teyvat_wishlist_v3",
  planner: "teyvat_planner_v3"
};

/* =====================================================
   ÉTAT
===================================================== */

let currentCategory = "artifacts";
let currentView = "catalogue";

let artifacts = [];
let materials = [];
let bosses = [];

let wishlist = loadStorage(STORAGE_KEYS.wishlist, []);
let planner = loadStorage(STORAGE_KEYS.planner, {});

/* =====================================================
   OUTILS
===================================================== */

function el(id) {
  return document.getElementById(id);
}

function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Erreur de lecture du stockage :", error);
    return fallback;
  }
}

function saveStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.wishlist,
      JSON.stringify(wishlist)
    );

    localStorage.setItem(
      STORAGE_KEYS.planner,
      JSON.stringify(planner)
    );
  } catch (error) {
    console.warn("Erreur de sauvegarde :", error);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function getName(item) {
  return item.name || item.nom || item.title || "Élément inconnu";
}

function getImage(item) {
  return item.image || item.img || item.icon || "";
}

function getKey(item) {
  if (item.kind === "bossdrop") {
    return `bossdrop:${item.bossId}:${item.id}`;
  }

  return `${item.kind}:${item.id || getName(item)}`;
}

function imageHTML(src, alt, className = "") {
  if (!src) {
    return `<div class="${className} image-fallback">✦</div>`;
  }

  return `
    <img
      class="${className}"
      src="${escapeHTML(src)}"
      alt="${escapeHTML(alt)}"
      loading="lazy"
      onerror="this.style.display='none'"
    >
  `;
}

function getAvailability(item) {
  if (item.kind === "bossdrop") return DAYS;

  const days = item.days || item.farmingDays || [];

  return Array.isArray(days) ? days : [];
}

function getItemByKey(key) {
  return allItems().find(item => getKey(item) === key);
}

function allItems() {
  return [
    ...artifacts,
    ...materials,
    ...bossDropItems()
  ];
}

/* =====================================================
   CHARGEMENT DES DONNÉES
===================================================== */

async function fetchJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Impossible de charger ${path}`);
  }

  return response.json();
}

/* -----------------------------
   ARTÉFACTS
----------------------------- */

async function loadArtifacts() {
  try {
    const data = await fetchJSON(ARTIFACT_API);

    const list = Array.isArray(data)
      ? data
      : data.artifacts || data.items || [];

    artifacts = list.map((item, index) => {
      const slug = item.id || item.key || `artifact-${index}`;

      return {
        ...item,
        id: slug,
        kind: "artifact",
        name: item.name || slug,
        image: item.image || item.img || item.icon || "",
        rarity: item.rarity || item.max_rarity || 5,
        description:
          item.description ||
          item.bonus?.["2pc"] ||
          item["2-piece_bonus"] ||
          ""
      };
    });

    console.log(`${artifacts.length} artéfacts chargés.`);
  } catch (error) {
    console.error("Erreur de chargement des artéfacts :", error);
    artifacts = [];
  }
}

/* -----------------------------
   MATÉRIAUX
----------------------------- */

async function loadMaterials() {
  try {
    const data = await fetchJSON(DATA_FILES.materials);

    const list = Array.isArray(data)
      ? data
      : data.materials || data.items || [];

    materials = list.map((item, index) => ({
      ...item,
      id: item.id || `material-${index}`,
      kind: "material",
      image: item.image
        ? `./${item.image.replace(/^\.?\//, "")}`
        : "",
      name: item.name || item.nom || "Matériau inconnu",
      rarity: item.rarity || 4,
      days: item.days || []
    }));

    console.log(`${materials.length} matériaux chargés.`);
  } catch (error) {
    console.error("Erreur de chargement des matériaux :", error);
    materials = [];
  }
}

/* -----------------------------
   BOSS HEBDOMADAIRES
----------------------------- */

async function loadBosses() {
  try {
    const data = await fetchJSON(DATA_FILES.bosses);

    const list = Array.isArray(data)
      ? data
      : data.bosses || [];

    bosses = list.map((boss, index) => ({
      ...boss,
      id: boss.id || `boss-${index}`,
      name: boss.name || boss.nom || "Boss inconnu",
      image: boss.image
        ? `./${boss.image.replace(/^\.?\//, "")}`
        : "",
      drops: (boss.drops || []).map((drop, dropIndex) => ({
        ...drop,
        id: drop.id || `drop-${index}-${dropIndex}`,
        image: drop.image
          ? `./${drop.image.replace(/^\.?\//, "")}`
          : ""
      }))
    }));

    console.log(`${bosses.length} boss chargés.`);
  } catch (error) {
    console.error("Erreur de chargement des boss :", error);
    bosses = [];
  }
}

function bossDropItems() {
  const result = [];

  bosses.forEach(boss => {
    boss.drops.forEach(drop => {
      result.push({
        ...drop,
        kind: "bossdrop",
        bossId: boss.id,
        bossName: boss.name,
        bossImage: boss.image,
        bossLocation: boss.location || "",
        bossRegion: boss.region || "",
        bossDrops: boss.drops
      });
    });
  });

  return result;
}

/* =====================================================
   NAVIGATION
===================================================== */

function setView(view) {
  currentView = view;

  if (el("catalogueView")) {
    el("catalogueView").hidden = view !== "catalogue";
  }

  if (el("planifView")) {
    el("planifView").hidden = view !== "planif";
  }

  document.querySelectorAll(".tab").forEach(button => {
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
  currentCategory = category;

  document.querySelectorAll(".category-tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === category
    );
  });

  const headings = {
    artifacts: [
      "Artéfacts",
      "Découvrez les ensembles d'artéfacts disponibles."
    ],
    materials: [
      "Matériaux",
      "Retrouvez les matériaux nécessaires à votre progression."
    ],
    bosses: [
      "Boss hebdomadaires",
      "Choisissez les récompenses des boss à récupérer."
    ]
  };

  if (el("catalogueHeading")) {
    el("catalogueHeading").textContent = headings[category][0];
  }

  if (el("catalogueDescription")) {
    el("catalogueDescription").textContent = headings[category][1];
  }

  if (el("rarityFilter")) {
    el("rarityFilter").hidden = category === "bosses";
    el("rarityFilter").value = "all";
  }

  if (el("searchInput")) {
    el("searchInput").value = "";
  }

  renderCatalog();
}

/* =====================================================
   CATALOGUE
===================================================== */

function currentItems() {
  if (currentCategory === "materials") return materials;
  if (currentCategory === "bosses") return bossDropItems();

  return artifacts;
}

function filteredItems() {
  const search = (
    el("searchInput")?.value || ""
  ).toLowerCase().trim();

  const rarity = el("rarityFilter")?.value || "all";

  return currentItems().filter(item => {
    const name = getName(item).toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search) ||
      String(item.description || "").toLowerCase().includes(search) ||
      String(item.bossName || "").toLowerCase().includes(search);

    const itemRarity = String(
      item.rarity || item.stars || ""
    ).replace("★", "").trim();

    const matchesRarity =
      currentCategory !== "artifacts" ||
      rarity === "all" ||
      itemRarity === rarity;

    return matchesSearch && matchesRarity;
  });
}

function renderCatalog() {
  const grid = el("artifactGrid");
  if (!grid) return;

  const items = filteredItems();

  if (el("setCount")) {
    el("setCount").textContent = items.length;
  }

  if (el("emptyState")) {
    el("emptyState").hidden = items.length > 0;
  }

  grid.innerHTML = items.map(item => {
    const key = getKey(item);
    const name = getName(item);
    const selected = wishlist.includes(key);
    const rarity = Number(item.rarity || 0);
    const domain =
      item.domain ||
      item.location ||
      item.bossName ||
      item.region ||
      "";

    return `
      <article class="artifact-card">

        <button
          class="wish-mark ${selected ? "selected" : ""}"
          type="button"
          data-action="wish"
          data-key="${escapeHTML(key)}"
          aria-label="${selected ? "Retirer" : "Ajouter"} à ma liste"
        >
          ${selected ? "♥" : "♡"}
        </button>

        <button
          class="card-open"
          type="button"
          data-action="details"
          data-key="${escapeHTML(key)}"
        >

          <div class="artifact-art">
            ${imageHTML(getImage(item), name)}
          </div>

          <div class="card-copy">
            <span class="rarity">
              ${rarity ? "★".repeat(Math.min(rarity, 5)) : ""}
            </span>

            <h3>${escapeHTML(name)}</h3>

            <p class="card-domain">
              ${escapeHTML(domain)}
            </p>
          </div>

        </button>
      </article>
    `;
  }).join("");

  updateCounts();
}

/* =====================================================
   LISTE DE SOUHAITS
===================================================== */

function toggleWishlist(key) {
  if (wishlist.includes(key)) {
    removeWishlistItem(key);
  } else {
    wishlist.push(key);
    saveStorage();
  }

  renderCatalog();
  renderPlanner();
}

/*
  Supprime UN élément de la liste et son affectation.
  Les autres éléments ne sont pas touchés.
*/

function removeWishlistItem(key) {
  wishlist = wishlist.filter(item => item !== key);

  delete planner[key];

  saveStorage();

  renderCatalog();
  renderPlanner();
}

function clearWishlist() {
  if (!wishlist.length) return;

  wishlist = [];
  planner = {};

  saveStorage();

  renderCatalog();
  renderPlanner();
}

function updateCounts() {
  const count = wishlist.length;

  if (el("wishlistCount")) {
    el("wishlistCount").textContent = count;
  }

  if (el("wishlistCount2")) {
    el("wishlistCount2").textContent = count;
  }

  if (el("plannerSummary")) {
    el("plannerSummary").textContent =
      `${count} élément${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`;
  }
}

/* =====================================================
   DÉTAILS DES ARTÉFACTS ET MATÉRIAUX
===================================================== */

function openDetails(key) {
  const item = getItemByKey(key);
  if (!item) return;

  if (item.kind === "bossdrop") {
    openBossDropDetails(item);
    return;
  }

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const selected = wishlist.includes(key);
  const days = getAvailability(item);

  content.innerHTML = `
    <div class="detail-head">

      <div class="detail-image">
        ${imageHTML(getImage(item), getName(item))}
      </div>

      <div>
        <p class="eyebrow">
          ${item.kind === "material" ? "MATÉRIAU" : "ARTÉFACT"}
        </p>

        <h2>${escapeHTML(getName(item))}</h2>

        <p class="detail-domain">
          ${escapeHTML(item.region || item.domain || "")}
        </p>
      </div>

    </div>

    <div class="bonus-block">
      <h3>Description</h3>
      <p>
        ${escapeHTML(
          item.description ||
          item.bonus?.["2pc"] ||
          item["2-piece_bonus"] ||
          "Aucune description disponible."
        )}
      </p>
    </div>

    ${
      item.bonus?.["4pc"] || item["4-piece_bonus"]
        ? `
          <div class="bonus-block">
            <h3>Bonus 4 pièces</h3>
            <p>${escapeHTML(item.bonus?.["4pc"] || item["4-piece_bonus"])}</p>
          </div>
        `
        : ""
    }

    <div class="bonus-block">
      <h3>Jours de disponibilité</h3>
      <p>
        ${days.length
          ? escapeHTML(days.join(", "))
          : "Information non renseignée."
        }
      </p>
    </div>

    <button
      class="button detail-action"
      id="toggleWishlistDetail"
      type="button"
    >
      ${selected ? "Retirer de ma liste" : "Ajouter à ma liste"}
    </button>
  `;

  el("toggleWishlistDetail").addEventListener("click", () => {
    toggleWishlist(key);
    openDetails(key);
  });

  dialog.showModal();
}

/* =====================================================
   DÉTAILS DES BOSS
===================================================== */

function openBossDropDetails(item) {
  const boss = bosses.find(b => b.id === item.bossId);
  if (!boss) return;

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const selected = wishlist.includes(getKey(item));

  content.innerHTML = `
    <div class="boss-detail-head">

      <div class="boss-large-image">
        ${imageHTML(boss.image, boss.name)}
      </div>

      <div>
        <p class="eyebrow">BOSS HEBDOMADAIRE</p>

        <h2>${escapeHTML(boss.name)}</h2>

        <p>${escapeHTML(boss.region || "")}</p>
      </div>

    </div>

    <div class="bonus-block">
      <h3>Localisation</h3>
      <p>${escapeHTML(boss.location || "Non renseignée.")}</p>
    </div>

    <div class="bonus-block">
      <h3>Récompenses disponibles</h3>

      <div class="boss-drop-list">

        ${boss.drops.map(drop => {
          const key = `bossdrop:${boss.id}:${drop.id}`;
          const isSelected = wishlist.includes(key);

          return `
            <div class="boss-drop-row">

              <div class="boss-drop-copy">
                ${imageHTML(drop.image, drop.name)}

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
                class="button button-quiet"
                type="button"
                data-action="boss-wish"
                data-key="${escapeHTML(key)}"
              >
                ${isSelected ? "Retirer" : "Ajouter"}
              </button>

            </div>
          `;
        }).join("")}

      </div>
    </div>

    <button
      class="button detail-action"
      id="toggleBossWishlist"
      type="button"
    >
      ${selected ? "Retirer ce drop de ma liste" : "Ajouter ce drop à ma liste"}
    </button>
  `;

  content.querySelectorAll('[data-action="boss-wish"]').forEach(button => {
    button.addEventListener("click", () => {
      toggleWishlist(button.dataset.key);
      openBossDropDetails(item);
    });
  });

  el("toggleBossWishlist").addEventListener("click", () => {
    toggleWishlist(getKey(item));
    openBossDropDetails(item);
  });

  dialog.showModal();
}

/* =====================================================
   PLANIFICATEUR
===================================================== */

/*
  Récupère le jour attribué à un boss.
  Tous ses drops sélectionnés partagent le même jour.
*/

function getBossDay(bossId) {
  const bossKeys = wishlist.filter(key => {
    const item = getItemByKey(key);

    return item &&
      item.kind === "bossdrop" &&
      item.bossId === bossId;
  });

  for (const key of bossKeys) {
    if (planner[key]) return planner[key];
  }

  return "";
}

/*
  Déplace un élément vers le jour choisi.
  Pour un boss, tous ses drops sélectionnés changent ensemble.
*/

function setPlannerDay(key, day) {
  const item = getItemByKey(key);

  if (!item || !wishlist.includes(key)) return;

  if (item.kind === "bossdrop") {
    const sameBossKeys = wishlist.filter(wishlistKey => {
      const selected = getItemByKey(wishlistKey);

      return selected &&
        selected.kind === "bossdrop" &&
        selected.bossId === item.bossId;
    });

    sameBossKeys.forEach(bossKey => {
      planner[bossKey] = day;
    });

  } else {
    planner[key] = day;
  }

  saveStorage();
  renderPlanner();
}

/*
  Retire complètement l'élément de la liste.
  La croix n'efface plus seulement le jour.
*/

function removePlannerItem(key) {
  removeWishlistItem(key);
}

/* =====================================================
   AFFICHAGE DU PLANIFICATEUR
===================================================== */

function renderPlanner() {
  const plannerElement = el("planner");
  const empty = el("plannerEmpty");

  if (!plannerElement || !empty) return;

  const selectedItems = wishlist
    .map(key => getItemByKey(key))
    .filter(Boolean);

  empty.hidden = selectedItems.length > 0;
  plannerElement.hidden = selectedItems.length === 0;

  updateCounts();

  if (!selectedItems.length) {
    return;
  }

  const choices = plannerElement.querySelector(".planner-choices");
  const week = plannerElement.querySelector(".planner-week-grid");

  if (!choices || !week) return;

  /* LISTE DES ÉLÉMENTS */

  choices.innerHTML = `
    <div class="planner-choice-list">

      ${selectedItems.map(item => {
        const key = getKey(item);

        const assignedDay = item.kind === "bossdrop"
          ? getBossDay(item.bossId)
          : planner[key] || "";

        return `
          <div class="planner-choice">

            <div class="planner-choice-info">
              ${imageHTML(getImage(item), getName(item))}

              <div>
                <strong>${escapeHTML(getName(item))}</strong>

                <small>
                  ${escapeHTML(
                    item.bossName ||
                    item.region ||
                    item.kind
                  )}
                </small>
              </div>
            </div>

            <div class="day-selector">

              ${DAYS.map(day => `
                <button
                  class="day-toggle ${assignedDay === day ? "active" : ""}"
                  type="button"
                  data-action="assign-day"
                  data-key="${escapeHTML(key)}"
                  data-day="${day}"
                  aria-pressed="${assignedDay === day}"
                >
                  ${day.slice(0, 3)}
                </button>
              `).join("")}

            </div>

            <button
              class="remove-item"
              type="button"
              data-action="remove"
              data-key="${escapeHTML(key)}"
              aria-label="Supprimer ${escapeHTML(getName(item))} de ma liste"
              title="Supprimer de ma liste"
            >
              ✕
            </button>

          </div>
        `;
      }).join("")}

    </div>
  `;

  /* PLANNING DE LA SEMAINE */

  week.innerHTML = DAYS.map(day => {
    const dayItems = selectedItems.filter(item => {
      const key = getKey(item);

      if (item.kind === "bossdrop") {
        return getBossDay(item.bossId) === day;
      }

      return planner[key] === day;
    });

    return `
      <section class="day-column">

        <h3>${day}</h3>

        <div class="day-items">

          ${
            dayItems.length
              ? dayItems.map(item => `
                <div class="planner-item">
                  ${imageHTML(getImage(item), getName(item))}
                  <span>${escapeHTML(getName(item))}</span>
                </div>
              `).join("")
              : '<p class="no-farm">Rien de prévu</p>'
          }

        </div>

      </section>
    `;
  }).join("");
}

/* =====================================================
   ÉVÉNEMENTS
===================================================== */

function setupEvents() {

  /* NAVIGATION */

  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  /* CATÉGORIES */

  document.querySelectorAll(".category-tab").forEach(button => {
    button.addEventListener("click", () => {
      setCategory(button.dataset.category);
    });
  });

  /* RECHERCHE */

  el("searchInput")?.addEventListener("input", renderCatalog);

  el("rarityFilter")?.addEventListener("change", renderCatalog);

  /* CATALOGUE */

  el("artifactGrid")?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const key = button.dataset.key;

    if (button.dataset.action === "wish") {
      toggleWishlist(key);
    }

    if (button.dataset.action === "details") {
      openDetails(key);
    }
  });

  /* PLANIFICATEUR */

  el("planner")?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const key = button.dataset.key;

    if (button.dataset.action === "assign-day") {
      setPlannerDay(key, button.dataset.day);
    }

    if (button.dataset.action === "remove") {
      removePlannerItem(key);
    }
  });

  /* FENÊTRE DE DÉTAILS */

  el("closeDialog")?.addEventListener("click", () => {
    el("detailDialog")?.close();
  });

  el("detailDialog")?.addEventListener("click", event => {
    if (event.target === el("detailDialog")) {
      el("detailDialog").close();
    }
  });

  /* ACTIONS DU PLANIFICATEUR */

  el("clearWishlist")?.addEventListener("click", clearWishlist);

  el("showWishlist")?.addEventListener("click", () => {
    setView("planif");
  });

  el("backToCatalog")?.addEventListener("click", () => {
    setView("catalogue");
  });
}

/* =====================================================
   INITIALISATION
===================================================== */

async function init() {
  setupEvents();

  await Promise.all([
    loadArtifacts(),
    loadMaterials(),
    loadBosses()
  ]);

  renderCatalog();
  renderPlanner();
  setCategory("artifacts");
}

document.addEventListener("DOMContentLoaded", init);
