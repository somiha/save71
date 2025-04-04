const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const Shop = require("../middlewares/shop");
const crypto = require("../middlewares/crypto");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");
const moment = require("moment");
const { queryAsyncWithoutValue } = require("../config/helper");

exports.home = async (req, res) => {
  db.query(
    "SELECT * FROM `extra_cat` WHERE `popular_cat_value` = '1'",
    (errDate, resData) => {
      if (errDate) {
        // res.status(500).send("Error updating popularity");
      }
      if (resData.length > 0) {
        let last_update = resData[0].last_update;
        const currentDate = moment();
        const lastUpdate = moment(last_update);
        // console.log("Current Date: ", currentDate);
        const diffDays = currentDate.diff(lastUpdate, "days");
        if (diffDays >= 3) {
          // console.log("Popularity updated successfully!");
          last_update = currentDate.format("YYYY-MM-DD");
          db.query(
            "UPDATE `extra_cat` SET `popular_cat_value` = '0', `last_update` = ?",
            [last_update],
            (err, res) => {
              if (err) {
                console.log(err);
                // res.status(500).send("Error updating popularity");
              }
              // console.log("Popularity updated successfully Exited!");
            }
          );
        }
      }
    }
  );

  // var isLogged = crypto.decrypt(req.cookies.login_status || "");
  var isLogged = req.cookies.login_status
    ? crypto.decrypt(req.cookies.login_status)
    : "";
  if (isLogged == "true") {
    try {
      // const userId = crypto.decrypt(req.cookies.userId);
      const userId = req.cookies.userId
        ? crypto.decrypt(req.cookies.userId)
        : "";
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [
        mainCat,
        subCat,
        extraCat,
        allCat,
        fetchFeaturedImages,
        currRate,
        notification,
        trendingCat,
      ] = await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
        queryAsyncWithoutValue(
          "SELECT \
    ec.extra_cat_id, \
    ec.extra_cat_name, \
    ec.extra_cat_image_url, \
    SUM(od.product_quantity) AS total_sold_quantity \
FROM order_details od \
JOIN products p ON od.product_id = p.product_id \
JOIN extra_cat ec ON p.product_cat_id = ec.extra_cat_id \
WHERE od.created_at >= NOW() - INTERVAL 7 DAY \
GROUP BY ec.extra_cat_id, ec.extra_cat_name, ec.extra_cat_image_url \
ORDER BY total_sold_quantity DESC \
LIMIT 10; \
"
        ),
      ]);
      console.log("trendingCat : ", trendingCat);

      const Shops = await Shop.getShops();

      // Get user's current location from request query parameters
      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");

      // const userLat = crypto.decrypt(location.latitude);
      // const userLng = crypto.decrypt(location.longitude);

      // Default latitude and longitude values
      const defaultLat = 23.8041;
      const defaultLng = 90.4152;

      // If latitude or longitude doesn't exist, use the default values
      const userLat = location.latitude
        ? crypto.decrypt(location.latitude)
        : defaultLat;
      const userLng = location.longitude
        ? crypto.decrypt(location.longitude)
        : defaultLng;

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }

      // Get shops sorted by distance from user's location

      // parameters (userLat, userLng, user_id, shop_type, limit_per_shop)
      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          userId,
          2,
          4
        );
      const sortedShopsAndProductsByPopularity =
        await locationOptimizedDistance.getSortedShopsAndProductsByPopularity(
          userLat,
          userLng,
          userId,
          2,
          4
        );

      var uID = crypto.decrypt(req.cookies.userId);
      var oID = crypto.decrypt(req.cookies.order_id || "");
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      // console.log('User Image Decrypted: ', userImage)
      var userName = crypto.decrypt(req.cookies.userName);

      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          console.log("Orders: ", res1);

          db.query(
            "SELECT * FROM `products` WHERE `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1 ORDER BY `products`.`sell_count` DESC",
            (err2, res2) => {
              // console.log("Products: ", res2);
              if (!err2) {
                // INNER JOIN `extra_cat` ON `products`.`product_cat_id` = `extra_cat`.`extra_cat_id`
                var images = fetchFeaturedImages.map((image) => {
                  image.product_id = crypto.smallEncrypt(image.product_id);
                  return image;
                });

                // console.log("Sorted Shops: ", sortedShopsAndProductsByDistance);
                sortedShopsAndProductsByDistance.forEach((shop) => {
                  shop.product_id = crypto.smallEncrypt(shop.product_id);
                  var image = images.find(
                    (image) => image.product_id == shop.product_id
                  );
                  shop.product_image_url = image ? image.product_image_url : "";
                });

                sortedShopsAndProductsByPopularity.forEach((shop) => {
                  shop.product_id = crypto.smallEncrypt(shop.product_id);
                  var image = images.find(
                    (image) => image.product_id == shop.product_id
                  );
                  shop.product_image_url = image ? image.product_image_url : "";
                });

                var products = res2.map((product) => {
                  product.product_id = crypto.smallEncrypt(product.product_id);
                  var image = images.find(
                    (image) => image.product_id == product.product_id
                  );
                  product.product_image_url = image
                    ? image.product_image_url
                    : "";
                  return product;
                });

                var encCart = res1.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });
                res.render("home", {
                  ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                  ogTitle:
                    "Save71 Connects You and the World through Business.",
                  ogUrl: "https://admin-save71.lens-ecom.store",
                  sortedShops: sortedShopsAndProductsByDistance,
                  sortedShopsByPopularity: sortedShopsAndProductsByPopularity,
                  currencyCode,
                  currRate,
                  userName: userName,
                  userImage: userImage,
                  cart: encCart,
                  login_status: isLogged,
                  subCat: subCat,
                  mainCat: mainCat,
                  extraCat: extraCat,
                  allCat: allCat,
                  products: products,
                  images: images,
                  notification: notification,
                  base_pCount: 20, // total show 20 products
                  pPerShop: 5, // 4 products per shop
                  trendingCat,
                });
              } else {
                res.send(err2);
              }
            }
          );
        }
      );
    } catch (err) {
      console.error(err);
      // Handle error and send appropriate response
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};
