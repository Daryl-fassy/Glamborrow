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
