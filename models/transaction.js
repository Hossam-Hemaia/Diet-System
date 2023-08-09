const mongoose = require("mongoose");

const Schema = mongoose.Schema;

transactionSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    bundleId: {
      type: String,
    },
    transactionStatus: {
      type: String,
      default: "pending",
    },
    paymentId: {
      type: String,
    },
    paymentReference: {
      type: String,
    },
    amount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
    },
  },
  { timestamps: true, strictPopulate: false }
);

module.exports = mongoose.model("transaction", transactionSchema);
