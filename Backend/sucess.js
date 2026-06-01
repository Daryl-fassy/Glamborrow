const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");

if (orderId) {
  let attempts = 0;
  const maxAttempts = 15;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`https://glamborrow-1.onrender.com/order-status/${orderId}`);
      const data = await res.json();

      if (data.status === "complete") {
        clearInterval(interval);
        fetchAndRenderOrder(orderId);
      } else if (["cancelled","failed"].includes(data.status)) {
        clearInterval(interval);
        showError("Payment " + data.status);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        showError("Payment still pending. Order ID: " + orderId);
      }
    } catch {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        showError("Could not verify payment. Order ID: " + orderId);
      }
    }
  }, 1000);
}

async function fetchAndRenderOrder(orderId) {
  try {
    const res = await fetch(`https://glamborrow-1.onrender.com/order-details/${orderId}`);
    const order = await res.json();
    document.getElementById("order-details").innerHTML = JSON.stringify(order, null, 2);
  } catch {
    showError("Payment confirmed but couldn't load order details.");
  }
}

function showError(msg) {
  document.getElementById("order-details").innerHTML = `<p style="color:red;">${msg}</p>`;
}
