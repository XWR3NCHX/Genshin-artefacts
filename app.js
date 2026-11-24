
const API_BASE = "https://genshin-impact.up.railway.app";
const STORAGE_KEY = "genshin-artefacts-wishlist-v1";
const PLAN_STORAGE_KEY = "genshin-artefacts-days-v1";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const EN_DAYS = { Monday:"Lundi", Tuesday:"Mardi", Wednesday:"Mercredi", Thursday:"Jeudi", Friday:"Vendredi", Saturday:"Samedi", Sunday:"Dimanche", monday:"Lundi", tuesday:"Mardi", wednesday:"Mercredi", thursday:"Jeudi", friday:"Vendredi", saturday:"Samedi", sunday:"Dimanche" };

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
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const normalize = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function loadWishlist() {
  try {
    state.wishlist = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(String));
  } catch {
    state.wishlist = new Set();
  }

  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "{}");
    state.farmDays = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    Object.keys(state.farmDays).forEach(k => {
      state.farmDays[k] = Array.isArray(state.farmDays[k])
        ? [...new Set(state.farmDays[k].filter(d => DAYS.includes(d)))]
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

function getName(x) {
  return x.name || x.Name || x.title || x.key || "Élément";
}

function getKey(x) {
  if (x.kind === "material") return `material:${x.key || x.id || getName(x)}`;
  if (x.kind === "bossdrop") return `bossdrop:${x.key || x.id || getName(x)}`;
  return String(x.key || x.slug || x.id || getName(x));
}

function getRarity(x) {
  const v = x.rarity ?? x.Rarity ?? x.maxRarity ?? 5;
  if (Array.isArray(v)) return Math.max(...v.map(Number).filter(Number.isFinite), 1);
  if (typeof v === "string" && v.includes(",")) return Math.max(...v.split(",").map(Number).filter(Number.isFinite), 1);
  return Number(v) || 1;
}

function getImage(x) {
  return x.img || x.image || x.icon || x.Icon || x.iconUrl || x.images?.flower || x.pieces?.flower?.img || "";
}

function getDomain(x) {
  return x.domain || x.Domain || x.source || x.obtain || x.obtainable || "Domaine d’artéfacts";
}

function normalizeDays(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(v => EN_DAYS[v] || EN_DAYS[String(v).toLowerCase()] || v).filter(v => DAYS.includes(v)))];
}

function getAvailability(x) {
  if (x.kind === "material") return x.farmingDays || [];
  return normalizeDays(x.farmingDays || x.farming_days || x.days || x.availability || []);
}

function getPieces(item) {
  const p = item.pieces || item.Pieces || {};
  return [["flower","Fleur"],["plume","Plume"],["sands","Sablier"],["goblet","Coupe"],["circlet","Couronne"]].map(([k,label]) => {
    const piece = p[k] || p[label.toLowerCase()] || {};
    return {
      label,
      name: piece.name || piece.Name || "",
      img: piece.img || piece.image || "",
      description: piece.description || piece.Description || ""
    };
  }).filter(p => p.name || p.img || p.description);
}

/* Localisation des domaines d'artéfacts */
const DOMAIN_INFO = [
  {names:["Midsummer Courtyard"],region:"Mondstadt",area:"Falaises Starsnatch",image:"",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Peak of Vindagnyr"],region:"Mondstadt",area:"Dosdragon",image:"",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Ridge Watch"],region:"Liyue",area:"Porte de Pierre",image:"https://img.gamewith.net/img/b3698d197329c2e55c1aa535b0c4beae.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Valley of Remembrance"],region:"Mondstadt",area:"Vignoble de l'Aube",image:"https://img.gamewith.net/img/5a64fca546783317536a96e0b73592b4.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Clear Pool and Mountain Cavern"],region:"Liyue",area:"Mont Aocang",image:"https://img.gamewith.net/img/b29ea616d9f890c1f028f08f74e4cd23.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Domain of Guyun"],region:"Liyue",area:"Forêt de pierres de Guyun",image:"https://img.gamewith.net/img/3666c676326833c032671321faf8a752.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Hidden Palace of Zhou Formula"],region:"Liyue",area:"Colline Wuwang",image:"https://img.gamewith.net/img/59bf860f7b9a4c5dfa6d819a4ba129be.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["The Lost Valley"],region:"Liyue",area:"Gouffre",image:"https://img.gamewith.net/img/7540f04434c4450b68356f25fc608648.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Momiji-Dyed Court"],region:"Inazuma",area:"Île Yashiori",image:"https://img.gamewith.net/img/27e857661fe27f7bbdf1f88bea05d6b4.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Slumbering Court"],region:"Inazuma",area:"Île Seirai",image:"https://img.gamewith.net/img/d2748b8bce3ac6da0fddf96d04cd4e47.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["City of Gold"],region:"Sumeru",area:"Désert de Sumeru",image:"https://img.gamewith.net/img/c5f8e060022fdc30050ec109b9c2acfd.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Molten Iron Fortress"],region:"Sumeru",area:"Gavireh Lajavard",image:"https://img.gamewith.net/img/f8b13e7c4a871a2bbbb6ab70ce6bb24f.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Spire of Solitary Enlightenment"],region:"Sumeru",area:"Colline Gandha",image:"https://img.gamewith.net/img/2c79ddbb90b6a2ae9fc1d7628f8fde03.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Denouement of Sin"],region:"Fontaine",area:"Région de Beryl",image:"https://img.gamewith.net/img/e10fac31e2bae644fb6fbc6d3de3ed83.jpg",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Faded Theater"],region:"Fontaine",area:"Pétrichor",image:"https://img.gamewith.net/img/7b7d843308aca574e54baea8081be1c9.png",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Waterfall Wen"],region:"Fontaine",area:"Versant Est du Mont Automnéqui",image:"https://img.gamewith.net/img/316ba51c4733ec3cf757e46fac396896.png",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Sanctum of Rainbow Spirits"],region:"Natlan",area:"Eaux d'Ameyalco",image:"https://img.gamewith.net/img/962b95b50cd3ccf215240dd5201336da.png",map:"https://gamewith.net/genshin-impact/article/show/22392"},
  {names:["Moonchild's Treasures"],region:"Nod-Krai",area:"Pic Ashveil",image:"",map:"https://gamewith.net/genshin-impact/article/show/22392"}
];

const SET_DOMAIN = {
 "thundering fury":"Midsummer Courtyard","thundersoother":"Midsummer Courtyard","blizzard strayer":"Peak of Vindagnyr","heart of depth":"Peak of Vindagnyr",
 "tenacity of the millelith":"Ridge Watch","pale flame":"Ridge Watch","viridescent venerer":"Valley of Remembrance","maiden beloved":"Valley of Remembrance",
 "bloodstained chivalry":"Clear Pool and Mountain Cavern","noblesse oblige":"Clear Pool and Mountain Cavern","archaic petra":"Domain of Guyun","retracing bolide":"Domain of Guyun",
 "lavawalker":"Hidden Palace of Zhou Formula","crimson witch of flames":"Hidden Palace of Zhou Formula","vermillion hereafter":"The Lost Valley","echoes of an offering":"The Lost Valley",
 "shimenawa's reminiscence":"Momiji-Dyed Court","emblem of severed fate":"Momiji-Dyed Court","ocean-hued clam":"Slumbering Court","husk of opulent dreams":"Slumbering Court",
 "desert pavilion chronicle":"City of Gold","flower of paradise lost":"City of Gold","vourukasha's glow":"Molten Iron Fortress","nymph's dream":"Molten Iron Fortress",
 "deepwood memories":"Spire of Solitary Enlightenment","gilded dreams":"Spire of Solitary Enlightenment","golden troupe":"Denouement of Sin","marechaussee hunter":"Denouement of Sin",
 "fragment of harmonic whimsy":"Faded Theater","unfinished reverie":"Faded Theater","nighttime whispers in the echoing woods":"Waterfall Wen","song of days past":"Waterfall Wen",
 "obsidian codex":"Sanctum of Rainbow Spirits","scroll of the hero of cinder city":"Sanctum of Rainbow Spirits"
};

function getDomainInfo(item) {
 const raw=normalize(getDomain(item));
 let found=DOMAIN_INFO.find(d=>d.names.some(n=>raw.includes(normalize(n))));
 if(!found){
   const n=normalize(getName(item));
   const domain=Object.entries(SET_DOMAIN).find(([set])=>n.includes(set))?.[1];
   found=DOMAIN_INFO.find(d=>domain&&d.names.includes(domain));
 }
 return found||null;
}

function renderDomainLocation(item) {
 const info=getDomainInfo(item);
 if(!info) return `<section class="domain-location"><h3>Où farmer ce set ?</h3><p>Le domaine et sa région ne sont pas encore renseignés pour cet artéfact.</p><p class="domain-source">Source : ${escapeHtml(getDomain(item))}</p></section>`;
 const image=info.image
   ? `<img class="domain-map-image" src="${escapeHtml(info.image)}" alt="Carte de localisation du domaine ${escapeHtml(info.names[0])}" loading="lazy" onerror="this.remove()">`
   : `<div class="domain-map-placeholder">Image de carte à compléter</div>`;
 return `<section class="domain-location"><h3>Où farmer ce set ?</h3><div class="domain-location-meta"><span><small>DOMAINE</small><strong>${escapeHtml(info.names[0])}</strong></span><span><small>RÉGION</small><strong>${escapeHtml(info.region)}</strong></span><span><small>SECTEUR</small><strong>${escapeHtml(info.area)}</strong></span></div><div class="domain-map-frame">${image}</div><a class="domain-map-link" href="${escapeHtml(info.map)}" target="_blank" rel="noopener noreferrer">Ouvrir la carte de localisation</a></section>`;
}

async function fetchJson(url) {
 const r=await fetch(url,{headers:{Accept:"application/json"}});
 if(!r.ok) throw new Error(`HTTP ${r.status}`);
 return r.json();
}

function unwrapList(payload, keys=[]) {
 if(Array.isArray(payload)) return payload;
 for(const k of keys) if(Array.isArray(payload?.[k])) return payload[k];
 return [];
}

async function loadArtifacts() {
 try {
  const payload=await fetchJson(`${API_BASE}/artifacts?details=true&sort=name`);
  const list=unwrapList(payload,["artifacts","data","results"]);
  if(!list.length) throw new Error("Catalogue vide");
  state.artifacts=list.map((x,i)=>({...x,kind:"artifact",key:String(x.key||x.slug||x.id||x.name||`artifact-${i}`),name:getName(x)}));
  el("artifactStatus").textContent=`${state.artifacts.length} artéfacts chargés.`;
 } catch(e) {
  state.artifacts=[];
  el("artifactStatus").textContent="Impossible de charger les artéfacts depuis l'API. Vérifie ta connexion ou réessaie plus tard.";
 }
 renderCatalog();
 renderPlanner();
}

/* Matériaux d'aptitude */
async function loadMaterials() {
 try {
    const response = await fetch("./materiaux.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Le JSON doit contenir une liste de matériaux.");
    state.materials = data.map(item => ({
      ...item,
      kind: "material",
      key: item.id,
      img: item.image ? `./${item.image}` : "",
      farmingDays: Array.isArray(item.days) ? item.days : []
    }));
    el("materialStatus").textContent = `${state.materials.length} matériaux d'aptitude chargés depuis materiaux.json.`;
  } catch (error) {
    state.materials = [];
    el("materialStatus").textContent = "Impossible de charger materiaux.json. Vérifie que le fichier est dans le même dossier que index.html et app.js.";
    console.error("Erreur de chargement de materiaux.json :", error);
  }
  if (state.category === "materials") renderCatalog();
  renderPlanner();
}

/* Boss hebdomadaires */
async function loadBosses() {
  try {
    const response = await fetch("./boss_hebdomadaires.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Le JSON des boss doit contenir une liste.");

    state.bosses = data;
    state.bossDrops = [];

    data.forEach(boss => {
      (boss.drops || []).forEach(drop => {
        state.bossDrops.push({
          ...drop,
          kind: "bossdrop",
          key: drop.id,
          id: drop.id,
          name: drop.name,
          img: drop.image ? `./${drop.image}` : "",
          bossId: boss.id,
          bossName: boss.name,
          bossImage: boss.image ? `./${boss.image}` : "",
          bossLocation: boss.location || "",
          bossRegion: boss.region || "",
          rarity: drop.rarity || 5
        });
      });
    });

    el("bossStatus").textContent = `${state.bosses.length} boss hebdomadaires chargés.`;
  } catch (error) {
    state.bosses = [];
    state.bossDrops = [];
    if (el("bossStatus")) el("bossStatus").textContent = "Impossible de charger boss_hebdomadaires.json. Vérifie que le fichier est dans le dossier du site.";
    console.error("Erreur de chargement des boss :", error);
  }

  if (state.category === "bosses") renderCatalog();
  renderPlanner();
}

function currentItems() {
  if (state.category === "artifacts") return state.artifacts;
  if (state.category === "materials") return state.materials;
  return state.bossDrops;
}

function filteredItems() {
 const q=normalize(el("searchInput").value.trim());
 const rarity=el("rarityFilter").value;
 return currentItems().filter(x=>
   (!q||normalize(`${x.name} ${getDomain(x)} ${x.region||""} ${x.bossName||""}`).includes(q)) &&
   (rarity==="all"||getRarity(x)===Number(rarity))
 );
}

function imageMarkup(src,name,cls="") {
 return src
  ? `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="fallback" hidden>✦</span>`
  : `<div class="fallback ${cls}" aria-label="${escapeHtml(name)}">✦</div>`;
}

/* Catalogue */
function renderCatalog() {
 const items=filteredItems();
 el("setCount").textContent = currentItems().length || "—";

 const statLabel = document.querySelector(".stat-card small");
 if (statLabel) {
   statLabel.textContent =
     state.category === "artifacts" ? "artéfacts chargés" :
     state.category === "materials" ? "livres chargés" :
     "drops de boss";
 }

 el("artifactGrid").innerHTML=items.map(item=>{
   const key=getKey(item),wished=state.wishlist.has(key),rarity=getRarity(item);
   const availability=getAvailability(item);
   const boss = item.kind === "bossdrop";

   return `<button class="artifact-card" data-open="${escapeHtml(key)}" aria-label="Afficher ${escapeHtml(item.name)}">
     <span class="wish-mark">${wished?"♥":"♡"}</span>
     <div class="artifact-art">${imageMarkup(getImage(item),item.name)}</div>
     <div class="card-copy">
       <h3>${escapeHtml(item.name)}</h3>
       <div class="rarity">${"★".repeat(Math.min(5,rarity))}</div>
       <p class="card-domain">${
         boss
           ? `Drop de ${escapeHtml(item.bossName)}`
           : state.category==="artifacts"
             ? escapeHtml(getDomain(item))
             : availability.length
               ? `Disponible : ${availability.join(" · ")}`
               : "Philosophies d’aptitude"
       }</p>
     </div>
   </button>`;
 }).join("");

 el("emptyState").classList.toggle("hidden",items.length>0);
}

/* Planning */
function getBossDay(bossId) {
  const drops = state.bossDrops.filter(d => d.bossId === bossId && state.wishlist.has(getKey(d)));
  const assigned = new Set();
  drops.forEach(d => (state.farmDays[getKey(d)] || []).forEach(day => assigned.add(day)));
  return assigned.size ? [...assigned][0] : null;
}

function bossDayConflict(item, day) {
  if (item.kind !== "bossdrop") return false;
  const currentBossDay = getBossDay(item.bossId);
  return currentBossDay !== null && currentBossDay !== day;
}

function setBossDay(item, day) {
  const bossDrops = state.bossDrops.filter(d => d.bossId === item.bossId && state.wishlist.has(getKey(d)));
  bossDrops.forEach(drop => {
    state.farmDays[getKey(drop)] = [day];
  });
}

function renderPlanner() {
 const allItems=[...state.artifacts,...state.materials,...state.bossDrops];
 const wished=[...state.wishlist].map(key=>allItems.find(x=>getKey(x)===key)).filter(Boolean);

 el("plannerEmpty").classList.toggle("hidden",wished.length>0);
 el("planner").classList.toggle("hidden",!wished.length);

 if(!wished.length){
   el("planner").innerHTML="";
   updateCounts();
   return;
 }

 const choices=`<section class="planner-choices">
   <h2>Choisis tes jours de farm</h2>
   <p>Les matériaux d'aptitude respectent leurs jours de disponibilité. Les drops d'un même boss hebdomadaire doivent être farmés le même jour.</p>
   <div class="planner-choice-list">
     ${wished.map(item=>{
       const key=getKey(item),selected=state.farmDays[key]||[],avail=getAvailability(item);
       const isBoss=item.kind==="bossdrop";
       const bossDay=isBoss?getBossDay(item.bossId):null;

       return `<article class="planner-choice ${isBoss?"boss-planner-choice":""}">
         <div class="planner-choice-info">
           ${imageMarkup(getImage(item),item.name)}
           <div>
             <strong>${escapeHtml(item.name)}</strong>
             <p class="card-domain">${
               isBoss
                 ? `Boss : ${escapeHtml(item.bossName)}${bossDay?` · Jour choisi : ${bossDay}`:" · Aucun jour choisi"}`
                 : item.kind==="material"
                   ? (avail.length?`Disponible : ${avail.join(", ")}`:"Disponibilité non fournie par la source")
                   : "Artéfact · domaine accessible tous les jours"
             }</p>
           </div>
         </div>
         <div class="day-selector">
           ${DAYS.map(day=>{
             const on=selected.includes(day);
             const allowed=item.kind!=="material" || avail.includes(day);
             const conflict=isBoss&&bossDay&&bossDay!==day;
             const disabled=!allowed||conflict;
             const title=conflict
               ? `Ce boss est déjà prévu le ${bossDay}`
               : allowed
                 ? `Disponible le ${day}`
                 : `Indisponible le ${day} pour ce livre`;

             return `<button type="button" class="day-toggle ${on?"selected":""} ${conflict?"boss-day-locked":""}" data-day-toggle="${escapeHtml(key)}" data-day="${day}" aria-pressed="${on}" ${disabled?"disabled":""} title="${escapeHtml(title)}">${day}</button>`;
           }).join("")}
         </div>
       </article>`;
     }).join("")}
   </div>
 </section>`;

 const week=`<section class="planner-week">
   <h2>Mon planning de farm</h2>
   <div class="planner-week-grid">
     ${DAYS.map(day=>{
       const dayItems=wished.filter(x=>(state.farmDays[getKey(x)]||[]).includes(day));
       return `<section class="day-column">
         <h3>${day}</h3>
         <div class="day-items">
           ${dayItems.length
             ? dayItems.map(item=>`<article class="planner-item">
                 <button class="remove-item" data-remove="${escapeHtml(getKey(item))}" aria-label="Retirer ${escapeHtml(item.name)}">×</button>
                 ${imageMarkup(getImage(item),item.name)}
                 <strong>${escapeHtml(item.name)}</strong>
               </article>`).join("")
             : `<p class="no-farm">Rien de prévu</p>`
           }
         </div>
       </section>`;
     }).join("")}
   </div>
 </section>`;

 el("planner").innerHTML=choices+week;
 updateCounts();
}

/* Détails */
function openDetails(key) {
 const allItems=[...state.artifacts,...state.materials,...state.bossDrops];
 const item=allItems.find(x=>getKey(x)===key);
 if(!item)return;

 if(item.kind==="bossdrop"){
   openBossDropDetails(item);
   return;
 }

 const wished=state.wishlist.has(key), rarity=getRarity(item), material=item.kind==="material", avail=getAvailability(item);
 const bonus2=item.bonus?.["2pc"]||item["2pc"]||"",bonus4=item.bonus?.["4pc"]||item["4pc"]||"";
 let extra="";

 if(material) {
   extra=`<div class="bonus-block"><h3>Disponibilité</h3><p>${avail.length?`Ce livre se récupère le : <strong>${avail.join(", ")}</strong>.`:"Les jours de disponibilité ne sont pas indiqués par la source de données."}</p></div><div class="bonus-block"><h3>Rareté</h3><p>${"★".repeat(Math.min(5,rarity))} · ${rarity}★ (rareté maximale des livres d’aptitude)</p></div>`;
 } else {
   extra=`<div class="bonus-block"><h3>Bonus 2 pièces</h3><p>${escapeHtml(bonus2||"Bonus non disponible dans la source de données.")}</p></div>
   <div class="bonus-block"><h3>Bonus 4 pièces</h3><p>${escapeHtml(bonus4||"Bonus non disponible dans la source de données.")}</p></div>
   ${renderDomainLocation(item)}
   ${getPieces(item).length?`<div class="bonus-block"><h3>Pièces du set</h3><div class="piece-grid">${getPieces(item).map(p=>`<div class="piece">${p.img?`<img src="${escapeHtml(p.img)}" alt="" loading="lazy">`:""}<strong>${escapeHtml(p.name||p.label)}</strong><p>${escapeHtml(p.description)}</p></div>`).join("")}</div></div>`:""}`;
 }

 el("detailContent").innerHTML=`<div class="detail-head">${imageMarkup(getImage(item),item.name,"detail-image")}<div><p class="eyebrow">${material?"MATÉRIAU D'APTITUDE":"SET D’ARTÉFACTS"} · ${rarity}★</p><h2 id="detailTitle">${escapeHtml(item.name)}</h2><p class="detail-domain">${material?"Philosophie d'aptitude · palier maximal":escapeHtml(getDomain(item))}</p></div></div>${extra}<button class="button detail-action" id="toggleWishlist">${wished?"♥ Retirer de ma liste":"♡ Ajouter à ma liste de farm"}</button>`;

 el("detailDialog").showModal();
 el("toggleWishlist").addEventListener("click",()=>{
   if(state.wishlist.has(key)){
     state.wishlist.delete(key);
     delete state.farmDays[key];
   }else{
     state.wishlist.add(key);
     if(material&&avail.length)state.farmDays[key]=[...avail];
   }
   saveWishlist();
   saveFarmDays();
   renderCatalog();
   renderPlanner();
   el("detailDialog").close();
 });
}

/* Fiche drop d'un boss */
function openBossDropDetails(item) {
  const key=getKey(item);
  const wished=state.wishlist.has(key);
  const boss=state.bosses.find(b=>b.id===item.bossId);
  if(!boss)return;

  const bossImage=boss.image?`./${escapeHtml(boss.image)}`:"";
  const dropRows=(boss.drops||[]).map(drop=>{
    const dropKey=`bossdrop:${drop.id}`;
    const inList=state.wishlist.has(dropKey);
    const image=drop.image?`./${escapeHtml(drop.image)}`:"";
    return `<article class="boss-drop-row">
      ${image?`<img src="${image}" alt="${escapeHtml(drop.name)}" loading="lazy">`:`<div class="fallback">✦</div>`}
      <div class="boss-drop-copy">
        <strong>${escapeHtml(drop.name)}</strong>
        <p class="boss-probability">${escapeHtml(drop.probability||"Taux non officiellement communiqué")}</p>
      </div>
      <button class="button ${inList?"button-quiet":""}" data-boss-add="${escapeHtml(drop.id)}">${inList?"♥ Dans la liste":"Ajouter"}</button>
    </article>`;
  }).join("");

  el("detailContent").innerHTML=`<div class="boss-detail-head">
    ${bossImage?`<img class="boss-large-image" src="${bossImage}" alt="${escapeHtml(boss.name)}">`:`<div class="boss-large-image fallback">✦</div>`}
    <div><p class="eyebrow">BOSS HEBDOMADAIRE</p><h2 id="detailTitle">${escapeHtml(boss.name)}</h2>
    <p class="detail-domain">${escapeHtml(boss.region||"")} ${boss.region&&boss.location?"·":""} ${escapeHtml(boss.location||"Localisation non renseignée")}</p></div>
  </div>
  <section class="bonus-block"><h3>Localisation</h3><p>${escapeHtml(boss.location||"Localisation non renseignée")}</p>${boss.map?`<p><a class="domain-map-link" href="${escapeHtml(boss.map)}" target="_blank" rel="noopener noreferrer">Voir la carte</a></p>`:""}</section>
  <section class="bonus-block"><h3>Matériaux obtenus</h3><p>Ajoute individuellement les drops dont tu as besoin.</p><div class="boss-drop-list">${dropRows}</div></section>
  <button class="button detail-action ${wished?"button-quiet":""}" id="toggleBossWishlist">${wished?"♥ Retirer ce matériau":"♡ Ajouter ce matériau à ma liste"}</button>`;

  el("detailDialog").showModal();

  el("toggleBossWishlist").addEventListener("click",()=>{
    if(state.wishlist.has(key)){
      state.wishlist.delete(key);
      delete state.farmDays[key];
    }else{
      state.wishlist.add(key);
    }
    saveWishlist();
    saveFarmDays();
    renderCatalog();
    renderPlanner();
    el("detailDialog").close();
  });

  el("detailContent").onclick = e => {
    const add=e.target.closest("[data-boss-add]");
    if(!add)return;

    const dropId=add.dataset.bossAdd;
    const drop=boss.drops.find(d=>d.id===dropId);
    if(!drop)return;

    const dropKey=`bossdrop:${drop.id}`;

    if(state.wishlist.has(dropKey)){
      state.wishlist.delete(dropKey);
      delete state.farmDays[dropKey];
    }else{
      const existingDay=getBossDay(item.bossId);
      state.wishlist.add(dropKey);
      if(existingDay)state.farmDays[dropKey]=[existingDay];
    }

    saveWishlist();
    saveFarmDays();
    renderCatalog();
    renderPlanner();

    openBossDropDetails(item);
  };
}

/* Navigation */
function setView(view) {
 state.view=view;
 el("catalogueView").classList.toggle("hidden",view!=="catalogue");
 el("planifView").classList.toggle("hidden",view!=="planif");
 document.querySelectorAll(".tab").forEach(t=>{
   const active=t.dataset.view===view;
   t.classList.toggle("active",active);
   if(active)t.setAttribute("aria-current","page");
   else t.removeAttribute("aria-current");
 });
 if(view==="planif")renderPlanner();
}

function setCategory(category) {
 state.category=category;
 document.querySelectorAll(".category-tab").forEach(t=>t.classList.toggle("active",t.dataset.category===category));
 el("rarityFilter").value="all";
 el("searchInput").value="";
 el("catalogueHeading").textContent=
   category==="artifacts"?"Trouve ton prochain set":
   category==="materials"?"Trouve tes livres d'aptitude":
   "Trouve les matériaux de boss";

 el("catalogueDescription").textContent=
   category==="artifacts"
     ?"Recherche un artéfact, consulte ses bonus et ajoute-le à ta liste de farm."
     :category==="materials"
       ?"Retrouve uniquement les Philosophies, le palier maximal des livres d'aptitude."
       :"Retrouve les boss hebdomadaires et ajoute individuellement leurs matériaux de drop.";

 el("rarityFilter").innerHTML=
   category==="artifacts"
     ?'<option value="all">Toutes</option><option value="2">2★</option><option value="3">3★</option><option value="4">4★</option><option value="5">5★</option>'
     :category==="materials"
       ?'<option value="all">Toutes</option><option value="4">4★ · palier maximal</option>'
       :'<option value="all">Toutes</option><option value="5">5★</option>';

 renderCatalog();
}

/* Événements */
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>setView(t.dataset.view)));
document.querySelectorAll(".category-tab").forEach(t=>t.addEventListener("click",()=>setCategory(t.dataset.category)));

el("searchInput").addEventListener("input",renderCatalog);
el("rarityFilter").addEventListener("change",renderCatalog);
el("showWishlist").addEventListener("click",()=>setView("planif"));
el("backToCatalog").addEventListener("click",()=>setView("catalogue"));

el("artifactGrid").addEventListener("click",e=>{
  const card=e.target.closest("[data-open]");
  if(card)openDetails(card.dataset.open);
});

el("planner").addEventListener("click",e=>{
  const day=e.target.closest("[data-day-toggle]");
  if(day){
    if(day.disabled)return;
    const k=day.dataset.dayToggle,d=day.dataset.day;
    const item=[...state.artifacts,...state.materials,...state.bossDrops].find(x=>getKey(x)===k);
    if(!item)return;

    if(item.kind==="bossdrop"){
      const currentDay=getBossDay(item.bossId);
      if(currentDay&&currentDay!==d)return;
      setBossDay(item,d);
    }else{
      state.farmDays[k] ||= [];
      state.farmDays[k]=state.farmDays[k].includes(d)
        ?state.farmDays[k].filter(x=>x!==d)
        :[...state.farmDays[k],d];
    }

    saveFarmDays();
    renderPlanner();
    return;
  }

  const remove=e.target.closest("[data-remove]");
  if(remove){
    state.wishlist.delete(remove.dataset.remove);
    delete state.farmDays[remove.dataset.remove];
    saveWishlist();
    saveFarmDays();
    renderCatalog();
    renderPlanner();
  }
});

el("clearWishlist").addEventListener("click",()=>{
  if(state.wishlist.size&&confirm("Supprimer tous les éléments de ta liste ?")){
    state.wishlist.clear();
    state.farmDays={};
    saveWishlist();
    saveFarmDays();
    renderCatalog();
    renderPlanner();
  }
});

el("closeDialog").addEventListener("click",()=>el("detailDialog").close());
el("detailDialog").addEventListener("click",e=>{
  if(e.target===el("detailDialog"))el("detailDialog").close();
});

/* Démarrage */
loadWishlist();
updateCounts();
loadArtifacts();
loadMaterials();
loadBosses();
