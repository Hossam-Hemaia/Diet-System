const express = require("express");
const adminController = require("../controllers/adminController");
const isAuth = require("../validations/is-Auth");

const router = express.Router();

router.get(
  "/manager/get/meals",
  isAuth.managerIsAuth,
  adminController.getMeals
);

router.post(
  "/manager/chiff/menu",
  isAuth.managerIsAuth,
  adminController.addChiffMenuDay
);

router.get(
  "/manager/delivery/meals",
  isAuth.managerIsAuth,
  adminController.getMealsToDeliver
);

router.put(
  "/manager/set/meal/delivered",
  isAuth.managerIsAuth,
  adminController.putMealDelivered
);

router.get(
  "/manager/print/labels",
  isAuth.managerIsAuth,
  adminController.getPrintMealsLabels
);

////////////reports///////////////////
router.get(
  "/manager/active/clients",
  isAuth.managerIsAuth,
  adminController.getReport
);

router.put(
  "/set/all/meals/delivered",
  isAuth.managerIsAuth,
  adminController.putDeliverAllMeals
);

module.exports = router;
