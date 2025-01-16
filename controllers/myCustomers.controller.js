const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

exports.myCustomers = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");

  if (isLogged) {
    try {
      if (!req.cookies.currencyCode) {
        return res.redirect("/logout");
      }
      const userId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [images, currRate, notification] = await Promise.all([
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      var seller_id = crypto.decrypt(req.cookies.seller_id || "");
      const userShop = await queryAsync("SELECT * FROM `shop` WHERE `id` = ?", [
        seller_id,
      ]);
      const userDetails = await queryAsync(
        "SELECT * FROM `user` WHERE `user_id` = ?",
        [userId]
      );

      const myCustomers = await queryAsync(
        "SELECT * FROM `user` WHERE `reference_id` = ?",
        [userDetails[0].own_ref_id]
      );

      const customerIds = myCustomers.map((customer) => customer.user_id);

      console.log("customerIds", customerIds);

      let customersWithOrders = [];

      if (customerIds.length > 0) {
        const coustomersShopIds = await queryAsync(
          "SELECT id, seller_user_id FROM `shop` WHERE `seller_user_id` IN (?)",
          [customerIds]
        );

        const customerShopIds = coustomersShopIds.map((shop) => shop.id);

        const myEarning = await queryAsync(
          "SELECT ref_id, SUM(amount) as total_amount, COUNT(*) as count FROM `fund_transfer` WHERE `ref_id` IN (?) AND `receiver_id` = ? GROUP BY ref_id",
          [customerShopIds, seller_id]
        );

        const customersCompletedOrders = await queryAsync(
          "SELECT user_id, COUNT(*) as completedOrders FROM `orders` WHERE `user_id` IN (?) AND `order_status` = 1 GROUP BY user_id",
          [customerIds]
        );

        customersWithOrders = myCustomers.map((customer) => {
          const orders = customersCompletedOrders.find(
            (order) => order.user_id === customer.user_id
          );
          const customerSellerId = coustomersShopIds.find(
            (shop) => shop.seller_user_id === customer.user_id
          );
          const earning = myEarning.find(
            (earning) => earning.ref_id === customerSellerId.id
          );
          return {
            ...customer,
            completedOrders: orders ? orders.completedOrders : 0,
            customerSellerId: customerSellerId ? customerSellerId.id : null,
            earning: earning ? earning.total_amount : 0,
            reveived: earning ? earning.count : 0,
          };
        });
      }

      return res.render("myCustomers", {
        ogImage: "https://admin.save71.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        currencyCode,
        currRate,
        menuId: "myCustomers",
        name: "My Customers",
        response: customersWithOrders,
        notification: notification,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};
