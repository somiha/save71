const db = require("../config/database.config");
const crypto = require("../middlewares/crypto");
const catModel = require("../middlewares/cat");

// import { queryAsync, queryAsyncWithoutValue } from "../helpers/dbUtils.js";
// import crypto from "../helpers/crypto.js";

// exports.addToCart = async (req, res) => {
//   try {
//     const order_id = crypto.decrypt(req.cookies.order_id || "");
//     const login_status = crypto.decrypt(req.cookies.login_status);
//     const user_id = crypto.decrypt(req.cookies.userId);
//     const enProduct_id = req.params.product_id;
//     const use_product_id = crypto.smallDecrypt(enProduct_id);
//     const seller_id = req.params.seller_id;

//     if (!login_status) return res.redirect("/login");

//     const sellerInfo = await queryAsync(
//       "SELECT * FROM `shop` WHERE `shop`.`id` = ?",
//       [seller_id]
//     );
//     if (sellerInfo.length && sellerInfo[0].seller_user_id === user_id) {
//       return res.send(
//         `<script>alert("You can't buy your own product!"); window.history.go(-1);</script>`
//       );
//     }

//     const today = new Date();
//     const sevenDaysFromToday = new Date(today);
//     sevenDaysFromToday.setDate(today.getDate() + 7);

//     let currentOrderId = order_id;
//     if (!currentOrderId) {
//       await queryAsync(
//         "INSERT INTO `orders` (`order_id`, `user_id`, `order_status`, `seller_id`, `placed_date`, `delivery_date`, `request_review`, `in_cart`, `is_areaShop`, `seller_confirm`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
//         [user_id, 3, seller_id, today, sevenDaysFromToday, 0, 1]
//       );
//       const newOrder = await queryAsync(
//         "SELECT * FROM `orders` WHERE `user_id` = ? ORDER BY `order_id` DESC",
//         [user_id]
//       );
//       currentOrderId = newOrder[0].order_id;
//       res.cookie("order_id", crypto.encrypt(currentOrderId));
//     }

//     const productInfo = await queryAsync(
//       "SELECT * FROM `products` WHERE `product_id` = ?",
//       [use_product_id]
//     );
//     const productExistsInOrder = await queryAsync(
//       "SELECT * FROM `order_details` WHERE `product_id` = ? AND `order_id` = ?",
//       [use_product_id, currentOrderId]
//     );

//     const categoryInfo = await queryAsync(
//       "SELECT * FROM `extra_cat` WHERE `extra_cat_id` = ?",
//       [productInfo[0].product_cat_id]
//     );
//     const percentage =
//       sellerInfo[0].shop_type === 1
//         ? categoryInfo[0].manufacturer_deduct_percentage
//         : categoryInfo[0].retailer_deduct_percentage;

//     if (productExistsInOrder.length === 0) {
//       await queryAsyncWithoutValue(
//         "UPDATE `extra_cat` SET `popular_cat_value` = ? WHERE `extra_cat_id` = ?",
//         [categoryInfo[0].popular_cat_value + 1, categoryInfo[0].extra_cat_id]
//       );

//       await queryAsync(
//         "INSERT INTO `order_details` (`order_id`, `product_id`, `product_quantity`, `product_total_price`, `deduct_price`) VALUES (?, ?, ?, ?, ?)",
//         [
//           currentOrderId,
//           use_product_id,
//           1,
//           productInfo[0].product_price,
//           productInfo[0].product_price * (percentage / 100),
//         ]
//       );
//     } else {
//       const newQuantity = productExistsInOrder[0].product_quantity + 1;
//       const newTotalPrice = newQuantity * productInfo[0].product_price;
//       const newDeductPrice = newTotalPrice * (percentage / 100);

//       await queryAsync(
//         "UPDATE `order_details` SET `product_quantity` = ?, `product_total_price` = ?, `deduct_price` = ? WHERE `order_details_id` = ?",
//         [
//           newQuantity,
//           newTotalPrice,
//           newDeductPrice,
//           productExistsInOrder[0].order_details_id,
//         ]
//       );
//     }

//     return res.redirect(`/shop/${sellerInfo[0].shop_custom_url}`);
//   } catch (err) {
//     console.error(err);
//     return res.status(503).send("Internal Server Error");
//   }
// };

exports.addToCart = async (req, res) => {
  // creating an order
  var order_id = crypto.decrypt(req.cookies.order_id || "");
  var login_status = crypto.decrypt(req.cookies.login_status);
  var user_id = crypto.decrypt(req.cookies.userId);
  var enProduct_id = req.params.product_id;
  var use_product_id = crypto.smallDecrypt(enProduct_id);
  var seller_id = req.params.seller_id;

  // console.log("order_id: ", order_id, "user_id: ", user_id, "product_id: ", product_id, "seller_id: ", seller_id)

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
                                    console.log(
                                      "Extra cat popularity add: ",
                                      res3[0].popular_cat_value + 1
                                    );
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
                                      res.redirect(
                                        "/shop/" + res11[0].shop_custom_url
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
                                        "/shop/" + res11[0].shop_custom_url
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

exports.delCart = (req, res) => {
  var oID = req.params.order_details_id;
  db.query(
    "SELECT * FROM `order_details` WHERE `order_details`.`order_details_id` = ?",
    [oID],
    (err1, res1) => {
      if (!err1) {
        db.query(
          "DELETE FROM order_details WHERE`order_details`.`order_details_id` = ?",
          [oID],
          (err2, res2) => {
            if (!err2) {
              db.query(
                "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ?",
                [res1[0].order_id],
                (err3, res3) => {
                  if (!err3) {
                    if (res3.length > 0) {
                      console.log("Del cart: ", res2);
                      res.redirect("back");
                    } else {
                      db.query(
                        "DELETE FROM `orders` WHERE `orders`.`order_id` = ?",
                        [res1[0].order_id],
                        (err4, res4) => {
                          if (err4) {
                            res.send(err4);
                          }
                          console.log("Del cart With Whole order: ");
                          //  delete the order_id cookies
                          res.clearCookie("order_id", { path: "/" });
                          res.redirect("back");
                        }
                      );
                    }
                  } else {
                    res.send(err3);
                  }
                }
              );
            } else {
              console.log(err2);
              res.send(err2);
            }
          }
        );
      } else {
        res.send(err1);
      }
    }
  );
};

exports.updateCart = (req, res) => {
  var { productId, quantity, price } = req.body;
  db.query(
    "SELECT * FROM `order_details` WHERE `order_details_id` = ?",
    [productId],
    (err1, res1) => {
      if (!err1) {
        var deductPrice =
          quantity * (res1[0].deduct_price / res1[0].product_quantity);
        db.query(
          "UPDATE `order_details` SET `product_quantity` = ?, `product_total_price` = ?, `deduct_price` = ? WHERE `order_details`.`order_details_id` = ?",
          [quantity, price, deductPrice, productId],
          (err2, res2) => {
            if (!err2) {
              db.query(
                "SELECT * FROM `products` INNER JOIN `order_details` ON `order_details`.`product_id` = `products`.`product_id` INNER JOIN `extra_cat` ON `extra_cat`.`extra_cat_id` = `products`.`product_cat_id` WHERE `order_details`.`order_details_id` = ?",
                [productId],
                (err3, res3) => {
                  if (!err3) {
                    db.query(
                      "UPDATE `products` SET `sell_count` = ? WHERE `products`.`product_id` = ?",
                      [res3[0].sell_count + 1, res3[0].product_id],
                      (err4, res4) => {
                        if (!err4) {
                          db.query(
                            "UPDATE `extra_cat` SET `popular_cat_value` = ? WHERE `extra_cat`.`extra_cat_id` = ?",
                            [
                              res3[0].popular_cat_value + 1,
                              res3[0].extra_cat_id,
                            ],
                            (err5, res5) => {
                              if (!err5) {
                                // console.log("order_details: ", productId, quantity, price)
                                res.sendStatus(200);
                              } else {
                                res.send(err5);
                              }
                            }
                          );
                        } else {
                          req.send(err4);
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
};

exports.placeOrder = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    console.log("cookiessss", req.cookies);

    var oID = crypto.decrypt(req.cookies.order_id || "");
    console.log("Order ID: ", oID);
    db.query(
      "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ?",
      [oID],
      (err11, res11) => {
        if (!err11) {
          if (res11.length > 0) {
            let otp = Math.floor(100000 + Math.random() * 900000);
            console.log("OTPP1: ", otp);

            db.query(
              "UPDATE `orders` SET `in_cart` = '0', `request_review` = '1', `seller_confirm` = '0', `otp` = ?  WHERE `orders`.`order_id` = ?",
              [otp, oID],
              (err1, res1) => {
                console.log("Update cart: ", res1);
                if (!err1) {
                  db.query(
                    "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `orders`.`order_id` = ?",
                    [oID],
                    (err2, res2) => {
                      if (!err2) {
                        setNotification(
                          res2[0].seller_user_id,
                          "You have a new order !",
                          `/order_details/${oID}`
                        );
                        res.clearCookie("order_id", { path: "/" });
                        res.redirect("/user_order");
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
            console.log("No products");
            res.redirect("back");
            return;
          }
        } else {
          res.send(err11);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.deliveryAddress = (req, res) => {
  const { address } = req.body;
  var oID = crypto.decrypt(req.cookies.order_id || "");
  console.log("Location:", address);
  db.query(
    "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ?",
    [oID],
    (err11, res11) => {
      if (!err11) {
        if (res11.length > 0) {
          db.query(
            "UPDATE `orders` SET `address` = ? WHERE `orders`.`order_id` = ?",
            [address, oID],
            (err1, res1) => {
              if (!err1) {
                res.sendStatus(200);
              } else {
                res.send(err1);
              }
            }
          );
        } else {
          console.log("No products");
          res.redirect("back");
          return;
        }
      } else {
        res.send(err11);
      }
    }
  );
};

exports.placeOrderArea = (req, res) => {
  var oID = crypto.decrypt(req.cookies.order_id || "");
  if (oID > 0) {
    db.query(
      "UPDATE `orders` SET `in_cart` = '0', `request_review` = '1', `seller_confirm` = '0', `is_areaShop` = '1' WHERE `orders`.`order_id` = ?",
      [oID],
      (err1, res1) => {
        if (!err1) {
          res.clearCookie("order_id", { path: "/" });
          res.redirect("back");
        } else {
          res.send(err1);
        }
      }
    );
  } else {
    res.redirect("/user_dashboard");
  }
};

exports.cancelOrder = (req, res) => {
  var oID = crypto.decrypt(req.cookies.order_id || "");
  db.query(
    "DELETE FROM `orders` WHERE `orders`.`order_id` = ?",
    [oID],
    (err1, res1) => {
      if (!err1) {
        db.query(
          "DELETE FROM `order_details` WHERE `order_details`.`order_id` = ?",
          [oID],
          (err2, res2) => {
            if (!err2) {
              res.clearCookie("order_id", { path: "/" });
              res.redirect("/");
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
};
