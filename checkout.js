import { products } from "./products-data.js";
import { BuyPrice, RentalPrice } from "./priceFunctions.js";

const cart = JSON.parse(localStorage.getItem("cart")) || [];

function renderCartForCheckout() {
  const cartItemsDiv = document.getElementById("cart-items");
  const emptyMessage = document.getElementById("empty-cart-message");
  let total = 0;

  cartItemsDiv.innerHTML = "";

  if (cart.length === 0) {
    emptyMessage.style.display = "block";
    document.getElementById("total").textContent = "";
    return;
  } else {
    emptyMessage.style.display = "none";
  }

  // Enrich cart items with product details
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      item.name = product.name;
      item.price = product.price;
      item.image = product.image;
      item.quantity = item.Quantity || 1;
      item.color = item.color || "N/A";
      item.size = item.size || "N/A";
      item.location = product.location || "N/A";
      // ✅ Normalize event key (cart.js uses capital E "Event")
      item.event = item.event || item.Event || "Rent";
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

// Handle checkout form submission
document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const schoolName = document.getElementById("school").value;
  const contact = document.getElementById("contact").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const secretCode = document.getElementById("secretCode").value;

  // Build enriched cart with normalized event key
  const enrichedCart = cart.map(item => {
    const event = item.event || item.Event || "Rent";
    const priceValue = event.toLowerCase() === "rent"
      ? RentalPrice(item.price).toFixed(2)
      : BuyPrice(item.price).toFixed(2);

    return {
      name: item.name,
      quantity: item.quantity || item.Quantity || 1,
      price: priceValue,        // stored as string e.g. "467.50"
      image: item.image,
      size: item.size || "N/A",
      color: item.color || "N/A",
      event,
      location: item.location
    };
  });

  const totalAmount = enrichedCart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  ).toFixed(2);

  const orderId = Date.now().toString();

  // ✅ Save lastOrder to localStorage BEFORE redirecting to PayFast
  // This is what success page reads to display order details
  const lastOrder = {
    orderId,
    customerEmail: email,
    contactNumber: contact,
    whatsappNumber: whatsapp,
    schoolName,
    amount: parseFloat(totalAmount),
    items: enrichedCart,
    date: new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })
  };
  localStorage.setItem("lastOrder", JSON.stringify(lastOrder));

  try {
    const response = await fetch("https://glamborrow.co.za/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        customerEmail: email,
        schoolName,
        contact,
        whatsapp,
        secretCode,
        cart: enrichedCart,
        amount: totalAmount
      })
    });

    const data = await response.json();
    console.log("Checkout response:", data);

    if (data.redirectUrl) {
      // ✅ Redirect to PayFast — cart cleared ONLY after confirmed payment (in sucess.js)
      window.location.href = data.redirectUrl;
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Something went wrong. Please try again.");
  }
});
