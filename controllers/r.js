const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const userModal = require("../middlewares/user");

const bcrypt = require("bcrypt");
const saltRounds = 10;

let loginMessage;
exports.regRender = async (req, res) => {
  try {
    const [mainCat, subCat, extraCat, allCat] = await Promise.all([
      catModel.fetchMainCat(),
      catModel.fetchSubCat(),
      catModel.fetchExtraCat(),
      catModel.fetchAllCat(),
    ]);
    var message = crypto.decrypt(req.cookies.message || "");
    var loginMessage = crypto.decrypt(req.cookies.loginMessage || "");
    var uID = crypto.decrypt(req.cookies.userId || "");

    db.query(
      "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `product_image` ON `product_image`.`product_id` = `order_details`.`product_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
      [uID],
      (err1, res1) => {
        if (!err1) {
          res.render(
            "register",
            {
              ogImage: "https://admin.saveneed.com/images/logo-og.webp",
              ogTitle: "Save71 Connects You and the World through Business.",
              ogUrl: "https://admin-save71.lens-ecom.store",
              loginMessage: loginMessage,
              login_status: req.login_status,
              message: message,
              isLogged: req.login_status,
              cart: res1,
              subCat: subCat,
              mainCat: mainCat,
              extraCat: extraCat,
              allCat: allCat,
            },
            (loginMessage = null)
          );
        } else {
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};

exports.regPost = async (req, res) => {
  var {
    firstName,
    lastName,
    email,
    password,
    gender,
    refIdText,
    DOB,
    latitude,
    longitude,
    phone,
    shop_type,
  } = req.body;
  // console.log(req.body);
  // refId = '+'+refIdText.substr(1, refIdText.length)
  refId = refIdText;
  console.log("Ref ID : " + refId);
  console.log("Number : " + phone);
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const username = firstName + " " + lastName;

  const verifiedUser = await userModal.getUserByPhoneNumber(phone);
  const unVerifiedUser = await userModal.getUserByPhoneNumberUserDemo(phone);
  console.log(
    "verifiedUser: ",
    verifiedUser,
    "unVerifiedUser: ",
    unVerifiedUser
  );
  if (verifiedUser || unVerifiedUser) {
    res.cookie("loginMessage", crypto.encrypt("User Exists With This Number"), {
      maxAge: 1000 * 1,
    });
    res.redirect("/registration");
  }
  const refferedUser = await userModal.getByRefId(refId);
  if (!refferedUser) {
    res.cookie("message", crypto.encrypt("Wrong Reference ID !"), {
      maxAge: 1000 * 1,
    });
    res.redirect("/registration");
  }

  var query =
    "INSERT INTO `user_demo` (`user_id`, `user_name`, `user_email`, `user_password`, `date_of_birth`, `gender`, `reference_id`, `own_ref_id`, `phone`, `shop_location_lt`, `shop_location_long`, `shop_type`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(
    query,
    [
      username,
      email,
      hashedPassword,
      DOB,
      gender,
      refId,
      phone,
      phone,
      latitude,
      longitude,
      shop_type,
    ],
    async (err2, res2) => {
      // make the callback function async
      if (!err2) {
        try {
          const savedUser = await userModal.getUserByPhoneNumberUserDemo(phone);
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
        } catch (err) {
          res.send(err); // handle error from getUserByPhoneNumberUserDemo or crypto.encrypt
        }
      } else {
        res.send(err2);
      }
    }
  );

  // db.query(
  //   "SELECT * FROM `user` WHERE `user`.`phone` = ?",
  //   [phone],
  //   (err11, res11) => {
  //     if (!err11) {
  //       if (res11.length == 0) {
  //         db.query(
  //           "SELECT * FROM `user` WHERE `user`.`user_email` = ?",
  //           [email],
  //           (err22, res22) => {
  //             if (!err22) {
  //               if (res22.length == 0) {
  //                 console.log("REFID : " + refId);
  //                 db.query(
  //                   "SELECT * FROM `user` WHERE `own_ref_id` = ?",
  //                   [refId],
  //                   (err1, res1) => {
  //                     if (res1.length > 0) {
  //                       console.log("REF Details : " + res1[0]);
  //                       var query =
  //                         "INSERT INTO `user` (`user_id`, `user_name`, `user_email`, `user_password`, `date_of_birth`, `gender`, `reference_id`, `own_ref_id`, `phone`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)";
  //                       db.query(
  //                         query,
  //                         [
  //                           username,
  //                           email,
  //                           hashedPassword,
  //                           DOB,
  //                           gender,
  //                           refId,
  //                           phone,
  //                           phone,
  //                         ],
  //                         (err2, res2) => {
  //                           if (!err2) {
  //                           } else {
  //                             res.send(err2);
  //                           }
  //                         }
  //                       );
  //                       var qr = "SELECT * FROM `user` WHERE `phone` = ?";
  //                       db.query(qr, [phone], (err1, res1) => {
  //                         if (!err1) {
  //                           var shop_name = username + "'s Shop";
  //                           qr =
  //                             "INSERT INTO `shop` (`id`, `seller_user_id`, `shop_name`, `shop_location_lt`, `shop_location_long`, `shop_number`, `shop_type`, `shop_custom_url`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?) ";
  //                           db.query(
  //                             qr,
  //                             [
  //                               res1[0].user_id,
  //                               shop_name,
  //                               latitude,
  //                               longitude,
  //                               phone,
  //                               shop_type,
  //                               shop_name,
  //                             ],
  //                             (err2, res2) => {
  //                               if (!err2) {
  //                                 db.query(
  //                                   "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `withdraw`, `from_ref`, `due_payment`) VALUES (NULL, ?, '0', '0', '0', '0')",
  //                                   [res2.insertId],
  //                                   (err3, res3) => {
  //                                     if (!err3) {
  //                                       console.log(
  //                                         "Reg details : ",
  //                                         res1[0].user_id,
  //                                         shop_name,
  //                                         latitude,
  //                                         longitude,
  //                                         phone
  //                                       );

  //                                       const encUserId = crypto.encrypt(
  //                                         res1[0].user_id
  //                                       );
  //                                       const encUserIdEncoded =
  //                                         encodeURIComponent(encUserId);
  //                                       const encMsg = crypto.encrypt(
  //                                         "Email Sent. Check Your Email !"
  //                                       );
  //                                       const encMsgEncoded =
  //                                         encodeURIComponent(encMsg);
  //                                       console.log(encUserIdEncoded);
  //                                       console.log(encMsgEncoded);
  //                                       res.redirect(
  //                                         `/emailVerificationRequestByUserId/${res1[0].user_id}/${encMsgEncoded}`
  //                                       );
  //                                     } else {
  //                                       res.send(err3);
  //                                     }
  //                                   }
  //                                 );
  //                               } else {
  //                                 res.send(err2);
  //                               }
  //                             }
  //                           );
  //                         } else {
  //                           res.send(err1);
  //                         }
  //                       });
  //                     } else {
  //                       res.cookie(
  //                         "message",
  //                         crypto.encrypt("Wrong Reference ID !"),
  //                         { maxAge: 1000 * 1 }
  //                       );
  //                       res.redirect("/registration");
  //                     }
  //                   }
  //                 );
  //               } else {
  //                 res.cookie(
  //                   "loginMessage",
  //                   crypto.encrypt("User Exists With This Email"),
  //                   {
  //                     maxAge: 1000 * 1,
  //                   }
  //                 );
  //                 res.redirect("/registration");
  //               }
  //             } else {
  //               console.error(err22);
  //               res.status(500).send(err22);
  //             }
  //           }
  //         );
  //       } else {
  //         res.cookie(
  //           "loginMessage",
  //           crypto.encrypt("User Exists With This Number"),
  //           {
  //             maxAge: 1000 * 1,
  //           }
  //         );
  //         res.redirect("/registration");
  //       }
  //     } else {
  //       res.send(err11);
  //     }
  //   }
  // );
};

// exports.regPost = async (req, res) => {
//   var {
//     firstName,
//     lastName,
//     email,
//     password,
//     gender,
//     refIdText,
//     DOB,
//     latitude,
//     longitude,
//     phone,
//     shop_type,
//   } = req.body;
//   // refId = '+'+refIdText.substr(1, refIdText.length)
//   refId = refIdText;
//   console.log("Ref ID : " + refId);
//   console.log("Number : " + phone);
//   const hashedPassword = await bcrypt.hash(password, saltRounds);
//   const username = firstName + " " + lastName;
//   db.query(
//     "SELECT * FROM `user` WHERE `user`.`phone` = ?",
//     [phone],
//     (err11, res11) => {
//       if (!err11) {
//         if (res11.length == 0) {
//           db.query(
//             "SELECT * FROM `user` WHERE `user`.`user_email` = ?",
//             [email],
//             (err22, res22) => {
//               if (!err22) {
//                 if (res22.length == 0) {
//                   console.log("REFID : " + refId);
//                   db.query(
//                     "SELECT * FROM `user` WHERE `own_ref_id` = ?",
//                     [refId],
//                     (err1, res1) => {
//                       if (res1.length > 0) {
//                         console.log("REF Details : " + res1[0]);
//                         var query =
//                           "INSERT INTO `user` (`user_id`, `user_name`, `user_email`, `user_password`, `date_of_birth`, `gender`, `reference_id`, `own_ref_id`, `phone`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)";
//                         db.query(
//                           query,
//                           [
//                             username,
//                             email,
//                             hashedPassword,
//                             DOB,
//                             gender,
//                             refId,
//                             phone,
//                             phone,
//                           ],
//                           (err2, res2) => {
//                             if (!err2) {
//                             } else {
//                               res.send(err2);
//                             }
//                           }
//                         );
//                         var qr = "SELECT * FROM `user` WHERE `phone` = ?";
//                         db.query(qr, [phone], (err1, res1) => {
//                           if (!err1) {
//                             var shop_name = username + "'s Shop";
//                             qr =
//                               "INSERT INTO `shop` (`id`, `seller_user_id`, `shop_name`, `shop_location_lt`, `shop_location_long`, `shop_number`, `shop_type`, `shop_custom_url`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?) ";
//                             db.query(
//                               qr,
//                               [
//                                 res1[0].user_id,
//                                 shop_name,
//                                 latitude,
//                                 longitude,
//                                 phone,
//                                 shop_type,
//                                 shop_name,
//                               ],
//                               (err2, res2) => {
//                                 if (!err2) {
//                                   db.query(
//                                     "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `withdraw`, `from_ref`, `due_payment`) VALUES (NULL, ?, '0', '0', '0', '0')",
//                                     [res2.insertId],
//                                     (err3, res3) => {
//                                       if (!err3) {
//                                         console.log(
//                                           "Reg details : ",
//                                           res1[0].user_id,
//                                           shop_name,
//                                           latitude,
//                                           longitude,
//                                           phone
//                                         );

//                                         const encUserId = crypto.encrypt(
//                                           res1[0].user_id
//                                         );
//                                         const encUserIdEncoded =
//                                           encodeURIComponent(encUserId);
//                                         const encMsg = crypto.encrypt(
//                                           "Email Sent. Check Your Email !"
//                                         );
//                                         const encMsgEncoded =
//                                           encodeURIComponent(encMsg);
//                                         console.log(encUserIdEncoded);
//                                         console.log(encMsgEncoded);
//                                         res.redirect(
//                                           `/emailVerificationRequestByUserId/${res1[0].user_id}/${encMsgEncoded}`
//                                         );
//                                       } else {
//                                         res.send(err3);
//                                       }
//                                     }
//                                   );
//                                 } else {
//                                   res.send(err2);
//                                 }
//                               }
//                             );
//                           } else {
//                             res.send(err1);
//                           }
//                         });
//                       } else {
//                         res.cookie(
//                           "message",
//                           crypto.encrypt("Wrong Reference ID !"),
//                           { maxAge: 1000 * 1 }
//                         );
//                         res.redirect("/registration");
//                       }
//                     }
//                   );
//                 } else {
//                   res.cookie(
//                     "loginMessage",
//                     crypto.encrypt("User Exists With This Email"),
//                     {
//                       maxAge: 1000 * 1,
//                     }
//                   );
//                   res.redirect("/registration");
//                 }
//               } else {
//                 console.error(err22);
//                 res.status(500).send(err22);
//               }
//             }
//           );
//         } else {
//           res.cookie(
//             "loginMessage",
//             crypto.encrypt("User Exists With This Number"),
//             {
//               maxAge: 1000 * 1,
//             }
//           );
//           res.redirect("/registration");
//         }
//       } else {
//         res.send(err11);
//       }
//     }
//   );
// };
