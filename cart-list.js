import { products } from "./products-data.js";
import { removeFromCart, updateCart } from './cart.js';
import { slidePictures } from "./slidePicsFunctions.js";
import { RentalPrice } from "./priceFunctions.js";
import { BuyPrice } from "./priceFunctions.js";

function renderCart() {
  // Always read fresh from localStorage — the imported `cart` module array
  // is a snapshot from page load and will be stale if slideFunction.js
  // wrote items directly to localStorage after that.
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  let cartListHtml = "";
  let totalPrice = 0;
  let totalCount = 0;

  if (cart.length === 0) {
    cartListHtml = `
      <div class="empty-cart" style="grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; gap:16px;">
        <div style="font-size:4rem; opacity:0.3;">🛒</div>
        <h3 style="font-family:'Playfair Display',serif; font-size:1.4rem; color:rgba(255,255,255,0.35); margin:0;">Your cart is empty</h3>
        <p style="font-family:'DM Sans',sans-serif; font-size:14px; color:rgba(255,255,255,0.25); text-align:center; margin:0;">Browse our collection and add items you love</p>
        <a href="index.html">
          <button style="margin-top:8px; padding:12px 28px; background:linear-gradient(135deg,#c9a84c,#e8c96a); color:#132030; border:none; border-radius:50px; font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; cursor:pointer;">
            Browse Collection
          </button>
        </a>
      </div>
    `;
  } else {
    cart.forEach((cartItem) => {
      const productId = cartItem.id;
      let matchingProduct;

      products.forEach((product) => {
        if (product.id === productId) {
          matchingProduct = product;
        }
      });

      if (!matchingProduct) return;

      // Normalize event key — slideFunction.js uses lowercase `event`,
      // addtocart() uses uppercase `Event`; handle both.
      const eventType = cartItem.event || cartItem.Event || 'Rent';
      const isRent = eventType.toLowerCase() === 'rent';

      // If this line item was added via slideFunction.js with a suitOptions
      // override (e.g. the 2-piece @ R389 price), it carries an explicit
      // `finalPrice` — that MUST win over recalculating from the product's
      // base `price`, or the override gets silently lost on this page.
      const price = typeof cartItem.finalPrice === 'number'
        ? cartItem.finalPrice
        : (isRent ? RentalPrice(matchingProduct.price) : BuyPrice(matchingProduct.price));

      totalPrice += price * cartItem.Quantity;
      totalCount += cartItem.Quantity;

      const colorInfo = cartItem.color && cartItem.color !== 'N/A'
        ? `<p style="font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0;">Color: ${cartItem.color}</p>` : '';
      const sizeInfo = cartItem.size && cartItem.size !== 'N/A'
        ? `<p style="font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0;">Size: ${cartItem.size}</p>` : '';

      cartListHtml += `
        <div class="cart-item-card js-iteamincartpage-${matchingProduct.id}" style="position:relative;">
          <div class="cart-item-img-wrap">
            <img src="${matchingProduct.image}" alt="${matchingProduct.name}">
            <span class="event-tag ${isRent ? 'rent' : 'buy'}">${eventType}</span>
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">${matchingProduct.name}</p>
            ${colorInfo}${sizeInfo}
            <p class="cart-item-meta">Qty: ${cartItem.Quantity}</p>
          </div>
          <div class="cart-item-footer">
            <span class="cart-item-price ${isRent ? 'rent-price' : ''}">R${price.toFixed(2)}</span>
            <button class="removebutton js-remove-button" data-product-id="${matchingProduct.id}">Remove</button>
          </div>
        </div>
      `;
    });
  }

  document.querySelector('.js-products-grid').innerHTML = cartListHtml;

  // Update total
  const totalEl = document.querySelector('.js-rent-total-price');
  if (totalEl) totalEl.textContent = `R${totalPrice.toFixed(2)}`;

  // Update count label
  const countLabel = document.querySelector('.js-cart-count-label');
  if (countLabel) {
    countLabel.textContent = cart.length === 0 ? '' : `${totalCount} item${totalCount !== 1 ? 's' : ''} in your cart`;
  }

  // Show/hide summary and agreement
  const summaryBar = document.getElementById('summary-bar');
  const agreementRow = document.getElementById('agreement-row');
  if (summaryBar) summaryBar.style.display = cart.length > 0 ? 'flex' : 'none';
  if (agreementRow) agreementRow.style.display = cart.length > 0 ? 'flex' : 'none';

  // Attach remove button listeners
  document.querySelectorAll(".js-remove-button").forEach((button) => {
    button.addEventListener("click", () => {
      const productIdToRemove = button.dataset.productId;
      removeFromCart(productIdToRemove);
      const cardEl = document.querySelector(`.js-iteamincartpage-${productIdToRemove}`);
      if (cardEl) {
        cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.9)';
        setTimeout(() => { renderCart(); }, 300);
      } else {
        renderCart();
      }
    });
  });
}

renderCart();
export { renderCart };
