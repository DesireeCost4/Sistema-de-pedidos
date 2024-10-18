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

// Rota para listar produtos na view principal
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

// Rota para editar categorias
router.post("/categorias/edit", upload.single("imagem"), (req, res) => {
  console.log(req.file);
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

router.post("/adcionarCarrinho/:nome", (req, res) => {
  console.log(req.body); // Log para depuração

  const nomeProduto = req.params.nome; // Pega o nome do produto da URL
  const idProduto = req.body.id; // Pega o ID do produto da requisição
  const quantidade = parseInt(req.body.quantidade) || 1; // Define como 1 se não for especificado
  const preco = parseFloat(req.body.preco); // Pega o preço do corpo da requisição

  // Verifica se existe um carrinho na sessão, senão cria um novo
  if (!req.session.carrinho) {
    req.session.carrinho = [];
  }

  // Adiciona o produto ao carrinho
  const produtoNoCarrinho = req.session.carrinho.find(
    (item) => item.nomeProduto === idProduto
  );

  if (produtoNoCarrinho) {
    // Se o produto já está no carrinho, atualiza a quantidade
    produtoNoCarrinho.quantidade += quantidade;
  } else {
    // Senão, adiciona o novo produto ao carrinho
    req.session.carrinho.push({ idProduto, nomeProduto, quantidade, preco });
  }

  req.flash("success_msg", "Produto adicionado ao carrinho!");
  res.redirect("/admin");
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

router.post("/atualizarCarrinho", (req, res) => {
  const { nome, quantidade, preco } = req.body; // Captura nome e quantidade do corpo da requisição

  // Verifica se o carrinho existe na sessão
  if (!req.session.carrinho) {
    return res.status(400).send("Carrinho não encontrado.");
  }

  // Atualiza a quantidade do item no carrinho e recalcula o preço total
  req.session.carrinho = req.session.carrinho.map((item) => {
    if (item.nomeProduto === nome) {
      // Compara com o nome correto do produto
      item.quantidade = parseInt(quantidade) || 1; // Atualiza a quantidade
      item.preco = parseFloat(preco); // Atualiza o preço unitário do item
      item.precoTotal = item.preco * item.quantidade; // Recalcula o preço total do item
    }
    return item;
  });

  console.log(`Produto: ${nome}, Quantidade: ${quantidade}, Preço: ${preco}`);

  res.redirect("/admin/carrinho"); // Redireciona de volta para o carrinho
});

router.post("/removerCarrinho/:nome", (req, res) => {
  const nomeProduto = req.params.nome;

  if (req.session.carrinho) {
    // Remove o produto com base no nome
    req.session.carrinho = req.session.carrinho.filter(
      (item) => item.nomeProduto !== nomeProduto
    );
  }

  req.flash("success_msg", "Produto removido do carrinho!");
  res.redirect("/admin/carrinho"); // Redireciona para a página do carrinho
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

  // Calcula o total do carrinho
  let valorTotal = 0;
  let mensagem = `*Pedido de ${nomeCliente}*\n\nEndereço: ${endereco}\nForma de pagamento: ${formaPagamento}\n${troco}\n\n*Itens do Carrinho:*\n`;

  carrinho.forEach((item) => {
    const subtotal = item.quantidade * item.preco;
    valorTotal += subtotal; // Soma o subtotal de cada produto ao valor total
    mensagem += `Produto: ${item.nomeProduto}\nQuantidade: ${item.quantidade}\nPreço unitário: R$ ${item.preco}\nSubtotal: R$ ${subtotal}\n\n`;
  });

  // Adiciona o valor total ao final da mensagem
  mensagem += `\n*Valor Total do Carrinho: R$ ${valorTotal.toFixed(2)}*`;

  const linkWhatsApp = `https://api.whatsapp.com/send?phone=5531999999999&text=${encodeURIComponent(
    mensagem
  )}`;

  // Redireciona para o WhatsApp com a mensagem pronta
  res.redirect(linkWhatsApp);
});

module.exports = router;
