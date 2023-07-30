const Message = require("../models/message");
const Client = require("../models/client");

exports.getIncomingMessages = async (req, res, next) => {
  const page = +req.query.page || 1;
  MSG_PER_PAGE = 50;
  try {
    const messagesNumber = await Message.find().countDocuments();
    const messages = await Message.find({
      specialistId: req.specialistId,
    })
      .skip((page - 1) * MSG_PER_PAGE)
      .limit(MSG_PER_PAGE)
      .populate("clientId")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: {
        messages,
        itemsPerPage: MSG_PER_PAGE,
        currentPage: page,
        hasNextPage: page * MSG_PER_PAGE < messagesNumber,
        nextPage: page + 1,
        hasPreviousPage: page > 1,
        previousPage: page - 1,
        lastPage: Math.ceil(messagesNumber / MSG_PER_PAGE),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getClientMessages = async (req, res, next) => {
  const clientId = req.query.clientId;
  try {
    const clientMessages = await Message.find({ clientId: clientId })
      .populate("specialistId")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, messages: clientMessages });
  } catch (err) {
    next(err);
  }
};

exports.postWieghtTall = async (req, res, next) => {
  const { wieght, tall, clientId } = req.body;
  try {
    const client = await Client.findById(clientId);
    (client.weight = wieght), (client.tall = tall);
    await client.save();
    res
      .status(201)
      .json({ success: true, message: "Client wieght and tall updated" });
  } catch (err) {
    next(err);
  }
};

exports.putMessageStatus = async (req, res, next) => {
  const messageId = req.body.messageId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Error reading message");
      error.statusCode = 404;
      throw error;
    }
    message.isRead = true;
    await message.save();
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.postReplyMessage = async (req, res, next) => {
  const { messageId, reply, wieght, tall, clientId } = req.body;
  try {
    const client = await Client.findById(clientId);
    if (wieght && tall) {
      client.weight = wieght;
      client.tall = tall;
    }
    await client.save();
    const message = await Message.findById(messageId);
    message.reply = reply;
    message.replyStatus = true;
    message.bodyBMI.weight = wieght;
    message.bodyBMI.tall = tall;
    await message.save();
    res.status(201).json({ success: true, message: "Message sent!" });
  } catch (err) {
    next(err);
  }
};
