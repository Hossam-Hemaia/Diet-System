const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bundleSchema = new Schema(
  {
    bundleName: {
      type: String,
      default: "باقه مخصصه",
    },
    bundleNameEn: {
      type: String,
      default: "custom bundle",
    },
    timeOnCard: {
      type: String,
      default: "",
    },
    timeOnCardEn: {
      type: String,
      default: "",
    },
    mealsNumber: {
      type: String,
      default: "0",
    },
    mealsType: [],
    snacksNumber: {
      type: String,
      default: "0",
    },
    bundlePeriod: {
      type: Number,
    },
    bundleOffer: {
      type: Number,
      default: 0,
    },
    fridayOption: {
      type: Boolean,
      default: false,
    },
    bundlePrice: {
      type: Number,
    },
    bundleImageMale: {
      type: String,
    },
    bundleImageFemale: {
      type: String,
    },
    deActivate: {
      type: Boolean,
      default: false,
    },
    customBundle: {
      type: Boolean,
      default: false,
    },
    menu: [{ mealId: { type: Schema.Types.ObjectId, ref: "meal" } }],
  },
  { timestamps: true, strictPopulate: false }
);

bundleSchema.methods.removeMenuMeal = function (mealId) {
  const menuMeals = this.menu;
  const newMenuMeals = menuMeals.filter((Id) => {
    return Id.mealId.toString() !== mealId.toString();
  });
  this.menu = newMenuMeals;
  this.save();
  return this;
};

module.exports = mongoose.model("Bundle", bundleSchema);
