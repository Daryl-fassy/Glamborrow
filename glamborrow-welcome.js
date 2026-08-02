/**
 * glamborrow-welcome.js
 * ─────────────────────
 * Welcome popup + personalised stats dashboard for Glamborrow.
 * Drop this file next to glamborow.js and add ONE script tag to index.html:
 *   <script src="glamborrow-welcome.js"></script>
 *
 * This file is self-contained. It touches ONLY the elements it creates itself
 * plus the #gb-stats-dashboard container that must exist in index.html.
 * Nothing in glamborow.js, orders.js, checkout, or PayFast is modified.
 */

(function () {
  "use strict";

  /* ── Config ───────────────────────────────────────────────────────────────── */
  const BACKEND = (() => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    return "https://glamborrow-1.onrender.com";
  })();

  const LS_MODE   = "gb_mode";       // "grade12" | "explore"
  const LS_SCHOOL = "gb_school";     // school name string

  /* ── Inject styles (scoped to gb- prefix, won't clash) ───────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    /* ── Overlay ── */
    .gb-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(10, 20, 35, 0.88);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: gb-fade-in 0.25s ease;
    }
    @keyframes gb-fade-in { from { opacity: 0 } to { opacity: 1 } }

    /* ── Popup card ── */
    .gb-popup {
      background: #132030;
      border: 1px solid #2a4060;
      border-radius: 16px;
      padding: 32px 28px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      animation: gb-slide-up 0.3s cubic-bezier(.22,.68,0,1.2);
    }
    @keyframes gb-slide-up {
      from { opacity: 0; transform: translateY(24px) }
      to   { opacity: 1; transform: translateY(0) }
    }
    .gb-popup-logo {
      text-align: center;
      font-size: 1.05rem;
      color: gold;
      letter-spacing: 2px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .gb-popup h2 {
      text-align: center;
      color: #fff;
      margin: 0 0 8px;
      font-size: 1.25rem;
      line-height: 1.3;
    }
    .gb-popup p.gb-sub {
      text-align: center;
      color: rgba(255,255,255,0.55);
      font-size: 0.85rem;
      margin: 0 0 24px;
    }

    /* ── Choice buttons ── */
    .gb-choices { display: flex; flex-direction: column; gap: 12px; }
    .gb-choice-btn {
      display: flex; align-items: center; gap: 14px;
      background: #1a3050;
      border: 1.5px solid #2a4a6a;
      border-radius: 12px;
      padding: 16px 18px;
      cursor: pointer;
      color: #fff;
      font-size: 0.97rem;
      text-align: left;
      transition: background 0.18s, border-color 0.18s, transform 0.12s;
      width: 100%;
    }
    .gb-choice-btn:hover {
      background: #1f3d5e;
      border-color: gold;
      transform: translateY(-1px);
    }
    .gb-choice-btn .gb-icon {
      font-size: 1.6rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .gb-choice-btn .gb-label { font-weight: 600; }
    .gb-choice-btn .gb-desc  { color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 2px; }

    /* ── School search popup ── */
    .gb-school-search {
      width: 100%;
      padding: 11px 14px;
      border-radius: 8px;
      border: 1.5px solid #2a4a6a;
      background: #0e1d2d;
      color: #fff;
      font-size: 0.95rem;
      margin-bottom: 10px;
      box-sizing: border-box;
      outline: none;
    }
    .gb-school-search:focus { border-color: gold; }
    .gb-school-list {
      max-height: 220px;
      overflow-y: auto;
      border-radius: 8px;
      border: 1px solid #2a4060;
      background: #0e1d2d;
    }
    .gb-school-item {
      padding: 11px 14px;
      cursor: pointer;
      color: #dde;
      font-size: 0.9rem;
      border-bottom: 1px solid #1a2f45;
      transition: background 0.12s;
    }
    .gb-school-item:last-child { border-bottom: none; }
    .gb-school-item:hover { background: #1a3050; color: #fff; }
    .gb-school-item .gb-city {
      color: rgba(255,255,255,0.35);
      font-size: 0.75rem;
      display: block;
      margin-top: 2px;
    }
    .gb-school-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .gb-school-badge {
      background: rgba(245,197,24,0.15);
      border: 1px solid rgba(245,197,24,0.3);
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 0.72rem;
      color: #e8cc6a;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .gb-empty-msg { padding: 20px 16px; color: rgba(255,255,255,0.4); text-align: center; font-size: 0.85rem; line-height: 1.5; }

    /* ── Back link ── */
    .gb-back-link {
      background: none; border: none;
      color: rgba(255,255,255,0.45);
      font-size: 0.82rem; cursor: pointer;
      margin-top: 18px; width: 100%; text-align: center;
      padding: 4px;
      text-decoration: underline;
    }
    .gb-back-link:hover { color: rgba(255,255,255,0.8); }

    /* ═══════════════════════════════════════════════════════════════
       DASHBOARD
    ═══════════════════════════════════════════════════════════════ */
    #gb-stats-dashboard {
      margin: 0 10px 18px;
      border-radius: 14px;
      overflow: hidden;
      background: linear-gradient(135deg, #0e1d2d 0%, #132030 100%);
      border: 1.5px solid #2a4060;
      box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    }
    .gb-dash-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #1f3a55;
    }
    .gb-dash-title {
      color: gold;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .gb-dash-switch {
      background: none; border: 1px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.6);
      border-radius: 6px; padding: 5px 10px;
      font-size: 0.75rem; cursor: pointer;
      transition: all 0.15s;
    }
    .gb-dash-switch:hover { border-color: gold; color: gold; }

    .gb-dash-body { padding: 16px 20px 20px; }

    /* Stats row */
    .gb-stat-row {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px;
    }
    .gb-stat-card {
      flex: 1; min-width: 90px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 12px 14px;
      text-align: center;
    }
    .gb-stat-num {
      font-size: 1.5rem;
      font-weight: 700;
      color: gold;
      line-height: 1;
      margin-bottom: 4px;
    }
    .gb-stat-label {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.45);
      line-height: 1.3;
    }

    /* Adoption bar */
    .gb-adoption { margin-bottom: 18px; }
    .gb-adoption-label {
      display: flex; justify-content: space-between;
      font-size: 0.78rem; color: rgba(255,255,255,0.55);
      margin-bottom: 6px;
    }
    .gb-bar-track {
      height: 8px; border-radius: 99px;
      background: rgba(255,255,255,0.1);
      overflow: hidden;
    }
    .gb-bar-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #f5c518, #e8a800);
      transition: width 0.8s cubic-bezier(.22,.68,0,1.1);
      width: 0%;
    }

    /* Lists */
    .gb-section-label {
      font-size: 0.72rem; font-weight: 700;
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.8px; text-transform: uppercase;
      margin-bottom: 8px;
    }
    .gb-dash-cols { display: flex; gap: 14px; flex-wrap: wrap; }
    .gb-dash-col  { flex: 1; min-width: 130px; }

    .gb-tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .gb-tag {
      background: rgba(245,197,24,0.12);
      border: 1px solid rgba(245,197,24,0.25);
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 0.78rem;
      color: #e8cc6a;
    }
    .gb-tag .gb-tag-ct {
      color: rgba(255,255,255,0.4);
      font-size: 0.7rem;
      margin-left: 4px;
    }

    .gb-product-list { list-style: none; margin: 0; padding: 0; }
    .gb-product-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.82rem; color: rgba(255,255,255,0.75);
    }
    .gb-product-item:last-child { border-bottom: none; }
    .gb-product-ct {
      background: rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 0.72rem;
      color: rgba(255,255,255,0.45);
      flex-shrink: 0;
    }

    /* Loading / error */
    .gb-loading {
      text-align: center; padding: 24px; color: rgba(255,255,255,0.3);
      font-size: 0.85rem;
    }
    .gb-error {
      text-align: center; padding: 12px; color: #ff8080;
      font-size: 0.8rem;
    }

    /* Scrollbar inside school list */
    .gb-school-list::-webkit-scrollbar { width: 5px; }
    .gb-school-list::-webkit-scrollbar-track { background: transparent; }
    .gb-school-list::-webkit-scrollbar-thumb { background: #2a4060; border-radius: 99px; }
  `;
  document.head.appendChild(style);

  /* ── Helpers ──────────────────────────────────────────────────────────────── */
  function ls(key, val) {
    if (val === undefined) return localStorage.getItem(key);
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class")  e.className = v;
      else if (k === "style" && typeof v === "string") e.style.cssText = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }

  async function apiFetch(path) {
    const r = await fetch(BACKEND + path);
    if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
    return r.json();
  }

  /* ── Dashboard container (must exist in index.html) ──────────────────────── */
  function getDashboardEl() {
    let d = document.getElementById("gb-stats-dashboard");
    if (!d) {
      d = document.createElement("div");
      d.id = "gb-stats-dashboard";
      d.style.display = "none";
      // Insert before .Allproducts-grid
      const grid = document.querySelector(".Allproducts-grid, .js-products-grid");
      if (grid) grid.parentNode.insertBefore(d, grid);
      else document.body.appendChild(d);
    }
    return d;
  }

  /* ── Render dashboard ─────────────────────────────────────────────────────── */
  async function renderDashboard(mode, schoolName) {
    const dash = getDashboardEl();
    dash.style.display = "block";

    const isGrade12 = mode === "grade12";
    const title = isGrade12
      ? `🎓 ${schoolName}`
      : "🌍 Glamborrow — Overview";
    const switchLabel = isGrade12
      ? "Switch to Explore View"
      : "Switch to My School";

    dash.innerHTML = `
      <div class="gb-dash-header">
        <span class="gb-dash-title">${title}</span>
        <button class="gb-dash-switch js-gb-switch">${switchLabel}</button>
      </div>
      <div class="gb-dash-body">
        <div class="gb-loading">Loading stats…</div>
      </div>
    `;

    // switch button
    dash.querySelector(".js-gb-switch").addEventListener("click", () => {
      if (isGrade12) {
        ls(LS_MODE, "explore");
        ls(LS_SCHOOL, null);
        renderDashboard("explore", null);
      } else {
        showSchoolPopup();
      }
    });

    try {
      let data;
      if (isGrade12) {
        data = await apiFetch(`/stats/school/${encodeURIComponent(schoolName)}`);
      } else {
        data = await apiFetch("/stats/global");
      }
      renderDashboardData(dash, isGrade12, data);
    } catch (e) {
      console.error("GB stats error:", e);
      dash.querySelector(".gb-dash-body").innerHTML =
        `<div class="gb-error">Could not load stats. Please try again later.</div>`;
    }
  }

  function renderDashboardData(dash, isGrade12, data) {
    const body = dash.querySelector(".gb-dash-body");

    // ── build stat cards
    const statCards = isGrade12
      ? [
          { num: data.learnerCount || 0,
            label: "Learners from your school ordered" },
          { num: data.adoptionPct != null ? `${data.adoptionPct}%` : "—",
            label: "of Grade 12s at your school" },
          { num: data.totalOrders || 0,
            label: "Total orders from your school" }
        ]
      : [
          { num: data.totalSchools  || 0, label: "Schools served" },
          { num: data.totalLearners || 0, label: "Learners ordered" },
          { num: data.totalOrders   || 0, label: "Total orders" }
        ];

    const statsRow = el("div", { class: "gb-stat-row" },
      statCards.map(sc =>
        el("div", { class: "gb-stat-card" }, [
          el("div", { class: "gb-stat-num" }, [String(sc.num)]),
          el("div", { class: "gb-stat-label" }, [sc.label])
        ])
      )
    );

    // ── adoption bar (grade12 only)
    let adoptionBar = null;
    if (isGrade12 && data.adoptionPct != null) {
      const pct = Math.min(data.adoptionPct, 100);
      adoptionBar = el("div", { class: "gb-adoption" }, [
        el("div", { class: "gb-adoption-label" }, [
          el("span", {}, ["Grade 12 adoption at your school"]),
          el("span", {}, [`${pct}%`])
        ]),
        el("div", { class: "gb-bar-track" }, [
          el("div", { class: "gb-bar-fill", id: "gb-bar-fill" })
        ])
      ]);
    }

    // ── products (rented and bought are always separate lists, never merged)
    // /stats/school returns arrays (topProductsRented / topProductsBought);
    // /stats/global returns a single object or null (topRentedProduct / topBoughtProduct).
    const rentedItems = isGrade12
      ? (data.topProductsRented || [])
      : (data.topRentedProduct ? [data.topRentedProduct] : []);
    const boughtItems = isGrade12
      ? (data.topProductsBought || [])
      : (data.topBoughtProduct ? [data.topBoughtProduct] : []);
    const topCats = (data.topCategories || []);

    function buildProdList(items, unitLabel) {
      return el("ul", { class: "gb-product-list" },
        items.length
          ? items.map(p =>
              el("li", { class: "gb-product-item" }, [
                el("span", {}, [p.name || "Unknown"]),
                el("span", { class: "gb-product-ct" }, [`${p.count} ${unitLabel}`])
              ])
            )
          : [el("li", { class: "gb-product-item" }, ["Popularity data coming soon 🏆"])]
      );
    }

    const catTags = el("div", { class: "gb-tag-list" },
      topCats.length
        ? topCats.map(c =>
            el("span", { class: "gb-tag" }, [
              c.category || "Other",
              el("span", { class: "gb-tag-ct" }, [` ×${c.count}`])
            ])
          )
        : [el("span", { class: "gb-tag" }, ["No data yet"])]
    );

    // ── assemble body
    const cols = el("div", { class: "gb-dash-cols" }, [
      el("div", { class: "gb-dash-col" }, [
        el("div", { class: "gb-section-label" }, [isGrade12 ? "Popular to rent" : "Most rented product"]),
        buildProdList(rentedItems, "rented")
      ]),
      el("div", { class: "gb-dash-col" }, [
        el("div", { class: "gb-section-label" }, [isGrade12 ? "Popular to buy" : "Most bought product"]),
        buildProdList(boughtItems, "bought")
      ]),
      el("div", { class: "gb-dash-col" }, [
        el("div", { class: "gb-section-label" }, ["Popular categories"]),
        catTags
      ])
    ]);

    body.innerHTML = "";
    body.appendChild(statsRow);
    if (adoptionBar) body.appendChild(adoptionBar);
    body.appendChild(cols);

    // animate bar after paint
    if (adoptionBar) {
      setTimeout(() => {
        const fill = document.getElementById("gb-bar-fill");
        if (fill) fill.style.width = `${Math.min(data.adoptionPct, 100)}%`;
      }, 80);
    }
  }

  /* ── Overlay helpers ──────────────────────────────────────────────────────── */
  function closeOverlay() {
    const ov = document.getElementById("gb-overlay");
    if (ov) ov.remove();
  }

  function showOverlay(contentEl) {
    closeOverlay();
    const ov = el("div", { class: "gb-overlay", id: "gb-overlay" }, [
      el("div", { class: "gb-popup" }, [contentEl])
    ]);
    // click outside to dismiss (if mode already set)
    ov.addEventListener("click", e => {
      if (e.target === ov && ls(LS_MODE)) closeOverlay();
    });
    document.body.appendChild(ov);
  }

  /* ── Welcome popup (step 1) ───────────────────────────────────────────────── */
  function showWelcomePopup() {
    const content = document.createDocumentFragment();

    const logoDiv = el("div", { class: "gb-popup-logo" }, ["✨ GLAMBORROW"]);
    const heading = el("h2", {}, ["Welcome! How would you like to explore?"]);
    const sub     = el("p",  { class: "gb-sub" }, ["We'll personalise your experience"]);

    const grade12Btn = el("button", {
      class: "gb-choice-btn",
      onclick: () => showSchoolPopup()
    }, [
      el("span", { class: "gb-icon" }, ["🎓"]),
      el("div", {}, [
        el("div", { class: "gb-label" }, ["I am a Grade 12 Learner"]),
        el("div", { class: "gb-desc" }, ["See stats and trends for your school"])
      ])
    ]);

    const exploreBtn = el("button", {
      class: "gb-choice-btn",
      onclick: () => {
        ls(LS_MODE, "explore");
        ls(LS_SCHOOL, null);
        closeOverlay();
        renderDashboard("explore", null);
      }
    }, [
      el("span", { class: "gb-icon" }, ["🌍"]),
      el("div", {}, [
        el("div", { class: "gb-label" }, ["I'm Just Exploring"]),
        el("div", { class: "gb-desc" }, ["See overall Glamborrow stats"])
      ])
    ]);

    const choices = el("div", { class: "gb-choices" }, [grade12Btn, exploreBtn]);

    const wrapper = document.createDocumentFragment();
    [logoDiv, heading, sub, choices].forEach(n => content.appendChild(n));
    showOverlay(content);
  }

  /* ── School picker popup (step 2) ────────────────────────────────────────── */
  function showSchoolPopup() {
    const content = document.createDocumentFragment();

    const heading = el("h2", {}, ["Choose your school"]);
    const sub     = el("p", { class: "gb-sub" }, ["Only schools that have agreed to work with Glamborrow appear here"]);

    const searchInput = el("input", {
      class: "gb-school-search",
      type: "text",
      placeholder: "Type your school name…",
      autocomplete: "off"
    });

    const list = el("div", { class: "gb-school-list" });

    async function loadSchools(query = "") {
      list.innerHTML = '<div class="gb-empty-msg">⏳ Loading schools…</div>';
      try {
        const qs = query ? "?q=" + encodeURIComponent(query) : "";
        const schools = await apiFetch("/schools" + qs);

        if (!schools.length && !query) {
          list.innerHTML = '<div class="gb-empty-msg" style="line-height:1.6;">🏫 No schools are listed yet.<br><span style="font-size:0.8rem;color:rgba(255,255,255,0.45);margin-top:8px;display:block;">Glamborrow works with selected schools only. To enquire about bringing Glamborrow to your school, please contact us on WhatsApp: <a href=\'https://wa.me/27739525206\' style=\'color:gold;\'>073 952 5206</a> — we will confirm availability for your school.</span></div>';
          return;
        }
        if (!schools.length && query) {
          list.innerHTML = '<div class="gb-empty-msg">No schools matching that name.<br><span style="font-size:0.78rem;color:rgba(255,255,255,0.3);margin-top:6px;display:block;">In order to add your school and be able to use Glamborrow, please contact us on WhatsApp: <a href="https://wa.me/27739525206" style="color:#c9a84c;">073 952 5206</a> so we can see if we can be available for your school.be the first in your school .Glamborrow Rent With Pride</span></div>';
          return;
        }

        list.innerHTML = "";
        schools.forEach(s => {
          const nameSpan  = document.createElement("span");
          nameSpan.textContent = s.name;

          const badge = document.createElement("span");
          badge.className = "gb-school-badge";
          badge.textContent = s.orderCount + " order" + (s.orderCount !== 1 ? "s" : "");

          const nameRow = document.createElement("div");
          nameRow.className = "gb-school-name-row";
          nameRow.appendChild(nameSpan);
          nameRow.appendChild(badge);

          const item = document.createElement("div");
          item.className = "gb-school-item";
          item.appendChild(nameRow);

          if (s.city) {
            const citySpan = document.createElement("span");
            citySpan.className = "gb-city";
            citySpan.textContent = s.city;
            item.appendChild(citySpan);
          }

          item.addEventListener("click", () => {
            ls(LS_MODE, "grade12");
            ls(LS_SCHOOL, s.name);
            closeOverlay();
            renderDashboard("grade12", s.name);
          });
          list.appendChild(item);
        });
      } catch (err) {
        console.error("School load error:", err);
        list.innerHTML = '<div class="gb-empty-msg">⚠️ Could not load schools. Check your connection.</div>';
      }
    }

    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadSchools(searchInput.value.trim()), 300);
    });

    const backBtn = el("button", { class: "gb-back-link", onclick: showWelcomePopup }, [
      "← Back"
    ]);

    [heading, sub, searchInput, list, backBtn].forEach(n => content.appendChild(n));
    showOverlay(content);
    loadSchools();
    setTimeout(() => searchInput.focus(), 120);
  }

  /* ── Entry point ──────────────────────────────────────────────────────────── */
  function init() {
    const mode   = ls(LS_MODE);
    const school = ls(LS_SCHOOL);

    if (!mode) {
      // First visit — show welcome popup
      showWelcomePopup();
    } else if (mode === "grade12" && school) {
      renderDashboard("grade12", school);
    } else {
      renderDashboard("explore", null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
