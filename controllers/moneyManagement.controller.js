const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.addMoney = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [mainCat, subCat, extraCat, allCat, images, currRate] =
      await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
      ]);
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const { status, transaction_id } = req.params;

    db.query(
      "SELECT * FROM `shop_transaction` WHERE `shop_transaction`.`transaction_id` = ?",
      [transaction_id],
      (err1, res1) => {
        if (err1) {
          res.send(err1);
          console.log(err1);
        }
        // console.log(res1[0])
        const amountPost = res1[0].amount;
        // console.log(`Added amount : ${amountPost}`)
        db.query(
          "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
          [seller_id],
          (err2, res2) => {
            if (!err2) {
              db.query(
                "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                [res2[0].own_balance + amountPost, seller_id],
                (err3, res3) => {
                  if (!err3) {
                    db.query(
                      "UPDATE `shop_transaction` SET `status` = ? WHERE `shop_transaction`.`transaction_id` = ?",
                      [status, transaction_id],
                      (err4, res4) => {
                        if (err4) {
                          res.send("Error updating transaction status !");
                          console.error(err4);
                        }
                        console.log(`Successfully added ${amountPost} tk !`);
                        res.redirect("/balance");
                      }
                    );
                  } else {
                    console.error(err3);
                    res.send("Error updating balance !");
                  }
                }
              );
            } else {
              res.send("Error fetching balance !");
              console.error(err2);
            }
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

exports.withDraw = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [mainCat, subCat, extraCat, allCat, images, currRate] =
      await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
      ]);
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    console.log("Seller ID: ", seller_id);
    const { status, transaction_id } = req.params;

    db.query(
      "SELECT * FROM `shop_transaction` WHERE `shop_transaction`.`transaction_id` = ?",
      [transaction_id],
      (err1, res1) => {
        if (err1) {
          res.send(err1);
          console.log(err1);
        }
        var amountPost = res1[0].amount;
        db.query(
          "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
          [seller_id],
          (err11, res11) => {
            if (!err11) {
              if (res11[0].own_balance >= amountPost) {
                db.query(
                  "UPDATE `shop_balance` SET `own_balance` = ?, `withdraw` = ? WHERE `shop_balance`.`shop_id` = ?",
                  [
                    res11[0].own_balance - amountPost,
                    res11[0].withdraw + amountPost,
                    seller_id,
                  ],
                  (err2, res2) => {
                    if (!err2) {
                      db.query(
                        "UPDATE `shop_transaction` SET `status` = ? WHERE `shop_transaction`.`transaction_id` = ?",
                        [status, transaction_id],
                        (err3, res3) => {
                          if (err3) {
                            res.send(err3);
                            console.log(err3);
                          }
                          console.log(
                            `Successfully added ${amountPost} ${currencyCode} !`
                          );
                          res.redirect("back");
                        }
                      );
                    } else {
                      console.log(err2);
                      res.send(err2);
                    }
                  }
                );
              } else {
                res.send(`
              <script>
                alert("Insufficient money to withdraw !");
                window.history.go(-1);
              </script>
            `);
              }
            } else {
              res.send(err11);
            }
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

exports.addMoneyReq = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [mainCat, subCat, extraCat, allCat, images, currRate] =
      await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
      ]);
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const { amount } = req.body;
    console.log("Amount: ", amount);
    const amountPost = amount / currRate;
    db.query(
      "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
      [seller_id],
      (err11, res11) => {
        if (!err11) {
          db.query(
            "INSERT INTO `shop_transaction` (`transaction_id`, `shop_id`, `date`, `amount`, `is_withdraw`, `payment_method`, `status`) VALUES (NULL, ?, ?, ?, '0', NULL, ?)",
            [
              seller_id,
              new Date(),
              amountPost,
              0, // 0 = Pending, 1 = Processing, 2 = Paid, 3 = Rejected
              // add payment method here
            ],
            (err1, res1) => {
              if (!err1) {
                console.log(
                  `Successfully added to request ${amount} ${currencyCode} !`
                );
                // res.redirect("back")

                const sslCommerz = 1;
                const status = 2;
                // 0 = Pending, 1 = Processing, 2 = Paid, 3 = Rejected
                if (sslCommerz) {
                  res.redirect("/addMoneyDone/" + status + "/" + res1.insertId);
                } else {
                  res.send("SSL Commerz not available !");
                }
              } else {
                console.log(err1);
                res.send(err1);
              }
            }
          );
        } else {
          res.send(err11);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

exports.withDrawReq = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [mainCat, subCat, extraCat, allCat, images, currRate] =
      await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
      ]);
    const seller_id = crypto.decrypt(req.cookies.seller_id);
    const user_id = crypto.decrypt(req.cookies.userId);
    console.log("Seller ID: ", seller_id);
    const { amount } = req.body;
    var amountPost = amount / currRate;
    db.query(
      "SELECT * FROM `shop_balance` WHERE `shop_balance`.`shop_id` = ?",
      [seller_id],
      (err11, res11) => {
        if (!err11) {
          if (res11[0].own_balance >= amountPost) {
            db.query(
              "INSERT INTO `shop_transaction` (`transaction_id`, `shop_id`, `date`, `amount`, `is_withdraw`, `payment_method`, `status`) VALUES (NULL, ?, ?, ?, '1', NULL, ?)",
              [
                seller_id,
                new Date(),
                amountPost,
                0, // 0 = Pending, 1 = Processing, 2 = Paid, 3 = Rejected
              ],
              (err1, res1) => {
                if (!err1) {
                  console.log(`Successfully added ${amount} ${currencyCode} !`);
                  const sslCommerz = 1;
                  //  1 = accepted, 2 = rejected, 6 = pending
                  if (sslCommerz) {
                    res.redirect(
                      "/withDrawConfirm/" + sslCommerz + "/" + res1.insertId
                    );
                  } else {
                    res.send("SSL Commerz not available !");
                  }
                } else {
                  console.log(err1);
                  res.send(err1);
                }
              }
            );
          } else {
            res.send(`
            <script>
              alert("Insufficient money to withdraw !");
              window.history.go(-1);
            </script>
          `);
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
