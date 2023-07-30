const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mealSchema = new Schema({
  mealTitle: {
    type: String,
  },
  mealTitleEn: {
    type: String,
  },
  mealType: {
    type: String,
  },
  mealRank: {
    type: Number,
  },
  protine: {
    type: String,
  },
  carbohydrates: {
    type: String,
  },
  fats: {
    type: String,
  },
  calories: {
    type: String,
  },
  description: {
    type: String,
  },
  imagePath: {
    type: String,
  },
  selectionRule: {
    redundancy: { type: Number, default: 0 },
    period: { type: Number },
  },
  mealBlocked: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("meal", mealSchema);
