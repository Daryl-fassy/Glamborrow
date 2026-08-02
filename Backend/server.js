require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Environment ───────────────────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const BACKEND_URL = IS_PRODUCTION
  ? "https://glamborrow-1.onrender.com"
  : "http://localhost:3000";
const FRONTEND_URL = IS_PRODUCTION
  ? "https://glamborrow.co.za"
  : "http://127.0.0.1:5500";

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://glamborrow.co.za",
    "https://www.glamborrow.co.za",
    "https://glamborrow-1.onrender.com",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://localhost:5500"
  ],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const dbName = mongoose.connection.db.databaseName;
    console.log(`✅ Connected to MongoDB — database: "${dbName}"`);
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ── Order Schema ──────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  orderId:    { type: String, unique: true },
  email:      String,
  amount:     Number,
  status:     { type: String, default: "pending" },
  createdAt:  {
    type: String,
    default: () => new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour12: false
    })
  },
  schoolName: String,
  deliveryFee: { type: Number, default: 0 },
  contact:    String,
  whatsapp:   String,
  secretCode: String,
  cart:       Array
});
const Order = mongoose.model("Order", orderSchema);

// ── School Schema ─────────────────────────────────────────────────────────────
// Schools are added by admin. They appear on the frontend as soon as they are
// added here — NO order is required for a school to show up.
// `active` controls whether the school appears in the frontend dropdown.
const schoolSchema = new mongoose.Schema({
  name:         { type: String, unique: true, trim: true },
  grade12Total: { type: Number, default: 0 },
  province:     { type: String, default: "" },
  city:         { type: String, default: "" },
  deliveryFee:  { type: Number, default: 0 },  // ← NEW: delivery cost for this school
  active:       { type: Boolean, default: true }   // ← NEW: toggle visibility
});
const School = mongoose.model("School", schoolSchema);

app.use(express.static(__dirname));

// ── Admin middleware ──────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── ADMIN: Get all orders ─────────────────────────────────────────────────────
app.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Admin orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Update order status ────────────────────────────────────────────────
app.post("/admin/update-order", requireAdmin, async (req, res) => {
  const { orderId, status } = req.body;
  const validStatuses = ["pending", "complete", "processing", "delivered", "returned", "refunded", "cancelled", "failed"];

  if (!orderId || !status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid orderId or status" });
  }

  try {
    const result = await Order.updateOne({ orderId }, { status });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log(`✅ Admin updated order ${orderId} → ${status}`);
    res.json({ success: true, orderId, status });
  } catch (err) {
    console.error("❌ Admin update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ── ADMIN: Get all schools (including inactive) ───────────────────────────────
// GET /admin/schools — returns every school record with order counts for the
// admin panel. Unlike /schools (public), this includes inactive schools.
app.get("/admin/schools", requireAdmin, async (req, res) => {
  try {
    const schools = await School.find().sort({ name: 1 });

    // Enrich with real order counts from Order collection
    const names = schools.map(s => s.name);
    const orderCounts = await Order.aggregate([
      { $match: { schoolName: { $in: names }, status: "complete" } },
      { $group: { _id: "$schoolName", orderCount: { $sum: 1 } } }
    ]);
    const countMap = {};
    orderCounts.forEach(o => { countMap[o._id] = o.orderCount; });

    const result = schools.map(s => ({
      name:         s.name,
      grade12Total: s.grade12Total,
      city:         s.city,
      province:     s.province,
      deliveryFee:  s.deliveryFee || 0,
      active:       s.active,
      orderCount:   countMap[s.name] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ /admin/schools error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Upsert a school record ─────────────────────────────────────────────
// POST /admin/school  body: { name, grade12Total, city, province, active }
app.post("/admin/school", requireAdmin, async (req, res) => {
  const { name, grade12Total, city, province, deliveryFee, active } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const doc = await School.findOneAndUpdate(
      { name },
      {
        $set: {
          grade12Total: grade12Total || 0,
          city:         city         || "",
          province:     province     || "",
          deliveryFee:  deliveryFee  || 0,
          // Only update `active` when explicitly passed
          ...(typeof active === "boolean" ? { active } : {})
        }
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, school: doc });
  } catch (err) {
    console.error("❌ /admin/school error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Toggle a school active/inactive ────────────────────────────────────
// POST /admin/school/toggle  body: { name, active }
app.post("/admin/school/toggle", requireAdmin, async (req, res) => {
  const { name, active } = req.body;
  if (!name || typeof active !== "boolean") {
    return res.status(400).json({ error: "name and active (boolean) are required" });
  }
  try {
    const doc = await School.findOneAndUpdate(
      { name },
      { $set: { active } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "School not found" });
    res.json({ success: true, school: doc });
  } catch (err) {
    console.error("❌ /admin/school/toggle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Delete a school ────────────────────────────────────────────────────
// DELETE /admin/school  body: { name }
app.delete("/admin/school", requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await School.deleteOne({ name });
    if (result.deletedCount === 0) return res.status(404).json({ error: "School not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ /admin/school DELETE error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Product rotation ────────────────────────────────────────────────────
// GET /admin/product-rotation
// Real rental/purchase counts per product, grouped by name + size + color
// (two items only count as "the same product" when all three match).
// Every product is included, even ones with under 3 rentals — the admin
// needs to see the slow movers too, not just the popular ones.
//   status: "increase_price" → more than 10 rentals, demand supports a price rise
//           "ready_to_buy"   → 3 or more rentals, proven enough to stock as a buy item
//           "not_ready"      → under 3 rentals, not proven yet
app.get("/admin/product-rotation", requireAdmin, async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: "complete" } },
      { $unwind: "$cart" },
      { $group: {
          _id: {
            name:   "$cart.name",
            size:   { $ifNull: ["$cart.size", ""] },
            color:  { $ifNull: ["$cart.color", ""] },
            school: "$schoolName"
          },
          count: { $sum: { $ifNull: ["$cart.quantity", 1] } }
      } },
      { $group: {
          _id: { name: "$_id.name", size: "$_id.size", color: "$_id.color" },
          totalRentals: { $sum: "$count" },
          schools: { $push: { school: "$_id.school", count: "$count" } }
      } },
      { $sort: { totalRentals: -1 } }
    ]);

    const result = rows.map(r => {
      const bySchool = [...r.schools].sort((a, b) => b.count - a.count);
      const top = bySchool[0] || null;
      let status = "not_ready";
      if (r.totalRentals > 10) status = "increase_price";
      else if (r.totalRentals >= 3) status = "ready_to_buy";

      return {
        name:  r._id.name,
        size:  r._id.size  || "",
        color: r._id.color || "",
        totalRentals: r.totalRentals,
        topSchool:        top ? top.school : null,
        topSchoolRentals: top ? top.count  : 0,
        schools: bySchool,
        status
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ /admin/product-rotation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ADMIN: Town breakdown ─────────────────────────────────────────────────────
// GET /admin/towns
// Simple town-level rollup (no provinces — every school on the platform is
// currently in Limpopo, so town is the only geography that matters right now).
app.get("/admin/towns", requireAdmin, async (req, res) => {
  try {
    const schools = await School.find({}, "name city");
    const schoolTown = {};
    schools.forEach(s => { schoolTown[s.name] = s.city || "Unknown"; });

    const orders = await Order.find({ status: "complete" }, "schoolName cart");
    const townMap = {};
    orders.forEach(o => {
      const town = schoolTown[o.schoolName] || "Unknown";
      if (!townMap[town]) {
        townMap[town] = { town, schools: new Set(), totalRentals: 0, products: {} };
      }
      townMap[town].schools.add(o.schoolName);
      (o.cart || []).forEach(item => {
        const qty = item.quantity || 1;
        townMap[town].totalRentals += qty;
        townMap[town].products[item.name] = (townMap[town].products[item.name] || 0) + qty;
      });
    });

    const result = Object.values(townMap).map(t => {
      const topProduct = Object.entries(t.products).sort((a, b) => b[1] - a[1])[0];
      return {
        town: t.town,
        schools: t.schools.size,
        totalRentals: t.totalRentals,
        topProduct: topProduct ? topProduct[0] : null
      };
    }).sort((a, b) => b.totalRentals - a.totalRentals);

    res.json(result);
  } catch (err) {
    console.error("❌ /admin/towns error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PUBLIC: Schools list ──────────────────────────────────────────────────────
// Returns ONLY schools added via admin panel AND marked active=true.
// Order data is used ONLY to enrich with order counts — NOT as the source
// of which schools exist. This means:
//   - Add a school in admin → it appears immediately on the frontend
//   - Remove/deactivate a school in admin → it disappears from frontend
//   - Orders only affect the order count badge, nothing else
app.get("/schools", async (req, res) => {
  try {
    const searchQuery = req.query.q ? req.query.q.trim() : "";

    // Query the School collection (source of truth for allowed schools)
    const filter = { active: true };
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" };
    }

    const schools = await School.find(filter, "name grade12Total city province deliveryFee")
      .sort({ name: 1 })
      .limit(100);

    if (!schools.length) {
      return res.json([]);
    }

    // Enrich with real order counts from Order collection (analytics only)
    const schoolNames = schools.map(s => s.name);
    const orderCounts = await Order.aggregate([
      {
        $match: {
          schoolName: { $in: schoolNames },
          status: "complete"
        }
      },
      { $group: { _id: "$schoolName", orderCount: { $sum: 1 } } }
    ]);
    const countMap = {};
    orderCounts.forEach(o => { countMap[o._id] = o.orderCount; });

    const result = schools.map(s => ({
      name:         s.name,
      grade12Total: s.grade12Total || 0,
      city:         s.city         || "",
      province:     s.province     || "",
      deliveryFee:  s.deliveryFee  || 0,
      orderCount:   countMap[s.name] || 0
    }));

    console.log(`📋 /schools returned ${result.length} school(s):`, result.map(s => s.name));
    res.json(result);
  } catch (err) {
    console.error("❌ /schools error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Per-school dashboard stats ────────────────────────────────────────────────
app.get("/stats/school/:schoolName", async (req, res) => {
  try {
    const schoolName = decodeURIComponent(req.params.schoolName);

    const [schoolDoc, orderAgg, productAgg, categoryAgg] = await Promise.all([
      School.findOne({ name: schoolName }, "grade12Total"),
      Order.aggregate([
        { $match: { schoolName, status: "complete" } },
        { $group: { _id: null, totalOrders: { $sum: 1 }, uniqueEmails: { $addToSet: "$email" } } }
      ]),
      Order.aggregate([
        { $match: { schoolName, status: "complete" } },
        { $unwind: "$cart" },
        // Same product = same name AND same size AND same color.
        { $group: {
            _id: {
              name:  "$cart.name",
              size:  { $ifNull: ["$cart.size", ""] },
              color: { $ifNull: ["$cart.color", ""] }
            },
            count: { $sum: { $ifNull: ["$cart.quantity", 1] } }
        } },
        // Don't reveal a product as "popular" until it's been rented/bought
        // at least 3 times at this school — a single order should never be exposed.
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id.name", size: "$_id.size", color: "$_id.color", count: 1 } }
      ]),
      Order.aggregate([
        { $match: { schoolName, status: "complete" } },
        { $unwind: "$cart" },
        {
          $group: {
            _id: { $ifNull: ["$cart.category", "Other"] },
            count: { $sum: { $ifNull: ["$cart.quantity", 1] } }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, category: "$_id", count: 1 } }
      ])
    ]);

    const grade12Total = schoolDoc?.grade12Total || 0;
    const totalOrders  = orderAgg[0]?.totalOrders || 0;
    const learnerCount = orderAgg[0]?.uniqueEmails?.length || 0;
    const adoptionPct  = grade12Total > 0 ? Math.round((learnerCount / grade12Total) * 100) : null;

    res.json({
      schoolName,
      grade12Total,
      learnerCount,
      totalOrders,
      adoptionPct,
      topProducts:   productAgg,
      topCategories: categoryAgg
    });
  } catch (err) {
    console.error("❌ /stats/school error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Global Glamborrow stats ───────────────────────────────────────────────────
app.get("/stats/global", async (req, res) => {
  try {
    const [summaryAgg, productAgg, categoryAgg, schoolCount] = await Promise.all([
      Order.aggregate([
        { $match: { status: "complete" } },
        {
          $group: {
            _id: null,
            totalOrders:   { $sum: 1 },
            uniqueEmails:  { $addToSet: "$email" },
            uniqueSchools: { $addToSet: "$schoolName" }
          }
        }
      ]),
      Order.aggregate([
        { $match: { status: "complete" } },
        { $unwind: "$cart" },
        // Same product = same name AND same size AND same color.
        { $group: {
            _id: {
              name:  "$cart.name",
              size:  { $ifNull: ["$cart.size", ""] },
              color: { $ifNull: ["$cart.color", ""] }
            },
            count: { $sum: { $ifNull: ["$cart.quantity", 1] } }
        } },
        // The overview only ever shows the single most-rented product overall,
        // and never when it's been rented/bought just once — that would expose
        // a single person's order.
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, name: "$_id.name", size: "$_id.size", color: "$_id.color", count: 1 } }
      ]),
      Order.aggregate([
        { $match: { status: "complete" } },
        { $unwind: "$cart" },
        {
          $group: {
            _id: { $ifNull: ["$cart.category", "Other"] },
            count: { $sum: { $ifNull: ["$cart.quantity", 1] } }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, category: "$_id", count: 1 } }
      ]),
      School.countDocuments({ active: true })
    ]);

    const s = summaryAgg[0] || {};

    res.json({
      totalOrders:   s.totalOrders   || 0,
      totalLearners: s.uniqueEmails?.length || 0,
      totalSchools:  schoolCount,
      topProducts:   productAgg,
      topCategories: categoryAgg
    });
  } catch (err) {
    console.error("❌ /stats/global error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
app.post("/checkout", async (req, res) => {
  try {
    const {
      orderId, customerEmail, schoolName, deliveryFee,
      contact, whatsapp, secretCode, cart, amount
    } = req.body;

    if (!amount || !customerEmail) {
      return res.status(400).json({ error: "Missing amount or email" });
    }

    const newOrder = new Order({
      orderId: orderId || Date.now().toString(),
      email: customerEmail,
      amount: parseFloat(amount),
      status: "pending",
      schoolName, deliveryFee: deliveryFee || 0, contact, whatsapp, secretCode, cart
    });
    await newOrder.save();
    console.log("✅ Order saved:", newOrder.orderId);

    // ── PayFast fields — order matters, do NOT change ────────────────────────
    const paymentFields = [
      ["merchant_id",   process.env.PAYFAST_MERCHANT_ID],
      ["merchant_key",  process.env.PAYFAST_MERCHANT_KEY],
      ["return_url",    `${BACKEND_URL}/success?orderId=${newOrder.orderId}`],
      ["cancel_url",    `${BACKEND_URL}/cancel`],
      ["notify_url",    `${BACKEND_URL}/webhook`],
      ["email_address", customerEmail],
      ["m_payment_id",  newOrder.orderId],
      ["amount",        parseFloat(amount).toFixed(2)],
      ["item_name",     "Glamborrow Order"],
    ];

    const sigEncode = v =>
      encodeURIComponent(String(v).trim()).replace(/%20/g, "+");

    let pfString = paymentFields
      .map(([k, v]) => `${k}=${sigEncode(v)}`)
      .join("&");

    if (process.env.PAYFAST_SALT && process.env.PAYFAST_SALT.trim() !== "") {
      pfString += `&passphrase=${sigEncode(process.env.PAYFAST_SALT)}`;
    }

    const signature = crypto.createHash("md5").update(pfString).digest("hex");
    console.log("🔐 Sig string:", pfString);
    console.log("🔐 Signature:", signature);

    const payfastBase = IS_PRODUCTION
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";
    const fields = Object.fromEntries(paymentFields);

    console.log("✅ Sending PayFast fields to frontend for POST");
    res.json({ payfastUrl: payfastBase, fields, signature });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: "Server error during checkout" });
  }
});

// ── Order status ──────────────────────────────────────────────────────────────
app.get("/order-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ status: order.status, orderId: order.orderId });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Order details ─────────────────────────────────────────────────────────────
app.get("/order-details/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Webhook (PayFast ITN) ─────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.status(200).send("OK");

  const data = req.body;
  console.log("📩 Webhook received:", data);

  const pfData = { ...data };
  delete pfData.signature;

  let checkString = Object.keys(pfData)
    .map(key => `${key}=${encodeURIComponent(pfData[key] ?? "").replace(/%20/g, "+")}`)
    .join("&");

  if (process.env.PAYFAST_SALT) {
    checkString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
  }

  const expectedSig = crypto.createHash("md5").update(checkString).digest("hex");
  console.log("Expected sig:", expectedSig, "| Received:", data.signature);

  if (expectedSig !== data.signature) {
    console.warn("❌ Invalid PayFast signature — ignoring");
    return;
  }

  console.log("✅ Signature valid. payment_status:", data.payment_status);

  try {
    const newStatus = data.payment_status === "COMPLETE"
      ? "complete"
      : data.payment_status.toLowerCase();

    const result = await Order.updateOne(
      { orderId: data.m_payment_id },
      { status: newStatus }
    );
    console.log(`✅ Order ${data.m_payment_id} → ${newStatus} (matched: ${result.matchedCount})`);
  } catch (err) {
    console.error("❌ MongoDB update error in webhook:", err);
  }
});

// ── Static pages ──────────────────────────────────────────────────────────────
app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "success.html"));
});

app.get("/cancel", (req, res) => {
  res.send(`
    <h1 style="font-family:sans-serif;text-align:center;margin-top:60px;">❌ Payment Cancelled</h1>
    <p style="text-align:center;">Your cart is still saved. <a href="${FRONTEND_URL}/checkout.html">Try again</a></p>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", env: IS_PRODUCTION ? "production" : "development" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));