const mongoose = require("mongoose");

const Schema = mongoose.Schema;

settingsSchema = new Schema({
  subscriptionStart: {
    type: Number,
  },
});

module.exports = mongoose.model("setting", settingsSchema);
