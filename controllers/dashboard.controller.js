const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.dashboard = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [fetchFeaturedImages, currRate, notification] = await Promise.all([
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      var seller_id = crypto.decrypt(req.cookies.seller_id || "");

      db.query(
        "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?",
        [seller_id],
        (err1, res1) => {
          if (!err1) {
            db.query(
              "SELECT * FROM `products` WHERE `products`.`seller_id` = ?",
              [seller_id],
              (err2, res2) => {
                if (!err2) {
                  db.query(
                    "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` INNER JOIN `product_image` ON `products`.`product_id` = `product_image`.`product_id` WHERE `orders`.`seller_id` = ?",
                    [seller_id],
                    (err3, res3) => {
                      if (!err3) {
                        console.log("seller_id : ", seller_id);
                        // console.log(res3);
                        res.render("dashboard", {
                          ogImage:
                            "https://admin.save71.com/images/logo-og.webp",
                          ogTitle:
                            "Save71 Connects You and the World through Business.",
                          ogUrl: "https://admin-save71.lens-ecom.store",
                          currRate,
                          currencyCode,
                          images: fetchFeaturedImages,
                          menuId: "shop-owner-dashboard",
                          name: "Dashboard",
                          orders: res1,
                          products: res2,
                          allOrders: res3,
                          notification: notification,
                        });
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
            res.send(err1);
          }
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};
