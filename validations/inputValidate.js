const { body } = require("express-validator");

module.exports = {
  validateName: body("clientName")
    .isString()
    .withMessage("يجب ان يتكون الاسم من احرف فقط"),
  validatePhoneNumber: body("phoneNumber")
    .isString()
    .isLength({ min: 8, max: 8 })
    .withMessage("يجب الا يقل رقم الهاتف عن 8 ارقام ولا يزيد على 8 أرقام"),
  validateEmail: body("email")
    .trim()
    .isEmail()
    .withMessage("برجاء ادخال ايميل صحيح"),
  validateWeight: body("initialWeight")
    .isNumeric()
    .isInt()
    .withMessage("الوزن يجب ان يكون رقم صحيح"),
  validateHeight: body("height")
    .isNumeric()
    .isInt()
    .withMessage("الطول يجب ان يكون رقم صحيح"),
  validateAge: body("age")
    .isNumeric()
    .isInt()
    .withMessage("العمر يجب ان يكون رقم صحيح"),
  validateSDate: body("startDate")
    .isDate()
    .withMessage("من فضلك ادخل تاريخ صحيح"),
  validateEDate: body("endDate")
    .isDate()
    .withMessage("من فضلك ادخل تاريخ صحيح"),
  validateMealsNumber: body("numberOfMeals")
    .isNumeric()
    .isInt()
    .withMessage("عدد الوجبات يجب ان تكون رقم صحيح"),
  validatePrice: body("subscriptionPrice")
    .isNumeric()
    .isInt()
    .isFloat()
    .toFloat()
    .withMessage("يجب ان يكون رقم صحيح او له منازل عشريه"),
  validatePassword: body("confirmPassword"),
  validatePass: body("password"),
};
