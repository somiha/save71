const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.subCat = async (req, res) => {
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

    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      res.redirect("/login");
      return;
    }
    var uID = crypto.decrypt(req.cookies.userId);
    var subId = req.params.sub_cat_id;
    var userImage = crypto.decrypt(req.cookies.userImage || "");
    var userName = crypto.decrypt(req.cookies.userName);
    db.query(
      "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
      [uID],
      (err1, res1) => {
        var encImages = images.map((item) => {
          item.product_id = crypto.smallEncrypt(item.product_id);
          return item;
        });
        var encCart = res1.map((item) => {
          item.product_id = crypto.smallEncrypt(item.product_id);
          return item;
        });
        res.render("sub-category", {
          ogImage: "https://admin.save71.com/images/logo-og.webp",
          ogTitle: "Save71 Connects You and the World through Business.",
          ogUrl: "https://admin-save71.lens-ecom.store",
          notification: notification,
          currRate,
          currencyCode,
          images: encImages,
          userName: userName,
          userImage: userImage,
          cart: encCart,
          subId: subId,
          login_status: isLogged,
          subCat: subCat,
          mainCat: mainCat,
          extraCat: extraCat,
          allCat: allCat,
        });
      }
    );
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};
