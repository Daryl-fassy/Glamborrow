require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

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

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  email: String,
  amount: Number,
  status: { type: String, default: "pending" },
  createdAt: {
    type: String,
    default: () => new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour12: false
    })
  },
  schoolName: String,
  contact: String,
  whatsapp: String,
  secretCode: String,
  cart: Array
});
const Order = mongoose.model("Order", orderSchema);

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

// ── Checkout route ────────────────────────────────────────────────────────────
app.post("/checkout", async (req, res) => {
  const { amount, customerEmail, orderId } = req.body;

  if (!amount || !customerEmail) {
    return res.status(400).json({ error: "Missing amount or email" });
  }

  const newOrder = new Order({
    orderId: orderId || Date.now().toString(),
    email: customerEmail,
    amount: parseFloat(amount),
    status: "pending",
    schoolName: req.body.schoolName,
    contact: req.body.contact,
    whatsapp: req.body.whatsapp,
    secretCode: req.body.secretCode,
    cart: req.body.cart
  });
  await newOrder.save();

  // ✅ PayFast requires fields in this exact order
  const payload = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `https://glamborrow.co.za/success.html?orderId=${newOrder.orderId}`,
    cancel_url: "https://glamborrow.co.za/cancel.html",
    notify_url: process.env.NOTIFY_URL || "https://glamborrow-1.onrender.com/webhook",
    m_payment_id: newOrder.orderId,
    amount: parseFloat(amount).toFixed(2),
    item_name: "Glamborrow Order",
    email_address: customerEmail
  };

  // ✅ Build signature string using simple encodeURIComponent only
  const pfParamString = Object.entries(payload)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim())}`)
    .join("&");

  const signature = crypto.createHash("md5").update(pfParamString).digest("hex");

  console.log("=== PAYFAST DEBUG ===");
  console.log("Param string:", pfParamString);
  console.log("Signature:", signature);

  // ✅ Build redirect URL using the SAME encoded string + signature appended
  const redirectUrl = `https://sandbox.payfast.co.za/eng/process?${pfParamString}&signature=${signature}`;
  res.json({ redirectUrl });
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
  const data = req.body;
  console.log("Webhook received:", data);

  const pfData = { ...data };
  delete pfData.signature;

  let checkString = Object.keys(pfData)
    .map((key) => `${key}=${encodeURIComponent(pfData[key] ?? "").replace(/%20/g, "+")}`)
    .join("&");

  if (process.env.PAYFAST_SALT) {
    checkString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
  }

  const signature = crypto.createHash("md5").update(checkString).digest("hex");
  console.log("Expected:", signature, "| Received:", data.signature);

  if (signature === data.signature) {
    console.log("✅ Signature valid. Updating order...");
    try {
      const result = await Order.updateOne(
        { orderId: data.m_payment_id },
        { status: data.payment_status.toLowerCase() }
      );
      console.log("Matched:", result.matchedCount, "| Modified:", result.modifiedCount);
    } catch (err) {
      console.error("❌ MongoDB update error:", err);
    }
  } else {
    console.warn("❌ Invalid signature.");
  }

  res.status(200).send("OK");
});

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
