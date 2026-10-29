const API_BASE = "https://genshin-impact.up.railway.app";
const STORAGE_KEY = "genshin-artefacts-wishlist-v1";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const state = { artifacts: [], wishlist: new Set(), view: "catalogue", selected: null };
const el = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const normalize = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function loadWishlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.wishlist = new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch { state.wishlist = new Set(); }
}
function saveWishlist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.wishlist]));
  updateCounts();
}
function updateCounts() {
  el("wishlistCount").textContent = state.wishlist.size;
  el("wishlistCount2").textContent = state.wishlist.size;
  el("plannerSummary").textContent = state.wishlist.size
    ? `${state.wishlist.size} set${state.wishlist.size > 1 ? "s" : ""} dans ta liste.`
    : "Aucun artéfact dans ta liste.";
}
function getName(item) { return item.name || item.Name || item.title || item.key || "Artéfact"; }
function getKey(item) { return String(item.key || item.slug || item.id || getName(item)); }
function getRarity(item) {
  const value = item.rarity ?? item.Rarity ?? item.maxRarity ?? 5;
  if (Array.isArray(value)) return Math.max(...value.map(Number).filter(Number.isFinite), 5);
  if (typeof value === "string" && value.includes(",")) return Math.max(...value.split(",").map(Number).filter(Number.isFinite), 5);
  return Number(value) || 5;
}
function getBonus(item, kind) {
  const bonus = item.bonus || item.Bonus || {};
  return bonus[kind] || bonus[kind.replace("pc", "Pc")] || item[kind] || item[kind.toUpperCase()] || "";
}
function getImage(item) {
  return item.img || item.image || item.icon || item.Icon || item.images?.flower || item.pieces?.flower?.img || "";
}
function getDomain(item) {
  return item.domain || item.Domain || item.source || item.obtain || item.obtainable || "Domaine d’artéfacts";
}
function getPieces(item) {
  const p = item.pieces || item.Pieces || {};
  const map = [
    ["flower", "Fleur"], ["plume", "Plume"], ["sands", "Sablier"],
    ["goblet", "Coupe"], ["circlet", "Couronne"]
  ];
  return map.map(([key, label]) => {
    const piece = p[key] || p[label.toLowerCase()] || {};
    return { label, name: piece.name || piece.Name || "", img: piece.img || piece.image || "", description: piece.description || piece.Description || "" };
  }).filter(piece => piece.name || piece.img || piece.description);
}
function makeFallback(name, index) {
  return { key: `fallback-${index}-${name}`, name, rarity: 5, bonus: {}, img: "", domain: "Domaine d’artéfacts" };
}
async function loadArtifacts() {
  el("status").textContent = "Chargement du catalogue depuis la base communautaire…";
  try {
    const response = await fetch(`${API_BASE}/artifacts?details=true&rarity=5&sort=name`, { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error(`API indisponible (${response.status})`);
    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : (payload.artifacts || payload.data || payload.results || []);
    if (!list.length) throw new Error("La réponse de l’API ne contient aucun artéfact.");
    state.artifacts = list.map((item, i) => ({ ...item, key: getKey(item) || `artifact-${i}`, name: getName(item), rarity: getRarity(item) }));
    el("status").textContent = `${state.artifacts.length} sets récupérés. Sélectionne une carte pour voir les détails.`;
  } catch (error) {
    state.artifacts = [];
    el("status").textContent = "Impossible de charger les données d’artéfacts. Vérifie ta connexion puis recharge la page. " + error.message;
  }
  el("setCount").textContent = state.artifacts.length || "—";
  renderCatalog();
  renderPlanner();
}
function filteredArtifacts() {
  const query = normalize(el("searchInput").value.trim());
  const rarity = el("rarityFilter").value;
  return state.artifacts.filter(item =>
    (!query || normalize(`${item.name} ${getDomain(item)}`).includes(query)) &&
    (rarity === "all" || (rarity === "5" ? getRarity(item) >= 5 : getRarity(item) <= 4))
  );
}
function imageMarkup(src, name, cls = "") {
  if (!src) return `<div class="fallback ${cls}" aria-label="${escapeHtml(name)}">✦</div>`;
  return `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="fallback" hidden>✦</span>`;
}
function renderCatalog() {
  const items = filteredArtifacts();
  el("artifactGrid").innerHTML = items.map(item => {
    const wished = state.wishlist.has(getKey(item));
    return `<button class="artifact-card" data-open="${escapeHtml(getKey(item))}" aria-label="Afficher ${escapeHtml(item.name)}">
      <span class="wish-mark" aria-hidden="true">${wished ? "♥" : "♡"}</span>
      <div class="artifact-art">${imageMarkup(getImage(item), item.name)}</div>
      <div class="card-copy"><h3>${escapeHtml(item.name)}</h3><div class="rarity">${"★".repeat(Math.min(5, getRarity(item)))}</div><p class="card-domain">${escapeHtml(getDomain(item))}</p></div>
    </button>`;
  }).join("");
  el("emptyState").classList.toggle("hidden", items.length > 0);
}
function renderPlanner() {
  const wishedItems = state.artifacts.filter(item => state.wishlist.has(getKey(item)));
  el("plannerEmpty").classList.toggle("hidden", wishedItems.length > 0);
  el("planner").classList.toggle("hidden", wishedItems.length === 0);
  el("planner").innerHTML = DAYS.map(day => `<section class="day-column"><h3>${day}</h3><div class="day-items">${
    wishedItems.map(item => `<article class="planner-item">
      <button class="remove-item" data-remove="${escapeHtml(getKey(item))}" aria-label="Retirer ${escapeHtml(item.name)} de la liste">×</button>
      ${getImage(item) ? `<img src="${escapeHtml(getImage(item))}" alt="" loading="lazy">` : `<div class="fallback">✦</div>`}
      <strong>${escapeHtml(item.name)}</strong>
    </article>`).join("")
  }</div></section>`).join("");
  updateCounts();
}
function openDetails(key) {
  const item = state.artifacts.find(candidate => getKey(candidate) === key);
  if (!item) return;
  state.selected = item;
  const pieces = getPieces(item);
  const wished = state.wishlist.has(key);
  const bonus2 = getBonus(item, "2pc") || "Bonus 2 pièces non disponible dans la source de données.";
  const bonus4 = getBonus(item, "4pc") || "Bonus 4 pièces non disponible dans la source de données.";
  el("detailContent").innerHTML = `
    <div class="detail-head">
      ${getImage(item) ? `<img class="detail-image" src="${escapeHtml(getImage(item))}" alt="">` : `<div class="detail-image fallback">✦</div>`}
      <div><p class="eyebrow">SET D’ARTÉFACTS · ${getRarity(item)}★ MAX.</p><h2 id="detailTitle">${escapeHtml(item.name)}</h2><p class="detail-domain">${escapeHtml(getDomain(item))}</p></div>
    </div>
    <div class="bonus-block"><h3>Bonus 2 pièces</h3><p>${escapeHtml(bonus2)}</p></div>
    <div class="bonus-block"><h3>Bonus 4 pièces</h3><p>${escapeHtml(bonus4)}</p></div>
    ${pieces.length ? `<div class="bonus-block"><h3>Pièces du set</h3><div class="piece-grid">${pieces.map(piece => `<div class="piece">${piece.img ? `<img src="${escapeHtml(piece.img)}" alt="">` : ""}<strong>${escapeHtml(piece.name || piece.label)}</strong><p>${escapeHtml(piece.description)}</p></div>`).join("")}</div></div>` : ""}
    <button class="button detail-action" id="toggleWishlist">${wished ? "♥ Retirer de ma liste de souhaits" : "♡ Ajouter à ma liste de souhaits"}</button>`;
  el("detailDialog").showModal();
  el("toggleWishlist").addEventListener("click", () => {
    if (state.wishlist.has(key)) state.wishlist.delete(key); else state.wishlist.add(key);
    saveWishlist(); renderCatalog(); renderPlanner(); openDetails(key);
  });
}
function setView(view) {
  state.view = view;
  el("catalogueView").classList.toggle("hidden", view !== "catalogue");
  el("planifView").classList.toggle("hidden", view !== "planif");
  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
  });
  if (view === "planif") renderPlanner();
}
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => setView(tab.dataset.view)));
el("searchInput").addEventListener("input", renderCatalog);
el("rarityFilter").addEventListener("change", renderCatalog);
el("showWishlist").addEventListener("click", () => setView("planif"));
el("backToCatalog").addEventListener("click", () => setView("catalogue"));
el("artifactGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-open]");
  if (card) openDetails(card.dataset.open);
});
el("planner").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.wishlist.delete(button.dataset.remove);
  saveWishlist(); renderCatalog(); renderPlanner();
});
el("clearWishlist").addEventListener("click", () => {
  if (!state.wishlist.size) return;
  if (confirm("Supprimer tous les artéfacts de ta liste de souhaits ?")) {
    state.wishlist.clear(); saveWishlist(); renderCatalog(); renderPlanner();
  }
});
el("closeDialog").addEventListener("click", () => el("detailDialog").close());
el("detailDialog").addEventListener("click", event => {
  if (event.target === el("detailDialog")) el("detailDialog").close();
});
loadWishlist();
updateCounts();
loadArtifacts();
