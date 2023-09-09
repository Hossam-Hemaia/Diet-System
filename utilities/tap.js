const axios = require("axios");

module.exports = {
  createCharge: async (
    amount,
    description,
    transactionId,
    firstName,
    lastName,
    email,
    phoneNumber,
    clientId,
    bundleId,
    startingAt,
    lang
  ) => {
    try {
      const config = {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: `Bearer ${process.env.TAP_Secret_Key}`,
        },
      };
      const data = {
        amount: Number(amount),
        currency: "KWD",
        threeDSecure: true,
        save_card: false,
        description: description,
        reference: { transaction: transactionId, order: "subscription_0" },
        receipt: { email: true, sms: false },
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: { country_code: 965, number: Number(phoneNumber) },
        },
        source: { id: "src_all" },
        redirect: { url: "https://easydietkw.com/user/payment/loading" },
        metadata: {
          clientId: clientId,
          bundleId: bundleId,
          startingAt: startingAt,
          lang: lang,
        },
      };
      const response = await axios.post(
        "https://api.tap.company/v2/charges",
        data,
        config
      );
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },
  retrieveCharge: async (chargeId) => {
    try {
      const config = {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${process.env.TAP_Secret_Key}`,
        },
      };
      const response = await axios.get(
        `https://api.tap.company/v2/charges/${chargeId}`,
        config
      );
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },
  subscripe: async (clientId, bundleId, startingAt, lang, transactionId) => {
    try {
      const data = {
        clientId,
        bundleId,
        startingAt,
        lang,
        transactionId,
      };
      const response = await axios.post(
        "https://api.easydietkw.com/api/v1/bundle/subscripe",
        data
      );
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },
};
