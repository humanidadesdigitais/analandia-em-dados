(() => {
  const lista = document.querySelector("#lista-audiencias");
  const erro = document.querySelector("#erro-lista");

  function dataCurta(iso) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function rotuloTipo(tipo) {
    if (tipo === "convite") return "Convite";
    if (tipo === "ata") return "Ata";
    return tipo;
  }

  function maisRecente(grupo) {
    const datas = [...grupo.convites, ...grupo.atas].map((item) => item.data_documento);
    return datas.sort().at(-1) || "";
  }

  function porData(a, b) {
    return b.data_documento.localeCompare(a.data_documento);
  }

  function cartao(audiencia) {
    const bloco = document.createElement("article");
    bloco.className = "item";
    const titulo = document.createElement("h3");
    titulo.textContent = audiencia.titulo;
    const meta = document.createElement("dl");
    meta.className = "meta";
    const termo = document.createElement("dt");
    termo.textContent = "Data do documento";
    const definicao = document.createElement("dd");
    const tempo = document.createElement("time");
    tempo.dateTime = audiencia.data_documento;
    tempo.textContent = dataCurta(audiencia.data_documento);
    definicao.append(tempo);
    meta.append(termo, definicao);
    const acoes = document.createElement("p");
    acoes.className = "acoes";
    const pdf = document.createElement("a");
    pdf.href = `../../../dados/bronze/audiencias-publicas/${audiencia.origem.arquivo}`;
    pdf.textContent = "Abrir PDF";
    const fonte = document.createElement("a");
    fonte.href = audiencia.origem.url;
    fonte.textContent = "Fonte";
    acoes.append(pdf, fonte);
    bloco.append(titulo, meta, acoes);
    return bloco;
  }

  function lado(tipo, audiencias) {
    const coluna = document.createElement("div");
    coluna.className = "par-lado";
    const nome = document.createElement("p");
    nome.className = "par-tipo";
    nome.textContent = rotuloTipo(tipo);
    coluna.append(nome);
    if (audiencias.length === 0) {
      const vazio = document.createElement("p");
      vazio.className = "par-vazio";
      vazio.textContent = "Nenhum documento";
      coluna.append(vazio);
      return coluna;
    }
    coluna.append(...audiencias.map(cartao));
    return coluna;
  }

  function linha(grupo) {
    const bloco = document.createElement("li");
    bloco.className = "par-audiencia";
    const rotulo = document.createElement("p");
    rotulo.className = "par-rotulo";
    rotulo.textContent = grupo.peca || "Sem peça no título";
    const colunas = document.createElement("div");
    colunas.className = "par-colunas";
    colunas.append(lado("convite", grupo.convites), lado("ata", grupo.atas));
    bloco.append(rotulo, colunas);
    return bloco;
  }

  function agrupar(audiencias) {
    const ordem = { LDO: 0, LOA: 1, PPA: 2 };
    const grupos = new Map();
    for (const audiencia of audiencias) {
      const chave = audiencia.peca || "";
      if (!grupos.has(chave)) {
        grupos.set(chave, { peca: audiencia.peca, convites: [], atas: [] });
      }
      const grupo = grupos.get(chave);
      if (audiencia.tipo === "ata") grupo.atas.push(audiencia);
      else grupo.convites.push(audiencia);
    }
    for (const grupo of grupos.values()) {
      grupo.convites.sort(porData);
      grupo.atas.sort(porData);
    }
    return [...grupos.values()].sort((a, b) => {
      const data = maisRecente(b).localeCompare(maisRecente(a));
      if (data !== 0) return data;
      return (ordem[a.peca] ?? 3) - (ordem[b.peca] ?? 3);
    });
  }

  function definirAberto(corpo, alternar, aberto) {
    corpo.hidden = !aberto;
    alternar.setAttribute("aria-expanded", aberto ? "true" : "false");
    alternar.textContent = aberto ? "Fechar" : "Abrir";
    alternar.setAttribute("aria-label", `${aberto ? "Fechar" : "Abrir"} ${alternar.dataset.titulo}`);
  }

  function blocoAno(exercicio, audiencias, aberto) {
    const secao = document.createElement("section");
    secao.className = "arquivo-ano";
    const topo = document.createElement("div");
    topo.className = "arquivo-ano-topo";
    const titulo = document.createElement("h2");
    titulo.textContent = String(exercicio);
    topo.append(titulo);
    const corpo = document.createElement("ul");
    corpo.className = "arquivo-ano-corpo";
    corpo.append(...agrupar(audiencias).map(linha));
    if (!aberto) {
      corpo.hidden = true;
      const alternar = document.createElement("button");
      alternar.type = "button";
      alternar.className = "vereadores-alternar";
      alternar.dataset.titulo = String(exercicio);
      definirAberto(corpo, alternar, false);
      alternar.addEventListener("click", () => {
        definirAberto(corpo, alternar, corpo.hidden);
      });
      topo.append(alternar);
    }
    secao.append(topo, corpo);
    return secao;
  }

  function anos(audiencias) {
    const porAno = new Map();
    for (const audiencia of audiencias) {
      const itens = porAno.get(audiencia.exercicio) || [];
      itens.push(audiencia);
      porAno.set(audiencia.exercicio, itens);
    }
    return [...porAno.entries()].sort((a, b) => b[0] - a[0]);
  }

  async function carregar() {
    const resposta = await fetch("../../../dados/silver/audiencias-publicas/audiencias.json");
    if (!resposta.ok) throw new Error(String(resposta.status));
    const lido = await resposta.json();
    if (!Array.isArray(lido.audiencias)) throw new Error("formato");
    return lido.audiencias;
  }

  carregar()
    .then((audiencias) => {
      const grupos = anos(audiencias);
      lista.append(...grupos.map(([exercicio, itens], indice) => blocoAno(exercicio, itens, indice === 0)));
    })
    .catch(() => {
      lista.hidden = true;
      erro.hidden = false;
    });
})();
