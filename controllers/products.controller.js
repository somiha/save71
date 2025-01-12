const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.products = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      console.log("currencyCode: ", currencyCode);

      const [currRate, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      var uID = crypto.decrypt(req.cookies.userId);
      var userName = crypto.decrypt(req.cookies.userName);
      var userImage = crypto.decrypt(req.cookies.userImage || "");

      // First Query
      db.query(
        "SELECT *, `shop`.`shop_custom_url` FROM `products` INNER JOIN `shop` ON `shop`.`id` = `products`.`seller_id` WHERE `shop`.`seller_user_id` = ? ORDER BY `products`.`product_name` ASC",
        [uID],
        (err1, res1) => {
          console.log(uID);

          if (!err1) {
            // Check if products are returned
            if (res1.length > 0) {
              db.query(
                "SELECT * FROM `products` INNER JOIN `shop` ON `shop`.`id` = `products`.`seller_id` INNER JOIN `product_image` ON `products`.`product_id` = `product_image`.`product_id` WHERE `shop`.`seller_user_id` = ? AND `product_image`.`featured_image` = 1",
                [uID],
                (err2, res2) => {
                  if (!err2) {
                    var images = res2.map((image) => {
                      image.product_id = crypto.smallEncrypt(image.product_id);
                      return image;
                    });

                    var products = res1.map((product) => {
                      product.product_id = crypto.smallEncrypt(
                        product.product_id
                      );
                      return product;
                    });

                    res.render("products", {
                      ogImage: "https://admin.save71.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      userName: userName,
                      userImage: userImage,
                      menuId: "shop-owner-products",
                      products: products,
                      images: images,
                      name: "Products",
                      notification: notification,
                      shop_custom_url: res1[0].shop_custom_url, // Access safely
                    });
                  } else {
                    res.status(500).send(err2);
                  }
                }
              );
            } else {
              // Handle no products case
              res.render("products", {
                ogImage: "https://admin.save71.com/images/logo-og.webp",
                ogTitle: "Save71 Connects You and the World through Business.",
                ogUrl: "https://admin-save71.lens-ecom.store",
                currRate,
                currencyCode,
                userName: userName,
                userImage: userImage,
                menuId: "shop-owner-products",
                products: [], // Empty products array
                images: [], // Empty images array
                name: "Products",
                notification: notification,
                shop_custom_url: "", // Provide fallback if no product found
              });
            }
          } else {
            res.status(500).send(err1);
          }
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};

exports.del_product = (req, res) => {
  var pID = crypto.smallDecrypt(req.params.id);
  var query = "DELETE FROM `products` WHERE `products`.`product_id` = ?";
  // console.log("Delete product id : " + pID);
  db.query(query, [pID], (err1, res1) => {
    if (!err1) {
      db.query(
        "DELETE FROM `product_image` WHERE `product_image`.`product_id` = ?",
        [pID],
        (err2, res2) => {
          if (!err2) {
            db.query(
              "DELETE FROM `product_video` WHERE `product_id` = ?",
              [pID],
              (err3, res3) => {
                if (!err3) {
                  res.redirect("/products");
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
  });
};

exports.unpublish_product = (req, res) => {
  var product_id = crypto.smallDecrypt(req.params.product_id);
  db.query(
    "UPDATE `products` SET `quantity` = '-1' WHERE `products`.`product_id` = ?",
    [product_id],
    (err1, res1) => {
      if (!err1) {
        res.redirect("/products");
      } else {
        res.send(err1);
      }
    }
  );
};

exports.publish_product = (req, res) => {
  var product_id = crypto.smallDecrypt(req.params.product_id);
  db.query(
    "UPDATE `products` SET `quantity` = '0' WHERE `products`.`product_id` = ?",
    [product_id],
    (err1, res1) => {
      if (!err1) {
        res.redirect("/products");
      } else {
        res.send(err1);
      }
    }
  );
};
