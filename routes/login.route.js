const express = require("express");
const {
  loginRender,
  loginPost,
  logout,
  emailVerify,
  passReset,
} = require("../controllers/login.controller");
const loginRouter = express.Router();
const upload = require("../config/multer.config");
const isLogged = require("../middlewares/isLogin");

loginRouter.get("/login", isLogged, loginRender);
loginRouter.get("/logout", logout);
loginRouter.post("/login", loginPost);
loginRouter.post("/emailVerify", emailVerify);
loginRouter.post("/passReset/:email", passReset);

module.exports = loginRouter;
