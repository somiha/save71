const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("../middlewares/crypto");

const db = require("../config/database.config");
const catModel = require("../middlewares/cat");

exports.loginRender = async (req, res) => {
  console.log("original url", req.originalUrl);

  try {
    const [mainCat, subCat, extraCat, allCat] = await Promise.all([
      catModel.fetchMainCat(),
      catModel.fetchSubCat(),
      catModel.fetchExtraCat(),
      catModel.fetchAllCat(),
    ]);
    let massage = req.query.massage;
    var loginMessage = crypto.decrypt(req.cookies.loginMessage || "");

    var cart = [];
    res.render(
      "login",
      {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        cart: cart,
        loginMessage,
        login_status: req.login_status,
        massage: massage,
        isLogged: req.login_status,
        cart: "",
        subCat: subCat,
        mainCat: mainCat,
        extraCat: extraCat,
        allCat: allCat,
      },
      (loginMessage = null)
    );
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send(err);
  }
};

exports.loginPost = (req, res) => {
  var { phone, password } = req.body;

  // console.log(phone, password)
  let myPromise = new Promise(function (myResolve, myReject) {
    db.query(
      "SELECT * FROM `user` WHERE `phone` = ?;",
      [phone],
      async function (error, result) {
        if (!error) {
          // console.log(result, phone)
          myResolve(result);
        }
        myReject(error);
      }
    );
  });

  let myPromiseDemo = new Promise(function (myResolve, myReject) {
    db.query(
      "SELECT * FROM `user_demo` WHERE `phone` = ?;",
      [phone],
      async function (error, result) {
        if (!error) {
          // console.log(result, phone)
          myResolve(result);
        }
        myReject(error);
      }
    );
  });

  myPromise.then(
    async function (result) {
      // console.log(password + " - " + result[0].user_password)
      if (result.length > 0) {
        const hashedPasswordFromDB = result[0].user_password;
        const match = await bcrypt.compare(password, hashedPasswordFromDB);
        if (match) {
          if (result[0].phone === 0) {
            res.redirect("/", { isLogged: req.login_status });
          } else {
            var userId = result[0].user_id;
            db.query(
              "SELECT * FROM `shop` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `shop`.`seller_user_id` = ?",
              [userId],
              (err1, res1) => {
                if (err1) {
                  console.log(err1);
                  res.send("Internal Server Error !");
                  return;
                }

                if (res1[0].reg_completed == 1) {
                  db.query(
                    "SELECT * FROM `orders` WHERE `user_id` = ? AND `in_cart` = 1;",
                    [userId],
                    (err2, res2) => {
                      if (err2) {
                        console.log(err2);
                        res.send("Internal Server Error !");
                        return;
                      }
                      if (res2.length > 0) {
                        res.cookie(
                          "order_id",
                          crypto.encrypt(res2[0].order_id),
                          { maxAge: 24 * 60 * 60 * 1000 }
                        );
                      }
                      res.cookie("userId", crypto.encrypt(userId), {
                        maxAge: 24 * 60 * 60 * 1000,
                      });
                      res.cookie("userIdNotEnc", userId, {
                        maxAge: 24 * 60 * 60 * 1000,
                      });
                      res.cookie("seller_id", crypto.encrypt(res1[0].id), {
                        maxAge: 24 * 60 * 60 * 1000,
                      });
                      if (
                        res1[0].pic_url === "j:null" ||
                        res1[0].pic_url === null ||
                        res1[0].pic_url === "null" ||
                        res1[0].pic_url === ""
                      ) {
                        res.cookie("userImage", crypto.encrypt("null"), {
                          maxAge: 24 * 60 * 60 * 1000,
                        });
                      } else {
                        res.cookie(
                          "userImage",
                          crypto.encrypt(
                            res1[0].pic_url == null ? "" : res1[0].pic_url
                          ),
                          {
                            maxAge: 24 * 60 * 60 * 1000,
                          }
                        );
                      }
                      res.cookie(
                        "userName",
                        crypto.encrypt(res1[0].user_name),
                        {
                          maxAge: 24 * 60 * 60 * 1000,
                        }
                      );
                      res.cookie("login_status", crypto.encrypt(true), {
                        maxAge: 24 * 60 * 60 * 1000,
                      });
                      // req.login_status = true;
                      console.log("Log in Successful\nUser ID:" + userId);
                      console.log("Seller ID : " + res1[0].id);
                      console.log(
                        "Session:",
                        req.session,
                        req.session.returnTo
                      );

                      const redirectUrl = req.session.returnTo || "/";
                      res.redirect(redirectUrl);
                    }
                  );
                } else {
                  console.log("Otp not confirmed !\nUser ID:" + userId);
                  const encUserId = crypto.encrypt(userId);
                  const encUserIdEncoded = encodeURIComponent(encUserId);
                  const encMsg = crypto.encrypt("Check Mail !");
                  const encMsgEncoded = encodeURIComponent(encMsg);
                  res.redirect(
                    `/emailVerificationRequestByUserId/${userId}/${encMsgEncoded}`
                  );
                }
              }
            );
          }
        } else {
          res.cookie("loginMessage", crypto.encrypt("Password Incorrect"), {
            maxAge: 1000 * 1,
          });
          res.redirect("/login");
          return;
        }
      } else {
        myPromiseDemo.then(function (result) {
          if (result.length > 0) {
            const savedUser = result[0];
            // console.log({ savedUser });
            const encUserId = crypto.encrypt(savedUser.user_id); // assuming crypto.encrypt is synchronous
            const encUserIdEncoded = encodeURIComponent(encUserId);
            const encMsg = crypto.encrypt("Email Sent. Check Your Email !");
            const encMsgEncoded = encodeURIComponent(encMsg);
            // console.log(encUserIdEncoded);
            // console.log(encMsgEncoded);
            res.redirect(
              `/emailVerificationRequestByUserId/${savedUser.user_id}/${encMsgEncoded}` // use savedUser[0].user_id instead of res1[0].user_id
            );
            return;
          } else {
            res.cookie(
              "loginMessage",
              crypto.encrypt("No User with this Number"),
              {
                maxAge: 1000 * 1,
              }
            );
            res.redirect("/login");
            return;
          }
        });
      }
    },
    function (error) {
      console.log(error);
    }
  );
};

exports.logout = (req, res) => {
  Object.keys(req.cookies).forEach((cookie) => {
    res.clearCookie(cookie);
  });
  res.redirect("/login");
};

exports.emailVerify = (req, res) => {
  const { email } = req.body;
  db.query(
    "SELECT * FROM `user` WHERE `user_email` = ?",
    [email],
    (err1, res1) => {
      if (!err1) {
        if (res1.length > 0) {
          // Email Unique
          const encUserId = crypto.encrypt(res1[0].user_id);
          // console.log(encUserId)
          // console.log(res1[0].user_id)
          res.status(200).send({
            status: "success",
            encUserId,
            userId: res1[0].user_id,
          });
        } else {
          res.send("failed");
        }
      } else {
        res.send(err1);
      }
    }
  );
};

exports.passReset = (req, res) => {
  var { newPassword } = req.body;
  var { email } = req.params;

  let myPromise = new Promise(function (myResolve, myReject) {
    db.query(
      "SELECT * FROM `user` WHERE `user_email` = ?;",
      [email],
      async function (error, result) {
        if (!error) {
          myResolve(result);
        }
        myReject(error);
      }
    );
  });

  myPromise.then(
    async function (result) {
      if (result.length > 0) {
        const userId = result[0].user_id;
        const hashedPassword = await bcrypt.hash(newPassword, 10); // Hash the new password
        db.query(
          "UPDATE `user` SET `user_password` = ? WHERE `user_id` = ?",
          [hashedPassword, userId],
          (error, response) => {
            if (!error) {
              console.log("Password reset successful for User ID: " + userId);
              res.status(200).send("success");
            } else {
              console.log("Password reset failed for User ID: " + userId);
              res.send("error");
            }
          }
        );
      } else {
        res.send("no_user");
      }
    },
    function (error) {
      console.log(error);
      res.send("error");
    }
  );
};
