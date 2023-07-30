const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const clientController = require("../controllers/clientController");
const isAuth = require("../validations/is-Auth");

router.get("/client/profile", isAuth.clientIsAuth, adminController.getClient);

router.put(
  "/edit/profile",
  isAuth.clientIsAuth,
  clientController.putEditClient
);

router.get("/client/bundles", adminController.getClientsBundles);

//////////////////Payment Method Section//////////////////
router.get(
  "/payment/url",
  isAuth.clientIsAuth,
  clientController.createNewCharge
);

router.post("/check/payment", clientController.checkPaymentStatus);
///////////////End of Payment Method Section//////////////

router.post("/bundle/subscripe", clientController.postSubscripe);

router.get("/client/meals", adminController.getMeals);

router.post(
  "/client/select/meal",
  isAuth.clientIsAuth,
  clientController.postSelectMeal
);

router.get(
  "/client/plan/details",
  isAuth.clientIsAuth,
  clientController.getClientPlanDetails
);

router.get(
  "/client/day/meals",
  isAuth.clientIsAuth,
  clientController.getMyMeals
);

router.put(
  "/client/change/meal",
  isAuth.clientIsAuth,
  adminController.putEditClientMeal
);

router.post(
  "/pause/subscription",
  isAuth.clientIsAuth,
  adminController.postPauseClient
);

router.put(
  "/activate/subscription",
  isAuth.clientIsAuth,
  adminController.postActivateClient
);

router.get(
  "/get/specialists",
  isAuth.clientIsAuth,
  clientController.getSpecialists
);

router.get("/get/specialist", isAuth.clientIsAuth, adminController.getUser);

router.post(
  "/send/message",
  isAuth.clientIsAuth,
  clientController.postSendMessage
);

router.get(
  "/my/messages",
  isAuth.clientIsAuth,
  clientController.getClientMessages
);

router.get("/menu/meals", isAuth.clientIsAuth, clientController.getMenuMeals);

router.get(
  "/filter/menu/meals",
  isAuth.clientIsAuth,
  clientController.getMenuMealByType
);

router.get("/mealsIds", clientController.addChiffMeals);

router.get(
  "/get/contract",
  isAuth.clientIsAuth,
  adminController.getClientContract
);

module.exports = router;
