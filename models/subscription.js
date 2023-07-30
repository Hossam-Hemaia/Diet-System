const mongoose = require("mongoose");
const Schema = mongoose.Schema;

subscriptionSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    date: {
      type: Date,
      default: new Date(),
    },
    bundleName: {
      type: String,
    },
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: "Bundle",
    },
    startingDate: {
      type: Date,
    },
    endingDate: {
      type: Date,
    },
  },
  { timestamps: true, autoIndex: false }
);

subscriptionSchema.index({ clientId: 1 }, { unique: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);
