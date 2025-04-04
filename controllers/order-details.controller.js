const { query } = require("express");
const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

exports.orderDetails = async (req, res) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }

    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    console.log("Seller ID : ", seller_id);

    const shopBalance = await queryAsync(
      "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
      [seller_id]
    );

    if (shopBalance[0].due_payment >= 1) {
      return res.redirect("/balance?isDuePending=true");
    }

    const [images, currRate, users] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllUserInfo(),
    ]);

    var oID = req.params.id;

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`order_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [oID]);

    const ordersQuery = "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?";
    const orders = await queryAsync(ordersQuery, [oID]);

    console.log(order_details);

    if (orders[0].seller_id != seller_id && orders[0].userId != userId) {
      return res
        .status(404)
        .send(
          '<script>alert("UnAuthorized !"); window.history.go(-1);</script>'
        );
    }

    const shopQuery = "SELECT * FROM `shop` WHERE `shop`.`id` = ?";
    const shop = await queryAsync(shopQuery, [seller_id]);

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    const toBeShippedordersQuery =
      "SELECT * FROM orders where order_status = 3 && request_review = 0 && is_paid != 0 && seller_id  = ? order by order_id ASC";
    const toBeShippedorders = await queryAsync(toBeShippedordersQuery, [
      seller_id,
    ]);

    // if current order is in toBeShippedorders find it's position
    let position = -1;
    if (toBeShippedorders.length > 0) {
      for (let i = 0; i < toBeShippedorders.length; i++) {
        if (toBeShippedorders[i].order_id == oID) {
          position = i;
          break;
        }
      }
    }

    let canShip = true;

    console.log("CanShip: ", canShip);

    if (position != -1 && position > 99) {
      canShip = false;
    }

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }

    var matchingUser = users.find((user) => user.user_id === orders[0].user_id);
    const notes = await queryAsync(
      "SELECT * FROM `notes` WHERE `order_id` = ?",
      [oID]
    );
    console.log({ notes });
    return res.render("order-details", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      currRate,
      currencyCode,
      menuId: "shop-owner-orders",
      order_details: order_details,
      image: images,
      order: orders[0],
      seller_details: shop[0],
      matchingUser,
      canShip,
      notes,
      userId,
      seller_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.order_status_complete_v2 = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    var oID = req.params.id;
    var status = req.params.status;
    var ref_shop_id = req.params.ref_shop_id;
    console.log({ ref_shop_id });
    var buyerUserId = crypto.decrypt(req.cookies.userId);
    var seller_id = req.params.seller_id;
    var payment_method = req.query.payment_method;

    const order = await queryAsync(
      "SELECT * FROM `orders` WHERE `order_id` = ?",
      [oID]
    );
    const orderDetails = await queryAsync(
      "SELECT SUM(product_total_price) as `total_price`, SUM(deduct_price) as total_deduct_price FROM `order_details` WHERE `order_details`.`order_id` = ?",
      [oID]
    );

    console.log({ orderDetails });

    const referer_shop = await queryAsync(
      "SELECT * FROM `shop` WHERE `id` = ?",
      [ref_shop_id]
    );

    console.log({ referer_shop });

    const totalPrice =
      Number(orderDetails[0].total_price.toFixed(8)) +
      Number(order[0].deliveryCharge.toFixed(8));

    console.log("totalPrice: ", totalPrice);

    const deduct_price = orderDetails[0].total_deduct_price.toFixed(8);

    const customerShop = await queryAsync(
      "SELECT * FROM `shop` WHERE `seller_user_id` = ?",
      [buyerUserId]
    );

    console.log({ customerShop });
    const sellerShop = await queryAsync("SELECT * FROM `shop` WHERE `id` = ?", [
      seller_id,
    ]);

    console.log({ sellerShop });
    const customerShopBalance = await queryAsync(
      "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
      [customerShop[0].id]
    );

    console.log({ customerShopBalance });
    const sellerShopBalance = await queryAsync(
      "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
      [sellerShop[0].id]
    );

    console.log({ sellerShopBalance });

    const refferShopBalance = await queryAsync(
      "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
      [referer_shop[0].id]
    );

    console.log({ refferShopBalance });

    if (payment_method == "fund_transfer") {
      if (customerShopBalance[0].own_balance < totalPrice) {
        return res.status(400).send({
          status: false,
          message: "Customer balance is not enough to transfer the amount.",
          data: null,
        });
      } else {
        let value10 =
          Number(customerShopBalance[0].own_balance) - Number(totalPrice);
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value10, customerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`) VALUES (NULL, ?, ?, ?)",
          [customerShop[0].id, sellerShop[0].id, totalPrice]
        );

        let value =
          Number(sellerShopBalance[0].own_balance) +
          Number(totalPrice) -
          Number(deduct_price) -
          Number(order[0].deliveryCharge);
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value, sellerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '1')",
          [
            seller_id,
            oID,
            deduct_price,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            ref_shop_id,
          ]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [sellerShop[0].id, ref_shop_id, deduct_price / 2, customerShop[0].id]
        );

        let value2 =
          Number(refferShopBalance[0].own_balance) + Number(deduct_price / 2);
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value2, referer_shop[0].id]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [sellerShop[0].id, 0, deduct_price / 2, customerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `company_comission` (`id`, `shop_id`, `customer_id`, `comission_amount`, `order_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?) ",
          [sellerShop[0].id, customerShop[0].id, deduct_price / 2, oID, 1]
        );

        const admin_balance = await queryAsyncWithoutValue(
          "SELECT * FROM `admin_balance` WHERE `admin_id` = 1"
        );

        await queryAsync(
          "UPDATE `admin_balance` SET `admin_balance` = ? WHERE `admin_id` = 1",
          [admin_balance[0].admin_balance + deduct_price / 2]
        );

        await queryAsync(
          "UPDATE `orders` SET `order_status` = ?, `request_review` = '0', `complete_date` = ? WHERE `orders`.`order_id` = ?",
          [
            status,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            oID,
          ]
        );
      }
    } else if (payment_method == "cash_pay") {
      if (sellerShopBalance[0].own_balance < deduct_price) {
        let due_amount =
          Number(sellerShopBalance[0].due_payment) + Number(deduct_price);
        await queryAsync(
          "UPDATE `shop_balance` SET `due_payment` = ? WHERE `shop_id` = ?",
          [due_amount, sellerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '0')",
          [
            seller_id,
            oID,
            deduct_price,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            ref_shop_id,
          ]
        );

        await queryAsync(
          "UPDATE `shop_balance` SET `due_payment` = ? WHERE `shop_id` = ?",
          [
            Number(sellerShopBalance[0].due_payment) + Number(deduct_price),
            sellerShop[0].id,
          ]
        );

        await queryAsync(
          "UPDATE `orders` SET `order_status` = ?, `request_review` = '0', `complete_date` = ? WHERE `orders`.`order_id` = ?",
          [
            status,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            oID,
          ]
        );
      } else {
        let value3 = Number(sellerShopBalance[0].own_balance) - deduct_price;
        console.log({ value3 });
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value3, sellerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '1')",
          [
            seller_id,
            oID,
            deduct_price,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            ref_shop_id,
          ]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [sellerShop[0].id, ref_shop_id, deduct_price / 2, customerShop[0].id]
        );

        let value4 =
          Number(refferShopBalance[0].own_balance) + deduct_price / 2;
        console.log({ value4 });
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value4, referer_shop[0].id]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [sellerShop[0].id, 0, deduct_price / 2, customerShop[0].id]
        );

        await queryAsync(
          "INSERT INTO `company_comission` (`id`, `shop_id`, `customer_id`, `comission_amount`, `order_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?) ",
          [sellerShop[0].id, customerShop[0].id, deduct_price / 2, oID, 1]
        );

        const admin_balance = await queryAsyncWithoutValue(
          "SELECT * FROM `admin_balance` WHERE `admin_id` = 1"
        );

        await queryAsync(
          "UPDATE `admin_balance` SET `admin_balance` = ? WHERE `admin_id` = 1",
          [admin_balance[0].admin_balance + deduct_price / 2]
        );

        await queryAsync(
          "UPDATE `orders` SET `order_status` = ?, `request_review` = '0', `complete_date` = ? WHERE `orders`.`order_id` = ?",
          [
            status,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            oID,
          ]
        );
      }
    } else {
      console.log("No payment method found");
    }

    return res.redirect(req.get("Referrer") || "/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.order_status_complete = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    var oID = req.params.id;
    var status = req.params.status;
    var ref_shop_id = req.params.ref_shop_id;
    var buyerUserId = crypto.decrypt(req.cookies.userId);
    var seller_id = req.params.seller_id;

    db.query(
      "SELECT * FROM `orders` WHERE `order_id` = ?",
      [oID],
      (err37, res37) => {
        if (err37) {
          console.error(err37);
          res
            .status(500)
            .send("An error occurred while fetching the order details.");
          return;
        }

        // Prepare query for updating order status and complete_date if status = 1
        let updateOrderQuery = "";
        let updateParams = [];

        if (status == 1) {
          updateOrderQuery =
            "UPDATE `orders` SET `order_status` = ?, `request_review` = '0', `complete_date` = ? WHERE `orders`.`order_id` = ?";
          updateParams = [
            status,
            new Date().toISOString().replace("T", " ").substring(0, 19),
            oID,
          ];
        } else {
          updateOrderQuery =
            "UPDATE `orders` SET `order_status` = ?, `request_review` = '0' WHERE `orders`.`order_id` = ?";
          updateParams = [status, oID];
        }

        db.query(updateOrderQuery, updateParams, (err1, res1) => {
          if (err1) {
            console.error(err1);
            res
              .status(500)
              .send("An error occurred while updating the order status.");
            return;
          }

          const statusArray = [
            "Confirmed",
            "Rejected",
            "New Order",
            "Shipped",
            "Return Order",
            "Pending",
          ];

          setNotification(
            res37[0].user_id,
            `Your order status is changed to ${
              statusArray[status - 1]
            } for order ${oID} By seller.`,
            `/user_order`
          );

          // Calculate total price and deduct price if status is 1
          if (status == 1) {
            db.query(
              "SELECT SUM(product_total_price) as `total_price`, SUM(deduct_price) as total_deduct_price FROM `order_details` WHERE `order_details`.`order_id` = ?",
              [oID],
              async (err2, res2) => {
                if (err2) {
                  console.error(err2);
                  res
                    .status(500)
                    .send(
                      "An error occurred while calculating the total price and deduct price."
                    );
                  return;
                }

                const currentDate = new Date();
                const dueTime = 1; // 1 day
                currentDate.setDate(currentDate.getDate() + dueTime);
                const dueDate = currentDate
                  .toISOString()
                  .replace("T", " ")
                  .substring(0, 19);

                // Add to `shop_due_details`
                // db.query(
                //   "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '0')",
                //   [
                //     seller_id,
                //     oID,
                //     res2[0].total_deduct_price,
                //     dueDate,
                //     ref_shop_id,
                //   ],
                //   (err3, res3) => {
                //     if (!err3) {
                //       console.log("Due added !");
                //     } else {
                //       console.error(err3);
                //       res
                //         .status(500)
                //         .send(
                //           "An error occurred while Inserting shop_due_details."
                //         );
                //       return;
                //     }
                //   }
                // );

                await queryAsync(
                  "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '0')",
                  [
                    seller_id,
                    oID,
                    res2[0].total_deduct_price,
                    dueDate,
                    ref_shop_id,
                  ]
                );

                // Add seller money
                const resSeller = await queryAsync(
                  "SELECT * FROM `shop` WHERE `id` = ?",
                  [seller_id]
                );

                console.log("resSeller: ", resSeller);

                const res3 = await queryAsync(
                  "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                  [seller_id]
                );

                console.log("res3: ", res3);
                const resOrder = await queryAsync(
                  "SELECT SUM(product_total_price) as `total_price`, `deliveryCharge`  FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_id` = ?",
                  [oID]
                );

                console.log("resOrder: ", resOrder);

                const resUser = await queryAsync(
                  "SELECT * FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id` INNER JOIN `shop_balance` ON `shop_balance`.`shop_id` = `shop`.`id`  WHERE `user_id` = ?",
                  [buyerUserId]
                );

                console.log("resUser: ", resUser);

                const payableAmount =
                  resOrder[0].total_price + resOrder[0].deliveryCharge;
                console.log("Payable amount: ", payableAmount);
                if (resUser[0].own_balance >= payableAmount) {
                  let value5 =
                    Number(resUser[0].own_balance) + Number(payableAmount);
                  const res4 = await queryAsync(
                    "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                    [value5, resUser[0].shop_id]
                  );

                  console.log("res4: ", res4);

                  const res6 = await queryAsync(
                    "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                    [seller_id]
                  );

                  console.log("res6: ", res6);
                  let value7 =
                    Number(res6[0].own_balance) - Number(payableAmount);
                  console.log("value7: ", value7);
                  const res7 = await queryAsync(
                    "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                    [value7, seller_id]
                  );

                  console.log("res7: ", res7);

                  console.log("Seller balance updated");
                  res.redirect("back");
                } else {
                  console.log("Not enough balance");
                  res.redirect("back");
                }

                // db.query(
                //   "SELECT * FROM `shop` WHERE `id` = ?",
                //   [seller_id],
                //   (errSeller, resSeller) => {
                //     if (!errSeller) {
                //       db.query(
                //         "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                //         [seller_id],
                //         (err3, res3) => {
                //           if (err3) {
                //             console.error(err3);
                //             res
                //               .status(500)
                //               .send(
                //                 "An error occurred while fetching seller balance."
                //               );
                //             return;
                //           }

                //           db.query(
                //             "SELECT SUM(product_total_price) as `total_price`, `deliveryCharge`  FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_id` = ?",
                //             [oID],
                //             (errOrder, resOrder) => {
                //               if (errOrder) {
                //                 console.error(errOrder);
                //                 res
                //                   .status(500)
                //                   .send(
                //                     "An error occurred while fetching order details."
                //                   );
                //                 return;
                //               }

                //               db.query(
                //                 "SELECT * FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id` INNER JOIN `shop_balance` ON `shop_balance`.`shop_id` = `shop`.`id`  WHERE `user_id` = ?",
                //                 [buyerUserId],
                //                 (errUser, resUser) => {
                //                   if (errUser) {
                //                     console.error(errUser);
                //                     res
                //                       .status(500)
                //                       .send(
                //                         "An error occurred while fetching user details."
                //                       );
                //                     return;
                //                   }

                //                   const payableAmount =
                //                     resOrder[0].total_price +
                //                     resOrder[0].deliveryCharge;

                //                   if (resUser[0].own_balance >= payableAmount) {
                //                     db.query(
                //                       "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                //                       [
                //                         resUser[0].own_balance - payableAmount,
                //                         resUser[0].shop_id,
                //                       ],
                //                       (err4, res4) => {
                //                         if (err4) {
                //                           console.error(err4);
                //                           res
                //                             .status(500)
                //                             .send(
                //                               "An error occurred while updating seller balance."
                //                             );
                //                           return;
                //                         }

                //                         console.log("Seller balance updated");
                //                         db.query(
                //                           "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                //                           [seller_id],
                //                           (err6, res6) => {
                //                             if (err6) {
                //                               console.error(err6);
                //                               res
                //                                 .status(500)
                //                                 .send(
                //                                   "An error occurred while fetching seller balance."
                //                                 );
                //                               return;
                //                             }

                //                             db.query(
                //                               "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                //                               [
                //                                 res6[0].own_balance +
                //                                   payableAmount,
                //                                 seller_id,
                //                               ],
                //                               (err7, res7) => {
                //                                 if (err7) {
                //                                   console.error(err7);
                //                                   res
                //                                     .status(500)
                //                                     .send(
                //                                       "An error occurred while updating seller balance."
                //                                     );
                //                                   return;
                //                                 }
                //                                 console.log(
                //                                   "Seller balance updated"
                //                                 );
                //                                 res.redirect("back");
                //                               }
                //                             );
                //                           }
                //                         );
                //                       }
                //                     );
                //                   }
                //                 }
                //               );
                //             }
                //           );
                //         }
                //       );
                //     } else {
                //       console.error(errSeller);
                //       res
                //         .status(500)
                //         .send(
                //           "An error occurred while fetching seller shop details."
                //         );
                //       return;
                //     }
                //   }
                // );
              }
            );
          } else if (status == 3) {
            db.query(
              "UPDATE `orders` SET `seller_confirm` = '1', `request_review` = '1' WHERE `orders`.`order_id` = ?",
              [oID],
              (err2, res2) => {
                if (err2) {
                  console.error(err2);
                  res
                    .status(500)
                    .send(
                      "An error occurred while updating seller confirmation and review status."
                    );
                  return;
                } else {
                  console.log("Seller sent review for order : ", oID);
                  res.redirect("back");
                }
              }
            );
          } else {
            res.redirect("back");
          }
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.delivery_charge = async (req, res) => {
  try {
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    var oID = req.params.oID;
    const { deliveryCharge } = req.body;
    // console.log(deliveryCharge / currRate)
    db.query(
      "UPDATE `orders` SET `deliveryCharge` = ? WHERE `orders`.`order_id` = ?",
      [deliveryCharge / currRate, oID],
      (err1, res1) => {
        if (!err1) {
          res.redirect("back");
        } else {
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};

// exports.order_status = (req, res) => {
//   var oID = req.params.id;
//   var status = req.params.status;
//   let otp = req.query.otp;

//   console.log("Order ID : ", oID, "Status : ", status, "OTP : ", otp);

//   var buyerUserId = crypto.decrypt(req.cookies.userId);

//   db.query(
//     "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?",
//     [oID],
//     (err11, res11) => {
//       if (!err11 && res11.length > 0 && status == 1 && res11[0].otp != otp) {
//         return res.status(400).send("Invalid OTP");
//       }
//       if (!err11) {
//         // fetching seller details
//         db.query(
//           "SELECT * FROM `shop` WHERE `id` = ?",
//           [res11[0].seller_id],
//           (err22, res22) => {
//             if (!err22) {
//               // fetching seller's ref user details
//               db.query(
//                 "SELECT * FROM `user` WHERE `user`.`user_id` = ?",
//                 [res22[0].seller_user_id],
//                 (err1, res1) => {
//                   // fetch seller user details then fetch if seller has ref user
//                   if (!err1 && res1.length > 0) {
//                     db.query(
//                       "SELECT * FROM `user` WHERE `user`.`own_ref_id` = ?",
//                       [res1[0].reference_id],
//                       (err2, res2) => {
//                         // fetch reference user details
//                         if (!err2 && res2.length > 0) {
//                           // selecting reference user's seller id
//                           db.query(
//                             "SELECT * FROM `shop` WHERE `shop`.`seller_user_id` = ?",
//                             [res2[0].user_id],
//                             (err3, res3) => {
//                               if (!err3 && res3.length > 0) {
//                                 // if reference seller user ID exists
//                                 res.redirect(
//                                   // /order_details/order_id/status/ref_shop_id/main_seller_id

//                                   "/order_details/" +
//                                     oID +
//                                     "/" +
//                                     status +
//                                     "/" +
//                                     res3[0].id +
//                                     "/" +
//                                     res11[0].seller_id
//                                 );
//                               } else {
//                                 res.send(err3);
//                               }
//                             }
//                           );
//                           // selecting reference user's seller id end
//                         } else {
//                           res.send(err2);
//                         }
//                         // fetch reference user details end
//                       }
//                     );
//                   } else {
//                     res.send(err1);
//                   }
//                   // fetch seller user details then fetch if seller has ref user end
//                 }
//               );
//               // fetching seller's ref user details end
//             } else {
//               res.send(err22);
//             }
//           }
//         );
//         // fetching seller details end
//       } else {
//         res.send(err11);
//       }
//     }
//   );
// };

// exports.order_status_complete = async (req, res) => {
//   try {
//     const [setNotification] = await Promise.all([catModel.setNotification]);
//     var oID = req.params.id;
//     var status = req.params.status;
//     var ref_shop_id = req.params.ref_shop_id;
//     var buyerUserId = crypto.decrypt(req.cookies.userId);
//     var seller_id = req.params.seller_id;
//     // console.log("Status : ", status);

//     db.query(
//       "SELECT * FROM `orders` WHERE `order_id` = ?",
//       [oID],
//       (err37, res37) => {
//         if (err37) {
//           console.error(err37);
//           res
//             .status(500)
//             .send("An error occurred while fetching the order details.");
//           return;
//         }

//         db.query(
//           "UPDATE `orders` SET `order_status` = ?, `request_review` = '0' WHERE `orders`.`order_id` = ?",
//           [status, oID],
//           (err1, res1) => {
//             if (err1) {
//               console.error(err1);
//               res
//                 .status(500)
//                 .send("An error occurred while updating the order status.");
//               return;
//             }

//             const statusArray = [
//               "Confirmed",
//               "Rejected",
//               "New Order",
//               "Shipped",
//               "Return Order",
//               "Pending",
//             ];

//             setNotification(
//               res37[0].user_id,
//               `Your order status is changed to ${
//                 statusArray[status - 1]
//               } for order ${oID} By seller.`,
//               `/user_order`
//             );

//             // console.log("Res", res37);

//             // calculate total price and deduct price
//             if (status == 1) {
//               db.query(
//                 "SELECT SUM(product_total_price) as `total_price`, SUM(deduct_price) as total_deduct_price FROM `order_details` WHERE `order_details`.`order_id` = ?",
//                 [oID],
//                 (err2, res2) => {
//                   if (err2) {
//                     console.error(err2);
//                     res
//                       .status(500)
//                       .send(
//                         "An error occurred while calculating the total price and deduct price."
//                       );
//                     return;
//                   }

//                   // Adding Due history in "shop_due_details" table
//                   const currentDate = new Date();
//                   const dueTime = 1; // 1 day
//                   currentDate.setDate(currentDate.getDate() + dueTime);
//                   const dueDate = currentDate
//                     .toISOString()
//                     .replace("T", " ")
//                     .substring(0, 19);

//                   db.query(
//                     "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '0')",
//                     [
//                       seller_id,
//                       oID,
//                       res2[0].total_deduct_price,
//                       dueDate,
//                       ref_shop_id,
//                     ],
//                     (err3, res3) => {
//                       if (!err3) {
//                         console.log("Due added !");
//                       } else {
//                         console.error(err3);
//                         res
//                           .status(500)
//                           .send(
//                             "An error occurred while Inserting shop_due_details."
//                           );
//                         return;
//                       }
//                     }
//                   );

//                   // seller money add
//                   db.query(
//                     "SELECT * FROM `shop` WHERE `id` = ?",
//                     [seller_id],
//                     (errSeller, resSeller) => {
//                       if (!errSeller) {
//                         // fetch seller balance
//                         db.query(
//                           "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
//                           [seller_id],
//                           (err3, res3) => {
//                             if (err3) {
//                               console.error(err3);
//                               res
//                                 .status(500)
//                                 .send(
//                                   "An error occurred while fetching seller balance."
//                                 );
//                               return;
//                             }

//                             // adding money to seller from buyer
//                             db.query(
//                               "SELECT SUM(product_total_price) as `total_price`, `deliveryCharge`  FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_id` = ?",
//                               [oID],
//                               (errOrder, resOrder) => {
//                                 if (errOrder) {
//                                   console.error(errOrder);
//                                   res
//                                     .status(500)
//                                     .send(
//                                       "An error occurred while fetching order details."
//                                     );
//                                   return;
//                                 }
//                                 // fetch buyer user details
//                                 db.query(
//                                   "SELECT * FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id` INNER JOIN `shop_balance` ON `shop_balance`.`shop_id` = `shop`.`id`  WHERE `user_id` = ?",
//                                   [buyerUserId],
//                                   (errUser, resUser) => {
//                                     if (errUser) {
//                                       console.error(errUser);
//                                       res
//                                         .status(500)
//                                         .send(
//                                           "An error occurred while fetching user details."
//                                         );
//                                       return;
//                                     }

//                                     const payableAmount =
//                                       resOrder[0].total_price +
//                                       resOrder[0].deliveryCharge;

//                                     // if user can pay
//                                     if (
//                                       resUser[0].own_balance >= payableAmount
//                                     ) {
//                                       // update user balance
//                                       db.query(
//                                         "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
//                                         [
//                                           resUser[0].own_balance -
//                                             payableAmount,
//                                           resUser[0].shop_id,
//                                         ],
//                                         (err4, res4) => {
//                                           if (err4) {
//                                             console.error(err4);
//                                             res
//                                               .status(500)
//                                               .send(
//                                                 "An error occurred while updating seller balance."
//                                               );
//                                             return;
//                                           }
//                                           console.log("Seller balance updated");

//                                           // select seller balance
//                                           db.query(
//                                             "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
//                                             [seller_id],
//                                             (err6, res6) => {
//                                               if (err6) {
//                                                 console.error(err6);
//                                                 res
//                                                   .status(500)
//                                                   .send(
//                                                     "An error occurred while fetching seller balance."
//                                                   );
//                                                 return;
//                                               }
//                                               // seller balance add
//                                               db.query(
//                                                 "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
//                                                 [
//                                                   res6[0].own_balance +
//                                                     payableAmount,
//                                                   seller_id,
//                                                 ],
//                                                 (err7, res7) => {
//                                                   if (err7) {
//                                                     console.error(err7);
//                                                     res
//                                                       .status(500)
//                                                       .send(
//                                                         "An error occurred while updating seller balance."
//                                                       );
//                                                     return;
//                                                   }
//                                                   console.log(
//                                                     "Seller balance updated"
//                                                   );
//                                                   // res.redirect("back");
//                                                 }
//                                               );
//                                             }
//                                           );
//                                         }
//                                       );
//                                     }
//                                   }
//                                 );
//                               }
//                             );
//                             // adding money to seller from buyer end

//                             //  add money only if seller is in "Save shop"
//                             // if (resSeller[0].shop_type == 1) {
//                             //   if (res3.length > 0) {
//                             //     db.query(
//                             //       "UPDATE `shop_balance` SET `own_balance` = ?, `due_payment` = ? WHERE `shop_balance`.`shop_id` = ?",
//                             //       [
//                             //         res3[0].own_balance +
//                             //           res2[0].total_price +
//                             //           res37[0].deliveryCharge,
//                             //         res3[0].due_payment +
//                             //           res2[0].total_deduct_price,
//                             //         seller_id,
//                             //       ],
//                             //       (err4, res4) => {
//                             //         if (err4) {
//                             //           console.error(err4);
//                             //           res.status(500).send("An error occurred while updating seller balance.");
//                             //           return;
//                             //         } else {
//                             //           console.log("Seller balance updated");
//                             //         }
//                             //       }
//                             //     );
//                             //   } else {
//                             //     db.query(
//                             //       "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `due_payment`, `from_ref`, `withdraw`) VALUES (NULL, ?, ?, ?, ?, ?)",
//                             //       [
//                             //         seller_id,
//                             //         res2[0].total_price + res37[0].deliveryCharge,
//                             //         res2[0].total_deduct_price,
//                             //         0,
//                             //         0,
//                             //       ],
//                             //       (err4, res4) => {
//                             //         if (err4) {
//                             //           console.error(err4);
//                             //           res.status(500).send("An error occurred while creating seller balance.");
//                             //           return;
//                             //         } else {
//                             //           console.log("Seller balance Created. Id : ", seller_id);
//                             //         }
//                             //       }
//                             //     );
//                             //   }
//                             // } else {

//                             // add money only if seller balance id exists
//                             if (res3.length > 0) {
//                               db.query(
//                                 "UPDATE `shop_balance` SET `due_payment` = ? WHERE `shop_balance`.`shop_id` = ?",
//                                 [
//                                   res3[0].due_payment +
//                                     res2[0].total_deduct_price,
//                                   seller_id,
//                                 ],
//                                 (err4, res4) => {
//                                   if (err4) {
//                                     console.error(err4);
//                                     res
//                                       .status(500)
//                                       .send(
//                                         "An error occurred while updating seller balance."
//                                       );
//                                     return;
//                                   } else {
//                                     console.log("Seller balance updated");
//                                   }
//                                 }
//                               );
//                             } else {
//                               db.query(
//                                 "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `due_payment`, `from_ref`, `withdraw`) VALUES (NULL, ?, ?, ?, ?, ?)",
//                                 [
//                                   seller_id,
//                                   res2[0].total_price + res37[0].deliveryCharge,
//                                   res2[0].total_deduct_price,
//                                   0,
//                                   0,
//                                 ],
//                                 (err4, res4) => {
//                                   if (err4) {
//                                     console.error(err4);
//                                     res
//                                       .status(500)
//                                       .send(
//                                         "An error occurred while creating seller balance."
//                                       );
//                                     return;
//                                   } else {
//                                     console.log(
//                                       "Seller balance Created. Id : ",
//                                       seller_id
//                                     );
//                                   }
//                                 }
//                               );
//                             }

//                             // }

//                             // buyer history added
//                             db.query(
//                               "INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, ?)",
//                               [
//                                 seller_id,
//                                 res2[0].total_price + res37[0].deliveryCharge,
//                                 1,
//                                 new Date()
//                                   .toISOString()
//                                   .replace("T", " ")
//                                   .substring(0, 19),
//                                 oID,
//                                 buyerUserId,
//                               ],
//                               (err5, res5) => {
//                                 if (err5) {
//                                   console.error(err5);
//                                   res
//                                     .status(500)
//                                     .send(
//                                       "An error occurred while adding seller payment history."
//                                     );
//                                   return;
//                                 } else {
//                                   console.log("Added seller payment history");
//                                   res.redirect("back");
//                                 }
//                               }
//                             );
//                           }
//                         );
//                       }
//                       // seller shop details fetch error
//                       else {
//                         console.error(errSeller);
//                         res
//                           .status(500)
//                           .send(
//                             "An error occurred while fetching seller shop details."
//                           );
//                         return;
//                       }
//                     }
//                   );
//                   // seller money add end
//                 }
//               );
//             }
//             // when status = 1 | calculate total price and deduct price else portion
//             else if (status == 3) {
//               db.query(
//                 "UPDATE `orders` SET `seller_confirm` = '1', `request_review` = '1' WHERE `orders`.`order_id` = ?",
//                 [oID],
//                 (err2, res2) => {
//                   if (err2) {
//                     console.error(err2);
//                     res
//                       .status(500)
//                       .send(
//                         "An error occurred while updating seller confirmation and review status."
//                       );
//                     return;
//                   } else {
//                     console.log("Seller sent review for order : ", oID);
//                     res.redirect("back");
//                   }
//                 }
//               );
//             } else {
//               res.redirect("back");
//             }
//           }
//         );
//       }
//     );
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.order_status = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    const oID = req.params.id;
    const status = req.params.status;
    const otp = req.query.otp;
    const payment_method = req.query.payment_method;

    console.log("Order ID : ", oID, "Status : ", status, "OTP : ", otp);
    console.log("Payment Method : ", payment_method);

    // Query for the order
    const orders = await queryAsync(
      "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?",
      [oID]
    );

    console.log("otp : ", orders[0].otp);

    if (orders.length === 0) {
      return res.status(404).send("Order not found.");
    }

    if (status != 1 || !payment_method) {
      console.log("11111 : ", status);
      const statusArray = [
        "Confirmed",
        "Rejected",
        "New Order",
        "Shipped",
        "Return Order",
        "Pending",
      ];

      await queryAsync(
        "UPDATE `orders` SET `order_status` = ?, `request_review` = '0' WHERE `orders`.`order_id` = ?",
        [status, oID]
      );

      if (status == 3) {
        await queryAsync(
          "UPDATE `orders` SET `seller_confirm` = '1', `request_review` = '1' WHERE `orders`.`order_id` = ?",
          [oID]
        );
        console.log("Status : ", status);
      }

      await setNotification(
        orders[0].user_id,
        `Your order status is changed to ${
          statusArray[status - 1]
        } for order ${oID} By seller.`,
        `/user_order`
      );

      return res.redirect(req.get("Referrer") || "/");
    }

    // Check OTP if status is 1
    if (status == 1 && orders[0].otp != otp) {
      return res.status(400).send("Invalid OTP");
    }

    // Fetch seller user details
    const customer = await queryAsync(
      "SELECT * FROM `user` WHERE `user_id` = ?",
      [orders[0].user_id]
    );
    if (customer.length === 0) {
      return res.status(404).send("Customer not found.");
    }

    // Fetch reference user details
    const refUser = await queryAsync(
      "SELECT * FROM `user` WHERE `own_ref_id` = ?",
      [customer[0].reference_id]
    );
    if (refUser.length === 0) {
      return res.status(404).send("Reference user not found.");
    }

    // Fetch the reference seller shop
    const refShop = await queryAsync(
      "SELECT * FROM `shop` WHERE `seller_user_id` = ?",
      [refUser[0].user_id]
    );
    if (refShop.length === 0) {
      return res.status(404).send("Reference seller shop not found.");
    }

    // Construct the redirect URL
    const redirectUrl = `/order-status-complete/${oID}/${status}/${refShop[0].id}/${orders[0].seller_id}?payment_method=${payment_method}`;
    console.log("Redirecting to:", redirectUrl);

    // Redirect the user
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).send("Internal server error");
  }
};

exports.order_delete = (req, res) => {
  var oID = req.params.id;
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
              res.redirect("/orders");
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

exports.stock_out = (req, res) => {
  var pID = req.params.pID;
  var oID = req.params.id;
  var order_id = req.params.order_id;
  db.query(
    "UPDATE `products` SET `quantity` = -1 WHERE `products`.`product_id` = ?",
    [pID],
    (err1, stock_out) => {
      if (!err1) {
        db.query(
          "UPDATE `order_details` SET `stock_out` = 1 WHERE `order_details`.`order_details_id` = ?",
          [oID],
          (err2, res2) => {
            if (!err2) {
              db.query(
                "UPDATE `orders` SET `request_review` = 1 WHERE `orders`.`order_id` = ?",
                [order_id],
                (err3, rqRev) => {
                  if (!err3) {
                    res.redirect("back");
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

exports.deleteOrderItem = (req, res) => {
  var order_details_id = req.params.id; // Assuming this is passed as the ID in the route
  var order_id;

  // Step 1: Get the order ID and check if there are other products in the order
  db.query(
    "SELECT order_id FROM order_details WHERE order_details_id = ?",
    [order_details_id],
    (err, result) => {
      if (err) {
        return res.status(500).send(err); // Send error if something goes wrong
      }

      if (result.length > 0) {
        order_id = result[0].order_id;

        // Step 2: Delete the order detail (the product)
        db.query(
          "DELETE FROM order_details WHERE order_details_id = ?",
          [order_details_id],
          (err1, deleteResult) => {
            if (err1) {
              return res.status(500).send(err1); // Handle deletion error
            }

            // Step 3: Check if there are any remaining products in the order
            db.query(
              "SELECT COUNT(*) AS remainingItems FROM order_details WHERE order_id = ?",
              [order_id],
              (err2, countResult) => {
                if (err2) {
                  return res.status(500).send(err2);
                }

                const remainingItems = countResult[0].remainingItems;

                if (remainingItems == 0) {
                  // Step 4: If no more products in the order, you can decide what to do, e.g., cancel the order
                  db.query(
                    "UPDATE orders SET order_status = 5 WHERE order_id = ?",
                    [order_id],
                    (err3, updateResult) => {
                      if (err3) {
                        return res.status(500).send(err3); // Handle error in updating order
                      }
                      // Redirect back to the same page or send a success response
                      res.redirect("back");
                    }
                  );
                } else {
                  // If there are still products in the order, simply redirect
                  res.redirect("back");
                }
              }
            );
          }
        );
      } else {
        res.status(404).send("Order item not found.");
      }
    }
  );
};

// Seller and buyer can update order quantity and thus the overall price and deduct amount
exports.updateOrder = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    const { order_details_id, extra_cat_id, is_seller } = req.params;
    const { update_quantity } = req.body;
    db.query(
      "SELECT * FROM `order_details` INNER JOIN `products` ON `order_details`.`product_id` = `products`.`product_id` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_details_id` = ?",
      [order_details_id],
      (err1, res1) => {
        if (err1) {
          console.error(err1);
          res
            .status(500)
            .send("An error occurred while fetching order details.");
          return;
        }
        db.query(
          "SELECT `retailer_deduct_percentage`, `manufacturer_deduct_percentage` FROM `extra_cat` WHERE `extra_cat`.`extra_cat_id` = ?",
          [extra_cat_id],
          (err2, res2) => {
            if (err2) {
              console.error(err2);
              res
                .status(500)
                .send(
                  "An error occurred while fetching extra category details."
                );
              return;
            }
            const update_query =
              "UPDATE `order_details` SET `product_quantity` = ?, `product_total_price` = ?, `deduct_price` = ? WHERE `order_details`.`order_details_id` = ?";
            const up_deduct_price =
              (res1[0].product_price *
                update_quantity *
                res2[0].retailer_deduct_percentage) /
              100;
            const up_total_price = res1[0].product_price * update_quantity;
            const refund_amount = res1[0].product_total_price - up_total_price;
            db.query(
              update_query,
              [
                update_quantity,
                up_total_price,
                up_deduct_price,
                order_details_id,
              ],
              (err3, res3) => {
                if (err3) {
                  console.error(err3);
                  res
                    .status(500)
                    .send("An error occurred while updating order details.");
                  return;
                }

                // who changed the quantity ? seller or buyer
                if (is_seller === 1) {
                  setNotification(
                    res1[0].user_id,
                    `Your order quantity is updated for order ${res1[0].order_id} By seller.`,
                    `/user_order/?oID=${res1[0].order_id}`
                  );
                } else {
                  setNotification(
                    res1[0].seller_id,
                    `(Partial Purchase) Your order quantity is updated for order ${res1[0].order_id} By buyer.`,
                    `/order_details/${res1[0].order_id}`
                  );
                  // cash on delivery, so no need to update balance | due balance will be added after this confirmation
                }
                res.redirect("back");
              }
            );
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateUserOrder = async (req, res) => {
  try {
    const { address, order_id } = req.body;
    console.log(req.body);

    const orderUpdateQuery = "UPDATE orders SET address = ? WHERE order_id = ?";

    db.query(orderUpdateQuery, [address, order_id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }

      return res.redirect(`order_details/${order_id}`);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateUserOrderDeliveryChange = async (req, res) => {
  try {
    const { charge, order_id, currRate } = req.body;
    const deliveryChargeInUSD = parseFloat(charge) / parseFloat(currRate);
    console.log("w", req.body);

    const orderUpdateQuery =
      "UPDATE orders SET deliveryCharge = ? WHERE order_id = ?";

    db.query(
      orderUpdateQuery,
      [deliveryChargeInUSD, order_id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Internal Server Error");
        }

        return res.redirect(`order_details/${order_id}`);
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
