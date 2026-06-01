// sucess.js — reads orderId from URL, fetches order from server

// ✅ Always point to the deployed backend
const BACKEND_URL = "https://glamborrow-1.onrender.com";

const detailsDiv = document.getElementById("order-details");
const headerEl = document.querySelector(".success-title");
const subheadEl = document.querySelector(".success-message h2");
const bodyTextEl = document.querySelector(".success-message > p");

// Add spinner style
const style = document.createElement("style");
style.textContent = `
  .spinner {
    width: 40px; height: 40px;
    border: 4px solid #ccc;
    border-top-color: #2aa006;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// Show loading immediately
detailsDiv.innerHTML = `
  <div style="text-align:center; padding: 20px;">
    <div class="spinner"></div>
    <p style="color:#555; margin-top:12px;">Verifying your payment, please wait...</p>
  </div>
`;

// ✅ Get orderId from URL — e.g. success.html?orderId=1234567890
const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");

if (!orderId) {
  showError("No order ID found. If you completed payment, please contact us.");
} else {
  // Poll server for payment status
  let attempts = 0;
  const maxAttempts = 15;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${BACKEND_URL}/order-status/${orderId}`);
      const data = await res.json();
      console.log(`Attempt ${attempts}: status = ${data.status}`);

      if (data.status === "complete") {
        clearInterval(interval);
        fetchAndRenderOrder(orderId);

      } else if (data.status === "cancelled" || data.status === "failed") {
        clearInterval(interval);
        onPaymentFailed(data.status);

      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        onPaymentPending(orderId);
      }

    } catch (err) {
      console.error("Status check error:", err);
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        showError("Could not verify payment. Please contact us with Order ID: " + orderId);
      }
    }
  }, 1000);
}

async function fetchAndRenderOrder(orderId) {
  try {
    const res = await fetch(`${BACKEND_URL}/order-details/${orderId}`);
    const order = await res.json();

    // ✅ Back button redirects to glamborrow.co.za
    document.querySelector(".backbutton").onclick = () => {
      const orderParam = encodeURIComponent(JSON.stringify({
        orderId: order.orderId,
        email: order.email,
        contact: order.contact,
        whatsapp: order.whatsapp,
        schoolName: order.schoolName,
        amount: order.amount,
        createdAt: order.createdAt,
        cart: order.cart
      }));
      window.location.href = `https://glamborrow.co.za/home.html?paymentSuccess=true&order=${orderParam}`;
    };

    // Render success
    headerEl.textContent = "Payment Successful 🎉";
    subheadEl.textContent = "Thank you for your order!";
    bodyTextEl.textContent = "Your payment has been confirmed. Here are your order details:";

    detailsDiv.innerHTML = `
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Date:</strong> ${order.createdAt || "Today"}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Contact:</strong> ${order.contact}</p>
      <p><strong>WhatsApp:</strong> ${order.whatsapp}</p>
      <p><strong>School:</strong> ${order.schoolName || "N/A"}</p>
      <hr style="margin:12px 0; border-color:#ccc;">
      <h3 style="margin-bottom:8px;">Items Ordered:</h3>
      <ul style="list-style:none; padding:0;">
        ${order.cart.map(item => `
          <li style="margin-bottom:6px; padding:8px; background:#fff; border-radius:6px;">
            <strong>${item.name}</strong> (x${item.quantity})
            — R${(parseFloat(item.price) * item.quantity).toFixed(2)}
            <br><small style="color:#555;">Size: ${item.size} | Color: ${item.color} | ${item.event}</small>
          </li>
        `).join("")}
      </ul>
      <hr style="margin:12px 0; border-color:#ccc;">
      <p style="font-size:1.1em;"><strong>Total Paid: R${parseFloat(order.amount).toFixed(2)}</strong></p>
      <p style="color:#2aa006; margin-top:8px;">✅ Payment confirmed</p>
    `;

  } catch (err) {
    console.error("Order fetch error:", err);
    showError("Payment confirmed but couldn't load order details. Order ID: " + orderId);
  }
}

function onPaymentFailed(status) {
  headerEl.textContent = "Payment " + (status === "cancelled" ? "Cancelled" : "Failed");
  subheadEl.textContent = "Your payment was not completed.";
  bodyTextEl.textContent = "Your cart has been kept. You can try again.";
  detailsDiv.innerHTML = `
    <p style="color:red;">❌ Payment ${status}. Your order was not placed.</p>
    <button class="backbutton" onclick="window.location.href='https://glamborrow.co.za/checkout.html'"
      style="margin-top:12px;">Try Again</button>
  `;
}

function onPaymentPending(orderId) {
  detailsDiv.innerHTML = `
    <p style="color:orange;">⏳ Your payment is still being verified.</p>
    <p>Please check your email for confirmation, or contact us with your Order ID.</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
  `;
}

function showError(message) {
  headerEl.textContent = "Something went wrong";
  subheadEl.textContent = "We couldn't confirm your order.";
  bodyTextEl.textContent = "";
  detailsDiv.innerHTML = `<p style="color:red;">${message}</p>`;
}
