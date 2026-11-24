
"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const DATA_FILES = {
  artifacts: "materiaux.json",
  bosses: "boss_hebdomadaires.json"
};

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
  wishlist: "teyvat_wishlist_v2",
  planner: "teyvat_planner_v2"
};

/* =========================================================
   ÉTAT DE L'APPLICATION
========================================================= */

let currentCategory = "artifacts";
let currentView = "catalogue";

let artifacts = [];
let materials = [];
let bosses = [];

let wishlist = loadStorage(STORAGE_KEYS.wishlist, []);
let planner = loadStorage(STORAGE_KEYS.planner, {});

/* =========================================================
   OUTILS
========================================================= */

function el(id) {
  return document.getElementById(id);
}

function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Impossible de lire le stockage :", error);
    return fallback;
  }
}

function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
    localStorage.setItem(STORAGE_KEYS.planner, JSON.stringify(planner));
  } catch (error) {
    console.warn("Impossible de sauvegarder :", error);
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
  return item.key || item.id || `${item.kind}:${getName(item)}`;
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

function normalizeDays(days) {
  if (!Array.isArray(days)) return [];

  return days.map(day => {
    if (typeof day === "number") return DAYS[day] || "";
    return String(day);
  }).filter(Boolean);
}

function getAvailability(item) {
  if (item.kind === "bossdrop") {
    return DAYS;
  }

  return normalizeDays(
    item.farmingDays || item.days || item.availability || []
  );
}

function getItemByKey(key) {
  return allItems().find(item => getKey(item) === key);
}

function allItems() {
  return [...artifacts, ...materials, ...bossDropItems()];
}

function bossDropItems() {
  const result = [];

  bosses.forEach(boss => {
    (boss.drops || []).forEach(drop => {
      result.push({
        ...drop,
        kind: "bossdrop",
        key: drop.id,
        bossId: boss.id,
        bossName: getName(boss),
        bossImage: boss.image || "",
        bossLocation: boss.location || "",
        bossRegion: boss.region || "",
        bossDescription: boss.description || "",
        image: drop.image || "",
        bossDrops: boss.drops || []
      });
    });
  });

  return result;
}

/* =========================================================
   CHARGEMENT DES DONNÉES
========================================================= */

async function fetchJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Erreur de chargement : ${path}`);
  }

  return response.json();
}

async function loadArtifacts() {
  try {
    const data = await fetchJSON(DATA_FILES.artifacts);

    const list = Array.isArray(data)
      ? data
      : data.items || data.artifacts || data.materials || [];

    artifacts = [];
    materials = [];

    list.forEach(item => {
      const normalized = {
        ...item,
        kind: item.kind || item.type || "artifact"
      };

      if (
        normalized.kind === "material" ||
        normalized.type === "material" ||
        normalized.category === "materials"
      ) {
        normalized.kind = "material";
        materials.push(normalized);
      } else {
        normalized.kind = "artifact";
        artifacts.push(normalized);
      }
    });
  } catch (error) {
    console.error("Chargement des artéfacts et matériaux impossible :", error);
    artifacts = [];
    materials = [];
  }
}

async function loadBosses() {
  try {
    const data = await fetchJSON(DATA_FILES.bosses);

    bosses = Array.isArray(data)
      ? data
      : data.bosses || [];

    bosses = bosses.map((boss, index) => ({
      ...boss,
      id: boss.id || `boss-${index}`,
      drops: Array.isArray(boss.drops) ? boss.drops : []
    }));
  } catch (error) {
    console.error("Chargement des boss impossible :", error);
    bosses = [];
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function setView(view) {
  currentView = view;

  const catalogue = el("catalogueView");
  const planif = el("planifView");

  if (catalogue) catalogue.hidden = view !== "catalogue";
  if (planif) planif.hidden = view !== "planif";

  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
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

  const heading = el("catalogueHeading");
  const description = el("catalogueDescription");
  const rarity = el("rarityFilter");

  const labels = {
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
      description: "Consultez les boss et choisissez les drops à récupérer."
    }
  };

  if (heading) heading.textContent = labels[category].title;
  if (description) description.textContent = labels[category].description;

  if (rarity) {
    rarity.hidden = category === "bosses";
    rarity.value = "all";
  }

  if (el("searchInput")) el("searchInput").value = "";

  renderCatalog();
}

/* =========================================================
   CATALOGUE
========================================================= */

function currentItems() {
  if (currentCategory === "materials") return materials;
  if (currentCategory === "bosses") return bossDropItems();
  return artifacts;
}

function filteredItems() {
  const search = (el("searchInput")?.value || "").toLowerCase().trim();
  const rarity = el("rarityFilter")?.value || "all";

  return currentItems().filter(item => {
    const name = getName(item).toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search) ||
      String(item.description || "").toLowerCase().includes(search) ||
      String(item.bossName || "").toLowerCase().includes(search);

    const itemRarity = String(
      item.rarity || item.stars || item.quality || ""
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

  const count = el("setCount");
  if (count) count.textContent = items.length;

  const empty = el("emptyState");
  if (empty) empty.hidden = items.length > 0;

  grid.innerHTML = items.map(item => {
    const key = getKey(item);
    const selected = wishlist.includes(key);
    const name = getName(item);
    const image = getImage(item);

    const rarity = item.rarity || item.stars || "";
    const domain = item.domain || item.location || item.bossName || "";

    return `
      <article class="artifact-card" data-key="${escapeHTML(key)}">
        <button
          class="wish-mark ${selected ? "selected" : ""}"
          type="button"
          data-action="wish"
          data-key="${escapeHTML(key)}"
          aria-label="${selected ? "Retirer de" : "Ajouter à"} la liste"
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
            ${imageHTML(image, name)}
          </div>

          <div class="card-copy">
            <span class="rarity">${escapeHTML(rarity ? "★".repeat(Number(rarity) || 0) : "")}</span>
            <h3>${escapeHTML(name)}</h3>
            <p class="card-domain">${escapeHTML(domain)}</p>
          </div>
        </button>
      </article>
    `;
  }).join("");

  updateCounts();
}

/* =========================================================
   LISTE DE SOUHAITS
========================================================= */

function toggleWishlist(key) {
  if (wishlist.includes(key)) {
    wishlist = wishlist.filter(item => item !== key);

    delete planner[key];
  } else {
    wishlist.push(key);
  }

  saveStorage();
  renderCatalog();
  renderPlanner();
}

function updateCounts() {
  const count = wishlist.length;

  if (el("wishlistCount")) el("wishlistCount").textContent = count;
  if (el("wishlistCount2")) el("wishlistCount2").textContent = count;

  if (el("plannerSummary")) {
    el("plannerSummary").textContent =
      `${count} élément${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`;
  }
}

function clearWishlist() {
  if (!wishlist.length) return;

  wishlist = [];
  planner = {};

  saveStorage();
  renderCatalog();
  renderPlanner();
}

/* =========================================================
   DÉTAILS DES ÉLÉMENTS
========================================================= */

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

  const name = getName(item);
  const image = getImage(item);
  const selected = wishlist.includes(key);
  const days = getAvailability(item);

  content.innerHTML = `
    <div class="detail-head">
      <div class="detail-image">
        ${imageHTML(image, name)}
      </div>

      <div>
        <p class="eyebrow">${escapeHTML(item.kind === "material" ? "MATÉRIAU" : "ARTÉFACT")}</p>
        <h2>${escapeHTML(name)}</h2>
        <p class="detail-domain">${escapeHTML(item.domain || item.location || "")}</p>
      </div>
    </div>

    <div class="bonus-block">
      <h3>Description</h3>
      <p>${escapeHTML(item.description || item.effect || "Aucune description disponible.")}</p>
    </div>

    <div class="bonus-block">
      <h3>Disponibilité</h3>
      <p>${days.length ? escapeHTML(days.join(", ")) : "Information non renseignée."}</p>
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

/* =========================================================
   DÉTAILS DES BOSS
========================================================= */

function openBossDropDetails(item) {
  const boss = bosses.find(b => b.id === item.bossId);
  if (!boss) return;

  const dialog = el("detailDialog");
  const content = el("detailContent");

  if (!dialog || !content) return;

  const bossName = getName(boss);
  const drops = boss.drops || [];
  const selected = wishlist.includes(getKey(item));

  const dropRows = drops.map(drop => {
    const key = `bossdrop:${drop.id}`;
    const isSelected = wishlist.includes(key);

    return `
      <div class="boss-drop-row">
        <div class="boss-drop-copy">
          ${imageHTML(drop.image, drop.name)}
          <div>
            <strong>${escapeHTML(drop.name)}</strong>
            <p class="boss-probability">
              ${escapeHTML(drop.probability || "Probabilité non renseignée")}
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
  }).join("");

  content.innerHTML = `
    <div class="boss-detail-head">
      <div class="boss-large-image">
        ${imageHTML(boss.image, bossName)}
      </div>

      <div>
        <p class="eyebrow">BOSS HEBDOMADAIRE</p>
        <h2>${escapeHTML(bossName)}</h2>
        <p>${escapeHTML(boss.region || "")}</p>
      </div>
    </div>

    <div class="bonus-block">
      <h3>Localisation</h3>
      <p>${escapeHTML(boss.location || "Localisation non renseignée.")}</p>
    </div>

    <div class="bonus-block">
      <h3>Drops disponibles</h3>
      <div class="boss-drop-list">
        ${dropRows || "<p>Aucun drop renseigné.</p>"}
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

/* =========================================================
   PLANIFICATEUR
========================================================= */

function getBossDay(bossId) {
  const bossKeys = wishlist.filter(key => {
    const item = getItemByKey(key);
    return item?.kind === "bossdrop" && item.bossId === bossId;
  });

  for (const key of bossKeys) {
    if (planner[key]) return planner[key];
  }

  return "";
}

function setPlannerDay(key, day) {
  const item = getItemByKey(key);
  if (!item || !wishlist.includes(key)) return;

  if (item.kind === "bossdrop") {
    const existingDay = getBossDay(item.bossId);

    if (existingDay && existingDay !== day) {
      return;
    }

    const sameBossKeys = wishlist.filter(wishlistKey => {
      const selected = getItemByKey(wishlistKey);
      return selected?.kind === "bossdrop" &&
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

function removePlannerItem(key) {
  delete planner[key];
  saveStorage();
  renderPlanner();
}

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

  if (!selectedItems.length) return;

  const choices = plannerElement.querySelector(".planner-choices");
  const week = plannerElement.querySelector(".planner-week-grid");

  if (!choices || !week) return;

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
                <small>${escapeHTML(item.bossName || item.domain || item.kind)}</small>
              </div>
            </div>

            <div class="day-selector">
              ${DAYS.map(day => {
                const locked = item.kind === "bossdrop" &&
                  assignedDay &&
                  assignedDay !== day;

                return `
                  <button
                    class="day-toggle ${assignedDay === day ? "active" : ""} ${locked ? "boss-day-locked" : ""}"
                    type="button"
                    data-action="assign-day"
                    data-key="${escapeHTML(key)}"
                    data-day="${day}"
                    ${locked ? "disabled" : ""}
                  >
                    ${day.slice(0, 3)}
                  </button>
                `;
              }).join("")}
            </div>

            <button
              class="remove-item"
              type="button"
              data-action="remove"
              data-key="${escapeHTML(key)}"
              aria-label="Retirer"
            >
              ✕
            </button>
          </div>
        `;
      }).join("")}
    </div>
  `;

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
          ${dayItems.length
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

/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function setupEvents() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  document.querySelectorAll(".category-tab").forEach(button => {
    button.addEventListener("click", () => {
      setCategory(button.dataset.category);
    });
  });

  el("searchInput")?.addEventListener("input", renderCatalog);
  el("rarityFilter")?.addEventListener("change", renderCatalog);

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

  el("closeDialog")?.addEventListener("click", () => {
    el("detailDialog")?.close();
  });

  el("detailDialog")?.addEventListener("click", event => {
    if (event.target === el("detailDialog")) {
      el("detailDialog").close();
    }
  });

  el("clearWishlist")?.addEventListener("click", clearWishlist);

  el("showWishlist")?.addEventListener("click", () => {
    setView("planif");
  });

  el("backToCatalog")?.addEventListener("click", () => {
    setView("catalogue");
  });
}

/* =========================================================
   INITIALISATION
========================================================= */

async function init() {
  setupEvents();

  await Promise.all([
    loadArtifacts(),
    loadBosses()
  ]);

  renderCatalog();
  renderPlanner();
  setCategory("artifacts");
}

document.addEventListener("DOMContentLoaded", init);
