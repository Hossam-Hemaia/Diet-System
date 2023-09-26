const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Client = require("../models/client");
const Admin = require("../models/admin");
const utilities = require("../utilities/utils");
const { validationResult } = require("express-validator");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");

exports.postClientRegister = async (req, res, next) => {
  const {
    clientName,
    phoneNumber,
    email,
    gender,
    distrect,
    streetName,
    homeNumber,
    floorNumber,
    appartment,
    password,
    dislikedMeals,
  } = req.body;
  const error = validationResult(req);
  try {
    if (!error.isEmpty() && error.array()[0].msg !== "Invalid value") {
      const errMsg = new Error(error.array()[0].msg);
      errMsg.statusCode = 422;
      throw errMsg;
    }
    const currentClient = await Client.findOne({ email: email });
    if (currentClient) {
      const error = new Error("client is already registered");
      error.statusCode = 422;
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    let clientNumber = 1;
    const lastClient = await Client.findOne({}, { subscriptionId: 1 }).sort({
      subscriptionId: -1,
    });
    if (lastClient) {
      clientNumber += Number(lastClient.subscriptionId);
    }
    const newClient = new Client({
      clientName,
      phoneNumber,
      email,
      subscriptionId: clientNumber,
      gender,
      distrect,
      streetName,
      homeNumber,
      floorNumber,
      appartment,
      password: hashedPassword,
      dislikedMeals,
    });
    await newClient.save();
    res.status(201).json({
      success: true,
      message: "Welcome aboard! your account has been created successfully!",
    });
  } catch (err) {
    next(err);
  }
};

exports.postLogin = async (req, res, next) => {
  const error = validationResult(req);
  try {
    if (!error.isEmpty() && error.array()[0].msg !== "Invalid value") {
      const errMsg = new Error(error.array()[0].msg);
      errMsg.statusCode = 422;
      throw errMsg;
    }
    const token = jwt.sign(
      {
        userId: req.user._id,
        role: req.user.role,
        active: req.user.isActive || "",
      },
      process.env.SECRET,
      { expiresIn: "7d" }
    );
    const refreshToken = jwt.sign({}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1y",
      audience: req.user._id.toString(),
    });
    res.status(200).json({
      success: true,
      token: token,
      refreshToken: refreshToken,
      user: req.user,
      message: "You logged in successfully!",
    });
  } catch (err) {
    next(err);
  }
};

exports.postCreateAdmin = async (req, res, next) => {
  const { userName, privilege, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = new Admin({
      userName,
      password: hashedPassword,
      privilege,
    });
    await admin.save();
    res
      .status(201)
      .json({ success: true, username: admin.userName, password: password });
  } catch (err) {
    next(err);
  }
};

exports.postForgotPassword = async (req, res, next) => {
  const email = req.body.email;
  const error = validationResult(req);
  try {
    // if (!error.isEmpty() && error.array()[0].msg !== "Invalid value") {
    //   const errMsg = new Error(error.array()[0].msg);
    //   errMsg.statusCode = 422;
    //   throw errMsg;
    // }
    const resetCode = Math.floor(Math.random() * 1000000);
    const code = resetCode.toString().padStart(6, "0");
    const date = Date.now();
    const client = await Client.findOne({ email: email });
    if (!client) {
      const error = new Error("Invalid Email");
      error.statusCode = 422;
      throw error;
    }
    client.resetCode = code;
    client.codeExpiry = date + 60 * 60 * 1000;
    await client.save();
    await utilities.emailSender(email, code);
    res.status(201).json({ success: true, message: "Confirmation email sent" });
  } catch (err) {
    next(err);
  }
};

exports.postCodeVerification = async (req, res, next) => {
  const code = req.body.code;
  const email = req.body.email;
  const error = validationResult(req);
  try {
    if (!error.isEmpty() && error.array()[0].msg !== "Invalid value") {
      const errMsg = new Error(error.array()[0].msg);
      errMsg.statusCode = 422;
      throw errMsg;
    }
    const client = await Client.findOne({ email: email });
    if (!client) {
      const error = new Error("Invalid email");
      error.statusCode = 422;
      throw error;
    }
    const date = Date.now();
    if (
      date <= Date.parse(client.codeExpiry) &&
      `${code}` === client.resetCode
    ) {
      return res
        .status(200)
        .json({ success: true, message: "code verification successful!" });
    } else {
      return res
        .status(422)
        .json({ success: false, message: "invalid code or code expired!" });
    }
  } catch (err) {
    next(err);
  }
};

exports.postResetPassword = async (req, res, next) => {
  const { email, password } = req.body;
  const error = validationResult(req);
  try {
    // if (!error.isEmpty() && error.array()[0].msg !== "Invalid value") {
    //   const errMsg = new Error(error.array()[0].msg);
    //   errMsg.statusCode = 422;
    //   throw errMsg;
    // }
    const client = await Client.findOne({ email: email });
    if (client.resetCode !== "") {
      const hashedPassword = await bcrypt.hash(password, 12);
      client.password = hashedPassword;
      client.resetCode = "";
      await client.save();
      return res
        .status(201)
        .json({ success: true, message: "password reset completed" });
    } else {
      return res
        .status(422)
        .json({ success: false, message: "Please verify your email" });
    }
  } catch (err) {
    next(err);
  }
};

exports.getGoogleUrl = async (req, res, next) => {
  try {
    const googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_SECRET,
      process.env.REDIRECT_URI
    );
    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
    });
    res.status(200).json({ success: true, authUrl: url });
  } catch (err) {
    next(err);
  }
};

exports.postGoogleAuth = async (req, res, next) => {
  const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SECRET,
    process.env.REDIRECT_URI
  );
  const code = req.query.code;
  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);
    const { data } = await google
      .oauth2("v2")
      .userinfo.get({ auth: googleClient });
    let client = await Client.findOne({ email: data.email });
    if (!client) {
      let clientNumber = 0;
      const lastClient = await Client.findOne({}, { subscriptionId: 1 }).sort({
        _id: -1,
      });
      if (lastClient) {
        clientNumber = Number(lastClient.subscriptionId) + 1;
      } else {
        clientNumber = 1;
      }
      client = new Client({
        clientName: data.name,
        email: data.email,
        subscriptionId: clientNumber,
        hasProfile: false,
      });
      await client.save();
    }
    const token = jwt.sign(
      {
        userId: client._id,
        role: client.role,
        active: "",
      },
      process.env.SECRET,
      { expiresIn: "7days" }
    );
    const refreshToken = jwt.sign({}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1y",
      audience: client._id.toString(),
    });
    res
      .status(200)
      .redirect(
        `https://easydietkw.com/auth/login?token=${token}&hasProfile=${client.hasProfile}&refreshToken=${refreshToken}&clientId=${client._id}`
      );
  } catch (err) {
    next(err);
  }
};

exports.postGoogleAppleAuth = async (req, res, next) => {
  try {
    const { clientName, email } = req.body;
    let client = await Client.findOne({ email: email });
    if (!client) {
      let clientNumber = 0;
      const lastClient = await Client.findOne({}, { subscriptionId: 1 }).sort({
        _id: -1,
      });
      if (lastClient) {
        clientNumber = Number(lastClient.subscriptionId) + 1;
      } else {
        clientNumber = 1;
      }
      client = new Client({
        clientName: clientName,
        email: email,
        subscriptionId: clientNumber,
        hasProfile: false,
      });
      await client.save();
    }
    const token = jwt.sign(
      {
        userId: client._id,
        role: client.role,
        active: "",
      },
      process.env.SECRET,
      { expiresIn: "7days" }
    );
    const refreshToken = jwt.sign({}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1y",
      audience: client._id.toString(),
    });
    res
      .status(200)
      .json({ success: true, token, refreshToken, clientId: client._id });
  } catch (err) {
    next(err);
  }
};

exports.getVerifyToken = async (req, res, next) => {
  const token = req.query.token;
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    err.statusCode = 403;
    next(err);
  }
  if (!decodedToken) {
    const error = new Error("Authorization faild!");
    error.statusCode = 401;
    next(error);
  }
  if (decodedToken.role === "client") {
    const client = await Client.findById(decodedToken.userId);
    return res.status(200).json({
      success: true,
      decodedToken: decodedToken,
      hasProfile: client.hasProfile,
      subscriped: client.subscriped,
    });
  } else {
    return res
      .status(200)
      .json({ success: true, decodedToken: decodedToken, hasProfile: false });
  }
};

exports.postGenerateAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    const verifiedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await Client.findById(verifiedToken.aud);
    if (!user) {
      throw new Error("Invalid user id!");
    }
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        active: user.isActive || "",
      },
      process.env.SECRET,
      { expiresIn: "7d" }
    );
    const newRefreshToken = jwt.sign({}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1y",
      audience: user._id.toString(),
    });
    res
      .status(201)
      .json({ success: true, token, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};
