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

// ─── 3. Render the product detail into #slide-root ───────────────────────────
root.innerHTML = `
  <div class="Headerflex">
    <div class="forGlambadge">
      <img class="Glambadge" src="icons/glamborrow-logo.jpeg" alt="GlamBorrow">
    </div>
  </div>

  <div class="productinformation">
    <div class="pictureandbuttons">
      <div><button class="backbutton js-slidebuttonnext">&lt;&lt;</button></div>
      <div class="productimgdiv js-productimgdiv">
        <img class="productimgdiv" src="${product.image}" alt="Product">
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
      </div>

      <div class="event-section">
        ${rentSectionHtml}
        <div class="buy-section">
          <button class="Buybutton js-buybutton" data-event="Buy">Buy</button>
          <p class="buyPriceDisplay">R${BuyPrice(product.price)}</p>
        </div>
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
      <img class="productimgdiv" src="${pictures[currentIndex]}" alt="Product">
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

// Inject the flying-bubble animation styles once
(function injectCartAnimStyles() {
  if (document.getElementById("cart-anim-styles")) return;
  const style = document.createElement("style");
  style.id = "cart-anim-styles";
  style.textContent = `
    /* ── Flying cart bubble ── */
    @keyframes flyToCart {
      0%   { transform: translate(0, 0) scale(1);   opacity: 1; }
      60%  { transform: translate(var(--fly-x), calc(var(--fly-y) * 0.6)) scale(0.85); opacity: 1; }
      100% { transform: translate(var(--fly-x), var(--fly-y)) scale(0.3); opacity: 0; }
    }
    .cart-fly-bubble {
      position: fixed;
      width: 42px;
      height: 42px;
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
      box-shadow: 0 4px 18px rgba(201,168,76,0.55);
      animation: flyToCart 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    /* ── Cart badge pop ── */
    @keyframes badgePop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.55); }
      70%  { transform: scale(0.88); }
      100% { transform: scale(1); }
    }
    .cart-badge-pop {
      animation: badgePop 0.45s ease forwards !important;
    }

    /* ── Confirm button success flash ── */
    @keyframes confirmFlash {
      0%   { background: linear-gradient(135deg, #c9a84c, #e8c96a); }
      40%  { background: linear-gradient(135deg, #4caf50, #81c784); color: white; }
      100% { background: linear-gradient(135deg, #c9a84c, #e8c96a); }
    }
    .confirm-flash {
      animation: confirmFlash 0.7s ease forwards !important;
    }

    /* ── Cart hint tooltip ── */
    .cart-hint-toast {
      position: fixed;
      top: 64px;
      right: 16px;
      background: rgba(19,32,48,0.95);
      color: gold;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      padding: 8px 14px;
      border-radius: 20px;
      border: 1px solid rgba(201,168,76,0.4);
      pointer-events: none;
      z-index: 99998;
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      white-space: nowrap;
    }
    .cart-hint-toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
})();

function launchCartAnimation(originEl) {
  // Find the cart button/badge in the header
  // We look for the cart-Quantity badge or the cart button
  const cartBadge = document.querySelector(".js-cart-quantity")
                 || document.querySelector(".cart-Quantity-css")
                 || document.querySelector(".cartbutton");

  const originRect = originEl.getBoundingClientRect();
  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top  + originRect.height / 2;

  // Calculate current cart quantity for the bubble label
  const cartNow = JSON.parse(localStorage.getItem("cart")) || [];
  const totalQty = cartNow.reduce((sum, i) => sum + (i.Quantity || 1), 0);

  // Create the flying bubble
  const bubble = document.createElement("div");
  bubble.className = "cart-fly-bubble";
  bubble.textContent = totalQty;
  bubble.style.left = (startX - 21) + "px";
  bubble.style.top  = (startY - 21) + "px";

  // If we found the cart badge, fly toward it; otherwise fly straight up
  let flyX = 0, flyY = -startY - 40; // default: fly off top of screen
  if (cartBadge) {
    const cartRect = cartBadge.getBoundingClientRect();
    const destX = cartRect.left + cartRect.width  / 2;
    const destY = cartRect.top  + cartRect.height / 2;
    flyX = destX - startX;
    flyY = destY - startY;
  }

  bubble.style.setProperty("--fly-x", flyX + "px");
  bubble.style.setProperty("--fly-y", flyY + "px");
  document.body.appendChild(bubble);

  // When bubble lands, pop the badge and show hint toast
  bubble.addEventListener("animationend", () => {
    bubble.remove();

    // Pop the badge
    if (cartBadge) {
      cartBadge.classList.remove("cart-badge-pop");
      void cartBadge.offsetWidth; // force reflow
      cartBadge.classList.add("cart-badge-pop");
      cartBadge.addEventListener("animationend", () => {
        cartBadge.classList.remove("cart-badge-pop");
      }, { once: true });
    }

    // Show "your cart is up here" hint toast
    let toast = document.querySelector(".cart-hint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cart-hint-toast";
      toast.textContent = "🛒 Your cart is up here!";
      document.body.appendChild(toast);
    }
    requestAnimationFrame(() => {
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
      }, 2200);
    });
  }, { once: true });
}

(function initConfirm() {
  const confirmBtn = document.querySelector(".js-confirmbutton");
  if (!confirmBtn) return;

  confirmBtn.addEventListener("click", () => {
    const selectedColor = document.querySelector(".js-selectedColor")?.value;
    const selectedSize  = document.querySelector(".js-selectedSize")?.value;

    if (!selectedColor || !selectedSize || !selectedEvent) {
      alert("Please select a color, size, and whether you want to Rent or Buy before confirming.");
      return;
    }

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingItem = cart.find(item =>
      item.id === productId &&
      item.color === selectedColor &&
      item.size === selectedSize &&
      item.event === selectedEvent
    );

    if (existingItem) {
      existingItem.Quantity += 1;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: product.price,
        color: selectedColor,
        size: selectedSize,
        event: selectedEvent,
        Quantity: 1
      });
    }

    // ✅ Save cart — this also triggers the "storage" event on index.html
    // so the cart badge updates the moment the user navigates back, no refresh needed.
    localStorage.setItem("cart", JSON.stringify(cart));

    // ✅ Flash the confirm button green
    confirmBtn.classList.add("confirm-flash");
    confirmBtn.addEventListener("animationend", () => {
      confirmBtn.classList.remove("confirm-flash");
    }, { once: true });

    // ✅ Launch the flying bubble animation toward the cart
    launchCartAnimation(confirmBtn);
  });
})();
