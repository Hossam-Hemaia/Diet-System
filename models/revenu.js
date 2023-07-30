const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const revenuSchema = new Schema({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: "Client",
  },
  amount: {
    type: Number,
  },
  datePaid: {
    type: Date,
    default: new Date(),
  },
});

module.exports = mongoose.model("Revenu", revenuSchema);
