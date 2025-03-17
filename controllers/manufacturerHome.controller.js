const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const Shop = require("../middlewares/shop");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");
const crypto = require("../middlewares/crypto");

exports.manufacturerHome = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.userId);
      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.userId)
      );
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [mainCat, subCat, extraCat, allCat, fetchFeaturedImages, currRate] =
        await Promise.all([
          catModel.fetchMainCat(),
          catModel.fetchSubCat(),
          catModel.fetchExtraCat(),
          catModel.fetchAllCat(),
          catModel.fetchFeaturedImages(),
          catModel.fetchCurrencyRate(currencyCode),
        ]);

      const Shops = await Shop.getShops();

      // Get user's current location from request query parameters
      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }

      // Find nearest shops to the user's current location
      // parameters (userLat, userLng, user_id, shop_type, limit_per_shop)
      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          userId,
          1,
          4
        );
      const sortedShopsAndProductsByPopularity =
        await locationOptimizedDistance.getSortedShopsAndProductsByPopularity(
          userLat,
          userLng,
          userId,
          1,
          4
        );

      var uID = crypto.decrypt(req.cookies.userId);
      var oID = crypto.decrypt(req.cookies.order_id || "");
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);

      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          db.query(
            "SELECT * FROM `products` WHERE `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1 ORDER BY `products`.`sell_count` DESC",
            (err2, res2) => {
              if (!err2) {
                console.log("Decrypted Products ", res2);
                var products = res2.map((product) => {
                  product.product_id = crypto.smallEncrypt(product.product_id);
                  return product;
                });

                var encImages = fetchFeaturedImages.map((image) => {
                  image.product_id = crypto.smallEncrypt(image.product_id);
                  return image;
                });

                var encCart = res1.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });

                sortedShopsAndProductsByDistance.forEach((shop) => {
                  shop.product_id = crypto.smallEncrypt(shop.product_id);
                  var image = encImages.find(
                    (image) => image.product_id === shop.product_id
                  );
                  shop.product_image_url = image ? image.product_image_url : "";
                });

                sortedShopsAndProductsByPopularity.forEach((shop) => {
                  shop.product_id = crypto.smallEncrypt(shop.product_id);
                  var image = encImages.find(
                    (image) => image.product_id === shop.product_id
                  );
                  shop.product_image_url = image ? image.product_image_url : "";
                });

                // INNER JOIN `extra_cat` ON `products`.`product_cat_id` = `extra_cat`.`extra_cat_id`
                res.render("manufacturerHome", {
                  ogImage: "https://admin.save71.com/images/logo-og.webp",
                  ogTitle:
                    "Save71 Connects You and the World through Business.",
                  ogUrl: "https://admin-save71.lens-ecom.store",
                  navId: "manufacturerHome",
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
                  images: encImages,
                  notification: notification,
                  base_pCount: 20, // total show 20 products
                  pPerShop: 5, // 4 products per shop
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
