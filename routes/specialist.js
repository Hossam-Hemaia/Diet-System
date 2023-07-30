const express = require("express");
const specailstController = require("../controllers/specialistController");
const isAuth = require("../validations/is-Auth");

const router = express.Router();

router.get(
  "/clients/messages",
  isAuth.specialistIsAuth,
  specailstController.getIncomingMessages
);

router.get(
  "/client/messages",
  isAuth.specialistIsAuth,
  specailstController.getClientMessages
);

router.post(
  "/set/client/bmi",
  isAuth.specialistIsAuth,
  specailstController.postWieghtTall
);

router.put(
  "/set/message/status",
  isAuth.specialistIsAuth,
  specailstController.putMessageStatus
);

router.post(
  "/message/reply",
  isAuth.specialistIsAuth,
  specailstController.postReplyMessage
);

module.exports = router;
