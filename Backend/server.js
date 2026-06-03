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
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
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
  contact:    String,
  whatsapp:   String,
  secretCode: String,
  cart:       Array
});
const Order = mongoose.model("Order", orderSchema);

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

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
app.post("/checkout", async (req, res) => {
  try {
    const {
      orderId, customerEmail, schoolName,
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
      schoolName, contact, whatsapp, secretCode, cart
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
  // ✅ email_address goes HERE (buyer details section)
  ["email_address", customerEmail],
  // ✅ THEN transaction details
  ["m_payment_id",  newOrder.orderId],
  ["amount",        parseFloat(amount).toFixed(2)],
  ["item_name",     "Glamborrow Order"],
];

    // sigEncode: spaces → +, everything else standard percent-encoding
// sigEncode: spaces → +, everything else standard percent-encoding
const sigEncode = v =>
  encodeURIComponent(String(v).trim()).replace(/%20/g, "+");

// Build signature string
let pfString = paymentFields
  .map(([k, v]) => `${k}=${sigEncode(v)}`)
  .join("&");

// ✅ Only append passphrase if it's set
if (process.env.PAYFAST_SALT && process.env.PAYFAST_SALT.trim() !== "") {
  pfString += `&passphrase=${sigEncode(process.env.PAYFAST_SALT)}`;
}

const signature = crypto.createHash("md5").update(pfString).digest("hex");
console.log("🔐 Sig string:", pfString);
console.log("🔐 Signature:", signature);

// Build redirect fields
const payfastBase = "https://sandbox.payfast.co.za/eng/process";
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
  // Respond 200 immediately to satisfy PayFast timeout
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
