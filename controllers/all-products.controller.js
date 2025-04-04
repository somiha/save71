const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");

exports.allProducts = async (req, res) => {
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
      var uID = crypto.decrypt(req.cookies.userId);
      var extraId = req.params.extraId;
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);

      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }

      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          uID,
          null,
          4
        );

      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          if (!err1) {
            db.query(
              "SELECT * FROM `products` WHERE `products`.`product_cat_id` = ? AND `products`.`quantity` = 0 AND `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
              [extraId],
              (err2, res2) => {
                if (!err2) {
                  db.query(
                    "SELECT * FROM `extra_cat` INNER JOIN `sub_cat` ON `extra_cat`.`extra_cat_ref` = `sub_cat`.`sub_cat_id` WHERE `extra_cat`.`extra_cat_id` = ?",
                    [extraId],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "SELECT * FROM `sub_cat` WHERE `sub_cat`.`sub_cat_id` = ?",
                          [res3[0].extra_cat_ref],
                          (err4, res4) => {
                            if (!err4) {
                              db.query(
                                "SELECT * FROM `products` WHERE `products`.`quantity` = 0",
                                (err5, res5) => {
                                  if (!err5) {
                                    db.query(
                                      "SELECT * FROM `products`",
                                      (err6, res6) => {
                                        if (!err6) {
                                          var encAllProducts = res6.map(
                                            (item) => {
                                              item.product_id =
                                                crypto.smallEncrypt(
                                                  item.product_id
                                                );
                                              return item;
                                            }
                                          );

                                          var encImages =
                                            fetchFeaturedImages.map((item) => {
                                              item.product_id =
                                                crypto.smallEncrypt(
                                                  item.product_id
                                                );
                                              return item;
                                            });

                                          var encProduct =
                                            sortedShopsAndProductsByDistance
                                              .filter(
                                                (item) =>
                                                  item.product_cat_id == extraId
                                              )
                                              .map((item) => {
                                                item.product_id =
                                                  crypto.smallEncrypt(
                                                    item.product_id
                                                  );
                                                item.product_image_url =
                                                  encImages.filter(
                                                    (image) =>
                                                      image.product_id ==
                                                      item.product_id
                                                  )[0].product_image_url;
                                                return item;
                                              });
                                          console.log(
                                            "All Products: ",
                                            encProduct
                                          );

                                          var encCart = res1.map((item) => {
                                            item.product_id =
                                              crypto.smallEncrypt(
                                                item.product_id
                                              );
                                            return item;
                                          });

                                          var encImages =
                                            fetchFeaturedImages.map((item) => {
                                              item.product_id =
                                                crypto.smallEncrypt(
                                                  item.product_id
                                                );
                                              return item;
                                            });

                                          //
                                          // console.log("All Products: ", encAllProducts)
                                          // console.log("Products: ", encProduct)

                                          res.render("all-products", {
                                            ogImage:
                                              "https://saveneed.com/images/logo-og.webp",
                                            ogTitle:
                                              "Save71 Connects You and the World through Business.",
                                            ogUrl: "https://saveneed.com/",
                                            extraId,
                                            currencyCode,
                                            currRate,
                                            userName: userName,
                                            userImage: userImage,
                                            cart: encCart,
                                            login_status: isLogged,
                                            products: encProduct,
                                            extra_cat: res3,
                                            allExtraCat: extraCat,
                                            subCat: res4,
                                            allProducts: encAllProducts,
                                            subCat: subCat,
                                            mainCat: mainCat,
                                            extraCat: extraCat,
                                            allCat: allCat,
                                            images: encImages,
                                            notification: notification,
                                          });
                                        } else {
                                          res.send(err3);
                                        }
                                      }
                                    );
                                  } else {
                                    res.send(err5);
                                  }
                                }
                              );
                            } else {
                              res.send(err4);
                            }
                          }
                        );
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
    } else {
      res.redirect("/login");
      return;
    }
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};
