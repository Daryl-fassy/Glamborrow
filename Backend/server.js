require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(cors({
  origin: ["https://glamborrow-1.onrender.com"],
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

// ── Admin middleware — checks x-admin-key header ──────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── ADMIN: Get all orders (newest first) ─────────────────────────────────────
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

  const payload = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    amount: parseFloat(amount).toFixed(2),
    item_name: "Glamborrow Order",
    email_address: customerEmail,
    m_payment_id: newOrder.orderId,
    return_url: `https://glamborrow-1.onrender.com/success.html?orderId=${newOrder.orderId}`,
    cancel_url: "https://glamborrow-1.onrender.com/cancel",
    notify_url: process.env.NOTIFY_URL || "https://scholarship-incident-guam-wall.trycloudflare.com/webhook"
  };

  const redirectUrl = `https://sandbox.payfast.co.za/eng/process?${new URLSearchParams(payload)}`;
  res.json({ redirectUrl });
});

// ── Order status (used by success page) ──────────────────────────────────────
app.get("/order-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ status: order.status, orderId: order.orderId });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Order details (used by success page) ─────────────────────────────────────
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
    <p style="text-align:center;">Your cart is still saved. <a href="/checkout.html">Try again</a></p>
  `);
});

app.listen(3000, () => console.log("Server running on port 3000"));