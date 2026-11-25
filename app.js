const API_BASE = "https://genshin-impact.up.railway.app";

const STORAGE_KEY = "genshin-artefacts-wishlist-v1";
const PLAN_STORAGE_KEY = "genshin-artefacts-days-v1";

const DAYS = [
  "Lundi", "Mardi", "Mercredi", "Jeudi",
  "Vendredi", "Samedi", "Dimanche"
];

const state = {
  artifacts: [],
  materials: [],
  bosses: [],
  wishlist: new Set(),
  farmDays: {},
  view: "catalogue",
  category: "artifacts",
  selected: null,
  search: "",
  rarity: "all",
  onlyWishlist: false
};

const $ = id => document.getElementById(id);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else node.setAttribute(key, value);
  }

  for (const child of children) {
    if (child instanceof Node) node.appendChild(child);
    else node.appendChild(document.createTextNode(String(child)));
  }

  return node;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function loadWishlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.wishlist = new Set(
      Array.isArray(saved) ? saved : []
    );
  } catch {
    state.wishlist = new Set();
  }

  try {
    const saved = JSON.parse(
      localStorage.getItem(PLAN_STORAGE_KEY) || "{}"
    );

    state.farmDays = {};

    for (const [key, days] of Object.entries(saved)) {
      if (Array.isArray(days)) {
        state.farmDays[key] = days.filter(day => DAYS.includes(day));
      }
    }
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
  $("wishlistCount").textContent = state.wishlist.size;
  $("wishlistCount2")?.textContent = state.wishlist.size;
}

function getKey(item) {
  return item.key || item.id;
}

function getImage(item) {
  return item.image || item.icon || "";
}

function getRarity(item) {
  return Number(item.rarity || item.stars || 0);
}

function getAvailability(item) {
  return item.farmingDays || item.days || [];
}

function getDomain(item) {
  return item.domain || item.location || "";
}

function getName(item) {
  return item.name || item.title || "Sans nom";
}

function imageMarkup(item, extraClass = "") {
  const src = getImage(item);

  if (!src) {
    return `<div class="item-image placeholder ${extraClass}">✦</div>`;
  }

  return `
    <div class="item-image ${extraClass}">
      <img
        src="${escapeHtml(src)}"
        alt="${escapeHtml(getName(item))}"
        loading="lazy"
        onerror="this.parentElement.classList.add('image-error');this.remove()"
      >
    </div>
  `;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }

  return response.json();
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.artifacts)) return data.artifacts;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/* ==============================
   CHARGEMENT
============================== */

async function loadArtifacts() {
  try {
    const data = await fetchJson(
      `${API_BASE}/artifacts?details=true&sort=name`
    );

    state.artifacts = unwrapList(data).map(item => ({
      ...item,
      kind: "artifact",
      key: `artifact:${item.id || item.name}`
    }));

    $("artifactStatus").textContent =
      `${state.artifacts.length} artéfacts chargés`;
  } catch (error) {
    console.error(error);
    $("artifactStatus").textContent =
      "Impossible de charger les artéfacts.";
  }

  renderCatalog();
  renderPlanner();
}

async function loadMaterials() {
  try {
    const data = await fetchJson("./materiaux.json");

    state.materials = unwrapList(data).map(item => ({
      ...item,
      kind: "material",
      key: `material:${item.id}`,
      farmingDays: item.days || []
    }));

    $("materialStatus").textContent =
      `${state.materials.length} livres chargés`;
  } catch (error) {
    console.error(error);
    $("materialStatus").textContent =
      "Impossible de charger les livres.";
  }

  renderCatalog();
  renderPlanner();
}

async function loadBosses() {
  try {
    const data = await fetchJson("./boss_hebdomadaires.json");

    state.bosses = unwrapList(data).map(boss => ({
      ...boss,
      kind: "boss",
      drops: (boss.drops || []).map(drop => ({
        ...drop,
        kind: "bossDrop",
        key: `bossdrop:${drop.id}`,
        bossId: boss.id,
        bossName: boss.name,
        bossImage: boss.image,
        bossLocation: boss.location
      }))
    }));

    $("bossStatus").textContent =
      `${state.bosses.length} boss chargés`;
  } catch (error) {
    console.error(error);
    $("bossStatus").textContent =
      "Impossible de charger les boss.";
  }

  renderCatalog();
  renderPlanner();
}

/* ==============================
   CATALOGUE
============================== */

function currentItems() {
  if (state.category === "artifacts") return state.artifacts;
  if (state.category === "materials") return state.materials;

  return state.bosses.flatMap(boss => boss.drops);
}

function filteredItems() {
  let items = currentItems();

  if (state.search) {
    const query = normalize(state.search);

    items = items.filter(item => {
      const extra = [
        item.bossName,
        item.bossLocation,
        item.location,
        item.domain,
        item.set,
        item.description
      ].filter(Boolean).join(" ");

      return normalize(getName(item) + " " + extra).includes(query);
    });
  }

  if (state.rarity !== "all") {
    items = items.filter(
      item => getRarity(item) === Number(state.rarity)
    );
  }

  if (state.onlyWishlist) {
    items = items.filter(item => state.wishlist.has(getKey(item)));
  }

  return items;
}

function renderCatalog() {
  const grid = $("artifactGrid");
  const items = filteredItems();

  grid.innerHTML = "";

  for (const item of items) {
    const key = getKey(item);
    const selected = state.wishlist.has(key);
    const days = state.farmDays[key] || [];

    const card = el("article", {
      class: `item-card ${selected ? "in-wishlist" : ""}`
    });

    card.innerHTML = `
      ${imageMarkup(item)}
      <div class="item-card-content">
        <h3>${escapeHtml(getName(item))}</h3>
        ${
          item.kind === "bossDrop"
            ? `<p class="item-subtitle">${escapeHtml(item.bossName)}</p>`
            : ""
        }
        ${
          item.kind === "material"
            ? `<p class="item-subtitle">${escapeHtml(item.region || "")}</p>`
            : ""
        }
        ${
          getRarity(item)
            ? `<div class="rarity">${"★".repeat(getRarity(item))}</div>`
            : ""
        }
        ${
          days.length
            ? `<p class="item-subtitle"> ${escapeHtml(days.join(", "))}</p>`
            : ""
        }
        <div class="card-actions">
          <button class="secondary-btn" data-details="${escapeHtml(key)}">
            Détails
          </button>
          <button
            class="${selected ? "selected-btn" : "primary-btn"}"
            data-add="${escapeHtml(key)}"
          >
            ${selected ? "Ajouté ✓" : "Ajouter"}
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  }

  $("emptyState").classList.toggle("hidden", items.length > 0);
}

/* ==============================
   RECHERCHE ET FILTRES
============================== */

$("searchInput").addEventListener("input", e => {
  state.search = e.target.value;
  renderCatalog();
});

$("rarityFilter").addEventListener("change", e => {
  state.rarity = e.target.value;
  renderCatalog();
});

$("showWishlist").addEventListener("change", e => {
  state.onlyWishlist = e.target.checked;
  renderCatalog();
});

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;

    document.querySelectorAll("[data-category]").forEach(btn => {
      btn.classList.toggle("active", btn === button);
    });

    renderCatalog();
  });
});

/* ==============================
   AJOUT ET RETRAIT
============================== */

function findItem(key) {
  return [
    ...state.artifacts,
    ...state.materials,
    ...state.bosses.flatMap(b => b.drops)
  ].find(item => getKey(item) === key);
}

function addItem(key) {
  const item = findItem(key);
  if (!item) return;

  if (state.wishlist.has(key)) {
    removeItem(key);
    return;
  }

  state.wishlist.add(key);

  if (item.kind === "material") {
    state.farmDays[key] = getAvailability(item);
  } else {
    state.farmDays[key] ||= [];
  }

  saveWishlist();
  saveFarmDays();
  renderCatalog();
  renderPlanner();
}

function removeItem(key) {
  state.wishlist.delete(key);
  delete state.farmDays[key];

  saveWishlist();
  saveFarmDays();
  renderCatalog();
  renderPlanner();
}

/* ==============================
   DÉTAILS
============================== */

function openDetails(key) {
  const item = findItem(key);
  if (!item) return;

  const dialog = $("detailDialog");
  const content = $("detailContent");

  content.innerHTML = `
    <div class="detail-layout">
      ${imageMarkup(item, "detail-image")}
      <div class="detail-info">
        <h2>${escapeHtml(getName(item))}</h2>

        ${
          item.kind === "bossDrop"
            ? `<p><strong>Boss :</strong> ${escapeHtml(item.bossName)}</p>
               <p><strong>Lieu :</strong> ${escapeHtml(item.bossLocation)}</p>
               <p>${escapeHtml(item.probability || "")}</p>`
            : ""
        }

        ${
          item.kind === "material"
            ? `<p><strong>Région :</strong> ${escapeHtml(item.region || "")}</p>
               <p><strong>Jours :</strong> ${escapeHtml(getAvailability(item).join(", "))}</p>`
            : ""
        }

        ${
          item.kind === "artifact"
            ? `<p>${escapeHtml(item.description || "")}</p>
               <p><strong>Bonus 2 pièces :</strong>
                 ${escapeHtml(item["2-piece_bonus"] || item.twoPieceBonus || "")}
               </p>
               <p><strong>Bonus 4 pièces :</strong>
                 ${escapeHtml(item["4-piece_bonus"] || item.fourPieceBonus || "")}
               </p>`
            : ""
        }

        <button class="primary-btn" data-add="${escapeHtml(key)}">
          ${state.wishlist.has(key) ? "Retirer de ma liste" : "Ajouter à ma liste"}
        </button>
      </div>
    </div>
  `;

  dialog.showModal();
}

$("artifactGrid").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  const details = e.target.closest("[data-details]");

  if (add) {
    addItem(add.dataset.add);
  }

  if (details) {
    openDetails(details.dataset.details);
  }
});

$("detailContent").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");

  if (add) {
    addItem(add.dataset.add);
    $("detailDialog").close();
  }
});

$("closeDialog").addEventListener("click", () => {
  $("detailDialog").close();
});

/* ==============================
   VUES
============================== */

function setView(view) {
  state.view = view;

  $("catalogueView").classList.toggle(
    "active", view === "catalogue"
  );

  $("planifView").classList.toggle(
    "active", view === "planif"
  );

  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle(
      "active", button.dataset.view === view
    );
  });

  renderPlanner();
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

$("backToCatalog").addEventListener("click", () => {
  setView("catalogue");
});

/* ==============================
   PLANNING
============================== */

function itemDays(key) {
  return state.farmDays[key] || [];
}

function isBossDrop(item) {
  return item?.kind === "bossDrop";
}

function bossDropKeys(bossId) {
  const boss = state.bosses.find(b => b.id === bossId);
  return boss ? boss.drops.map(drop => drop.key) : [];
}

function selectedBossDay(bossId) {
  const keys = bossDropKeys(bossId);

  for (const key of keys) {
    const days = state.farmDays[key] || [];

    if (days.length) return days[0];
  }

  return null;
}

function bossDayIsLocked(bossId, day) {
  const selected = selectedBossDay(bossId);
  return selected && selected !== day;
}

function toggleBossDay(bossId, day) {
  const keys = bossDropKeys(bossId);
  const selected = selectedBossDay(bossId);

  if (selected === day) {
    keys.forEach(key => {
      state.farmDays[key] = [];
    });
  } else {
    keys.forEach(key => {
      state.farmDays[key] = state.wishlist.has(key)
        ? [day]
        : [];
    });
  }

  saveFarmDays();
  renderCatalog();
  renderPlanner();
}

function plannerItem(key) {
  const item = findItem(key);
  if (!item) return null;

  return item;
}

function renderPlanner() {
  const planner = $("planner");
  planner.innerHTML = "";

  const selected = [...state.wishlist]
    .map(plannerItem)
    .filter(Boolean);

  $("plannerSummary").textContent =
    `${selected.length} élément${selected.length > 1 ? "s" : ""}`;

  $("plannerEmpty").classList.toggle(
    "hidden", selected.length > 0
  );

  if (!selected.length) return;

  /* Choix des jours pour chaque élément */
  const choices = el("section", { class: "planner-choices" });

  choices.innerHTML = `
    <h3>Mes éléments</h3>
    <p class="planner-hint">
      Choisis les jours où tu souhaites farmer chaque élément.
      Les récompenses d'un même boss partagent un seul jour.
    </p>
  `;

  const list = el("div", { class: "planner-choice-list" });

  for (const item of selected) {
    const key = getKey(item);
    const days = itemDays(key);

    const row = el("div", { class: "planner-choice" });

    row.innerHTML = `
      ${imageMarkup(item, "choice-image")}
      <div class="planner-choice-info">
        <strong>${escapeHtml(getName(item))}</strong>
        ${
          item.kind === "bossDrop"
            ? `<small>${escapeHtml(item.bossName)}</small>`
            : ""
        }
        <div class="day-selector">
          ${DAYS.map(day => {
            const available = item.kind === "material"
              ? getAvailability(item).includes(day)
              : true;

            const selectedDay = days.includes(day);

            const locked = isBossDrop(item) &&
              bossDayIsLocked(item.bossId, day);

            const disabled = !available || locked;

            return `
              <button
                class="day-toggle ${selectedDay ? "selected" : ""} ${locked ? "boss-day-locked" : ""}"
                data-day-toggle="${escapeHtml(key)}"
                data-day="${day}"
                ${disabled ? "disabled" : ""}
                title="${locked ? "Ce boss est déjà assigné à un autre jour" : ""}"
              >
                ${day.slice(0, 3)}
              </button>
            `;
          }).join("")}
        </div>
      </div>
      <button class="remove-btn" data-remove="${escapeHtml(key)}"
        title="Retirer">
        ×
      </button>
    `;

    list.appendChild(row);
  }

  choices.appendChild(list);
  planner.appendChild(choices);

  /* Vue semaine */
  const week = el("section", { class: "planner-week" });

  week.innerHTML = `
    <h3>Ma semaine</h3>
    <div class="planner-week-grid">
      ${DAYS.map(day => `
        <section class="day-column" data-week-day="${day}">
          <h4>${day}</h4>
          <div class="day-items"></div>
        </section>
      `).join("")}
    </div>
  `;

  for (const day of DAYS) {
    const column = week.querySelector(`[data-week-day="${day}"] .day-items`);

    const itemsForDay = selected.filter(item =>
      itemDays(getKey(item)).includes(day)
    );

    if (!itemsForDay.length) {
      column.innerHTML = `<p class="no-farm">Repos</p>`;
      continue;
    }

    /* Regroupement des récompenses d'un même boss */
    const groups = new Map();

    for (const item of itemsForDay) {
      const groupKey = isBossDrop(item)
        ? `boss:${item.bossId}`
        : getKey(item);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey).push(item);
    }

    for (const [groupKey, groupItems] of groups) {
      const box = el("div", {
        class: groupKey.startsWith("boss:")
          ? "planner-item boss-group"
          : "planner-item"
      });

      if (groupKey.startsWith("boss:")) {
        box.innerHTML = `
          <div class="boss-group-title">
            ${imageMarkup(groupItems[0], "boss-group-image")}
            <strong>${escapeHtml(groupItems[0].bossName)}</strong>
          </div>
        `;
      }

      for (const item of groupItems) {
        const entry = el("div", { class: "week-entry" });

        entry.innerHTML = `
          ${imageMarkup(item, "week-image")}
          <span>${escapeHtml(getName(item))}</span>
          <button data-remove="${escapeHtml(getKey(item))}" title="Retirer">
            ×
          </button>
        `;

        box.appendChild(entry);
      }

      column.appendChild(box);
    }
  }

  planner.appendChild(week);
}

/* ==============================
   CLICS DU PLANNING
============================== */

$("planner").addEventListener("click", e => {
  const dayButton = e.target.closest("[data-day-toggle]");
  const remove = e.target.closest("[data-remove]");

  if (dayButton) {
    if (dayButton.disabled) return;

    const key = dayButton.dataset.dayToggle;
    const day = dayButton.dataset.day;
    const item = findItem(key);

    if (isBossDrop(item)) {
      toggleBossDay(item.bossId, day);
      return;
    }

    state.farmDays[key] ||= [];

    state.farmDays[key] = state.farmDays[key].includes(day)
      ? state.farmDays[key].filter(d => d !== day)
      : [...state.farmDays[key], day];

    saveFarmDays();
    renderPlanner();
    renderCatalog();
    return;
  }

  if (remove) {
    removeItem(remove.dataset.remove);
  }
});

/* ==============================
   SUPPRESSION GLOBALE
============================== */

$("clearWishlist").addEventListener("click", () => {
  if (!state.wishlist.size) return;

  if (!confirm("Supprimer tous les éléments de ta liste ?")) {
    return;
  }

  state.wishlist.clear();
  state.farmDays = {};

  saveWishlist();
  saveFarmDays();
  renderCatalog();
  renderPlanner();
});

/* ==============================
   INITIALISATION
============================== */

loadWishlist();
updateCounts();

loadArtifacts();
loadMaterials();
loadBosses();
