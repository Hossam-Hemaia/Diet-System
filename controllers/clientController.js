const Client = require("../models/client");
const Bundle = require("../models/bundle");
const Subscription = require("../models/subscription");
const Meal = require("../models/meal");
const Admin = require("../models/admin");
const Message = require("../models/message");
const ChiffMenu = require("../models/chiffMenu");
const Transaction = require("../models/transaction");
const Menu = require("../models/menu");
const utilities = require("../utilities/utils");
const Tap = require("../utilities/tap");
const ObjectId = require("mongoose").Types.ObjectId;

exports.putEditClient = async (req, res, next) => {
  const {
    clientName,
    clientNameEn,
    phoneNumber,
    gender,
    governorate,
    distrect,
    streetName,
    homeNumber,
    floorNumber,
    appartment,
    appartmentNo,
    dislikedMeals,
    clientId,
  } = req.body;
  try {
    const client = await Client.findById(clientId);
    client.clientName = clientName !== "" ? clientName : client.clientName;
    client.clientNameEn =
      clientNameEn !== "" ? clientNameEn : client.clientNameEn;
    client.phoneNumber = phoneNumber !== "" ? phoneNumber : client.phoneNumber;
    client.gender = gender !== "" ? gender : client.gender;
    client.governorate = governorate !== "" ? governorate : client.governorate;
    client.distrect = distrect !== "" ? distrect : client.distrect;
    client.streetName = streetName !== "" ? streetName : client.streetName;
    client.homeNumber = homeNumber !== "" ? homeNumber : client.homeNumber;
    client.floorNumber = floorNumber !== "" ? floorNumber : client.floorNumber;
    client.appartment = appartment !== "" ? appartment : client.appartment;
    client.appartmentNo =
      appartmentNo !== "" ? appartmentNo : client.appartmentNo;
    client.dislikedMeals =
      dislikedMeals !== "" ? dislikedMeals : client.dislikedMeals;
    if (phoneNumber !== "" || phoneNumber !== undefined) {
      client.hasProfile = true;
    }
    await client.save();
    res.status(201).json({ success: true, message: "Client profile updated" });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 422;
    next(error);
  }
};

//////////////////Payment Method Section//////////////////
exports.createNewCharge = async (req, res, next) => {
  const bundleId = req.query.bundleId;
  let startingAt = req.query.startingAt;
  try {
    const client = await Client.findById(req.clientId);
    if (client.subscriped && startingAt === "") {
      const lastPlanDate =
        client.mealsPlan.meals[client.mealsPlan.meals.length - 1].date;
      startingAt = utilities.getFutureDate(lastPlanDate, 24);
    }
    const bundle = await Bundle.findById(bundleId);
    const amount = bundle.bundlePrice;
    const transaction = new Transaction({
      clientId: client._id,
      bundleId,
      amount,
    });
    await transaction.save();
    const firstName = client.clientName.split(" ")[0];
    const lastName = client.clientName.split(" ")[1];
    const description = `Subscription in ${bundle.bundleName}`;
    const result = await Tap.createCharge(
      amount,
      description,
      transaction._id,
      firstName,
      lastName,
      client.email,
      client.phoneNumber,
      req.clientId,
      bundleId,
      startingAt,
      bundle.lang
    );
    transaction.paymentId = result.id;
    transaction.paymentReference = result.reference.transaction;
    await transaction.save();
    res.status(201).json({ success: true, result: result.transaction.url });
  } catch (err) {
    next(err);
  }
};

exports.checkPaymentStatus = async (req, res, next) => {
  const chargeId = req.body.tap_id;
  try {
    const result = await Tap.retrieveCharge(chargeId);
    const transaction = await Transaction.findById(
      result.reference.transaction
    );
    transaction.paymentStatus = result.status;
    if (result.status === "CAPTURED") {
      transaction.transactionStatus = "payment done";
      await transaction.save();
      const clientId = result.metadata.clientId;
      const bundleId = result.metadata.bundleId;
      const startingAt = result.metadata.startingAt;
      const lang = result.metadata.lang;
      const subscriptionResult = await Tap.subscripe(
        clientId,
        bundleId,
        startingAt,
        lang,
        transaction._id
      );
      if (subscriptionResult.success === true) {
        return res
          .status(201)
          .json({ success: true, message: subscriptionResult.message });
      }
    } else {
      transaction.transactionStatus = "payment failed";
      await transaction.save();
      return res.status(422).json({ success: false, message: result.status });
    }
  } catch (err) {
    next(err);
  }
};
///////////////End of Payment Method Section//////////////

exports.postSubscripe = async (req, res, next) => {
  const startingAt = req.body.startingAt;
  const bundleId = req.body.bundleId;
  const clientId = req.body.clientId;
  const transactionId = req.body.transactionId;
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.paymentStatus !== "CAPTURED") {
      const error = new Error("No payment detected or payment failed!");
      error.statusCode = 400;
      throw error;
    }
    let client;
    if (clientId) {
      client = await Client.findById(clientId);
    } else {
      client = await Client.findById(req.clientId);
    }
    const renewFlag = client.subscriped ? true : false;
    const bundle = await Bundle.findById(bundleId);
    if (!client.subscriped || (client.subscriped && renewFlag)) {
      let startDate;
      let endDate;
      startDate = utilities.getStartDate(startingAt);
      if (bundle.bundlePeriod === 1) {
        endDate = utilities.getEndDate(startDate, 1, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 2) {
        endDate = utilities.getEndDate(startDate, 2, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 3) {
        endDate = utilities.getEndDate(startDate, 3, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 4) {
        endDate = utilities.getEndDate(startDate, 4, bundle.bundleOffer);
      }
      // let localStartDate;
      // let localEndDate;
      const dates = utilities.fridayFilter(
        startDate,
        endDate,
        bundle.fridayOption
      );
      if (!renewFlag) {
        // let nowStart = new Date(startDate);
        // localStartDate = utilities.getLocalDate(nowStart);
        // let nowEnd = new Date(endDate);
        // localEndDate = utilities.getLocalDate(nowEnd);
        client.subscripedBundle = {
          bundleId: bundle._id,
          startingDate: dates[0],
          endingDate: dates[dates.length - 1],
          isPaid: true,
        };
      }
      client.subscriped = true;
      const subscriptionRecord = new Subscription({
        clientId: client._id,
        bundleName: bundle.bundleName,
        bundleId: bundle._id,
        startingDate: dates[0],
        endingDate: dates[dates.length - 1],
      });
      await subscriptionRecord.save();
      await client.save();
      await client.addMealsDates(
        dates,
        bundle,
        renewFlag,
        subscriptionRecord._id
      );
      return res
        .status(201)
        .json({ success: true, message: "client subscriped successfully" });
    } else if (client.subscriped && !renewFlag) {
      return res.status(201).json({
        success: false,
        message: "انت مشترك بالفعل",
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.postSelectMeal = async (req, res, next) => {
  const meals = req.body.meals;
  const dateId = req.body.dateId;
  const flag = req.body.flag;
  try {
    const currentDate = new Date();
    const futureDate = utilities.getFutureDate(currentDate, 48);
    const client = await Client.findById(req.clientId);
    const clientPlan = await Subscription.findOne({
      clientId: ObjectId(req.clientId),
      endingDate: { $gte: futureDate },
    });
    if (!clientPlan) {
      const error = new Error("Not subscriped to any package!");
      error.statusCode = 404;
      throw error;
    }
    const bundleId = clientPlan.bundleId.toString();
    let bundle = await Bundle.findById(bundleId);
    if (flag === "edit") {
      await client.resetSelectedMeals(
        dateId,
        bundle.mealsNumber,
        bundle.snacksNumber
      );
    }
    let numberOfMeals = 0;
    let numberOfSnacks = 0;
    for (let mealId of meals) {
      const meal = await Meal.findById(mealId);
      if (
        meal.mealType === "افطار" ||
        meal.mealType === "غداء" ||
        meal.mealType === "عشاء"
      ) {
        ++numberOfMeals;
      }
      if (meal.mealType === "سناك") {
        ++numberOfSnacks;
      }
    }
    if (numberOfMeals > bundle.mealsNumber) {
      throw new Error("Number of meals exceeded!");
    }
    if (numberOfSnacks > bundle.snacksNumber) {
      throw new Error("Number of snacks exceeded!");
    }
    for (let mealId of meals) {
      const meal = await Meal.findById(mealId);
      const { result, mealName } = client.checkRepeatition(meal, dateId);
      if (!result) {
        const error = new Error(
          `the meal ${mealName} can be selected ${meal.selectionRule.redundancy} time/s every ${meal.selectionRule.period} days`
        );
        error.statusCode = 422;
        throw error;
      }
      const mealsTypes = bundle.mealsType;
      let hasBreakFast = false;
      let hasLunch = false;
      let hasDinner = false;
      if (mealsTypes.includes("افطار")) {
        hasBreakFast = true;
      }
      if (mealsTypes.includes("غداء")) {
        hasLunch = true;
      }
      if (mealsTypes.includes("عشاء")) {
        hasDinner = true;
      }
      if (mealsTypes.includes(meal.mealType)) {
        let mealType = meal.mealType;
        switch (mealType) {
          case "افطار":
            await client.addMeals(
              dateId,
              meal,
              "breakfast",
              hasBreakFast,
              hasLunch,
              hasDinner
            );
            break;
          case "غداء":
            await client.addMeals(
              dateId,
              meal,
              "lunch",
              hasBreakFast,
              hasLunch,
              hasDinner
            );
            break;
          case "عشاء":
            await client.addMeals(
              dateId,
              meal,
              "dinner",
              hasBreakFast,
              hasLunch,
              hasDinner
            );
            break;
          default:
            break;
        }
      } else if (meal.mealType === "سناك") {
        await client.addMeals(dateId, meal, "snack", hasBreakFast);
      } else {
        return res.status(201).json({ message: "لا يمكنك اختيار الوجبه" });
      }
    }
    await client.save();
    res.status(201).json({ success: true, message: "Meals added" });
  } catch (err) {
    next(err);
  }
};

exports.addChiffMeals = async (date) => {
  try {
    console.log("adding chiff meals...");
    const isoDate = new Date(date);
    const futureDate = new Date(isoDate.getTime() + 48 * 60 * 60 * 1000);
    const localDate = new Date(
      futureDate.getTime() - futureDate.getTimezoneOffset() * 60000
    ).toISOString();
    const chiffMenu = await ChiffMenu.findOne({}).populate("menu.meals.mealId");
    const clients = await Client.find({
      subscriped: true,
      "subscripedBundle.startingDate": { $lte: localDate },
      "subscripedBundle.endingDate": { $gte: localDate },
      "clientStatus.paused": false,
      "mealsPlan.meals": { $elemMatch: { date: localDate, submitted: false } },
    });
    let chiffMenuMeals = [];
    let mealsIds = [];
    for (let menu of chiffMenu.menu) {
      if (menu.date.toDateString() === new Date(localDate).toDateString()) {
        chiffMenuMeals = menu.meals;
      }
    }
    for (let client of clients) {
      let bundle = await Bundle.findById(client.subscripedBundle.bundleId);
      let bundleMealTypes = bundle.mealsType;
      let selectMealsTypes = [];
      let mealsNumber;
      let snacksNumber;
      let dateId;
      for (let dayMeals of client.mealsPlan.meals) {
        if (
          new Date(dayMeals.date).toDateString() ===
            new Date(localDate).toDateString() &&
          !dayMeals.submitted
        ) {
          for (let selectedMeal of dayMeals.dayMeals) {
            selectMealsTypes.push(selectedMeal.mealType);
          }
          mealsNumber = dayMeals.mealsNumber;
          snacksNumber = dayMeals.snacksNumber;
          dateId = dayMeals._id;
        }
      }
      let mealsToSelect = utilities.mealsReducer(
        selectMealsTypes,
        bundleMealTypes,
        mealsNumber
      );
      let mealsIds = utilities.getChiffSelectedMenu(
        mealsToSelect,
        chiffMenuMeals,
        mealsNumber,
        snacksNumber
      );
      //Start adding Meals to clients
      if (mealsIds.length > 0) {
        for (let mealId of mealsIds) {
          let mealsTypes = bundle.mealsType;
          let hasBreakFast = false;
          let hasLunch = false;
          let hasDinner = false;
          if (mealsTypes.includes("افطار")) {
            hasBreakFast = true;
          }
          if (mealsTypes.includes("غداء")) {
            hasLunch = true;
          }
          if (mealsTypes.includes("عشاء")) {
            hasDinner = true;
          }
          if (mealsTypes.includes(mealId.mealType)) {
            let mealType = mealId.mealType;
            switch (mealType) {
              case "افطار":
                await client.addMeals(
                  dateId,
                  mealId,
                  "breakfast",
                  hasBreakFast,
                  hasLunch,
                  hasDinner
                );
                break;
              case "غداء":
                await client.addMeals(
                  dateId,
                  mealId,
                  "lunch",
                  hasBreakFast,
                  hasLunch,
                  hasDinner
                );
                break;
              case "عشاء":
                await client.addMeals(
                  dateId,
                  mealId,
                  "dinner",
                  hasBreakFast,
                  hasLunch,
                  hasDinner
                );
                break;
              default:
                break;
            }
          } else if (mealId.mealType === "سناك") {
            await client.addMeals(
              dateId,
              mealId,
              "snack",
              hasBreakFast,
              hasLunch,
              hasDinner
            );
          }
        }
        await client.save();
      }
    }
  } catch (err) {
    next(err);
  }
};

exports.getClientPlanDetails = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const futureDate = utilities.getFutureDate(currentDate, 48);
    const clientPlan = await Subscription.findOne({
      clientId: ObjectId(req.clientId),
      endingDate: { $gte: futureDate },
    });
    const clientDetails = await Client.findById(req.clientId);
    if (!clientPlan) {
      return res.status(200).json({
        success: false,
        message: "Not subscriped to any bundle!",
        hasPreviousSubscribtion: clientDetails.subscripedBundle.bundleId
          ? true
          : false,
        bundleId: clientDetails.subscripedBundle.bundleId
          ? clientDetails.subscripedBundle.bundleId
          : "",
      });
    }
    await clientDetails.filterPlanDays(clientPlan._id);
    let bundle = await Bundle.findById(clientPlan.bundleId);
    const remainingDays = utilities.getRemainingDays(
      clientPlan.startingDate,
      clientPlan.endingDate
    );
    let originalPeriod = bundle.fridayOption
      ? bundle.bundlePeriod * 7
      : bundle.bundlePeriod * 6;
    let additionalDays = bundle.bundleOffer;
    const bundleDays = originalPeriod + additionalDays;
    const bundleName = bundle.bundleName;
    const bundleNameEn = bundle.bundleNameEn;
    const bundleMealsTypes = bundle.mealsType;
    const startDate = clientPlan.startingDate;
    const endDate = clientPlan.endingDate;
    res.status(200).json({
      success: true,
      bundleDays,
      bundleName,
      bundleNameEn,
      bundleId: bundle._id,
      startDate,
      endDate,
      remainingDays: Math.floor(remainingDays),
      planDays: clientDetails.mealsPlan.meals,
      clientGender: clientDetails.gender,
      bundleImageMale: bundle.bundleImageMale,
      bundleImageFemale: bundle.bundleImageFemale,
      subscriptionId: clientDetails.subscriptionId,
      subscriped: clientDetails.subscriped,
      clientId: clientDetails._id,
      bundleMealsTypes,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    next(error);
  }
};

exports.getMyMeals = async (req, res, next) => {
  const dateId = req.query.dateId;
  try {
    const client = await Client.findById(req.clientId);
    const datePlan = client.mealsPlan.meals.find((dayPlan) => {
      if (dayPlan._id.toString() === dateId.toString()) {
        return dayPlan;
      }
    });
    const meals = [];
    for (let meal of datePlan.dayMeals) {
      if (
        (meal.mealType === "افطار" ||
          meal.mealType === "غداء" ||
          meal.mealType === "عشاء" ||
          meal.mealType === "سناك") &&
        meal.submitted === true
      ) {
        let mealObj = await Meal.findById(meal.mealId);
        meals.push(mealObj);
      }
    }
    res.status(200).json({
      success: true,
      meals: meals,
      date: datePlan.date.toDateString(),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    next(error);
  }
};

exports.getSpecialists = async (req, res, next) => {
  try {
    const specialists = await Admin.find({
      role: "diet specialist",
      isActive: true,
    });
    if (!specialists) {
      const error = new Error("No diet specialist found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, specialists });
  } catch (err) {
    next(err);
  }
};

exports.postSendMessage = async (req, res, next) => {
  const { title, body, specialistId } = req.body;
  const files = req.files;
  try {
    let filesPaths = [];
    if (files.length > 0) {
      for (let file of files) {
        filesPaths.push(`${req.protocol}s://${req.get("host")}/${file.path}`);
      }
    }
    const message = Message({
      title,
      body,
      attachments: files.length > 0 ? filesPaths : files,
      clientId: req.clientId,
      specialistId,
    });
    await message.save();
    res.status(201).json({ success: true, message: "message sent" });
  } catch (err) {
    next(err);
  }
};

exports.getClientMessages = async (req, res, next) => {
  try {
    const client = await Client.findById(req.clientId, { tall: 1, weight: 1 });
    if (!client) {
      const error = new Error("No client found!");
      error.statusCode = 404;
      throw error;
    }
    const clientMessages = await Message.find({ clientId: req.clientId })
      .populate("specialistId")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, bmi: client, messages: clientMessages });
  } catch (err) {
    next(err);
  }
};

exports.getMenuMeals = async (req, res, next) => {
  try {
    const clientPlan = await Subscription.findOne({
      clientId: ObjectId(req.clientId),
    }).sort({ _id: -1 });
    let bundle = await Bundle.findById(clientPlan.bundleId).populate(
      "menu.mealId"
    );
    res.status(200).json({ success: true, menu: bundle.menu });
  } catch (err) {
    next(err);
  }
};

exports.getMenuMealByType = async (req, res, next) => {
  const mealType = req.query.mealType;
  const dateId = req.query.dateId;
  try {
    const clientPlan = await Subscription.findOne({
      clientId: ObjectId(req.clientId),
    }).sort({ _id: -1 });
    const client = await Client.findById(req.clientId);
    const dayMeals = client.mealsPlan.meals.find((day) => {
      return day._id.toString() === dateId;
    });
    let selectedMeals = [];
    for (let meal of dayMeals.dayMeals) {
      let selectedMeal = await Meal.findById(meal.mealId);
      selectedMeals.push(selectedMeal);
    }
    //Modify this part for selecting meals by getting meals from day menu
    let bundle = await Bundle.findById(clientPlan.bundleId);
    const menu = await Menu.findOne({}).populate("menu.meals.mealId");
    let dayMenu = await menu.getMenuDate(dayMeals.date);
    if (!dayMenu) {
      throw new Error("Day is not added to the menu");
    }
    let filteredMeals;
    if (mealType === "الكل") {
      filteredMeals = dayMenu.meals;
    } else {
      filteredMeals = dayMenu.meals.filter((meal) => {
        if (meal.mealId) {
          return meal.mealId.mealType === mealType;
        }
      });
    }
    res.status(200).json({
      success: true,
      filter: filteredMeals,
      selectedMeals: selectedMeals,
      bundleMealsTypes:
        bundle.snacksNumber > 0
          ? bundle.mealsType.concat("سناك")
          : bundle.mealsType,
      defaultMealsNumber: bundle.mealsNumber,
      defaultSnacksNumber: bundle.snacksNumber,
      numberOfMeals: dayMeals.mealsNumber,
      numberOfSnacks: dayMeals.snacksNumber,
    });
  } catch (err) {
    next(err);
  }
};
