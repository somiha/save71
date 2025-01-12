// redirectLogin.js
const crypto = require("./crypto");

const redirectToLogin = (req, res, next) => {
  // console.log("RedirectLogin: ", req.originalUrl);

  // console.log("RedirectLogin Status: ", res.statusCode)
  // if (res.statusCode >= 400) {
  //   return res.redirect('/login');
  // }
  const exemptedRoutes = ["/", "/registration", "login"];
  if (exemptedRoutes.includes(req.path)) {
    return next();
  }

  const encryptedLoginStatus = req.cookies.login_status;

  if (encryptedLoginStatus !== undefined) {
    const decryptedLoginStatus = crypto.decrypt(encryptedLoginStatus);

    if (decryptedLoginStatus === "true") {
      return next();
    }
  }
  return res.redirect("/login");
};

module.exports = {
  redirectToLogin,
};
