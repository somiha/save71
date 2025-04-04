const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

exports.orders1 = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const orderId = req.query.orderIds;

    const orderIds = orderId.split(",");

    res.redirect(`/printDetails?orderIds=${orderId}`);
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};

exports.printDetails = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const orderId = req.query.orderIds;

    const orderIds = orderId.split(",");

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");

    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName);

    const shopQuery = "SELECT * FROM `shop` WHERE `shop`.`id` = ?";
    const shop = await queryAsync(shopQuery, [seller_id]);

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

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [seller_id]);

    const filteredOrderDetails = order_details.filter((order) => {
      return orderIds.includes(String(order.order_id));
    });

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

    // console.log(userInfo);

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

    const userOrderAndOrderDetails = filteredOrders.map((order) => {
      const orderDetails = filteredOrderDetails.filter(
        (orderDetail) => orderDetail.order_id === order.order_id
      );
      const user = userInfo[order.user_id];
      // console.log({ order });
      return { order, orderDetails, user };
    });

    // console.log({ userOrderAndOrderDetails });

    return res.status(200).render("new_orders", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      userImage: userImage,
      userName: userName,
      menuId: "shop-owner-orders",
      order_details: filteredOrderDetails,
      userOrderAndOrderDetails,
      orders: filteredOrders,
      image: images,
      userInfo,
      currRate,
      currencyCode,
      name: "Sellings",
      notification: notification,
      shop: shop[0],
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};
