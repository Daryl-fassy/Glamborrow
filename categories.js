import { products } from "./products-data.js";

/* ============================================================
   Shop-by-Category grid
   - Categories come straight from each product's Producttype,
     so this never goes out of sync with your real catalogue.
   - Each tile's photo is a random product from that category,
     re-picked once an hour (persisted in localStorage so it
     doesn't change on every reload within the same hour).
   - Clicking a tile sends the shopper to index.html?type=...
     which glamborow.js reads on load to auto-apply the filter
     (reuses the existing Applyfilter/filterlist logic).
   ============================================================ */

const SHUFFLE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour, matches glamborow.js
const LS_ICON_MAP  = "gb_category_icon_map";
const LS_ICON_TIME = "gb_category_icon_time";

// Friendly display labels for known product types.
// Anything not listed here just gets its first letter capitalised.
const CATEGORY_LABELS = {
  dress: "Dresses",
  suits: "Suits",
  heels: "Heels",
  shoes: "Shoes",
  frontals: "Frontals",
  earings: "Earrings",
  nails: "Nails",
  necklaces: "Necklaces",
  accesories: "Accessories",
  handbags: "Handbags",
  hats: "Hats",
  shades: "Shades"
};

function labelFor(type) {
  if (CATEGORY_LABELS[type]) return CATEGORY_LABELS[type];
  const str = String(type);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildCategoryMap() {
  const map = {};
  (products || []).forEach(p => {
    if (!p || !p.Producttype || !p.image) return;
    if (!map[p.Producttype]) map[p.Producttype] = [];
    map[p.Producttype].push(p);
  });
  return map;
}

// Decide which product's photo represents each category right now.
// Keeps the same picks for an hour, then rerolls — so categories
// don't look stale, but they also don't flicker on every visit.
function pickIcons(categoryMap) {
  const now = Date.now();
  const lastTime = parseInt(localStorage.getItem(LS_ICON_TIME) || "0", 10);
  const isStale = now - lastTime >= SHUFFLE_INTERVAL_MS;

  let iconMap = {};
  if (!isStale) {
    try {
      iconMap = JSON.parse(localStorage.getItem(LS_ICON_MAP)) || {};
    } catch (e) {
      iconMap = {};
    }
  }

  let changed = isStale;
  Object.keys(categoryMap).forEach(type => {
    const list = categoryMap[type];
    const currentPick = iconMap[type];
    const stillValid = currentPick && list.some(p => p.id === currentPick);
    if (isStale || !stillValid) {
      const randomProduct = list[Math.floor(Math.random() * list.length)];
      iconMap[type] = randomProduct.id;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(LS_ICON_MAP, JSON.stringify(iconMap));
    localStorage.setItem(LS_ICON_TIME, now.toString());
  }

  return iconMap;
}

function renderCategories() {
  const grid = document.querySelector(".js-categories-grid");
  if (!grid) return;

  const categoryMap = buildCategoryMap();
  const types = Object.keys(categoryMap);

  if (!types.length) {
    grid.innerHTML = `<p class="categories-loading">No products available yet — check back soon.</p>`;
    return;
  }

  const iconMap = pickIcons(categoryMap);

  let html = "";
  types.forEach(type => {
    const list = categoryMap[type];
    const iconProduct = list.find(p => p.id === iconMap[type]) || list[0];
    html += `
      <a class="category-tile" href="index.html?type=${encodeURIComponent(type)}">
        <div class="category-icon-wrap">
          <img class="category-icon-img" src="${iconProduct.image}" alt="${labelFor(type)}" loading="lazy">
        </div>
        <span class="category-label">${labelFor(type)}</span>
      </a>
    `;
  });

  grid.innerHTML = html;
}

renderCategories();

// Keep reshuffling every hour even if the page is left open in a tab
setInterval(renderCategories, SHUFFLE_INTERVAL_MS);

/* ── Cart badge (lightweight — avoids pulling in the full cart.js) ── */
function updateCartBadgeFromStorage() {
  const badge = document.querySelector(".js-cart-quantity");
  if (!badge) return;
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
  } catch (e) {
    cart = [];
  }
  const total = cart.reduce((sum, i) => sum + (i.Quantity || 1), 0);
  badge.textContent = total;
}
updateCartBadgeFromStorage();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") updateCartBadgeFromStorage();
});
window.addEventListener("pageshow", () => updateCartBadgeFromStorage());

/* ── Search bar hands off to the main shop page ── */
const searchbar = document.querySelector(".js-searchbar");
const searchbutton = document.querySelector(".js-searchbutton");

function goSearch() {
  const value = searchbar.value.trim();
  if (!value) return;
  window.location.href = "index.html?search=" + encodeURIComponent(value);
}

if (searchbutton) searchbutton.addEventListener("click", goSearch);
if (searchbar) {
  searchbar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") goSearch();
  });
}
