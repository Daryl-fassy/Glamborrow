require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Determine environment ─────────────────────────────────────────────────────
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
  orderId:    { type: String, unique: true, required: true },
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
  cart: [
    {
      name:     String,
      quantity: Number,
      price:    String,
      image:    String,
      size:     String,
      color:    String,
      event:    String,
      location: String
    }
  ]
});

const Order = mongoose.model("Order", orderSchema);

// ── Admin middleware ──────────────────────────────────────────────────────────
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
  const validStatuses = [
    "pending", "complete", "processing",
    "delivered", "returned", "refunded", "cancelled", "failed"
  ];

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
      orderId,
      customerEmail,
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart,
      amount
    } = req.body;

    if (!amount || !customerEmail) {
      return res.status(400).json({ error: "Missing amount or email" });
    }

    // Save order to MongoDB
    const newOrder = new Order({
      orderId: orderId || Date.now().toString(),
      email: customerEmail,
      amount: parseFloat(amount),
      status: "pending",
      schoolName,
      contact,
      whatsapp,
      secretCode,
      cart
    });
    await newOrder.save();
    console.log("✅ Order saved:", newOrder.orderId);

    // Build PayFast payload — field ORDER matters, do NOT sort
    const paymentData = {
      merchant_id:   process.env.PAYFAST_MERCHANT_ID,
      merchant_key:  process.env.PAYFAST_MERCHANT_KEY,
      return_url:    `${FRONTEND_URL}/success.html?orderId=${newOrder.orderId}`,
      cancel_url:    `${FRONTEND_URL}/cancel.html`,
      notify_url:    `${BACKEND_URL}/webhook`,
      m_payment_id:  newOrder.orderId,
      amount:        parseFloat(amount).toFixed(2),
      item_name:     "Glamborrow Order",
      email_address: customerEmail
    };

    // Generate signature (preserve field order, do NOT sort)
   // Use the SAME encoding as the signature
const queryString = Object.entries(paymentData)
  .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, "+")}`)
  .join("&");

const payfastBase = IS_PRODUCTION
  ? "https://www.payfast.co.za/eng/process"       // live
  : "https://sandbox.payfast.co.za/eng/process";  // sandbox

const redirectUrl = `${payfastBase}?${queryString}&signature=${signature}`;

    console.log("✅ Redirecting to PayFast:", redirectUrl);
    res.json({ redirectUrl });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).json({ error: "Server error during checkout" });
  }
});

// ── ORDER STATUS (polled by success page) ────────────────────────────────────
app.get("/order-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ status: order.status, orderId: order.orderId });
  } catch (err) {
    console.error("❌ Order status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── ORDER DETAILS (used by success page) ─────────────────────────────────────
app.get("/order-details/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error("❌ Order details error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── WEBHOOK (PayFast ITN) ─────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Always respond 200 immediately to satisfy PayFast's timeout
  res.status(200).send("OK");

  const data = req.body;
  console.log("📩 Webhook received:", data);

  // Rebuild check string from received data (preserve received key order, strip signature)
  const pfData = { ...data };
  delete pfData.signature;

  let checkString = Object.keys(pfData)
    .map(key => `${key}=${encodeURIComponent(pfData[key] ?? "").replace(/%20/g, "+")}`)
    .join("&");

  if (process.env.PAYFAST_SALT) {
    checkString += `&passphrase=${encodeURIComponent(process.env.PAYFAST_SALT).replace(/%20/g, "+")}`;
  }

  const expectedSignature = crypto.createHash("md5").update(checkString).digest("hex");
  console.log("Expected sig:", expectedSignature, "| Received:", data.signature);

  if (expectedSignature !== data.signature) {
    console.warn("❌ Invalid PayFast signature — ignoring webhook");
    return;
  }

  console.log("✅ Signature valid. payment_status:", data.payment_status);

  try {
    const newStatus = data.payment_status === "COMPLETE" ? "complete" : data.payment_status.toLowerCase();
    const result = await Order.updateOne(
      { orderId: data.m_payment_id },
      { status: newStatus }
    );
    console.log(`✅ Order ${data.m_payment_id} updated → ${newStatus} (matched: ${result.matchedCount})`);

    if (result.matchedCount === 0) {
      console.warn("⚠️ No order found with orderId:", data.m_payment_id);
    }
  } catch (err) {
    console.error("❌ MongoDB update error in webhook:", err);
  }
});

// ── Cancel page ───────────────────────────────────────────────────────────────
app.get("/cancel", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Payment Cancelled</title></head>
    <body style="font-family:sans-serif; text-align:center; margin-top:80px;">
      <h1>❌ Payment Cancelled</h1>
      <p>Your cart is still saved. <a href="${FRONTEND_URL}/checkout.html">Try again</a></p>
    </body>
    </html>
  `);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: IS_PRODUCTION ? "production" : "development" });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
console.log("Loaded ENV:", {
  MONGO_URI: process.env.MONGO_URI,
  PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
  PAYFAST_SALT: process.env.PAYFAST_SALT,
  ADMIN_KEY: process.env.ADMIN_KEY
});
