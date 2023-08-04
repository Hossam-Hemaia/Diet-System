const jwt = require("jsonwebtoken");

exports.adminIsAuth = async (req, res, next) => {
  let decodedToken;
  try {
    const token = req.get("Authorization").split(" ")[1];
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
  if (decodedToken.role === "admin" && decodedToken.active) {
    req.adminId = decodedToken.userId;
    next();
  } else {
    const error = new Error("invalid credentials");
    error.statusCode = 403;
    throw error;
  }
};

exports.managerIsAuth = async (req, res, next) => {
  let decodedToken;
  try {
    const token = req.get("Authorization").split(" ")[1];
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
  if (decodedToken.role === "manager" && decodedToken.active) {
    req.adminId = decodedToken.userId;
    next();
  } else {
    const error = new Error("invalid credentials");
    error.statusCode = 403;
    throw error;
  }
};

exports.specialistIsAuth = async (req, res, next) => {
  let decodedToken;
  try {
    const token = req.get("Authorization").split(" ")[1];
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
  if (decodedToken.role === "diet specialist" && decodedToken.active) {
    req.specialistId = decodedToken.userId;
    next();
  } else {
    const error = new Error("invalid credentials");
    error.statusCode = 403;
    throw error;
  }
};

exports.clientIsAuth = async (req, res, next) => {
  let decodedToken;
  try {
    const token = req.get("Authorization").split(" ")[1];
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
    req.clientId = decodedToken.userId;
    next();
  } else {
    const error = new Error("invalid credentials");
    error.statusCode = 403;
    next(error);
  }
};
