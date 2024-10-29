function atualizarQuantidade(nomeProduto, incremento, event) {
  event.preventDefault(); // Impede o comportamento padrão do botão

  fetch(`/adcionarCarrinho/${encodeURIComponent(nomeProduto)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantidade: incremento }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      if (data.message) {
        const quantidadeSpan = document.getElementById(
          `quantidade-${nomeProduto}`
        );
        quantidadeSpan.innerText = data.novaQuantidade; // Atualiza a quantidade no frontend

        // Abre o off-canvas após a atualização da quantidade
        var offcanvas = new bootstrap.Offcanvas(
          document.getElementById("offCanvas")
        );
        offcanvas.show();
      } else if (data.error) {
        console.error(data.error);
      }
    })
    .catch((error) => console.error("Erro:", error));
}
