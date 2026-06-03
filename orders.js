// orders.js — handles order history display + picks up new orders from URL params
// Include this on index.html: <script src="orders.js"></script>

(function () {

  // ── Step 1: Check if redirected back from success page ─────────────────────
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get("clearCart") === "1") {
    // Clear the cart on the correct domain (GitHub Pages)
    localStorage.removeItem("cart");
    console.log("✅ Cart cleared after successful payment");
  }

  if (urlParams.get("order")) {
    try {
      const newOrder = JSON.parse(decodeURIComponent(urlParams.get("order")));
      // Save into order history array
      const history = JSON.parse(localStorage.getItem("orderHistory")) || [];
      // Avoid duplicates if user refreshes
      const exists = history.some(o => o.orderId === newOrder.orderId);
      if (!exists) {
        history.unshift(newOrder); // newest first
        localStorage.setItem("orderHistory", JSON.stringify(history));
        console.log("✅ Order saved to history:", newOrder.orderId);
      }
    } catch (e) {
      console.warn("Could not parse order from URL:", e);
    }
    // Clean the URL so the params don't show permanently
    window.history.replaceState({}, "", window.location.pathname);
  }

  // ── Step 2: Render order history when orders panel is opened ───────────────
  function renderOrders() {
    const container = document.getElementById("orders-list");
    if (!container) return;

    const history = JSON.parse(localStorage.getItem("orderHistory")) || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:32px 0; color:rgba(255,255,255,0.35); font-size:14px;">
          No orders yet. Your order history will appear here after checkout.
        </div>`;
      return;
    }

    container.innerHTML = history.map(order => `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-id">Order #${order.orderId}</span>
          <span class="order-date">${order.date || order.createdAt || ""}</span>
        </div>
        <div class="order-card-body">
          <div class="order-meta">
            <span>📧 ${order.customerEmail || order.email || "N/A"}</span>
            <span>🏫 ${order.schoolName || "N/A"}</span>
            <span>📞 ${order.contactNumber || order.contact || "N/A"}</span>
          </div>
          <ul class="order-items">
            ${(order.items || order.cart || []).map(item => `
              <li>
                <strong>${item.name}</strong> × ${item.quantity || 1}
                <span class="order-item-price">R${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                <br><small>${item.event || ""} · Size: ${item.size || "N/A"} · Color: ${item.color || "N/A"}</small>
              </li>
            `).join("")}
          </ul>
          <div class="order-total">Total: R${parseFloat(order.amount).toFixed(2)}</div>
        </div>
      </div>
    `).join("");
  }

  // Run on load and expose for manual call
  renderOrders();
  window.renderOrders = renderOrders;

})();
