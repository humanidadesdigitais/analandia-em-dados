(() => {
  const lista = document.querySelector("#lista-arquivo");
  const erro = document.querySelector("#erro-lista");
  const colecao = lista.dataset.colecao;

  function diaDe(item) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.realizada_em || "")) return item.realizada_em;
    const forma = String(item.data || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!forma) return "";
    return `${forma[3]}-${forma[2]}-${forma[1]}`;
  }

  function dataCurta(iso) {
    const forma = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!forma) return "—";
    return `${forma[3]}/${forma[2]}/${forma[1]}`;
  }

  function termo(rotulo, valor) {
    const dt = document.createElement("dt");
    dt.textContent = rotulo;
    const dd = document.createElement("dd");
    dd.textContent = valor;
    return [dt, dd];
  }

  function cartao(item) {
    const bloco = document.createElement("article");
    bloco.className = "item";
    const titulo = document.createElement("h3");
    const meta = document.createElement("dl");
    meta.className = "meta";
    if (colecao === "chamadas") {
      titulo.textContent = `${item.titulo} · Chamada Nº${item.numero}`;
      meta.append(...termo("Data", dataCurta(diaDe(item))), ...termo("Período", item.periodo || "—"));
    } else {
      titulo.textContent = item.documento || item.titulo || "Súmula";
      meta.append(
        ...termo("Sessão", item.titulo || "—"),
        ...termo("Data", dataCurta(diaDe(item))),
      );
      if (item.resultado) meta.append(...termo("Resultado", item.resultado));
    }
    const acoes = document.createElement("p");
    acoes.className = "acoes";
    const pdf = document.createElement("a");
    pdf.href = `../../../dados/bronze/sessoes-plenarias/${item.origem.arquivo}`;
    pdf.textContent = "Abrir PDF";
    const fonte = document.createElement("a");
    fonte.href = item.origem.url;
    fonte.textContent = "Fonte";
    acoes.append(pdf, fonte);
    bloco.append(titulo, meta, acoes);
    return bloco;
  }

  function definirAberto(corpo, alternar, aberto) {
    corpo.hidden = !aberto;
    alternar.setAttribute("aria-expanded", aberto ? "true" : "false");
    alternar.textContent = aberto ? "Fechar" : "Abrir";
    alternar.setAttribute("aria-label", `${aberto ? "Fechar" : "Abrir"} ${alternar.dataset.titulo}`);
  }

  function blocoAno(ano, itens, aberto) {
    const secao = document.createElement("section");
    secao.className = "arquivo-ano";
    const topo = document.createElement("div");
    topo.className = "arquivo-ano-topo";
    const titulo = document.createElement("h2");
    titulo.textContent = String(ano);
    topo.append(titulo);
    const corpo = document.createElement("div");
    corpo.className = "arquivo-ano-corpo";
    corpo.append(...itens.map(cartao));
    if (!aberto) {
      corpo.hidden = true;
      const alternar = document.createElement("button");
      alternar.type = "button";
      alternar.className = "vereadores-alternar";
      alternar.dataset.titulo = String(ano);
      definirAberto(corpo, alternar, false);
      alternar.addEventListener("click", () => {
        definirAberto(corpo, alternar, corpo.hidden);
      });
      topo.append(alternar);
    }
    secao.append(topo, corpo);
    return secao;
  }

  async function carregar() {
    const resposta = await fetch(`../../../dados/silver/sessoes-plenarias/${colecao}.json`);
    if (!resposta.ok) throw new Error(String(resposta.status));
    const lido = await resposta.json();
    const itens = lido[colecao];
    if (!Array.isArray(itens)) throw new Error("formato");
    return itens.map((item, indice) => ({ ...item, indice }));
  }

  carregar()
    .then((itens) => {
      const porAno = new Map();
      itens.forEach((item) => {
        const ano = diaDe(item).slice(0, 4);
        const grupo = porAno.get(ano) || [];
        grupo.push(item);
        porAno.set(ano, grupo);
      });
      const anos = [...porAno.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      anos.forEach(([, grupo]) => {
        grupo.sort((a, b) => diaDe(b).localeCompare(diaDe(a)) || a.indice - b.indice);
      });
      lista.append(...anos.map(([ano, grupo], indice) => blocoAno(ano, grupo, indice === 0)));
    })
    .catch(() => {
      lista.hidden = true;
      erro.hidden = false;
    });
})();
