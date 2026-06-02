import { products } from "./products-data.js";
import { BuyPrice, RentalPrice } from "./priceFunctions.js";

const BACKEND_URL = "https://glamborrow-1.onrender.com";
const cart = JSON.parse(localStorage.getItem("cart")) || [];
let isSubmitting = false;

// ── Render cart ───────────────────────────────────────────────────────────────
function renderCartForCheckout() {
  const cartItemsDiv = document.getElementById("cart-items");
  const emptyMessage = document.getElementById("empty-cart-message");
  let total = 0;
  cartItemsDiv.innerHTML = "";

  if (cart.length === 0) {
    emptyMessage.style.display = "block";
    document.getElementById("total").textContent = "";
    return;
  }
  emptyMessage.style.display = "none";

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      item.name     = product.name;
      item.price    = product.price;
      item.image    = product.image;
      item.quantity = item.Quantity || 1;
      item.color    = item.color || "N/A";
      item.size     = item.size  || "N/A";
      item.location = product.location || "N/A";
      item.event    = item.event || item.Event || "Rent";
    }
  });

  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    const priceValue = item.event?.toLowerCase() === "rent"
      ? RentalPrice(item.price) : BuyPrice(item.price);

    div.innerHTML = `
      <div class="picdiv">
        <img src="${item.image}" class="imgiteam" alt="${item.name}">
      </div>
      <div class="iteamdiscription">
        <p class="iteamheading">${item.name}</p>
        <div class="rentPriceAndRemoveButton-Div">
          <span class="rentprice">R${priceValue.toFixed(2)}</span>
          <p>Quantity: ${item.quantity}</p>
        </div>
        <p>Color: ${item.color}</p>
        <p>Size: ${item.size}</p>
        <p>To: ${item.event}</p>
      </div>`;
    cartItemsDiv.appendChild(div);
    total += priceValue * item.quantity;
  });

  document.getElementById("total").textContent = `Total: R${total.toFixed(2)}`;
}

renderCartForCheckout();

// ── Overlay ───────────────────────────────────────────────────────────────────
function showOverlay() {
  document.getElementById("payment-loading-overlay")?.classList.add("active");
  const btn = document.querySelector(".js-checkout-button");
  if (btn) { btn.disabled = true; btn.textContent = "Redirecting…"; }
}
function hideOverlay() {
  document.getElementById("payment-loading-overlay")?.classList.remove("active");
  const btn = document.querySelector(".js-checkout-button");
  if (btn) { btn.disabled = false; btn.textContent = "Proceed to Payment →"; }
  isSubmitting = false;
}

// ── POST to PayFast via hidden form ───────────────────────────────────────────
// fields is an array of [key, value] pairs — order is preserved exactly
function submitToPayFast(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.cssText = "display:none;";

  // fields is ordered array — append inputs in same order
  fields.forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type  = "hidden";
    input.name  = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  requestAnimationFrame(() => form.submit());
}

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;

  const email      = document.getElementById("email").value.trim();
  const schoolName = document.getElementById("school").value.trim();
  const contact    = document.getElementById("contact").value.trim();
  const whatsapp   = document.getElementById("whatsapp").value.trim();
  const secretCode = document.getElementById("secretCode").value.trim();

  if (!email || !schoolName || !contact || !secretCode) {
    alert("Please fill in all required fields.");
    isSubmitting = false;
    return;
  }

  const enrichedCart = cart.map(item => {
    const event = item.event || item.Event || "Rent";
    const priceValue = event.toLowerCase() === "rent"
      ? RentalPrice(item.price).toFixed(2)
      : BuyPrice(item.price).toFixed(2);
    return {
      name: item.name, quantity: item.quantity || item.Quantity || 1,
      price: priceValue, image: item.image,
      size: item.size || "N/A", color: item.color || "N/A",
      event, location: item.location
    };
  });

  const totalAmount = enrichedCart
    .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
    .toFixed(2);

  const orderId = Date.now().toString();

  localStorage.setItem("lastOrder", JSON.stringify({
    orderId, customerEmail: email, contactNumber: contact,
    whatsappNumber: whatsapp, schoolName,
    amount: parseFloat(totalAmount), items: enrichedCart,
    date: new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })
  }));

  showOverlay();

  try {
    const response = await fetch(`${BACKEND_URL}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId, customerEmail: email, schoolName,
        contact, whatsapp, secretCode,
        cart: enrichedCart, amount: totalAmount
      })
    });

    if (!response.ok) throw new Error(`Server ${response.status}`);

    const data = await response.json();

    if (data.fields && data.action) {
      submitToPayFast(data.action, data.fields); // data.fields is ordered array
    } else {
      hideOverlay();
      alert(data.error || "Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    hideOverlay();
    alert("Could not connect to the server. Please try again.");
  }
});
