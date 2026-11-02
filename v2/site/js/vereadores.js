(() => {
const abrir = document.querySelector("#abrir-vereadores");
const dialogo = document.querySelector("#vereadores-dados");
const fechar = document.querySelector("#fechar-vereadores");
const topo = document.querySelector("#vereadores-topo");
const paineis = document.querySelector("#paineis-vereadores");
const erro = document.querySelector("#erro-vereadores");
const filtroNome = document.querySelector("#filtro-nome");
const listaNomes = document.querySelector("#lista-nomes");
const filtroPartido = document.querySelector("#filtro-partido");
const filtroVotos = document.querySelector("#filtro-votos");
const resetarFiltros = document.querySelector("#resetar-filtros");
let pessoas = [];
let escolha = null;
let indiceAtivo = -1;

const abrirIndicadores = document.querySelector("#abrir-vereadores-indicadores");
const dialogoIndicadores = document.querySelector("#vereadores-indicadores");
const fecharIndicadores = document.querySelector("#fechar-vereadores-indicadores");
const paineisIndicadores = document.querySelector("#paineis-vereadores-indicadores");
const filtroClasse = document.querySelector("#filtro-classe");
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
  { classe: "eleito", titulo: "Eleitos", recolhivel: true, aberto: false, modificador: "vereadores-bloco-eleito" },
  { classe: "suplente", titulo: "Suplentes", recolhivel: true, aberto: false, modificador: "vereadores-bloco-suplente" },
  { classe: "nao_eleito", titulo: "Não eleitos", recolhivel: true, aberto: false, modificador: "vereadores-bloco-nao-eleito" },
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
  bloco.dataset.numero = String(pessoa.numero);
  bloco.dataset.partido = pessoa.partido;
  bloco.dataset.votos = pessoa.votos_nominais == null ? "" : String(pessoa.votos_nominais);
  const titulo = document.createElement("h4");
  titulo.append(pessoa.nome_completo);
  const urna = document.createElement("span");
  urna.className = "nome-candidato";
  urna.textContent = pessoa.nome_urna;
  titulo.append(urna);
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
  pessoas = cadastro.vereadores;

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
      const alternar = document.createElement("button");
      alternar.type = "button";
      alternar.className = "vereadores-alternar";
      alternar.dataset.titulo = bloco.titulo;
      alternar.dataset.inicial = bloco.aberto ? "true" : "false";
      definirAberto(grade, alternar, Boolean(bloco.aberto));
      alternar.addEventListener("click", () => {
        definirAberto(grade, alternar, grade.hidden);
      });
      cabecalho.append(alternar);
    }

    secao.append(cabecalho, grade);
    paineis.append(secao);
  }
}

function minimoVotos() {
  if (filtroVotos.value === "") return null;
  const numero = Number(filtroVotos.value);
  return Number.isFinite(numero) ? numero : null;
}

function filtroAtivo() {
  return normalizar(filtroNome.value) !== "" || filtroPartido.value !== "" || minimoVotos() != null;
}

function combina(cartao) {
  const nome = normalizar(filtroNome.value);
  const partido = filtroPartido.value;
  const minimo = minimoVotos();
  if (escolha) {
    if (cartao.dataset.numero !== escolha) return false;
  } else if (nome && !cartao.dataset.busca.includes(nome)) {
    return false;
  }
  if (partido && cartao.dataset.partido !== partido) return false;
  if (minimo != null) {
    if (cartao.dataset.votos === "") return false;
    if (Number(cartao.dataset.votos) < minimo) return false;
  }
  return true;
}

function pessoasDaLista() {
  const nome = normalizar(filtroNome.value);
  if (!nome) return pessoas;
  return pessoas.filter((pessoa) => normalizar(`${pessoa.nome_completo} ${pessoa.nome_urna}`).includes(nome));
}

function desenharLista() {
  const visiveis = pessoasDaLista();
  listaNomes.replaceChildren();
  if (visiveis.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "par-vazio";
    vazio.textContent = "Nenhum registro";
    listaNomes.append(vazio);
    return;
  }
  visiveis.forEach((pessoa, indice) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.setAttribute("role", "option");
    botao.id = `nome-opcao-${indice}`;
    botao.setAttribute("aria-selected", indice === indiceAtivo ? "true" : "false");
    const completo = document.createElement("span");
    completo.textContent = pessoa.nome_completo;
    const urna = document.createElement("span");
    urna.className = "nome-candidato";
    urna.textContent = pessoa.nome_urna;
    botao.append(completo, urna);
    botao.addEventListener("mousedown", (evento) => evento.preventDefault());
    botao.addEventListener("click", () => escolher(pessoa));
    item.append(botao);
    listaNomes.append(item);
  });
  const ativo = listaNomes.querySelector('[aria-selected="true"]');
  if (ativo) {
    filtroNome.setAttribute("aria-activedescendant", ativo.id);
    ativo.scrollIntoView({ block: "nearest" });
  } else {
    filtroNome.removeAttribute("aria-activedescendant");
  }
}

function abrirLista() {
  desenharLista();
  listaNomes.hidden = false;
  filtroNome.setAttribute("aria-expanded", "true");
}

function fecharLista() {
  listaNomes.hidden = true;
  filtroNome.setAttribute("aria-expanded", "false");
  filtroNome.removeAttribute("aria-activedescendant");
  indiceAtivo = -1;
}

function escolher(pessoa) {
  escolha = String(pessoa.numero);
  filtroNome.value = pessoa.nome_completo;
  fecharLista();
  aplicarFiltro();
}

function moverLista(passo) {
  const total = listaNomes.querySelectorAll('[role="option"]').length;
  if (total === 0) return;
  if (listaNomes.hidden) abrirLista();
  indiceAtivo = indiceAtivo < 0 ? 0 : (indiceAtivo + passo + total) % total;
  desenharLista();
}

function limparFiltros() {
  escolha = null;
  indiceAtivo = -1;
  filtroNome.value = "";
  filtroPartido.value = "";
  filtroVotos.value = "";
  fecharLista();
  aplicarFiltro();
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
    else definirAberto(grade, alternar, alternar.dataset.inicial === "true");
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

function rotuloSexo(sexo) {
  if (sexo === "MASC.") return "Homens";
  if (sexo === "FEM.") return "Mulheres";
  return "";
}

function contar(lista, campo) {
  const totais = new Map();
  for (const item of lista) {
    const chave = item[campo];
    totais.set(chave, (totais.get(chave) || 0) + 1);
  }
  return totais;
}

function notaVotos(semPublicacao) {
  if (semPublicacao === 0) return "Cada barra é o total de votos nominais.";
  if (semPublicacao === 1) return "Cada barra é o total de votos nominais. 1 registro não tem voto nominal publicado.";
  return `Cada barra é o total de votos nominais. ${semPublicacao} registros não têm voto nominal publicado.`;
}

function montarIndicadores(cadastro) {
  const classeFiltro = filtroClasse.value;
  const grupo = classeFiltro
    ? cadastro.filter((pessoa) => classe(pessoa.totalizacao) === classeFiltro)
    : cadastro;
  const eleitos = cadastro.filter((pessoa) => classe(pessoa.totalizacao) === "eleito");
  const sexos = ["Homens", "Mulheres"].map((rotulo) => ({
    rotulo,
    quantidade: grupo.filter((pessoa) => rotuloSexo(pessoa.sexo) === rotulo).length,
    cor: CORES[rotulo],
  }));
  const partidos = [...contar(grupo, "partido").entries()]
    .map(([partido, quantidade]) => ({ rotulo: partido, valor: quantidade }))
    .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  const semPublicacao = grupo.filter((pessoa) => pessoa.votos_nominais == null).length;
  const votos = grupo
    .filter((pessoa) => pessoa.votos_nominais != null)
    .sort((a, b) => b.votos_nominais - a.votos_nominais || a.nome_urna.localeCompare(b.nome_urna, "pt-BR"))
    .map((pessoa) => ({ rotulo: pessoa.nome_urna, valor: pessoa.votos_nominais }));
  const paineis = [
    pizza("Homens e mulheres", sexos, `Proporção dos ${grupo.length} registros do cadastro.`),
    barras("Candidatos por partido", partidos, "var(--color-info)", `Quantidade nos ${grupo.length} registros do cadastro.`),
  ];
  if (!classeFiltro || classeFiltro === "eleito") {
    const totalizacao = contar(eleitos, "totalizacao");
    paineis.push(pizza("Eleitos por QP e por média", [
      { rotulo: "Eleito por QP", quantidade: totalizacao.get("Eleito por QP") || 0, cor: CORES["Eleito por QP"] },
      { rotulo: "Eleito por média", quantidade: totalizacao.get("Eleito por média") || 0, cor: CORES["Eleito por média"] },
    ], `Proporção dos ${eleitos.length} eleitos.`));
  }
  paineis.push(barras("Votos nominais", votos, "var(--color-green)", notaVotos(semPublicacao)));
  paineisIndicadores.replaceChildren(...paineis);
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
  escolha = null;
  indiceAtivo = -1;
  filtroNome.value = "";
  filtroPartido.value = "";
  filtroVotos.value = "";
  fecharLista();
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

filtroNome.addEventListener("input", () => {
  escolha = null;
  indiceAtivo = -1;
  abrirLista();
  aplicarFiltro();
});
filtroNome.addEventListener("focus", abrirLista);
filtroNome.addEventListener("click", abrirLista);
filtroNome.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowDown") {
    evento.preventDefault();
    moverLista(1);
  } else if (evento.key === "ArrowUp") {
    evento.preventDefault();
    moverLista(-1);
  } else if (evento.key === "Enter" && !listaNomes.hidden && indiceAtivo >= 0) {
    evento.preventDefault();
    const visiveis = pessoasDaLista();
    if (visiveis[indiceAtivo]) escolher(visiveis[indiceAtivo]);
  } else if (evento.key === "Escape" && !listaNomes.hidden) {
    evento.stopPropagation();
    fecharLista();
  }
});
document.addEventListener("click", (evento) => {
  if (!filtroNome.closest(".vereadores-filtro").contains(evento.target)) fecharLista();
});
filtroPartido.addEventListener("change", aplicarFiltro);
filtroVotos.addEventListener("input", aplicarFiltro);
resetarFiltros.addEventListener("click", limparFiltros);
window.addEventListener("resize", () => {
  if (dialogo.open) medirTopo();
});

let cadastroIndicadores = null;

filtroClasse.addEventListener("change", () => {
  if (cadastroIndicadores) montarIndicadores(cadastroIndicadores);
});

abrirIndicadores.addEventListener("click", async () => {
  filtroClasse.value = "";
  try {
    const lido = await lerJson("../dados/silver/vereadores/cadastro.json");
    if (!Array.isArray(lido.vereadores)) throw new Error("formato");
    cadastroIndicadores = lido.vereadores;
    montarIndicadores(cadastroIndicadores);
    paineisIndicadores.hidden = false;
    erroIndicadores.hidden = true;
  } catch (falha) {
    cadastroIndicadores = null;
    paineisIndicadores.hidden = true;
    erroIndicadores.hidden = false;
  }
  if (!dialogoIndicadores.open) dialogoIndicadores.showModal();
});

ligarDialogo(dialogo, fechar);
ligarDialogo(dialogoIndicadores, fecharIndicadores);
})();