const db = require("../config/database.config");
const multer = require("multer");
const catModel = require("../middlewares/cat");
const multerCon = require("../config/multer.config");
const helperFunctions = require("../middlewares/helperFunctions");
const crypto = require("../middlewares/crypto");

const bcrypt = require("bcrypt");
const saltRounds = 10;

// https://new.localhost:3000/

exports.settings = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    var uID = crypto.decrypt(req.cookies.userId);
    var message = crypto.decrypt(req.cookies.message || "");
    var store_message = crypto.decrypt(req.cookies.store_message || "");
    var email_message = crypto.decrypt(req.cookies.email_message || "");
    var bank_message = crypto.decrypt(req.cookies.bank_message || "");
    var img_message = crypto.decrypt(req.cookies.img_message || "");
    // console.log("UID : " + uID)
    const [notification] = await Promise.all([
      catModel.fetchAllNotifications(uID),
    ]);
    db.query(
      "SELECT * FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id` WHERE `user_id` = ?",
      [uID],
      (err1, res1) => {
        if (!err1) {
          db.query("SELECT * FROM `banks`", (err2, res2) => {
            if (!err2) {
              db.query(
                "SELECT * FROM `use_bank_info` WHERE `user_id` = ?",
                [uID],
                (err3, res3) => {
                  if (!err3) {
                    // console.log("Bank Info => ", res3)
                    db.query("SELECT * FROM `shop_type`", (err4, res4) => {
                      if (!err4) {
                        console.log("IMG : ", res1[0]);
                        res.render("settings", {
                          ogImage: "https://save71.com/images/logo-og.webp",
                          ogTitle:
                            "Save71 Connects You and the World through Business.",
                          ogUrl: "https://save71.com/",
                          menuId: "shop-owner-settings",
                          name: "Settings & Privacy",
                          info: res1,
                          shop: res4,
                          message: message,
                          store_message: store_message,
                          email_message: email_message,
                          img_message: img_message,
                          banks: res3[0],
                          bank_message,
                          acNumber: res3[0],
                          notification: notification,
                        });
                      } else {
                        res.send("Failed to get shop type");
                        console.error(err4);
                      }
                    });
                  } else {
                    res.send("Failed to get bank info");
                    console.error(err3);
                  }
                }
              );
            } else {
              res.send("Failed to get banks");
              console.error(err2);
            }
          });
        } else {
          res.send("Failed to get user info");
          console.error(err1);
        }
      }
    );
  } else {
    res.redirect("/login");
  }
};

exports.settings_personal_info = (req, res) => {
  const uID = crypto.decrypt(req.cookies.userId);
  const sendMail = helperFunctions.mailSend;
  var { name, email } = req.body;
  const enName = crypto.encrypt(name);
  const enEmail = crypto.encrypt(email);

  db.query(
    "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
    [uID],
    (err2, res2) => {
      if (!err2) {
        if (res2.length <= 0) {
          const otp = helperFunctions.generateOTP();
          db.query(
            "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
            [uID, otp],
            (err3, res3) => {
              if (!err3) {
                db.query(
                  "SELECT * FROM `user` WHERE `user_id` = ?",
                  [uID],
                  (err4, res4) => {
                    if (!err4) {
                      sendMail(res4[0].user_email, otp, "Email Change OTP");

                      res.cookie("__1n", enName);
                      res.cookie("__eee", enEmail);

                      res.redirect(`/settings#emailOtp`);
                    } else {
                      console.error(err4);
                      res.send("Failed to get user info");
                    }
                  }
                );
              } else {
                res.send("Failed to insert OTP");
                console.error(err3);
              }
            }
          );
        } else {
          res.cookie("email_message", crypto.encrypt("Already an OTP sent !"), {
            maxAge: 1000 * 1,
          });
          res.redirect(`/settings#emailOtp`);
        }
      } else {
        res.send("Failed to get OTP");
        console.error(err2);
      }
    }
  );
};

exports.settings_personal_info_done = (req, res) => {
  const { emailOtp } = req.body;
  var uID = req.cookies.userIdNotEnc;

  console.log("Email: ", emailOtp, req.cookies);
  db.query(
    "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
    [uID],
    (err1, res1) => {
      if (!err1) {
        if (res1[0].otp_code == emailOtp) {
          db.query(
            "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
            [uID],
            (err2, res2) => {
              if (!err2) {
                var name = crypto.decrypt(req.cookies.__1n);
                var email = crypto.decrypt(req.cookies.__eee);
                console.log("Name : ", name, "Email : ", email);

                var query =
                  "UPDATE `user` SET `user_name` = ?, `user_email` = ? WHERE `user`.`user_id` = ?";
                db.query(query, [name, email, uID], (err1, res1) => {
                  if (err1) {
                    res.send("Failed to update personal info");
                    console.error(err1);
                  }
                  res.clearCookie("__1n");
                  res.clearCookie("__eee");
                  res.cookie(
                    "email_message",
                    crypto.encrypt("Personal info updated !"),
                    { maxAge: 1000 * 1 }
                  );
                  res.redirect("/settings");
                });
              } else {
                res.send("Failed to delete OTP");
                console.error(err2);
              }
            }
          );
        } else {
          res.cookie("email_message", crypto.encrypt("Wrong OTP !"), {
            maxAge: 1000 * 1,
          });
          res.redirect(`/settings#emailOtp`);
        }
      } else {
        res.send("Failed to get OTP");
        console.error(err1);
      }
    }
  );
};

exports.settings_change_pass = (req, res) => {
  var { oldpass, newpass, reppass } = req.body;
  var uID = crypto.decrypt(req.cookies.userId);
  if (newpass != reppass) {
    res.cookie("message", crypto.encrypt("Repeated Pass is NOT same"), {
      maxAge: 1000 * 1,
    });
    res.redirect("/settings");
  } else {
    var query = "SELECT * FROM `user` WHERE `user_id` = ?";
    db.query(query, [uID], (err1, res1) => {
      if (err1) {
        res.send("Failed to get user info");
        console.error(err1);
      }
      bcrypt.compare(oldpass, res1[0].user_password, function (err, result) {
        if (result == true) {
          db.query(
            "UPDATE `user` SET `user_password` = ? WHERE `user_id` = ?",
            [bcrypt.hashSync(newpass, 10), uID],
            (err2, res2) => {
              if (!err2) {
                res.cookie("message", crypto.encrypt("Pass Changed !"), {
                  maxAge: 1000 * 1,
                });
                res.redirect("/settings");
              } else {
                res.send("Failed to change pass");
                console.error(err2);
              }
            }
          );
        } else {
          res.cookie("message", crypto.encrypt("Wrong Old Password !"), {
            maxAge: 1000 * 1,
          });
          res.redirect("/settings");
        }
      });
    });
  }
};

exports.storeInfoEdit = (req, res) => {
  var { shop_name, shop_number, shop_custom_url } = req.body;
  var uID = crypto.decrypt(req.cookies.userId);

  // Validate shop_custom_url
  var alphanumericRegex = /^[a-z0-9]+$/i;
  if (!alphanumericRegex.test(shop_custom_url)) {
    return res
      .status(400)
      .send("Shop custom URL should be Alpha Numeric [A-Z, a-z, 0-9] only.");
  }

  db.query(
    "SELECT * FROM `shop` WHERE `shop_custom_url` = ?",
    [shop_custom_url],
    (selUrlErr, selUrlRes) => {
      if (selUrlErr) {
        res.send("Failed to select shop custom url");
        console.error(selUrlErr);
        return;
      }
      if (selUrlRes.length > 0) {
        res.cookie(
          "store_message",
          crypto.encrypt("Shop Custom URL already exists!"),
          { maxAge: 1000 * 1 }
        );
        res.redirect("/settings");
        return;
      } else {
        console.log("UID : " + uID);
        console.log(shop_name, shop_number, shop_custom_url);
        var query =
          "UPDATE `shop` SET `shop_name` = ?, `shop_number` = ?, `shop_custom_url` = ? WHERE `shop`.`seller_user_id` = ?";
        db.query(
          query,
          [shop_name, shop_number, shop_custom_url, uID],
          (err1, res1) => {
            if (!err1) {
              res.cookie("store_message", crypto.encrypt("Updated !"), {
                maxAge: 1000 * 1,
              });
              res.redirect("/settings");
            } else {
              res.send("Failed to update store info");
              console.error(err1);
            }
          }
        );
      }
    }
  );
};

exports.upShopLoc = (req, res) => {
  const seller_id = crypto.decrypt(req.cookies.seller_id);
  const { latitude, longitude } = req.body;
  console.log(`${seller_id} | ${latitude} | ${longitude}`);
  db.query(
    "UPDATE `shop` SET `shop_location_lt` = ?, `shop_location_long` = ? WHERE `shop`.`id` = ?",
    [latitude, longitude, seller_id],
    (err1, res1) => {
      if (!err1) {
        res.redirect("back");
      } else {
        res.send("Failed to update shop location");
        console.error(err1);
      }
    }
  );
};

exports.picEdit = (req, res) => {
  const upload = multerCon.single("user_img");
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      res.send("A Multer error occurred when uploading.");
      console.error(err);
    } else if (err) {
      res.send("An unknown error occurred when uploading.");
      console.error(err);
    }
    if (!req.file) {
      // No picture uploaded
      res.cookie("img_message", crypto.encrypt("No picture uploaded"), {
        maxAge: 1000 * 1,
      });
      res.redirect("/settings");
      return;
    }
    var pic_url = "https://save71.com/images/userImg/" + req.file.filename;
    var uID = crypto.decrypt(req.cookies.userId);
    var query = "UPDATE `user` SET `pic_url` = ? WHERE `user`.`user_id` = ?";
    db.query(query, [pic_url, uID], (err1, res1) => {
      if (!err1) {
        res.cookie("userImage", crypto.encrypt(pic_url), {
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.redirect("/settings");
      } else {
        res.send("Failed to update picture");
        console.error(err1);
      }
    });
  });
};

exports.updateBankInfo = (req, res) => {
  const { bankName, accountNumber, accName, branchName, routingNumber } =
    req.body;

  // console.log("BankName: ", bankName, "\nAcc number: ",accountNumber, "\nAcc Name: ",accName, "\nBranch Name: ",branchName, "\nRouting Number: ",routingNumber)

  const uID = req.cookies.userIdNotEnc;
  const sendMail = helperFunctions.mailSend;
  const bn = crypto.encrypt(bankName);
  const acN = crypto.encrypt(accountNumber);
  const acNa = crypto.encrypt(accName);
  const brNa = crypto.encrypt(branchName);
  const rouNa = crypto.encrypt(routingNumber);

  db.query(
    "SELECT * FROM `use_bank_info` WHERE `user_id` = ?",
    [uID],
    (err1, res1) => {
      if (!err1) {
        if (res1.length <= 0) {
          db.query(
            "INSERT INTO `use_bank_info` (`bank_info_id`, `bank_name`, `account_number`, `user_id`, `account_name`, `branch_name`, `routing_number`) VALUES (NULL, ?, ?, ?, ?, ?, ?) ",
            [bankName, accountNumber, uID, accName, branchName, routingNumber],
            (err2, res2) => {
              if (!err2) {
                res.cookie(
                  "bank_message",
                  crypto.encrypt("Bank Info Added Successfully !"),
                  { maxAge: 1000 * 1 }
                );
                res.redirect("back");
              } else {
                res.send("Failed to insert bank info");
                console.error(err2);
              }
            }
          );
        } else {
          db.query(
            "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
            [uID],
            (err2, res2) => {
              if (!err2) {
                if (res2.length <= 0) {
                  const otp = helperFunctions.generateOTP();
                  db.query(
                    "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
                    [uID, otp],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "SELECT * FROM `user` WHERE `user_id` = ?",
                          [uID],
                          (err4, res4) => {
                            if (!err4) {
                              sendMail(
                                res4[0].user_email,
                                otp,
                                "Bank Info Update"
                              );

                              res.cookie("bn", crypto.encrypt(bn));
                              res.cookie("acN", crypto.encrypt(acN));
                              res.cookie("acNa", crypto.encrypt(acNa));
                              res.cookie("brNa", crypto.encrypt(brNa));
                              res.cookie("rouNa", crypto.encrypt(rouNa));

                              res.redirect(`/settings#bankOtp`);
                            } else {
                              console.error(err4);
                              res.send("Failed to get user info");
                            }
                          }
                        );
                      } else {
                        res.send("Failed to insert OTP");
                        console.error(err3);
                      }
                    }
                  );
                } else {
                  res.cookie(
                    "bank_message",
                    crypto.encrypt("Already an OTP sent !"),
                    { maxAge: 1000 * 1 }
                  );
                  res.redirect(`/settings#bankOtp`);
                }
              } else {
                res.send("Failed to get OTP");
                console.error(err2);
              }
            }
          );
        }
      } else {
        res.send("Failed to get bank info");
        console.error(err1);
      }
    }
  );
};

exports.updateBankInfoOTPApi = (req, res) => {
  const { bankOtp } = req.body;
  console.log(req.cookies);
  const bn = crypto.decrypt(req.cookies.bn);
  const acN = crypto.decrypt(req.cookies.acN);
  const acNa = crypto.decrypt(req.cookies.acNa);
  const brNa = crypto.decrypt(req.cookies.brNa);
  const rouNa = crypto.decrypt(req.cookies.rouNa);

  const bankName = crypto.decrypt(bn);
  const accountNumber = crypto.decrypt(acN);
  const accountName = crypto.decrypt(acNa);
  const branchName = crypto.decrypt(brNa);
  const routingNumber = crypto.decrypt(rouNa);

  const uID = crypto.decrypt(req.cookies.userId);
  db.query(
    "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
    [uID],
    (err1, res1) => {
      if (!err1) {
        if (res1[0].otp_code == bankOtp) {
          db.query(
            "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
            [uID],
            (err2, res2) => {
              if (!err2) {
                db.query(
                  "UPDATE `use_bank_info` SET `bank_name` =  ? , `account_number` =  ?, `account_name` =  ?, `branch_name` =  ?, `routing_number` = ? WHERE `use_bank_info`.`user_id` = ?",
                  [
                    bankName,
                    accountNumber,
                    accountName,
                    branchName,
                    routingNumber,
                    uID,
                  ],
                  (err3, res3) => {
                    if (!err3) {
                      res.clearCookie("bn");
                      res.clearCookie("acN");
                      res.clearCookie("acNa", acNa);
                      res.clearCookie("brNa", brNa);
                      res.clearCookie("rouNa", rouNa);

                      res.cookie(
                        "bank_message",
                        crypto.encrypt("Bank Info Updated Successfully !"),
                        { maxAge: 1000 * 1 }
                      );
                      res.redirect("back");
                    } else {
                      res.send("Failed to update bank info");
                      console.error(err3);
                    }
                  }
                );
              } else {
                res.send("Failed to delete OTP");
                console.error(err2);
              }
            }
          );
        } else {
          res.cookie("bank_message", crypto.encrypt("Wrong OTP !"), {
            maxAge: 1000 * 1,
          });
          res.redirect("back");
        }
      } else {
        res.send("Failed to get OTP");
        console.error(err1);
      }
    }
  );
};
