require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500", 
    "http://glamborrow.co.za", 
    "https://glamborrow.co.za"   // <-- add this line
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Models
const Order = require("./models/order");

// Routes
const checkoutRouter = require("./routes/checkout");
const webhookRouter = require("./routes/webhook");

app.use("/", checkoutRouter);
app.use("/", webhookRouter);

// Order status + details
app.get("/order-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ status: order.status, orderId: order.orderId });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/order-details/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Static pages
app.use(express.static(__dirname));

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
