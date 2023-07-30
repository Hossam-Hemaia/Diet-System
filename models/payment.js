const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: "bundle",
      required: true,
    },
    paymentMethodKey: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("payment", paymentSchema);
