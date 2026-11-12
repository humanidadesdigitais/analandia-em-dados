(() => {
  const ficha = document.querySelector("#ficha-vereador");
  const anos = document.querySelector("#votos-anos");
  const aviso = document.querySelector("#aviso-vereador");
  const erro = document.querySelector("#erro-vereador");
  const SVG = "http://www.w3.org/2000/svg";
  const ORDEM_VOTO = ["Favorável", "Contrário", "Abstenção"];
  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  function eleito(texto) {
    const normal = String(texto || "").trim().toLowerCase();
    if (normal.startsWith("não eleito") || normal.startsWith("nao eleito")) return false;
    return normal.startsWith("eleito");
  }

  function diaDaSessao(sumula) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(sumula.realizada_em || "")) return sumula.realizada_em;
    const forma = String(sumula.data || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!forma) return "";
    return `${forma[3]}-${forma[2]}-${forma[1]}`;
  }

  function dataPorExtenso(valor) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return `${dia} de ${MESES[mes - 1]} de ${ano}`;
  }

  function dataCurta(valor) {
    const forma = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!forma) return "—";
    return `${forma[3]}-${forma[2]}-${forma[1]}`;
  }

  function svg(nome, atributos) {
    const elemento = document.createElementNS(SVG, nome);
    Object.entries(atributos).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
    return elemento;
  }

  function celula(texto, elemento) {
    const item = document.createElement(elemento);
    item.textContent = texto;
    return item;
  }

  function corVoto(voto) {
    if (voto === "Favorável") return "var(--color-voto-favoravel)";
    if (voto === "Contrário") return "var(--color-voto-contrario)";
    if (voto === "Abstenção") return "var(--color-voto-abstencao)";
    return "var(--color-gray)";
  }

  function tiposPresentes(itens) {
    const extras = [...new Set(itens.map((item) => item.voto))]
      .filter((voto) => !ORDEM_VOTO.includes(voto))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [...ORDEM_VOTO, ...extras];
  }

  function porcentagem(parte, total) {
    if (!total) return "0%";
    const valor = (parte * 100) / total;
    return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }

  function legendaVotos(itens, total) {
    const lista = document.createElement("ul");
    lista.className = "legenda-grafico";
    itens.forEach((item) => {
      const linha = document.createElement("li");
      const marca = document.createElement("span");
      marca.className = "marca";
      marca.style.background = item.cor;
      linha.append(
        marca,
        document.createTextNode(`${item.rotulo}: ${item.quantidade} (${porcentagem(item.quantidade, total)})`),
      );
      lista.append(linha);
    });
    return lista;
  }

  function pizzaVotos(itens) {
    const tipos = tiposPresentes(itens);
    const contagem = new Map(tipos.map((tipo) => [tipo, 0]));
    itens.forEach((item) => contagem.set(item.voto, (contagem.get(item.voto) || 0) + 1));
    const fatias = tipos.map((tipo) => ({
      rotulo: tipo,
      quantidade: contagem.get(tipo) || 0,
      cor: corVoto(tipo),
    }));
    const total = itens.length;
    const bloco = document.createElement("figure");
    bloco.className = "grafico grafico-pizza";
    const titulo = document.createElement("figcaption");
    titulo.textContent = "Votos";
    const desenho = svg("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": "Proporção dos votos" });
    const cx = 100;
    const cy = 100;
    const raio = 78;
    let angulo = -Math.PI / 2;
    fatias.forEach((item) => {
      if (!item.quantidade || !total) return;
      const giro = (item.quantidade / total) * Math.PI * 2;
      const fim = angulo + giro;
      let caminho;
      if (giro >= Math.PI * 2 - 0.0001) {
        caminho = `M ${cx} ${cy - raio} A ${raio} ${raio} 0 1 1 ${cx - 0.01} ${cy - raio} Z`;
      } else {
        const x1 = cx + raio * Math.cos(angulo);
        const y1 = cy + raio * Math.sin(angulo);
        const x2 = cx + raio * Math.cos(fim);
        const y2 = cy + raio * Math.sin(fim);
        const grande = giro > Math.PI ? 1 : 0;
        caminho = `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 ${grande} 1 ${x2} ${y2} Z`;
      }
      const fatia = svg("path", { d: caminho, fill: item.cor });
      const dica = svg("title", {});
      dica.textContent = `${item.rotulo}: ${item.quantidade} (${porcentagem(item.quantidade, total)})`;
      fatia.append(dica);
      desenho.append(fatia);
      angulo = fim;
    });
    bloco.append(titulo, desenho, legendaVotos(fatias, total));
    return bloco;
  }

  function barrasDias(itens) {
    const tipos = tiposPresentes(itens);
    const porDia = new Map();
    itens.forEach((item) => {
      const atual = porDia.get(item.dia) || new Map();
      atual.set(item.voto, (atual.get(item.voto) || 0) + 1);
      porDia.set(item.dia, atual);
    });
    const dias = [...porDia.keys()].sort();
    const margemEsq = 48;
    const margemBaixo = 120;
    const margemTopo = 16;
    const larguraBarra = 32;
    const alturaTrilho = 180;
    const largura = margemEsq + Math.max(dias.length, 1) * larguraBarra + 8;
    const altura = margemTopo + alturaTrilho + margemBaixo;
    const bloco = document.createElement("figure");
    bloco.className = "grafico grafico-dias";
    const titulo = document.createElement("figcaption");
    titulo.textContent = "Votos por dia";
    const rolagem = document.createElement("div");
    rolagem.className = "grafico-rolagem";
    const desenho = svg("svg", {
      viewBox: `0 0 ${largura} ${altura}`,
      role: "img",
      "aria-label": "Proporção dos votos em cada dia",
    });
    desenho.style.width = `${largura}px`;
    desenho.style.height = `${altura}px`;
    [100, 50, 0].forEach((marca) => {
      const y = margemTopo + ((100 - marca) / 100) * alturaTrilho;
      const linha = svg("line", {
        x1: margemEsq,
        y1: y,
        x2: largura - 8,
        y2: y,
        stroke: "var(--color-border)",
      });
      const rotulo = svg("text", {
        class: "grafico-texto",
        x: margemEsq - 6,
        y: y + 4,
        "text-anchor": "end",
        "font-size": "12",
      });
      rotulo.textContent = `${marca}%`;
      desenho.append(linha, rotulo);
    });
    dias.forEach((dia, indice) => {
      const contagem = porDia.get(dia);
      const total = [...contagem.values()].reduce((soma, valor) => soma + valor, 0);
      let y = margemTopo + alturaTrilho;
      tipos.forEach((tipo) => {
        const quantidade = contagem.get(tipo) || 0;
        if (!quantidade || !total) return;
        const trecho = (quantidade / total) * alturaTrilho;
        y -= trecho;
        const barra = svg("rect", {
          x: margemEsq + indice * larguraBarra + 6,
          y,
          width: larguraBarra - 12,
          height: trecho,
          fill: corVoto(tipo),
        });
        const dica = svg("title", {});
        dica.textContent = `${tipo}: ${quantidade} de ${total}`;
        barra.append(dica);
        desenho.append(barra);
      });
      const x = margemEsq + indice * larguraBarra + larguraBarra / 2;
      const base = margemTopo + alturaTrilho + 8;
      const rotulo = svg("text", {
        class: "grafico-texto",
        x: 0,
        y: 0,
        "font-size": "11",
        "text-anchor": "start",
        transform: `translate(${x} ${base}) rotate(90)`,
      });
      rotulo.textContent = dataCurta(dia);
      desenho.append(rotulo);
    });
    rolagem.append(desenho);
    bloco.append(titulo, rolagem);
    return bloco;
  }

  const COLUNAS_SESSAO = [
    { chave: "dia", rotulo: "Data" },
    { chave: "documento", rotulo: "Documento" },
    { chave: "voto", rotulo: "Voto" },
  ];

  function compararItens(a, b, ordem) {
    const coluna = ordem.coluna || "dia";
    const direcao = ordem.coluna ? ordem.direcao : "desc";
    let base = 0;
    if (coluna === "dia") base = a.dia.localeCompare(b.dia);
    else if (coluna === "voto") base = ORDEM_VOTO.indexOf(a.voto) - ORDEM_VOTO.indexOf(b.voto);
    else base = String(a[coluna]).localeCompare(String(b[coluna]), "pt-BR");
    if (base === 0) return b.dia.localeCompare(a.dia) || a.documento.localeCompare(b.documento, "pt-BR");
    return direcao === "desc" ? -base : base;
  }

  function tabelaSessao(itens) {
    const ordem = { coluna: null, direcao: "desc" };
    const tabela = document.createElement("table");
    tabela.className = "presenca-lista";
    const cabecalho = document.createElement("thead");
    const linhaCabecalho = document.createElement("tr");
    const corpo = document.createElement("tbody");
    function preencher() {
      linhaCabecalho.replaceChildren();
      COLUNAS_SESSAO.forEach((coluna) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.setAttribute("aria-sort", ordem.coluna === coluna.chave ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "ordenar-coluna";
        botao.textContent = coluna.rotulo;
        botao.addEventListener("click", () => {
          if (ordem.coluna === coluna.chave) ordem.direcao = ordem.direcao === "asc" ? "desc" : "asc";
          else {
            ordem.coluna = coluna.chave;
            ordem.direcao = coluna.chave === "dia" ? "desc" : "asc";
          }
          preencher();
        });
        th.append(botao);
        linhaCabecalho.append(th);
      });
      corpo.replaceChildren();
      [...itens].sort((a, b) => compararItens(a, b, ordem)).forEach((item) => {
        const tr = document.createElement("tr");
        const voto = celula(item.voto, "td");
        voto.className = "presenca-valor";
        voto.dataset.voto = item.voto;
        tr.append(
          celula(item.dia ? dataPorExtenso(item.dia) : "—", "td"),
          celula(item.documento, "td"),
          voto,
        );
        corpo.append(tr);
      });
    }
    preencher();
    cabecalho.append(linhaCabecalho);
    tabela.append(cabecalho, corpo);
    return tabela;
  }

  function alternarBloco(botao, corpo, titulo, abertoInicial, aoMudar) {
    let aberto = abertoInicial;
    function aplicar() {
      corpo.hidden = !aberto;
      botao.replaceChildren();
      const seta = document.createElement("span");
      seta.className = "seta";
      seta.setAttribute("aria-hidden", "true");
      botao.append(seta);
      botao.setAttribute("aria-expanded", aberto ? "true" : "false");
      botao.setAttribute("aria-label", `${aberto ? "Fechar" : "Abrir"} ${titulo}`);
      if (aoMudar) aoMudar(aberto);
    }
    botao.addEventListener("click", () => {
      aberto = !aberto;
      aplicar();
    });
    aplicar();
  }

  function secaoVotos(titulo, abertoInicial, aoMudar) {
    const secao = document.createElement("section");
    secao.className = "secao-votos";
    const topo = document.createElement("div");
    topo.className = "secao-votos-topo";
    const heading = document.createElement("h2");
    heading.textContent = titulo;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "vereadores-alternar seta-bloco";
    const corpo = document.createElement("div");
    corpo.className = "secao-votos-corpo";
    alternarBloco(botao, corpo, titulo, abertoInicial, aoMudar);
    topo.append(heading, botao);
    secao.append(topo, corpo);
    return { secao, corpo };
  }

  function blocoSessao(sessao) {
    const secao = document.createElement("section");
    secao.className = "sessao-voto";
    const topo = document.createElement("div");
    topo.className = "sessao-voto-topo";
    const heading = document.createElement("h3");
    heading.textContent = sessao.titulo;
    const quando = document.createElement("p");
    quando.textContent = dataCurta(sessao.dia);
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "vereadores-alternar seta-bloco";
    const corpo = document.createElement("div");
    corpo.className = "sessao-voto-corpo";
    corpo.append(tabelaSessao(sessao.itens));
    alternarBloco(botao, corpo, sessao.titulo, false);
    topo.append(heading, quando, botao);
    secao.append(topo, corpo);
    return secao;
  }

  function sessoesDe(itens) {
    const mapa = new Map();
    itens.forEach((item) => {
      const chave = `${item.dia}|${item.titulo}`;
      const grupo = mapa.get(chave) || { dia: item.dia, titulo: item.titulo, itens: [] };
      grupo.itens.push(item);
      mapa.set(chave, grupo);
    });
    return [...mapa.values()].sort((a, b) => b.dia.localeCompare(a.dia) || a.titulo.localeCompare(b.titulo, "pt-BR"));
  }

  function menuMultiplo(rotulo) {
    const bloco = document.createElement("div");
    bloco.className = "vereadores-filtro menu-multiplo";
    const titulo = document.createElement("span");
    titulo.textContent = rotulo;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "menu-multiplo-botao";
    botao.setAttribute("aria-haspopup", "true");
    botao.setAttribute("aria-expanded", "false");
    const resumo = document.createElement("span");
    resumo.className = "menu-multiplo-resumo";
    resumo.textContent = "Todos";
    const seta = document.createElement("span");
    seta.className = "seta";
    seta.setAttribute("aria-hidden", "true");
    botao.append(resumo, seta);
    const lista = document.createElement("div");
    lista.className = "menu-multiplo-lista";
    lista.hidden = true;
    botao.addEventListener("click", (evento) => {
      evento.stopPropagation();
      const abrir = lista.hidden;
      document.querySelectorAll(".menu-multiplo-lista").forEach((outra) => {
        outra.hidden = true;
        outra.previousElementSibling.setAttribute("aria-expanded", "false");
      });
      lista.hidden = !abrir;
      botao.setAttribute("aria-expanded", abrir ? "true" : "false");
    });
    lista.addEventListener("click", (evento) => evento.stopPropagation());
    lista.addEventListener("change", () => {
      const marcados = [...lista.querySelectorAll("input:checked")].map((campo) => campo.dataset.rotulo);
      resumo.textContent = marcados.length ? marcados.join(", ") : "Todos";
    });
    bloco.append(titulo, botao, lista);
    return {
      bloco,
      lista,
      valores() {
        return [...lista.querySelectorAll("input:checked")].map((campo) => campo.value);
      },
      limpar() {
        lista.querySelectorAll("input").forEach((campo) => {
          campo.checked = false;
        });
        resumo.textContent = "Todos";
        lista.hidden = true;
        botao.setAttribute("aria-expanded", "false");
      },
    };
  }

  function opcaoMenu(rotulo, valor) {
    const label = document.createElement("label");
    label.className = "filtro-caixa";
    const campo = document.createElement("input");
    campo.type = "checkbox";
    campo.value = valor;
    campo.dataset.rotulo = rotulo;
    label.append(campo, document.createTextNode(rotulo));
    return label;
  }

  function menuDatas(datas) {
    const filtro = menuMultiplo("Data");
    datas.forEach((dia) => filtro.lista.append(opcaoMenu(dia ? dataCurta(dia) : "—", dia)));
    return filtro;
  }

  function menuSessao(itens) {
    const filtro = menuMultiplo("Sessão");
    const diaDoTitulo = new Map();
    itens.forEach((item) => {
      const atual = diaDoTitulo.get(item.titulo);
      if (!atual || item.dia > atual) diaDoTitulo.set(item.titulo, item.dia);
    });
    const porAno = new Map();
    diaDoTitulo.forEach((dia, titulo) => {
      const ano = dia.slice(0, 4) || "—";
      const lista = porAno.get(ano) || [];
      lista.push({ titulo, dia });
      porAno.set(ano, lista);
    });
    [...porAno.keys()].sort((a, b) => b.localeCompare(a)).forEach((ano) => {
      const tituloAno = document.createElement("p");
      tituloAno.className = "filtro-ano";
      tituloAno.textContent = ano;
      filtro.lista.append(tituloAno);
      porAno.get(ano)
        .sort((a, b) => b.dia.localeCompare(a.dia) || a.titulo.localeCompare(b.titulo, "pt-BR"))
        .forEach((item) => filtro.lista.append(opcaoMenu(item.titulo, item.titulo)));
    });
    return filtro;
  }

  function menuVoto() {
    const filtro = menuMultiplo("Voto");
    ORDEM_VOTO.forEach((voto) => filtro.lista.append(opcaoMenu(voto, voto)));
    return filtro;
  }

  function mostrarPainel(itens) {
    if (itens.length === 0) {
      const nota = document.createElement("p");
      nota.textContent = "Não há voto registrado.";
      anos.append(nota);
      return;
    }
    const ordenados = [...itens].sort((a, b) => compararItens(a, b, {}));
    const datas = [...new Set(ordenados.map((item) => item.dia))].sort((a, b) => b.localeCompare(a));
    const filtroData = menuDatas(datas);
    const filtroSessao = menuSessao(ordenados);
    const filtroVoto = menuVoto();
    const limpar = document.createElement("button");
    limpar.type = "button";
    limpar.className = "vereadores-alternar";
    limpar.textContent = "Resetar filtros";
    const filtros = document.createElement("div");
    filtros.className = "filtros-vereador";
    filtros.append(filtroData.bloco, filtroSessao.bloco, filtroVoto.bloco, limpar);
    const resultado = document.createElement("div");
    const estado = { agregados: true, informacoes: false };
    function desenhar() {
      const datasMarcadas = filtroData.valores();
      const sessoesMarcadas = filtroSessao.valores();
      const votosMarcados = filtroVoto.valores();
      const visiveis = ordenados.filter((item) => {
        if (datasMarcadas.length && !datasMarcadas.includes(item.dia)) return false;
        if (sessoesMarcadas.length && !sessoesMarcadas.includes(item.titulo)) return false;
        if (votosMarcados.length && !votosMarcados.includes(item.voto)) return false;
        return true;
      });
      resultado.replaceChildren();
      if (visiveis.length === 0) {
        const nota = document.createElement("p");
        nota.textContent = "Não há voto nesse filtro.";
        resultado.append(nota);
        return;
      }
      const agregados = secaoVotos("Dados agregados", estado.agregados, (aberto) => {
        estado.agregados = aberto;
      });
      const faixa = document.createElement("div");
      faixa.className = "votos-graficos votos-graficos-lado";
      faixa.append(pizzaVotos(visiveis), barrasDias(visiveis));
      agregados.corpo.append(faixa);
      const informacoes = secaoVotos("Informações de voto", estado.informacoes, (aberto) => {
        estado.informacoes = aberto;
      });
      sessoesDe(visiveis).forEach((sessao) => informacoes.corpo.append(blocoSessao(sessao)));
      resultado.append(agregados.secao, informacoes.secao);
    }
    filtros.addEventListener("change", desenhar);
    document.addEventListener("click", () => {
      filtros.querySelectorAll(".menu-multiplo-lista").forEach((lista) => {
        lista.hidden = true;
        lista.previousElementSibling.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", (evento) => {
      if (evento.key !== "Escape") return;
      filtros.querySelectorAll(".menu-multiplo-lista").forEach((lista) => {
        lista.hidden = true;
        lista.previousElementSibling.setAttribute("aria-expanded", "false");
      });
    });
    limpar.addEventListener("click", () => {
      filtroData.limpar();
      filtroSessao.limpar();
      filtroVoto.limpar();
      desenhar();
    });
    desenhar();
    anos.append(filtros, resultado);
  }

  function linhaFicha(rotulo, valor, classe) {
    const linha = document.createElement("p");
    if (classe) linha.className = classe;
    const forte = document.createElement("strong");
    forte.textContent = rotulo;
    linha.append(forte, document.createTextNode(` ${valor}`));
    return linha;
  }

  function mostrarFicha(pessoa) {
    document.title = `${pessoa.nome_completo} — Analândia em Dados`;
    const quadro = document.createElement("p");
    quadro.className = "foto-quadro";
    quadro.textContent = "Foto";
    const texto = document.createElement("div");
    const nome = document.createElement("h1");
    nome.textContent = pessoa.nome_completo;
    texto.append(
      nome,
      linhaFicha("Apelido:", pessoa.nome_urna, "nome-candidato"),
      linhaFicha("Partido:", pessoa.partido),
    );
    const bloco = document.createElement("div");
    bloco.className = "vereador-ficha";
    bloco.append(quadro, texto);
    ficha.append(bloco);
  }

  function votosDaPessoa(sumulas, nome) {
    const itens = [];
    sumulas.forEach((sumula) => {
      sumula.votos.forEach((linha) => {
        if (!linha.voto || linha.nome_completo !== nome) return;
        itens.push({
          dia: diaDaSessao(sumula),
          titulo: sumula.titulo,
          documento: sumula.documento || "Súmula",
          voto: linha.voto,
        });
      });
    });
    return itens;
  }

  function mostrarAviso() {
    ficha.hidden = true;
    anos.hidden = true;
    aviso.hidden = false;
  }

  const numero = new URLSearchParams(location.search).get("numero");

  Promise.all([
    fetch("../../dados/silver/vereadores/cadastro.json"),
    fetch("../../dados/silver/sessoes-plenarias/sumulas.json"),
  ])
    .then(async ([respostaCadastro, respostaSumulas]) => {
      if (!respostaCadastro.ok || !respostaSumulas.ok) throw new Error("leitura");
      const cadastro = await respostaCadastro.json();
      const lidas = await respostaSumulas.json();
      if (!Array.isArray(cadastro.vereadores) || !Array.isArray(lidas.sumulas)) throw new Error("formato");
      const pessoa = cadastro.vereadores.find((item) => String(item.numero) === numero);
      if (!pessoa || !eleito(pessoa.totalizacao)) {
        mostrarAviso();
        return;
      }
      mostrarFicha(pessoa);
      mostrarPainel(votosDaPessoa(lidas.sumulas, pessoa.nome_completo));
    })
    .catch(() => {
      ficha.hidden = true;
      anos.hidden = true;
      erro.hidden = false;
    });
})();
