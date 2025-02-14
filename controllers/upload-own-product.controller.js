const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const mult_upload = require("../config/multer_product.config");
const crypto = require("../middlewares/crypto");

exports.uploadOwnProduct = async (req, res) => {
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
    var sID = crypto.decrypt(req.cookies.seller_id);

    if (isLogged) {
      db.query(
        "SELECT * FROM `extra_cat` ORDER BY `extra_cat`.`extra_cat_name` ASC",
        (err1, res1) => {
          if (!err1) {
            var uID = crypto.decrypt(req.cookies.userId);
            db.query(
              "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` INNER JOIN `user` ON `orders`.`user_id` = `user`. `user_id` WHERE `orders`.`user_id` = ?",
              [uID],
              (err2, res2) => {
                if (err2) {
                  res.send(err2);
                  console.log(err2);
                  return;
                }
                db.query(
                  "SELECT * FROM `shop` WHERE `id` = ?",
                  [sID],
                  (err3, res3) => {
                    if (err3) {
                      res.send(err3);
                      console.log(err3);
                      return;
                    }

                    var encImages = images.map((item) => {
                      item.product_id = crypto.smallEncrypt(item.product_id);
                      return item;
                    });
                    var encCart = res2.map((item) => {
                      item.product_id = crypto.smallEncrypt(item.product_id);
                      return item;
                    });
                    res.render("upload-own-product", {
                      ogImage: "https://admin.save71.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      images: encImages,
                      userName: userName,
                      name: "Add Own Product",
                      userImage: userImage,
                      extra_cat: res1,
                      cart: encCart,
                      login_status: isLogged,
                      subCat: subCat,
                      mainCat: mainCat,
                      extraCat: extraCat,
                      allCat: allCat,
                      notification: notification,
                      shop_type: res3[0].shop_type,
                      menuId: "shop-owner-products",
                      pic_url: res2[0]?.pic_url,
                    });
                  }
                );
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
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};

exports.uploadOwnProductPost = async (req, res) => {
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
    mult_upload.fields([
      { name: "productImages", maxCount: 10 },
      { name: "product_video", maxCount: 1 },
      { name: "product_des", maxCount: 1 },
    ])(req, res, function (error) {
      if (error) {
        console.error("Error uploading files:", error);
        return res.status(500).send("Error uploading files");
      }

      var seller_id = crypto.decrypt(req.cookies.seller_id);
      var {
        product_name,
        regular_price,
        product_price,
        category,
        product_des,
        product_short_des,
        featured_index,
      } = req.body;

      product_name = product_name.trim().slice(0, 100);
      product_short_des = product_short_des.trim().slice(0, 150);
      console.log("Uploaded files:", req.files); // Debugging
      var picUrls = [];
      var featured_image_index = 0;
      if (req.files["productImages"]) {
        console.log("Featured index: ", featured_index);
        picUrls = req.files["productImages"].map(
          (file) => "https://save71.com/images/products/" + file.filename
        );
        featured_image_index =
          featured_index == undefined ? 0 : parseInt(featured_index);
        picUrls.forEach((element) => {
          // console.log(element);
        });
      }

      // console.log("f : ", featured_image_index, " body : ", featured_index)
      var video_url = req.files["product_video"]
        ? "https://save71.com/images/products/" +
          req.files["product_video"][0].filename
        : null;

      // Insert product information into the database
      var query =
        "INSERT INTO `products` (`product_id`, `product_name`, `regular_price`, `product_price`, `product_short_des`, `product_details_des`, `product_cat_id`, `seller_id`, `sell_count`, `quantity`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(
        query,
        [
          product_name,
          regular_price / currRate,
          product_price / currRate,
          product_short_des,
          product_des,
          category,
          seller_id,
          0,
          0,
        ],
        function (err, result) {
          if (err) {
            console.log("Database query error:", err);
            return res.status(500).send("Error: " + err.message);
          }

          // Inserted product successfully, retrieve the product ID
          var product_id = result.insertId;
          var encrypted_product_id = crypto.urlEncrypt(product_id, 1);
          // console.log("Product ID:", encrypted_product_id);

          // Insert image URLs into the database
          if (picUrls.length > 0) {
            var imageQuery =
              "INSERT INTO `product_image` (id, product_id, product_image_url, featured_image) VALUES ?";
            var imageValues = picUrls.map((picUrl, index) => [
              null,
              product_id,
              picUrl,
              index === featured_image_index ? 1 : 0,
            ]);
            // console.log("imageValues:", imageValues);
            db.query(imageQuery, [imageValues], function (err, result) {
              if (err) {
                console.log("Database query error:", err);
                return res.status(500).send("Error: " + err.message);
              }

              // Images inserted successfully
              console.log("FAQ Sending");
              res.redirect("/getFaq/" + encrypted_product_id);
            });
          } else {
            // No images uploaded, send success message
            console.log("FAQ Sending");
            res.redirect("/getFaq/" + encrypted_product_id);
          }

          // Update video URL in the database
          if (video_url) {
            var videoQuery =
              "INSERT INTO `product_video` (`id`, `product_id`, `product_video_url`, `featured_video`) VALUES (NULL, ?, ?, NULL)";
            db.query(
              videoQuery,
              [product_id, video_url],
              function (err, result) {
                if (err) {
                  console.log("Database query error:", err);
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};

exports.addProductFromStore = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    console.log("body", req.body);
    var { product_id, regular_price, product_price, product_name } = req.body;
    product_name = product_name.trim().slice(0, 100);
    // console.log('Upload product : ', product_id, product_price, product_name)
    product_id = crypto.smallDecrypt(product_id);
    // console.log('Upload product : ', product_id, product_price, product_name)
    var seller_id = crypto.decrypt(req.cookies.seller_id);
    var p_id;
    var query =
      "INSERT INTO `products` (`product_id`, `product_name`, `regular_price`, `product_price`, `product_short_des`, `product_details_des`, `product_cat_id`, `seller_id`, `sell_count`, `quantity`, `status`, `admin_published`, `is_branded`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, '0', '0', '1', '1', '0')";
    db.query(
      "SELECT * FROM `products` WHERE `product_id` = ?",
      [product_id],
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
              res3[0].product_short_des,
              res3[0].product_details_des,
              res3[0].product_cat_id,
              seller_id,
            ],
            (err1, res1) => {
              if (err1) {
                res.send(err1);
              }
              p_id = res1.insertId;
              // console.log("Details des : ", res3[0].product_details_des)
              db.query(
                "SELECT * FROM `product_image` WHERE `product_id` = ?",
                [product_id],
                (err11, res11) => {
                  if (!err11) {
                    db.query(
                      "SELECT * FROM `product_video` WHERE `product_id` = ?",
                      [product_id],
                      (err22, res22) => {
                        if (!err22) {
                          db.query(
                            "SELECT * FROM `products` WHERE `products`.`product_id` = ? ORDER BY `products`.`product_id` DESC",
                            [p_id],
                            (err1, res1) => {
                              if (!err1) {
                                // console.log("product_id : " + p_id)
                                for (var i = 0; i < res11.length; i++) {
                                  db.query(
                                    "INSERT INTO `product_image` (`id`, `product_id`, `product_image_url`, `featured_image`) VALUES (NULL, ?, ?, ?)",
                                    [
                                      p_id,
                                      res11[i].product_image_url,
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
                                    [p_id, res22[0].product_video_url],
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
                                console.log("PID : ", product_id);
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
          );
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
