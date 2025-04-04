const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.selectUploadProduct = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.userId)
      );
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [
        mainCat,
        subCat,
        extraCat,
        allCat,
        fetchFeaturedImages,
        tempImages,
        currRate,
      ] = await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
        catModel.fetchFeaturedTempImages(),
        catModel.fetchCurrencyRate(currencyCode),
      ]);
      var uID = crypto.decrypt(req.cookies.userId);
      var extraCatId = req.params.extraCatId;
      var oID = crypto.decrypt(req.cookies.order_id || "");
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName);
      db.query(
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
        [uID],
        (err1, res1) => {
          db.query(
            "SELECT * FROM `product_template` WHERE `extra_cat_id` = ? ORDER BY `product_template`.`temp_name` ASC",
            [extraCatId],
            (err2, res2) => {
              if (!err2) {
                db.query(
                  "SELECT * FROM `product_temp_video` WHERE `product_temp_id` = ?",
                  [res2[0]?.temp_id],
                  (err3, res3) => {
                    if (err3) {
                      res.send("Video Fetch Error");
                      console.error(err3);
                    }
                    // console.log("Temp ID: ", res2[0].temp_id)
                    var encImages = tempImages.map((item) => {
                      item.product_temp_id = crypto.smallEncrypt(
                        item.product_temp_id
                      );
                      return item;
                    });
                    var encCart = res1.map((item) => {
                      item.product_id = crypto.smallEncrypt(item.product_id);
                      return item;
                    });
                    var encProduct = res2.map((item) => {
                      item.temp_id = crypto.smallEncrypt(item.temp_id);
                      return item;
                    });
                    var encFeaturedImages = fetchFeaturedImages.map((item) => {
                      item.product_id = crypto.smallEncrypt(item.product_id);
                      return item;
                    });

                    res.render("selectUploadProduct", {
                      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      userName: userName,
                      userImage: userImage,
                      cart: encCart,
                      login_status: isLogged,
                      subCat: subCat,
                      mainCat: mainCat,
                      extraCat: extraCat,
                      allCat: allCat,
                      images: encFeaturedImages,
                      products: encProduct,
                      temp_images: encImages,
                      temp_video: res3,
                      notification: notification,
                    });
                  }
                );
              } else {
                res.send(err2);
              }
            }
          );
        }
      );
    } catch (err) {
      console.error(err);
      // Handle error and send appropriate response
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};
