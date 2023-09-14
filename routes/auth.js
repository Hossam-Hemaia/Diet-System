const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Client = require("../models/client");
const Admin = require("../models/admin");
const authController = require("../controllers/authController");
const validation = require("../validations/inputValidate");
const isAuth = require("../validations/is-Auth");

router.post(
  "/register/new/client",
  [
    validation.validateName,
    validation.validatePhoneNumber.custom(async (value, { req }) => {
      if (value[0] === "9") {
        return true;
      } else if (value[0] === "6") {
        return true;
      } else if (value[0] === "5") {
        return true;
      } else {
        throw new Error("Your phone number must start with 9 or 6 or 5");
      }
    }),
    validation.validateEmail.custom(async (value, { req }) => {
      const registeredClient = await Client.findOne({ email: value });
      if (registeredClient) {
        const error = new Error("البريد الاليكترونى مسجل من قبل!");
        error.statusCode = 422;
        throw error;
      }
    }),
    validation.validatePassword.custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("كلمة المرور غير مطابقه");
      }
    }),
  ],
  authController.postClientRegister
);

router.post(
  "/create/admin",
  isAuth.adminIsAuth,
  authController.postCreateAdmin
);

router.post(
  "/login",
  [
    validation.validatePass.custom(async (value, { req }) => {
      let user;
      user = await Client.findOne({ email: req.body.username });
      if (user) {
        const doMatch = await bcrypt.compare(value, user.password);
        if (!doMatch) {
          throw new Error("Invalid password");
        }
        req.user = user;
      } else if (!user) {
        user = await Admin.findOne({ username: req.body.username });
        if (user && user.isActive) {
          const doMatch = await bcrypt.compare(value, user.password);
          if (!doMatch) {
            throw new Error("Invalid password");
          }
          req.user = user;
        }
      } else {
        throw new Error("Invalid credentials!");
      }
    }),
  ],
  authController.postLogin
);

router.post("/forgot/password", authController.postForgotPassword);

router.post("/verify/code", authController.postCodeVerification);

router.post(
  "/reset/password",
  [
    validation.validatePassword.custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("كلمة المرور غير متطابقه");
      }
    }),
  ],
  authController.postResetPassword
);

router.get("/auth/google", authController.getGoogleUrl);

router.get("/auth/google/callback", authController.postGoogleAuth);

router.get("/get/verify/token", authController.getVerifyToken);

router.post("/generate/access/token", authController.postGenerateAccessToken);

module.exports = router;
