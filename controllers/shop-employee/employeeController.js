const db = require("../../config/database.config");
const crypto = require("../../middlewares/crypto");
const catModel = require("../../middlewares/cat");
const mult_upload = require("../../config/multer_product.config");
const bcrypt = require("bcrypt");
const locationOptimizedDistance = require("../../middlewares/locationOptimizedDistance");
const {
  queryAsync,
  queryAsyncWithoutValue,
  getEndpointsOfEmployees,
} = require("../../config/helper");
const { name } = require("ejs");

exports.getAddEmplyee = async (req, res) => {
  const userId = crypto.decrypt(req.cookies.userId);
  const seller_id = crypto.decrypt(req.cookies.seller_id || "");
  const isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    return res.redirect("/login");
  }

  const [notification] = await Promise.all([
    catModel.fetchAllNotifications(userId),
  ]);

  const permissions = await queryAsync(
    "SELECT * FROM shop_employee_permissions"
  );

  res.render("shop-employee/add-employee", {
    menuId: "shop-owner-employee",
    name: "Employees",
    notification: notification,
    permissions,
  });
};

exports.myEmployees = async (req, res) => {
  try {
    // Decrypt the necessary cookies
    const userId = crypto.decrypt(req.cookies.userId);
    const seller_id = crypto.decrypt(req.cookies.seller_id || "");
    const isLogged = crypto.decrypt(req.cookies.login_status || "");

    if (!isLogged) {
      return res.redirect("/login");
    }

    const employeeQuery =
      "SELECT * FROM shop_employee WHERE shop_owner_seller_id = ?";

    const [notification] = await Promise.all([
      catModel.fetchAllNotifications(userId),
    ]);

    // Use db.query with a callback function instead of await
    db.query(employeeQuery, [seller_id], (err, employees) => {
      if (err) {
        console.error("Error fetching employees:", err);

        // Handle the error and respond with a 500 status code
        return res.status(500).json({
          status: false,
          message: "Internal Server Error!",
          error: err,
        });
      }

      // console.log("Employees:", employees, notification);

      // Render the page with the fetched employees data
      res.render("shop-employee/employees", {
        ogImage: "https://admin.saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "https://admin-save71.lens-ecom.store",
        menuId: "shop-owner-employee",
        employees, // Pass the employees data to the view
        name: "Employees",
        notification: notification,
      });
    });
  } catch (err) {
    console.error("Error:", err);

    // Handle errors in the try block
    res.status(500).json({
      status: false,
      message: "Internal Server Error!",
      error: err,
    });
  }
};

exports.enableOrDisableEmployee = async (req, res) => {
  const { id, status } = req.query;
  const userId = crypto.decrypt(req.cookies.userId);
  const seller_id = crypto.decrypt(req.cookies.seller_id || "");
  const isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    return res.redirect("/login");
  }

  const employee = await queryAsync(
    "SELECT * FROM shop_employee WHERE id = ? AND shop_owner_seller_id = ?",
    [id, seller_id]
  );
  if (employee.length == 0) {
    return res.send("Employee not found");
  }

  const query = `UPDATE shop_employee SET is_working = ? WHERE id = ? AND shop_owner_seller_id = ?`;
  db.query(query, [status, id, seller_id], (err, result) => {
    if (err) {
      console.log(err);
      return res.send(err);
    }
    res.redirect("employees");
  });
};

exports.addEmployee = async (req, res) => {
  let {
    name,
    email,
    password,
    confirmPassword,
    designation,
    mobile_number,
    address,
    permissions = [],
  } = req.body;

  const userId = crypto.decrypt(req.cookies.userId);
  const seller_id = crypto.decrypt(req.cookies.seller_id || "");
  const isLogged = crypto.decrypt(req.cookies.login_status || "");
  permissions = JSON.stringify(permissions);
  if (!isLogged) {
    return res.redirect("/login");
  }

  const shop = await queryAsync("SELECT * FROM shop WHERE seller_user_id = ?", [
    userId,
  ]);
  if (shop.length == 0) {
    return res.send("Shop not found");
  }

  if (password !== confirmPassword) {
    console.log("Passwords do not match");
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  // console.log(req.body, shop, seller_id, userId);

  try {
    db.query(
      "INSERT INTO `shop_employee` (`id`, `name`, `email`, `password`, `designation`, `mobile_number`, `address`, `shop_owner_seller_id`, `shop_id`, `shop_owner_user_id`, `permissions`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        email,
        hash,
        designation,
        mobile_number,
        address,
        seller_id,
        shop[0].id,
        userId,
        permissions,
      ],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/employees");
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};

exports.getEditEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = crypto.decrypt(req.cookies.userId);
    const seller_id = crypto.decrypt(req.cookies.seller_id || "");
    const isLogged = crypto.decrypt(req.cookies.login_status || "");

    // Fetch the employee data
    const employee = await queryAsync(
      "SELECT * FROM shop_employee WHERE id = ?",
      [id]
    );

    if (employee.length == 0) {
      return res.send("Employee not found");
    }

    if (!isLogged) {
      return res.redirect("/login");
    }

    if (employee[0].shop_owner_seller_id != seller_id) {
      return res.send("Unauthorized");
    }

    console.log(employee);

    // Check if permissions field is valid before parsing
    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(employee[0].permissions);
    } catch (error) {
      console.error("Error parsing permissions JSON:", error);
      return res.status(500).send("Invalid permissions format");
    }

    // Ensure permissions are integers
    employee[0].permissions = parsedPermissions.map((permission) =>
      parseInt(permission)
    );

    console.log(employee);

    // Fetch notifications and all available permissions
    const [notification, allPermissions] = await Promise.all([
      catModel.fetchAllNotifications(userId),
      queryAsyncWithoutValue("SELECT * FROM shop_employee_permissions"),
    ]);

    console.log(5555555555);

    // Render the edit employee page
    res.render("shop-employee/edit-employee", {
      employee,
      menuId: "shop-owner-employee",
      name: "Edit Employees",
      notification,
      allPermissions,
    });
  } catch (err) {
    console.error("Error in getEditEmployee function:", err);
    res.status(500).json({
      status: false,
      message: "Internal Server Error!",
      error: err,
    });
  }
};

exports.updateEmployee = async (req, res) => {
  let {
    name,
    email,
    designation,
    mobile_number,
    address,
    permissions = [],
    id,
  } = req.body;

  console.log("body", req.body);
  console.log("files", req.files);

  const userId = crypto.decrypt(req.cookies.userId);
  const seller_id = crypto.decrypt(req.cookies.seller_id || "");
  const isLogged = crypto.decrypt(req.cookies.login_status || "");

  const emp = await queryAsync("SELECT * FROM shop_employee WHERE id = ?", [
    id,
  ]);
  if (emp.length === 0) {
    return res.send("Employee not found");
  }

  let pic_url = emp[0].image;

  // If a new image is uploaded, update pic_url
  if (req.files && req.files["image"]) {
    pic_url =
      "https://saveneed.com/images/products/" + req.files["image"][0].filename;
  }

  if (!isLogged) {
    return res.redirect("/login");
  }

  const updateEmployeeQuery = `UPDATE shop_employee SET name = ?, email = ?, designation = ?, mobile_number = ?, address = ?, permissions = ?, image = ? WHERE id = ?`;

  try {
    db.query(
      updateEmployeeQuery,
      [
        name,
        email,
        designation,
        mobile_number,
        address,
        JSON.stringify(permissions),
        pic_url,
        id,
      ],
      (err, result) => {
        if (err) {
          console.log(err);
          res.status(500).send("Error updating employee");
        } else {
          res.redirect("/employees");
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

exports.updatePassword = async (req, res) => {
  const { new_password, confirm_password, id } = req.body;

  // Check if user is logged in
  const isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    return res.redirect("/login");
  }

  // Ensure passwords are provided
  if (!new_password || !confirm_password) {
    return res.status(400).send("Both password fields are required");
  }

  // Check if new password and confirm password match
  if (new_password !== confirm_password) {
    return res.status(400).send("Passwords do not match");
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Fetch the employee by id to ensure it exists
    const emp = await queryAsync("SELECT * FROM shop_employee WHERE id = ?", [
      id,
    ]);
    if (emp.length === 0) {
      return res.status(404).send("Employee not found");
    }

    // Update the employee's password in the database
    const updatePasswordQuery = `UPDATE shop_employee SET password = ? WHERE id = ?`;
    await queryAsync(updatePasswordQuery, [hashedPassword, id]);

    // Redirect or send success response
    res.redirect("/employees");
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).send("Server error");
  }
};

exports.getEmployeeLogin = async (req, res) => {
  try {
    // Fetch categories using Promise.all to optimize parallel execution
    const [mainCat, subCat, extraCat, allCat] = await Promise.all([
      catModel.fetchMainCat(),
      catModel.fetchSubCat(),
      catModel.fetchExtraCat(),
      catModel.fetchAllCat(),
    ]);

    // Get the message from query params or cookies
    let message = req.query.message || "";
    let loginMessage = req.cookies.loginMessage
      ? crypto.decrypt(req.cookies.loginMessage)
      : "";

    // Clear loginMessage after decryption
    res.clearCookie("loginMessage");

    // Mocked cart value (can be fetched from session or DB if needed)
    let cart = [];

    // Render the shop-employee/employee-login view
    res.render("shop-employee/employee-login", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      cart: cart,
      loginMessage,
      login_status: req.login_status,
      message: message,
      isLogged: req.login_status, // Assuming req.login_status is set properly
      subCat: subCat,
      mainCat: mainCat,
      extraCat: extraCat,
      allCat: allCat,
    });
  } catch (err) {
    console.error("Error rendering employee login:", err);
    // Send an error response in case of failure
    res.status(500).send("Internal Server Error");
  }
};

exports.employeeLogin = async (req, res) => {
  const { mobile_number, password } = req.body;

  const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");

  if (!mobile_number || !password) {
    return res.status(400).send("Please provide an email and password");
  }

  const employee = await queryAsync(
    "SELECT * FROM shop_employee WHERE mobile_number = ?",
    [mobile_number]
  );

  console.log(employee);

  if (employee.length == 0) {
    return res.status(400).send("Invalid email or password");
  }

  const hashedPassword = employee[0].password;
  const isMatch = await bcrypt.compare(password, hashedPassword);
  if (!isMatch) {
    return res.status(400).send("Invalid email or password");
  }

  const userId = employee[0].id;
  const shop_owner_seller_id = employee[0].shop_owner_seller_id;
  const shop_owner_user_id = employee[0].shop_owner_user_id;
  const is_logged_in = true;

  res.cookie("login_status", crypto.encrypt(is_logged_in), {
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("userId", crypto.encrypt(userId), {
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("shop_owner_seller_id", crypto.encrypt(shop_owner_seller_id), {
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie("shop_owner_user_id", crypto.encrypt(shop_owner_user_id), {
    maxAge: 24 * 60 * 60 * 1000,
  });

  const shop = await queryAsync("SELECT * FROM shop WHERE seller_user_id = ?", [
    shop_owner_user_id,
  ]);

  if (shop.length == 0) {
    return res.send("Shop not found");
  }

  res.cookie("shop_id", crypto.encrypt(shop[0].id), {
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.redirect("/employee-dashboard");
};

// exports.getEmployeeDashboard = async (req, res) => {
//   const userId = crypto.decrypt(req.cookies.userId);

//   const myPermissions = await getEndpointsOfEmployees(userId);

//   res.render("shop-employee/employee-dashboard", {
//     name: "Employee Dashboard",
//     menuId: "shop-employee-dashboard",
//     myPermissions,
//   });
// };

exports.getEmployeeDashboard = async (req, res) => {
  const isLogged = crypto.decrypt(req.cookies.login_status || "");

  if (isLogged) {
    try {
      // Get the employeeId from the cookies after login
      const userId = crypto.decrypt(req.cookies.userId);

      const myPermissions = await getEndpointsOfEmployees(userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");

      // Fetch necessary data such as currency rate and notifications
      const [currRate, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);

      // Query to get employee's data based on employeeId
      db.query(
        `SELECT shop_employee.*, shop.shop_custom_url, shop.shop_name AS shop_name
        FROM shop_employee 
        INNER JOIN shop ON shop.id = shop_employee.shop_id 
        WHERE shop_employee.id = ?`,
        [userId],
        (err1, res1) => {
          if (!err1 && res1.length > 0) {
            const employee = res1[0];

            res.render("shop-employee/employee-dashboard", {
              ogImage: "https://admin.saveneed.com/images/logo-og.webp",
              ogTitle: "Save71 Connects You and the World through Business.",
              ogUrl: "https://admin-save71.lens-ecom.store",
              currRate,
              currencyCode,
              myPermissions,
              userName: employee.name, // Use employee's name for the dashboard
              userImage: employee.image, // Use employee's image
              menuId: "shop-owner-employees",
              employee, // Pass employee object directly
              images: employee.image ? [employee.image] : [], // Handle images properly
              name: "Employee Dashboard",
              notification,
              shop_custom_url: employee.shop_custom_url,
              shop_name: employee.shop_name,
            });
          } else {
            res.status(404).send("Employee not found");
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

exports.products = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
      const empUserId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      console.log("currencyCode: ", currencyCode);

      const myPermissions = await getEndpointsOfEmployees(empUserId);

      const [currRate, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      var uID = crypto.decrypt(req.cookies.shop_owner_user_id);
      var userName = "";
      var userImage = "";

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

                    res.render("shop-employee/emp-products", {
                      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      myPermissions,
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
              res.render("shop-employee/emp-products", {
                ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                ogTitle: "Save71 Connects You and the World through Business.",
                ogUrl: "https://admin-save71.lens-ecom.store",
                currRate,
                currencyCode,
                userName: userName,
                userImage: userImage,
                menuId: "shop-owner-products",
                products: [], // Empty products
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

exports.uploadOwnProduct = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    res.redirect("/employee-login");
    return;
  }
  try {
    const notification = await catModel.fetchAllNotifications(
      crypto.decrypt(req.cookies.shop_owner_user_id)
    );
    const myPermissions = await getEndpointsOfEmployees(
      crypto.decrypt(req.cookies.userId)
    );
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "BDT");
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
    var userName = crypto.decrypt(req.cookies.userName || "");
    var sID = crypto.decrypt(req.cookies.shop_owner_seller_id);

    if (isLogged) {
      db.query(
        "SELECT * FROM `extra_cat` ORDER BY `extra_cat`.`extra_cat_name` ASC",
        (err1, res1) => {
          if (!err1) {
            var uID = crypto.decrypt(req.cookies.shop_owner_user_id);
            db.query(
              "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?",
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
                    res.render("shop-employee/emp-upload-own-product", {
                      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      images: encImages,
                      myPermissions,
                      userName: userName,
                      name: "Upload Own Product",
                      menuId: "emp-upload-own-product",
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
      res.redirect("/employee-login");
    }
  } catch (err) {
    console.error(err);
    // Handle error and send appropriate response
    res.status(500).send("Internal Server Error");
  }
};

exports.uploadOwnProductPost = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "BDT");
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

      var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
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

      var picUrls = [];
      var featured_image_index = 0;
      if (req.files["productImages"]) {
        console.log("Featured index: ", featured_index);
        picUrls = req.files["productImages"].map(
          (file) => "https://saveneed.com/images/products/" + file.filename
        );
        featured_image_index =
          featured_index == undefined ? 0 : parseInt(featured_index);
        picUrls.forEach((element) => {
          // console.log(element);
        });
      }

      // console.log("f : ", featured_image_index, " body : ", featured_index)
      var video_url = req.files["product_video"]
        ? "https://saveneed.com/images/products/" +
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
              res.redirect("/getFaq-emp/" + encrypted_product_id);
            });
          } else {
            // No images uploaded, send success message
            console.log("FAQ Sending");
            res.redirect("/getFaq-emp/" + encrypted_product_id);
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

exports.uploadBrandProduct = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (!isLogged) {
    res.redirect("/employee-login");
    return;
  }
  try {
    const notification = await catModel.fetchAllNotifications(
      crypto.decrypt(req.cookies.shop_owner_user_id)
    );
    const myPermissions = await getEndpointsOfEmployees(
      crypto.decrypt(req.cookies.userId)
    );
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
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
    var userName = crypto.decrypt(req.cookies.userName || "");
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
                res.render("shop-employee/emp-upload-brand-product", {
                  ogImage: "https://admin.saveneed.com/images/logo-og.webp",
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
                  name: "Upload Brand Product",
                  menuId: "emp-upload-brand-product",
                  myPermissions,
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
      res.redirect("/employee-login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
};

exports.uploadBrandProductPost = async (req, res) => {
  try {
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
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
    var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
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
                              "/getFaq-emp/" + crypto.urlEncrypt(product_id, 1)
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

exports.unpublish_product = (req, res) => {
  var product_id = crypto.smallDecrypt(req.params.product_id);
  db.query(
    "UPDATE `products` SET `quantity` = '-1' WHERE `products`.`product_id` = ?",
    [product_id],
    (err1, res1) => {
      if (!err1) {
        res.redirect("/products-emp");
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
        res.redirect("/products-emp");
      } else {
        res.send(err1);
      }
    }
  );
};

exports.edit_product = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
      const empUserId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const myPermissions = await getEndpointsOfEmployees(empUserId);

      const [currRate, notification] = await Promise.all([
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);

      const [mainCat, subCat, extraCat, allCat, images] = await Promise.all([
        catModel.fetchMainCat(),
        catModel.fetchSubCat(),
        catModel.fetchExtraCat(),
        catModel.fetchAllCat(),
        catModel.fetchFeaturedImages(),
      ]);
      var uID = crypto.decrypt(req.cookies.shop_owner_user_id);
      var sID = crypto.decrypt(req.cookies.shop_owner_seller_id);
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName || "");
      var pID = req.params.id;
      var usepID = crypto.smallDecrypt(pID);
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

                                  res.render("shop-employee/emp-edit-product", {
                                    ogImage:
                                      "https://admin.saveneed.com/images/logo-og.webp",
                                    ogTitle:
                                      "Save71 Connects You and the World through Business.",
                                    ogUrl:
                                      "https://admin-save71.lens-ecom.store",
                                    currencyCode,
                                    currRate,
                                    images: images,
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
                                    menuId: "emp-edit-product",
                                    name: "Edit Product",
                                    myPermissions,
                                    shopId: sID,
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
    res.redirect("/employee-login");
    return;
  }
};

// exports.edit_productPost = async (req, res) => {
//   try {
//     console.log(2);

//     const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
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

//       var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
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
//                 console.log(1);
//                 // Description updated successfully
//                 res.redirect("/getFaq-emp/" + encodeURIComponent(pID));
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
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
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

      var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
      var {
        product_name,
        product_price,
        category,
        product_des,
        product_short_des,
        featured_index,
        is_branded,
      } = req.body;

      product_name = product_name.trim().slice(0, 100);
      product_short_des = product_short_des.trim().slice(0, 150);

      var featured_image_index = parseInt(featured_index);

      // Fetch the existing product details to compare changes
      const existingProductQuery =
        "SELECT * FROM `products` WHERE `product_id` = ?";
      const [existingProduct] = await db
        .promise()
        .query(existingProductQuery, [usepID]);

      if (existingProduct.length === 0) {
        return res.status(404).send("Product not found");
      }

      const existingProductData = existingProduct[0];

      // Check if only the price has changed
      const isOnlyPriceChanged =
        parseFloat(existingProductData.product_price * currRate) !==
          parseFloat(product_price) &&
        product_name === existingProductData.product_name &&
        product_short_des === existingProductData.product_short_des &&
        product_des === existingProductData.product_details_des &&
        category == existingProductData.product_cat_id;

      // Update product in database
      const query =
        "UPDATE `products` SET `product_name` = ?, `product_price` = ?, `product_short_des` = ?, `product_details_des` = ?, `product_cat_id` = ?, `seller_id` = ?, `sell_count` = ?, `quantity` = ?, `status` = ? WHERE `product_id` = ?";

      await db
        .promise()
        .query(query, [
          product_name,
          product_price / currRate,
          product_short_des,
          product_des,
          category,
          seller_id,
          0,
          0,
          2,
          usepID,
        ]);

      // Redirect logic based on whether only the price changed
      if (isOnlyPriceChanged) {
        return res.redirect("/products");
      }

      // Handle updating images, video, and descriptions here (your existing logic)

      var pic_urls = req.files["productImages"]
        ? req.files["productImages"].map(
            (file) => "https://saveneed.com/images/products/" + file.filename
          )
        : [];

      var video_url = req.files["product_video"]
        ? "https://saveneed.com/images/products/" +
          req.files["product_video"][0].filename
        : null;

      // Proceed with updating images, video, and description
      function updateVideo() {
        // Update video logic here (same as existing)
      }

      function updateDescription() {
        var descQuery =
          "UPDATE `products` SET `product_short_des` = ?, `product_details_des` = ? WHERE `product_id` = ?";
        db.query(
          descQuery,
          [product_short_des, product_des, usepID],
          function (err, result) {
            if (err) {
              console.log("Database query error:", err);
            }
            // Redirect to FAQ
            res.redirect("/getFaq-emp/" + encodeURIComponent(pID));
          }
        );
      }

      // Your logic for updating images, then calling updateVideo, etc.
      if (pic_urls.length > 0) {
        // Your image update logic here
        updateVideo();
      } else {
        updateVideo();
      }
    });
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
//           res.redirect("/getFaq-emp/" + encodeURIComponent(pID));
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

    // Fetch the existing product details to compare changes
    db.query(
      "SELECT product_name, product_price FROM `products` WHERE `product_id` = ?",
      [usepID],
      (err, existingResult) => {
        if (err || existingResult.length === 0) {
          return res.status(500).send("Error retrieving product data");
        }

        const existingProduct = existingResult[0];
        const existingProductPrice = parseFloat(
          existingProduct.product_price * currRate
        );
        const existingProductName = existingProduct.product_name.trim();

        // Check if only the price has changed
        const isOnlyPriceChanged =
          parseFloat(existingProductPrice) !== parseFloat(product_price) &&
          existingProductName === product_name.trim();

        // Update product data
        db.query(
          "UPDATE `products` SET `product_price` = ?, `product_name` = ? WHERE `product_id` = ?",
          [product_price / currRate, product_name, usepID],
          (err1, res1) => {
            if (err1) {
              return res.status(500).send(err1);
            }

            // Redirect logic based on whether only the price changed
            if (isOnlyPriceChanged) {
              return res.redirect("/products");
            }

            // If more than just price has changed, redirect to the FAQ page
            res.redirect("/getFaq-emp/" + encodeURIComponent(pID));
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.selectUploadProduct = async (req, res) => {
  var isLogged = crypto.decrypt(req.cookies.login_status || "");
  if (isLogged) {
    try {
      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.shop_owner_user_id)
      );
      const myPermissions = await getEndpointsOfEmployees(
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
      var userName = crypto.decrypt(req.cookies.userName || "");
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

                    res.render("shop-employee/emp-selectUploadProduct", {
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
                      name: "Select Upload Product",
                      menuId: "select-upload-product",
                      myPermissions,
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
                  res.redirect("/products-emp");
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

exports.orders1 = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/employee-login");
    }

    const orderId = req.query.orderIds;

    const orderIds = orderId.split(",");

    res.redirect(`/emp-printDetails?orderIds=${orderId}`);
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};

exports.printDetails = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/employee-login");
    }

    const orderId = req.query.orderIds;

    const orderIds = orderId.split(",");

    const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
    const empUserId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
    console.log("currencyCode: ", currencyCode);

    const myPermissions = await getEndpointsOfEmployees(empUserId);

    var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName || "");

    const shopQuery = "SELECT * FROM `shop` WHERE `shop`.`id` = ?";
    const shop = await queryAsync(shopQuery, [seller_id]);

    const [images, currRate, notification] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllNotifications(userId),
    ]);

    const ordersQuery =
      "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?  ORDER BY `orders`.`placed_date` DESC";
    const orders = await queryAsync(ordersQuery, [seller_id]);

    const filteredOrders = orders.filter((order) => {
      return orderIds.includes(String(order.order_id));
    });

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [seller_id]);

    const filteredOrderDetails = order_details.filter((order) => {
      return orderIds.includes(String(order.order_id));
    });

    const userInfoArray = await Promise.all(
      orders.map((order) => {
        const userInfoQuery = "SELECT * FROM `user` WHERE `user_id` = ?";
        return queryAsync(userInfoQuery, [order["user_id"]]);
      })
    );

    // Create a map of users by user_id
    const userInfo = {};
    userInfoArray.forEach((userArray) => {
      const user = userArray[0];
      userInfo[user.user_id] = user;
    });

    // console.log(userInfo);

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    var encImages = images.map((image) => {
      image.product_id = crypto.smallEncrypt(image.product_id);
      return image;
    });
    var encOrderDetails = order_details.map((order) => {
      order.product_id = crypto.smallEncrypt(order.product_id);
      return order;
    });

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }

    const userOrderAndOrderDetails = filteredOrders.map((order) => {
      const orderDetails = filteredOrderDetails.filter(
        (orderDetail) => orderDetail.order_id === order.order_id
      );
      const user = userInfo[order.user_id];
      // console.log({ order });
      return { order, orderDetails, user };
    });

    // console.log({ userOrderAndOrderDetails });

    return res.status(200).render("shop-employee/emp-new_orders", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      userImage: userImage,
      userName: userName,
      menuId: "shop-owner-orders",
      order_details: filteredOrderDetails,
      userOrderAndOrderDetails,
      orders: filteredOrders,
      image: images,
      userInfo,
      currRate,
      currencyCode,
      name: "Sellings",
      notification: notification,
      shop: shop[0],
      myPermissions,
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};

exports.orders = async (req, res, next) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/employee-login");
    }

    const empId = crypto.decrypt(req.cookies.userId);

    const shopId = crypto.decrypt(req.cookies.shop_id);
    const shopEmployees = await queryAsync(
      "SELECT * FROM `shop_employee` WHERE `shop_id` = ? AND is_working = 1 ORDER BY `id`",
      [shopId]
    );

    let myPosition = null;
    if (shopEmployees) {
      myPosition = shopEmployees.findIndex((emp) => emp.id == empId);
    }

    const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
    const empUserId = crypto.decrypt(req.cookies.userId);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode);

    const myPermissions = await getEndpointsOfEmployees(empUserId);

    var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
    const userImage = crypto.decrypt(req.cookies.userImage || "");
    const userName = crypto.decrypt(req.cookies.userName || "");

    const [images, currRate, notification] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllNotifications(userId),
    ]);

    const ordersQuery =
      "SELECT * FROM `orders` WHERE `orders`.`seller_id` = ?  ORDER BY `orders`.`order_id` DESC, `orders`.`placed_date` DESC";
    const orders = await queryAsync(ordersQuery, [seller_id]);

    let managedOrders = [];
    // const orderIds = orders.map((order) => order.order_id);
    const reversedOrders = orders.reverse();
    // const reveredOrderIds = reversedOrders.map((order) => order.order_id);

    // console.log(reveredOrderIds, orderIds);

    if (myPosition !== -1 && shopEmployees.length > 0) {
      managedOrders = reversedOrders.filter((order, index) => {
        return index % shopEmployees.length === myPosition;
      });
    }

    managedOrders = managedOrders.reverse();

    console.log(managedOrders);

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`seller_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [seller_id]);

    const userInfoArray = await Promise.all(
      orders.map((order) => {
        const userInfoQuery = "SELECT * FROM `user` WHERE `user_id` = ?";
        return queryAsync(userInfoQuery, [order["user_id"]]);
      })
    );

    // Create a map of users by user_id
    const userInfo = {};
    userInfoArray.forEach((userArray) => {
      const user = userArray[0];
      userInfo[user?.user_id] = user;
    });

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    var encImages = images.map((image) => {
      image.product_id = crypto.smallEncrypt(image.product_id);
      return image;
    });
    var encOrderDetails = order_details.map((order) => {
      order.product_id = crypto.smallEncrypt(order.product_id);
      return order;
    });

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }

    return res.status(200).render("shop-employee/emp-orders", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      userImage: userImage,
      userName: userName,
      menuId: "shop-owner-orders",
      order_details: encOrderDetails,
      orders: managedOrders,
      image: encImages,
      userInfo,
      currRate,
      currencyCode,
      name: "Sellings",
      notification: notification,
      myPermissions,
      menuId: "orders",
      name: "Orders",
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ msg: "Internal Server Error" });
  }
};

exports.orderDetails = async (req, res) => {
  try {
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (!isLogged) {
      return res.redirect("/login");
    }

    const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
    const currencyCode = crypto.decrypt(req.cookies.currencyCode || "");
    const seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
    console.log("Seller ID : ", seller_id);

    const [images, currRate, users] = await Promise.all([
      catModel.fetchFeaturedImages(),
      catModel.fetchCurrencyRate(currencyCode),
      catModel.fetchAllUserInfo(),
    ]);

    var oID = req.params.id;

    const orderDetailsQuery =
      "SELECT * FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`order_id` = ?";
    const order_details = await queryAsync(orderDetailsQuery, [oID]);

    const ordersQuery = "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?";
    const orders = await queryAsync(ordersQuery, [oID]);

    if (orders[0].seller_id != seller_id && orders[0].userId != userId) {
      return res
        .status(404)
        .send(
          '<script>alert("UnAuthorized !"); window.history.go(-1);</script>'
        );
    }

    const shopQuery = "SELECT * FROM `shop` WHERE `shop`.`id` = ?";
    const shop = await queryAsync(shopQuery, [seller_id]);

    const shopDueDetailsQuery =
      "SELECT * FROM `shop_due_details` WHERE `shop_id` = ? AND `is_paid` = 0 AND `last_date` < CURDATE()";
    const shopDueDetails = await queryAsync(shopDueDetailsQuery, [seller_id]);

    // If no due is pending, redirect to balance page
    if (shopDueDetails.length > 0) {
      return res.redirect("/balance");
    }
    const empUserId = crypto.decrypt(req.cookies.userId);
    const myPermissions = await getEndpointsOfEmployees(empUserId);

    var matchingUser = users.find((user) => user.user_id === orders[0].user_id);
    console.log("Seller Details : ", shop[0]);
    console.log("Order Details : ", orders[0]);
    return res.render("shop-employee/emp-order-details", {
      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
      ogTitle: "Save71 Connects You and the World through Business.",
      ogUrl: "https://admin-save71.lens-ecom.store",
      currRate,
      currencyCode,
      myPermissions,
      menuId: "shop-owner-orders",
      order_details: order_details,
      image: images,
      order: orders[0],
      seller_details: shop[0],
      matchingUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.order_status = (req, res) => {
  var oID = req.params.id;
  var status = req.params.status;
  var buyerUserId = crypto.decrypt(req.cookies.userId);

  db.query(
    "SELECT * FROM `orders` WHERE `orders`.`order_id` = ?",
    [oID],
    (err11, res11) => {
      if (!err11) {
        // fetching seller details
        db.query(
          "SELECT * FROM `shop` WHERE `id` = ?",
          [res11[0].seller_id],
          (err22, res22) => {
            if (!err22) {
              // fetching seller's ref user details
              db.query(
                "SELECT * FROM `user` WHERE `user`.`user_id` = ?",
                [res22[0].seller_user_id],
                (err1, res1) => {
                  // fetch seller user details then fetch if seller has ref user
                  if (!err1 && res1.length > 0) {
                    db.query(
                      "SELECT * FROM `user` WHERE `user`.`own_ref_id` = ?",
                      [res1[0].reference_id],
                      (err2, res2) => {
                        // fetch reference user details
                        if (!err2 && res2.length > 0) {
                          // selecting reference user's seller id
                          db.query(
                            "SELECT * FROM `shop` WHERE `shop`.`seller_user_id` = ?",
                            [res2[0].user_id],
                            (err3, res3) => {
                              if (!err3 && res3.length > 0) {
                                // if reference seller user ID exists
                                res.redirect(
                                  // /order_details/order_id/status/ref_shop_id/main_seller_id

                                  "/emp-order-details/" +
                                    oID +
                                    "/" +
                                    status +
                                    "/" +
                                    res3[0].id +
                                    "/" +
                                    res11[0].seller_id
                                );
                              } else {
                                res.send(err3);
                              }
                            }
                          );
                          // selecting reference user's seller id end
                        } else {
                          res.send(err2);
                        }
                        // fetch reference user details end
                      }
                    );
                  } else {
                    res.send(err1);
                  }
                  // fetch seller user details then fetch if seller has ref user end
                }
              );
              // fetching seller's ref user details end
            } else {
              res.send(err22);
            }
          }
        );
        // fetching seller details end
      } else {
        res.send(err11);
      }
    }
  );
};

exports.order_status_complete = async (req, res) => {
  try {
    const [setNotification] = await Promise.all([catModel.setNotification]);
    var oID = req.params.id;
    var status = req.params.status;
    var ref_shop_id = req.params.ref_shop_id;
    var buyerUserId = crypto.decrypt(req.cookies.userId);
    var seller_id = req.params.seller_id;
    // console.log("Status : ", status);

    db.query(
      "SELECT * FROM `orders` WHERE `order_id` = ?",
      [oID],
      (err37, res37) => {
        if (err37) {
          console.error(err37);
          res
            .status(500)
            .send("An error occurred while fetching the order details.");
          return;
        }

        db.query(
          "UPDATE `orders` SET `order_status` = ?, `request_review` = '0' WHERE `orders`.`order_id` = ?",
          [status, oID],
          (err1, res1) => {
            if (err1) {
              console.error(err1);
              res
                .status(500)
                .send("An error occurred while updating the order status.");
              return;
            }

            const statusArray = [
              "Confirmed",
              "Rejected",
              "New Order",
              "Shipped",
              "Return Order",
              "Pending",
            ];

            setNotification(
              res37[0].user_id,
              `Your order status is changed to ${
                statusArray[status - 1]
              } for order ${oID} By seller.`,
              `/user_order`
            );

            // console.log("Res", res37);

            // calculate total price and deduct price
            if (status == 1) {
              db.query(
                "SELECT SUM(product_total_price) as `total_price`, SUM(deduct_price) as total_deduct_price FROM `order_details` WHERE `order_details`.`order_id` = ?",
                [oID],
                (err2, res2) => {
                  if (err2) {
                    console.error(err2);
                    res
                      .status(500)
                      .send(
                        "An error occurred while calculating the total price and deduct price."
                      );
                    return;
                  }

                  // Adding Due history in "shop_due_details" table
                  const currentDate = new Date();
                  const dueTime = 1; // 1 day
                  currentDate.setDate(currentDate.getDate() + dueTime);
                  const dueDate = currentDate
                    .toISOString()
                    .replace("T", " ")
                    .substring(0, 19);

                  db.query(
                    "INSERT INTO `shop_due_details` (`due_id`, `shop_id`, `order_id`, `due_amount`, `last_date`, `ref_id`, `is_paid`) VALUES (NULL, ?, ?, ?, ?, ?, '0')",
                    [
                      seller_id,
                      oID,
                      res2[0].total_deduct_price,
                      dueDate,
                      ref_shop_id,
                    ],
                    (err3, res3) => {
                      if (!err3) {
                        console.log("Due added !");
                      } else {
                        console.error(err3);
                        res
                          .status(500)
                          .send(
                            "An error occurred while Inserting shop_due_details."
                          );
                        return;
                      }
                    }
                  );

                  // seller money add
                  db.query(
                    "SELECT * FROM `shop` WHERE `id` = ?",
                    [seller_id],
                    (errSeller, resSeller) => {
                      if (!errSeller) {
                        // fetch seller balance
                        db.query(
                          "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                          [seller_id],
                          (err3, res3) => {
                            if (err3) {
                              console.error(err3);
                              res
                                .status(500)
                                .send(
                                  "An error occurred while fetching seller balance."
                                );
                              return;
                            }

                            // adding money to seller from buyer
                            db.query(
                              "SELECT SUM(product_total_price) as `total_price`, `deliveryCharge`  FROM `order_details` INNER JOIN `orders` ON `orders`.`order_id` = `order_details`.`order_id` WHERE `order_details`.`order_id` = ?",
                              [oID],
                              (errOrder, resOrder) => {
                                if (errOrder) {
                                  console.error(errOrder);
                                  res
                                    .status(500)
                                    .send(
                                      "An error occurred while fetching order details."
                                    );
                                  return;
                                }
                                // fetch buyer user details
                                db.query(
                                  "SELECT * FROM `user` INNER JOIN `shop` ON `shop`.`seller_user_id` = `user`.`user_id` INNER JOIN `shop_balance` ON `shop_balance`.`shop_id` = `shop`.`id`  WHERE `user_id` = ?",
                                  [buyerUserId],
                                  (errUser, resUser) => {
                                    if (errUser) {
                                      console.error(errUser);
                                      res
                                        .status(500)
                                        .send(
                                          "An error occurred while fetching user details."
                                        );
                                      return;
                                    }

                                    const payableAmount =
                                      resOrder[0].total_price +
                                      resOrder[0].deliveryCharge;

                                    // if user can pay
                                    if (
                                      resUser[0].own_balance >= payableAmount
                                    ) {
                                      // update user balance
                                      db.query(
                                        "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                                        [
                                          resUser[0].own_balance -
                                            payableAmount,
                                          resUser[0].shop_id,
                                        ],
                                        (err4, res4) => {
                                          if (err4) {
                                            console.error(err4);
                                            res
                                              .status(500)
                                              .send(
                                                "An error occurred while updating seller balance."
                                              );
                                            return;
                                          }
                                          console.log("Seller balance updated");

                                          // select seller balance
                                          db.query(
                                            "SELECT * FROM `shop_balance` WHERE `shop_id` = ?",
                                            [seller_id],
                                            (err6, res6) => {
                                              if (err6) {
                                                console.error(err6);
                                                res
                                                  .status(500)
                                                  .send(
                                                    "An error occurred while fetching seller balance."
                                                  );
                                                return;
                                              }
                                              // seller balance add
                                              db.query(
                                                "UPDATE `shop_balance` SET `own_balance` = ? WHERE `shop_balance`.`shop_id` = ?",
                                                [
                                                  res6[0].own_balance +
                                                    payableAmount,
                                                  seller_id,
                                                ],
                                                (err7, res7) => {
                                                  if (err7) {
                                                    console.error(err7);
                                                    res
                                                      .status(500)
                                                      .send(
                                                        "An error occurred while updating seller balance."
                                                      );
                                                    return;
                                                  }
                                                  console.log(
                                                    "Seller balance updated"
                                                  );
                                                  // res.redirect("back");
                                                }
                                              );
                                            }
                                          );
                                        }
                                      );
                                    }
                                  }
                                );
                              }
                            );

                            if (res3.length > 0) {
                              db.query(
                                "UPDATE `shop_balance` SET `due_payment` = ? WHERE `shop_balance`.`shop_id` = ?",
                                [
                                  res3[0].due_payment +
                                    res2[0].total_deduct_price,
                                  seller_id,
                                ],
                                (err4, res4) => {
                                  if (err4) {
                                    console.error(err4);
                                    res
                                      .status(500)
                                      .send(
                                        "An error occurred while updating seller balance."
                                      );
                                    return;
                                  } else {
                                    console.log("Seller balance updated");
                                  }
                                }
                              );
                            } else {
                              db.query(
                                "INSERT INTO `shop_balance` (`balance_id`, `shop_id`, `own_balance`, `due_payment`, `from_ref`, `withdraw`) VALUES (NULL, ?, ?, ?, ?, ?)",
                                [
                                  seller_id,
                                  res2[0].total_price + res37[0].deliveryCharge,
                                  res2[0].total_deduct_price,
                                  0,
                                  0,
                                ],
                                (err4, res4) => {
                                  if (err4) {
                                    console.error(err4);
                                    res
                                      .status(500)
                                      .send(
                                        "An error occurred while creating seller balance."
                                      );
                                    return;
                                  } else {
                                    console.log(
                                      "Seller balance Created. Id : ",
                                      seller_id
                                    );
                                  }
                                }
                              );
                            }

                            // }

                            // buyer history added
                            db.query(
                              "INSERT INTO `payment_history` (`history_id`, `shop_id`, `amount`, `type`, `date`, `order_id`, `ref_user_id`) VALUES (NULL, ?, ?, ?, ?, ?, ?)",
                              [
                                seller_id,
                                res2[0].total_price + res37[0].deliveryCharge,
                                1,
                                new Date()
                                  .toISOString()
                                  .replace("T", " ")
                                  .substring(0, 19),
                                oID,
                                buyerUserId,
                              ],
                              (err5, res5) => {
                                if (err5) {
                                  console.error(err5);
                                  res
                                    .status(500)
                                    .send(
                                      "An error occurred while adding seller payment history."
                                    );
                                  return;
                                } else {
                                  console.log("Added seller payment history");
                                  res.redirect("back");
                                }
                              }
                            );
                          }
                        );
                      }
                      // seller shop details fetch error
                      else {
                        console.error(errSeller);
                        res
                          .status(500)
                          .send(
                            "An error occurred while fetching seller shop details."
                          );
                        return;
                      }
                    }
                  );
                  // seller money add end
                }
              );
            }
            // when status = 1 | calculate total price and deduct price else portion
            else if (status == 3) {
              db.query(
                "UPDATE `orders` SET `seller_confirm` = '1', `request_review` = '1' WHERE `orders`.`order_id` = ?",
                [oID],
                (err2, res2) => {
                  if (err2) {
                    console.error(err2);
                    res
                      .status(500)
                      .send(
                        "An error occurred while updating seller confirmation and review status."
                      );
                    return;
                  } else {
                    console.log("Seller sent review for order : ", oID);
                    res.redirect("back");
                  }
                }
              );
            } else {
              res.redirect("back");
            }
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.purchase = async (req, res) => {
  var login_status = crypto.decrypt(req.cookies.login_status || "");
  if (login_status) {
    try {
      const userId = crypto.decrypt(req.cookies.shop_owner_user_id);
      const empUserId = crypto.decrypt(req.cookies.userId);
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      console.log("currencyCode: ", currencyCode);

      const myPermissions = await getEndpointsOfEmployees(empUserId);

      var seller_id = crypto.decrypt(req.cookies.shop_owner_seller_id);
      const [images, currRate, notification] = await Promise.all([
        catModel.fetchFeaturedImages(),
        catModel.fetchCurrencyRate(currencyCode),
        catModel.fetchAllNotifications(userId),
      ]);
      var user_id = crypto.decrypt(req.cookies.userId);
      var oQuery =
        "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` WHERE `orders`.`user_id` = ?";
      var query =
        "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ?  ORDER BY `orders`.`placed_date` DESC";
      db.query(query, [user_id], (err1, res1) => {
        if (!err1) {
          db.query(oQuery, [user_id], (err2, res2) => {
            if (!err2) {
              db.query(
                "SELECT * FROM `product_image` WHERE `product_image`.`featured_image` = 1",
                (err3, res3) => {
                  if (!err3) {
                    var total_price = [];
                    var deliveryChargesAdded = {};
                    res1.forEach((orderDetails) => {
                      if (isNaN(total_price[orderDetails.order_id])) {
                        total_price[orderDetails.order_id] = 0;
                      }
                      if (
                        orderDetails.product_quantity >= 0 &&
                        orderDetails.stock_out == 0
                      ) {
                        total_price[orderDetails.order_id] +=
                          orderDetails.product_total_price;
                        if (!deliveryChargesAdded[orderDetails.order_id]) {
                          total_price[orderDetails.order_id] +=
                            orderDetails.deliveryCharge;
                          deliveryChargesAdded[orderDetails.order_id] = true;
                        }
                      }
                      // console.log(total_price[orderDetails.order_id])
                    });

                    var images = res3.map((image) => {
                      image.product_id = crypto.smallEncrypt(image.product_id);
                      return image;
                    });

                    var orderDetails = res1.map((orderDetail) => {
                      orderDetail.product_id = crypto.smallEncrypt(
                        orderDetail.product_id
                      );
                      return orderDetail;
                    });
                    console.log("Order Details: ", orderDetails);
                    console.log("order: ", res2);
                    const filteredOrders = res2.filter((order) => {
                      return orderDetails.some(
                        (detail) => detail.order_id === order.order_id
                      );
                    });
                    res.render("shop-employee/emp-purchase", {
                      ogImage: "https://admin.saveneed.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      orderDetails: orderDetails,
                      currRate,
                      total_price,
                      currencyCode,
                      order: filteredOrders,
                      image: images,
                      menuId: "shop-owner-purchases",
                      name: "Purchases",
                      notification: notification,
                      myPermissions,
                    });
                  } else {
                    res.send(err3);
                  }
                }
              );
            } else {
              res.send(err2);
            }
          });
        } else {
          res.send(err1);
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/employee-login");
  }
};

exports.cart_product = async (req, res) => {
  try {
    const userId = req.params.userId;
    const empUserId = crypto.decrypt(req.cookies.userId);
    const myPermissions = await getEndpointsOfEmployees(empUserId);

    const order_id = req.params.orderId;
    const orderIdOfUserQuery = `SELECT * FROM orders Where user_id = ${userId}`;
    var isLogged = crypto.decrypt(req.cookies.login_status || "");
    if (isLogged) {
      const notification = await catModel.fetchAllNotifications(
        crypto.decrypt(req.cookies.userId)
      );
      const currencyCode = crypto.decrypt(req.cookies.currencyCode);
      const [mainCat, subCat, extraCat, allCat, fetchFeaturedImages, currRate] =
        await Promise.all([
          catModel.fetchMainCat(),
          catModel.fetchSubCat(),
          catModel.fetchExtraCat(),
          catModel.fetchAllCat(),
          catModel.fetchFeaturedImages(),
          catModel.fetchCurrencyRate(currencyCode),
        ]);

      const location = JSON.parse(JSON.stringify(req.cookies.location) || "{}");
      const userLat = crypto.decrypt(location.latitude);
      const userLng = crypto.decrypt(location.longitude);

      if (!userLat || !userLng) {
        return res
          .status(400)
          .json({ error: "User location is missing or invalid." });
      }
      var uID = crypto.decrypt(req.cookies.userId);
      var sID = req.params.id;
      var userImage = crypto.decrypt(req.cookies.userImage || "");
      var userName = crypto.decrypt(req.cookies.userName || "");

      const sortedShopsAndProductsByDistance =
        await locationOptimizedDistance.getSortedShopsAndProductsByDistance(
          userLat,
          userLng,
          sID,
          null,
          null
        );
      const sortedShops =
        await locationOptimizedDistance.getSortedShopsByDistance(
          userLat,
          userLng
        );

      const [res1, res2, res3] = await Promise.all([
        queryAsync(
          "SELECT * FROM `orders` INNER JOIN `order_details` ON `orders`.`order_id` = `order_details`.`order_id` INNER JOIN `products` ON `products`.`product_id` = `order_details`.`product_id` WHERE `orders`.`user_id` = ? AND `orders`.`in_cart` = 1 ORDER BY `orders`.`order_id` DESC",
          [uID]
        ),
        queryAsync(
          "SELECT * FROM `products` WHERE `products`.`seller_id` = ? AND `products`.`quantity` = 0 AND `products`.`status` = 1 AND `products`.`admin_published` = 1",
          [sID]
        ),
        queryAsync("SELECT * FROM `shop` WHERE `shop`.`id` = ?", [sID]),
      ]);

      const filteredExtraCat = extraCat.filter((cat) => {
        return res2.some(
          (product) => product.product_cat_id === cat.extra_cat_id
        );
      });

      var images = fetchFeaturedImages.map((image) => {
        image.product_id = crypto.smallEncrypt(image.product_id);
        return image;
      });

      var products = sortedShopsAndProductsByDistance
        .filter((product) => product.seller_id == sID)
        .map((product) => {
          product.product_id = crypto.smallEncrypt(product.product_id);
          product.product_image_url = images.filter(
            (image) => image.product_id == product.product_id
          )[0]?.product_image_url;
          return product;
        });

      var shops = sortedShops
        .filter((shop) => shop.id == sID)
        .map((shop) => {
          shop.product_id = crypto.smallEncrypt(shop.product_id);
          return shop;
        });

      var encCart = res1.map((item) => {
        item.product_id = crypto.smallEncrypt(item.product_id);
        return item;
      });

      res.render("shop-employee/emp-cart-product", {
        ogImage: "https://saveneed.com/images/logo-og.webp",
        ogTitle: "Save71 Connects You and the World through Business.",
        ogUrl: "http://localhost:3000",
        currRate,
        currencyCode,
        userName: userName,
        userImage: userImage,
        cart: encCart,
        shop: shops,
        login_status: isLogged,
        products: products,
        subCat: subCat,
        mainCat: mainCat,
        filteredExtraCat,
        allCat: allCat,
        images: images,
        notification: notification,
        extraCat,
        userId,
        menuId: "shop-owner-products",
        name: "Update Order",
        order_id,
        seller_id: sID,
        myPermissions,
      });
    } else {
      res.redirect("/employee-login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.addToCartBySeller = async (req, res) => {
  // creating an order
  var order_id = req.params.order_id;
  var login_status = true;
  var user_id = req.params.user_id;
  var enProduct_id = req.params.product_id;
  var use_product_id = crypto.smallDecrypt(enProduct_id);
  var seller_id = req.params.seller_id;
  const userId = crypto.decrypt(req.cookies.shop_owner_user_id);

  function addCart() {
    // console.log("add cart : ", resPid[0].seller_id, seller_id)
    db.query(
      "SELECT * FROM `shop` WHERE `shop`.`id` = ?",
      [seller_id],
      (err11, res11) => {
        if (!err11) {
          if (user_id == res11[0].seller_user_id) {
            res.send(`
              <script>
                alert("You can't buy your own product !");
                window.history.go(-1);
              </script>
            `);
          } else if (login_status) {
            // date part
            const today = new Date();
            const sevenDaysFromToday = new Date(today);
            sevenDaysFromToday.setDate(today.getDate() + 7);
            if (order_id == "" || order_id <= 0) {
              db.query(
                "INSERT INTO `orders` (`order_id`, `user_id`, `order_status`, `seller_id`, `placed_date`, `delivery_date`, `request_review`, `in_cart`, `is_areaShop`, `seller_confirm`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 1, 0)",
                [user_id, 3, seller_id, today, sevenDaysFromToday, 0, 1],
                (err1, res1) => {
                  if (err1) {
                    console.log(
                      "Inserting order : ",
                      user_id,
                      seller_id,
                      today,
                      sevenDaysFromToday
                    );
                    res.send("Error in inserting order");
                    console.error(err1);
                  }
                }
              );
              db.query(
                "SELECT * FROM `orders`  WHERE `orders`.`user_id` = ? ORDER BY `orders`.`order_id` DESC",
                [user_id],
                (err1, res1) => {
                  order_id = res1[0].order_id;
                  res.cookie("order_id", crypto.encrypt(order_id));
                }
              );
            }
            // already under an order
            // also order details part
            var query =
              "INSERT INTO `order_details` (`order_details_id`, `order_id`, `product_id`, `product_quantity`, `product_total_price`, `note_to_user`, `stock_out`, `deduct_price`) VALUES (NULL, ?, ?, ?, ?, NULL, ?, ?)";
            var alreadyQuery =
              "UPDATE `order_details` SET `product_quantity` = ?, `product_total_price` = ?, `deduct_price` = ? WHERE `order_details`.`order_details_id` = ?";
            db.query(
              "SELECT * FROM `products` WHERE `products`.`product_id` = ?",
              [use_product_id],
              (err1, res1) => {
                if (!err1) {
                  db.query(
                    "SELECT * FROM `order_details` WHERE `order_details`.`product_id` = ? AND `order_details`.`order_id` = ?",
                    [use_product_id, order_id],
                    (err2, res2) => {
                      if (!err2) {
                        console.log("Product details1111 : ", res2[0]);
                        if (res2.length <= 0) {
                          db.query(
                            "SELECT * FROM `extra_cat` WHERE `extra_cat_id` = ?",
                            [res1[0].product_cat_id],
                            (err3, res3) => {
                              if (!err3) {
                                // console.log("Deduct amount : ", res3[0].retailer_deduct_percentage)

                                // extra cat popularity add
                                db.query(
                                  "UPDATE `extra_cat` SET `popular_cat_value` = ? WHERE `extra_cat`.`extra_cat_id` = ?",
                                  [
                                    res3[0].popular_cat_value + 1,
                                    res3[0].extra_cat_id,
                                  ],
                                  (err5, res5) => {
                                    if (err5) {
                                      console.log(
                                        "Extra cat popularity add: ",
                                        err5
                                      );
                                      res.send(
                                        "Error in extra cat popularity add"
                                      );
                                      console.error(err5);
                                    }
                                  }
                                );

                                //  determine which seller type, to add deduct percentage
                                const percentage =
                                  res11[0].shop_type == 1
                                    ? res3[0].manufacturer_deduct_percentage
                                    : res3[0].retailer_deduct_percentage;

                                db.query(
                                  query,
                                  [
                                    order_id,
                                    use_product_id,
                                    1,
                                    res1[0].product_price,
                                    0,
                                    res1[0].product_price * (percentage / 100),
                                  ],
                                  (err4, res4) => {
                                    if (!err4) {
                                      // console.log("order_id", order_id)
                                      addToOrderBySeller(order_id);
                                      res.redirect(
                                        "/emp-order-details/" + order_id
                                      );
                                    } else {
                                      res.send(
                                        "Error in inserting order details"
                                      );
                                      console.error(err4);
                                    }
                                  }
                                );
                              } else {
                                res.send("Error in extra cat");
                                console.error(err3);
                              }
                            }
                          );
                        } else {
                          console.log("Already in cart section");
                          var perPrice =
                            res2[0].product_total_price /
                            res2[0].product_quantity;
                          db.query(
                            "SELECT * FROM `extra_cat` WHERE `extra_cat_id` = ?",
                            [res1[0].product_cat_id],
                            (err3, res3) => {
                              if (!err3) {
                                const percentage =
                                  res11[0].shop_type == 1
                                    ? res3[0].manufacturer_deduct_percentage
                                    : res3[0].retailer_deduct_percentage;
                                const new_total_price =
                                  res2[0].product_total_price + perPrice;

                                db.query(
                                  alreadyQuery,
                                  [
                                    res2[0].product_quantity + 1,
                                    // res2[0].product_total_price + perPrice,
                                    new_total_price,
                                    // res2[0].deduct_price + res3[0].retailer_deduct_percentage,
                                    new_total_price * (percentage / 100),
                                    res2[0].order_details_id,
                                  ],
                                  (err4, res4) => {
                                    if (!err4) {
                                      res.redirect(
                                        "/emp-order-details/" + order_id
                                      );
                                    } else {
                                      res.send(
                                        "Error in updating order details"
                                      );
                                      console.error(err4);
                                    }
                                  }
                                );
                              } else {
                                res.send("Error in extra cat");
                                console.error(err3);
                              }
                            }
                          );
                        }
                      } else {
                        res.send("Error in order details");
                        console.error(err2);
                      }
                    }
                  );
                } else {
                  res.send("Error in products");
                  console.error(err1);
                }
              }
            );
          } else {
            res.redirect("/employee-login");
          }
        } else {
          res.send("Error in shop");
          console.error(err11);
        }
      }
    );
  }

  db.query(
    "SELECT * FROM `orders` WHERE `order_id` = ?",
    [order_id],
    (errPid, resPid) => {
      if (!errPid) {
        // return res.send("Under construction")
        if (order_id == "") {
          addCart();
        } else if (order_id != "" && resPid[0].seller_id == seller_id) {
          addCart();
        } else {
          res.send(`
                    <script>
                        alert("You have already added products from another seller to your cart. Please complete it first or cancel the order!");
                        window.history.go(-1);
                    </script>
                `);
        }
      } else {
        res.send(errPid);
      }
    }
  );
};

function addToOrderBySeller(order_id) {
  var oID = order_id;
  db.query(
    "SELECT * FROM `order_details` WHERE `order_details`.`order_id` = ?",
    [oID],
    (err11, res11) => {
      if (!err11) {
        console.log("Products : ", res11, order_id);
        if (res11.length > 0) {
          db.query(
            "UPDATE `orders` SET `in_cart` = '0', `request_review` = '1', `seller_confirm` = '0' WHERE `orders`.`order_id` = ?",
            [oID],
            (err1, res1) => {
              console.log("Order updated", oID, res1);
              if (!err1) {
                db.query(
                  "SELECT * FROM `orders` INNER JOIN `shop` ON `shop`.`id` = `orders`.`seller_id` INNER JOIN `user` ON `user`.`user_id` = `shop`.`seller_user_id` WHERE `orders`.`order_id` = ?",
                  [oID],
                  (err2, res2) => {
                    if (!err2) {
                    } else {
                    }
                  }
                );
              } else {
              }
            }
          );
        } else {
          console.log("No products");

          return;
        }
      } else {
      }
    }
  );
}

exports.updateUserOrder = async (req, res) => {
  try {
    const { address, charge, order_id } = req.body;
    const orderUpdateQuery =
      "UPDATE orders SET address = ?, deliveryCharge = ? WHERE order_id = ?";

    db.query(orderUpdateQuery, [address, charge, order_id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }

      return res.redirect(`emp-order-details/${order_id}`);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
