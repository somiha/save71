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
  const {
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

  console.log("latitude", latitude);
  console.log("longitude", longitude);

  const refId = refIdText;
  console.log("Ref ID : " + refId);
  console.log("Number : " + phone);

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const username = `${firstName} ${lastName}`;

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
    return res.redirect("/registration");
  }

  // Check if the reference ID exists
  const referredUser = await userModal.getByRefId(refId);
  // if (!referredUser) {
  //   res.cookie("message", crypto.encrypt("Wrong Reference ID!"), {
  //     maxAge: 1000 * 1,
  //   });
  //   return res.redirect("/registration");
  // }

  if (!referredUser) {
    res.cookie("message", crypto.encrypt("Wrong Reference ID !"), {
      maxAge: 1000 * 1,
    });
    return res.redirect("/registration?error=wrongRefId");
  }

  // Proceed to insert user data only if reference ID is valid
  const query = `
    INSERT INTO user_demo (user_id, user_name, user_email, user_password, date_of_birth, gender, reference_id, own_ref_id, phone, shop_location_lt, shop_location_long, shop_type)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
    async (err2) => {
      if (err2) {
        return res.send(err2); // Handle database error
      }

      try {
        const savedUser = await userModal.getUserByPhoneNumberUserDemo(phone);
        const encUserId = crypto.encrypt(savedUser.user_id);
        const encMsg = crypto.encrypt("Email Sent. Check Your Email!");
        res.redirect(
          `/emailVerificationRequestByUserId/${
            savedUser.user_id
          }/${encodeURIComponent(encMsg)}`
        );
      } catch (err) {
        res.send(err); // Handle error from getUserByPhoneNumberUserDemo or crypto.encrypt
      }
    }
  );
};

exports.regPostAPI = async (req, res) => {
  const {
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

  console.log("body", req.body);

  const refId = refIdText;

  try {
    // Check if the phone number already exists
    const existingUserByPhone = await userModal.getUserByPhoneNumber(phone);
    if (existingUserByPhone) {
      return res.status(400).json({
        message: "This mobile number already exists!",
      });
    }

    // Check if the email already exists
    const existingUserByEmail = await userModal.getUserByEmail(email);
    const existingUserByDemoEmail = await userModal.getUserByDemoEmail(email);
    if (existingUserByEmail || existingUserByDemoEmail) {
      return res.status(400).json({
        message: "This email already exists!",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const username = `${firstName} ${lastName}`;

    // Check if verified or unverified user exists
    const verifiedUser = await userModal.getUserByPhoneNumber(phone);
    const unVerifiedUser = await userModal.getUserByPhoneNumberUserDemo(phone);

    if (verifiedUser || unVerifiedUser) {
      return res.status(400).json({
        message: "User exists with this number",
      });
    }

    // Check if the reference ID exists
    const referredUser = await userModal.getByRefId(refId);
    if (!referredUser) {
      return res.status(400).json({
        message: "Invalid reference ID",
      });
    }

    // Insert user into the database
    const query = `
      INSERT INTO user_demo (user_id, user_name, user_email, user_password, date_of_birth, gender, reference_id, own_ref_id, phone, shop_location_lt, shop_location_long, shop_type)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
      async (err2) => {
        if (err2) {
          return res.status(500).json({
            message: "Database error",
            error: err2,
          });
        }

        try {
          // Retrieve the saved user
          const savedUser = await userModal.getUserByPhoneNumberUserDemo(phone);
          const encUserId = crypto.encrypt(savedUser.user_id);
          const encMsg = crypto.encrypt(
            "Registration successful, please verify your email!"
          );

          res.status(201).json({
            message: "Registration successful, please verify your email.",
            userId: savedUser.user_id,
            redirectMessage: encodeURIComponent(encMsg),
          });
        } catch (err) {
          console.log("Error retrieving user or sending email:", err);

          return res.status(500).json({
            message: "Error retrieving user or sending email",
            error: err,
          });
        }
      }
    );
  } catch (error) {
    // Catch and return any errors
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// exports.regPost = async (req, res) => {
//   const {
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

//   const refId = refIdText;
//   console.log("Ref ID : " + refId);
//   console.log("Number : " + phone);

//   // Check if the email or phone number already exists
//   const existingUserByPhone = await userModal.getUserByPhoneNumber(phone);
//   const existingUserByEmail = await userModal.getUserByEmail(email); // Assuming you have this function

//   const existingUserByDemoEmail = await userModal.getUserByDemoEmail(email);

//   if (existingUserByPhone) {
//     res.cookie(
//       "message",
//       crypto.encrypt("This mobile number already exists!"),
//       {
//         maxAge: 1000 * 1,
//       }
//     );
//     return res.redirect("/registration");
//   }

//   if (existingUserByEmail || existingUserByDemoEmail) {
//     res.cookie("message", crypto.encrypt("This email already exists!"), {
//       maxAge: 1000 * 1,
//     });
//     return res.redirect("/registration");
//   }

//   const hashedPassword = await bcrypt.hash(password, saltRounds);
//   const username = `${firstName} ${lastName}`;

//   const verifiedUser = await userModal.getUserByPhoneNumber(phone);
//   const unVerifiedUser = await userModal.getUserByPhoneNumberUserDemo(phone);

//   console.log(
//     "verifiedUser: ",
//     verifiedUser,
//     "unVerifiedUser: ",
//     unVerifiedUser
//   );

//   if (verifiedUser || unVerifiedUser) {
//     res.cookie("loginMessage", crypto.encrypt("User Exists With This Number"), {
//       maxAge: 1000 * 1,
//     });
//     return res.redirect("/registration");
//   }

//   // Check if the reference ID exists
//   const referredUser = await userModal.getByRefId(refId);

//   if (!referredUser) {
//     res.cookie("message", crypto.encrypt("Wrong Reference ID!"), {
//       maxAge: 1000 * 1,
//     });
//     return res.redirect("/registration?error=wrongRefId");
//   }

//   // Proceed to insert user data only if reference ID is valid
//   const query = `
//     INSERT INTO user_demo (user_id, user_name, user_email, user_password, date_of_birth, gender, reference_id, own_ref_id, phone, shop_location_lt, shop_location_long, shop_type)
//     VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//   db.query(
//     query,
//     [
//       username,
//       email,
//       hashedPassword,
//       DOB,
//       gender,
//       refId,
//       phone,
//       phone,
//       latitude,
//       longitude,
//       shop_type,
//     ],
//     async (err2) => {
//       if (err2) {
//         return res.send(err2); // Handle database error
//       }

//       try {
//         const savedUser = await userModal.getUserByPhoneNumberUserDemo(phone);
//         const encUserId = crypto.encrypt(savedUser.user_id);
//         const encMsg = crypto.encrypt("Email Sent. Check Your Email!");
//         res.redirect(
//           `/emailVerificationRequestByUserId/${
//             savedUser.user_id
//           }/${encodeURIComponent(encMsg)}`
//         );
//       } catch (err) {
//         res.send(err); // Handle error from getUserByPhoneNumberUserDemo or crypto.encrypt
//       }
//     }
//   );
// };

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
