require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const Order = require("./models/Order");
const checkoutRouter = require("./routes/checkout");
const webhookRouter = require("./routes/webhook");

const app = express();

// ✅ Allow requests from your real domain and any local dev origins
app.use(cors({
  origin: [
    "https://glamborrow.co.za",
    "https://www.glamborrow.co.za",
    "http://127.0.0.1:5500",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));

// Bypass localtunnel/cloudflare browser warnings
app.use((req, res, next) => {
  res.setHeader("bypass-tunnel-reminder", "true");
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.use(express.static(__dirname));

// ── Admin middleware ───────────────────────────────────────────────────────────
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

// ── Mount modular routes ──────────────────────────────────────────────────────
app.use("/", checkoutRouter);
app.use("/", webhookRouter);

// ── Static pages ──────────────────────────────────────────────────────────────
app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "success.html"));
});

app.get("/cancel", (req, res) => {
  res.send(`
    <h1 style="font-family:sans-serif; text-align:center; margin-top:60px;">❌ Payment Cancelled</h1>
    <p style="text-align:center;">Your cart is still saved. <a href="https://glamborrow.co.za/checkout.html">Try again</a></p>
  `);
});

app.listen(3000, () => console.log("Server running on port 3000"));
