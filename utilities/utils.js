const fs = require("fs");
const path = require("path");
const PdfDoc = require("pdfkit-table");
const nodemailer = require("nodemailer");
const Client = require("../models/client");
const Bundle = require("../models/bundle");
const Subscription = require("../models/subscription");
const { nextTick } = require("process");

const singleDay = 1000 * 60 * 60 * 24;

const daysInMonth = () => {
  const dt = new Date();
  const month = dt.getMonth();
  const year = dt.getFullYear();
  let days = new Date(year, month, 0).getDate();
  return days;
};

exports.toIsoDate = (date, str) => {
  if (str === "start") {
    let newDate = new Date(date);
    return newDate.toISOString();
  } else {
    let newDate = new Date(date);
    newDate.setHours(newDate.getHours() + 22);
    return newDate.toISOString();
  }
};

exports.getStartDate = (startingAt) => {
  const start = new Date(startingAt);
  start.setHours(0, 0, 0, 1);
  let parsedDate = Date.parse(start);
  return new Date(parsedDate);
};

// exports.getSubscriperStartDate = (startingAt) => {
//   const currentDate = new Date();
//   currentDate.setHours(0, 0, 0, 1);
//   parsedCurrentDate = Date.parse(currentDate);
//   parsedEndingDate = Date.parse(startingAt);
//   if (parsedCurrentDate > parsedEndingDate) {
//     let nextDate = parsedCurrentDate;
//     return new Date(nextDate);
//   } else {
//     let nextDate = singleDay + parsedEndingDate;
//     return new Date(nextDate);
//   }
// };

exports.getEndDate = (startDate, bundlePeriod, offerPeriod) => {
  let start = new Date(startDate);
  let period;
  let end;
  if (bundlePeriod === 1) {
    period = singleDay * (6 + offerPeriod);
    end = Date.parse(start) + period;
    const endDate = new Date(end);
    endDate.setHours(endDate.getHours() + 22);
    return endDate.toDateString();
  } else if (bundlePeriod === 2) {
    period = singleDay * (13 + offerPeriod);
    end = Date.parse(start) + period;
    const endDate = new Date(end);
    endDate.setHours(endDate.getHours() + 22);
    return endDate.toISOString();
  } else if (bundlePeriod === 3) {
    period = singleDay * (20 + offerPeriod);
    end = Date.parse(start) + period;
    const endDate = new Date(end);
    endDate.setHours(endDate.getHours() + 22);
    return endDate.toISOString();
  } else if (bundlePeriod === 4) {
    period = singleDay * (daysInMonth() - 1 + offerPeriod);
    end = Date.parse(start) + period;
    const endDate = new Date(end);
    endDate.setHours(endDate.getHours() + 22);
    return endDate.toISOString();
  } else if (bundlePeriod > 4) {
    period = singleDay * bundlePeriod;
    end = Date.parse(start) + period;
    const endDate = new Date(end);
    endDate.setHours(endDate.getHours() + 22);
    return endDate.toISOString();
  }
};

exports.fridayFilter = (startDate, endDate, fridayOption) => {
  let start = new Date(startDate);
  let end = new Date(endDate);
  let parsedStart = Date.parse(start);
  let parsedEnd = Date.parse(end);
  let filteredDates = [];
  for (let d = parsedStart; d <= parsedEnd; d += singleDay) {
    let today = new Date(d).toString();
    if (!fridayOption && today.split(" ")[0] !== "Fri") {
      filteredDates.push(new Date(d));
    } else if (fridayOption) {
      filteredDates.push(new Date(d));
    }
  }
  if ((filteredDates.length = 27)) {
    filteredDates.pop();
  }
  return filteredDates;
};

exports.getRemainingDays = (startDate, endDate) => {
  const currentDate = Date.parse(new Date());
  const parsedStartDate = Date.parse(startDate);
  const parsedEndDate = Date.parse(endDate);
  let remaining;
  const periodThreshold =
    currentDate > parsedStartDate ? currentDate : parsedStartDate;
  if (parsedEndDate >= periodThreshold) {
    remaining = parsedEndDate - periodThreshold;
    const remainingDays = remaining / singleDay;
    return remainingDays;
  } else {
    return 0;
  }
};

exports.checkValidity = (endDate) => {
  const currentDate = Date.parse(new Date());
  const parsedEndDate = Date.parse(endDate);
  if (parsedEndDate >= currentDate) {
    return true;
  } else {
    return false;
  }
};

exports.getEndActiveDate = (startDate, numberOfDays) => {
  const parsedStart = Date.parse(startDate);
  const period = singleDay * numberOfDays;
  const parsedEnd = parsedStart + period;
  return new Date(parsedEnd);
};

exports.textDirection = (str) => {
  const isEnglishLetters = /^[a-zA-Z]$/.test(str);
  if (isEnglishLetters) {
    return str;
  } else {
    const strArr = str.split(" ");
    newStr = strArr.reverse().join(" ");
    return newStr;
  }
};

exports.emailSender = async (email, resetCode, emailType = "reset") => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });
  let emailOptions;
  if (emailType === "confirmation") {
    emailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Easy Diet Confirmation Email",
      text: `Welcom aboard! please use this 6 digit code to confrim your email
      Your Code is: ${resetCode}
      `,
    };
  } else {
    emailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Easy Diet Reset Password Confirmation",
      text: `Welcom aboard! please use this 6 digit code to confrim your email
      Your Code is: ${resetCode}
      `,
    };
  }
  const emailStatus = await transporter.sendMail(emailOptions);
  console.log(emailStatus);
};

exports.mealsReducer = (selectedMealsTypes, bundleMealsTypes) => {
  let mealsToSelect = [];
  if (selectedMealsTypes.length > 0) {
    for (let type of bundleMealsTypes) {
      if (!selectedMealsTypes.includes(type)) {
        mealsToSelect.push(type);
      }
    }
  } else {
    mealsToSelect = bundleMealsTypes;
  }
  return mealsToSelect;
};

exports.getChiffSelectedMenu = (
  mealsToSelect,
  chiffMenuMeals,
  mealsNumber,
  snacksNumber
) => {
  let mealsIds = [];
  let selectMealCount = 0;
  let selectSnackCount = 0;
  for (mealType of mealsToSelect) {
    const meal = chiffMenuMeals.find((meal) => {
      return meal.mealId.mealType === mealType;
    });
    mealsIds.push(meal.mealId);
    ++selectMealCount;
    if (mealsNumber === selectMealCount) {
      break;
    }
  }
  for (let i = 0; i < snacksNumber; ++i) {
    const snack = chiffMenuMeals.find((meal) => {
      return meal.mealId.mealType === "سناك";
    });
    const snackIndex = mealsIds.findIndex((id) => {
      if (id.toString() === snack._id.toString()) {
        return id;
      }
    });
    if (snackIndex > -1) {
      let selectedSnackId = mealsIds[snackIndex];
      let newSnack = chiffMenuMeals.find((meal) => {
        return (
          meal.mealId.mealType === "سناك" &&
          meal.mealId._id.toString() !== selectedSnackId.toString()
        );
      });
      mealsIds.push(newSnack.mealId);
    } else {
      mealsIds.push(snack.mealId);
    }
    ++selectSnackCount;
    if (snacksNumber === selectSnackCount) {
      break;
    }
  }
  return mealsIds;
};

exports.activeClientsReport = async (clients) => {
  try {
    const reportName = `clients-report-${Date.now()}.pdf`;
    const reportPath = path.join("data", reportName);
    const arFont = path.join("public", "fonts", "Janna.ttf");
    const headerImg = path.join("public", "img", "headerSmall.png");
    const date = new Date().toDateString();
    const clientsTable = {
      headers: [
        {
          label: this.textDirection("اطعمه محظوره"),
          width: 90,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("الايام  المتبقيه"),
          width: 70,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("نهاية  الاشتراك"),
          width: 90,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("بداية  الاشتراك"),
          width: 90,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("عدد  الاسناكات"),
          width: 70,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("عدد  الوجبات"),
          width: 70,
          align: "center",
          headerColor: "gray",
        },
        {
          label: this.textDirection("القيمه  الغذائيه"),
          width: 90,
          align: "center",
          headerColor: "gray",
        },
        { label: "الباقه", width: 70, align: "center", headerColor: "gray" },
        { label: "الهاتف", width: 70, align: "center", headerColor: "gray" },
        { label: "الاسم", width: 90, align: "center", headerColor: "gray" },
        {
          label: "م",
          width: 30,
          align: "center",
          headerColor: "gray",
          columnColor: "gray",
        },
      ],
      rows: clients,
    };
    const Doc = new PdfDoc({ size: "A4", margin: 2, layout: "landscape" });
    Doc.pipe(fs.createWriteStream(reportPath));
    Doc.image(headerImg, {
      height: 120,
      align: "center",
    });
    Doc.font(arFont).fontSize(16).text(`${date} : التاريخ`, { align: "right" });
    Doc.font(arFont)
      .fontSize(18)
      .text(this.textDirection(`تقرير العملاء النشطين`), { align: "center" });
    await Doc.table(clientsTable, {
      prepareHeader: () => Doc.font(arFont).fontSize(11),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        Doc.font(arFont).fontSize(11);
        indexColumn === 0 && Doc.addBackground(rectRow, "white", 0.15);
      },
    });
    Doc.end();
    return reportName;
  } catch (err) {
    throw new Error(err);
  }
};

exports.getLocalDate = (date) => {
  const dateBegin = new Date(date).setHours(0, 0, 0, 0);
  const newDate = new Date(dateBegin);
  const localDate = new Date(
    newDate.getTime() - newDate.getTimezoneOffset() * 60000
  );
  return localDate;
};

exports.updateCurrentSubscriptionBundle = async () => {
  try {
    console.log("updating subscribed bundle...");
    const clients = await Client.find();
    for (let client of clients) {
      if (client.subscriped) {
        const currentDate = new Date();
        const previousDate = this.getFutureDate(currentDate, 48);
        const subscription = await Subscription.findOne({
          clientId: client._id,
          endingDate: { $gte: futureDate },
        });
        if (
          subscription &&
          subscription.bundleId.toString() !==
            client.subscripedBundle.bundleId.toString()
        ) {
          client.subscripedBundle.bundleId = subscription.bundleId;
          client.subscripedBundle.startingDate = subscription.startingDate;
          client.subscripedBundle.endingDate = subscription.endingDate;
          await client.save();
        }
      }
    }
  } catch (err) {
    throw new Error(err);
  }
};

exports.updateSubscriptionState = async () => {
  const currentDate = this.getLocalDate(new Date());
  try {
    console.log("updating subscriptions...");
    await Client.updateMany(
      {
        subscriped: true,
        "subscripedBundle.endingDate": { $lt: currentDate },
      },
      { $set: { subscriped: false } }
    );
  } catch (error) {
    console.error("Error updating subscription status:", error);
  }
};

exports.createCustomBundle = async (bundleData) => {
  try {
    const bundle = new Bundle(bundleData);
    await bundle.save();
    return bundle;
  } catch (err) {
    next(err);
  }
};

exports.getFutureDate = (date, hours) => {
  try {
    const nowDate = new Date(date);
    const futureDate = new Date(nowDate.getTime() + hours * 60 * 60 * 1000);
    return futureDate;
  } catch (err) {
    throw new Error(err);
  }
};

exports.getPreviousDate = (date, hours) => {
  try {
    const nowDate = new Date(date);
    const previousDate = new Date(nowDate.getTime() - hours * 60 * 60 * 1000);
    return previousDate;
  } catch (err) {
    throw new Error(err);
  }
};
