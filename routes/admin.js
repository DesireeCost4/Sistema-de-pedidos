const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("../models/Categoria");
const path = require("path");
const multer = require("multer");

const Categoria = mongoose.model("categorias");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Rota para listar categorias
router.get("/", (req, res) => {
  Categoria.find()
    .then((categorias) => {
      res.render("admin", { categorias: categorias });
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao listar os produtos");
      res.redirect("/admin");
    });
});

// Rota de carrinho

// Rota de carrinho
router.post("/adcionarCarrinho/:nome", (req, res) => {
  console.log(req.body); // Log para depuração

  const nomeProduto = req.params.nome; // Pega o nome do produto da URL
  const idProduto = req.body.id; // Pega o ID do produto da requisição
  const quantidade = parseInt(req.body.quantidade) || 1; // Se não for especificado, define como 1
  const preco = req.params.preco;

  // Verifica se existe um carrinho na sessão, senão cria um novo
  if (!req.session.carrinho) {
    req.session.carrinho = [];
  }

  // Adiciona a categoria ao carrinho
  const produtoNoCarrinho = req.session.carrinho.find(
    (item) => item.idProduto === idProduto
  );

  if (produtoNoCarrinho) {
    // Se o produto já está no carrinho, atualiza a quantidade
    produtoNoCarrinho.quantidade += quantidade;
  } else {
    // Senão, adiciona o novo produto ao carrinho
    req.session.carrinho.push({ idProduto, nomeProduto, quantidade });
  }

  req.flash("success_msg", "Produto adicionado ao carrinho!");
  res.redirect("/admin/carrinho"); // Redireciona para a página admin após adicionar
});

router.get("/carrinho", (req, res) => {
  const carrinho = req.session.carrinho || [];
  const carrinhoVazio = carrinho.length === 0;

  res.render("admin/carrinho", {
    categorias: [], // Você pode buscar categorias aqui se precisar
    carrinho: carrinho,
    carrinhoVazio: carrinhoVazio,
  });
});

// Rota para mostrar categorias
router.get("/categorias", (req, res) => {
  Categoria.find()
    .then((categorias) => {
      res.render("admin/categorias", { categorias: categorias });
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao listar os produtos");
      res.redirect("/admin");
    });
});

// Rota para adicionar nova categoria
router.post("/categorias/nova", upload.single("imagem"), (req, res) => {
  let erros = [];

  // Verificação dos campos obrigatórios
  if (!req.body.nome || req.body.nome.trim() === "") {
    erros.push({ texto: "Nome inválido" });
  }

  if (!req.body.preco || req.body.preco.trim() === "") {
    erros.push({ texto: "Preço inválido" });
  }

  if (!req.body.slug || req.body.slug.trim() === "") {
    erros.push({ texto: "Slug inválido" });
  }

  // Verificação da imagem
  if (!req.file) {
    erros.push({ texto: "Imagem do produto é obrigatória" });
  }

  // Se houver erros, renderiza novamente o formulário
  if (erros.length > 0) {
    return res.render("admin/addcategorias", { erros: erros });
  }

  // Cria nova categoria se não houver erros
  const novaCategoria = {
    nome: req.body.nome,
    preco: req.body.preco,
    slug: req.body.slug,
    imagem: req.file.filename,
  };

  new Categoria(novaCategoria)
    .save()
    .then(() => {
      req.flash("success_msg", "Produto cadastrado com sucesso!");
      res.redirect("/admin/categorias");
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao cadastrar produto.");
      res.redirect("/admin");
    });
});

// Rota para mostrar o formulário de adição de categorias
router.get("/categorias/add", (req, res) => {
  res.render("admin/addcategorias");
});

// Rota para editar categorias
router.get("/categorias/edit/:id", (req, res) => {
  Categoria.findOne({ _id: req.params.id })
    .then((categoria) => {
      res.render("admin/editcategorias", { categoria: categoria });
    })
    .catch((err) => {
      req.flash("error_msg", "Este produto não existe" + err);
      res.redirect("/admin/categorias");
    });
});

// Rota para editar categorias
router.post("/categorias/edit", (req, res) => {
  Categoria.findOne({ _id: req.body.id })
    .then((categoria) => {
      categoria.nome = req.body.nome;
      categoria.preco = req.body.preco;
      categoria.slug = req.body.slug;
      categoria.imagem = req.body.imagem;

      categoria
        .save()
        .then(() => {
          req.flash("success_msg", "Categoria editada com sucesso!");
          res.redirect("/admin/categorias");
        })
        .catch((err) => {
          req.flash("error_msg", "Houve um erro interno ao salvar edição");
          res.redirect("/admin/categorias");
        });
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao editar produto");
      res.redirect("/admin/categorias");
    });
});

// Rota para deletar categorias
router.post("/categorias/deletar", (req, res) => {
  Categoria.deleteOne({ _id: req.body.id })
    .then(() => {
      req.flash("success_msg", "Categoria deletada com sucesso!");
      res.redirect("/admin/categorias");
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao deletar produto");
      res.redirect("/admin/categorias");
    });
});

module.exports = router;
