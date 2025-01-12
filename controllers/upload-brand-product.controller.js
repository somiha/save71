const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.uploadBrandProduct = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    res.redirect("/login");
    return;
  }
  try {
    const notification = await catModel.fetchAllNotifications(
      crypto.decrypt(req.cookies.userId)
    );
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
    var userImage = crypto.decrypt(req.cookies.userImage || "");
    var userName = crypto.decrypt(req.cookies.userName);
    if (isLogged) {
      var uID = crypto.decrypt(req.cookies.userId);
      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?",
        [uID],
        (err1, res1) => {
          db.query(
            "SELECT * FROM `product_template` ORDER BY `product_template`.`temp_name` ASC",
            (err2, res2) => {
              if (!err2) {
                // console.log(res2)
                var encImages = images.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });
                var encCart = res1.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });
                res.render("upload-brand-product", {
                  ogImage: "https://admin.save71.com/images/logo-og.webp",
                  ogTitle:
                    "Save71 Connects You and the World through Business.",
                  ogUrl: "https://admin-save71.lens-ecom.store",
                  notification: notification,
                  currRate,
                  currencyCode,
                  images: encImages,
                  userName: userName,
                  userImage: userImage,
                  temp_product: res2,
                  cart: encCart,
                  login_status: isLogged,
                  subCat: subCat,
                  mainCat: mainCat,
                  extraCat: extraCat,
                  allCat: allCat,
                });
              } else {
                console.error(err2);
                res
                  .status(500)
                  .send("An error occurred while selecting template products.");
                return;
              }
            }
          );
        }
      );
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

exports.uploadBrandProductPost = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    var { extra_id, temp_id, regular_price, product_price, product_name } =
      req.body;
    product_name = product_name.trim().slice(0, 100);

    temp_id = crypto.smallDecrypt(temp_id);
    console.log(
      "Upload product : ",
      extra_id,
      temp_id,
      regular_price,
      product_price,
      product_name
    );
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    var product_id;
    var query =
      "INSERT INTO `products` (`product_id`, `product_name`, `regular_price`, `product_price`, `product_short_des`, `product_details_des`, `product_cat_id`, `seller_id`, `sell_count`, `quantity`, `status`, `admin_published`, `is_branded`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, '0', '0', '1', '1', '1')";
    db.query(
      "SELECT * FROM `product_template` WHERE `temp_id` = ?",
      [temp_id],
      (err3, res3) => {
        if (err3) {
          res.send(err3);
        } else {
          db.query(
            query,
            [
              product_name,
              regular_price / currRate,
              product_price / currRate,
              res3[0].temp_short_des,
              res3[0].temp_long_des,
              extra_id,
              seller_id,
            ],
            (err1, res1) => {
              if (err1) {
                res.send(err1);
              }
              product_id = res1.insertId;
            }
          );
          db.query(
            "SELECT * FROM `product_temp_images` WHERE `product_temp_id` = ?",
            [temp_id],
            (err11, res11) => {
              if (!err11) {
                db.query(
                  "SELECT * FROM `product_temp_video` WHERE `product_temp_id` = ?",
                  [temp_id],
                  (err22, res22) => {
                    if (!err22) {
                      db.query(
                        "SELECT * FROM `products` WHERE `products`.`seller_id` = ? ORDER BY `products`.`product_id` DESC",
                        [seller_id],
                        (err1, res1) => {
                          if (!err1) {
                            // console.log("product_id : " + product_id)
                            for (var i = 0; i < res11.length; i++) {
                              db.query(
                                "INSERT INTO `product_image` (`id`, `product_id`, `product_image_url`, `featured_image`) VALUES (NULL, ?, ?, ?)",
                                [
                                  product_id,
                                  res11[i].temp_image_url,
                                  res11[i].featured_image,
                                ],
                                (err2, res2) => {
                                  if (!err2) {
                                  } else {
                                    console.error(err2);
                                    res
                                      .status(500)
                                      .send(
                                        "An error occurred while inserting product image."
                                      );
                                    return;
                                  }
                                }
                              );
                            }
                            if (res22.length > 0) {
                              db.query(
                                "INSERT INTO `product_video` (`id`, `product_id`, `product_video_url`, `featured_video`) VALUES (NULL, ?, ?, NULL)",
                                [product_id, res22[0].temp_video_url],
                                (vidErr, vidRes) => {
                                  if (vidErr) {
                                    console.error(vidErr);
                                    res
                                      .status(500)
                                      .send(
                                        "An error occurred while uploading video."
                                      );
                                    return;
                                  }
                                }
                              );
                            }
                            // console.log("PID : ", product_id)
                            res.redirect(
                              "/getFaq/" + crypto.urlEncrypt(product_id, 1)
                            );
                          } else {
                            console.error(err1);
                            res
                              .status(500)
                              .send(
                                "An error occurred while selecting products."
                              );
                            return;
                          }
                        }
                      );
                    } else {
                      res.send(err22);
                    }
                  }
                );
              } else {
                res.send(err11);
              }
            }
          );
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
