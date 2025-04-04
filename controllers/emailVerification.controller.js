const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const helperFunctions = require("../middlewares/helperFunctions");
const crypto = require("../middlewares/crypto");
const userModal = require("../middlewares/user");

exports.emailVerification = async (req, res) => {};

exports.emailVerificationRequestAPI = async (req, res) => {
  try {
    const { encUserId, userId } = req.body;
    // const decUserId = crypto.decrypt(encUserId);
    const decUserId = userId;
    const sendMail = helperFunctions.mailSend;

    db.query(
      "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
      [decUserId],
      (err11, res11) => {
        if (!err11) {
          if (res11.length == 0) {
            const otp = helperFunctions.generateOTP();
            db.query(
              "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
              [decUserId, otp],
              (err1, res1) => {
                if (!err1) {
                  db.query(
                    "SELECT * FROM `user` WHERE `user_id` = ?",
                    [decUserId],
                    (err2, res2) => {
                      if (!err2) {
                        console.log("Email : ", res2[0].user_email);
                        sendMail(res2[0].user_email, otp, "Reset Password");
                        res.status(200).send({
                          status: "success",
                          encUserId,
                          userId,
                        });
                      } else {
                        console.error(err2);
                      }
                    }
                  );
                } else {
                  res.status(503).send(err1);
                }
              }
            );
          } else {
            console.log("Already OTP requested. Check your mail !");
            res.status(200).send({
              status: false,
              message: "Already OTP requested. Check your mail !",
            });
          }
        } else {
          console.error(err11);
          res.status(503).send(err11);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.emailVerificationPostAPI = (req, res) => {
  try {
    const { otp, encUserId, userId } = req.body;
    // const decUserId = crypto.decrypt(encUserId);
    const decUserId = userId;

    db.query(
      "SELECT * FROM `otp` WHERE `user_id` = ?",
      [decUserId],
      (err1, res1) => {
        if (!err1) {
          console.log("OTP : ", otp, res1);
          if (res1[0].otp_code == otp) {
            db.query(
              "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
              [decUserId],
              async (err2, res2) => {
                const demoUser = await userModal.getDemoByUserId(decUserId);
                if (!err2) {
                  db.query(
                    "UPDATE `user` SET `reg_completed` = '1' WHERE `user`.`user_id` = ?",
                    [decUserId],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "SELECT * FROM `user` WHERE `user_id` = ?",
                          [decUserId],
                          (err4, res4) => {
                            if (!err4) {
                              res.status(200).send({
                                status: "success",
                                data: res4[0],
                              });
                            } else {
                              console.error(err4);
                            }
                          }
                        );
                      } else {
                        console.error(err3);
                        res.status(500).send(err3);
                      }
                    }
                  );
                } else {
                  console.error(err2);
                  res.status(500).send(err2);
                }
              }
            );
          } else {
            const encMsg = crypto.encrypt("Wrong OTP !");
            const encUserIdEncoded = encodeURIComponent(encUserId);
            const encMsgEncoded = encodeURIComponent(encMsg);
            res.redirect(
              `/emailVerificationRequestByUserId/${userId}/${encMsgEncoded}`
            );
          }
        } else {
          console.error(err1);
          res.status(500).send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.emailVerificationRequest = async (req, res) => {
  try {
    const { encUserId, message } = req.params;
    const encMsg = message ? message : null;
    const decUserId = crypto.decrypt(encUserId);
    const verificationStatus = crypto.decrypt(encMsg);
    console.log("Message ", verificationStatus, encMsg);
    db.query(
      "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
      [decUserId],
      (err11, res11) => {
        console.log("OTP1111 : ", res11);
        if (!err11) {
          if (res11.length == 0) {
            const otp = helperFunctions.generateOTP();
            db.query(
              "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
              [decUserId, otp],
              (err1, res1) => {
                if (!err1) {
                  const sendMail = helperFunctions.mailSend;
                  db.query(
                    "SELECT * FROM `user` WHERE `user_id` = ?",
                    [decUserId],
                    (err2, res2) => {
                      if (!err2) {
                        sendMail(res2[0].user_email, otp, "Email Verification");
                        res.render("emailVerification", {
                          ogImage:
                            "https://admin.saveneed.com/images/logo-og.webp",
                          ogTitle:
                            "Save71 Connects You and the World through Business.",
                          ogUrl: "https://admin-save71.lens-ecom.store",
                          verificationStatus,
                          encUserId,
                        });
                      } else {
                        res.send(err1);
                      }
                    }
                  );
                } else {
                  console.error(err2);
                  res.send(err2);
                }
              }
            );
          } else {
            // const localTime = helperFunctions.formatTimestampToLocale(res11[0].generate_time)

            res.render("emailVerification", {
              ogImage: "https://admin.saveneed.com/images/logo-og.webp",
              ogTitle: "Save71 Connects You and the World through Business.",
              ogUrl: "https://admin-save71.lens-ecom.store",
              verificationStatus: verificationStatus
                ? verificationStatus
                : "Already OTP requested. Check your mail !",
              encUserId,
            });
          }
        } else {
          console.error(err11);
          res.send(err11);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.emailVerificationRequestByUserId = async (req, res) => {
  try {
    const { encUserId, message } = req.params;
    const encMsg = message ? message : null;
    // const decUserId = crypto.decrypt(encUserId);
    const userId = encUserId;
    const verificationStatus = crypto.decrypt(encMsg);
    console.log("Message ", verificationStatus, encMsg);
    db.query(
      "SELECT * FROM `otp` WHERE `otp`.`user_id` = ?",
      [userId],
      (err11, res11) => {
        console.log("OTP1111 : ", res11);
        if (!err11) {
          if (res11.length == 0) {
            const otp = helperFunctions.generateOTP();
            db.query(
              "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
              [userId, otp],
              (err1, res1) => {
                if (!err1) {
                  const sendMail = helperFunctions.mailSend;
                  db.query(
                    "SELECT * FROM `user_demo` WHERE `user_id` = ?",
                    [userId],
                    (err2, res2) => {
                      if (!err2) {
                        sendMail(res2[0].user_email, otp, "Email Verification");
                        res.render("emailVerification", {
                          ogImage:
                            "https://admin.saveneed.com/images/logo-og.webp",
                          ogTitle:
                            "Save71 Connects You and the World through Business.",
                          ogUrl: "https://admin-save71.lens-ecom.store",
                          verificationStatus,
                          encUserId,
                          userId,
                        });
                      } else {
                        res.send(err1);
                      }
                    }
                  );
                } else {
                  console.error(err2);
                  res.send(err2);
                }
              }
            );
          } else {
            // const localTime = helperFunctions.formatTimestampToLocale(res11[0].generate_time)

            res.render("emailVerification", {
              ogImage: "https://admin.saveneed.com/images/logo-og.webp",
              ogTitle: "Save71 Connects You and the World through Business.",
              ogUrl: "https://admin-save71.lens-ecom.store",
              verificationStatus: verificationStatus
                ? verificationStatus
                : "Already OTP requested. Check your mail !",
              encUserId,
              userId,
            });
          }
        } else {
          console.error(err11);
          res.send(err11);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.emailVerificationPost = (req, res) => {
  try {
    const { otp, encUserId } = req.body;
    const decUserId = crypto.decrypt(encUserId);

    db.query(
      "SELECT * FROM `otp` WHERE `user_id` = ?",
      [decUserId],
      (err1, res1) => {
        if (!err1) {
          if (res1[0].otp_code == otp) {
            db.query(
              "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
              [decUserId],
              (err2, res2) => {
                if (!err2) {
                  db.query(
                    "UPDATE `user` SET `reg_completed` = '1' WHERE `user`.`user_id` = ?",
                    [decUserId],
                    (err3, res3) => {
                      if (!err3) {
                        res.redirect("/login");
                      } else {
                        res.send(err3);
                      }
                    }
                  );
                } else {
                  res.send(err2);
                }
              }
            );
          } else {
            const encMsg = crypto.encrypt("Wrong OTP !");
            const encUserIdEncoded = encodeURIComponent(encUserId);
            const encMsgEncoded = encodeURIComponent(encMsg);
            res.redirect(
              `/emailVerificationRequestByUserId/${encUserIdEncoded}/${encMsgEncoded}`
            );
          }
        } else {
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.emailVerificationPostByUserId = (req, res) => {
  try {
    const { otp, encUserId, userId } = req.body;
    const decUserId = userId;
    console.log("OTP : ", otp, decUserId, userId);

    db.query(
      "SELECT * FROM `otp` WHERE `user_id` = ?",
      [decUserId],
      async (err1, res1) => {
        console.log("OTP : ", otp, res1);
        if (!err1) {
          if (res1[0].otp_code == otp) {
            const demoUser = await userModal.getDemoByUserId(decUserId);
            const {
              user_name,
              user_email,
              user_password,
              date_of_birth,
              gender,
              reference_id,
              own_ref_id,
              shop_location_lt,
              shop_location_long,
              phone,
              shop_type,
            } = demoUser;
            var query =
              "INSERT INTO `user` (`user_id`, `user_name`, `user_email`, `user_password`, `date_of_birth`, `gender`, `reference_id`, `own_ref_id`, `phone`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            db.query(
              query,
              [
                decUserId,
                user_name,
                user_email,
                user_password,
                date_of_birth,
                gender,
                reference_id,
                own_ref_id,
                phone,
              ],
              (err2, res2) => {
                if (!err2) {
                } else {
                  res.send(err2);
                }
              }
            );

            var shop_name = user_name + "'s Shop";
            qr =
              "INSERT INTO `shop` (`id`, `seller_user_id`, `shop_name`, `shop_location_lt`, `shop_location_long`, `shop_number`, `shop_type`, `shop_custom_url`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?) ";
            db.query(
              qr,
              [
                decUserId,
                shop_name,
                shop_location_lt,
                shop_location_long,
                phone,
                shop_type,
                shop_name,
              ],
              (err2, res2) => {
                if (!err2) {
                  db.query(
                    "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `withdraw`, `from_ref`, `due_payment`) VALUES (NULL, ?, '0', '0', '0', '0')",
                    [res2.insertId],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "UPDATE `user` SET `reg_completed` = '1' WHERE `user`.`user_id` = ?",
                          [decUserId],
                          (err3, res3) => {
                            if (!err3) {
                              db.query(
                                "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
                                [decUserId],
                                async (err2, res2) => {
                                  if (!err2) {
                                    db.query(
                                      "DELETE FROM `user_demo` WHERE `user_id` = ?",
                                      [decUserId],
                                      (err3, res3) => {
                                        if (!err3) {
                                          return res.redirect("/login");
                                        } else {
                                          return res.send(err3);
                                        }
                                      }
                                    );
                                  } else {
                                    return res.send(err2);
                                  }
                                }
                              );
                            } else {
                              return res.send(err3);
                            }
                          }
                        );
                      } else {
                        return res.send(err3);
                      }
                    }
                  );
                } else {
                  res.send(err2);
                }
              }
            );
          } else {
            const encMsg = crypto.encrypt("Wrong OTP !");
            const encUserIdEncoded = encodeURIComponent(encUserId);
            const encMsgEncoded = encodeURIComponent(encMsg);
            return res.redirect(
              `/emailVerificationRequestByUserId/${userId}/${encMsgEncoded}`
            );
          }
        } else {
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error !");
  }
};

exports.resendOtp = async (req, res) => {
  try {
    console.log("resend otp", req.query);
    let { userId } = req.query;
    console.log("resend otp", req.cookies);
    const token = crypto.decrypt(req.cookies.jwt);
    // console.log({ token });
    userId = crypto.decrypt(userId);

    db.query(
      "SELECT * FROM `user` WHERE `user_id` = ?",
      [userId],
      (err1, res1) => {
        if (!err1) {
          // delete existing otp
          db.query(
            "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
            [userId],
            (err2, res2) => {
              if (!err2) {
                const otp = helperFunctions.generateOTP();
                db.query(
                  "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
                  [userId, otp],
                  (err2, res2) => {
                    if (!err2) {
                      const sendMail = helperFunctions.mailSend(
                        res1[0].user_email,
                        otp,
                        "Resend OTP"
                      );
                      return res.status(200).send({ status: "success" });
                    } else {
                      return res.status(500).send({ status: "failed" });
                    }
                  }
                );
              }
            }
          );
        } else {
          return res.status(500).send({ status: "failed" });
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).send({ status: "failed" });
  }
};

exports.resendOtpByUserId = async (req, res) => {
  try {
    let { userId } = req.params;
    console.log("resend otp", userId);

    db.query(
      "SELECT * FROM `user` WHERE `user_id` = ?",
      [userId],
      async (err1, res1) => {
        console.log("resend otp", res1);
        let user;
        if (!err1 && res1.length > 0) {
          user = res1[0];
        } else {
          const demoUser = await userModal.getUserByUserIdUserDemo(userId);
          console.log("demo user", demoUser);
          user = demoUser;
        }

        if (!err1) {
          // delete existing otp
          db.query(
            "DELETE FROM `otp` WHERE `otp`.`user_id` = ?",
            [userId],
            (err2, res2) => {
              if (!err2) {
                console.log("otp deleted", res2, user, userId);
                const otp = helperFunctions.generateOTP();
                db.query(
                  "INSERT INTO `otp` (`otp_id`, `user_id`, `otp_code`, `generate_time`) VALUES (NULL, ?, ?, current_timestamp())",
                  [userId, otp],
                  (err2, res2) => {
                    if (!err2) {
                      const sendMail = helperFunctions.mailSend(
                        user.user_email,
                        otp,
                        "Resend OTP"
                      );
                      return res.status(200).send({ status: "success" });
                    } else {
                      return res.status(500).send({ status: "failed" });
                    }
                  }
                );
              }
            }
          );
        } else {
          return res.status(500).send({ status: "failed" });
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).send({ status: "failed" });
  }
};
