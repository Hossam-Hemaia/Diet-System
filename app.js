const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors-express");
const multer = require("multer");
const compression = require("compression");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const clientRouter = require("./routes/client");
const specailistRouter = require("./routes/specialist");
const managerRouter = require("./routes/manager");
const clientController = require("./controllers/clientController");
const utilities = require("./utilities/utils");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const options = {
  allow: {
    origin: "*",
    methods: "GET, POST, PUT, DELETE",
    headers: "Content-Type, Authorization, Cookie",
  },
  max: {
    age: null,
  },
};

dotenv.config();
const app = express();
const mongoDB_Uri = `${process.env.Live_DB_URI}`;

app.use(cors(options));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());

app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/data", express.static(path.join(__dirname, "data")));
app.use(multer({ storage: fileStorage }).array("files"));

cron.schedule("1 0 * * *", async () => {
  let currentDate = new Date().setHours(0, 0, 0, 0);
  await clientController.addChiffMeals(currentDate);
});

cron.schedule("1 0 * * *", async () => {
  await utilities.updateSubscriptionState();
});

app.use(process.env.api, authRouter);
app.use(process.env.api, adminRouter);
app.use(process.env.api, clientRouter);
app.use(process.env.api, specailistRouter);
app.use(process.env.api, managerRouter);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ success: false, message: message });
});

mongoose
  .set("strictQuery", false)
  .connect(mongoDB_Uri)
  .then((result) => {
    const server = app.listen(process.env.PORT, "localhost", () => {
      console.log("listening on port " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });
