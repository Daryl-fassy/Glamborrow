// slideFunction.js
// Runs ONLY on slideFunction.html.
// Reads ?id=PRODUCT_ID from the URL and renders the full product detail view.

import { products } from "./products-data.js";
import { RentalPrice } from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

// ─── 1. Read the product ID from the URL ─────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const root = document.getElementById("slide-root");

if (!productId) {
  root.innerHTML = `<p class="state-message">No product selected. <a href="index.html" style="color:gold;">Go back to the shop</a>.</p>`;
  throw new Error("slideFunction.js: no ?id= param in URL");
}

const product = products.find(p => p.id === productId);

if (!product) {
  root.innerHTML = `<p class="state-message">Product not found (id="${productId}"). <a href="index.html" style="color:gold;">Go back to the shop</a>.</p>`;
  throw new Error(`slideFunction.js: product not found for id="${productId}"`);
}

// ─── 1b. Suit type (2 piece / 3 piece) support ───────────────────────────────
// Only products that explicitly define `suitOptions` in products-data.js show
// this selector — e.g. a "3 piece suit" whose 2-piece version rents/sells for
// a different, explicitly-set price rather than one calculated from the base
// `price` field. Products without `suitOptions` behave exactly as before.
const hasSuitOptions = Array.isArray(product.suitOptions) && product.suitOptions.length > 0;

function getSelectedSuitType() {
  return document.querySelector(".js-selectedSuitType")?.value || null;
}

// Returns the rent/buy prices that should currently be displayed, taking the
// selected suit type into account when the product has suitOptions.
function getCurrentPrices() {
  const suitType = getSelectedSuitType();
  const option = hasSuitOptions && suitType
    ? product.suitOptions.find(o => o.type === suitType)
    : null;

  const rent = option && option.rentPrice !== undefined
    ? option.rentPrice
    : RentalPrice(product.price);

  const buy = option && option.buyPrice !== undefined
    ? option.buyPrice
    : BuyPrice(product.price);

  return { rent, buy };
}

function updatePriceDisplays() {
  const { rent, buy } = getCurrentPrices();
  const rentEl = document.querySelector(".rentPriceDisplay");
  const buyEl = document.querySelector(".buyPriceDisplay");
  if (rentEl) rentEl.textContent = `R${rent}`;
  if (buyEl) buyEl.textContent = `R${buy}`;
}

// ─── 2. Build the rent section HTML ──────────────────────────────────────────
let rentSectionHtml = "";
if (product.rentalStatus === "available") {
  rentSectionHtml = `
    <div class="rent-section">
      <button class="Rentbutton js-rentbutton" data-event="Rent">Rent</button>
      <p class="rentPriceDisplay">R${RentalPrice(product.price)}</p>
    </div>
  `;
} else {
  rentSectionHtml = `
    <div class="rent-section">
      <p class="rentUnavailable">This item cannot be rented</p>
    </div>
  `;
}

// ─── 2b. Build the buy section HTML ──────────────────────────────────────────
// Mirrors the rent section above: a product is buyable by default (most
// products have no buyStatus field at all). Only an explicit
// buyStatus:"Unavailable" (case-insensitive) turns Buy off.
const isBuyUnavailable = typeof product.buyStatus === "string"
  && product.buyStatus.toLowerCase() === "unavailable";

let buySectionHtml = "";
if (!isBuyUnavailable) {
  buySectionHtml = `
    <div class="buy-section">
      <button class="Buybutton js-buybutton" data-event="Buy">Buy</button>
      <p class="buyPriceDisplay">R${BuyPrice(product.price)}</p>
    </div>
  `;
} else {
  buySectionHtml = `
    <div class="buy-section">
      <p class="buyUnavailable">This item cannot be bought</p>
    </div>
  `;
}

// ─── 3. Render the product detail into #slide-root ───────────────────────────
root.innerHTML = `
  <div class="Headerflex">
    <div class="forGlambadge">
      <img class="Glambadge" src="icons/glamborrow-logo.jpeg" alt="GlamBorrow" loading="lazy" decoding="async">
    </div>
  </div>

  <div class="productinformation">
    <div class="pictureandbuttons">
      <div><button class="backbutton js-slidebuttonnext">&lt;&lt;</button></div>
      <div class="productimgdiv js-productimgdiv">
        <img class="productimgdiv" src="${product.image}" alt="Product" loading="eager" decoding="async">
      </div>
      <div><button class="backbutton js-slidebuttonprevious">&gt;&gt;</button></div>
    </div>

    <div class="productdetails">
      <h2 class="productnameHeader">${product.name}</h2>
      <p class="itemDiscription">${product.description}</p>

      <div class="options-section">
        <div class="color-section">
          <button class="optionbutton js-colorbutton">View Colors</button>
          <div class="colorOptionsWindow js-colorOptionsWindow"></div>
        </div>
        <div class="size-section">
          <button class="optionbutton js-sizebutton">View Sizes</button>
          <div class="sizeOptionsWindow js-sizeOptionsWindow"></div>
        </div>
        ${hasSuitOptions ? `
        <div class="suit-section">
          <button class="optionbutton js-suitbutton">View Suit Type</button>
          <div class="suitOptionsWindow js-suitOptionsWindow"></div>
        </div>
        ` : ""}
      </div>

      <div class="event-section">
        ${rentSectionHtml}
        ${buySectionHtml}
      </div>

      <div class="confirm-section">
        <button class="Confirmbutton js-confirmbutton" data-product-id="${productId}">
          Confirm Order
        </button>
      </div>
    </div>
  </div>
`;

// ─── 4. Image slider ──────────────────────────────────────────────────────────
(function initSlider() {
  let currentIndex = 0;
  const imgDiv = document.querySelector(".js-productimgdiv");

  function renderImage() {
    const pictures = product.album?.pictures;
    if (!pictures || pictures.length === 0) return;
    imgDiv.innerHTML = `
      <img class="productimgdiv" src="${pictures[currentIndex]}" alt="Product" loading="eager" decoding="async">
      <span class="imgCount">${currentIndex + 1} / ${pictures.length}</span>
    `;
  }

  // << go to previous picture
  document.querySelector(".js-slidebuttonnext")?.addEventListener("click", () => {
    const pictures = product.album?.pictures;
    if (!pictures || pictures.length === 0) return;
    currentIndex = (currentIndex - 1 + pictures.length) % pictures.length;
    renderImage();
  });

  // >> go to next picture
  document.querySelector(".js-slidebuttonprevious")?.addEventListener("click", () => {
    const pictures = product.album?.pictures;
    if (!pictures || pictures.length === 0) return;
    currentIndex = (currentIndex + 1) % pictures.length;
    renderImage();
  });
})();

// ─── 5. Color options ─────────────────────────────────────────────────────────
(function initColors() {
  const colorBtn = document.querySelector(".js-colorbutton");
  const colorWindow = document.querySelector(".js-colorOptionsWindow");
  if (!colorBtn) return;

  colorBtn.addEventListener("click", () => {
    if (colorWindow.innerHTML.trim() !== "") {
      colorWindow.innerHTML = "";
      return;
    }
    const colours = product.album?.colour ?? [];
    colorWindow.innerHTML = `
      <label for="Color">Choose Color</label>
      <select id="Color" name="Color" class="js-selectedColor">
        ${colours.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
    `;
  });
})();

// ─── 6. Size options ──────────────────────────────────────────────────────────
(function initSizes() {
  const sizeBtn = document.querySelector(".js-sizebutton");
  const sizeWindow = document.querySelector(".js-sizeOptionsWindow");
  if (!sizeBtn) return;

  sizeBtn.addEventListener("click", () => {
    if (sizeWindow.innerHTML.trim() !== "") {
      sizeWindow.innerHTML = "";
      return;
    }
    const sizes = product.size ?? [];
    sizeWindow.innerHTML = `
      <label for="Size">Choose Size</label>
      <select id="Size" name="Size" class="js-selectedSize">
        ${sizes.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
    `;
  });
})();

// ─── 6b. Suit type options (2 piece / 3 piece) ───────────────────────────────
(function initSuitType() {
  const suitBtn = document.querySelector(".js-suitbutton");
  const suitWindow = document.querySelector(".js-suitOptionsWindow");
  if (!suitBtn) return; // product has no suitOptions, nothing to wire up

  suitBtn.addEventListener("click", () => {
    if (suitWindow.innerHTML.trim() !== "") {
      suitWindow.innerHTML = "";
      return;
    }
    const options = product.suitOptions ?? [];
    suitWindow.innerHTML = `
      <label for="SuitType">Choose Suit Type</label>
      <select id="SuitType" name="SuitType" class="js-selectedSuitType">
        ${options.map(o => `<option value="${o.type}">${o.type}</option>`).join("")}
      </select>
    `;
    // Recalculate the on-screen rent/buy prices whenever the suit type changes
    document.querySelector(".js-selectedSuitType")?.addEventListener("change", updatePriceDisplays);
    // Reflect whatever the select defaults to (its first <option>) immediately
    updatePriceDisplays();
  });
})();

// ─── 7. Rent / Buy toggle ─────────────────────────────────────────────────────
let selectedEvent = null;

(function initEventButtons() {
  const rentBtn = document.querySelector(".js-rentbutton");
  const buyBtn  = document.querySelector(".js-buybutton");

  if (rentBtn) {
    rentBtn.addEventListener("click", () => {
      selectedEvent = "Rent";
      rentBtn.style.backgroundColor = "gold";
      if (buyBtn) buyBtn.style.backgroundColor = "";
    });
  }

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      selectedEvent = "Buy";
      buyBtn.style.backgroundColor = "green";
      if (rentBtn) rentBtn.style.backgroundColor = "";
    });
  }
})();

// ─── 8. Confirm / add to cart ─────────────────────────────────────────────────
// The cart animation (flying bubble + badge bounce) lives in glamborow.js and
// plays on index.html when the user navigates back. Here we just save to cart
// and give immediate feedback on THIS page via a button flash + success banner.

(function injectConfirmStyles() {
  if (document.getElementById("confirm-anim-styles")) return;
  const style = document.createElement("style");
  style.id = "confirm-anim-styles";
  style.textContent = `
    @keyframes confirmGreen {
      0%   { background: #c9a84c; color: #132030; }
      30%  { background: #4caf50; color: #fff;    transform: scale(1.06); }
      70%  { background: #4caf50; color: #fff;    }
      100% { background: #c9a84c; color: #132030; transform: scale(1); }
    }
    .confirm-green-flash {
      animation: confirmGreen 0.8s ease forwards !important;
    }
    @keyframes successBannerIn {
      0%   { opacity: 0; transform: translateY(12px) scale(0.95); }
      60%  { opacity: 1; transform: translateY(-3px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes successBannerOut {
      0%   { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
    .slide-success-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(19,32,48,0.97), rgba(30,50,74,0.97));
      border: 1px solid rgba(201,168,76,0.5);
      border-radius: 14px;
      padding: 14px 22px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      z-index: 99999;
      pointer-events: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      animation: successBannerIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
      white-space: nowrap;
    }
    .slide-success-banner.fade-out {
      animation: successBannerOut 0.4s ease forwards;
    }
    .slide-success-icon {
      font-size: 22px;
    }
    .slide-success-text strong {
      color: gold;
      display: block;
      font-size: 15px;
    }
    .slide-success-text span {
      color: rgba(255,255,255,0.6);
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
})();

function showSuccessBanner() {
  // Remove any existing banner
  document.querySelectorAll(".slide-success-banner").forEach(el => el.remove());

  const banner = document.createElement("div");
  banner.className = "slide-success-banner";
  banner.innerHTML = `
    <span class="slide-success-icon">✅</span>
    <div class="slide-success-text">
      <strong>Added to cart!</strong>
      <span>Go back to see your cart update</span>
    </div>
  `;
  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add("fade-out");
    banner.addEventListener("animationend", () => banner.remove(), { once: true });
  }, 3000);
}

(function initConfirm() {
  const confirmBtn = document.querySelector(".js-confirmbutton");
  if (!confirmBtn) return;

  confirmBtn.addEventListener("click", () => {
    const selectedColor = document.querySelector(".js-selectedColor")?.value;
    const selectedSize  = document.querySelector(".js-selectedSize")?.value;
    const selectedSuitType = getSelectedSuitType();

    if (!selectedColor || !selectedSize || !selectedEvent || (hasSuitOptions && !selectedSuitType)) {
      alert(
        hasSuitOptions
          ? "Please select a color, size, suit type, and whether you want to Rent or Buy before confirming."
          : "Please select a color, size, and whether you want to Rent or Buy before confirming."
      );
      return;
    }

    // Work out the actual price for THIS specific selection — for suits with
    // a 2-piece/3-piece override this is the explicit rentPrice/buyPrice from
    // products-data.js, not the value calculated from the base `price` field.
    const { rent, buy } = getCurrentPrices();
    const finalPrice = selectedEvent === "Rent" ? rent : buy;

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingItem = cart.find(item =>
      item.id === productId &&
      item.color === selectedColor &&
      item.size === selectedSize &&
      item.event === selectedEvent &&
      item.suitType === (selectedSuitType || undefined)
    );

    if (existingItem) {
      existingItem.Quantity += 1;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: product.price,
        // finalPrice reflects the actual amount for this line (accounts for
        // the 2-piece/3-piece override) — use this for cart/order totals.
        finalPrice: finalPrice,
        color: selectedColor,
        size: selectedSize,
        suitType: selectedSuitType || undefined,
        event: selectedEvent,
        Quantity: 1
      });
    }

    // Save to localStorage — glamborow.js picks this up via visibilitychange
    // when the user navigates back, then plays the cart animation on index.html
    localStorage.setItem("cart", JSON.stringify(cart));

    // Flash the confirm button green
    confirmBtn.classList.add("confirm-green-flash");
    confirmBtn.addEventListener("animationend", () => {
      confirmBtn.classList.remove("confirm-green-flash");
    }, { once: true });

    // Show a success banner at the bottom of the screen
    showSuccessBanner();
  });
})();
