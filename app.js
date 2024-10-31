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




//config
app.use(
  session({
    secret: "1010",
    resave: true,
    saveUninitialized: true,
  })
); 
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
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
  helpers: {
    eq: (a, b) => a === b,
  },
});
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");


//banco de dados
const mongoURL = "mongodb+srv://desireecdev:y45SiBineq0QW9x4@cluster0.tpwg7.mongodb.net/loja?retryWrites=true&w=majority&appName=Cluster0";

mongoose.Promise = globalThis.Promise;
mongoose
  .connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conectado ao MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
  });

//public
app.use(express.static(path.join(__dirname, "public")));

//rotas
app.use("/admin", admin);

//outros
app.listen(8080, () => {
  console.log("Servidor rodando na porta 8080");
});


module.exports = app;
