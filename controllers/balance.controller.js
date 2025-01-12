const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

// INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `balance`, `money_hold`) VALUES (NULL, '', '', '')

exports.balance = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [currRate, tax, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchTaxRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
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
                            trans: res2,
                            history: res3,
                            minWithDraw,
                            tax,
                            notification: notification,
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
                      totalSales[row.order_id] = row.total_sales;
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

exports.checkValidity = (req, res) => {
  console.log("validity checking");
  var uID = crypto.decrypt(req.cookies.userId);
  var seller_id = crypto.decrypt(req.cookies.seller_id);
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  var oID = crypto.decrypt(req.cookies.order_id || "");
  var userImage = crypto.decrypt(req.cookies.userImage || "");
  var userName = crypto.decrypt(req.cookies.userName);

  if (isLogged) {
    db.query(
      "SELECT * FROM `shop_due_details` INNER JOIN `shop_balance` ON `shop_balance`.`shop_id` = `shop_due_details`.`shop_id`  WHERE `shop_due_details`.`shop_id` = ? AND `shop_due_details`.`is_paid` = 0",
      [seller_id],
      (err1, res1) => {
        console.log("res1", res1);
        if (!err1) {
          if (res1.length > 0) {
            if (res1[0].own_balance >= res1[0].due_payment) {
              res1.forEach((item) => {
                item.last_date = new Date(item.last_date);
              });
              const today = new Date();
              const expiredDues = res1.filter((item) => item.last_date < today);

              console.log({ expiredDues });
              if (expiredDues.length > 0) {
                const expiredDueIds = expiredDues.map((item) => item.due_id);
                console.log({ expiredDueIds });

                const handleRedirect = (index) => {
                  if (index < expiredDueIds.length) {
                    const dueId = expiredDueIds[index];
                    console.log({ dueId });
                    res.redirect(`/payDue/${dueId}/1`);

                    return;
                  } else {
                    const validity = true;
                    console.log({ validity });
                    res.send(validity);
                  }
                };
                handleRedirect(0);
              } else {
                const validity = true;
                res.send(validity);
              }
            } else {
              res.send(false);
              return;
            }
          } else {
            res.send(true);
            return;
          }
        } else {
          console.log({ err1 });
          res
            .status(500)
            .send("An error occurred while getting shop_due_details.");
          return;
        }
      }
    );
  } else {
    res.redirect("/login");
  }
};
