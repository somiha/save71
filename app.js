const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const Router = require("./routes/allRouters");
const redirectLogin = require("./middlewares/redirectLogin");
var fs = require("fs");
var util = require("util");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cookieParser());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "sdhfjakjdfasfkljhsadfkljhdfskhj",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(Router);
app.use(redirectLogin.redirectToLogin);

// Static files
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "/public/css"));
app.use("/images", express.static(__dirname + "/public/images"));
app.use("/js", express.static(__dirname + "/public/js"));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// var log_file = fs.createWriteStream(__dirname + "/debug.log", { flags: "w" });
// var log_stdout = process.stdout;
// var log_stderr = process.stderr;

// console.log = function (d) {
//   //
//   log_file.write(util.format(d) + "\n");
//   log_stdout.write(util.format(d) + "\n");
//   log_stderr.write(util.format(d) + "\n");
// };

// var access = fs.createWriteStream(__dirname + "/stdout.log", { flags: "w" });
// process.stdout.write = process.stderr.write = access.write.bind(access);

// process.on("uncaughtException", function (err) {
//   console.error(err && err.stack ? err.stack : err);
// });

const port = 3001;
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
