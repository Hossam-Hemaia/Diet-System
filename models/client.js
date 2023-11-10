const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientSchema = new Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    clientNameEn: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    subscriptionId: {
      type: Number,
    },
    email: {
      type: String,
    },
    gender: {
      type: String,
    },
    weight: {
      type: Number,
    },
    tall: {
      type: Number,
    },
    distrect: {
      type: String,
    },
    streetName: {
      type: String,
    },
    homeNumber: {
      type: String,
    },
    floorNumber: {
      type: String,
    },
    appartment: {
      type: String,
    },
    role: {
      type: String,
      default: "client",
    },
    subscripedBundle: {
      bundleId: { type: Schema.Types.ObjectId, ref: "Bundle" },
      startingDate: { type: Date },
      endingDate: { type: Date },
      isPaid: { type: Boolean },
      paymentMethod: { type: String },
    },
    subscriped: {
      type: Boolean,
      default: false,
    },
    mealsPlan: {
      meals: [
        {
          date: { type: Date },
          dayMeals: [
            {
              mealId: { type: Schema.Types.ObjectId },
              mealType: { type: String },
              title: { type: String },
              submitted: { type: Boolean, default: false },
              delivered: { type: Boolean, default: false },
            },
          ],
          mealsNumber: { type: Number },
          snacksNumber: { type: Number },
          submitted: { type: Boolean, default: false },
          delivered: { type: Boolean, default: false },
          suspended: { type: Boolean, default: false },
          subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
        },
      ],
    },
    clientStatus: {
      paused: { type: Boolean, default: false },
      pauseDate: { type: Date },
      numPause: { type: Number, default: 1 },
    },
    password: {
      type: String,
    },
    resetCode: {
      type: String,
    },
    codeExpiry: {
      type: Date,
    },
    hasProfile: {
      type: Boolean,
      default: true,
    },
    dislikedMeals: {
      type: String,
      default: "",
      maxLength: 100,
    },
  },
  { timestamps: true }
);

clientSchema.methods.checkRepeatition = function (meal, dateId) {
  //find meal day
  const idx = this.mealsPlan.meals.findIndex((mealIdx) => {
    if (mealIdx._id.toString() === dateId.toString()) {
      return mealIdx;
    }
  });
  let dayMeal = this.mealsPlan.meals[idx];
  //check meal repeatition rule
  let result = false;
  let mealName = meal.mealTitle;
  if (meal.selectionRule.redundancy !== 0) {
    const meals = this.mealsPlan.meals;
    let criteria = meal.selectionRule.redundancy;
    let allowedPeriod = meal.selectionRule.period;
    let mealCounter = 0;
    let lastPhaseDate = 1;
    let startRange;
    let endRange =
      idx + allowedPeriod > meals.length ? meals.length : idx + allowedPeriod;
    if (idx < allowedPeriod) {
      startRange = 0;
    } else {
      startRange = idx - allowedPeriod;
    }
    for (let i = startRange; i < endRange; ++i) {
      let phaseEnd = (i + 1) % allowedPeriod;
      for (let ml of meals[i].dayMeals) {
        if (ml.mealId.toString() === meal._id.toString()) {
          ++mealCounter;
        }
      }
      if (phaseEnd === 0) {
        let parsedDate = Date.parse(meals[i].date);
        let parsedDayMeal = Date.parse(dayMeal.date);
        if (
          parsedDate >= parsedDayMeal &&
          parsedDayMeal > lastPhaseDate &&
          mealCounter < criteria
        ) {
          result = true;
        } else if (parsedDate >= parsedDayMeal && mealCounter >= criteria) {
          result = false;
          mealCounter = 0;
          lastPhaseDate = Date.parse(meals[i].date);
        } else if (parsedDate <= parsedDayMeal && mealCounter >= criteria) {
          result = false;
          mealCounter = 0;
          lastPhaseDate = Date.parse(meals[i].date);
        }
      }
    }
  } else if (meal.selectionRule.redundancy === 0) {
    result = true;
  }
  return { result, mealName };
};

clientSchema.methods.addMeals = function (
  dateId,
  meal,
  mealType,
  hasBreakFast,
  hasLunch,
  hasDinner
) {
  const dayIndex = this.mealsPlan.meals.findIndex((mealIdx) => {
    if (mealIdx._id.toString() === dateId.toString()) {
      return mealIdx;
    }
  });
  const newMeals = [...this.mealsPlan.meals];
  if (dayIndex >= 0) {
    const selectedDay = newMeals[dayIndex];
    const selectedMeal = {
      mealId: meal._id,
      mealType: meal.mealType,
      title: meal.mealTitleEn,
      submitted: true,
    };
    let dayMeals = selectedDay.dayMeals;
    for (let m of dayMeals) {
      if (m.mealType === "افطار" && meal.mealType === "افطار") {
        throw new Error("Breakfast is already selected!");
      }
    }
    if (
      selectedDay.mealsNumber === 0 &&
      (mealType === "breakfast" ||
        mealType === "lunch" ||
        mealType === "dinner")
    ) {
      throw new Error("Number of meals exceeded!");
    } else if (selectedDay.snacksNumber === 0 && mealType === "snack") {
      throw new Error("Number of snacks exceeded!");
    } else if (
      mealType === "breakfast" ||
      mealType === "lunch" ||
      mealType === "dinner"
    ) {
      if (selectedDay.mealsNumber === 1 && hasBreakFast === true) {
        let breakfastIsSelected = dayMeals.find((meal) => {
          return meal.mealType === "افطار";
        });
        if (!breakfastIsSelected && selectedMeal.mealType !== "افطار") {
          throw new Error("You must select breakfast meal");
        }
      }
      if (selectedDay.mealsNumber === 1 && hasLunch === true) {
        let lunchIsSelected = dayMeals.find((meal) => {
          return meal.mealType === "غداء";
        });
        if (!lunchIsSelected && selectedMeal.mealType !== "غداء") {
          throw new Error("You must select lunch meal");
        }
      }
      if (selectedDay.mealsNumber === 1 && hasDinner === true) {
        let dinnerIsSelected = dayMeals.find((meal) => {
          return meal.mealType === "عشاء";
        });
        if (!dinnerIsSelected && selectedMeal.mealType !== "عشاء") {
          throw new Error("You ةust select dinner meal");
        }
      }
      dayMeals.push(selectedMeal);
      selectedDay.mealsNumber -= 1;
    } else if (mealType === "snack") {
      // let isSelected = dayMeals.findIndex((meal) => {
      //   return meal.mealId.toString() === selectedMeal.mealId.toString();
      // });
      dayMeals.push(selectedMeal);
      selectedDay.snacksNumber -= 1;
    }
    if (selectedDay.mealsNumber === 0 && selectedDay.snacksNumber === 0) {
      selectedDay.submitted = true;
    }
    newMeals[dayIndex] = selectedDay;
    const updatedMeals = { meals: newMeals };
    this.mealsPlan = updatedMeals;
  }
};

clientSchema.methods.addMealsDates = function (
  dates,
  bundle,
  renewFlag,
  subscriptionId
) {
  if (renewFlag) {
    mealsDates = [];
    for (let date of dates) {
      mealsDates.push({
        date,
        dayMeals: [],
        mealsNumber: bundle.mealsNumber,
        snacksNumber: bundle.snacksNumber,
        subscriptionId,
      });
    }
    const updatedMeals = this.mealsPlan.meals.concat(mealsDates);
    this.mealsPlan = { meals: updatedMeals };
    this.save();
    return this;
  } else {
    mealsDates = [];
    for (let date of dates) {
      let now = new Date(date);
      let localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      mealsDates.push({
        date: localDate,
        dayMeals: [],
        mealsNumber: bundle.mealsNumber,
        snacksNumber: bundle.snacksNumber,
        subscriptionId,
      });
    }
    const updatedMeals = { meals: mealsDates };
    this.mealsPlan = updatedMeals;
    this.save();
  }
};

clientSchema.methods.editMeal = function (meal, dateId, dayMealId) {
  const meals = [...this.mealsPlan.meals];
  const mealIndex = meals.findIndex((mealIdx) => {
    if (mealIdx._id.toString() === dateId.toString()) {
      return mealIdx;
    }
  });
  const day = {
    mealId: meal._id,
    title: meal.mealTitle,
    submitted: true,
  };
  const dayMealIndex = meals[mealIndex].dayMeals.findIndex((idx) => {
    if (idx._id.toString() === dayMealId.toString()) {
      return idx;
    }
  });
  if (meals[mealIndex].dayMeals[dayMealIndex].submitted === true) {
    meals[mealIndex].dayMeals[dayMealIndex] = day;
  }
  const updatedMeals = { meals: meals };
  this.mealsPlan = updatedMeals;
  this.save();
};

clientSchema.methods.resetSelectedMeals = function (
  dateId,
  mealsNumber,
  snacksNumber
) {
  const meals = [...this.mealsPlan.meals];
  const dayIndex = this.mealsPlan.meals.findIndex((mealIdx) => {
    if (mealIdx._id.toString() === dateId.toString()) {
      return mealIdx;
    }
  });
  const newMeals = [...this.mealsPlan.meals];
  const selectedDay = meals[dayIndex];
  selectedDay.dayMeals = [];
  selectedDay.mealsNumber = mealsNumber;
  selectedDay.snacksNumber = snacksNumber;
  selectedDay.submitted = false;
  newMeals[dayIndex] = selectedDay;
  const updatedMeals = { meals: newMeals };
  this.mealsPlan = updatedMeals;
};

clientSchema.methods.setDayDelivered = function (dateId, flag) {
  const dayIndex = this.mealsPlan.meals.findIndex((mealIdx) => {
    if (mealIdx._id.toString() === dateId.toString()) {
      return mealIdx;
    }
  });
  const newMeals = [...this.mealsPlan.meals];
  if (dayIndex >= 0) {
    const selectedDay = newMeals[dayIndex];
    if (flag === "meal") {
      let deliveryCounter = 0;
      for (let mealDeliverd of selectedDay.dayMeals) {
        if (mealDeliverd.delivered) {
          ++deliveryCounter;
        }
      }
      if (deliveryCounter === selectedDay.dayMeals.length) {
        selectedDay.delivered = true;
        newMeals[dayIndex] = selectedDay;
      }
    } else {
      selectedDay.delivered = true;
      newMeals[dayIndex] = selectedDay;
    }
  }
  const updatedMeals = { meals: newMeals };
  this.mealsPlan = updatedMeals;
  this.save();
};

clientSchema.methods.filterPlanDays = function (subscriptionId) {
  const currentDay = new Date().setHours(0, 0, 0, 0);
  const date = new Date(currentDay);
  const planDays = this.mealsPlan.meals;
  const newPlanDays = [];
  for (let day of planDays) {
    if (subscriptionId.toString() === day.subscriptionId.toString()) {
      newPlanDays.push(day);
    } else if (
      subscriptionId.toString() !== day.subscriptionId.toString() &&
      new Date(day.date) >= date
    ) {
      newPlanDays.push(day);
    }
  }
  this.mealsPlan.meals = newPlanDays;
  this.save();
  return this;
};

module.exports = mongoose.model("Client", clientSchema);
