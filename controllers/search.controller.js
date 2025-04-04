// search.controller.js

const db = require("../config/database.config");
const catModel = require("../middlewares/cat");
const crypto = require("../middlewares/crypto");

exports.search = async (req, res) => {
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
      const query = req.query.q;
      var uID = crypto.decrypt(req.cookies.userId);

      // Get user's current location
      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }

      // Use the function directly in the template string
      // calculated distance is in kilometers
      const sql = `
      SELECT
      p.product_id AS id,
      p.product_name AS name,
      s.shop_custom_url AS shop_custom_url,
      'product' AS type,
      p.product_price AS price,
      p.seller_id AS seller_id,
      (6371 * acos(cos(radians(?)) * cos(radians(s.shop_location_lt)) * cos(radians(s.shop_location_long) - radians(?)) + sin(radians(?)) * sin(radians(s.shop_location_lt)))) AS distance
    FROM products p
    INNER JOIN shop s ON p.seller_id = s.id
    WHERE
      p.product_name LIKE ?
      AND p.quantity = 0
      AND p.status = 1
      AND p.admin_published = 1
    UNION
    SELECT
      s.id AS id,
      s.shop_name AS name,
      s.shop_custom_url AS shop_custom_url,
      'shop' AS type,
      NULL AS price,
      NULL AS seller_id,
      (6371 * acos(cos(radians(?)) * cos(radians(s.shop_location_lt)) * cos(radians(s.shop_location_long) - radians(?)) + sin(radians(?)) * sin(radians(s.shop_location_lt)))) AS distance
    FROM shop s
    WHERE
      s.shop_number LIKE ?
      OR s.shop_name LIKE ?
    ORDER BY distance
      `;

      db.query(
        sql,
        [
          userLat,
          userLng,
          userLat,
          `%${query}%`,
          userLat,
          userLng,
          userLat,
          `%${query}%`,
          `%${query}%`,
        ],
        (err, results) => {
          if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
          }
          const userImage = crypto.decrypt(req.cookies.userImage || "");
          const userName = crypto.decrypt(req.cookies.userName);

          db.query(
            "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
            [uID],
            (err1, res1) => {
              if (!err1) {
                var encImages = images.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });
                var encCart = res1.map((item) => {
                  item.product_id = crypto.smallEncrypt(item.product_id);
                  return item;
                });

                results.map((item) => {
                  if (item.type === "product") {
                    item.id = crypto.smallEncrypt(item.id);
                    var image = encImages.find(
                      (image) => image.product_id === item.id
                    );
                    item.product_image_url = image
                      ? image.product_image_url
                      : "";
                    item.product_price = item.price;
                    item.distanceMeters = (item.distance * 1000).toFixed(2);
                    item.distanceKm = item.distance.toFixed(2);
                  }
                });
                res.render("search", {
                  ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                  ogTitle:
                    "Save71 Connects You and the World through Business.",
                  ogUrl: "https://admin-save71.lens-ecom.store",
                  currencyCode,
                  currRate,
                  cart: encCart,
                  userImage,
                  images: encImages,
                  userName,
                  results,
                  query,
                  login_status: isLogged,
                  subCat: subCat,
                  mainCat: mainCat,
                  extraCat: extraCat,
                  allCat: allCat,
                  notification: notification,
                });
              } else {
                res.send(err1);
              }
            }
          );
        }
      );
    } catch (err) {
      console.error(err);
      // Handle error and send an appropriate response
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
};

// const sql = `
//       SELECT id AS id, shop_name AS name, 'shop' AS type, NULL AS price, NULL AS seller_id
//       FROM shop
//       WHERE shop_number LIKE '%${query}%' OR shop_name LIKE '%${query}%'
//       UNION
//       SELECT product_id AS id, product_name AS name, 'product' AS type, product_price AS price, seller_id AS seller_id
//       FROM products
//       WHERE product_name LIKE '%${query}%' AND quantity = 0 AND quantity = 0 AND status = 1 AND admin_published = 1
//   `;

exports.getSuggestions = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);
    const [images, currRate] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
    ]);
    const query = req.body.query;
    // Get user's current location
    const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
    const userLat = crypto.decrypt(location.latitude);
    const userLng = crypto.decrypt(location.longitude);

    if (!userLat || !userLng) {
      return res
        .status(400)
        .json({ error: "User location is missing or invalid." });
    }
    const sql = `
          SELECT * FROM (
            SELECT
              s.shop_name AS name,
              s.shop_custom_url AS shop_custom_url,
              'shop' AS type,
              s.id AS id,
              NULL AS price,
              1 AS sort_order,
              (6371 * acos(cos(radians(?)) * cos(radians(s.shop_location_lt)) * cos(radians(s.shop_location_long) - radians(?)) + sin(radians(?)) * sin(radians(s.shop_location_lt)))) AS distance
            FROM shop s
            WHERE
              s.shop_name LIKE ?
              OR s.shop_number LIKE ?
            UNION
            SELECT
              p.product_name AS name,
              NULL AS shop_custom_url,
              'product' AS type,
              p.product_id AS id,
              p.product_price AS price,
              2 AS sort_order,
              (6371 * acos(cos(radians(?)) * cos(radians(s.shop_location_lt)) * cos(radians(s.shop_location_long) - radians(?)) + sin(radians(?)) * sin(radians(s.shop_location_lt)))) AS distance
            FROM products p
            INNER JOIN shop s ON p.seller_id = s.id
            WHERE
              p.product_name LIKE ?
              AND p.quantity = 0
              AND p.status = 1
              AND p.admin_published = 1
          ) AS results
          ORDER BY sort_order, distance ASC
          `;

    db.query(
      sql,
      [
        userLat,
        userLng,
        userLat,
        `%${query}%`,
        `%${query}%`,
        userLat,
        userLng,
        userLat,
        `%${query}%`,
      ],
      (err, results) => {
        if (err) throw err;
        results.forEach((result) => {
          // console.log(result)
          result.currRate = currRate;
          result.currencyCode = currencyCode;
          if (result.type === "product") {
            const matchingImage = images.find(
              (image) => image.product_id === result.id
            );
            if (matchingImage) {
              result.product_image_url = matchingImage.product_image_url;
            }
            result.id = crypto.smallEncrypt(result.id);
          }
        });
        res.json(results);
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
