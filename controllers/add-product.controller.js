const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");
const locationOptimizedDistance = require("../middlewares/locationOptimizedDistance");

exports.cart_product = async (req, res) => {
  try {
    const userId = req.params.userId;
    const order_id = req.params.orderId;
    const orderIdOfUserQuery = `SELECT * FROM orders Where user_id = ${userId}`;
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
      var sID = req.params.id;
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);

      console.log({ userLat });
      console.log({ userLng });

      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          sID,
          null,
          null
        );

      // console.log({ sortedShopsAndProductsByDistance });

      const sortedShops =
        await locationOptimizedDistance.getSortedShopsByDistance(
          userLat,
          userLng
        );

      const [res1, res2, res3] = await Promise.all([
        queryAsync(
          "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
          [uID]
        ),
        queryAsync(
          "SELECT * FROM `products` WHERE `products`.`seller_id` = ? AND `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
          [sID]
        ),
        queryAsync("SELECT * FROM `shop` WHERE `shop`.`id` = ?", [sID]),
      ]);

      const filteredExtraCat = extraCat.filter((cat) => {
        return res2.some(
          (product) => product.product_cat_id === cat.extra_cat_id
        );
      });

      var images = fetchFeaturedImages.map((image) => {
        image.product_id = crypto.smallEncrypt(image.product_id);
        return image;
      });

      var products = sortedShopsAndProductsByDistance
        .filter((product) => product.seller_id == sID)
        .map((product) => {
          product.product_id = crypto.smallEncrypt(product.product_id);
          product.product_image_url = images.filter(
            (image) => image.product_id == product.product_id
          )[0].product_image_url;
          return product;
        });

      console.log({ products });

      var shops = sortedShops
        .filter((shop) => shop.id == sID)
        .map((shop) => {
          shop.product_id = crypto.smallEncrypt(shop.product_id);
          return shop;
        });

      var encCart = res1.map((item) => {
        item.product_id = crypto.smallEncrypt(item.product_id);
        return item;
      });

      res.render("cart-product", {
        ogImage: "https://save71.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
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
        filteredExtraCat,
        allCat: allCat,
        images: images,
        notification: notification,
        extraCat,
        userId,
        menuId: "shop-owner-products",
        name: "Update Order",
        order_id,
        seller_id: sID,
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.addToCartBySeller = async (req, res) => {
  // creating an order
  var order_id = req.params.order_id;
  var login_status = true;
  var user_id = req.params.user_id;
  var enProduct_id = req.params.product_id;
  var use_product_id = crypto.smallDecrypt(enProduct_id);
  var seller_id = req.params.seller_id;

  function addCart() {
    // console.log("add cart : ", resPid[0].seller_id, seller_id)
    db.query(
      "SELECT * FROM `shop` WHERE `shop`.`id` = ?",
      [seller_id],
      (err11, res11) => {
        if (!err11) {
          if (user_id == res11[0].seller_user_id) {
            res.send(`
              <script>
                alert("You can't buy your own product !");
                window.history.go(-1);
              </script>
            `);
          } else if (login_status) {
            // date part
            const today = new Date();
            const sevenDaysFromToday = new Date(today);
            sevenDaysFromToday.setDate(today.getDate() + 7);
            if (order_id == "" || order_id <= 0) {
              db.query(
                "INSERT INTO `orders` (`order_id`, `user_id`, `order_status`, `seller_id`, `placed_date`, `delivery_date`, `request_review`, `in_cart`, `is_areaShop`, `seller_confirm`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
                [user_id, 3, seller_id, today, sevenDaysFromToday, 0, 1],
                (err1, res1) => {
                  if (err1) {
                    console.log(
                      "Inserting order : ",
                      user_id,
                      seller_id,
                      today,
                      sevenDaysFromToday
                    );
                    res.send("Error in inserting order");
                    console.error(err1);
                  }
                }
              );
              db.query(
                "SELECT * FROM `orders`  WHERE `orders`.`user_id` = ? ORDER BY `orders`.`order_id` DESC",
                [user_id],
                (err1, res1) => {
                  order_id = res1[0].order_id;
                  res.cookie("order_id", crypto.encrypt(order_id));
                }
              );
            }
            // already under an order
            // also order details part
            var query =
              "INSERT INTO `order_details` (`order_details_id`, `order_id`, `product_id`, `product_quantity`, `product_total_price`, `note_to_user`, `stock_out`, `deduct_price`) VALUES (NULL, ?, ?, ?, ?, NULL, ?, ?)";
            var alreadyQuery =
              "UPDATE `order_details` SET `product_quantity` = ?, `product_total_price` = ?, `deduct_price` = ? WHERE `order_details`.`order_details_id` = ?";
            db.query(
              "SELECT * FROM `products` WHERE `products`.`product_id` = ?",
              [use_product_id],
              (err1, res1) => {
                if (!err1) {
                  db.query(
                    "SELECT * FROM `order_details` WHERE `order_details`.`product_id` = ? AND `order_details`.`order_id` = ?",
                    [use_product_id, order_id],
                    (err2, res2) => {
                      if (!err2) {
                        console.log("Product details1111 : ", res2[0]);
                        if (res2.length <= 0) {
                          db.query(
                            "SELECT * FROM `extra_cat` WHERE `extra_cat_id` = ?",
                            [res1[0].product_cat_id],
                            (err3, res3) => {
                              if (!err3) {
                                // console.log("Deduct amount : ", res3[0].retailer_deduct_percentage)

                                // extra cat popularity add
                                db.query(
                                  "UPDATE `extra_cat` SET `popular_cat_value` = ? WHERE `extra_cat`.`extra_cat_id` = ?",
                                  [
                                    res3[0].popular_cat_value + 1,
                                    res3[0].extra_cat_id,
                                  ],
                                  (err5, res5) => {
                                    if (err5) {
                                      console.log(
                                        "Extra cat popularity add: ",
                                        err5
                                      );
                                      res.send(
                                        "Error in extra cat popularity add"
                                      );
                                      console.error(err5);
                                    }
                                  }
                                );

                                //  determine which seller type, to add deduct percentage
                                const percentage =
                                  res11[0].shop_type == 1
                                    ? res3[0].manufacturer_deduct_percentage
                                    : res3[0].retailer_deduct_percentage;

                                db.query(
                                  query,
                                  [
                                    order_id,
                                    use_product_id,
                                    1,
                                    res1[0].product_price,
                                    0,
                                    res1[0].product_price * (percentage / 100),
                                  ],
                                  (err4, res4) => {
                                    if (!err4) {
                                      // console.log("order_id", order_id)
                                      addToOrderBySeller(order_id);
                                      res.redirect(
                                        "/order_details/" + order_id
                                      );
                                    } else {
                                      res.send(
                                        "Error in inserting order details"
                                      );
                                      console.error(err4);
                                    }
                                  }
                                );
                              } else {
                                res.send("Error in extra cat");
                                console.error(err3);
                              }
                            }
                          );
                        } else {
                          console.log("Already in cart section");
                          var perPrice =
                            res2[0].product_total_price /
                            res2[0].product_quantity;
                          db.query(
                            "SELECT * FROM `extra_cat` WHERE `extra_cat_id` = ?",
                            [res1[0].product_cat_id],
                            (err3, res3) => {
                              if (!err3) {
                                const percentage =
                                  res11[0].shop_type == 1
                                    ? res3[0].manufacturer_deduct_percentage
                                    : res3[0].retailer_deduct_percentage;
                                const new_total_price =
                                  res2[0].product_total_price + perPrice;

                                db.query(
                                  alreadyQuery,
                                  [
                                    res2[0].product_quantity + 1,
                                    // res2[0].product_total_price + perPrice,
                                    new_total_price,
                                    // res2[0].deduct_price + res3[0].retailer_deduct_percentage,
                                    new_total_price * (percentage / 100),
                                    res2[0].order_details_id,
                                  ],
                                  (err4, res4) => {
                                    if (!err4) {
                                      res.redirect(
                                        "/order_details/" + order_id
                                      );
                                    } else {
                                      res.send(
                                        "Error in updating order details"
                                      );
                                      console.error(err4);
                                    }
                                  }
                                );
                              } else {
                                res.send("Error in extra cat");
                                console.error(err3);
                              }
                            }
                          );
                        }
                      } else {
                        res.send("Error in order details");
                        console.error(err2);
                      }
                    }
                  );
                } else {
                  res.send("Error in products");
                  console.error(err1);
                }
              }
            );
          } else {
            res.redirect("/login");
          }
        } else {
          res.send("Error in shop");
          console.error(err11);
        }
      }
    );
  }

  db.query(
    "SELECT * FROM `orders` WHERE `order_id` = ?",
    [order_id],
    (errPid, resPid) => {
      if (!errPid) {
        // return res.send("Under construction")
        if (order_id == "") {
          addCart();
        } else if (order_id != "" && resPid[0].seller_id == seller_id) {
          addCart();
        } else {
          res.send(`
                    <script>
                        alert("You have already added products from another seller to your cart. Please complete it first or cancel the order!");
                        window.history.go(-1);
                    </script>
                `);
        }
      } else {
        res.send(errPid);
      }
    }
  );
};

function addToOrderBySeller(order_id) {
  var oID = order_id;
  db.query(
    "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ?",
    [oID],
    (err11, res11) => {
      if (!err11) {
        console.log("Products : ", res11, order_id);
        if (res11.length > 0) {
          db.query(
            "UPDATE `orders` SET `in_cart` = '0', `request_review` = '1', `seller_confirm` = '0' WHERE `orders`.`order_id` = ?",
            [oID],
            (err1, res1) => {
              console.log("Order updated", oID, res1);
              if (!err1) {
                db.query(
                  "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `orders`.`order_id` = ?",
                  [oID],
                  (err2, res2) => {
                    if (!err2) {
                    } else {
                    }
                  }
                );
              } else {
              }
            }
          );
        } else {
          console.log("No products");

          return;
        }
      } else {
      }
    }
  );
}
