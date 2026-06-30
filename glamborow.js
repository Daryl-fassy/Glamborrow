import { products } from "./products-data.js";
import { cart,addtocart,updateCart } from "./cart.js";
import { slidePictures } from "./slidePicsFunctions.js";
import { RentalPrice} from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

// ✅ Shuffle products every 1 hour, even when the site is not being used
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const SHUFFLE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

function checkAndShuffle() {
  const lastShuffle = parseInt(localStorage.getItem("lastShuffleTime") || "0", 10);
  const now = Date.now();
  if (now - lastShuffle >= SHUFFLE_INTERVAL_MS) {
    shuffleArray(products);
    localStorage.setItem("lastShuffleTime", now.toString());
  }
}

// Run on page load
checkAndShuffle();

// Keep reshuffling every hour even while the page stays open
setInterval(() => {
  shuffleArray(products);
  localStorage.setItem("lastShuffleTime", Date.now().toString());
  // Re-render the grid with the new order
  document.querySelector(".js-products-grid").innerHTML = productsHtml;
  attachButtonListeners();
  slidePictures();
  // Also reshuffle category bar icons
  renderCategoryBar(true);
}, SHUFFLE_INTERVAL_MS);

// ✅ Clear cart after successful payment + save order to history
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("paymentSuccess") === "true") {
  localStorage.removeItem("cart");
  localStorage.removeItem("lastOrder");

  // ✅ Save order to history from frontend's localStorage (correct origin)
  const orderParam = urlParams.get("order");
  if (orderParam) {
    try {
      const order = JSON.parse(decodeURIComponent(orderParam));
      const history = JSON.parse(localStorage.getItem("orderHistory")) || [];
      const alreadySaved = history.some(o => o.orderId === order.orderId);
      if (!alreadySaved) {
        history.unshift(order);
        if (history.length > 20) history.pop();
        localStorage.setItem("orderHistory", JSON.stringify(history));
        console.log("✅ Order saved to history:", order.orderId);
      }
    } catch (err) {
      console.error("Failed to save order history:", err);
    }
  }

  // Clean URL then reload so cart.js re-reads empty localStorage
  window.history.replaceState({}, document.title, window.location.pathname);
  window.location.reload();
}


function attachButtonListeners() {
  document.querySelectorAll(".js-rentbutton").forEach((button) => {
    button.addEventListener("click", () => {
      Addtext();
      addtocart(button);
      updateCart();
    });
  })
};
let productsHtml = "";

products.forEach((product) => {
  let RentPrice = product.price;

  if (
    product.Producttype === "nails" ||
    product.Producttype === "earings" ||
    product.Producttype === "necklaces" ||
    product.Producttype === "accesories" ||
    product.Producttype === "handbags" ||
    product.Producttype === "hats" ||
    product.Producttype === "shades"
  ) {
    productsHtml += `
      <div class="iteam">
        <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
          <img class="imgiteam" src="${product.image}">
        </div>
        <div class="iteamdiscription">
          <p class="iteamheading">${product.name}</p>
          <div class="Pricediv">
            <div style="border-right: 1px solid gray; width: 80px;">
              <p style="font-weight: bold; padding-left: 30px;">Buy</p>
              <p class="Buyprice">R${BuyPrice(product.price)}</p>
            </div>
          </div>
          <div class="rentbuydiv">
            <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
          </div>
        </div>
      </div>
    `;
  } else {
    productsHtml += `
      <div class="iteam">
        <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
          <img class="imgiteam" src="${product.image}">
        </div>
        <div class="iteamdiscription">
          <p class="iteamheading">${product.name}</p>
          <div class="Pricediv">
            <div style="border-right: 1px solid gray; width: 80px;">
              <p style="font-weight: bold; padding-right: 40px;">Rent</p>
              <p class="Rentprice">R${RentalPrice(RentPrice)}</p>
            </div>
            <div>
              <p style="font-weight: bold; padding-left: 40px;">Buy</p>
              <p class="Buyprice">R${BuyPrice(product.price)}</p>
            </div>
          </div>
          <div class="rentbuydiv">
            <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
          </div>
        </div>
      </div>
    `;
  }
});

document.querySelector(".js-products-grid").innerHTML = productsHtml;
attachButtonListeners();

// ✅ Update cart immediately — works on mobile where DOMContentLoaded
// may fire before the module runs, causing stale quantity display.
updateCart();

// ─── Cart sync when returning from slideFunction.html ────────────────────────
//
// iOS Safari NEVER fires the "storage" event on the same tab, and it also
// caches pages via the back-forward cache (bfcache) so "load" doesn't refire.
// The two events that DO work reliably on iPhone are:
//   • visibilitychange  – fires when the page comes back into view
//   • pageshow          – fires on bfcache restore (persisted === true)
//
// We track the cart size BEFORE the user left so we know whether a new item was
// added, which lets us play the animation only when something changed.

let cartSizeBeforeLeave = 0;

window.addEventListener("pagehide", () => {
  const c = JSON.parse(localStorage.getItem("cart")) || [];
  cartSizeBeforeLeave = c.reduce((sum, i) => sum + (i.Quantity || 1), 0);
});

function syncCartOnReturn() {
  const freshCart = JSON.parse(localStorage.getItem("cart")) || [];
  const newTotal  = freshCart.reduce((sum, i) => sum + (i.Quantity || 1), 0);

  // Update badge directly — module-level `cart` array may be stale after bfcache
  const badge = document.querySelector(".js-cart-quantity");
  if (badge) badge.textContent = newTotal;

  if (newTotal > cartSizeBeforeLeave) {
    playReturnCartAnimation(newTotal);
  }
  cartSizeBeforeLeave = newTotal;
}

// visibilitychange: fires on iOS when user swipes back
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncCartOnReturn();
});

// pageshow: bfcache restore safety net
window.addEventListener("pageshow", (e) => {
  if (e.persisted) syncCartOnReturn();
});

// ─── Flying cart animation that plays on index.html after returning ───────────
function injectReturnAnimStyles() {
  if (document.getElementById("return-cart-anim-styles")) return;
  const style = document.createElement("style");
  style.id = "return-cart-anim-styles";
  style.textContent = `
    @keyframes returnBubbleFly {
      0%   { opacity: 0; transform: translateY(60px) scale(0.5); }
      30%  { opacity: 1; transform: translateY(0px)  scale(1.1); }
      70%  { opacity: 1; transform: translateY(-8px) scale(1);   }
      85%  { transform: translateY(0px) scale(0.85); opacity: 0.9; }
      100% { transform: translateY(-40px) scale(0.2); opacity: 0; }
    }
    .return-cart-bubble {
      position: fixed;
      border-radius: 50%;
      background: linear-gradient(135deg, #c9a84c, #f5e07a);
      color: #132030;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 99999;
      box-shadow: 0 4px 22px rgba(201,168,76,0.6);
      animation: returnBubbleFly 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes badgeBounce {
      0%   { transform: scale(1);    }
      35%  { transform: scale(1.65); }
      60%  { transform: scale(0.85); }
      80%  { transform: scale(1.15); }
      100% { transform: scale(1);    }
    }
    .badge-bounce {
      animation: badgeBounce 0.5s ease forwards !important;
    }
    @keyframes cartHintSlide {
      0%   { opacity: 0; transform: translateY(-8px); }
      20%  { opacity: 1; transform: translateY(0);    }
      80%  { opacity: 1; transform: translateY(0);    }
      100% { opacity: 0; transform: translateY(-8px); }
    }
    .cart-return-hint {
      position: fixed;
      top: 56px;
      right: 12px;
      background: rgba(19,32,48,0.96);
      color: gold;
      font-size: 12px;
      padding: 7px 14px;
      border-radius: 20px;
      border: 1px solid rgba(201,168,76,0.45);
      pointer-events: none;
      z-index: 99998;
      white-space: nowrap;
      animation: cartHintSlide 2.8s ease forwards;
    }
  `;
  document.head.appendChild(style);
}

function playReturnCartAnimation(totalQty) {
  injectReturnAnimStyles();

  const badge = document.querySelector(".js-cart-quantity");
  if (!badge) return;

  const rect = badge.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;

  const size = 40;
  const bubble = document.createElement("div");
  bubble.className = "return-cart-bubble";
  bubble.textContent = totalQty;
  bubble.style.width  = size + "px";
  bubble.style.height = size + "px";
  bubble.style.left   = (cx - size / 2) + "px";
  bubble.style.top    = (cy - size / 2) + "px";
  document.body.appendChild(bubble);

  bubble.addEventListener("animationend", () => {
    bubble.remove();
    badge.classList.remove("badge-bounce");
    void badge.offsetWidth;
    badge.classList.add("badge-bounce");
    badge.addEventListener("animationend", () => {
      badge.classList.remove("badge-bounce");
    }, { once: true });
  }, { once: true });

  const hint = document.createElement("div");
  hint.className = "cart-return-hint";
  hint.textContent = "🛒 Item added! Tap here to view your cart";
  document.body.appendChild(hint);
  hint.addEventListener("animationend", () => hint.remove(), { once: true });
}

function Addtext() {
  const container = document.querySelector('.js-addedtocartdiv');
  container.innerHTML = `
    <img class="addedtocartimg" src=icons/bright-green-tick-checkmark-icon-free-png.webp>
    <span class="addedtocarttext">Added to cart</span>
  `;
  setTimeout(() => {
    container.innerHTML = "";
  }, 2000);
};

let inputvalue = "";
const searchbar = document.querySelector('.js-searchbar');
const searchbutton = document.querySelector('.js-searchbutton');

searchbar.addEventListener('input', () => {
  inputvalue = searchbar.value.toLowerCase();
  if (!inputvalue) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    return;
  }
  const results = products.filter(product =>
    product.name.toLowerCase().includes(inputvalue)
  );
  console.log("Search results:", results);
});

function runSearch() {
  if (!inputvalue) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    return;
  }

  let productsToApearHtml = '';

  products.forEach(product => {
    if (product.Producttype.toLowerCase().includes(inputvalue)) {
      if (
        product.Producttype === "nails" ||
        product.Producttype === "earings" ||
        product.Producttype === "necklaces" ||
        product.Producttype === "accesories" ||
        product.Producttype === "handbags" ||
        product.Producttype === "hats" ||
        product.Producttype === "shades"
      ) {
        productsToApearHtml += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      } else {
        productsToApearHtml += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                  <p class="Rentprice">R${RentalPrice(product.price)}</p>
                </div>
                <div>
                  <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  if (productsToApearHtml) {
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml;
    attachButtonListeners();
    slidePictures();
  } else {
    document.querySelector(".js-products-grid").innerHTML = `
      <p style="font-weight:bold; color:white;">
        Sorry, couldn't find your product.<br>
        Try using the filter button for more accurate results.
      </p>
      <img src="icons/OIP.webp">
    `;
  }
}

searchbutton.addEventListener('click', runSearch);
searchbar.addEventListener('keydown', (event) => {
  if (event.key === "Enter") {
    runSearch();
  }
});

//////////////////// Filter button function (kept for compatibility — button hidden via HTML)
const filterButtonEl = document.querySelector(".js-filterbutton");
if (filterButtonEl) {
  filterButtonEl.addEventListener('click', () => {
    const popspace = document.querySelector('.js-popspace');
    if (popspace.innerHTML.trim() !== "") {
      popspace.innerHTML = "";
      return;
    }
    popspace.innerHTML = `
    <span class="pop">
      <div><button class="producttypebutton" onclick="oneTimeSelection('suits')">Suits</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('dress')">Dresses</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('heels')">Heels</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('frontals')">Frontals</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('shoes')">Shoes</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('earings')">Earings</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('nails')">Nails</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('necklaces')">Necklaces</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('accesories')">Accesories</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('handbags')">Handbags</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('hats')">Hats</button></div>
      <div><button class="producttypebutton" onclick="oneTimeSelection('shades')">Shades</button></div>
      <div><button class="Applyfilterbutton" onclick="Applyfilter()">Apply Filter</button></div>
    </span>
  `;
  });
}

let filterlist = [];
console.log(filterlist);

function oneTimeSelection(item) {
  const index = filterlist.indexOf(item);
  if (index === -1) {
    filterlist.push(item);
  } else {
    filterlist.splice(index, 1);
  }
  console.log(filterlist);
  const button = document.querySelector(`button[onclick="oneTimeSelection('${item}')"]`);
  if (button) {
    button.classList.toggle("selected");
  }
};
window.oneTimeSelection = oneTimeSelection;

let productsToApearHtml2 = "";
let productsToApear2 = "";

function Applyfilter() {
  let productsToApearHtml2 = "";
  products.forEach(product => {
    if (filterlist.includes(product.Producttype)) {
      if (
        product.Producttype === "nails" ||
        product.Producttype === "earings" ||
        product.Producttype === "necklaces" ||
        product.Producttype === "accesories" ||
        product.Producttype === "handbags" ||
        product.Producttype === "hats" ||
        product.Producttype === "shades"
      ) {
        productsToApearHtml2 += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      } else {
        productsToApearHtml2 += `
          <div class="iteam">
            <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
              <img class="imgiteam" src="${product.image}">
            </div>
            <div class="iteamdiscription">
              <p class="iteamheading">${product.name}</p>
              <div class="Pricediv">
                <div style="border-right: 1px solid gray; width: 80px;">
                  <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                  <p class="Rentprice">R${RentalPrice(product.price)}</p>
                </div>
                <div>
                  <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                  <p class="Buyprice">R${BuyPrice(product.price)}</p>
                </div>
              </div>
              <div class="rentbuydiv">
                <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  if (productsToApearHtml2) {
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml2;
    attachButtonListeners();
    slidePictures();
  } else {
    document.querySelector(".js-products-grid").innerHTML = `
      <p style="font-weight:bold; color:white;">
        Sorry, couldn't find your product.<br>
        We suggest you use the filter button on the top right for more accurate results.
      </p>
      <img src="icons/OIP.webp">
    `;
  }
  if (!filterlist) {
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
  }
  document.querySelector('.js-popspace').innerHTML = "";
  filterlist = [];
};

window.Applyfilter = Applyfilter;

// ── CATEGORY BAR ─────────────────────────────────────────────────────────────
// Always-visible row of circular category tiles.
// Each tile shows a product image from that category, reshuffled every hour.
// Clicking a tile instantly filters the product grid — no button hunting needed.
function renderCategoryBar(forceNewIcons = false) {
  const bar = document.getElementById("gb-category-bar");
  if (!bar) return;

  const LS_ICONS = "gb_catbar_icons";
  const LS_TIME  = "gb_catbar_time";

  // Build map: Producttype → [product, …]
  const map = {};
  products.forEach(p => {
    if (!p || !p.Producttype || !p.image) return;
    const t = p.Producttype;
    if (!map[t]) map[t] = [];
    map[t].push(p);
  });

  const types = Object.keys(map);
  if (!types.length) { bar.style.display = "none"; return; }

  // Pick one product image per category; reshuffle hourly
  const now      = Date.now();
  const lastTime = parseInt(localStorage.getItem(LS_TIME) || "0", 10);
  const isStale  = forceNewIcons || (now - lastTime) >= SHUFFLE_INTERVAL_MS;
  let iconMap = {};
  if (!isStale) {
    try { iconMap = JSON.parse(localStorage.getItem(LS_ICONS)) || {}; } catch (e) {}
  }
  let changed = isStale;
  types.forEach(type => {
    const list  = map[type];
    const valid = iconMap[type] && list.some(p => p.id === iconMap[type]);
    if (isStale || !valid) {
      iconMap[type] = list[Math.floor(Math.random() * list.length)].id;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(LS_ICONS, JSON.stringify(iconMap));
    localStorage.setItem(LS_TIME, String(now));
  }

  // Friendly display labels
  const LABELS = {
    dress: 'Dresses', suits: 'Suits', heels: 'Heels', shoes: 'Shoes',
    frontals: 'Frontals', earings: 'Earrings', nails: 'Nails',
    necklaces: 'Necklaces', accesories: 'Accessories', handbags: 'Handbags',
    hats: 'Hats', shades: 'Shades'
  };
  const label = t => LABELS[t] || (t.charAt(0).toUpperCase() + t.slice(1));

  // "All" reset tile + one tile per category
  let html = `
    <div class="gb-cat-section-label">Shop by Category</div>
    <div class="gb-cat-scroll">
      <button class="gb-cat-tile gb-cat-active" data-type="__all__" aria-label="Show all products">
        <div class="gb-cat-circle gb-cat-circle-all">
          <span class="gb-cat-all-icon">✨</span>
        </div>
        <span class="gb-cat-label">All</span>
      </button>
  `;

  types.forEach(type => {
    const pick = map[type].find(p => p.id === iconMap[type]) || map[type][0];
    html += `
      <button class="gb-cat-tile" data-type="${type}" aria-label="Filter by ${label(type)}">
        <div class="gb-cat-circle">
          <img src="${pick.image}" alt="${label(type)}" loading="lazy">
        </div>
        <span class="gb-cat-label">${label(type)}</span>
      </button>
    `;
  });

  html += `</div>`;
  bar.innerHTML = html;

  // Click → filter in place
  bar.querySelectorAll(".gb-cat-tile").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Visual active state
      bar.querySelectorAll(".gb-cat-tile").forEach(b => b.classList.remove("gb-cat-active"));
      btn.classList.add("gb-cat-active");

      if (type === "__all__") {
        // Reset to full product grid
        document.querySelector(".js-products-grid").innerHTML = productsHtml;
        attachButtonListeners();
        slidePictures();
        filterlist = [];
      } else {
        filterlist = [type];
        Applyfilter();
        // Applyfilter() resets filterlist to [] internally — that's fine
      }
    });
  });
}

slidePictures();
renderCategoryBar();

// ✅ Coming in from categories.html (?type=...) or a search redirect (?search=...)
// Reuses the existing filter/search logic so behaviour stays identical to
// picking the same option from the Filter popup or typing in the search bar.
(function applyIncomingLinkParams() {
  const incomingParams = new URLSearchParams(window.location.search);
  const incomingType = incomingParams.get("type");
  const incomingSearch = incomingParams.get("search");

  if (incomingType) {
    filterlist = [incomingType];
    Applyfilter();
  } else if (incomingSearch) {
    searchbar.value = incomingSearch;
    inputvalue = incomingSearch.toLowerCase();
    runSearch();
  }

  if (incomingType || incomingSearch) {
    // Clean the URL so a refresh or the back button doesn't keep re-filtering
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();

// Premium and Budget button logic
let premiumActive = false;
let budgetActive = false;

const premiumBtn = document.querySelector('.js-premiumbudget');
const budgetBtn = document.querySelector('.js-budget');

premiumBtn.addEventListener('click', () => {
  if (!premiumActive) {
    if (budgetActive) {
      budgetBtn.style.backgroundColor = '';
      budgetBtn.style.color = '';
      budgetActive = false;
    }
    premiumBtn.style.backgroundColor = 'black';
    premiumBtn.style.color = 'white';

    let productsToApearHtml3 = "";
    products.forEach(product => {
      if (product.class === "Premium") {
        if (
          product.Producttype === "nails" ||
          product.Producttype === "earings" ||
          product.Producttype === "necklaces" ||
          product.Producttype === "accesories" ||
          product.Producttype === "handbags" ||
          product.Producttype === "hats" ||
          product.Producttype === "shades"
        ) {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        } else {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                    <p class="Rentprice">R${RentalPrice(product.price)}</p>
                  </div>
                  <div>
                    <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        }
      }
    });
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml3;
    attachButtonListeners();
    slidePictures();
    premiumActive = true;
  } else {
    premiumBtn.style.backgroundColor = '';
    premiumBtn.style.color = '';
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    premiumActive = false;
  }
});

budgetBtn.addEventListener('click', () => {
  if (!budgetActive) {
    if (premiumActive) {
      premiumBtn.style.backgroundColor = '';
      premiumBtn.style.color = '';
      premiumActive = false;
    }
    budgetBtn.style.backgroundColor = 'black';
    budgetBtn.style.color = 'white';

    let productsToApearHtml3 = "";
    products.forEach(product => {
      if (product.class === "Budget") {
        if (
          product.Producttype === "nails" ||
          product.Producttype === "earings" ||
          product.Producttype === "necklaces" ||
          product.Producttype === "accesories" ||
          product.Producttype === "handbags" ||
          product.Producttype === "hats" ||
          product.Producttype === "shades"
        ) {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-left: 30px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        } else {
          productsToApearHtml3 += `
            <div class="iteam">
              <div class="picdiv js-picdiv" data-productTO-View-id="${product.id}">
                <img class="imgiteam" src="${product.image}">
              </div>
              <div class="iteamdiscription">
                <p class="iteamheading">${product.name}</p>
                <div class="Pricediv">
                  <div style="border-right: 1px solid gray; width: 80px;">
                    <p style="font-weight: bold; padding-right: 40px;">Rent</p>
                    <p class="Rentprice">R${RentalPrice(product.price)}</p>
                  </div>
                  <div>
                    <p style="font-weight: bold; padding-left: 40px;">Buy</p>
                    <p class="Buyprice">R${BuyPrice(product.price)}</p>
                  </div>
                </div>
                <div class="rentbuydiv">
                  <button class="Options js-picdiv" data-productTO-View-id="${product.id}">Options</button>
                </div>
              </div>
            </div>
          `;
        }
      }
    });
    document.querySelector(".js-products-grid").innerHTML = productsToApearHtml3;
    attachButtonListeners();
    slidePictures();
    budgetActive = true;
  } else {
    budgetBtn.style.backgroundColor = '';
    budgetBtn.style.color = '';
    document.querySelector(".js-products-grid").innerHTML = productsHtml;
    attachButtonListeners();
    slidePictures();
    budgetActive = false;
  }
});

// ====================================================
// ✅ PREVIOUS ORDERS PANEL
// ====================================================

// ✅ Orders button now navigates to the dedicated orders page
const ordersButton = document.querySelector(".js-orders-button");
ordersButton.addEventListener("click", () => {
  window.location.href = "orders.html";
});
