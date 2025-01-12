const db = require("../config/database.config");
const { products } = require("./products.controller");
const catModel = require("../middlewares/cat");
const Shop = require("../middlewares/shop");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");
const crypto = require("../middlewares/crypto");
const { enc } = require("crypto-js");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

exports.productDetails = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    // if product not published then it can't be accessed
    try {
      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.userId)
      );
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [mainCat, subCat, extraCat, allCat, allProducts, images, currRate] =
        await Promise.all([
          catModel.fetchMainCat(),
          catModel.fetchSubCat(),
          catModel.fetchExtraCat(),
          catModel.fetchAllCat(),
          catModel.fetchAllProducts(),
          catModel.fetchFeaturedImages(),
          catModel.fetchCurrencyRate(currencyCode),
        ]);

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
      const sortedShops =
        await locationOptimizedDistance.getSortedShopsByDistance(
          userLat,
          userLng
        );

      var productID = req.params.id;
      var useProductID = crypto.smallDecrypt(productID);

      // console.log(useProductID);

      const relatedProducts =
        await locationOptimizedDistance.getRelatedProducts(useProductID);

      var uID = crypto.decrypt(req.cookies.userId);
      var isLogged = crypto.decrypt(req.cookies.login_status || "");
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);

      const ratingsQuery =
        "SELECT r.review_star, r.review_des, u.user_name, r.user_id FROM review r JOIN user u ON r.user_id = u.user_id WHERE r.product_id = ?";
      const ratings = await queryAsync(ratingsQuery, [useProductID]);
      const totalStars = ratings.reduce(
        (sum, rating) => sum + rating.review_star,
        0
      );
      const averageRating =
        ratings.length > 0 ? (totalStars / ratings.length).toFixed(1) : 0;
      if (isLogged) {
        var query =
          "SELECT * FROM `products` INNER JOIN `product_image` ON `products`.`product_id` = `product_image`.`product_id` INNER JOIN `extra_cat` ON `products`.`product_cat_id` = `extra_cat`.`extra_cat_id`  WHERE `products`.`product_id` = ?";
        db.query(query, [useProductID], (err1, res1) => {
          if (!err1) {
            // console.log("RES : ", res1)
            db.query(
              "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
              [uID],
              (err2, res2) => {
                if (!err2) {
                  db.query(
                    "SELECT * FROM `extra_cat` WHERE `extra_cat`.`extra_cat_id` = ?",
                    [res1[0].product_cat_id],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "SELECT * FROM `review` INNER JOIN `user` ON `user`.`user_id` = `review`.`user_id` WHERE product_id = ?",
                          [useProductID],
                          (err4, res4) => {
                            if (!err4) {
                              db.query(
                                "SELECT * FROM `user` INNER JOIN `shop` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `user`.`user_id` = ?",
                                [uID],
                                (err5, res5) => {
                                  if (!err5) {
                                    db.query(
                                      "SELECT * FROM `product_faq` WHERE `product_id` = ?",
                                      [useProductID],
                                      (err6, res6) => {
                                        if (!err6) {
                                          db.query(
                                            "SELECT * FROM `product_video` WHERE `product_id` = ?",
                                            [useProductID],
                                            (err7, res7) => {
                                              if (!err7) {
                                                if (
                                                  res1[0].status == 1 &&
                                                  res1[0].admin_published ==
                                                    1 &&
                                                  res1[0].quantity >= 0
                                                ) {
                                                  res1[0].product_id =
                                                    crypto.smallEncrypt(
                                                      res1[0].product_id
                                                    );

                                                  var encImages = images.map(
                                                    (image) => {
                                                      image.product_id =
                                                        crypto.smallEncrypt(
                                                          image.product_id
                                                        );
                                                      return image;
                                                    }
                                                  );

                                                  var encRelatedProducts =
                                                    relatedProducts.map(
                                                      (product) => {
                                                        product.product_id =
                                                          crypto.smallEncrypt(
                                                            product.product_id
                                                          );
                                                        var image =
                                                          encImages.filter(
                                                            (image) =>
                                                              image.product_id ==
                                                              product.product_id
                                                          );
                                                        product.product_image_url =
                                                          image
                                                            ? image[0]
                                                                .product_image_url
                                                            : "";
                                                        product.distanceMeters =
                                                          sortedShops.find(
                                                            (shop) =>
                                                              shop.id ==
                                                              product.seller_id
                                                          ).distanceMeters;
                                                        product.distanceKm =
                                                          sortedShops.find(
                                                            (shop) =>
                                                              shop.id ==
                                                              product.seller_id
                                                          ).distanceKm;
                                                        return product;
                                                      }
                                                    );

                                                  var encProduct = res1.map(
                                                    (product) => {
                                                      // product.product_id = crypto.smallEncrypt(product.product_id);
                                                      return product;
                                                    }
                                                  );

                                                  var encCart = res2.map(
                                                    (item) => {
                                                      item.product_id =
                                                        crypto.smallEncrypt(
                                                          item.product_id
                                                        );
                                                      return item;
                                                    }
                                                  );

                                                  res.render(
                                                    "product-details",
                                                    {
                                                      ogImage:
                                                        res1[0]
                                                          .product_image_url,
                                                      ogTitle:
                                                        res1[0].product_name,
                                                      ogUrl:
                                                        "https://localhost:3000/product-details/" +
                                                        encodeURIComponent(
                                                          res1[0].product_name
                                                        ) +
                                                        "/" +
                                                        crypto.urlEncrypt(
                                                          res1[0].product_id,
                                                          1
                                                        ),
                                                      sortedShops,
                                                      currRate,
                                                      currencyCode,
                                                      userImage: userImage,
                                                      userName: userName,
                                                      login_status: isLogged,
                                                      product: encProduct,
                                                      cart: encCart,
                                                      relatedProducts:
                                                        encRelatedProducts,
                                                      extraCat: res3,
                                                      subCat: subCat,
                                                      mainCat: mainCat,
                                                      extraCat: extraCat,
                                                      allCat: allCat,
                                                      ratings: res4,
                                                      user: res5,
                                                      faq: res6,
                                                      video: res7,
                                                      images: encImages,
                                                      notification:
                                                        notification,
                                                      ratings,
                                                      averageRating,
                                                    }
                                                  );
                                                } else {
                                                  res.redirect("back");
                                                }
                                              } else {
                                                res.send(err7);
                                              }
                                            }
                                          );
                                        } else {
                                          res.send(err6);
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
        });
      } else {
        res.redirect("/login");
      }
    } catch (err) {
      console.error(err);
      // Handle error and send appropriate response
      res.status(500).send("Internal Server Error");
    }
  } else {
    req.session.returnTo = req.originalUrl;
    res.redirect("/login");
  }
};
