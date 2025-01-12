const db = require("../config/database.config");

exports.getSortedShopsByDistance = (userLat, userLng) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT *, \
          CAST(6371 * 2 * ASIN(SQRT(POWER(SIN((? - ABS(shop_location_lt)) * PI() / 180 / 2), 2) + COS(? * PI() / 180) * COS(ABS(shop_location_lt) * PI() / 180) * POWER(SIN((? - shop_location_long) * PI() / 180 / 2), 2))) AS DECIMAL(10, 2)) AS distance \
          FROM shop \
          ORDER BY distance ASC",
      [parseFloat(userLat), parseFloat(userLat), parseFloat(userLng)],
      (err, shops) => {
        if (err) {
          console.error(err);
          reject("Error fetching sorted shops from the database");
        } else {
          const sortedShops = shops.map((shop) => {
            const distanceKm = Number(shop.distance).toFixed(2);
            const distanceMeters = (distanceKm * 1000).toFixed(2);
            return { ...shop, distanceMeters, distanceKm };
          });
          resolve(sortedShops);
        }
      }
    );
  });
};

exports.getSortedShopsAndProductsByDistance = (
  userLat,
  userLng,
  seller_id,
  shop_type,
  limit_per_shop
) => {
  return new Promise((resolve, reject) => {
    let sql =
      "SELECT * FROM ( \
        SELECT *, \
            CAST(6371 * 2 * ASIN(SQRT(POWER(SIN((? - ABS(shop_location_lt)) * PI() / 180 / 2), 2) + COS(? * PI() / 180) * COS(ABS(shop_location_lt) * PI() / 180) * POWER(SIN((? - shop_location_long) * PI() / 180 / 2), 2))) AS DECIMAL(10, 2)) AS distance, \
            ROW_NUMBER() OVER(PARTITION BY shop.id ORDER BY distance ASC) as rn \
        FROM shop \
        INNER JOIN products ON shop.id = products.seller_id \
        WHERE NOT products.quantity = -1 AND status = 1 AND admin_published = 1";

    let params = [
      parseFloat(userLat),
      parseFloat(userLat),
      parseFloat(userLng),
    ];

    if (seller_id) {
      sql += " AND NOT shop.seller_user_id = ?";
      params.push(seller_id);
    }

    if (shop_type) {
      sql += " AND shop.shop_type = ?";
      params.push(shop_type);
    }

    if (limit_per_shop) {
      sql += ") t WHERE t.rn <= ? ORDER BY t.distance ASC";
      params.push(limit_per_shop);
    } else {
      sql += ") t ORDER BY t.distance ASC";
    }

    db.query(sql, params, (err, shops) => {
      if (err) {
        console.error(err);
        reject("Error fetching sorted shops from the database");
      } else {
        const sortedShops = shops.map((shop) => {
          const distanceKm = Number(shop.distance).toFixed(2);
          const distanceMeters = (distanceKm * 1000).toFixed(2);
          return { ...shop, distanceMeters, distanceKm };
        });
        resolve(sortedShops);
      }
    });
  });
};

exports.getSortedShopsAndProductsByPopularity = (
  userLat,
  userLng,
  seller_id,
  shop_type,
  limit_per_shop
) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM ( \
          SELECT *, \
              CAST(6371 * 2 * ASIN(SQRT(POWER(SIN((? - ABS(shop_location_lt)) * PI() / 180 / 2), 2) + COS(? * PI() / 180) * COS(ABS(shop_location_lt) * PI() / 180) * POWER(SIN((? - shop_location_long) * PI() / 180 / 2), 2))) AS DECIMAL(10, 2)) AS distance, \
              ROW_NUMBER() OVER(PARTITION BY shop.id ORDER BY products.sell_count DESC) as rn \
          FROM shop \
          INNER JOIN products ON shop.id = products.seller_id \
          WHERE shop.shop_type = ? \
          AND NOT shop.seller_user_id = ? \
          AND NOT products.quantity = -1 \
          AND status = 1 \
          AND admin_published = 1 \
      ) t \
      WHERE t.rn <= ? \
      ORDER BY t.sell_count DESC",
      [
        parseFloat(userLat),
        parseFloat(userLat),
        parseFloat(userLng),
        shop_type,
        seller_id,
        limit_per_shop,
      ],
      (err, shops) => {
        if (err) {
          console.error(err);
          reject("Error fetching sorted shops from the database");
        } else {
          const sortedShops = shops.map((shop) => {
            const distanceKm = Number(shop.distance).toFixed(2);
            const distanceMeters = (distanceKm * 1000).toFixed(2);
            return { ...shop, distanceMeters, distanceKm };
          });
          resolve(sortedShops);
        }
      }
    );
  });
};

exports.getRelatedProducts = (product_id) => {
  // select the product then find the shop_id the get that shops products
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM products WHERE seller_id = (SELECT seller_id FROM products WHERE product_id = ?) AND NOT product_id = ?",
      [product_id, product_id],
      (err, products) => {
        if (err) {
          console.error(err);
          reject("Error fetching related products from the database");
        } else {
          // console.log(products, product_id);
          resolve(products);
        }
      }
    );
  });
};
