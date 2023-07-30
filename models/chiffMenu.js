const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const chiffMenuSchema = new Schema(
  {
    menu: [
      {
        date: { type: Date },
        meals: [{ mealId: { type: Schema.Types.ObjectId, ref: "meal" } }],
      },
    ],
  },
  { timestamps: true }
);

chiffMenuSchema.methods.addToMenu = function (date, mealsIds) {
  const meals = [];
  for (let mealId of mealsIds) {
    meals.push({ mealId: mongoose.Types.ObjectId(mealId) });
  }
  const dayMenu = { date: date, meals: meals };
  this.menu.push(dayMenu);
  this.save();
  return this;
};

chiffMenuSchema.methods.removeFromMenu = function () {
  this.menu.shift();
  return this;
};

chiffMenuSchema.methods.deleteMenuDate = function (date) {
  const meals = this.menu;
  const filteredMenu = meals.filter((m) => {
    return m.date.toDateString() !== date.toDateString();
  });
  this.menu = filteredMenu;
  return this;
};

module.exports = mongoose.model("chiffmenu", chiffMenuSchema);
