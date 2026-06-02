// checkout.js (Frontend) — handles cart display and payment submission
import { products } from "./products-data.js";
import { BuyPrice, RentalPrice } from "./priceFunctions.js";

// ── Detect backend URL ────────────────────────────────────────────────────────
const BACKEND_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://glamborrow-1.onrender.com";

const cart = JSON.parse(localStorage.getItem("cart")) || [];

// ── Render cart items on checkout page ───────────────────────────────────────
function renderCartForCheckout() {
  const cartItemsDiv  = document.getElementById("cart-items");
  const emptyMessage  = document.getElementById("empty-cart-message");
  let total = 0;

  cartItemsDiv.innerHTML = "";

  if (cart.length === 0) {
    emptyMessage.style.display = "block";
    document.getElementById("total").textContent = "";
    return;
  } else {
    emptyMessage.style.display = "none";
  }

  // Enrich cart items with full product details
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      item.name     = product.name;
      item.price    = product.price;
      item.image    = product.image;
      item.quantity = item.Quantity || item.quantity || 1;
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
      ? RentalPrice(item.price)
      : BuyPrice(item.price);

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
      </div>
    `;

    cartItemsDiv.appendChild(div);
    total += priceValue * item.quantity;
  });

  document.getElementById("total").textContent = `Total: R${total.toFixed(2)}`;
}

renderCartForCheckout();

// ── Checkout form submission ──────────────────────────────────────────────────
document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email      = document.getElementById("email").value.trim();
  const schoolName = document.getElementById("school").value.trim();
  const contact    = document.getElementById("contact").value.trim();
  const whatsapp   = document.getElementById("whatsapp").value.trim();
  const secretCode = document.getElementById("secretCode").value.trim();

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // Build enriched cart with correct pricing and normalised event key
  const enrichedCart = cart.map(item => {
    const event      = item.event || item.Event || "Rent";
    const priceValue = event.toLowerCase() === "rent"
      ? RentalPrice(item.price).toFixed(2)
      : BuyPrice(item.price).toFixed(2);

    return {
      name:     item.name,
      quantity: item.quantity || item.Quantity || 1,
      price:    priceValue,
      image:    item.image,
      size:     item.size  || "N/A",
      color:    item.color || "N/A",
      event,
      location: item.location
    };
  });

  const totalAmount = enrichedCart
    .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
    .toFixed(2);

  const orderId = Date.now().toString();

  try {
    const response = await fetch(`${BACKEND_URL}/checkout`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        customerEmail: email,
        schoolName,
        contact,
        whatsapp,
        secretCode,
        cart:   enrichedCart,
        amount: totalAmount
      })
    });

    const data = await response.json();
    console.log("Checkout response:", data);

    if (data.redirectUrl) {
      // Cart is cleared ONLY after confirmed payment (in success.js)
      window.location.href = data.redirectUrl;
    } else {
      alert("Checkout failed: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Something went wrong. Please check your connection and try again.");
  }
});
