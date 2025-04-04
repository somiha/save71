const db = require("../../config/database.config");
const catModel = require("../../middlewares/cat");
const crypto = require("../../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../../config/helper");

// exports.order = async (req, res) => {
//   var login_status = crypto.decrypt(req.cookies.login_status || "");
//   if (login_status) {
//     try {
//       const userId = crypto.decrypt(req.cookies.userId);
//       const currencyCode = crypto.decrypt(req.cookies.currencyCode);
//       const [images, currRate, notification] = await Promise.all([
//         catModel.fetchFeaturedImages(),
//         catModel.fetchCurrencyRate(currencyCode),
//         catModel.fetchAllNotifications(userId),
//       ]);
//       var user_id = crypto.decrypt(req.cookies.userId);
//       var oQuery =
//         "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` WHERE `orders`.`user_id` = ?";
//       var query =
//         "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?  ORDER BY `orders`.`placed_date` DESC";
//       db.query(query, [user_id], (err1, res1) => {
//         if (!err1) {
//           db.query(oQuery, [user_id], (err2, res2) => {
//             if (!err2) {
//               db.query(
//                 "SELECT * FROM `product_image` WHERE `product_image`.`featured_image` = 1",
//                 (err3, res3) => {
//                   if (!err3) {
//                     var total_price = [];
//                     var deliveryChargesAdded = {};
//                     res1.forEach((orderDetails) => {
//                       if (isNaN(total_price[orderDetails.order_id])) {
//                         total_price[orderDetails.order_id] = 0;
//                       }
//                       if (
//                         orderDetails.product_quantity >= 0 &&
//                         orderDetails.stock_out == 0
//                       ) {
//                         total_price[orderDetails.order_id] +=
//                           orderDetails.product_total_price;
//                         if (!deliveryChargesAdded[orderDetails.order_id]) {
//                           total_price[orderDetails.order_id] +=
//                             orderDetails.deliveryCharge;
//                           deliveryChargesAdded[orderDetails.order_id] = true;
//                         }
//                       }
//                       // console.log(total_price[orderDetails.order_id])
//                     });

//                     var images = res3.map((image) => {
//                       image.product_id = crypto.smallEncrypt(image.product_id);
//                       return image;
//                     });

//                     var orderDetails = res1.map((orderDetail) => {
//                       orderDetail.product_id = crypto.smallEncrypt(
//                         orderDetail.product_id
//                       );
//                       return orderDetail;
//                     });

//                     console.log("Order Details: ", orderDetails);
//                     console.log("order: ", res2);
//                     const filteredOrders = res2.filter((order) => {
//                       return orderDetails.some(
//                         (detail) => detail.order_id === order.order_id
//                       );
//                     });
//                     res.render("./user-dashboard/order", {
//                       ogImage: "https://admin.saveneed.com/images/logo-og.webp",
//                       ogTitle:
//                         "Save71 Connects You and the World through Business.",
//                       ogUrl: "https://admin-save71.lens-ecom.store",
//                       orderDetails: orderDetails,
//                       currRate,
//                       total_price,
//                       currencyCode,
//                       order: filteredOrders,
//                       image: images,
//                       menuId: "shop-owner-purchases",
//                       name: "Purchases",
//                       notification: notification,
//                     });
//                   } else {
//                     res.send(err3);
//                   }
//                 }
//               );
//             } else {
//               res.send(err2);
//             }
//           });
//         } else {
//           res.send(err1);
//         }
//       });
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Internal Server Error");
//     }
//   } else {
//     res.redirect("/login");
//   }
// };

exports.order = async (req, res) => {
  try {
    var login_status = crypto.decrypt(req.cookies.login_status || "");
    if (!login_status) {
      return res.redirect("/login");
    }

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);

    const [featuredImages, currRate, notification] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllNotifications(userId),
    ]);

    // Queries
    const ordersQuery = `
      SELECT * FROM orders 
      INNER JOIN shop ON shop.id = orders.seller_id 
      WHERE orders.user_id = ?
    `;
    const orderDetailsQuery = `
      SELECT * FROM orders 
      INNER JOIN order_details ON orders.order_id = order_details.order_id 
      INNER JOIN products ON products.product_id = order_details.product_id 
      WHERE orders.user_id = ?  
      ORDER BY orders.placed_date DESC
    `;
    const productImagesQuery = `
      SELECT * FROM product_image 
      WHERE product_image.featured_image = 1
    `;

    // Fetch data using queryAsync
    const orderDetails = await queryAsync(orderDetailsQuery, [userId]);
    const orders = await queryAsync(ordersQuery, [userId]);
    const productImages = await queryAsync(productImagesQuery);

    const seller_id = orders.map((order) => order.seller_id);

    console.log(seller_id);

    let notes = [];

    if (seller_id.length > 0) {
      const notesQuery = `
  SELECT * FROM cancel_note 
  WHERE user_id = ? 
  OR seller_id IN (?)
`;
      notes = await queryAsync(notesQuery, [userId, seller_id]);
    }

    console.log("notes", notes);

    // Calculate total price for each order
    const total_price = [];
    const deliveryChargesAdded = {};
    orderDetails.forEach((orderDetails) => {
      if (isNaN(total_price[orderDetails.order_id])) {
        total_price[orderDetails.order_id] = 0;
      }
      if (orderDetails.product_quantity >= 0 && orderDetails.stock_out == 0) {
        total_price[orderDetails.order_id] += orderDetails.product_total_price;
        if (!deliveryChargesAdded[orderDetails.order_id]) {
          total_price[orderDetails.order_id] += orderDetails.deliveryCharge;
          deliveryChargesAdded[orderDetails.order_id] = true;
        }
      }
    });

    // Encrypt product IDs in images and order details
    const encryptedImages = productImages.map((image) => {
      image.product_id = crypto.smallEncrypt(image.product_id);
      return image;
    });

    const encryptedOrderDetails = orderDetails.map((orderDetail) => {
      orderDetail.product_id = crypto.smallEncrypt(orderDetail.product_id);
      return orderDetail;
    });

    // Filter orders to include only those with matching order details
    const filteredOrders = orders.filter((order) =>
      encryptedOrderDetails.some((detail) => detail.order_id === order.order_id)
    );

    const orderNotes = {};
    notes.forEach((note) => {
      if (!orderNotes[note.order_id]) {
        orderNotes[note.order_id] = note;
      }
    });

    // Render the order page with fetched data
    return res.render("./user-dashboard/order", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      orderDetails: encryptedOrderDetails,
      currRate,
      total_price,
      currencyCode,
      order: filteredOrders,
      image: encryptedImages,
      menuId: "shop-owner-purchases",
      name: "Purchases",
      notification: notification,
      seller_id,
      userId,
      orderNotes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);

    var order_id = req.params.order_id;
    var userId = crypto.decrypt(req.cookies.userId);
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    db.query(
      "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ? AND `order_details`.`stock_out` = 1",
      [order_id],
      (err1, res1) => {
        if (!err1) {
          if (res1.length > 0) {
            db.query(
              "DELETE FROM `order_details` WHERE `order_details`.`order_id` = ? AND `order_details`.`stock_out` = 1",
              [order_id],
              (err2, res2) => {
                if (err2) {
                  res.send(err2);
                } else {
                  console.log("Deleted stock out products");
                }
              }
            );
          }

          // payment gateway will confirm here.

          db.query(
            "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
            [seller_id],
            (errShop, resShop) => {
              if (!errShop) {
                db.query(
                  "SELECT SUM(product_total_price) as `total_price`, `deliveryCharge`  FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_id` = ?",
                  [order_id],
                  (errOrder, resOrder) => {
                    if (!errOrder) {
                      // if ((resOrder[0].deliveryCharge + resOrder[0].total_price) <= resShop[0].own_balance) {

                      //   //  Own balance buy

                      //   const remBalance = resShop[0].own_balance - (resOrder[0].deliveryCharge + resOrder[0].total_price)
                      //   console.log("Remaining balance : ", remBalance)

                      //   db.query("UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?", [remBalance, seller_id], (errUpdateBal, resUpdateBal) => {
                      //     if (!errUpdateBal) {
                      //       db.query(
                      //         "UPDATE `orders` SET `order_status` = '3', `request_review` = '0', `is_paid` = '1' WHERE `orders`.`order_id` = ?",
                      //         [order_id],
                      //         (err3, res3) => {
                      //           if (!err3) {

                      //             db.query("SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `orders`.`order_id` = ?",
                      //               [order_id], (err4, res4) => {
                      //                 if (!err4) {
                      //                   setNotification(res4[0].seller_user_id, `Order ${order_id} has been Accepted and Paid by the Buyer. Please check your order details.`, `/order_details/${order_id}`)

                      //                   // adding received money history in sellers account
                      //                   db.query("INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`, `sent_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, NULL, '0')",
                      //                     [
                      //                       res4[0].seller_id,
                      //                       (resOrder[0].deliveryCharge + resOrder[0].total_price),
                      //                       1,    // 3 means order accept money
                      //                       new Date(),
                      //                       order_id,
                      //                     ], (err5, res5) => {
                      //                       if (!err5) {

                      //                         // adding sent money history in buyers account
                      //                         db.query("INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`, `sent_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, NULL, ?)",
                      //                           [
                      //                             seller_id,
                      //                             (resOrder[0].deliveryCharge + resOrder[0].total_price),
                      //                             4,    // 4 means sent money to shop
                      //                             new Date(),
                      //                             order_id,
                      //                             res4[0].seller_user_id,
                      //                           ], (err6, res6) => {
                      //                             if (!err6) {

                      //                               // Updating seller balance
                      //                               db.query("SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?", [res4[0].seller_id], (err7, res7) => {
                      //                                 if (!err7) {
                      //                                   const newBalance = res7[0].own_balance + (resOrder[0].deliveryCharge + resOrder[0].total_price)
                      //                                   console.log("New balance : ", newBalance)

                      //                                   db.query("UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?", [newBalance, res4[0].seller_id], (err8, res8) => {
                      //                                     if (!err8) {
                      //                                       res.redirect("back");
                      //                                     } else {
                      //                                       console.error(err8)
                      //                                       res.send(err8)
                      //                                     }
                      //                                   })
                      //                                 } else {
                      //                                   console.error(err7)
                      //                                   res.send(err7)
                      //                                 }
                      //                               })
                      //                               // Updating seller balance END

                      //                             } else {
                      //                               console.error(err6)
                      //                               res.send(err6)
                      //                             }
                      //                           })
                      //                         // adding sent money history in buyers account END

                      //                       } else {
                      //                         console.error(err5)
                      //                         res.send(err5)
                      //                       }
                      //                     })
                      //                   // adding received money history in sellers account END
                      //                 } else {
                      //                   console.error(err4)
                      //                   res.send(err4)
                      //                 }
                      //               })

                      //           } else {
                      //             console.error(err3)
                      //             res.send(err3);
                      //           }
                      //         }
                      //       );
                      //     } else {
                      //       console.error(errUpdateBal)
                      //       res.send(errUpdateBal)
                      //     }
                      //   })

                      // } else {

                      // Online SSL payment section or COD
                      // if paid, then set the value is_paid to 1 for COD is_paid = 2
                      db.query(
                        "UPDATE `orders` SET `order_status` = '3', `request_review` = '0', `is_paid` = '2' WHERE `orders`.`order_id` = ?",
                        [order_id],
                        (err3, res3) => {
                          if (!err3) {
                            db.query(
                              "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `orders`.`order_id` = ?",
                              [order_id],
                              (err4, res4) => {
                                if (!err4) {
                                  // set notification(user_id, message, link)
                                  setNotification(
                                    res4[0].seller_user_id,
                                    `Order ${order_id} has been Accepted by the Buyer. Cash On Delivery (COD) for this order.`,
                                    `/order_details/${order_id}`
                                  );
                                  res.redirect("back");
                                } else {
                                  console.error(err4);
                                  res.send(err4);
                                }
                              }
                            );
                          } else {
                            console.error(err3);
                            res.send(err3);
                          }
                        }
                      );
                      // }
                    } else {
                      console.error(errOrder);
                      res.send(errOrder);
                    }
                  }
                );
              } else {
                console.error(errShop);
                res.send(errShop);
              }
            }
          );
        } else {
          console.error(err1);
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.delOrder = (req, res) => {
  var order_id = req.params.order_id;
  db.query(
    "DELETE FROM `orders` WHERE `orders`.`order_id` = ?",
    [order_id],
    (err1, res1) => {
      if (!err1) {
        db.query(
          "DELETE FROM `order_details` WHERE `order_details`.`order_id` = ?",
          [order_id],
          (err2, res2) => {
            if (!err2) {
              res.redirect("back");
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

exports.returnOrder = (req, res) => {
  const { order_id } = req.params;
  const { reason } = req.body;
  console.log(reason, " | ", order_id);
  db.query(
    "UPDATE `orders` SET `order_status` = ?, `return_reason` = ? WHERE `orders`.`order_id` = ?",
    [5, reason, order_id],
    (err1, res1) => {
      if (!err1) {
        res.redirect("/user_order");
      } else {
        console.error(err1);
        res.status(500).send("An error occurred while updating Return Order !");
      }
    }
  );
};
