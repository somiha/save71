const express = require("express");
const { home } = require("../controllers/home.controller");
const {
  loginRender,
  loginPost,
  logout,
  emailVerify,
  passReset,
} = require("../controllers/login.controller");
const isLogged = require("../middlewares/isLogin");
const loginRouter = express.Router();
const router = express.Router();

router.get("/", home);
// router.get("/", isLogged, loginRender);
// router.post("/", loginPost);

module.exports = router;
