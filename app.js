//chamando os packs(modulos)
const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();
const admin = require("./routes/admin");

//const mongoose = require('mongoose')

//config
app.use(
  session({
    secret: "1010",
    resave: true,
    saveUninitialized: true,
  })
); //
app.use(flash());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//midleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

//bodyparseer
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//hadlebars
const handlebars = exphbs.create({
  defaultLayout: "main",
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
});
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

//mongoose
mongoose.Promise = globalThis.Promise;
mongoose
  .connect("mongodb://localhost:27017/loja", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conectado ao MongoDB");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
  });

//public
app.use(express.static(path.join(__dirname, "public")));

//rotas
app.use("/admin", admin);

//outros
const PORT = 8081;
app.listen(PORT, () => {
  console.log("Servidor rodando " + PORT);
});