const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

// exports.orders = async (req, res) => {
//   var isLogged = crypto.decrypt(req.cookies.login_status || "");
//   if (isLogged) {
//     try {
//       const userId = crypto.decrypt(req.cookies.userId);
//       const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
//       const [images, currRate, notification] = await Promise.all([
//         catModel.fetchFeaturedImages(),
//         catModel.fetchCurrencyRate(currencyCode),
//         catModel.fetchAllNotifications(userId),
//       ]);
//       var seller_id = crypto.decrypt(req.cookies.seller_id);
//       var userImage = crypto.decrypt(req.cookies.userImage || "");
//       var userName = crypto.decrypt(req.cookies.userName);
//       // console.log("seller_id (from_orders)", seller_id);
//       db.query(
//         "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?  ORDER BY `orders`.`placed_date` DESC",
//         [seller_id],
//         (err1, orders) => {
//           if (!err1) {
//             db.query(
//               "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?",
//               [seller_id],
//               (err2, order_details) => {
//                 if (!err2) {
//                   db.query("SELECT * FROM `user`", (err3, userInfo) => {
//                     if (err3) {
//                       res.send(err3);
//                       return;
//                     }
//                     db.query(
//                       "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()",
//                       [seller_id],
//                       (err4, shopDueDetails) => {
//                         if (err4) {
//                           res.send(err4);
//                           return;
//                         }

//                         var encImages = images.map((image) => {
//                           image.product_id = crypto.smallEncrypt(
//                             image.product_id
//                           );
//                           return image;
//                         });
//                         var encOrderDetails = order_details.map((order) => {
//                           order.product_id = crypto.smallEncrypt(
//                             order.product_id
//                           );
//                           return order;
//                         });

//                         // If no due is pending, redirect to balance page
//                         if (shopDueDetails.length > 0) {
//                           res.redirect("/balance");
//                         }

//                         res.render("orders", {
//                           ogImage:
//                             "https://admin.save71.com/images/logo-og.webp",
//                           ogTitle:
//                             "Save71 Connects You and the World through Business.",
//                           ogUrl: "https://admin-save71.lens-ecom.store",
//                           userImage: userImage,
//                           userName: userName,
//                           menuId: "shop-owner-orders",
//                           order_details: encOrderDetails,
//                           orders: orders,
//                           image: encImages,
//                           userInfo,
//                           currRate,
//                           currencyCode,
//                           name: "Sellings",
//                           notification: notification,
//                         });
//                       }
//                     );
//                   });
//                 } else {
//                   res.send(err2);
//                 }
//               }
//             );
//           } else {
//             res.send(err1);
//           }
//         }
//       );
//     } catch (err) {
//       console.error(err);
//       // Handle error and send appropriate response
//       res.status(500).send("Internal Server Error");
//     }
//   } else {
//     res.redirect("/login");
//   }
// };

exports.orders = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");

    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName);

    const [images, currRate, notification] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllNotifications(userId),
    ]);

    const ordersQuery =
      "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?  ORDER BY `orders`.`placed_date` DESC";
    const orders = await queryAsync(ordersQuery, [seller_id]);
    let notes = [];

    if (orders.length > 0) {
      const notesQuery =
        "SELECT * FROM `cancel_note` WHERE `order_id` = ? OR `seller_id` = ?";
      notes = await queryAsync(notesQuery, [orders[0].order_id, seller_id]);
    }

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [seller_id]);

    const userInfoArray = await Promise.all(
      orders.map((order) => {
        const userInfoQuery = "SELECT * FROM `user` WHERE `user_id` = ?";
        return queryAsync(userInfoQuery, [order["user_id"]]);
      })
    );

    // Create a map of users by user_id
    const userInfo = {};
    userInfoArray.forEach((userArray) => {
      const user = userArray[0];
      userInfo[user?.user_id] = user;
    });

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    const shopBalance = await queryAsync(
      "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
      [seller_id]
    );

    var encImages = images.map((image) => {
      image.product_id = crypto.smallEncrypt(image.product_id);
      return image;
    });
    var encOrderDetails = order_details.map((order) => {
      order.product_id = crypto.smallEncrypt(order.product_id);
      return order;
    });

    // If no due is pending, redirect to balance page
    if (shopBalance[0].due_payment >= 0.1) {
      return res.redirect("/balance?isDuePending=true");
    }

    const orderNotes = {};
    notes.forEach((note) => {
      if (!orderNotes[note.order_id]) {
        orderNotes[note.order_id] = note;
      }
    });

    console.log(orderNotes);

    return res.status(200).render("orders", {
      ogImage: "https://admin.save71.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      userImage: userImage,
      userName: userName,
      menuId: "shop-owner-orders",
      order_details: encOrderDetails,
      orders: orders,
      image: encImages,
      userInfo,
      currRate,
      currencyCode,
      name: "Sellings",
      notification: notification,
      orderNotes,
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};

exports.orders1 = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const orderId = req.query.orderIds;

    const orderIds = orderId.split(",");

    console.log("orderIds", orderIds);

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");

    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName);

    const [images, currRate, notification] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllNotifications(userId),
    ]);

    const ordersQuery =
      "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?  ORDER BY `orders`.`placed_date` DESC";
    const orders = await queryAsync(ordersQuery, [seller_id]);

    const filteredOrders = orders.filter((order) => {
      return orderIds.includes(String(order.order_id));
    });
    console.log("filteredOrders", filteredOrders);
    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [seller_id]);

    const filteredOrderDetails = order_details.filter((order) => {
      return orderIds.includes(String(order.order_id));
    });

    console.log("filteredOrderDetails", filteredOrderDetails);

    const userInfoArray = await Promise.all(
      orders.map((order) => {
        const userInfoQuery = "SELECT * FROM `user` WHERE `user_id` = ?";
        return queryAsync(userInfoQuery, [order["user_id"]]);
      })
    );

    // Create a map of users by user_id
    const userInfo = {};
    userInfoArray.forEach((userArray) => {
      const user = userArray[0];
      userInfo[user.user_id] = user;
    });

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    var encImages = images.map((image) => {
      image.product_id = crypto.smallEncrypt(image.product_id);
      return image;
    });
    var encOrderDetails = order_details.map((order) => {
      order.product_id = crypto.smallEncrypt(order.product_id);
      return order;
    });

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }

    return res.status(200).render("orders1", {
      ogImage: "https://admin.save71.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      userImage: userImage,
      userName: userName,
      menuId: "shop-owner-orders",
      order_details: filteredOrderDetails,
      orders: filteredOrders,
      image: encImages,
      userInfo,
      currRate,
      currencyCode,
      name: "Sellings",
      notification: notification,
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};
