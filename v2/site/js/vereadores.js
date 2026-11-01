(() => {
const abrir = document.querySelector("#abrir-vereadores");
const dialogo = document.querySelector("#vereadores-dados");
const fechar = document.querySelector("#fechar-vereadores");
const topo = document.querySelector("#vereadores-topo");
const paineis = document.querySelector("#paineis-vereadores");
const erro = document.querySelector("#erro-vereadores");
const filtroNome = document.querySelector("#filtro-nome");
const filtroPartido = document.querySelector("#filtro-partido");

const abrirIndicadores = document.querySelector("#abrir-vereadores-indicadores");
const dialogoIndicadores = document.querySelector("#vereadores-indicadores");
const fecharIndicadores = document.querySelector("#fechar-vereadores-indicadores");
const paineisIndicadores = document.querySelector("#paineis-vereadores-indicadores");
const erroIndicadores = document.querySelector("#erro-vereadores-indicadores");

const SVG = "http://www.w3.org/2000/svg";
const CORES = {
  Homens: "var(--color-info)",
  Mulheres: "var(--color-accent)",
  "Eleito por QP": "var(--color-info)",
  "Eleito por média": "var(--color-green)",
};
const MARCAS = {
  "var(--color-info)": "marca-info",
  "var(--color-accent)": "marca-accent",
  "var(--color-green)": "marca-green",
};

const BLOCOS = [
  { classe: "eleito", titulo: "Eleitos", recolhivel: false, modificador: "vereadores-bloco-eleito" },
  { classe: "suplente", titulo: "Suplentes", recolhivel: true, modificador: "vereadores-bloco-suplente" },
  { classe: "nao_eleito", titulo: "Não eleitos", recolhivel: true, modificador: "vereadores-bloco-nao-eleito" },
];

function classe(texto) {
  const normal = String(texto || "").trim().toLowerCase();
  if (normal.startsWith("não eleito") || normal.startsWith("nao eleito")) return "nao_eleito";
  if (normal.startsWith("eleito")) return "eleito";
  if (normal.startsWith("suplente")) return "suplente";
  return "";
}

function normalizar(texto) {
  return String(texto || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function termo(rotulo, valor) {
  const dt = document.createElement("dt");
  dt.textContent = rotulo;
  const dd = document.createElement("dd");
  dd.textContent = valor;
  return [dt, dd];
}

function cartao(pessoa) {
  const bloco = document.createElement("article");
  bloco.className = "item";
  bloco.dataset.busca = normalizar(`${pessoa.nome_completo} ${pessoa.nome_urna}`);
  bloco.dataset.partido = pessoa.partido;
  const titulo = document.createElement("h4");
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

function rotuloAlternar(aberto, titulo) {
  return `${aberto ? "Fechar" : "Abrir"} ${titulo}`;
}

function definirAberto(grade, alternar, aberto) {
  grade.hidden = !aberto;
  alternar.setAttribute("aria-expanded", aberto ? "true" : "false");
  alternar.textContent = aberto ? "Fechar" : "Abrir";
  alternar.setAttribute("aria-label", rotuloAlternar(aberto, alternar.dataset.titulo));
}

function montar(cadastro) {
  paineis.replaceChildren();
  const siglas = [...new Set(cadastro.vereadores.map((pessoa) => pessoa.partido))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  filtroPartido.replaceChildren(new Option("Todos", ""));
  for (const sigla of siglas) filtroPartido.append(new Option(sigla, sigla));

  for (const bloco of BLOCOS) {
    const secao = document.createElement("section");
    secao.className = `vereadores-bloco ${bloco.modificador}`;
    const cabecalho = document.createElement("div");
    cabecalho.className = "vereadores-cabecalho";
    const titulo = document.createElement("h3");
    titulo.textContent = bloco.titulo;
    cabecalho.append(titulo);

    const pessoas = cadastro.vereadores.filter((pessoa) => classe(pessoa.totalizacao) === bloco.classe);
    const grade = document.createElement("div");
    grade.className = "vereadores-grade";
    if (pessoas.length === 0) {
      const vazio = document.createElement("p");
      vazio.className = "par-vazio";
      vazio.textContent = "Nenhum registro";
      grade.append(vazio);
    } else {
      grade.append(...pessoas.map(cartao));
    }

    if (bloco.recolhivel) {
      grade.id = `vereadores-${bloco.classe}`;
      grade.hidden = true;
      const alternar = document.createElement("button");
      alternar.type = "button";
      alternar.className = "vereadores-alternar";
      alternar.dataset.titulo = bloco.titulo;
      definirAberto(grade, alternar, false);
      alternar.addEventListener("click", () => {
        definirAberto(grade, alternar, grade.hidden);
      });
      cabecalho.append(alternar);
    }

    secao.append(cabecalho, grade);
    paineis.append(secao);
  }
}

function filtroAtivo() {
  return normalizar(filtroNome.value) !== "" || filtroPartido.value !== "";
}

function combina(cartao) {
  const nome = normalizar(filtroNome.value);
  const partido = filtroPartido.value;
  if (nome && !cartao.dataset.busca.includes(nome)) return false;
  if (partido && cartao.dataset.partido !== partido) return false;
  return true;
}

function aplicarFiltro() {
  const ativo = filtroAtivo();
  for (const secao of paineis.querySelectorAll(".vereadores-bloco")) {
    const grade = secao.querySelector(".vereadores-grade");
    const cartoes = [...grade.querySelectorAll(".item")];
    let visiveis = 0;
    for (const cartao of cartoes) {
      const mostra = combina(cartao);
      cartao.hidden = !mostra;
      if (mostra) visiveis += 1;
    }
    let vazio = grade.querySelector(".par-vazio");
    if (cartoes.length > 0 && visiveis === 0) {
      if (!vazio) {
        vazio = document.createElement("p");
        vazio.className = "par-vazio";
        vazio.textContent = "Nenhum registro";
        grade.append(vazio);
      }
      vazio.hidden = false;
    } else if (vazio && cartoes.length > 0) {
      vazio.hidden = true;
    }
    const alternar = secao.querySelector(".vereadores-alternar");
    if (!alternar) continue;
    if (ativo) definirAberto(grade, alternar, true);
    else definirAberto(grade, alternar, false);
  }
}

function medirTopo() {
  dialogo.style.setProperty("--vereadores-topo", `${topo.offsetHeight}px`);
}

function svg(nome, atributos) {
  const elemento = document.createElementNS(SVG, nome);
  for (const [chave, valor] of Object.entries(atributos)) elemento.setAttribute(chave, String(valor));
  return elemento;
}

function porcentagem(parte, total) {
  if (!total) return "0%";
  const valor = (parte * 100) / total;
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function legenda(itens, total) {
  const lista = document.createElement("ul");
  lista.className = "legenda-grafico";
  for (const item of itens) {
    const linha = document.createElement("li");
    const marca = document.createElement("span");
    marca.className = `marca ${MARCAS[item.cor] || ""}`;
    linha.append(marca, document.createTextNode(`${item.rotulo}: ${item.quantidade} (${porcentagem(item.quantidade, total)})`));
    lista.append(linha);
  }
  return lista;
}

function figura(titulo, nota) {
  const bloco = document.createElement("figure");
  bloco.className = "grafico";
  const legendaTitulo = document.createElement("figcaption");
  legendaTitulo.textContent = titulo;
  const observacao = document.createElement("p");
  observacao.className = "grafico-nota";
  observacao.textContent = nota;
  bloco.append(legendaTitulo);
  return { bloco, observacao };
}

function pizza(titulo, itens, nota) {
  const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const { bloco, observacao } = figura(titulo, nota);
  bloco.classList.add("grafico-pizza");
  const desenho = svg("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": titulo });
  const cx = 100;
  const cy = 100;
  const raio = 78;
  let angulo = -Math.PI / 2;
  for (const item of itens) {
    if (!item.quantidade || !total) continue;
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
  }
  bloco.append(desenho, legenda(itens, total), observacao);
  return bloco;
}

function barras(titulo, itens, cor, nota) {
  const { bloco, observacao } = figura(titulo, nota);
  const alturaLinha = 36;
  const margemEsq = 176;
  const margemDir = 56;
  const largura = 720;
  const altura = Math.max(itens.length, 1) * alturaLinha;
  const maximo = Math.max(...itens.map((item) => item.valor), 1);
  const trilho = largura - margemEsq - margemDir;
  const desenho = svg("svg", { viewBox: `0 0 ${largura} ${altura}`, role: "img", "aria-label": titulo });
  itens.forEach((item, indice) => {
    const y = indice * alturaLinha;
    const meio = y + 24;
    const comprimento = Math.round((item.valor / maximo) * trilho);
    const nome = svg("text", { class: "grafico-texto", x: margemEsq - 8, y: meio, "text-anchor": "end" });
    nome.textContent = item.rotulo;
    const barra = svg("rect", {
      x: margemEsq,
      y: y + 10,
      width: Math.max(comprimento, item.valor ? 2 : 0),
      height: 16,
      fill: cor,
    });
    const quantidade = svg("text", {
      class: "grafico-texto",
      x: margemEsq + Math.max(comprimento, item.valor ? 2 : 0) + 8,
      y: meio,
    });
    quantidade.textContent = String(item.valor);
    desenho.append(nome, barra, quantidade);
  });
  bloco.append(desenho, observacao);
  return bloco;
}

function montarIndicadores(indicadores) {
  const sexo = indicadores.sexo.map((item) => ({ ...item, cor: CORES[item.rotulo] }));
  const totalizacao = indicadores.totalizacao_eleitos.map((item) => ({ ...item, cor: CORES[item.rotulo] }));
  const pessoas = sexo.reduce((soma, item) => soma + item.quantidade, 0);
  const eleitos = totalizacao.reduce((soma, item) => soma + item.quantidade, 0);
  paineisIndicadores.replaceChildren(
    pizza("Homens e mulheres", sexo, `Proporção dos ${pessoas} registros do cadastro.`),
    barras(
      "Candidatos por partido",
      indicadores.partidos.map((item) => ({ rotulo: item.partido, valor: item.quantidade })),
      "var(--color-info)",
      `Quantidade nos ${pessoas} registros do cadastro.`,
    ),
    pizza("Eleitos por QP e por média", totalizacao, `Proporção dos ${eleitos} eleitos.`),
    barras(
      "Votos nominais por eleito",
      indicadores.votos_eleitos.map((item) => ({ rotulo: item.nome_urna, valor: item.votos_nominais })),
      "var(--color-green)",
      "Cada barra é o total de votos nominais do eleito.",
    ),
  );
}

async function lerJson(url, campo) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(String(resposta.status));
  const lido = await resposta.json();
  if (campo && !Array.isArray(lido[campo])) throw new Error("formato");
  return lido;
}

function ligarDialogo(alvo, botao) {
  botao.addEventListener("click", () => alvo.close());
  alvo.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") alvo.close();
  });
  alvo.addEventListener("click", (evento) => {
    if (evento.target === alvo) alvo.close();
  });
}

abrir.addEventListener("click", async () => {
  filtroNome.value = "";
  filtroPartido.value = "";
  try {
    montar(await lerJson("../dados/silver/vereadores/cadastro.json", "vereadores"));
    aplicarFiltro();
    paineis.hidden = false;
    erro.hidden = true;
  } catch (falha) {
    paineis.hidden = true;
    erro.hidden = false;
  }
  if (!dialogo.open) dialogo.showModal();
  dialogo.scrollTop = 0;
  medirTopo();
});

filtroNome.addEventListener("input", aplicarFiltro);
filtroPartido.addEventListener("change", aplicarFiltro);
window.addEventListener("resize", () => {
  if (dialogo.open) medirTopo();
});

abrirIndicadores.addEventListener("click", async () => {
  try {
    const lido = await lerJson("../dados/gold/vereadores/indicadores.json");
    if (!Array.isArray(lido.sexo) || !Array.isArray(lido.partidos)
      || !Array.isArray(lido.totalizacao_eleitos) || !Array.isArray(lido.votos_eleitos)) {
      throw new Error("formato");
    }
    montarIndicadores(lido);
    paineisIndicadores.hidden = false;
    erroIndicadores.hidden = true;
  } catch (falha) {
    paineisIndicadores.hidden = true;
    erroIndicadores.hidden = false;
  }
  if (!dialogoIndicadores.open) dialogoIndicadores.showModal();
});

ligarDialogo(dialogo, fechar);
ligarDialogo(dialogoIndicadores, fecharIndicadores);
})();