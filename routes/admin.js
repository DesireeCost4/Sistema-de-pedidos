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

function verificaAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next(); //midleware
  } else {
    req.flash(
      "error_msg",
      "Você precisa ser administrador para acessar esta página."
    );
    res.redirect("/admin/login"); // Redireciona para o login se não for admin
  }
}

router.get("/login", (req, res) => {
  res.render("admin/login");
});

// essa rota processa a auth do administrador na view de login
router.post("/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "senha123") {
    req.session.isAdmin = true; // Definindo o usuário como adm
    req.flash("success_msg", "Você está logado como administrador!");
    res.redirect("/admin/categorias");
  } else {
    req.flash("error_msg", "Credenciais inválidas");
    res.redirect("/admin/login");
  }
});

router.get("/", (req, res) => {
  const openOffCanvas = req.query.openOffCanvas === "true";
  const carrinho = req.session.carrinho || [];
  const { nomeProduto, action } = req.query;

  if (nomeProduto && action) {
    const produtoNoCarrinho = carrinho.find(
      (item) => item.nomeProduto === nomeProduto
    );

    if (produtoNoCarrinho) {
      if (action === "incrementar") {
        produtoNoCarrinho.quantidade += 1;
      } else if (action === "decrementar" && produtoNoCarrinho.quantidade > 1) {
        produtoNoCarrinho.quantidade -= 1;
      }

      produtoNoCarrinho.precoTotal =
        produtoNoCarrinho.quantidade * produtoNoCarrinho.preco;
    }

    // Redireciona para abrir o offcanvas após a atualização da quantidade
    return res.redirect("/admin?openOffCanvas=true");
  }

  const totalCarrinho = carrinho.reduce(
    (total, item) => total + (item.precoTotal || 0),
    0
  );

  const carrinhoVazio = carrinho.length === 0;

  Categoria.find()
    .then((categorias) => {
      res.render("admin", {
        openOffCanvas,
        categorias: categorias,
        carrinho: carrinho,
        carrinhoVazio: carrinhoVazio,
        totalCarrinho: totalCarrinho.toFixed(2),
      });
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao listar os produtos");
      res.redirect("/admin");
    });
});

//
// Rota para mostrar produtos cadastrados (apenas adms)
router.get("/categorias", verificaAdmin, (req, res) => {
  Categoria.find()
    .then((categorias) => {
      res.render("admin/categorias", { categorias: categorias });
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro ao listar os produtos");
      res.redirect("/admin");
    });
});

// Rota para adicionar novo
router.post(
  "/categorias/nova",
  verificaAdmin,
  upload.single("imagem"),
  (req, res) => {
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
      imagem: req.file ? `/uploads/${req.file.filename}` : "",
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
  }
);

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

// Rota para editar produto
router.post("/categorias/edit", upload.single("imagem"), (req, res) => {
  Categoria.findOne({ _id: req.body.id })
    .then((categoria) => {
      if (!req.body.nome || !req.body.preco || !req.body.slug) {
        // Validação de campos obrigatórios
        const erros = [];
        if (!req.body.nome) erros.push({ texto: "Nome é obrigatório" });
        if (!req.body.preco) erros.push({ texto: "Preço é obrigatório" });
        if (!req.body.slug) erros.push({ texto: "Slug é obrigatório" });

        return res.render("admin/editcategorias", {
          categoria: categoria,
          erros: erros,
        });
      }

      // Atualiza os campos da categoria
      categoria.nome = req.body.nome;
      categoria.preco = req.body.preco;
      categoria.slug = req.body.slug;

      // Se houver uma imagem nova, atualiza o campo de imagem
      if (req.file) {
        categoria.imagem = `/uploads/${req.file.filename}`;
      }

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

// apagar produtos
router.post("/categorias/deletar", async (req, res) => {
  try {
    const categoriaId = req.body.id;

    if (!categoriaId) {
      req.flash("error_msg", "ID da categoria não fornecido");
      return res.redirect("/admin/categorias");
    }

    const categoria = await Categoria.findByIdAndDelete(categoriaId);

    if (!categoria) {
      req.flash("error_msg", "Categoria não encontrada");
      return res.redirect("/admin/categorias");
    }

    req.flash("success_msg", "Categoria deletada com sucesso");
    res.redirect("/admin/categorias");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Erro ao deletar a categoria: " + err.message);
    res.redirect("/admin/categorias");
  }
});

//inserir no carrinho
router.post("/adcionarCarrinho/:nome", async (req, res) => {
  try {
    const nomeProduto = req.params.nome;
    const quantidade = parseInt(req.body.quantidade) || 1;

    // Recupera o produto pelo nome e verifica se ele existe
    const produto = await Categoria.findOne({ nome: nomeProduto });
    if (!produto) {
      req.flash("error_msg", "Produto não encontrado.");
      return res.redirect("/admin");
    }

    // Pega o ID, preço e imagem diretamente do banco de dados
    const idProduto = produto._id;
    const preco = parseFloat(produto.preco);
    const imagem = produto.imagem;

    // Verifica se o carrinho já existe na sessão; senão, cria um novo
    if (!req.session.carrinho) {
      req.session.carrinho = [];
    }

    // Verifica se o produto já está no carrinho
    const produtoNoCarrinho = req.session.carrinho.find(
      (item) => item.nomeProduto === nomeProduto
    );

    if (produtoNoCarrinho) {
      produtoNoCarrinho.quantidade += quantidade;
      produtoNoCarrinho.precoTotal = produtoNoCarrinho.quantidade * preco;
    } else {
      const precoTotal = quantidade * preco;
      req.session.carrinho.push({
        idProduto,
        nomeProduto,
        quantidade,
        preco,
        precoTotal,
        imagem,
      });
    }

    req.flash("success_msg", "Produto adicionado ao carrinho!");
    res.redirect("/admin?openOffCanvas=true");
  } catch (error) {
    console.error("Erro ao adicionar produto ao carrinho:", error);
    req.flash("error_msg", "Erro ao adicionar o produto ao carrinho.");
    res.redirect("/admin");
  }
});
//retirar produto
router.post("/removerCarrinho/:nome", (req, res) => {
  const nomeProduto = req.params.nome;

  if (req.session.carrinho) {
    req.session.carrinho = req.session.carrinho.filter(
      (item) => item.nomeProduto !== nomeProduto
    );
  }

  req.flash("success_msg", "Produto removido do carrinho!");
  res.redirect("/admin"); // Redireciona para a página do admin
});

router.post("/enviarCarrinhoWhatsApp", (req, res) => {
  const carrinho = req.session.carrinho || [];
  const nomeCliente = req.body.nomeCliente;
  const endereco = req.body.endereco;
  const formaPagamento = req.body.formaPagamento;
  const troco = req.body.troco
    ? `Troco para R$ ${req.body.troco}`
    : "Sem troco";

  if (carrinho.length === 0) {
    req.flash("error_msg", "Carrinho está vazio.");
    return res.redirect("/admin/carrinho");
  }

  let valorTotal = 0;
  let mensagem = `*Pedido de: ${nomeCliente}*\n\nEndereço: ${endereco}\nForma de pagamento: ${formaPagamento}\n${troco}\n\n *Itens do Carrinho:*\n`;

  carrinho.forEach((item) => {
    const subtotal = item.quantidade * item.preco;
    valorTotal += subtotal;
    mensagem += `Produto: ${item.nomeProduto}\nQuantidade: ${item.quantidade}\nPreço unitário: R$ ${item.preco}\nSubtotal: R$ ${subtotal}\n\n`;
  });

  mensagem += `\n*Valor Total do Carrinho: R$ ${valorTotal.toFixed(2)}*`;

  const linkWhatsApp = `https://api.whatsapp.com/send?phone=5531999999999&text=${encodeURIComponent(
    mensagem
  )}`;

  res.redirect(linkWhatsApp);
});

module.exports = router;
