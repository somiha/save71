const db = require("../config/database.config");
const { queryAsyncWithoutValue } = require("../config/helper");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

const { queryAsync } = require("../config/helper");

exports.allExtraCategory = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    return res.redirect("/login");
  }

  try {
    const userId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName);

    const [
      notification,
      mainCat,
      subCat,
      extraCat,
      allCat,
      images,
      currRate,
      cart,
    ] = await Promise.all([
      catModel.fetchAllNotifications(userId),
      catModel.fetchMainCat(),
      catModel.fetchSubCat(),
      catModel.fetchExtraCat(),
      catModel.fetchAllCat(),
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      queryAsync(
        "SELECT * FROM `orders` \
         INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` \
         INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` \
         WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 \
         ORDER BY `orders`.`order_id` DESC",
        [userId]
      ),
    ]);

    let trendingCat = await queryAsyncWithoutValue(
      "SELECT \
    ec.extra_cat_id, \
    ec.extra_cat_name, \
    ec.extra_cat_image_url, \
    SUM(od.product_quantity) AS total_sold_quantity \
FROM order_details od \
JOIN products p ON od.product_id = p.product_id \
JOIN extra_cat ec ON p.product_cat_id = ec.extra_cat_id \
WHERE od.created_at >= NOW() - INTERVAL 7 DAY \
GROUP BY ec.extra_cat_id, ec.extra_cat_name, ec.extra_cat_image_url \
ORDER BY total_sold_quantity DESC \
LIMIT 10; \
"
    );

    console.log("trendingCat", trendingCat);

    if (!Array.isArray(trendingCat)) {
      trendingCat = [trendingCat]; // Convert to an array if it's a single object
    }

    const encImages = images.map((item) => {
      item.product_id = crypto.smallEncrypt(item.product_id);
      return item;
    });

    const encCart = cart.map((item) => {
      item.product_id = crypto.smallEncrypt(item.product_id);
      return item;
    });

    console.log("trendingCat", trendingCat[0]);

    res.render("all-extra-category", {
      ogImage: "https://admin.save71.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      notification,
      currencyCode,
      currRate,
      images: encImages,
      userName,
      userImage,
      cart: encCart,
      login_status: isLogged,
      subCat,
      mainCat,
      extraCat,
      allCat,
      trendingCat: trendingCat,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.apiAllExtraCategory = async (req, res) => {
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
    res.send({ extraCat: extraCat });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
