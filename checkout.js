import { products } from "./products-data.js";
import { BuyPrice, RentalPrice } from "./priceFunctions.js";

const cart = JSON.parse(localStorage.getItem("cart")) || [];

// Base cart total (items only, no delivery). Delivery is added on top once a
// school is picked — see updateTotalDisplay().
let cartItemsTotal = 0;
let selectedSchoolDeliveryFee = 0;

function updateTotalDisplay() {
  const totalEl = document.getElementById("total");
  if (!totalEl) return;
  if (cart.length === 0) {
    totalEl.textContent = "";
    return;
  }
  const grandTotal = cartItemsTotal + selectedSchoolDeliveryFee;
  if (selectedSchoolDeliveryFee > 0) {
    totalEl.innerHTML = `
      <span style="display:block; font-size:12px; font-weight:400; color:rgba(255,255,255,0.5); text-align:right; margin-bottom:2px;">
        Items: R${cartItemsTotal.toFixed(2)} + Delivery: R${selectedSchoolDeliveryFee.toFixed(2)}
      </span>
      Total: R${grandTotal.toFixed(2)}
    `;
  } else {
    totalEl.textContent = `Total: R${grandTotal.toFixed(2)}`;
  }
}
// Exposed so the school-autocomplete IIFE below can update the total
// as soon as a school (and its delivery fee) is picked.
window._setSelectedDeliveryFee = (fee) => {
  selectedSchoolDeliveryFee = Number(fee) || 0;
  updateTotalDisplay();
};

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
      // Only fall back to the product's base price if this line item didn't
      // come in with its own price already (e.g. a plain base-price item).
      // Never clobber it here — `finalPrice` below is what actually carries
      // any suitOptions override (like the 2-piece @ R389) and must survive.
      item.price = item.price ?? product.price;
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

    const priceValue = typeof item.finalPrice === "number"
      ? item.finalPrice
      : (item.event?.toLowerCase() === "rent"
          ? RentalPrice(item.price)
          : BuyPrice(item.price));

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

  cartItemsTotal = total;
  updateTotalDisplay();
}

renderCartForCheckout();

// ══════════════════════════════════════════════════════════════════════════════
// SCHOOL AUTOCOMPLETE
// Pulls approved schools from the backend (same /schools endpoint as homepage).
// Learners cannot type a school name freely — they must select from the list.
// ══════════════════════════════════════════════════════════════════════════════
(function initSchoolAutocomplete() {
  const BACKEND = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://glamborrow-1.onrender.com";

  const input     = document.getElementById("school");
  const dropdown  = document.getElementById("school-dropdown");
  const clearBtn  = document.getElementById("school-clear");

  if (!input || !dropdown) return;

  let allSchools   = [];   // full list fetched once on focus
  let selectedName = "";   // the confirmed school name
  let highlighted  = -1;  // keyboard nav index
  let fetchedOnce  = false;

  // ── Fetch schools from backend ──────────────────────────────────────────────
  async function fetchSchools(query) {
    const qs = query ? "?q=" + encodeURIComponent(query) : "";
    const res = await fetch(BACKEND + "/schools" + qs);
    if (!res.ok) throw new Error("fetch failed");
    return res.json();
  }

  // ── Render dropdown list ────────────────────────────────────────────────────
  function renderList(schools, query) {
    dropdown.innerHTML = "";
    highlighted = -1;

    if (!schools.length) {
      dropdown.innerHTML = `
        <div class="school-opt-empty">
          ${query
            ? `No schools matching "<strong>${query}</strong>".<br>
               <span style="font-size:11.5px;color:rgba(255,255,255,0.25);">
                 Contact us on WhatsApp
                 <a href="https://wa.me/27739525206" style="color:#c9a84c;">073 952 5206</a>
                 to check if your school is approved.
               </span>`
            : `No approved schools found.<br>
               <span style="font-size:11.5px;color:rgba(255,255,255,0.25);">
                 Contact us on WhatsApp
                 <a href="https://wa.me/27739525206" style="color:#c9a84c;">073 952 5206</a>.
               </span>`
          }
        </div>`;
      openDropdown();
      return;
    }

    schools.forEach((s, i) => {
      const opt = document.createElement("div");
      opt.className = "school-opt";
      opt.dataset.index = i;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = s.name;

      const badge = document.createElement("span");
      badge.className = "school-opt-badge";
      const deliveryLabel = s.deliveryFee ? `R${Number(s.deliveryFee).toFixed(2)} delivery` : "Free delivery";
      badge.textContent = deliveryLabel;

      opt.appendChild(nameSpan);
      opt.appendChild(badge);

      opt.addEventListener("mousedown", (e) => {
        e.preventDefault(); // prevent blur firing before click
        selectSchool(s.name, s.deliveryFee);
      });

      dropdown.appendChild(opt);
    });

    openDropdown();
  }

  function openDropdown()  { dropdown.classList.add("open"); }
  function closeDropdown() { dropdown.classList.remove("open"); highlighted = -1; }

  // ── Confirm a school selection ──────────────────────────────────────────────
  function selectSchool(name, deliveryFee) {
    selectedName = name;
    input.value  = name;
    input.classList.add("school-locked");
    input.readOnly = true;
    clearBtn.classList.add("visible");
    closeDropdown();
    // Remove error state if present
    input.classList.remove("input-error");
    const prev = document.getElementById("school-wrap").parentElement.querySelector(".field-error-msg");
    if (prev) prev.remove();

    // Immediately fold this school's delivery cost into the order total
    if (window._setSelectedDeliveryFee) window._setSelectedDeliveryFee(deliveryFee || 0);
  }

  // ── Clear selection ─────────────────────────────────────────────────────────
  function clearSchool() {
    selectedName   = "";
    input.value    = "";
    input.readOnly = false;
    input.classList.remove("school-locked");
    clearBtn.classList.remove("visible");
    closeDropdown();
    input.focus();

    // Remove delivery cost from the total since no school is selected anymore
    if (window._setSelectedDeliveryFee) window._setSelectedDeliveryFee(0);
  }

  clearBtn.addEventListener("click", clearSchool);

  // ── On focus — load full list the first time ────────────────────────────────
  input.addEventListener("focus", async () => {
    if (input.classList.contains("school-locked")) return;
    if (!fetchedOnce) {
      dropdown.innerHTML = '<div class="school-opt-loading">⏳ Loading schools…</div>';
      openDropdown();
      try {
        allSchools  = await fetchSchools("");
        fetchedOnce = true;
        renderList(allSchools, "");
      } catch {
        dropdown.innerHTML = '<div class="school-opt-empty">⚠️ Could not load schools. Check your connection.</div>';
      }
      return;
    }
    renderList(allSchools, "");
  });

  // ── Live search with debounce ───────────────────────────────────────────────
  let debounce;
  input.addEventListener("input", () => {
    if (input.classList.contains("school-locked")) return;
    selectedName = ""; // reset confirmed selection on type
    clearBtn.classList.remove("visible");
    const q = input.value.trim();
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      try {
        dropdown.innerHTML = '<div class="school-opt-loading">⏳ Searching…</div>';
        openDropdown();
        const results = await fetchSchools(q);
        renderList(results, q);
      } catch {
        dropdown.innerHTML = '<div class="school-opt-empty">⚠️ Could not load. Try again.</div>';
      }
    }, 280);
  });

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  input.addEventListener("keydown", (e) => {
    const opts = dropdown.querySelectorAll(".school-opt");
    if (!opts.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlighted = Math.min(highlighted + 1, opts.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      opts[highlighted].dispatchEvent(new Event("mousedown"));
      return;
    } else if (e.key === "Escape") {
      closeDropdown();
      return;
    } else {
      return;
    }

    opts.forEach((o, i) => o.classList.toggle("highlighted", i === highlighted));
    opts[highlighted]?.scrollIntoView({ block: "nearest" });
  });

  // ── Close on outside click ──────────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (!document.getElementById("school-wrap")?.contains(e.target)) {
      closeDropdown();
      // If user typed but didn't select, clear the field
      if (!selectedName && input.value) {
        clearSchool();
      }
    }
  });

  // ── Expose selectedName for form submission validation ──────────────────────
  window._getSelectedSchool = () => selectedName;
  window._getSelectedSchoolDeliveryFee = () => selectedSchoolDeliveryFee;

})();

// Handle checkout form submission
document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  // Use the confirmed selection from autocomplete (not raw typed value)
  const schoolName = (window._getSelectedSchool && window._getSelectedSchool())
    || document.getElementById("school").value.trim();
  const contact = document.getElementById("contact").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const secretCode = document.getElementById("secretCode").value;

  // ── Validate required fields before anything else ────────────────
  const requiredFields = [
    { id: "email",      label: "Email Address" },
    { id: "school",     label: "School Name" },
    { id: "contact",    label: "Contact Number" },
    { id: "secretCode", label: "Secret Code" }
  ];

  // Clear any previous error states
  requiredFields.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("input-error");
      const prev = el.parentElement.querySelector(".field-error-msg");
      if (prev) prev.remove();
    }
  });

  // Find the first empty required field
  // For school: also check that the user picked from the dropdown (not free-typed)
  const firstEmpty = requiredFields.find(({ id }) => {
    if (id === "school") {
      const confirmed = window._getSelectedSchool && window._getSelectedSchool();
      return !confirmed;
    }
    const val = document.getElementById(id)?.value.trim();
    return !val;
  });

  if (firstEmpty) {
    const el = document.getElementById(firstEmpty.id);
    el.classList.add("input-error");
    const msg = document.createElement("p");
    msg.className = "field-error-msg";
    msg.textContent = `${firstEmpty.label} is required.`;
    el.insertAdjacentElement("afterend", msg);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
    el.addEventListener("input", () => {
      el.classList.remove("input-error");
      const m = el.parentElement.querySelector(".field-error-msg");
      if (m) m.remove();
    }, { once: true });
    return;
  }
  // ─────────────────────────────────────────────────────────────────

  // ── Show loading overlay immediately on click ─────────────────────
  const overlay = document.getElementById("payment-loading-overlay");
  const submitBtn = document.querySelector(".js-checkout-button");
  if (overlay) overlay.classList.add("active");
  if (submitBtn) submitBtn.disabled = true;

  // Animate the loading steps: step 1 already "done", step 2 "active"
  // After 1.2s mark step 2 done + step 3 active (shows progress while fetch runs)
  setTimeout(() => {
    const s2 = document.getElementById("plo-s2");
    const s3 = document.getElementById("plo-s3");
    if (s2) { s2.classList.remove("active"); s2.classList.add("done"); }
    if (s3) s3.classList.add("active");
  }, 1200);
  // ─────────────────────────────────────────────────────────────────

  // Build enriched cart with normalized event key
  const enrichedCart = cart.map(item => {
    const event = item.event || item.Event || "Rent";
    const priceValue = (typeof item.finalPrice === "number"
      ? item.finalPrice
      : (event.toLowerCase() === "rent"
          ? RentalPrice(item.price)
          : BuyPrice(item.price))
    ).toFixed(2);

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

  const itemsTotal = enrichedCart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const deliveryFee = (window._getSelectedSchoolDeliveryFee && window._getSelectedSchoolDeliveryFee()) || 0;
  const totalAmount = (itemsTotal + deliveryFee).toFixed(2);

  const orderId = Date.now().toString();

  // ✅ Save lastOrder to localStorage BEFORE redirecting to PayFast
  // This is what success page reads to display order details
  const lastOrder = {
    orderId,
    customerEmail: email,
    contactNumber: contact,
    whatsappNumber: whatsapp,
    schoolName,
    deliveryFee,
    amount: parseFloat(totalAmount),
    items: enrichedCart,
    date: new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })
  };
  localStorage.setItem("lastOrder", JSON.stringify(lastOrder));

  try {
    const response = await fetch("https://glamborrow-1.onrender.com/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId,
    customerEmail: email,
    schoolName,
    deliveryFee,
    contact,
    whatsapp,
    secretCode,
    cart: enrichedCart,
    amount: totalAmount
  })
});

    const data = await response.json();
    console.log("Checkout response:", data);

    if (data.payfastUrl && data.fields && data.signature) {
      // ✅ POST directly to PayFast — avoids browser URL re-encoding breaking the signature
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payfastUrl;

      const allFields = { ...data.fields, signature: data.signature };
      for (const [key, value] of Object.entries(allFields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      // Delay submit by two frames so the browser paints the overlay first
      requestAnimationFrame(() => requestAnimationFrame(() => form.submit()));
    }
  } catch (err) {
    console.error("Checkout error:", err);
    // Hide overlay so user can retry
    if (overlay) overlay.classList.remove("active");
    if (submitBtn) submitBtn.disabled = false;
    // Reset steps back to initial state
    const s2 = document.getElementById("plo-s2");
    const s3 = document.getElementById("plo-s3");
    if (s2) { s2.classList.remove("done"); s2.classList.add("active"); }
    if (s3) s3.classList.remove("active");
    alert("Something went wrong. Please try again.");
  }
});