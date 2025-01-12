exports.shopEmployee = async (req, res) => {
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

      // First Query to fetch shop employee data
      db.query(
        "SELECT *, `shop`.`shop_custom_url`, `employees`.`name` as employee_name FROM `employees` INNER JOIN `shop` ON `shop`.`id` = `employees`.`shop_id` WHERE `shop`.`seller_user_id` = ? ORDER BY `employees`.`name` ASC",
        [uID],
        (err1, res1) => {
          console.log(uID);

          if (!err1) {
            // Check if employees are returned
            if (res1.length > 0) {
              // Query to fetch additional employee details (if any)
              db.query(
                "SELECT * FROM `employees` INNER JOIN `shop` ON `shop`.`id` = `employees`.`shop_id` INNER JOIN `employee_images` ON `employees`.`employee_id` = `employee_images`.`employee_id` WHERE `shop`.`seller_user_id` = ? AND `employee_images`.`profile_image` = 1",
                [uID],
                (err2, res2) => {
                  if (!err2) {
                    var images = res2.map((image) => {
                      image.employee_id = crypto.smallEncrypt(
                        image.employee_id
                      );
                      return image;
                    });

                    var employees = res1.map((employee) => {
                      employee.employee_id = crypto.smallEncrypt(
                        employee.employee_id
                      );
                      return employee;
                    });

                    res.render("shop-employee/emp-dashboard", {
                      ogImage: "https://admin.save71.com/images/logo-og.webp",
                      ogTitle:
                        "Save71 Connects You and the World through Business.",
                      ogUrl: "https://admin-save71.lens-ecom.store",
                      currRate,
                      currencyCode,
                      myPermissions,
                      userName: userName,
                      userImage: userImage,
                      menuId: "shop-owner-employees",
                      employees: employees,
                      images: images,
                      name: "Employees",
                      notification: notification,
                      shop_custom_url: res1[0].shop_custom_url, // Access safely
                    });
                  } else {
                    res.status(500).send(err2);
                  }
                }
              );
            } else {
              // Handle no employees case
              res.render("shop-employee/emp-dashboard", {
                ogImage: "https://admin.save71.com/images/logo-og.webp",
                ogTitle: "Save71 Connects You and the World through Business.",
                ogUrl: "https://admin-save71.lens-ecom.store",
                currRate,
                currencyCode,
                userName: userName,
                userImage: userImage,
                menuId: "shop-owner-employees",
                employees: [], // Empty employees
                images: [], // Empty images array
                name: "Employees",
                notification: notification,
                shop_custom_url: "", // Provide fallback if no employee found
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
