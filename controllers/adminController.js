const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const PdfDoc = require("pdfkit-table");
const mongoose = require("mongoose");
const Meal = require("../models/meal");
const Bundle = require("../models/bundle");
const Client = require("../models/client");
const Admin = require("../models/admin");
const Settings = require("../models/settings");
const Subscription = require("../models/subscription");
const ChiffMenu = require("../models/chiffMenu");
const Transaction = require("../models/transaction");
const Menu = require("../models/menu");
const utilities = require("../utilities/utils");
const { start } = require("repl");
const ObjectId = require("mongoose").Types.ObjectId;

// Dashboard Home
exports.getStats = async (req, res, next) => {
  try {
    const totalClients = await Client.find().countDocuments();
    const activeClients = await Client.find({
      subscriped: true,
      "clientStatus.paused": false,
    }).countDocuments();
    const inactiveClients = await Client.find({
      subscriped: false,
    }).countDocuments();
    const bundlesNumber = await Bundle.find().countDocuments();
    const mealsNumber = await Meal.find().countDocuments();
    const specialistsNumber = await Admin.find({
      role: "diet specialist",
    }).countDocuments();
    const bestSellerPackages = await Subscription.aggregate([
      {
        $group: {
          _id: "$bundleId",
          totalSales: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "bundles",
          localField: "_id",
          foreignField: "_id",
          as: "package",
        },
      },
      {
        $sort: { totalSales: -1 },
      },
      { $limit: 4 },
    ]);
    const packages = [];
    if (bestSellerPackages) {
      for (let best of bestSellerPackages) {
        if (best.package.length > 0) {
          packages.push(best.package[0]);
        }
      }
    }
    const clientsStats = {
      all: totalClients,
      active: activeClients,
      inactive: inactiveClients,
    };
    res.status(200).json({
      success: true,
      data: {
        clientsStats,
        bundlesNumber,
        mealsNumber,
        specialistsNumber,
        bestSeller: packages,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Meals CRUD Operations
exports.postAddMeal = async (req, res, next) => {
  const {
    mealTitle,
    mealTitleEn,
    mealTypes,
    protine,
    carbohydrates,
    fats,
    calories,
    description,
    numberOfSelection,
    selectionPeriod,
    mealBlocked,
  } = req.body;
  const image = req.files[0];
  try {
    const imageBaseUrl = `${req.protocol}s://${req.get("host")}/${image.path}`;
    const selectionRule = {
      redundancy: numberOfSelection,
      period: selectionPeriod,
    };
    for (let mealType of mealTypes) {
      const newMeal = new Meal({
        mealTitle,
        mealTitleEn,
        mealType,
        protine,
        carbohydrates,
        fats,
        calories,
        description,
        selectionRule,
        imagePath: image ? imageBaseUrl : "",
        mealBlocked,
      });
      await newMeal.save();
    }
    res.status(201).json({ success: true, message: "New meal created!" });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getAllMeals = async (req, res, next) => {
  const ITEMS_PER_PAGE = 40;
  let totalItems;
  let page = +req.query.page;
  try {
    const arMealsNumber = await Meal.find().countDocuments();
    totalItems = arMealsNumber;
    const arMeals = await Meal.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    res.status(200).json({
      success: true,
      data: {
        meals: arMeals,
        itemsPerPage: ITEMS_PER_PAGE,
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMeals = async (req, res, next) => {
  const ITEMS_PER_PAGE = 200;
  let totalItems;
  let page = +req.query.page;
  try {
    totalItems = await Meal.find().countDocuments();
    let meals;
    if (req.adminId) {
      meals = await Meal.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    } else {
      meals = await Meal.find({ mealBlocked: false })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    }
    if (!meals) {
      const error = new Error("No meals found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      data: {
        meals: meals,
        itemsPerPage: ITEMS_PER_PAGE,
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMealsByType = async (req, res, next) => {
  const mealType = req.query.mealType;
  const page = +req.query.page || 1;
  let numberOfMeals;
  const MEALS_PER_PAGE = 12;
  try {
    let meals;
    numberOfMeals = await Meal.find({ mealType: mealType }).countDocuments();
    meals = await Meal.find({ mealType: mealType })
      .skip((page - 1) * MEALS_PER_PAGE)
      .limit(MEALS_PER_PAGE);
    if (meals.length < 1) {
      const error = new Error("No meals found!");
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json({
      success: true,
      data: {
        meals: meals,
        itemsPerPage: MEALS_PER_PAGE,
        currentPage: page,
        hasNextPage: page * MEALS_PER_PAGE < numberOfMeals,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(numberOfMeals / MEALS_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMeal = async (req, res, next) => {
  const mealId = req.query.mealId;
  try {
    const meal = await Meal.findById(mealId);
    if (!meal) {
      const error = new Error("No meals found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      meal: meal,
    });
  } catch (err) {
    next(err);
  }
};

exports.postEditMeal = async (req, res, next) => {
  const {
    mealTitle,
    mealTitleEn,
    mealType,
    protine,
    carbohydrates,
    fats,
    calories,
    description,
    numberOfSelection,
    selectionPeriod,
    mealId,
    mealBlocked,
  } = req.body;
  const image = req.files[0];
  try {
    let meal;
    let imageBaseUrl;
    if (image) {
      imageBaseUrl = `${req.protocol}s://${req.get("host")}/${image.path}`;
    }
    meal = await Meal.findById(mealId);
    meal.mealTitle = mealTitle !== "" ? mealTitle : meal.mealTitle;
    meal.mealTitleEn = mealTitleEn !== "" ? mealTitleEn : meal.mealTitleEn;
    meal.mealType = mealType !== "" ? mealType : meal.mealType;
    meal.protine = protine !== "" ? protine : meal.protine;
    meal.carbohydrates =
      carbohydrates !== "" ? carbohydrates : meal.carbohydrates;
    meal.fats = fats !== "" ? fats : meal.fats;
    meal.calories = calories !== "" ? calories : meal.calories;
    meal.description = description !== "" ? description : meal.description;
    meal.selectionRule.redundancy = numberOfSelection;
    meal.selectionRule.period = selectionPeriod;
    meal.imagePath = image ? imageBaseUrl : meal.imagePath;
    meal.mealBlocked = mealBlocked;
    await meal.save();
    res
      .status(201)
      .json({ success: true, message: "Meal updated successfully!" });
  } catch (err) {
    next(err);
  }
};

exports.getMealsFilter = async (req, res, next) => {
  try {
    const mealsFilter = req.query.mealsFilter;
    let meals;
    if (mealsFilter === "all" || mealsFilter === "") {
      meals = await Meal.find();
    } else if (mealsFilter === "breakfast") {
      meals = await Meal.find({ mealType: "افطار" });
    } else if (mealsFilter === "lunch") {
      meals = await Meal.find({ mealType: "غداء" });
    } else if (mealsFilter === "dinner") {
      meals = await Meal.find({ mealType: "عشاء" });
    } else if (mealsFilter === "snack") {
      meals = await Meal.find({ mealType: "سناك" });
    }
    res.status(200).json({ success: true, meals });
  } catch (err) {
    next(err);
  }
};

exports.deleteMeal = async (req, res, next) => {
  const mealId = req.query.mealId;
  try {
    await Meal.findByIdAndRemove(mealId);
    res.status(201).json({ success: true, message: "meal deleted!" });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

// Bundles CRUD Operations
exports.postCreateBundle = async (req, res, next) => {
  const {
    bundleName,
    bundleNameEn,
    timeOnCard,
    timeOnCardEn,
    mealsNumber,
    breakfast,
    lunch,
    dinner,
    snacksNumber,
    bundlePeriod,
    bundleOffer,
    fridayOption,
    bundlePrice,
    customBundle,
    mealsIds,
  } = req.body;
  const imageMale = req.files[0];
  const imageFemale = req.files[1];
  try {
    const imageMaleBaseUrl = `${req.protocol}s://${req.get("host")}/${
      imageMale.path
    }`;
    const imageFemaleBaseUrl = `${req.protocol}s://${req.get("host")}/${
      imageFemale.path
    }`;
    const allowedMeals = [];
    if (breakfast === "on") {
      allowedMeals.push("افطار");
    }
    if (lunch === "on") {
      allowedMeals.push("غداء");
    }
    if (dinner === "on") {
      allowedMeals.push("عشاء");
    }
    const newBundle = new Bundle({
      bundleName,
      bundleNameEn,
      timeOnCard,
      timeOnCardEn,
      mealsNumber,
      mealsType: allowedMeals,
      snacksNumber,
      bundlePeriod,
      bundleOffer,
      fridayOption,
      bundlePrice,
      bundleImageMale: imageMale ? imageMaleBaseUrl : "",
      bundleImageFemale: imageFemale ? imageFemaleBaseUrl : "",
      customBundle,
    });
    if (mealsIds.length > 0) {
      for (let mealId of mealsIds) {
        let meal = await Meal.findById(mealId);
        if (!meal) {
          const error = new Error("meals and bundles language conflict!");
          error.statusCode = 422;
          newBundle.menu = [];
          await newBundle.save();
          throw error;
        }
        newBundle.menu.push({ mealId: mongoose.Types.ObjectId(mealId) });
      }
    }
    await newBundle.save();
    res
      .status(201)
      .json({ success: true, message: "bundle created successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getBundles = async (req, res, next) => {
  try {
    let bundles;
    bundles = await Bundle.find({ customBundle: false });
    res.status(201).json({
      success: true,
      bundles: bundles,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCustomBundles = async (req, res, next) => {
  try {
    const customBundles = await Bundle.find({ customBundle: true });
    res.status(200).json({ success: true, bundles: customBundles });
  } catch (err) {
    next(err);
  }
};

exports.getClientsBundles = async (req, res, next) => {
  try {
    let bundles;
    bundles = await Bundle.find({ deActivate: false, customBundle: false });
    res.status(201).json({
      success: true,
      bundles: bundles,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBundle = async (req, res, next) => {
  const bundleId = req.query.bundleId;
  try {
    let bundle;
    bundle = await Bundle.findById(bundleId);
    res.status(201).json({
      success: true,
      bundle: bundle,
    });
  } catch (err) {
    next(err);
  }
};

exports.putEditBundle = async (req, res, next) => {
  const {
    bundleName,
    bundleNameEn,
    timeOnCard,
    timeOnCardEn,
    mealsNumber,
    breakfast,
    lunch,
    dinner,
    snacksNumber,
    bundlePeriod,
    bundleOffer,
    fridayOption,
    bundlePrice,
    bundleId,
    deActivate,
    customBundle,
  } = req.body;
  if (customBundle && bundlePeriod < 5) {
    throw new Error("Bundle period must be 5 days or more!");
  }
  let imageMale;
  let imageFemale;
  if (req.files) {
    imageMale = req.files[0];
    imageFemale = req.files[1];
  }
  try {
    let bundle;
    let imageMaleBaseUrl = imageMale
      ? `${req.protocol}s://${req.get("host")}/${imageMale.path}`
      : false;
    let imageFemaleBaseUrl = imageFemale
      ? `${req.protocol}s://${req.get("host")}/${imageFemale.path}`
      : false;
    bundle = await Bundle.findById(bundleId);
    const allowedMeals = [];
    if (breakfast === "on") {
      allowedMeals.push("افطار");
    }
    if (lunch === "on") {
      allowedMeals.push("غداء");
    }
    if (dinner === "on") {
      allowedMeals.push("عشاء");
    }
    bundle.bundleName = bundleName !== "" ? bundleName : bundle.bundleName;
    bundle.bundleNameEn =
      bundleNameEn !== "" ? bundleNameEn : bundle.bundleNameEn;
    bundle.timeOnCard = timeOnCard !== "" ? timeOnCard : bundle.timeOnCard;
    bundle.timeOnCardEn =
      timeOnCardEn !== "" ? timeOnCardEn : bundle.timeOnCardEn;
    bundle.mealsNumber = mealsNumber;
    if (allowedMeals.length > 0) {
      bundle.mealsType = allowedMeals;
    }
    bundle.snacksNumber =
      snacksNumber !== "" ? snacksNumber : bundle.snacksNumber;
    bundle.bundlePeriod =
      bundlePeriod !== "" ? bundlePeriod : bundle.bundlePeriod;
    bundle.bundleOffer = bundleOffer ? bundleOffer : bundle.bundleOffer;
    bundle.fridayOption = fridayOption;
    bundle.bundlePrice = bundlePrice ? bundlePrice : bundle.bundlePrice;
    bundle.bundleImageMale = imageMale
      ? imageMaleBaseUrl
      : bundle.bundleImageMale;
    bundle.bundleImageFemale = imageFemale
      ? imageFemaleBaseUrl
      : bundle.bundleImageFemale;
    bundle.deActivate = deActivate;
    bundle.customBundle = customBundle;
    await bundle.save();
    res
      .status(201)
      .json({ success: true, message: "bundle updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteBundle = async (req, res, next) => {
  const bundleId = req.query.bundleId;
  try {
    const client = await Client.findOne({
      "subscripedBundle.bundleId": bundleId,
    });
    if (!client) {
      await Bundle.findByIdAndRemove(bundleId);
    } else {
      throw new Error("there is subscriped client in this bundle");
    }
    res.status(201).json({ success: true, message: "Bundle deleted!" });
  } catch (err) {
    next(err);
  }
};

exports.getMenuMeals = async (req, res, next) => {
  const bundleId = req.query.bundleId;
  try {
    let bundle;
    bundle = await Bundle.findById(bundleId).populate("menu.mealId");
    res.status(200).json({ success: true, bundle });
  } catch (err) {
    next(err);
  }
};

exports.deleteMenuMeal = async (req, res, next) => {
  const bundleId = req.query.bundleId;
  const mealId = req.query.mealId;
  try {
    const bundle = await Bundle.findById(bundleId);
    await bundle.removeMenuMeal(mealId);
    res.status(200).json({ success: true, message: "Meal removed!" });
  } catch (err) {
    next(err);
  }
};

// Users CRUD Operations
exports.postCreateUser = async (req, res, next) => {
  const { fullName, username, role, password, address, phoneNumber } = req.body;
  const image = req.files[0];
  try {
    let imageBaseUrl;
    if (image) {
      imageBaseUrl = `${req.protocol}s://${req.get("host")}/${image.path}`;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new Admin({
      fullName,
      username,
      role,
      password: hashedPassword,
      address,
      phoneNumber,
      userImage: image ? imageBaseUrl : "",
    });
    await user.save();
    res.status(201).json({
      success: true,
      user: { username, password },
      message: "new user created!",
    });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  const userId = req.query.userId;
  try {
    const user = await Admin.findById(userId);
    if (!user) {
      const error = new Error("User does not exist!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, user: user });
  } catch (err) {
    next(err);
  }
};

exports.getAllusers = async (req, res, next) => {
  try {
    const users = await Admin.find();
    if (users.length < 1) {
      const error = new Error("No users found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, users });
  } catch (err) {}
};

exports.editUser = async (req, res, next) => {
  const {
    userId,
    fullName,
    username,
    isActive,
    role,
    address,
    phoneNumber,
    password,
  } = req.body;
  const image = req.files[0];
  try {
    let imageBaseUrl;
    if (image) {
      imageBaseUrl = `${req.protocol}s://${req.get("host")}/${image.path}`;
    }
    const user = await Admin.findById(userId);
    if (!user) {
      const error = new Error("User does not exist!");
      error.statusCode = 404;
      throw error;
    }
    let hashedPassword;
    if (password && password !== "") {
      hashedPassword = await bcrypt.hash(password, 12);
    }
    user.fullName = fullName ? fullName : user.fullName;
    user.username = username ? username : user.username;
    user.role = role ? role : user.role;
    user.address = address ? address : user.address;
    user.phoneNumber = phoneNumber ? phoneNumber : user.phoneNumber;
    user.isActive = isActive ? isActive : user.isActive;
    user.userImage = image ? imageBaseUrl : user.userImage;
    user.password = password ? hashedPassword : user.password;
    await user.save();
    res
      .status(201)
      .json({ success: true, message: "User updated successfully!" });
  } catch (err) {
    next(err);
  }
};

exports.putUserActive = async (req, res, next) => {
  const userId = req.body.userId;
  const isActive = req.body.isActive;
  try {
    const user = await Admin.findByIdAndUpdate(userId, {
      $set: { isActive: isActive },
    });
    if (!user) {
      const error = new Error("No user found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(201).json({ success: true, message: "User status changed!" });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  const userId = req.query.userId;
  try {
    await Admin.findByIdAndDelete(userId);
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Settings Operations
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find();
    res.status(200).json({ success: true, settings: settings });
  } catch (err) {
    next(err);
  }
};

exports.postSetSettings = async (req, res, next) => {
  const { subscriptionStart } = req.body;
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = new Settings({
        subscriptionStart,
      });
      await settings.save();
    } else {
      settings.subscriptionStart = subscriptionStart;
      await settings.save();
    }
    res.status(201).json({ success: true, message: "New Settings Saved" });
  } catch (err) {
    next(err);
  }
};

// Menu Operations
exports.addMenuDay = async (req, res, next) => {
  try {
    const { date, mealsIds } = req.body;
    const localDate = utilities.getLocalDate(date);
    let menu = await Menu.findOne();
    if (!menu) {
      const meals = [];
      for (let mealId of mealsIds) {
        meals.push({ mealId: mongoose.Types.ObjectId(mealId) });
      }
      const dayMenu = { date: localDate, meals: meals };
      menu = new Menu({
        menu: dayMenu,
      });
      await menu.save();
      return res.status(201).json({ success: true, message: "Meals added" });
    }
    if (menu.menu.length >= 30) {
      await menu.removeFromMenu();
    }
    await menu.addMealsToMenu(localDate, mealsIds);
    res.status(201).json({ success: true, message: "Meals added" });
  } catch (err) {
    next(err);
  }
};

exports.getMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findOne().populate("menu.meals.mealId");
    const detaildMenu = [];
    for (let m of menu.menu) {
      let day = {};
      let breakfast = [];
      let lunch = [];
      let dinner = [];
      let snack = [];
      for (let meal of m.meals) {
        if (meal.mealId.mealType === "افطار") {
          breakfast.push(meal);
        } else if (meal.mealId.mealType === "غداء") {
          lunch.push(meal);
        } else if (meal.mealId.mealType === "عشاء") {
          dinner.push(meal);
        } else if (meal.mealId.mealType === "سناك") {
          snack.push(meal);
        }
      }
      day.date = m.date;
      day.breakfast = breakfast;
      day.lunch = lunch;
      day.dinner = dinner;
      day.snack = snack;
      detaildMenu.push(day);
    }
    const sortedMenu = detaildMenu.sort((a, b) => {
      return a.date - b.date;
    });
    res.status(200).json({ success: true, menu: sortedMenu });
  } catch (err) {
    next(err);
  }
};

exports.deleteMenuDay = async (req, res, next) => {
  try {
    const date = req.query.date;
    const localDate = utilities.getLocalDate(date);
    const menu = await Menu.findOne();
    await menu.deleteMenuDate(localDate);
    await menu.save();
    res.status(200).json({ success: true, message: "Menu date deleted" });
  } catch (err) {
    next(err);
  }
};

// Chiff Menu Operations
exports.addChiffMenuDay = async (req, res, next) => {
  const { date, mealsIds } = req.body;
  try {
    const nowDate = new Date(date);
    const localDate = new Date(
      nowDate.getTime() - nowDate.getTimezoneOffset() * 60000
    );
    let chiffMenu = await ChiffMenu.findOne({});
    if (!chiffMenu) {
      const meals = [];
      for (let mealId of mealsIds) {
        meals.push({ mealId: mongoose.Types.ObjectId(mealId) });
      }
      const dayMenu = { date: localDate, meals: meals };
      chiffMenu = new ChiffMenu({
        menu: dayMenu,
      });
      await chiffMenu.save();
      return res
        .status(201)
        .json({ success: true, message: "chiff menu created!" });
    }
    const dateExist = chiffMenu.menu.find((dayMeals) => {
      if (dayMeals.date.toDateString() === nowDate.toDateString()) {
        return dayMeals;
      }
    });
    if (dateExist) {
      await chiffMenu.deleteMenuDate(nowDate);
    }
    if (chiffMenu.menu.length >= 7) {
      await chiffMenu.removeFromMenu();
    }
    await chiffMenu.addToMenu(localDate, mealsIds);
    return res
      .status(201)
      .json({ success: true, message: "chiff menu date added!" });
  } catch (err) {
    next(err);
  }
};

// client functions
exports.deleteSubscriper = async (req, res, next) => {
  const clientId = req.query.clientId;
  try {
    await Client.findByIdAndRemove(clientId);
    res.status(201).json({ success: true });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.postAddNewClient = async (req, res, next) => {
  const {
    mealsNumber,
    breakfast,
    lunch,
    dinner,
    snacksNumber,
    bundlePeriod,
    fridayOption,
    bundlePrice,
    customBundle,
    clientName,
    clientNameEn,
    phoneNumber,
    email,
    gender,
    distrect,
    streetName,
    homeNumber,
    floorNumber,
    appartment,
    dislikedMeals,
    password,
    bundleId,
  } = req.body;
  try {
    // check client existance
    const currentClient = await Client.findOne({ phoneNumber: phoneNumber });
    if (currentClient) {
      const error = new Error("client is already registered");
      error.statusCode = 422;
      throw error;
    }
    if (clientNameEn === "" || !clientNameEn) {
      const error = new Error("client name in English is required");
      error.statusCode = 422;
      throw error;
    }
    // Create Custom Bundle
    if (customBundle && bundlePeriod < 5) {
      throw new Error("Bundle period must be 5 days or more!");
    }
    const allowedMeals = [];
    if (breakfast === "on") {
      allowedMeals.push("افطار");
    }
    if (lunch === "on") {
      allowedMeals.push("غداء");
    }
    if (dinner === "on") {
      allowedMeals.push("عشاء");
    }
    const bundleData = {
      bundleName: `مخصص ل ${clientName}`,
      bundleNameEn: `Custom bundle for ${clientNameEn}`,
      mealsNumber,
      mealsType: allowedMeals,
      snacksNumber,
      bundlePeriod,
      fridayOption,
      bundlePrice,
      customBundle,
    };
    let bundle = await utilities.createCustomBundle(bundleData);
    // Create Client With Selected Bundle
    const currentDate = Date.parse(new Date());
    const startTime = utilities.getFutureDate(currentDate, 72);
    const startingAt = new Date(startTime);
    const hashedPassword = await bcrypt.hash(password, 12);
    let clientNumber = 1;
    const lastClient = await Client.findOne({}, { subscriptionId: 1 }).sort({
      _id: -1,
    });
    if (lastClient) {
      clientNumber += lastClient.subscriptionId;
    }
    const newClient = new Client({
      clientName,
      clientNameEn,
      phoneNumber,
      email,
      subscriptionId: clientNumber,
      gender,
      distrect,
      streetName,
      homeNumber,
      floorNumber,
      appartment,
      dislikedMeals,
      password: hashedPassword,
    });
    await newClient.save();
    if (!customBundle) {
      bundle = await Bundle.findById(bundleId);
    }
    const renewFlag = newClient.subscriped ? true : false;
    if (!newClient.subscriped || (newClient.subscriped && renewFlag)) {
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
      } else if (bundle.bundlePeriod > 4) {
        endDate = utilities.getEndDate(
          startDate,
          bundlePeriod,
          bundle.bundleOffer
        );
      }
      let nowStart = new Date(startDate);
      let localStartDate = new Date(
        nowStart.getTime() - nowStart.getTimezoneOffset() * 60000
      );
      let nowEnd = new Date(endDate);
      let localEndDate = new Date(
        nowEnd.getTime() - nowEnd.getTimezoneOffset() * 60000
      );
      newClient.subscripedBundle = {
        bundleId: bundle._id,
        startingDate: localStartDate,
        endingDate: localEndDate,
        isPaid: true,
        paymentMethod: "Cash",
      };
      const dates = utilities.fridayFilter(
        startDate,
        endDate,
        bundle.fridayOption
      );
      newClient.subscriped = true;
      const subscriptionRecord = new Subscription({
        clientId: newClient._id,
        bundleName: bundle.bundleName,
        bundleId: bundle._id,
        startingDate: startDate,
        endingDate: endDate,
      });
      await subscriptionRecord.save();
      await newClient.save();
      await newClient.addMealsDates(
        dates,
        bundle,
        renewFlag,
        subscriptionRecord._id
      );
    }
    res.status(201).json({
      success: true,
      message: "Welcome aboard! your account has been created successfully",
      credentials: { username: email, password: password },
    });
  } catch (err) {
    next(err);
  }
};

exports.getFindClient = async (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  try {
    if (searchTerm === "") {
      const clients = await Client.find();
      return res.status(200).json({ success: true, clients: clients });
    }
    let clients = await Client.find({
      $or: [
        { clientName: { $regex: searchTerm, $options: "i" } },
        { phoneNumber: { $regex: searchTerm, $options: "i" } },
      ],
    });
    if (!isNaN(searchTerm) && (!clients || clients.length < 1)) {
      clients = await Client.find({ subscriptionId: Number(searchTerm) });
    }
    res.status(201).json({
      success: true,
      clients: clients,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    next(error);
  }
};

exports.postAddClientName = async (req, res, next) => {
  const { clientNameEn, clientId } = req.body;
  try {
    if (clientNameEn === "") {
      const error = new Error("Client name is empty!");
      error.statusCode = 422;
      throw error;
    }
    const client = await Client.findByIdAndUpdate(clientId, {
      $set: { clientNameEn: clientNameEn },
    });
    res.status(201).json({ success: true, message: "Client data updated" });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 422;
    next(error);
  }
};

exports.getAllClients = async (req, res, next) => {
  let page = +req.query.page;
  const CLIENTS_PER_PAGE = 20;
  try {
    const numOfClients = await Client.find().countDocuments();
    const clients = await Client.find()
      .skip((page - 1) * CLIENTS_PER_PAGE)
      .limit(CLIENTS_PER_PAGE);
    if (!clients || clients.length < 1) {
      const error = new Error("no clients found!");
      error.statusCode = 404;
      throw error;
    }
    const remainingDays = [];
    for (let client of clients) {
      let remaining = Math.floor(
        utilities.getRemainingDays(
          client.subscripedBundle.startingDate,
          client.subscripedBundle.endingDate
        )
      );
      remainingDays.push(remaining);
    }
    res.status(200).json({
      success: true,
      data: {
        clients: clients,
        remainingDays,
        clientsCount: numOfClients,
        currentPage: page,
        hasNextPage: page * CLIENTS_PER_PAGE < numOfClients,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(numOfClients / CLIENTS_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getNewClients = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const previousDate = utilities.getPreviousDate(currentDate, 48);
    const futureDate = utilities.getFutureDate(currentDate, 24);
    const newClients = await Client.find(
      {
        subscriped: true,
        createdAt: {
          $gte: previousDate,
          $lte: futureDate,
        },
      },
      { clientName: 1, phoneNumber: 1, subscriptionId: 1, subscripedBundle: 1 }
    ).populate("subscripedBundle.bundleId");
    const endingBefore = utilities.getFutureDate(currentDate, 120);
    const endingClients = await Client.find(
      {
        subscriped: true,
        "subscripedBundle.endingDate": { $lte: endingBefore },
      },
      { clientName: 1, phoneNumber: 1, subscriptionId: 1, subscripedBundle: 1 }
    ).populate("subscripedBundle.bundleId");
    res.status(200).json({ success: true, newClients, endingClients });
  } catch (err) {
    next(err);
  }
};

exports.getClient = async (req, res, next) => {
  const clientId = req.query.clientId;
  try {
    const client = await Client.findById(clientId).populate(
      "subscripedBundle.bundleId"
    );
    if (!client) {
      const error = new Error("client not found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, client: client });
  } catch (err) {
    next(err);
  }
};

exports.postPauseClient = async (req, res, next) => {
  const clientId = req.body.clientId;
  try {
    const client = await Client.findById(clientId);
    if (client.subscriped === true && client.clientStatus.numPause === 1) {
      client.subscriped = false;
      client.clientStatus.paused = true;
      client.clientStatus.pauseDate = new Date();
      client.clientStatus.numPause = 0;
      await client.save();
      return res
        .status(201)
        .json({ success: true, message: "تم ايقاف الاشتراك مؤقتا" });
    } else {
      return res.status(200).json({
        success: false,
        message: "العميل غير مشترك او استنفذ فرص الايقاف المسموح بها",
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.postActivateClient = async (req, res, next) => {
  const clientId = req.body.clientId;
  try {
    const activationDate = new Date().setHours(2, 0, 1, 1);
    const client = await Client.findById(clientId);
    if (client.clientStatus.paused) {
      const pauseDate = client.clientStatus.pauseDate;
      const bundle = await Bundle.findById(client.subscripedBundle.bundleId);
      const endPlanDate =
        client.mealsPlan.meals[client.mealsPlan.meals.length - 1].date;
      const thresholdDate =
        endPlanDate >= activationDate ? activationDate : endPlanDate;
      const filteredDates = utilities.fridayFilter(
        pauseDate.setHours(2, 0, 1, 1),
        new Date(thresholdDate).setHours(2, 0, 1, 1),
        bundle.fridayOption
      );
      let numberOfPauseDays = filteredDates.length - 1;
      if (req.clientId && numberOfPauseDays > 30) {
        const error = new Error("لقد تجاوزت مدة الايقاف المسموح بها!");
        error.statusCode = 403;
        throw error;
      }
      const endActiveDate = utilities.getEndActiveDate(
        thresholdDate,
        numberOfPauseDays
      );
      const filteredActiveDates = utilities.fridayFilter(
        Date.parse(thresholdDate) + 1000 * 3600 * 24,
        endActiveDate,
        bundle.fridayOption
      );
      client.subscriped = true;
      client.clientStatus.paused = false;
      client.addMealsDates(filteredActiveDates, bundle, true);
      return res.status(201).json({ message: "تم تفعيل اشتراك العميل بنجاح" });
    } else {
      const error = new Error("تم استنفاذ عدد مرات الايقاف المسموح بها");
      error.statusCode = 422;
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

exports.putEditClientMeal = async (req, res, next) => {
  const { mealDate, dayMealId, mealId, clientId, dateId, lang } = req.body;
  try {
    const remainingDays = utilities.getRemainingDays(mealDate);
    if (remainingDays < 2 && req.clientId) {
      const error = new Error("لا يمكنك تغيير الوجبه");
      error.statusCode = 401;
      throw error;
    }
    const meal = await Meal.findById(mealId);
    const client = await Client.findById(clientId);
    await client.editMeal(meal, dateId, dayMealId);
    res.status(200).json({ success: true, message: "meal changed!" });
  } catch (err) {
    next(err);
  }
};

exports.getClientPlanDetails = async (req, res, next) => {
  const clientId = req.query.clientId;
  try {
    const currentDate = new Date();
    const futureDate = utilities.getFutureDate(currentDate, 48);
    const clientPlan = await Subscription.findOne({
      clientId: ObjectId(clientId),
      endingDate: { $gte: futureDate },
    });
    const clientDetails = await Client.findById(clientId);
    if (!clientDetails.subscriped) {
      return res.status(200).json({
        success: true,
        bundleDays: "",
        bundleName: "",
        bundleNameEn: "",
        startDate: "",
        endDate: "",
        remainingDays: "",
        planDays: "",
        clientGender: clientDetails.gender,
        bundleImageMale: "",
        bundleImageFemale: "",
        clientData: clientDetails,
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
    const startDate = clientPlan.startingDate;
    const endDate = clientPlan.endingDate;
    res.status(200).json({
      success: true,
      bundleDays,
      bundleName,
      bundleNameEn,
      startDate,
      endDate,
      remainingDays: Math.floor(remainingDays),
      planDays: clientDetails.mealsPlan.meals,
      clientGender: clientDetails.gender,
      bundleImageMale: bundle.bundleImageMale,
      bundleImageFemale: bundle.bundleImageFemale,
      clientData: clientDetails,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 404;
    next(error);
  }
};

exports.postRenewSubscription = async (req, res, next) => {
  try {
    const { clientId, bundleId } = req.body;
    const client = await Client.findById(clientId);
    const bundle = await Bundle.findById(bundleId);
    if (!bundle) {
      throw new Error("Bundle is not found!");
    }
    const renewFlag = client.subscriped ? true : false;
    let startingAt;
    if (renewFlag) {
      const lastSubscriptionDay =
        client.mealsPlan.meals[client.mealsPlan.meals.length - 1].date;
      startingAt = utilities.getFutureDate(lastSubscriptionDay, 24);
    } else {
      const currentDate = new Date().setHours(0, 0, 0, 0);
      const nowDate = new Date(currentDate);
      const localDate = utilities.getLocalDate(nowDate);
      startingAt = utilities.getFutureDate(localDate, 48);
    }
    let startDate;
    let endDate;
    if (!client.subscriped || (client.subscriped && renewFlag)) {
      startDate = utilities.getStartDate(startingAt);
      if (bundle.bundlePeriod === 1) {
        endDate = utilities.getEndDate(startDate, 1, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 2) {
        endDate = utilities.getEndDate(startDate, 2, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 3) {
        endDate = utilities.getEndDate(startDate, 3, bundle.bundleOffer);
      } else if (bundle.bundlePeriod === 4) {
        endDate = utilities.getEndDate(startDate, 4, bundle.bundleOffer);
      } else if (bundle.bundlePeriod > 4) {
        endDate = utilities.getEndDate(
          startDate,
          bundle.bundlePeriod,
          bundle.bundleOffer
        );
      }
      if (!client.subscripedBundle.bundleId) {
        console.log("subscribe bundle");
        client.subscripedBundle = {
          bundleId: bundle._id,
          startingDate: utilities.getLocalDate(startDate),
          endingDate: utilities.getLocalDate(endDate),
          isPaid: true,
          paymentMethod: "Cash",
        };
      }
      const dates = utilities.fridayFilter(
        startDate,
        endDate,
        bundle.fridayOption
      );
      client.subscriped = true;
      const subscriptionRecord = new Subscription({
        clientId: client._id,
        bundleName: bundle.bundleName,
        bundleId: bundle._id,
        startingDate: startDate,
        endingDate: endDate,
      });
      await subscriptionRecord.save();
      await client.save();
      await client.addMealsDates(
        dates,
        bundle,
        renewFlag,
        subscriptionRecord._id
      );
    }
    res.status(201).json({ success: true, message: "Subscription renewed" });
  } catch (err) {
    next(err);
  }
};

// reporting functions
exports.getMealsToDeliver = async (req, res, next) => {
  const mealsFilter = req.query.mealsFilter;
  const mealsDate = req.query.mealsDate;
  try {
    const selectedDate = new Date(mealsDate).setHours(0, 0, 0, 0);
    const date = new Date(selectedDate);
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString();
    const clients = await Client.find({
      subscriped: true,
      "subscripedBundle.startingDate": { $lte: localDate },
      "subscripedBundle.endingDate": { $gte: localDate },
      "clientStatus.paused": false,
      "mealsPlan.meals": { $elemMatch: { date: localDate, delivered: false } },
    });
    const clientsMeals = [];
    for (let client of clients) {
      let clientMeals = {};
      if (mealsFilter === "all" || mealsFilter === "") {
        let unDeliveredMeals = [];
        let dayMeals = client.mealsPlan.meals.find((day) => {
          if (
            day.date.toDateString() === new Date(localDate).toDateString() &&
            !day.delivered &&
            day.dayMeals.length > 0
          ) {
            return day;
          }
        });
        if (dayMeals) {
          for (let meal of dayMeals.dayMeals) {
            if (meal.delivered === false) {
              unDeliveredMeals.push(meal);
            }
          }
          clientMeals.clientId = client._id;
          clientMeals.subscriptionId = client.subscriptionId;
          clientMeals.dateId = dayMeals._id;
          clientMeals.clientName = client.clientName;
          clientMeals.clientNameEn = client.clientNameEn;
          clientMeals.phoneNumber = client.phoneNumber;
          clientMeals.dayMeals = unDeliveredMeals;
          if (unDeliveredMeals.length > 0) {
            clientsMeals.push(clientMeals);
          }
        }
      } else if (mealsFilter === "breakfast") {
        let dayMeals = [];
        let dateId;
        for (let day of client.mealsPlan.meals) {
          if (
            day.date.toDateString() === new Date(localDate).toDateString() &&
            !day.delivered &&
            day.dayMeals.length > 0
          ) {
            for (let meal of day.dayMeals) {
              if (meal.delivered === false && meal.mealType === "افطار") {
                dayMeals.push(meal);
                dateId = day._id;
              }
            }
          }
        }
        clientMeals.clientId = client._id;
        clientMeals.subscriptionId = client.subscriptionId;
        clientMeals.dateId = dateId;
        clientMeals.clientName = client.clientName;
        clientMeals.clientNameEn = client.clientNameEn;
        clientMeals.phoneNumber = client.phoneNumber;
        clientMeals.dayMeals = [...dayMeals];
        if (clientMeals.dayMeals.length > 0) {
          clientsMeals.push(clientMeals);
        }
      } else if (mealsFilter === "lunch") {
        let dayMeals = [];
        let dateId;
        for (let day of client.mealsPlan.meals) {
          if (
            day.date.toDateString() === new Date(localDate).toDateString() &&
            !day.delivered &&
            day.dayMeals.length > 0
          ) {
            for (let meal of day.dayMeals) {
              if (meal.delivered === false && meal.mealType === "غداء") {
                dayMeals.push(meal);
                dateId = day._id;
              }
            }
          }
        }
        clientMeals.clientId = client._id;
        clientMeals.subscriptionId = client.subscriptionId;
        clientMeals.dateId = dateId;
        clientMeals.clientName = client.clientName;
        clientMeals.clientNameEn = client.clientNameEn;
        clientMeals.phoneNumber = client.phoneNumber;
        clientMeals.dayMeals = [...dayMeals];
        if (clientMeals.dayMeals.length > 0) {
          clientsMeals.push(clientMeals);
        }
      } else if (mealsFilter === "dinner") {
        let dayMeals = [];
        let dateId;
        for (let day of client.mealsPlan.meals) {
          if (
            day.date.toDateString() === new Date(localDate).toDateString() &&
            !day.delivered &&
            day.dayMeals.length > 0
          ) {
            for (let meal of day.dayMeals) {
              if (meal.delivered === false && meal.mealType === "عشاء") {
                dayMeals.push(meal);
                dateId = day._id;
              }
            }
          }
        }
        clientMeals.clientId = client._id;
        clientMeals.subscriptionId = client.subscriptionId;
        clientMeals.dateId = dateId;
        clientMeals.clientName = client.clientName;
        clientMeals.clientNameEn = client.clientNameEn;
        clientMeals.phoneNumber = client.phoneNumber;
        clientMeals.dayMeals = [...dayMeals];
        if (clientMeals.dayMeals.length > 0) {
          clientsMeals.push(clientMeals);
        }
      } else if (mealsFilter === "snack") {
        let dayMeals = [];
        let dateId;
        for (let day of client.mealsPlan.meals) {
          if (
            day.date.toDateString() === new Date(localDate).toDateString() &&
            !day.delivered &&
            day.dayMeals.length > 0
          ) {
            for (let meal of day.dayMeals) {
              if (meal.delivered === false && meal.mealType === "سناك") {
                dayMeals.push(meal);
                dateId = day._id;
              }
            }
          }
        }
        clientMeals.clientId = client._id;
        clientMeals.subscriptionId = client.subscriptionId;
        clientMeals.dateId = dateId;
        clientMeals.clientName = client.clientName;
        clientMeals.clientNameEn = client.clientNameEn;
        clientMeals.phoneNumber = client.phoneNumber;
        clientMeals.dayMeals = [...dayMeals];
        if (clientMeals.dayMeals.length > 0) {
          clientsMeals.push(clientMeals);
        }
      }
    }
    res.status(200).json({ success: true, clients: clientsMeals });
  } catch (err) {
    next(err);
  }
};

exports.putDeliverAllMeals = async (req, res, next) => {
  const clients = req.body.clients;
  try {
    for (let clientDetails of clients) {
      const client = await Client.findById(clientDetails.clientId);
      await client.setDayDelivered(clientDetails.dateId, "all");
    }
    res.status(200).json({ success: true, message: "All meals delivered" });
  } catch (err) {
    next(err);
  }
};

exports.putMealDelivered = async (req, res, next) => {
  const { clientId, dateId, dayMealId } = req.body;
  try {
    const filter = { _id: clientId, "mealsPlan.meals._id": dateId };
    const update = {
      $set: { "mealsPlan.meals.$[i].dayMeals.$[j].delivered": true },
    };
    const options = {
      arrayFilters: [{ "i._id": dateId }, { "j._id": dayMealId }],
    };
    await Client.updateOne(filter, update, options);
    const client = await Client.findById(clientId);
    await client.setDayDelivered(dateId, "meal");
    res.status(200).json({ success: true, message: "meal delivered" });
  } catch (err) {
    next(err);
  }
};

exports.getPrintMealsLabels = async (req, res, next) => {
  const mealFilter = req.query.mealFilter;
  const mealsDate = req.query.mealsDate;
  try {
    const date = new Date(mealsDate).setHours(0, 0, 0, 0);
    const isoDate = new Date(date);
    const localDate = new Date(
      isoDate.getTime() - isoDate.getTimezoneOffset() * 60000
    ).toISOString();
    const clients = await Client.find({
      subscriped: true,
      "subscripedBundle.startingDate": { $lte: localDate },
      "subscripedBundle.endingDate": { $gte: localDate },
      "clientStatus.paused": false,
      "subscripedBundle.isPaid": true,
    });
    textDate = new Date(localDate).toDateString();
    let labels = [];
    for (let client of clients) {
      let hasMeals = false;
      for (let meal of client.mealsPlan.meals) {
        if (
          meal.date.toDateString() === textDate &&
          (mealFilter === "all" || mealFilter === "")
        ) {
          for (let key in meal.dayMeals) {
            let mealLabel = {
              clientName: client.clientName,
              memberShip: client.subscriptionId,
              title: meal.dayMeals[key].title,
              submitted: meal.dayMeals[key].submitted,
              delivered: meal.dayMeals[key].delivered,
              date: new Date(localDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
              hint: "الوجبه صالحه لمدة 3 ايام",
            };
            if (mealLabel.submitted && !mealLabel.delivered) {
              labels.push(mealLabel);
              hasMeals = true;
            }
          }
          break;
        } else if (
          meal.date.toDateString() === textDate &&
          mealFilter === "breakfast"
        ) {
          for (let key in meal.dayMeals) {
            if (meal.dayMeals[key].mealType === "افطار") {
              let mealLabel = {
                clientName: client.clientName,
                memberShip: client.subscriptionId,
                title: meal.dayMeals[key].title,
                submitted: meal.dayMeals[key].submitted,
                delivered: meal.dayMeals[key].delivered,
                date: new Date(localDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                hint: "الوجبه صالحه لمدة 3 ايام",
              };
              if (mealLabel.submitted && !mealLabel.delivered) {
                labels.push(mealLabel);
                hasMeals = true;
              }
            }
          }
          break;
        } else if (
          meal.date.toDateString() === textDate &&
          mealFilter === "lunch"
        ) {
          for (let key in meal.dayMeals) {
            if (meal.dayMeals[key].mealType === "غداء") {
              let mealLabel = {
                clientName: client.clientName,
                memberShip: client.subscriptionId,
                title: meal.dayMeals[key].title,
                submitted: meal.dayMeals[key].submitted,
                delivered: meal.dayMeals[key].delivered,
                date: new Date(localDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                hint: "الوجبه صالحه لمدة 3 ايام",
              };
              if (mealLabel.submitted && !mealLabel.delivered) {
                labels.push(mealLabel);
                hasMeals = true;
              }
            }
          }
          break;
        } else if (
          meal.date.toDateString() === textDate &&
          mealFilter === "dinner"
        ) {
          for (let key in meal.dayMeals) {
            if (meal.dayMeals[key].mealType === "عشاء") {
              let mealLabel = {
                clientName: client.clientName,
                memberShip: client.subscriptionId,
                title: meal.dayMeals[key].title,
                submitted: meal.dayMeals[key].submitted,
                delivered: meal.dayMeals[key].delivered,
                date: new Date(localDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                hint: "الوجبه صالحه لمدة 3 ايام",
              };
              if (mealLabel.submitted && !mealLabel.delivered) {
                labels.push(mealLabel);
                hasMeals = true;
              }
            }
          }
          break;
        } else if (
          meal.date.toDateString() === textDate &&
          mealFilter === "snack"
        ) {
          for (let key in meal.dayMeals) {
            if (meal.dayMeals[key].mealType === "سناك") {
              let mealLabel = {
                clientName: client.clientName,
                memberShip: client.subscriptionId,
                title: meal.dayMeals[key].title,
                submitted: meal.dayMeals[key].submitted,
                delivered: meal.dayMeals[key].delivered,
                date: new Date(localDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                hint: "الوجبه صالحه لمدة 3 ايام",
              };
              if (mealLabel.submitted && !mealLabel.delivered) {
                labels.push(mealLabel);
                hasMeals = true;
              }
            }
          }
          break;
        }
      }
      let addressLabel = {
        clientName: client.clientName,
        memberShip: client.subscriptionId,
        title: client.phoneNumber,
        date: new Date(localDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        hint: `/م:${client.distrect}/ق:${client.streetName}/ش:${client.homeNumber}/ر:${client.floorNumber}/د:${client.appartment}`,
      };
      if (hasMeals) {
        labels.push(addressLabel);
      }
    }
    const reportName = "labels" + Date.now() + ".pdf";
    const reportPath = path.join("data", reportName);
    const arFont = path.join("public", "fonts", "Janna.ttf");
    const Doc = new PdfDoc({
      size: [164.43, 107.73],
      margin: 1,
    });
    Doc.pipe(fs.createWriteStream(reportPath));
    let x = 2;
    let y = 2;
    labels.forEach((label, idx) => {
      Doc.font(arFont)
        .fontSize(11)
        .text(
          utilities.textDirection(`${label.clientName} - ${label.memberShip}`),
          x,
          y,
          {
            align: "center",
          }
        );
      Doc.font(arFont)
        .fontSize(11)
        .text(utilities.textDirection(`${label.title}`), { align: "center" });
      Doc.font(arFont)
        .fontSize(11)
        .text(utilities.textDirection(`${label.date}`), { align: "center" });
      Doc.font(arFont)
        .fontSize(9)
        .text(utilities.textDirection(`${label.hint}`), {
          align: "center",
          width: 150,
        });
      if (idx < labels.length - 1) {
        Doc.addPage();
      }
    });
    Doc.end();
    let protocol;
    if (req.get("host").includes("localhost")) {
      protocol = `${req.protocol}`;
    } else {
      protocol = `${req.protocol}s`;
    }
    const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
    res.status(200).json({ success: true, url: reportUrl });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.postDeliverDayMeals = async (req, res, next) => {
  const { clientId, mealId } = req.body;
  try {
    const updatedClient = await Client.updateOne(
      {
        _id: clientId,
        "mealsPlan.meals": { $elemMatch: { _id: mealId, submitted: true } },
      },
      { $set: { "mealsPlan.meals.$.delivered": true } }
    );
    if (updatedClient.modifiedCount === 1) {
      return res.status(201).json({ message: "success" });
    }
    res.status(200).redirect("/admin/dashboard");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  const reportName = req.query.reportName;
  if (reportName === "active clients") {
    try {
      const clients = await Client.find({
        subscriped: true,
        "clientStatus.paused": false,
      }).populate("subscripedBundle.bundleId");
      const clientsInfo = [];
      let index = 0;
      for (let client of clients) {
        ++index;
        let clientData = [];
        clientData.push(
          utilities.textDirection(client.dislikedMeals),
          Math.floor(
            utilities.getRemainingDays(
              client.subscripedBundle.startingDate,
              client.subscripedBundle.endingDate
            )
          ),
          client.subscripedBundle.endingDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          client.subscripedBundle.startingDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          client.subscripedBundle.bundleId.snacksNumber,
          client.subscripedBundle.bundleId.mealsNumber,
          utilities.textDirection(client.subscripedBundle.bundleId.timeOnCard),
          utilities.textDirection(client.subscripedBundle.bundleId.bundleName),
          client.phoneNumber,
          utilities.textDirection(client.clientName),
          index
        );
        clientsInfo.push(clientData);
      }
      clientsInfo.sort((a, b) => {
        return a.remainingDays - b.remainingDays;
      });
      const clientsReport = await utilities.activeClientsReport(clientsInfo);
      let protocol;
      if (req.get("host").includes("localhost")) {
        protocol = `${req.protocol}`;
      } else {
        protocol = `${req.protocol}s`;
      }
      const reportUrl = `${protocol}://${req.get(
        "host"
      )}/data/${clientsReport}`;
      res.status(200).json({ success: true, url: reportUrl });
    } catch (err) {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    }
  } else if (reportName === "kitchenMeals") {
    try {
      const date = req.query.dateFrom;
      if (!date) {
        const error = new Error("Date is required!");
        error.statusCode = 422;
        throw error;
      }
      const newDate = new Date(date).setHours(0, 0, 0, 0);
      const localDate = utilities.getLocalDate(new Date(newDate));
      const bundles = await Bundle.find();
      const reportData = [];
      for (let bundle of bundles) {
        const kitchenData = {};
        const meals = await Client.aggregate([
          // Match clients with subscribed status and not paused
          {
            $match: {
              subscriped: true,
              "clientStatus.paused": false,
              "subscripedBundle.bundleId": bundle._id,
            },
          },
          // Unwind the meals array
          {
            $unwind: "$mealsPlan.meals",
          },
          // Match meals with a specific date
          {
            $match: {
              "mealsPlan.meals.date": localDate,
            },
          },
          // Unwind the dayMeals array
          {
            $unwind: "$mealsPlan.meals.dayMeals",
          },
          // Group by meal type and count the number of meals
          {
            $group: {
              _id: "$mealsPlan.meals.dayMeals.title",
              numberOfMeals: {
                $sum: 1,
              },
            },
          },
          // Lookup the bundle information
          {
            $lookup: {
              from: "bundle", // Replace with the actual name of the "Bundle" collection
              localField: "subscripedBundle.bundleId",
              foreignField: "_id",
              as: "bundle",
            },
          },
          // Project the desired fields in the output
          {
            $project: {
              _id: 0,
              title: "$_id",
              numberOfMeals: 1,
            },
          },
        ]);
        if (meals.length > 0) {
          kitchenData.bundleName = bundle.bundleName;
          kitchenData.bundleNutrition = bundle.timeOnCard;
          kitchenData.meals = meals;
          reportData.push(kitchenData);
        }
      }
      const reportName = `kitchen-meals-report-${Date.now()}.pdf`;
      const reportPath = path.join("data", reportName);
      const arFont = path.join("public", "fonts", "Janna.ttf");
      const headerImg = path.join("public", "img", "headerSmall.png");
      const reportElements = [];
      for (let data of reportData) {
        let reportElement = {};
        let index = 0;
        let kitchenMeals = [];
        for (let meal of data.meals) {
          ++index;
          let detail = [];
          detail.push(
            meal.numberOfMeals,
            utilities.textDirection(meal.title),
            index
          );
          kitchenMeals.push(detail);
        }
        const mealsTable = {
          headers: [
            { label: "العدد", align: "center", headerColor: "gray" },
            { label: "الوجبه اسم", align: "center", headerColor: "gray" },
            {
              label: "مسلسل",
              align: "center",
              headerColor: "gray",
              columnColor: "gray",
            },
          ],
          rows: kitchenMeals,
        };
        reportElement.bundleName = data.bundleName;
        reportElement.bundleNutrition = data.bundleNutrition;
        reportElement.mealsTable = mealsTable;
        reportElements.push(reportElement);
      }
      const Doc = new PdfDoc({ size: "A4", margin: 2 });
      Doc.pipe(fs.createWriteStream(reportPath));
      Doc.image(headerImg, {
        height: 120,
        align: "center",
      });
      Doc.font(arFont)
        .fontSize(16)
        .text(
          `${localDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })} : الوجبات استحقاق تاريخ`,
          { align: "right" }
        );
      Doc.font(arFont)
        .fontSize(16)
        .text(`${utilities.textDirection("تقرير  المطبخ")}`, {
          align: "center",
          underline: true,
        });
      Doc.text("                                 ", { height: 50 });
      reportElements.forEach(async (elem) => {
        Doc.font(arFont)
          .fontSize(14)
          .text(`${utilities.textDirection(elem.bundleName)}  : الباقه  اسم`, {
            align: "right",
          });
        Doc.font(arFont)
          .fontSize(14)
          .text(`${elem.bundleNutrition}  : الغذائيه  القيمه`, {
            align: "right",
          });
        await Doc.table(elem.mealsTable, {
          prepareHeader: () => Doc.font(arFont).fontSize(12),
          prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            Doc.font(arFont).fontSize(12);
            indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
          },
        });
      });
      Doc.end();
      let protocol;
      if (req.get("host").includes("localhost")) {
        protocol = `${req.protocol}`;
      } else {
        protocol = `${req.protocol}s`;
      }
      const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
      res.status(200).json({ success: true, url: reportUrl });
    } catch (err) {
      next(err);
    }
  } else if (reportName === "paymentHistory") {
    try {
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;
      const endDateTo = new Date(dateTo).setHours(23, 59, 59, 0);
      if (!dateFrom || !dateTo) {
        const error = new Error("Date is required!");
        error.statusCode = 422;
        throw error;
      }
      const localDateFrom = utilities.getLocalDate(dateFrom);
      const localDateTo = utilities.getLocalDate(endDateTo);
      if (localDateTo < localDateFrom) {
        const error = new Error("End date must be greater than start date!");
        error.statusCode = 422;
        throw error;
      }
      const transactions = await Transaction.find({
        createdAt: {
          $gte: new Date(localDateFrom),
          $lte: new Date(localDateTo),
        },
      }).populate("clientId");
      const reportName = `payment-history-report-${Date.now()}.pdf`;
      const reportPath = path.join("data", reportName);
      const arFont = path.join("public", "fonts", "Janna.ttf");
      const headerImg = path.join("public", "img", "headerSmall.png");
      let index = 0;
      const transactionsData = [];
      for (let transaction of transactions) {
        ++index;
        let detail = [];
        detail.push(
          transaction.paymentId,
          transaction.amount,
          transaction.paymentStatus,
          transaction.transactionStatus,
          utilities
            .getLocalDate(transaction.createdAt)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
          utilities.textDirection(transaction.clientId?.clientName || ""),
          index
        );
        transactionsData.push(detail);
      }
      const transactionsTable = {
        headers: [
          {
            label: "الدفع مرجع",
            align: "center",
            headerColor: "gray",
            width: 120,
          },
          { label: "القيمه", align: "center", headerColor: "gray", width: 70 },
          {
            label: "الدفع بوابه",
            align: "center",
            headerColor: "gray",
            width: 80,
          },
          {
            label: "الدفع حاله",
            align: "center",
            headerColor: "gray",
            width: 80,
          },
          { label: "التاريخ", align: "center", headerColor: "gray", width: 80 },
          {
            label: "العميل اسم",
            align: "center",
            headerColor: "gray",
            width: 110,
          },
          {
            label: "مسلسل",
            align: "center",
            headerColor: "gray",
            columnColor: "gray",
            width: 50,
          },
        ],
        rows: transactionsData,
      };
      const Doc = new PdfDoc({ size: "A4", margin: 2 });
      Doc.pipe(fs.createWriteStream(reportPath));
      Doc.image(headerImg, {
        height: 120,
        align: "center",
      });
      Doc.font(arFont)
        .fontSize(16)
        .text(
          `${new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })} : التاريخ`,
          { align: "right" }
        );
      Doc.font(arFont)
        .fontSize(16)
        .text(`${utilities.textDirection("تقرير  المدفوعات")}`, {
          align: "center",
          underline: true,
        });
      Doc.text("                                 ", { height: 50 });
      await Doc.table(transactionsTable, {
        prepareHeader: () => Doc.font(arFont).fontSize(12),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          Doc.font(arFont).fontSize(12);
          indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
        },
      });
      Doc.end();
      let protocol;
      if (req.get("host").includes("localhost")) {
        protocol = `${req.protocol}`;
      } else {
        protocol = `${req.protocol}s`;
      }
      const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
      res.status(200).json({ success: true, url: reportUrl });
    } catch (err) {
      next(err);
    }
  } else if (reportName === "clientHistory") {
    const clientId = req.query.clientId;
    const client = await Client.findById(clientId);
    const subscriptions = await Subscription.find({
      clientId: clientId,
    }).populate("bundleId");
    const subscriptionsInfo = [];
    let index = 0;
    for (let sub of subscriptions) {
      ++index;
      let subscriptionData = [];
      subscriptionData.push(
        sub.bundleId.bundlePrice,
        sub.endingDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        sub.startingDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        utilities.textDirection(sub.bundleId.bundleName),
        index
      );
      subscriptionsInfo.push(subscriptionData);
    }
    const reportName = `subscription-history-report-${Date.now()}.pdf`;
    const reportPath = path.join("data", reportName);
    const arFont = path.join("public", "fonts", "Janna.ttf");
    const headerImg = path.join("public", "img", "headerSmall.png");
    const subscriptionsTable = {
      headers: [
        {
          label: "السعر",
          align: "center",
          headerColor: "gray",
          width: 120,
        },
        {
          label: "الاشتراك  نهاية",
          align: "center",
          headerColor: "gray",
          width: 130,
        },
        {
          label: "الاشتراك  بداية",
          align: "center",
          headerColor: "gray",
          width: 130,
        },
        {
          label: "الباقه اسم",
          align: "center",
          headerColor: "gray",
          width: 140,
        },
        {
          label: "مسلسل",
          align: "center",
          headerColor: "gray",
          columnColor: "gray",
          width: 70,
        },
      ],
      rows: subscriptionsInfo,
    };
    const Doc = new PdfDoc({ size: "A4", margin: 2 });
    Doc.pipe(fs.createWriteStream(reportPath));
    Doc.image(headerImg, {
      height: 120,
      align: "center",
    });
    Doc.font(arFont)
      .fontSize(16)
      .text(
        `${new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })} : التاريخ`,
        { align: "right" }
      );
    Doc.font(arFont)
      .fontSize(16)
      .text(`${utilities.textDirection("تقرير سجل الاشتراكات")}`, {
        align: "center",
        underline: true,
      });
    Doc.text("                                 ", { height: 50 });
    Doc.font(arFont)
      .fontSize(16)
      .text(
        `${utilities.textDirection(
          client.clientName
        )} ${utilities.textDirection("اسم العميل: ")}`,
        {
          align: "right",
        }
      );
    Doc.font(arFont)
      .fontSize(16)
      .text(
        `${utilities.textDirection(
          client.phoneNumber
        )} ${utilities.textDirection("رقم الهاتف: ")}`,
        {
          align: "right",
        }
      );
    await Doc.table(subscriptionsTable, {
      prepareHeader: () => Doc.font(arFont).fontSize(12),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        Doc.font(arFont).fontSize(12);
        indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
      },
    });
    Doc.end();
    let protocol;
    if (req.get("host").includes("localhost")) {
      protocol = `${req.protocol}`;
    } else {
      protocol = `${req.protocol}s`;
    }
    const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
    res.status(200).json({ success: true, url: reportUrl });
  }
};

exports.getInactiveClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ subscriped: false });
    const bundles = await Bundle.find({});
    const clientsInfo = [];
    for (let client of clients) {
      let clientData = {};
      clientData.clientName = client.clientName;
      clientData.phoneNumber = client.phoneNumber;
      clientData.paused = client.clientStatus.paused;
      clientData.clientId = client._id;
      clientsInfo.push(clientData);
    }
    res.status(201).render("admin/inactiveClients", {
      pageTitle: "تقرير العملاء غير النشطين",
      clientsData: clientsInfo,
      bundles: bundles,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getClientContract = async (req, res, next) => {
  const clientId = req.query.clientId;
  try {
    const client = await Client.findById(clientId).populate(
      "subscripedBundle.bundleId"
    );
    if (!client.subscriped) {
      throw new Error("Client is not subscriped to any bundle!");
    }
    const reportName = "contract" + Date.now() + ".pdf";
    const reportPath = path.join("data", reportName);
    const arFont = path.join("public", "fonts", "Janna.ttf");
    const headerImg = path.join("public", "img", "headerSmall.png");
    const footerImg = path.join("public", "img", "footerSmall.png");
    const Doc = new PdfDoc({ size: "A4", margin: 0 });
    Doc.pipe(fs.createWriteStream(reportPath));
    Doc.image(headerImg, {
      height: 120,
      align: "center",
    });
    Doc.font(arFont)
      .fontSize(20)
      .text(
        `Date: ${utilities
          .getLocalDate(client.subscripedBundle.startingDate)
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}`,
        25,
        150,
        {
          align: "left",
        }
      );
    Doc.font(arFont)
      .fontSize(22)
      .fillColor("red")
      .text(utilities.textDirection("عقد  إشتراك"), {
        underline: true,
        align: "center",
      });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("الأسم  بالكامل")}`, 465, 240, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont)
      .fontSize(16)
      .text(`${utilities.textDirection(client.clientName)}`, 200, 240, {
        align: "center",
        width: 250,
      });
    Doc.font(arFont).fontSize(16).text(`Full Name`, 25, 240, {
      align: "left",
      width: 100,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("تفاصيل  الإشتراك")}`, 465, 290, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont)
      .fontSize(14)
      .text(
        `${utilities.textDirection(
          " باقة/  " +
            client.subscripedBundle.bundleId.bundleName +
            "  وجبات/ " +
            client.subscripedBundle.bundleId.mealsNumber +
            "  سناك/ " +
            client.subscripedBundle.bundleId.snacksNumber
        )}`,
        220,
        290,
        {
          align: "center",
          width: 220,
        }
      );
    Doc.font(arFont).fontSize(14).text(`Subscription Details`, 25, 290, {
      align: "left",
      width: 150,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("مدة  الإشتراك")}`, 465, 340, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont)
      .fontSize(16)
      .text(
        `${utilities.textDirection(
          " من/  " +
            client.subscripedBundle.startingDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) +
            "  الى/ " +
            new Date(
              client.subscripedBundle.endingDate.setUTCHours(0)
            ).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
        )}`,
        200,
        340,
        {
          align: "center",
          width: 250,
        }
      );
    Doc.font(arFont).fontSize(14).text(`Subscription Period`, 25, 340, {
      align: "left",
      width: 150,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("الهاتف  الجوال")}`, 465, 390, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont).fontSize(16).text(client.phoneNumber, 200, 390, {
      align: "center",
      width: 250,
    });
    Doc.font(arFont).fontSize(16).text(`Mobile Number`, 25, 390, {
      align: "left",
      width: 150,
    });
    Doc.font(arFont)
      .fontSize(14)
      .fillColor("black")
      .text(`${utilities.textDirection("عنوان التوصيل")}`, 465, 440, {
        align: "right",
        width: 110,
      });
    Doc.font(arFont)
      .fontSize(12)
      .text(
        `${utilities.textDirection(
          " / منطقه " +
            client.distrect +
            " /قطعه " +
            client.streetName +
            "  / شارع " +
            client.homeNumber +
            "  /منزل " +
            client.floorNumber +
            "  /طابق-شقه " +
            client.appartment
        )}`,
        170,
        440,
        {
          align: "center",
          width: 310,
        }
      );
    Doc.font(arFont).fontSize(14).text(`Delivery Address`, 25, 440, {
      align: "left",
      width: 120,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("سعر الاشتراك")}`, 465, 490, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont)
      .fontSize(16)
      .text(
        " دينار " + client.subscripedBundle.bundleId.bundlePrice,
        200,
        490,
        {
          align: "center",
          width: 250,
          underline: true,
        }
      );
    Doc.font(arFont).fontSize(16).text(`Subscription Price`, 25, 490, {
      align: "left",
      width: 150,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("رقم  العضويه")}`, 465, 540, {
        align: "right",
        width: 120,
      });
    Doc.font(arFont).fontSize(16).text(client.subscriptionId, 200, 540, {
      align: "center",
      width: 150,
      underline: true,
    });
    Doc.font(arFont).fontSize(16).text(`Membership Number`, 25, 540, {
      align: "left",
      width: 200,
    });
    Doc.font(arFont)
      .fontSize(16)
      .fillColor("black")
      .text(`${utilities.textDirection("ملاحظات / ")}`, 465, 590, {
        align: "right",
        width: 120,
      });
    Doc.image(footerImg, -38, 720, {
      height: 130,
      align: "center",
    });
    Doc.end();
    let protocol;
    if (req.get("host").includes("localhost")) {
      protocol = `${req.protocol}`;
    } else {
      protocol = `${req.protocol}s`;
    }
    const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
    res.status(200).json({ success: true, url: reportUrl });
  } catch (err) {
    next(err);
  }
};

// exports.getKitchenMealsReport = async (req, res, next) => {
//   const reportName = req.query.reportName;
//   if (reportName === "kitchenMeals") {
//     try {
//       const date = req.query.dateFrom;
//       if (!date) {
//         const error = new Error("Date is required!");
//         error.statusCode = 422;
//         throw error;
//       }
//       const newDate = new Date(date).setHours(0, 0, 0, 0);
//       const localDate = utilities.getLocalDate(new Date(newDate));
//       const meals = await Client.aggregate([
//         // Match clients with subscribed status and not paused
//         {
//           $match: {
//             subscriped: true,
//             "clientStatus.paused": false,
//           },
//         },
//         // Unwind the meals array
//         {
//           $unwind: "$mealsPlan.meals",
//         },
//         // Match meals with a specific date
//         {
//           $match: {
//             "mealsPlan.meals.date": localDate,
//           },
//         },
//         // Unwind the dayMeals array
//         {
//           $unwind: "$mealsPlan.meals.dayMeals",
//         },
//         // Group by meal type and count the number of meals
//         {
//           $group: {
//             _id: "$mealsPlan.meals.dayMeals.title",
//             numberOfMeals: {
//               $sum: 1,
//             },
//           },
//         },
//         // Lookup the bundle information
//         {
//           $lookup: {
//             from: "bundle", // Replace with the actual name of the "Bundle" collection
//             localField: "subscripedBundle.bundleId",
//             foreignField: "_id",
//             as: "bundle",
//           },
//         },
//         // Project the desired fields in the output
//         {
//           $project: {
//             _id: 0,
//             title: "$_id",
//             numberOfMeals: 1,
//           },
//         },
//       ]);
//       const reportName = `kitchen-meals-report-${Date.now()}.pdf`;
//       const reportPath = path.join("data", reportName);
//       const arFont = path.join("public", "fonts", "Janna.ttf");
//       const headerImg = path.join("public", "img", "headerSmall.png");
//       let index = 0;
//       const kitchenMeals = [];
//       for (let meal of meals) {
//         ++index;
//         let detail = [];
//         detail.push(
//           meal.numberOfMeals,
//           utilities.textDirection(meal.title),
//           index
//         );
//         kitchenMeals.push(detail);
//       }
//       const mealsTable = {
//         headers: [
//           { label: "العدد", align: "center", headerColor: "gray" },
//           { label: "الوجبه اسم", align: "center", headerColor: "gray" },
//           {
//             label: "مسلسل",
//             align: "center",
//             headerColor: "gray",
//             columnColor: "gray",
//           },
//         ],
//         rows: kitchenMeals,
//       };
//       const Doc = new PdfDoc({ size: "A4", margin: 2 });
//       Doc.pipe(fs.createWriteStream(reportPath));
//       Doc.image(headerImg, {
//         height: 120,
//         align: "center",
//       });
//       Doc.font(arFont)
//         .fontSize(16)
//         .text(
//           `${localDate.toLocaleDateString("en-GB", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric",
//           })} : الوجبات استحقاق تاريخ`,
//           { align: "right" }
//         );
//       Doc.font(arFont)
//         .fontSize(16)
//         .text(`${utilities.textDirection("تقرير  المطبخ")}`, {
//           align: "center",
//           underline: true,
//         });
//       Doc.text("                                 ", { height: 50 });
//       await Doc.table(mealsTable, {
//         prepareHeader: () => Doc.font(arFont).fontSize(12),
//         prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
//           Doc.font(arFont).fontSize(12);
//           indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
//         },
//       });
//       Doc.end();
//       let protocol;
//       if (req.get("host").includes("localhost")) {
//         protocol = `${req.protocol}`;
//       } else {
//         protocol = `${req.protocol}s`;
//       }
//       const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
//       res.status(200).json({ success: true, url: reportUrl });
//     } catch (err) {
//       next(err);
//     }
//   }
// };

// exports.getPaymentsHistory = async (req, res, next) => {
//   const reportName = req.query.reportName;
//   if (reportName === "paymentHistory") {
//     try {
//       const dateFrom = req.query.dateFrom;
//       const dateTo = req.query.dateTo;
//       if (!dateFrom || dateTo) {
//         const error = new Error("Date is required!");
//         error.statusCode = 422;
//         throw error;
//       }
//       const transactions = await Transaction.find({
//         createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
//       }).populate("clientId");
//       const reportName = `payment-history-report-${Date.now()}.pdf`;
//       const reportPath = path.join("data", reportName);
//       const arFont = path.join("public", "fonts", "Janna.ttf");
//       const headerImg = path.join("public", "img", "headerSmall.png");
//       let index = 0;
//       const transactionsData = [];
//       for (let transaction of transactions) {
//         ++index;
//         let detail = [];
//         detail.push(
//           transaction.paymentId,
//           transaction.amount,
//           transaction.paymentStatus,
//           transaction.transactionStatus,
//           utilities
//             .getLocalDate(transaction.createdAt)
//             .toLocaleDateString("en-GB", {
//               day: "2-digit",
//               month: "2-digit",
//               year: "numeric",
//             }),
//           transaction.clientId.clientName,
//           index
//         );
//         transactionsData.push(detail);
//       }
//       const transactionsTable = {
//         headers: [
//           {
//             label: "الدفع مرجع",
//             align: "center",
//             headerColor: "gray",
//             width: 120,
//           },
//           { label: "القيمه", align: "center", headerColor: "gray", width: 70 },
//           {
//             label: "الدفع بوابه",
//             align: "center",
//             headerColor: "gray",
//             width: 80,
//           },
//           {
//             label: "الدفع حاله",
//             align: "center",
//             headerColor: "gray",
//             width: 80,
//           },
//           { label: "التاريخ", align: "center", headerColor: "gray", width: 80 },
//           {
//             label: "العميل اسم",
//             align: "center",
//             headerColor: "gray",
//             width: 110,
//           },
//           {
//             label: "مسلسل",
//             align: "center",
//             headerColor: "gray",
//             columnColor: "gray",
//             width: 50,
//           },
//         ],
//         rows: transactionsData,
//       };
//       const Doc = new PdfDoc({ size: "A4", margin: 2 });
//       Doc.pipe(fs.createWriteStream(reportPath));
//       Doc.image(headerImg, {
//         height: 120,
//         align: "center",
//       });
//       Doc.font(arFont)
//         .fontSize(16)
//         .text(
//           `${new Date().toLocaleDateString("en-GB", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric",
//           })} : التاريخ`,
//           { align: "right" }
//         );
//       Doc.font(arFont)
//         .fontSize(16)
//         .text(`${utilities.textDirection("تقرير  المدفوعات")}`, {
//           align: "center",
//           underline: true,
//         });
//       Doc.text("                                 ", { height: 50 });
//       await Doc.table(transactionsTable, {
//         prepareHeader: () => Doc.font(arFont).fontSize(12),
//         prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
//           Doc.font(arFont).fontSize(12);
//           indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
//         },
//       });
//       Doc.end();
//       let protocol;
//       if (req.get("host").includes("localhost")) {
//         protocol = `${req.protocol}`;
//       } else {
//         protocol = `${req.protocol}s`;
//       }
//       const reportUrl = `${protocol}://${req.get("host")}/data/${reportName}`;
//       res.status(200).json({ success: true, url: reportUrl });
//     } catch (err) {
//       next(err);
//     }
//   }
// };
