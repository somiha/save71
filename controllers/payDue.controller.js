const { query } = require("express");
const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const { queryAsync, queryAsyncWithoutValue } = require("../config/helper");

// exports.payDue = (req, res) => {
//   var isLogged = crypto.decrypt(req.cookies.login_status || '');
//   if (isLogged) {
//   try {
//     const {dueId, verificationMethod} = req.params
//     const userId = crypto.decrypt(req.cookies.userId);
//     const seller_id = crypto.decrypt(req.cookies.seller_id);

//     if (verificationMethod || 1) {

//         db.query("SELECT * FROM `shop_due_details` WHERE `due_id` = ?",
//         [dueId], (err1, res1)=>{
//           if (!err1) {
//               if (res1[0].is_paid == 0) {                //  If already paid
//                 db.query("SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
//                 [seller_id], (err11, res11)=>{
//                   if (!err11) {
//                     if (res11[0].own_balance >= res11[0].due_payment) {              //  If not enough money in balance
//                       const ref_shop_id = res1[0].ref_id
//                       const deductAmount = res1[0].due_amount
//                       const oID = res1[0].order_id
//                   // reference money add
//                       console.log("ref_shop_id : ", ref_shop_id);
//                       console.log("deduct_amount: ", deductAmount);
//                       db.query(
//                         "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
//                         [ref_shop_id],
//                         (err3, res3) => {
//                           if (err3) {
//                             console.error(err3);
//                             res.status(500).send("An error occurred while fetching the shop balance for reference.");
//                             return;
//                           }

//                           if (res3.length > 0) {
//                             db.query(
//                               "UPDATE `shop_balance` SET `from_ref` = ?, `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
//                               [
//                                 res3[0].from_ref + deductAmount / 2,
//                                 res3[0].own_balance + deductAmount / 2,
//                                 ref_shop_id,
//                               ],
//                               (err4, res4) => {
//                                 if (err4) {
//                                   console.error(err4);
//                                   res.status(500).send("An error occurred while updating the shop balance.");
//                                   return;
//                                 } else {
//                                   console.log("REF balance updated");
//                                   console.log("Amount1 : ", deductAmount);

//                                   // add payment history
//                                   db.query(
//                                     "INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, ?)",
//                                     [
//                                       ref_shop_id,
//                                       deductAmount / 2,
//                                       2,
//                                       new Date().toISOString(),
//                                       oID,
//                                       userId,
//                                     ],
//                                     (err5, res5) => {
//                                       if (err5) {
//                                         console.error(err5);
//                                         res.status(500).send("An error occurred while adding payment history.");
//                                         return;
//                                       } else {
//                                         console.log("Added payment history");
//                                         console.log("Amount2 : ", deductAmount / 2);
//                                       }
//                                     }
//                                   );
//                                 }
//                               }
//                             );
//                           } else {
//                             db.query(
//                               "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `from_ref`, `withdraw`) VALUES (NULL, ?, ?, ?, ?)",
//                               [ref_shop_id, deductAmount / 2, deductAmount / 2, 0],
//                               (err4, res4) => {
//                                 if (err4) {
//                                   console.error(err4);
//                                   res.status(500).send("An error occurred while creating REF balance.");
//                                   return;
//                                 } else {
//                                   console.log("REF balance Created. Id : ", ref_shop_id);
//                                   console.log("Amount1 : ", deductAmount);

//                                   // add payment history
//                                   db.query(
//                                     "INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, ?)",
//                                     [
//                                       ref_shop_id,
//                                       deductAmount / 2,
//                                       2,
//                                       new Date().toISOString(),
//                                       oID,
//                                       userId,
//                                     ],
//                                     (err5, res5) => {
//                                       if (err5) {
//                                         console.error(err5);
//                                         res.status(500).send("An error occurred while adding payment history.");
//                                         return;
//                                       } else {
//                                         console.log("Newly Added payment history");
//                                         console.log("Amount2 : ", deductAmount / 2);
//                                       }
//                                     }
//                                   );
//                                 }
//                               }
//                             );
//                           }

//                           // admin balance add
//                           db.query(
//                             "SELECT * FROM `admin_balance` WHERE `admin_id` = 1",
//                             (err4, res4) => {
//                               if (err4) {
//                                 console.error(err4);
//                                 res.status(500).send("An error occurred while fetching admin balance.");
//                                 return;
//                               } else {
//                                 db.query(
//                                   "UPDATE `admin_balance` SET `admin_balance` = ? WHERE `admin_balance`.`admin_id` = 1",
//                                   [res4[0].admin_balance + deductAmount / 2],
//                                   (err5, res5) => {
//                                     if (err5) {
//                                       console.error(err5);
//                                       res.status(500).send("An error occurred while updating admin balance.");
//                                       return;
//                                     } else {
//                                       console.log("Admin account is credited with : ", deductAmount / 2);
//                                       res.redirect("back")
//                                     }
//                                   }
//                                 );
//                               }
//                             }
//                           );
//                           // admin balance end
//                         }
//                       );
//                       // reference money add end

//               // removing "due" and changing "is_paid" val
//                           db.query("UPDATE `shop_due_details` SET `is_paid` = '1' WHERE `shop_due_details`.`due_id` = ?",
//                           [dueId], (err2, res2)=>{
//                             if (!err2) {

//                               db.query("SELECT * FROM `shop_balance` WHERE `shop_id` = ?", [seller_id], (err3, results) => {
//                                 if (err3) {
//                                   console.error("Error fetching current due_payment value:", err3);
//                                   res.status(500).send("An error occurred while fetching current due_payment value.");
//                                   return
//                                 } else {
//                                   if (results.length > 0) {

//                                     const currentDuePayment = results[0].due_payment;
//                                     const updatedDuePayment = currentDuePayment - deductAmount;

//                                 //  Money Check
//                                     if ((results[0].own_balance - deductAmount) >= 0) {
//                                       db.query("UPDATE `shop_balance` SET `due_payment` = ?, `own_balance` = ? WHERE `shop_id` = ?",
//                                         [updatedDuePayment, results[0].own_balance - deductAmount ,seller_id], (err4, updateResult) => {
//                                           if (err4) {
//                                             console.error("Error updating due_payment:", err4);
//                                             res.status(500).send("An error occurred while updating due_payment.");
//                                             return
//                                           } else {
//                                             console.log("Due_payment updated successfully!");
//                                           }
//                                       });
//                                     } else {
//                                       console.log('Not Enough Money !')
//                                       res.status(404).send("Not Enough Money !")
//                                       return
//                                     }

//                                   } else {
//                                     console.error("No record found with the given balance_id.");
//                                     res.status(404).send("No record found with the given balance_id.");
//                                     return
//                                   }
//                                 }
//                               });

//                             } else {
//                               console.error(err2);
//                               res.status(500).send("An error occurred while Updating shop_due_details -> is paid.");
//                               return
//                             }
//                           })
//                   } else {
//                     console.error("Not Enough Money");
//                     res.status(404).send('<script>alert("Not Enough Money !"); window.history.go(-1);</script>');
//                     return;
//                   }
//                 } else {
//                   console.error(err11);
//                   res.status(500).send("An error occurred while fetching the shop balance for seller.");
//                   return;
//                 }
//               })
//             } else {
//               res.status(404).send('<script>alert("Already Paid !"); window.history.go(-1);</script>');
//               return
//             }
//           } else {
//             console.error(err1);
//             res.status(500).send("An error occurred while Fetching shop_due_details.");
//             return
//           }
//         })
//       } else {
//         res.status(404).send('<script>alert("Verification Failed !"); window.history.go(-1);</script>');
//         return
//       }
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Internal Server Error");
//       return
//     }
//   } else {
//     res.redirect('/login')
//   }
// };

exports.payDue = (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const { dueId, verificationMethod } = req.params;
      const userId = crypto.decrypt(req.cookies.userId);
      const seller_id = crypto.decrypt(req.cookies.seller_id);

      if (verificationMethod || 1) {
        db.query(
          "SELECT * FROM `shop_due_details` WHERE `due_id` = ?",
          [dueId],
          (err1, res1) => {
            if (err1) {
              console.error(err1);
              return res
                .status(500)
                .send("An error occurred while fetching shop due details.");
            }

            if (res1.length === 0 || res1[0].is_paid != 0) {
              return res
                .status(404)
                .send(
                  '<script>alert("Already Paid or not found!"); window.history.go(-1);</script>'
                );
            }

            db.query(
              "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
              [seller_id],
              (err11, res11) => {
                if (err11) {
                  console.error(err11);
                  return res
                    .status(500)
                    .send("An error occurred while fetching shop balance.");
                }

                if (
                  res11.length === 0 ||
                  res11[0].own_balance < res1[0].due_amount
                ) {
                  return res
                    .status(404)
                    .send(
                      '<script>alert("Not Enough Money !"); window.history.go(-1);</script>'
                    );
                }

                const ref_shop_id = res1[0].ref_id;
                const deductAmount = res1[0].due_amount;
                const oID = res1[0].order_id;

                // Reference money add
                db.query(
                  "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                  [ref_shop_id],
                  (err3, res3) => {
                    if (err3) {
                      console.error(err3);
                      return res
                        .status(500)
                        .send(
                          "An error occurred while fetching the shop balance for reference."
                        );
                    }

                    const updateReferenceBalance = (currentBalance, amount) => {
                      return {
                        from_ref: currentBalance.from_ref + amount / 2,
                        own_balance: currentBalance.own_balance + amount / 2,
                      };
                    };

                    const newBalance = updateReferenceBalance(
                      res3[0] || { from_ref: 0, own_balance: 0 },
                      deductAmount
                    );
                    const updateOrCreateRefBalanceQuery =
                      res3.length > 0
                        ? "UPDATE `shop_balance` SET `from_ref` = ?, `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?"
                        : "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `from_ref`, `withdraw`) VALUES (NULL, ?, ?, ?, 0)";

                    db.query(
                      updateOrCreateRefBalanceQuery,
                      [
                        newBalance.from_ref,
                        newBalance.own_balance,
                        ref_shop_id,
                      ],
                      (err4, res4) => {
                        if (err4) {
                          console.error(err4);
                          return res
                            .status(500)
                            .send(
                              "An error occurred while updating the shop balance."
                            );
                        }

                        db.query(
                          "INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, ?)",
                          [
                            ref_shop_id,
                            deductAmount / 2,
                            2,
                            new Date()
                              .toISOString()
                              .slice(0, 19)
                              .replace("T", " "),
                            oID,
                            userId,
                          ],
                          (err5, res5) => {
                            if (err5) {
                              console.error(err5);
                              return res
                                .status(500)
                                .send(
                                  "An error occurred while adding payment history."
                                );
                            }

                            db.query(
                              "SELECT * FROM `admin_balance` WHERE `admin_id` = 1",
                              (err4, res4) => {
                                if (err4) {
                                  console.error(err4);
                                  return res
                                    .status(500)
                                    .send(
                                      "An error occurred while fetching admin balance."
                                    );
                                }

                                const adminBalance =
                                  res4[0].admin_balance + deductAmount / 2;

                                db.query(
                                  "UPDATE `admin_balance` SET `admin_balance` = ? WHERE `admin_balance`.`admin_id` = 1",
                                  [adminBalance],
                                  (err5, res5) => {
                                    if (err5) {
                                      console.error(err5);
                                      return res
                                        .status(500)
                                        .send(
                                          "An error occurred while updating admin balance."
                                        );
                                    }

                                    db.query(
                                      "UPDATE `shop_due_details` SET `is_paid` = '1' WHERE `shop_due_details`.`due_id` = ?",
                                      [dueId],
                                      (err2, res2) => {
                                        if (err2) {
                                          console.error(err2);
                                          return res
                                            .status(500)
                                            .send(
                                              "An error occurred while updating shop due details."
                                            );
                                        }

                                        db.query(
                                          "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                                          [seller_id],
                                          (err3, results) => {
                                            if (err3) {
                                              console.error(err3);
                                              return res
                                                .status(500)
                                                .send(
                                                  "An error occurred while fetching current due_payment value."
                                                );
                                            }

                                            const currentDuePayment =
                                              results[0].due_payment;
                                            const updatedDuePayment =
                                              currentDuePayment - deductAmount;
                                            const newOwnBalance =
                                              results[0].own_balance -
                                              deductAmount;

                                            db.query(
                                              "UPDATE `shop_balance` SET `due_payment` = ?, `own_balance` = ? WHERE `shop_id` = ?",
                                              [
                                                updatedDuePayment,
                                                newOwnBalance,
                                                seller_id,
                                              ],
                                              (err4, updateResult) => {
                                                console.log({ updateResult });
                                                if (err4) {
                                                  console.log({ err4 });
                                                  return res
                                                    .status(500)
                                                    .send(
                                                      "An error occurred while updating due_payment."
                                                    );
                                                }

                                                console.log(
                                                  "Due_payment updated successfully!"
                                                );
                                                res.redirect("back");
                                              }
                                            );
                                          }
                                        );
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        return res
          .status(404)
          .send(
            '<script>alert("Verification Failed !"); window.history.go(-1);</script>'
          );
      }
    } catch (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};

exports.paydue_v2 = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const dueId = req.params.dueId;
      const verificationMethod = req.params.verificationMethod;
      const userId = crypto.decrypt(req.cookies.userId);
      if (verificationMethod || 1) {
        const shopDueDetails = await queryAsync(
          "SELECT * FROM `shop_due_details` WHERE `due_id` = ?",
          [dueId]
        );

        if (shopDueDetails[0].length == 0) {
          return res
            .status(404)
            .send(
              '<script>alert("Invalid Due ID"); window.history.go(-1);</script>'
            );
        }

        if (shopDueDetails[0].is_paid == 1) {
          return res
            .status(404)
            .send(
              '<script>alert("Already Paid"); window.history.go(-1);</script>'
            );
        }

        const shopBalance = await queryAsync(
          "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
          [shopDueDetails[0].shop_id]
        );

        const order = await queryAsync(
          "SELECT * FROM `orders` WHERE `order_id` = ?",
          [shopDueDetails[0].order_id]
        );

        const refBalance = await queryAsync(
          "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
          [shopDueDetails[0].ref_id]
        );

        const customerShop = await queryAsync(
          "SELECT * FROM `shop` WHERE `seller_user_id` = ?",
          [order[0].user_id]
        );

        if (
          Number(shopBalance[0].own_balance) <
          Number(shopDueDetails[0].due_amount)
        ) {
          return res
            .status(404)
            .send(
              '<script>alert("Not Enough Balance!"); window.history.go(-1);</script>'
            );
        }

        const deduct_price = Number(shopDueDetails[0].due_amount);

        let value1 =
          Number(refBalance[0].own_balance) + Number(deduct_price / 2);
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_id` = ?",
          [value1, shopDueDetails[0].ref_id]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [
            shopDueDetails[0].shop_id,
            refBalance[0].shop_id,
            deduct_price / 2,
            customerShop[0].id,
          ]
        );

        const admin_balance = await queryAsyncWithoutValue(
          "SELECT * FROM `admin_balance` WHERE `admin_id` = 1"
        );

        await queryAsync(
          "UPDATE `admin_balance` SET `admin_balance` = ? WHERE `admin_id` = 1",
          [admin_balance[0].admin_balance + deduct_price / 2]
        );

        await queryAsync(
          "INSERT INTO `fund_transfer` (`fund_transfer_id`, `sender_id`, `receiver_id`, `amount`, `ref_id` ) VALUES (NULL, ?, ?, ?, ?)",
          [shopDueDetails[0].shop_id, 0, deduct_price / 2, customerShop[0].id]
        );

        let value3 = Number(shopBalance[0].own_balance) - deduct_price;
        let value4 = Number(shopBalance[0].due_payment) - deduct_price;
        console.log({ value3 });
        await queryAsync(
          "UPDATE `shop_balance` SET `own_balance` = ?, `due_payment` = ? WHERE `shop_id` = ?",
          [value3, value4, shopBalance[0].shop_id]
        );

        await queryAsync(
          "UPDATE `shop_due_details` SET `is_paid` = '1' WHERE `due_id` = ?",
          [dueId]
        );

        res.redirect("back");
      } else {
        return res
          .status(404)
          .send(
            '<script>alert("Verification Failed !"); window.history.go(-1);</script>'
          );
      }
    } catch (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};
