(() => {
  const grupos = [
    { classe: "eleito", lista: document.querySelector("#lista-eleitos") },
    { classe: "suplente", lista: document.querySelector("#lista-suplentes") },
    { classe: "nao_eleito", lista: document.querySelector("#lista-nao-eleitos") },
  ];
  const erro = document.querySelector("#erro-lista");

  function classe(texto) {
    const normal = String(texto || "").trim().toLowerCase();
    if (normal.startsWith("não eleito") || normal.startsWith("nao eleito")) return "nao_eleito";
    if (normal.startsWith("eleito")) return "eleito";
    if (normal.startsWith("suplente")) return "suplente";
    return "";
  }

  function termo(rotulo, valor) {
    const dt = document.createElement("dt");
    dt.textContent = rotulo;
    const dd = document.createElement("dd");
    dd.textContent = valor;
    return [dt, dd];
  }

  function cartao(pessoa) {
    const bloco = document.createElement("li");
    bloco.className = "item";
    const titulo = document.createElement("h3");
    titulo.textContent = `${pessoa.nome_completo} (${pessoa.nome_urna})`;
    const meta = document.createElement("dl");
    meta.className = "meta";
    const votos = pessoa.votos_nominais == null
      ? "O arquivo de votação não publicou votos nominais."
      : String(pessoa.votos_nominais);
    meta.append(
      ...termo("Partido", pessoa.partido),
      ...termo("Totalização", pessoa.totalizacao),
      ...termo("Votos nominais", votos),
    );
    bloco.append(titulo, meta);
    return bloco;
  }

  fetch("../../../dados/silver/vereadores/cadastro.json")
    .then((resposta) => {
      if (!resposta.ok) throw new Error(String(resposta.status));
      return resposta.json();
    })
    .then((dado) => {
      for (const pessoa of dado.vereadores) {
        const grupo = grupos.find((item) => item.classe === classe(pessoa.totalizacao));
        if (!grupo) throw new Error(pessoa.totalizacao);
        grupo.lista.append(cartao(pessoa));
      }
    })
    .catch(() => {
      erro.hidden = false;
    });
})();
