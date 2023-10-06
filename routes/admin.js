const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const isAuth = require("../validations/is-Auth");

/***************************************/
// Dashboard stats                      /
/***************************************/
router.get("/get/stats", isAuth.adminIsAuth, adminController.getStats);

/***************************************/
// Meals                                /
/***************************************/
router.post("/create/meal", isAuth.adminIsAuth, adminController.postAddMeal);

router.get("/get/meals", isAuth.adminIsAuth, adminController.getMeals);

router.get("/get/all/meals", isAuth.adminIsAuth, adminController.getAllMeals);

router.get(
  "/get/meals/type",
  isAuth.adminIsAuth,
  adminController.getMealsByType
);

router.get("/get/meal", isAuth.adminIsAuth, adminController.getMeal);

router.put("/edit/meal", isAuth.adminIsAuth, adminController.postEditMeal);

router.get("/meals/filter", isAuth.adminIsAuth, adminController.getMealsFilter);

router.delete("/delete/meal", isAuth.adminIsAuth, adminController.deleteMeal);

/***************************************/
// Bundles                               /
/***************************************/
router.post(
  "/create/bundle",
  isAuth.adminIsAuth,
  adminController.postCreateBundle
);

router.get("/get/bundles", isAuth.adminIsAuth, adminController.getBundles);

router.get(
  "/get/custom/bundles",
  isAuth.adminIsAuth,
  adminController.getCustomBundles
);

router.get("/get/bundle", isAuth.adminIsAuth, adminController.getBundle);

router.put("/edit/bundle", isAuth.adminIsAuth, adminController.putEditBundle);

router.delete(
  "/delete/bundle",
  isAuth.adminIsAuth,
  adminController.deleteBundle
);

router.delete(
  "/delete/menu/meal",
  isAuth.adminIsAuth,
  adminController.deleteMenuMeal
);

router.get("/bundle/menu", isAuth.adminIsAuth, adminController.getMenuMeals);

/***************************************/
// Users                                /
/***************************************/
router.post(
  "/create/employee",
  isAuth.adminIsAuth,
  adminController.postCreateUser
);

router.get("/get/user", isAuth.adminIsAuth, adminController.getUser);

router.get("/get/all/users", isAuth.adminIsAuth, adminController.getAllusers);

router.put("/edit/user", isAuth.adminIsAuth, adminController.editUser);

router.put(
  "/set/user/active",
  isAuth.adminIsAuth,
  adminController.putUserActive
);

router.delete("/delete/user", isAuth.adminIsAuth, adminController.deleteUser);

// Settings
router.get("/get/settings", isAuth.adminIsAuth, adminController.getSettings);

router.post(
  "/set/settings",
  isAuth.adminIsAuth,
  adminController.postSetSettings
);
/***************************************/
// Menu                                 /
/***************************************/
router.post("/add/menu/day", isAuth.adminIsAuth, adminController.addMenuDay);

router.get("/get/menu", isAuth.adminIsAuth, adminController.getMenu);

router.delete(
  "/delete/menu/day",
  isAuth.adminIsAuth,
  adminController.deleteMenuDay
);
/***************************************/
// Chiff Menu                           /
/***************************************/
router.post(
  "/add/chiff/menu/day",
  isAuth.adminIsAuth,
  adminController.addChiffMenuDay
);

router.get("/get/chiff/menu", isAuth.adminIsAuth, adminController.getChiffMenu);

router.delete(
  "/delete/chiff/menu/day",
  isAuth.adminIsAuth,
  adminController.deleteChiffMenuDay
);
router.post(
  "/add/chiff/menu",
  isAuth.adminIsAuth,
  adminController.addChiffMenu
);
/***************************************/
// Client                               /
/***************************************/
router.delete(
  "/admin/remove/client",
  isAuth.adminIsAuth,
  adminController.deleteSubscriper
);

router.post(
  "/admin/create/client",
  isAuth.adminIsAuth,
  adminController.postAddNewClient
);

router.get("/find/client", isAuth.adminIsAuth, adminController.getFindClient);

router.put(
  "/add/client/name",
  isAuth.adminIsAuth,
  adminController.postAddClientName
);

router.get("/all/clients", isAuth.adminIsAuth, adminController.getAllClients);

router.get(
  "/monitor/clients",
  isAuth.adminIsAuth,
  adminController.getNewClients
);

router.get("/get/client", isAuth.adminIsAuth, adminController.getClient);

router.post(
  "/client/pause",
  isAuth.adminIsAuth,
  adminController.postPauseClient
);

router.put(
  "/activate/client",
  isAuth.adminIsAuth,
  adminController.postActivateClient
);

router.put(
  "/edit/client/meal",
  isAuth.adminIsAuth,
  adminController.putEditClientMeal
);

router.get(
  "/client/details",
  isAuth.adminIsAuth,
  adminController.getClientPlanDetails
);

router.post(
  "/renew/subscription",
  isAuth.adminIsAuth,
  adminController.postRenewSubscription
);

/***************************************/
// Manager                              /
/***************************************/
router.get(
  "/today/delivery/meals",
  isAuth.adminIsAuth,
  adminController.getMealsToDeliver
);

router.put(
  "/set/meal/delivered",
  isAuth.adminIsAuth,
  adminController.putMealDelivered
);

router.get(
  "/print/labels",
  isAuth.adminIsAuth,
  adminController.getPrintMealsLabels
);

router.post(
  "/print/meals/labels",
  isAuth.adminIsAuth,
  adminController.getPrintMealsLabels
);

router.post(
  "/admin/deliver/dayMeal",
  isAuth.adminIsAuth,
  adminController.postDeliverDayMeals
);

router.get("/report", isAuth.adminIsAuth, adminController.getReport);

router.get(
  "/admin/inactive/clients",
  isAuth.adminIsAuth,
  adminController.getInactiveClients
);

router.get(
  "/print/client/contract",
  isAuth.adminIsAuth,
  adminController.getClientContract
);

router.put("/set/all/meals/delivered", adminController.putDeliverAllMeals);

// router.get(
//   "/active/clients",
//   isAuth.adminIsAuth,
//   adminController.getKitchenMealsReport
// );

// router.get("/active/clients", adminController.getPaymentsHistory);

module.exports = router;
