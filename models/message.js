const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    attachments: [],
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    specialistId: {
      type: Schema.Types.ObjectId,
      ref: "admin",
      required: true,
    },
    reply: {
      type: String,
    },
    replyStatus: {
      type: Boolean,
      default: false,
    },
    bodyBMI: { weight: { type: Number }, tall: { type: Number } },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("message", messageSchema);
