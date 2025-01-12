const { query } = require("express");
const db = require("../../config/database.config");
const catModel = require("../../middlewares/cat");
const crypto = require("../../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../../config/helper");

exports.purchaseDetails = async (req, res) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    console.log("Seller ID : ", seller_id);

    const [images, currRate, users] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllUserInfo(),
    ]);

    var oID = req.params.id;
    // console.log({ oID });
    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`order_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [oID]);

    const ordersQuery = "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?";
    const orders = await queryAsync(ordersQuery, [oID]);

    // if (orders[0].seller_id != seller_id && orders[0].userId != userId) {
    //   return res
    //     .status(404)
    //     .send(
    //       '<script>alert("UnAuthorized !"); window.history.go(-1);</script>'
    //     );
    // }

    const shopQuery = "SELECT * FROM `shop` WHERE `shop`.`id` = ?";

    const shop = await queryAsync(shopQuery, [orders[0].seller_id]);

    console.log("shop", orders[0].seller_id);

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }

    console.log("order_details", order_details);

    var matchingUser = users.find((user) => user.user_id === orders[0].user_id);
    console.log("Seller Details : ", shop[0]);
    console.log("Order Details : ", orders[0]);
    return res.render("user-dashboard/purchase_details", {
      ogImage: "https://admin.save71.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      currRate,
      currencyCode,
      menuId: "shop-owner-purchases",
      order_details: order_details,
      image: images,
      order: orders[0],
      seller_details: shop[0],
      matchingUser,
      userId,
      seller_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};
