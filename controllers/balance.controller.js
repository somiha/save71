const db = require("../config/database.config");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

// INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `balance`, `money_hold`) VALUES (NULL, '', '', '')

exports.balance = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const isDuePending = req.query.isDuePending || false;
      if (!req.cookies.currencyCode) {
        return res.redirect("/logout");
      }
      const userId = crypto.decrypt(req.cookies.userId);
      const shopId = crypto.decrypt(req.cookies.seller_id);
      console.log({ shopId });
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [currRate, tax, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchTaxRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);

      const fundTranferData = await queryAsync(
        `SELECT ft.*, 
      COALESCE(senderShop.shop_name, 'No Sender') AS sender_name, 
      COALESCE(receiverShop.shop_name, 'Commission') AS receiver_name, 
      COALESCE(referrerShop.shop_name, 'No Referrer') AS referrer_name
  FROM fund_transfer AS ft
  LEFT JOIN shop AS senderShop ON ft.sender_id = senderShop.id
  LEFT JOIN shop AS receiverShop ON ft.receiver_id = receiverShop.id
  LEFT JOIN shop AS referrerShop ON ft.ref_id = referrerShop.id
  WHERE ft.receiver_id = ? 
         OR ft.sender_id = ?
  ORDER BY ft.created_at DESC`,
        [shopId, shopId]
      );

      // console.log({ fundTranferData });

      var isLogged = crypto.decrypt(req.cookies.login_status || "");
      if (isLogged) {
        // Minimum withDrawal value
        const minWithDraw = 10;
        var seller_id = crypto.decrypt(req.cookies.seller_id);
        db.query(
          "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
          [seller_id],
          (err1, res1) => {
            if (!err1) {
              db.query(
                "SELECT * FROM `shop_transaction` WHERE `shop_transaction`.`shop_id` = ?",
                [seller_id],
                (err2, res2) => {
                  console.log({ res2 });
                  if (!err2) {
                    db.query(
                      "SELECT * FROM `payment_history` WHERE `payment_history`.`shop_id` = ? ORDER BY `payment_history`.`history_id` DESC",
                      [seller_id],
                      (err3, res3) => {
                        if (!err3) {
                          res.render("balance", {
                            ogImage:
                              "https://admin.save71.com/images/logo-og.webp",
                            ogTitle:
                              "Save71 Connects You and the World through Business.",
                            ogUrl: "https://admin-save71.lens-ecom.store",
                            currRate,
                            currencyCode,
                            menuId: "shop-owner-balance",
                            name: "My balance",
                            balance: res1,
                            isDuePending,
                            trans: res2,
                            history: res3,
                            minWithDraw,
                            tax,
                            notification: notification,
                            fundTranferData,
                            shopId,
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
      } else {
        res.redirect("/login");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};

exports.filter = async (req, res) => {
  try {
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate, tax] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchTaxRate(currencyCode),
    ]);
    const { option, date } = req.body;
    console.log(option, date);
    db.query(
      "SELECT * FROM `payment_history` INNER JOIN `user` ON `user`.`user_id` = `payment_history`.`ref_user_id` WHERE `type` = ? AND `payment_history`.`date` = ?",
      [option, date],
      (err1, res1) => {
        if (!err1) {
          // res.send(res1)
          const resultWithCurrRate = res1.map((item) => ({
            ...item,
            currRate: currRate,
          }));
          res.send(resultWithCurrRate);
        } else {
          res.send(err1);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getTableInfo = async (req, res) => {
  try {
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate, tax] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchTaxRate(currencyCode),
    ]);
    var uID = crypto.decrypt(req.cookies.userId);
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    var isLogged = crypto.decrypt(req.cookies.login_status);
    var oID = crypto.decrypt(req.cookies.order_id || "");
    var userImage = crypto.decrypt(req.cookies.userImage || "");
    var userName = crypto.decrypt(req.cookies.userName);
    if (isLogged) {
      db.query(
        "SELECT * FROM `payment_history` INNER JOIN `orders` ON `payment_history`.`order_id` = `orders`.`order_id` WHERE `payment_history`.`shop_id` = ? AND `payment_history`.`type` = 1 ORDER BY `payment_history`.`history_id` DESC",
        [seller_id],
        (err1, orderTable) => {
          if (!err1) {
            db.query(
              "SELECT * FROM `payment_history` INNER JOIN `user` ON `user`.`user_id` = `payment_history`.`ref_user_id` WHERE `shop_id` = ? AND `type` = 2 ORDER BY `payment_history`.`history_id` DESC",
              [seller_id],
              (err2, refTable) => {
                if (!err2) {
                  db.query(
                    "SELECT * FROM `payment_history` INNER JOIN `user` ON `user`.`user_id` = `payment_history`.`sent_user_id` WHERE `shop_id` = ? AND `type` = 4 ORDER BY `payment_history`.`history_id` DESC",
                    [seller_id],
                    (err3, sentMoneyTable) => {
                      if (!err3) {
                        const data = {
                          orderTable,
                          refTable,
                          sentMoneyTable,
                          currRate,
                          tax,
                        };
                        res.send(data);
                      } else {
                        console.error(err3);
                        res
                          .status(500)
                          .send("An error occurred while getting ref Details.");
                        return;
                      }
                    }
                  );
                } else {
                  console.error(err2);
                  res
                    .status(500)
                    .send("An error occurred while getting ref Details.");
                  return;
                }
              }
            );
          } else {
            console.error(err1);
            res
              .status(500)
              .send("An error occurred while getting order Details.");
            return;
          }
        }
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// exports.getTableInfoDue = async (req, res) => {
//   try {
//     const currencyCode = crypto.decrypt(req.cookies.currencyCode);
//     const [currRate, tax] = await Promise.all([
//       catModel.fetchCurrencyRate(currencyCode),
//       catModel.fetchTaxRate(currencyCode),
//     ]);
//     var uID = crypto.decrypt(req.cookies.userId);
//     var seller_id = crypto.decrypt(req.cookies.seller_id);
//     var isLogged = crypto.decrypt(req.cookies.login_status);
//     var oID = crypto.decrypt(req.cookies.order_id || "");
//     console.log("oid", oID);
//     var userImage = crypto.decrypt(req.cookies.userImage || "");
//     var userName = crypto.decrypt(req.cookies.userName);

//     if (isLogged) {
//       db.query(
//         "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? ORDER BY `shop_due_details`.`due_id` DESC",
//         [seller_id],
//         (err1, dueTable) => {
//           console.log("due", dueTable[0].order_id);
//           if (!err1) {
//             db.query(
//               "SELECT product_total_price AS sales FROM `order_details` WHERE `order_id` = ?",
//               [dueTable[0].order_id],
//               (err2, result) => {
//                 if (!err2) {
//                   const totalSales = result[0].sales || 0;
//                   const data = {
//                     dueTable,
//                     totalSales,
//                     currRate,
//                     tax,
//                   };
//                   res.send(data);
//                 } else {
//                   console.error(err2);
//                   res
//                     .status(500)
//                     .send("An error occurred while calculating total sales.");
//                 }
//               }
//             );
//           } else {
//             console.error(err1);
//             res
//               .status(500)
//               .send("An error occurred while getting due details.");
//           }
//         }
//       );
//     } else {
//       res.redirect("/login");
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.getTableInfoDue = async (req, res) => {
  try {
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }
    let currencyCode = "";
    if (!req.cookies.currencyCode) {
      currencyCode = "BDT";
    } else {
      console.log("cookie", req.cookies.currencyCode);
      currencyCode = crypto.decrypt(req.cookies.currencyCode);
    }

    const [currRate, tax] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchTaxRate(currencyCode),
    ]);
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    var isLogged = crypto.decrypt(req.cookies.login_status);

    if (isLogged) {
      db.query(
        "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? ORDER BY `shop_due_details`.`due_id` DESC",
        [seller_id],
        (err1, dueTable) => {
          if (!err1) {
            // Extract all order_ids from dueTable
            const orderIds = dueTable.map((due) => due.order_id);

            if (orderIds.length > 0) {
              db.query(
                "SELECT order_id, product_total_price AS total_sales FROM `order_details` WHERE `order_id` IN (?)",
                [orderIds],
                (err2, result) => {
                  if (!err2) {
                    const totalSales = {};
                    result.forEach((row) => {
                      totalSales[row.order_id] = totalSales[row.order_id]
                        ? Number(totalSales[row.order_id]) +
                          Number(row.total_sales)
                        : Number(row.total_sales);
                    });

                    const data = {
                      dueTable,
                      totalSales,
                      currRate,
                      tax,
                    };
                    res.send(data);
                  } else {
                    console.error(err2);
                    res
                      .status(500)
                      .send("An error occurred while fetching total sales.");
                  }
                }
              );
            } else {
              const data = {
                dueTable,
                totalSales: {},
                currRate,
                tax,
              };
              res.send(data);
            }
          } else {
            console.error(err1);
            res
              .status(500)
              .send("An error occurred while getting due details.");
          }
        }
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// exports.getTableInfoDue = async (req, res) => {
//   try {
//     const currencyCode = crypto.decrypt(req.cookies.currencyCode);
//     const [currRate, tax] = await Promise.all([
//       catModel.fetchCurrencyRate(currencyCode),
//       catModel.fetchTaxRate(currencyCode),
//     ]);
//     var uID = crypto.decrypt(req.cookies.userId);
//     var seller_id = crypto.decrypt(req.cookies.seller_id);
//     var isLogged = crypto.decrypt(req.cookies.login_status);
//     var oID = crypto.decrypt(req.cookies.order_id || "");
//     var userImage = crypto.decrypt(req.cookies.userImage || "");
//     var userName = crypto.decrypt(req.cookies.userName);
//     if (isLogged) {
//       db.query(
//         "SELECT * FROM `shop_due_details` WHERE `shop_id` = ?  ORDER BY `shop_due_details`.`due_id` DESC",
//         [seller_id],
//         (err1, dueTable) => {
//           if (!err1) {
//             const data = {
//               dueTable,
//               currRate,
//               tax,
//             };
//             // console.log(data)
//             res.send(data);
//           } else {
//             console.error(err1);
//             res
//               .status(500)
//               .send("An error occurred while getting order Details.");
//             return;
//           }
//         }
//       );
//     } else {
//       res.redirect("/login");
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.getTableInfoWithdraw = async (req, res) => {
  try {
    if (!req.cookies.currencyCode) {
      return res.redirect("/logout");
    }
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate, tax] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchTaxRate(currencyCode),
    ]);
    var uID = crypto.decrypt(req.cookies.userId);
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    var isLogged = crypto.decrypt(req.cookies.login_status);
    var oID = crypto.decrypt(req.cookies.order_id || "");
    var userImage = crypto.decrypt(req.cookies.userImage || "");
    var userName = crypto.decrypt(req.cookies.userName);
    if (isLogged) {
      db.query(
        "SELECT * FROM `shop_transaction` WHERE `shop_id` = ? AND `is_withdraw` = 1 ORDER BY `shop_transaction`.`transaction_id` DESC;",
        [seller_id],
        (err1, withdrawTable) => {
          if (!err1) {
            db.query(
              "SELECT * FROM `shop_transaction` WHERE `shop_id` = ? AND `is_withdraw` = 0 ORDER BY `shop_transaction`.`transaction_id` DESC;",
              [seller_id],
              (err2, addMoneyTable) => {
                if (!err2) {
                  withdrawTable.forEach((item) => {
                    item.tax_rate = tax;
                  });
                  const data = {
                    withdrawTable,
                    addMoneyTable,
                    currRate,
                    tax,
                  };
                  res.send(data);
                } else {
                  console.error(err2);
                  res
                    .status(500)
                    .send("An error occurred while getting ref Details.");
                  return;
                }
              }
            );
          } else {
            console.error(err1);
            res
              .status(500)
              .send("An error occurred while getting order Details.");
            return;
          }
        }
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
