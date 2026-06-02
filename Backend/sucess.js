// sucess.js — reads orderId from URL, polls backend for payment confirmation

// ── Detect environment ────────────────────────────────────────────────────────
const BACKEND_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://glamborrow-1.onrender.com";

// ── DOM references ────────────────────────────────────────────────────────────
const detailsDiv  = document.getElementById("order-details");
const headerEl    = document.querySelector(".success-title");
const subheadEl   = document.querySelector(".success-card h2");
const bodyTextEl  = document.querySelector(".success-card > p");
const backBtn     = document.getElementById("back-btn");

// ── Read orderId from URL ─────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");

function goHome() {
  localStorage.removeItem("cart");
  window.location.href = "/index.html";
}

if (!orderId) {
  showError("No order ID found. If you completed payment, please contact us.");
} else {
  // Poll backend every 1.5s until confirmed (max 20 attempts = 30 seconds)
  let attempts = 0;
  const maxAttempts = 20;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res  = await fetch(`${BACKEND_URL}/order-status/${orderId}`);
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
  }, 1500);
}

// ── Fetch full order and render success card ──────────────────────────────────
async function fetchAndRenderOrder(orderId) {
  try {
    const res   = await fetch(`${BACKEND_URL}/order-details/${orderId}`);
    const order = await res.json();

    headerEl.textContent   = "Payment Successful 🎉";
    subheadEl.textContent  = "Thank you for your order!";
    bodyTextEl.textContent = "Your payment has been confirmed. Here are your order details:";

    detailsDiv.innerHTML = `
      <p><strong>Order ID:</strong> ${order.orderId}</p>
      <p><strong>Date:</strong> ${order.createdAt || "Today"}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Contact:</strong> ${order.contact}</p>
      <p><strong>WhatsApp:</strong> ${order.whatsapp || "N/A"}</p>
      <p><strong>School:</strong> ${order.schoolName || "N/A"}</p>
      <hr>
      <h3>Items Ordered</h3>
      <ul>
        ${(order.cart || []).map(item => `
          <li>
            <strong>${item.name}</strong> × ${item.quantity}
            — R${(parseFloat(item.price) * item.quantity).toFixed(2)}
            <br><small>Size: ${item.size} | Color: ${item.color} | ${item.event}</small>
          </li>
        `).join("")}
      </ul>
      <hr>
      <p class="total-line">Total Paid: R${parseFloat(order.amount).toFixed(2)}</p>
      <p class="confirmed-badge">✅ Payment confirmed</p>
    `;

    if (backBtn) backBtn.style.display = "inline-block";

  } catch (err) {
    console.error("Order fetch error:", err);
    showError("Payment confirmed but couldn't load details. Order ID: " + orderId);
    if (backBtn) backBtn.style.display = "inline-block";
  }
}

// ── Helper: payment failed ────────────────────────────────────────────────────
function onPaymentFailed(status) {
  headerEl.textContent   = status === "cancelled" ? "Payment Cancelled ❌" : "Payment Failed ❌";
  subheadEl.textContent  = "Your payment was not completed.";
  bodyTextEl.textContent = "Your cart has been kept. You can try again.";
  detailsDiv.innerHTML = `
    <p style="color:#fc8181; font-weight:600;">❌ Payment ${status}. Your order was not placed.</p>
    <br>
    <a href="/checkout.html" style="display:inline-block; padding:10px 22px; background:linear-gradient(135deg,#c9a84c,#e8c96a); color:#132030; border-radius:8px; font-weight:700; font-size:14px; text-decoration:none;">Try Again →</a>
  `;
}

// ── Helper: still pending after timeout ──────────────────────────────────────
function onPaymentPending(orderId) {
  headerEl.textContent   = "Payment Pending ⏳";
  subheadEl.textContent  = "We're still waiting for confirmation.";
  bodyTextEl.textContent = "This can take a few minutes. Check your email.";
  detailsDiv.innerHTML = `
    <p style="color:#f6ad55; font-weight:600;">⏳ Payment is still being verified.</p>
    <p style="color:rgba(255,255,255,0.5); font-size:13px; margin-top:8px;">Please check your email, or contact us with your Order ID.</p>
    <p style="margin-top:10px;"><strong>Order ID:</strong> ${orderId}</p>
  `;
  if (backBtn) backBtn.style.display = "inline-block";
}

// ── Helper: generic error ─────────────────────────────────────────────────────
function showError(message) {
  if (headerEl)   headerEl.textContent  = "Something went wrong";
  if (subheadEl)  subheadEl.textContent = "We couldn't confirm your order.";
  if (bodyTextEl) bodyTextEl.textContent = "";
  detailsDiv.innerHTML = `<p style="color:#fc8181;">${message}</p>`;
  if (backBtn) backBtn.style.display = "inline-block";
}
