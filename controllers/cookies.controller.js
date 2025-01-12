const db = require("../config/database.config");
const multer = require("multer");
const multerCon = require("../config/multer.config");
const helperFunctions = require("../middlewares/helperFunctions");
const crypto = require("../middlewares/crypto");

exports.notificationSeen = (req, res) => {
  const { notification_id } = req.body;
  // console.log("Notification ID: ", notification_id)
  // console.log("User ID: ", crypto.decrypt(req.cookies.userId))
  db.query(
    "UPDATE `notification` SET `is_read` = '1' WHERE `notification`.`notification_id` = ? AND user_id = ?",
    [notification_id, crypto.decrypt(req.cookies.userId)],
    (err, res1) => {
      if (!err) {
        res.send(true);
      } else {
        console.error(err);
        res.send(false);
      }
    }
  );
};

exports.s_cookies = (req, res) => {
  var { name, data, expire } = req.body;

  if (name == "location") {
    const latitude = crypto.encrypt(data.latitude);
    const longitude = crypto.encrypt(data.longitude);
    data = { latitude: latitude, longitude: longitude };
    res.cookie(name, data, { maxAge: expire });
  } else {
    data = crypto.encrypt(data);
    res.cookie(name, data, { maxAge: expire });
  }
  res.send(true);
};

exports.d_cookies = (req, res) => {
  const location = req.cookies.location;
  if (location) {
    const latitude = crypto.decrypt(location.latitude);
    const longitude = crypto.decrypt(location.longitude);
    res.send({ latitude, longitude });
  } else {
    res.send(false);
  }
};

exports.getCountryCode = (req, res) => {
  // console.log(req.cookies);
  const countryCode = crypto.decrypt(req.cookies.countryCode || "");
  // console.log("Country Code: ", countryCode)
  res.send({ countryCode });
};

exports.getCurrencyCode = (req, res) => {
  const currencyCode = crypto.decrypt(req.cookies.currencyCode);
  res.send({ currencyCode });
};
