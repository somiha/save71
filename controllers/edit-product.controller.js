const db = require("../config/database.config");

const multer = require("multer");
const mult_upload = require("../config/multer_product.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");
const DOMPurify = require("dompurify")();

exports.edit_product = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
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
      var uID = crypto.decrypt(req.cookies.userId);
      var sID = crypto.decrypt(req.cookies.seller_id);
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);
      var pID = req.params.id;
      var usepID = pID;
      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          if (!err1) {
            db.query(
              "SELECT * FROM `products` WHERE `products`.`product_id` = ?",
              [usepID],
              (err2, res2) => {
                // console.log(res2[0].is_branded);
                if (!err2) {
                  db.query(
                    "SELECT * FROM `product_image` WHERE `product_id` = ?",
                    [usepID],
                    (err3, res3) => {
                      if (!err3) {
                        db.query(
                          "SELECT * FROM `product_video` WHERE `product_id` = ?",
                          [usepID],
                          (err4, res4) => {
                            if (!err4) {
                              db.query(
                                "SELECT * FROM `shop` WHERE `shop`.`id` = ?",
                                [sID],
                                (err5, res5) => {
                                  if (err5) {
                                    console.log(err5);
                                    res.send(err5);
                                    return;
                                  }

                                  console.log("Videos: ", res4, usepID);

                                  var images = res3.map((image) => {
                                    image.product_id = crypto.smallEncrypt(
                                      image.product_id
                                    );
                                    return image;
                                  });
                                  var images1 = images.map((image) => {
                                    image.product_id = crypto.smallDecrypt(
                                      image.product_id
                                    );
                                    return image;
                                  });
                                  var products = res2.map((product) => {
                                    product.product_id = crypto.smallEncrypt(
                                      product.product_id
                                    );
                                    return product;
                                  });
                                  var encCart = res1.map((item) => {
                                    item.product_id = crypto.smallEncrypt(
                                      item.product_id
                                    );
                                    return item;
                                  });

                                  res.render("edit-product", {
                                    ogImage:
                                      "https://admin.saveneed.com/images/logo-og.webp",
                                    ogTitle:
                                      "Save71 Connects You and the World through Business.",
                                    ogUrl:
                                      "https://admin-save71.lens-ecom.store",
                                    currencyCode,
                                    currRate,
                                    images: images,
                                    images1: images1,
                                    userImage: userImage,
                                    userName: userName,
                                    cart: encCart,
                                    login_status: isLogged,
                                    product: products,
                                    subCat: subCat,
                                    mainCat: mainCat,
                                    extraCat: extraCat,
                                    allCat: allCat,
                                    video: res4,
                                    notification: notification,
                                    shop_type: res5[0].shop_type,
                                  });
                                }
                              );
                            } else {
                              res.send(err4);
                              return;
                            }
                          }
                        );
                      } else {
                        res.send(err3);
                        return;
                      }
                    }
                  );
                } else {
                  console.log(err2);
                  res.send(err2);
                  return;
                }
              }
            );
          } else {
            res.send(err1);
            return;
          }
        }
      );
    } catch (err) {
      console.error(err);
      // Handle error and send appropriate response
      res.status(500).send("Internal Server Error");
      return;
    }
  } else {
    res.redirect("/login");
    return;
  }
};

// exports.edit_productPost = async (req, res) => {
//   try {
//     const currencyCode = crypto.decrypt(req.cookies.currencyCode);
//     const [currRate] = await Promise.all([
//       catModel.fetchCurrencyRate(currencyCode),
//     ]);
//     var pID = req.params.id;
//     var usepID = crypto.smallDecrypt(pID);
//     mult_upload.fields([
//       { name: "productImages", maxCount: 10 },
//       { name: "product_video", maxCount: 1 },
//       { name: "product_des", maxCount: 1 },
//     ])(req, res, function (error) {
//       if (error) {
//         console.error("Error uploading files:", error);
//         return res.status(500).send("Error uploading files");
//       }

//       var seller_id = crypto.decrypt(req.cookies.seller_id);
//       var {
//         product_name,
//         product_price,
//         category,
//         product_des,
//         product_short_des,
//         featured_index,
//         is_branded,
//       } = req.body;
//       product_name = product_name.trim().slice(0, 100);
//       product_short_des = product_short_des.trim().slice(0, 150);

//       var featured_image_index = parseInt(featured_index);

//       // console.log("Files : ", req.files)
//       if (req.files) {
//         var pic_urls = req.files["productImages"]
//           ? req.files["productImages"].map(
//               (file) => "https://saveneed.com/images/products/" + file.filename
//             )
//           : [];
//         var video_url = req.files["product_video"]
//           ? "https://saveneed.com/images/products/" +
//             req.files["product_video"][0].filename
//           : null;
//       }

//       // Insert product information into the database
//       var query =
//         "UPDATE `products` SET `product_name` = ?, `product_price` = ?, `product_short_des` = ?, `product_details_des` = ?, `product_cat_id` = ?, `seller_id` = ?, `sell_count` = ?, `quantity` = ?, `status` = ? WHERE `product_id` = ?";
//       db.query(
//         query,
//         [
//           product_name,
//           product_price / currRate,
//           product_short_des,
//           product_des,
//           category,
//           seller_id,
//           0,
//           0,
//           2,
//           usepID,
//         ],
//         function (err, result) {
//           if (err) {
//             console.log("Database query error:", err);
//             return res.status(500).send("Error: " + err.message);
//           }
//           var product_id = result.insertId;
//           if (pic_urls && pic_urls.length > 0) {
//             // db.query(
//             //   "DELETE FROM `product_image` WHERE `product_image`.`product_id` = ?",
//             //   [usepID],
//             //   (err1, res1) => {
//             //     if (err1) res.send(err1);
//             //     return;
//             //   }
//             // );
//             var imageQuery =
//               "INSERT INTO `product_image` (`id`, `product_id`, `product_image_url`, `featured_image`) VALUES (NULL, ?, ?, ?) ";
//             var imageValues = pic_urls.map((url, index) => [
//               usepID,
//               url,
//               index === featured_image_index ? 1 : 0,
//             ]);
//             // console.log(imageValues);
//             var completedQueries = 0;
//             var totalQueries = imageValues.length;

//             imageValues.forEach((values) => {
//               db.query(imageQuery, values, function (err, result) {
//                 if (err) {
//                   console.log("Database query error:", err);
//                   return res.status(500).send("Error: " + err.message);
//                 }
//                 // Images updated successfully
//                 completedQueries++;
//                 console.log("Values ", values);

//                 if (completedQueries === totalQueries) {
//                   // All image updates completed, move to the next step
//                   updateVideo();
//                 }
//               });
//             });
//           } else {
//             // No image updates, move to updating video URL
//             updateVideo();
//           }

//           function updateVideo() {
//             // Update video URL in the database
//             if (video_url) {
//               var videoQuery =
//                 "UPDATE `product_video` SET `product_video_url` = ? WHERE `product_id` = ?";
//               db.query(
//                 "SELECT * FROM `product_video` WHERE `product_id` = ?",
//                 [usepID],
//                 (err, res) => {
//                   if (err) {
//                     console.log("Database query error:", err);
//                     return res.status(500).send("Error: " + err.message);
//                   }
//                   if (res.length > 0) {
//                     db.query(
//                       videoQuery,
//                       [video_url, usepID],
//                       function (err, result) {
//                         if (err) {
//                           console.log("Database query error:", err);
//                         }
//                         // Video updated successfully
//                         updateDescription();
//                       }
//                     );
//                   } else {
//                     db.query(
//                       "INSERT INTO `product_video` (`id`, `product_id`, `product_video_url`) VALUES (NULL, ?, ?)",
//                       [usepID, video_url],
//                       function (err, result) {
//                         if (err) {
//                           console.log("Database query error:", err);
//                         }
//                         // Video updated successfully
//                         updateDescription();
//                       }
//                     );
//                   }
//                 }
//               );
//             } else {
//               // No video update, move to updating description
//               updateDescription();
//             }
//           }

//           function updateDescription() {
//             // Update description in the database
//             var descQuery =
//               "UPDATE `products` SET `product_short_des` = ?, `product_details_des` = ? WHERE `product_id` = ?";
//             db.query(
//               descQuery,
//               [product_short_des, product_des, usepID],
//               function (err, result) {
//                 if (err) {
//                   console.log("Database query error:", err);
//                 }
//                 // Description updated successfully
//                 res.redirect("/getFaq/" + encodeURIComponent(pID));
//               }
//             );
//           }
//         }
//       );
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.edit_productPost = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    var pID = req.params.id;
    var usepID = crypto.smallDecrypt(pID);

    mult_upload.fields([
      { name: "productImages", maxCount: 10 },
      { name: "product_video", maxCount: 1 },
      { name: "product_des", maxCount: 1 },
    ])(req, res, async function (error) {
      if (error) {
        console.error("Error uploading files:", error);
        return res.status(500).send("Error uploading files");
      }

      var seller_id = crypto.decrypt(req.cookies.seller_id);
      var {
        product_name,
        product_price,
        category,
        product_des,
        product_short_des,
        featured_index,
      } = req.body;
      // const product_des1 = product_des.replace(/<\/?[^>]+(>|$)/g, "");

      product_name = product_name.trim().slice(0, 100);
      product_short_des = product_short_des.trim().slice(0, 150);
      var featured_image_index = parseInt(featured_index);

      // Fetch the current product details
      const [existingProduct] = await db
        .promise()
        .query(
          "SELECT `product_name`, `product_price`, `product_short_des`, `product_details_des`, `product_cat_id` FROM `products` WHERE `product_id` = ?",
          [usepID]
        );

      if (existingProduct.length === 0) {
        return res.status(404).send("Product not found");
      }

      const currentProduct = existingProduct[0];
      const newPrice = product_price / currRate;

      // Check if only price has changed
      const isOnlyPriceChanged =
        currentProduct.product_price !== newPrice &&
        currentProduct.product_name === product_name &&
        currentProduct.product_short_des === product_short_des &&
        currentProduct.product_details_des === product_des &&
        currentProduct.product_cat_id === category;

      // If only price changed, update price and redirect to /products
      if (isOnlyPriceChanged) {
        await db
          .promise()
          .query(
            "UPDATE `products` SET `product_price` = ? WHERE `product_id` = ?",
            [newPrice, usepID]
          );
        return res.redirect("/products");
      }

      // Update other product details
      var query =
        "UPDATE `products` SET `product_name` = ?, `product_price` = ?, `product_short_des` = ?, `product_details_des` = ?, `product_cat_id` = ?, `seller_id` = ?, `sell_count` = ?, `quantity` = ?, `status` = ? WHERE `product_id` = ?";
      db.query(
        query,
        [
          product_name,
          newPrice,
          product_short_des,
          product_des,
          category,
          seller_id,
          0,
          0,
          2,
          usepID,
        ],
        function (err, result) {
          if (err) {
            console.log("Database query error:", err);
            return res.status(500).send("Error: " + err.message);
          }

          var pic_urls = req.files["productImages"]
            ? req.files["productImages"].map(
                (file) =>
                  "https://saveneed.com/images/products/" + file.filename
              )
            : [];
          var video_url = req.files["product_video"]
            ? "https://saveneed.com/images/products/" +
              req.files["product_video"][0].filename
            : null;

          // Update product images and video, then move to description update
          updateImagesAndVideo(
            pic_urls,
            video_url,
            featured_image_index,
            usepID,
            pID,
            product_short_des,
            product_des
          );
        }
      );
    });

    function updateImagesAndVideo(
      pic_urls,
      video_url,
      featured_image_index,
      usepID,
      pID,
      product_short_des,
      product_des
    ) {
      if (pic_urls.length > 0) {
        var imageQuery =
          "INSERT INTO `product_image` (`id`, `product_id`, `product_image_url`, `featured_image`) VALUES (NULL, ?, ?, ?)";
        var imageValues = pic_urls.map((url, index) => [
          usepID,
          url,
          index === featured_image_index ? 1 : 0,
        ]);

        imageValues.forEach((values, index) => {
          db.query(imageQuery, values, function (err, result) {
            if (err) {
              console.log("Database query error:", err);
              return res.status(500).send("Error: " + err.message);
            }

            // Once all images are updated, update the video
            if (index === imageValues.length - 1) {
              updateVideo(
                video_url,
                usepID,
                pID,
                product_short_des,
                product_des
              );
            }
          });
        });
      } else {
        // No images to update, move directly to video
        updateVideo(video_url, usepID, pID, product_short_des, product_des);
      }
    }

    function updateVideo(
      video_url,
      usepID,
      pID,
      product_short_des,
      product_des
    ) {
      if (video_url) {
        var videoQuery =
          "UPDATE `product_video` SET `product_video_url` = ? WHERE `product_id` = ?";
        db.query(videoQuery, [video_url, usepID], function (err, result) {
          if (err) {
            console.log("Database query error:", err);
            return res.status(500).send("Error: " + err.message);
          }
          updateDescription(product_short_des, product_des, usepID, pID);
        });
      } else {
        updateDescription(product_short_des, product_des, usepID, pID);
      }
    }

    function updateDescription(product_short_des, product_des, usepID, pID) {
      var descQuery =
        "UPDATE `products` SET `product_short_des` = ?, `product_details_des` = ? WHERE `product_id` = ?";
      db.query(
        descQuery,
        [product_short_des, product_des, usepID],
        function (err, result) {
          if (err) {
            console.log("Database query error:", err);
            return res.status(500).send("Error: " + err.message);
          }
          // After all updates are done, redirect to /getFaq
          res.redirect("/getFaq/" + encodeURIComponent(pID));
        }
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.delProductImage = async (req, res) => {
  const { delID } = req.params;
  console.log("Pic deleted : ", delID);
  db.query(
    "DELETE FROM `product_image` WHERE `product_image`.`id` = ?",
    [delID],
    (err1, res1) => {
      if (!err1) {
        res.redirect(200, "back");
      } else {
        console.log(err1);
        res1.status(500).send("Internal Server Error");
      }
    }
  );
};

exports.changeFeatured = async (req, res) => {
  const { productId, newId } = req.params;
  console.log("Pic changed : ", productId, " -> ", newId);
  db.query(
    "UPDATE `product_image` SET `featured_image` = '0' WHERE `product_image`.`product_id` = ?",
    [productId],
    (err1, res1) => {
      if (!err1) {
        console.log("Pic changed : ", productId, " -> ", newId);

        db.query(
          "UPDATE `product_image` SET `featured_image` = '1' WHERE `product_image`.`id` = ?",
          [newId],
          (err2, res2) => {
            if (!err2) {
              res.redirect(200, "back");
            } else {
              console.log(err2);
              res2.status(500).send("Internal Server Error");
            }
          }
        );
      } else {
        console.log(err1);
        res1.status(500).send("Internal Server Error");
      }
    }
  );
};

// exports.edit_branded_productPost = async (req, res) => {
//   try {
//     const currencyCode = crypto.decrypt(req.cookies.currencyCode);
//     const [currRate] = await Promise.all([
//       catModel.fetchCurrencyRate(currencyCode),
//     ]);
//     var pID = req.params.id;
//     var usepID = crypto.smallDecrypt(pID);
//     var { product_name, product_price } = req.body;
//     // console.log(pID, product_price);
//     db.query(
//       "UPDATE `products` SET `product_price` = ?, `product_name` = ? WHERE `product_id` = ?",
//       [product_price / currRate, product_name, usepID],
//       (err1, res1) => {
//         if (!err1) {
//           res.redirect("/getFaq/" + encodeURIComponent(pID));
//         } else {
//           res.send(err1);
//         }
//       }
//     );
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.edit_branded_productPost = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [currRate] = await Promise.all([
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    var pID = req.params.id;
    var usepID = crypto.smallDecrypt(pID);
    var { product_name, product_price } = req.body;

    // Fetch the current product details from the database
    const [existingProduct] = await db
      .promise()
      .query(
        "SELECT `product_name`, `product_price` FROM `products` WHERE `product_id` = ?",
        [usepID]
      );

    if (existingProduct.length === 0) {
      return res.status(404).send("Product not found");
    }

    const currentProduct = existingProduct[0];
    const newPrice = product_price / currRate;

    // Compare new values with existing values
    const isPriceChanged = currentProduct.product_price !== newPrice;
    const isNameChanged = currentProduct.product_name !== product_name;

    // Only update the product if something has changed
    if (isPriceChanged || isNameChanged) {
      await db
        .promise()
        .query(
          "UPDATE `products` SET `product_price` = ?, `product_name` = ? WHERE `product_id` = ?",
          [newPrice, product_name, usepID]
        );

      // Redirect to /getFaq only if the product name has changed
      if (isNameChanged) {
        return res.redirect("/getFaq/" + encodeURIComponent(pID));
      } else {
        // You can send a success response here if you don't want to redirect
        return res.redirect("/products");
      }
    } else {
      return res.send("No changes made.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
