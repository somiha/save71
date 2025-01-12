const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");

exports.shop_owner_product = async (req, res) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (isLogged) {
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

      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }
      var uID = crypto.decrypt(req.cookies.userId);
      var sID = await catModel.sellerCustomUrlToID(req.params.id);
      sID = sID[0].id;
      console.log("Seller ID : ", sID, " CUSTOM URL : ", req.params.id);
      // return res.send("Under contraction")
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);
      // visiting own shop
      let passID = uID;
      if (sID == uID) {
        passID = null;
      }

      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          sID,
          null,
          null
        );
      const sortedShops =
        await locationOptimizedDistance.getSortedShopsByDistance(
          userLat,
          userLng
        );

      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          // console.log("UID : ", uID)
          if ((!err1, res1)) {
            db.query(
              "SELECT * FROM `products` WHERE `products`.`seller_id` = ? AND `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
              [sID],
              (err2, res2) => {
                if (!err2) {
                  // console.log("User id : ", uID)
                  // console.log("Seller id : ", sID)
                  db.query(
                    "SELECT * FROM `shop` WHERE `shop`.`id` = ?",
                    [sID],
                    (err3, res3) => {
                      if (!err3) {
                        const filteredExtraCat = extraCat.filter((cat) => {
                          return res2.some(
                            (product) =>
                              product.product_cat_id === cat.extra_cat_id
                          );
                        });
                        console.log("Filtered extra cat : ", filteredExtraCat);

                        var images = fetchFeaturedImages.map((image) => {
                          image.product_id = crypto.smallEncrypt(
                            image.product_id
                          );
                          return image;
                        });

                        // console.log("Sorted Shops and Products : ", sortedShopsAndProductsByDistance)

                        var products = sortedShopsAndProductsByDistance
                          .filter((product) => product.seller_id == sID)
                          .map((product) => {
                            product.product_id = crypto.smallEncrypt(
                              product.product_id
                            );
                            product.product_image_url = images.filter(
                              (image) => image.product_id == product.product_id
                            )[0]?.product_image_url;
                            return product;
                          });

                        var shops = sortedShops
                          .filter((shop) => shop.id == sID)
                          .map((shop) => {
                            shop.product_id = crypto.smallEncrypt(
                              shop.product_id
                            );
                            return shop;
                          });

                        var encCart = res1.map((item) => {
                          item.product_id = crypto.smallEncrypt(
                            item.product_id
                          );
                          return item;
                        });

                        // console.log("Shops : ", shops)

                        // console.log("Products : ", sortedShopsAndProductsByDistance)
                        // return res.send("Under contraction")

                        res.render("shop-owner-products", {
                          ogImage: "https://save71.com/images/logo-og.webp",
                          ogTitle:
                            "Save71 Connects You and the World through Business.",
                          ogUrl: "http://localhost:3000",
                          currRate,
                          currencyCode,
                          userName: userName,
                          userImage: userImage,
                          cart: encCart,
                          shop: shops,
                          login_status: isLogged,
                          products: products,
                          subCat: subCat,
                          mainCat: mainCat,
                          // extraCat: extraCat,
                          filteredExtraCat,
                          allCat: allCat,
                          images: images,
                          notification: notification,
                          extraCat,
                        });
                      } else {
                        res.send(
                          "Error in fetching shop data. Please try again later."
                        );
                        console.error(err3);
                      }
                    }
                  );
                } else {
                  res.send(
                    "Error in fetching products data. Please try again later."
                  );
                  console.error(err2);
                }
              }
            );
          } else {
            res.send("Error in fetching cart data. Please try again later.");
            console.error(err1);
          }
        }
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};
