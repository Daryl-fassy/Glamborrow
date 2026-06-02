const mongoose = require("mongoose");

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
  cart: [
    {
      name: String,
      quantity: Number,
      price: String,
      image: String,
      size: String,
      color: String,
      event: String,
      location: String
    }
  ]
});

module.exports = mongoose.model("Order", orderSchema);
