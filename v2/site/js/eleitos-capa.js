(() => {
  const lista = document.querySelector("#eleitos-capa");
  if (!lista) return;

  function eleito(texto) {
    const normal = String(texto || "").trim().toLowerCase();
    if (normal.startsWith("não eleito") || normal.startsWith("nao eleito")) return false;
    return normal.startsWith("eleito");
  }

  function quadroFoto() {
    const quadro = document.createElement("p");
    quadro.className = "foto-quadro";
    quadro.textContent = "Foto";
    return quadro;
  }

  function cartao(pessoa) {
    const link = document.createElement("a");
    link.className = "eleito-card";
    link.href = `vereadores/?numero=${pessoa.numero}`;
    const nome = document.createElement("h3");
    nome.textContent = pessoa.nome_completo;
    const urna = document.createElement("p");
    urna.className = "nome-candidato";
    urna.textContent = pessoa.nome_urna;
    const partido = document.createElement("p");
    partido.textContent = pessoa.partido;
    link.append(quadroFoto(), nome, urna, partido);
    return link;
  }

  function cartaoCandidatos() {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.id = "abrir-vereadores";
    botao.className = "eleito-card eleito-card-candidatos";
    const nome = document.createElement("h3");
    nome.textContent = "Saiba quem se candidatou em 2024";
    botao.append(nome);
    return botao;
  }

  const candidatos = cartaoCandidatos();
  lista.append(candidatos);

  fetch("../dados/silver/vereadores/cadastro.json")
    .then((resposta) => {
      if (!resposta.ok) throw new Error(String(resposta.status));
      return resposta.json();
    })
    .then((cadastro) => {
      const eleitos = cadastro.vereadores.filter((pessoa) => eleito(pessoa.totalizacao));
      eleitos.map(cartao).forEach((card) => lista.insertBefore(card, candidatos));
    })
    .catch(() => {
      const aviso = document.createElement("p");
      aviso.className = "dialogo-erro";
      aviso.textContent = "Não foi possível ler os eleitos.";
      lista.insertBefore(aviso, candidatos);
    });
})();
