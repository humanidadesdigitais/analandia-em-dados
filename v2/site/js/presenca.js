(() => {
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const abrir = document.querySelector("#abrir-presenca");
const dialogo = document.querySelector("#presenca-calendario");
const dialogoDia = document.querySelector("#presenca-dia");
const fechar = document.querySelector("#fechar-presenca");
const fecharDia = document.querySelector("#fechar-presenca-dia");
const painel = document.querySelector("#painel-presenca");
const erro = document.querySelector("#erro-presenca");
const nome = document.querySelector("#presenca-mes");
const grade = document.querySelector("#presenca-grade");
const anterior = document.querySelector("#presenca-anterior");
const proximo = document.querySelector("#presenca-proximo");
const tituloDia = document.querySelector("#titulo-presenca-dia");
const paineisDia = document.querySelector("#paineis-presenca-dia");
const abrirChamadaDia = document.querySelector("#abrir-chamada-dia");
const dialogoChamada = document.querySelector("#presenca-chamada");
const fecharChamada = document.querySelector("#fechar-presenca-chamada");
const tituloChamada = document.querySelector("#titulo-presenca-chamada");
const paineisChamada = document.querySelector("#paineis-presenca-chamada");
const abrirVotos = document.querySelector("#abrir-votos-vereador");
const dialogoVotos = document.querySelector("#votos-vereador");
const fecharVotos = document.querySelector("#fechar-votos-vereador");
const layoutVotos = document.querySelector("#layout-votos-vereador");
const listaVotos = document.querySelector("#lista-votos-vereador");
const painelVotos = document.querySelector("#painel-votos-vereador");
const erroVotos = document.querySelector("#erro-votos-vereador");

const ORDEM_VOTO = ["Favorável", "Contrário", "Abstenção"];

let chamadas = null;
let sumulas = null;
let eleitos = null;
let porDia = new Map();
let sumulasPorDia = new Map();
let diaAberto = "";
let anoAtual = 0;
let mesAtual = 0;
let limiteInicio = 0;
let limiteFim = 0;

function iso(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function indice(ano, mes) {
  return ano * 12 + mes;
}

function dataPorExtenso(valor) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

function ligar(alvo, botao) {
  botao.addEventListener("click", () => alvo.close());
  alvo.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    evento.stopPropagation();
    alvo.close();
  });
  alvo.addEventListener("click", (evento) => {
    if (evento.target === alvo) alvo.close();
  });
}

function celula(texto, elemento) {
  const item = document.createElement(elemento);
  item.textContent = texto;
  return item;
}

function montarTabela(chamada) {
  const bloco = document.createElement("section");
  bloco.className = "presenca-bloco";
  const titulo = document.createElement("h3");
  titulo.textContent = chamada.titulo;
  const periodo = document.createElement("p");
  periodo.textContent = `Chamada Nº${chamada.numero} · ${chamada.periodo}`;
  const tabela = document.createElement("table");
  tabela.className = "presenca-lista";
  const cabecalho = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  ["Vereador", "Sigla", "Presença"].forEach((rotulo) => {
    const th = celula(rotulo, "th");
    th.scope = "col";
    linhaCabecalho.append(th);
  });
  cabecalho.append(linhaCabecalho);
  const corpo = document.createElement("tbody");
  chamada.presencas.forEach((linha) => {
    const tr = document.createElement("tr");
    tr.append(celula(linha.nome, "td"), celula(linha.sigla, "td"));
    const presenca = celula(linha.presenca, "td");
    presenca.className = "presenca-valor";
    presenca.dataset.presenca = linha.presenca;
    tr.append(presenca);
    corpo.append(tr);
  });
  tabela.append(cabecalho, corpo);
  bloco.append(titulo, periodo, tabela);
  return bloco;
}

function diaDaSessao(sumula) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(sumula.realizada_em || "")) return sumula.realizada_em;
  const forma = String(sumula.data || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!forma) return "";
  return `${forma[3]}-${forma[2]}-${forma[1]}`;
}

function chavePessoa(linha) {
  return linha.nome_completo || linha.nome;
}

function definirAberto(corpo, alternar, aberto) {
  corpo.hidden = !aberto;
  alternar.setAttribute("aria-expanded", aberto ? "true" : "false");
  alternar.textContent = aberto ? "Fechar" : "Abrir";
  alternar.setAttribute("aria-label", `${aberto ? "Fechar" : "Abrir"} ${alternar.dataset.titulo}`);
}

function linhaMesa(rotulo, valor) {
  const item = document.createElement("p");
  item.textContent = `${rotulo}: ${valor || "—"}`;
  return item;
}

function montarSumula(sumula) {
  const bloco = document.createElement("section");
  bloco.className = "presenca-bloco";
  const nome = sumula.documento || sumula.titulo || "Súmula";
  const topo = document.createElement("div");
  topo.className = "sumula-topo";
  const titulo = document.createElement("h3");
  titulo.textContent = nome;
  const alternar = document.createElement("button");
  alternar.type = "button";
  alternar.className = "vereadores-alternar";
  alternar.dataset.titulo = nome;
  topo.append(titulo, alternar);

  const miolo = document.createElement("div");
  miolo.className = "sumula-corpo";
  const semTexto = !sumula.realizada_em && sumula.votos.length === 0;
  if (semTexto) {
    const nota = document.createElement("p");
    nota.textContent = "O PDF não tem texto.";
    miolo.append(nota);
  } else {
    const partes = [sumula.tipo_votacao, sumula.resultado].filter(Boolean);
    if (partes.length) {
      const meta = document.createElement("p");
      meta.textContent = partes.join(" · ");
      miolo.append(meta);
    }
  }
  const mesa = document.createElement("div");
  mesa.className = "sumula-mesa";
  mesa.append(
    linhaMesa("Presidente", sumula.presidente),
    linhaMesa("1º secretário", sumula.primeiro_secretario),
    linhaMesa("2º secretário", sumula.segundo_secretario),
  );
  miolo.append(mesa);
  if (!semTexto) {
    const tabela = document.createElement("table");
    tabela.className = "presenca-lista";
    const cabecalho = document.createElement("thead");
    const linhaCabecalho = document.createElement("tr");
    ["Vereador", "Sigla", "Voto"].forEach((rotulo) => {
      const th = celula(rotulo, "th");
      th.scope = "col";
      linhaCabecalho.append(th);
    });
    cabecalho.append(linhaCabecalho);
    const corpo = document.createElement("tbody");
    sumula.votos.forEach((linha) => {
      const tr = document.createElement("tr");
      tr.append(celula(linha.nome, "td"), celula(linha.sigla, "td"));
      const voto = celula(linha.voto || "—", "td");
      voto.className = "presenca-valor";
      if (linha.voto) voto.dataset.voto = linha.voto;
      tr.append(voto);
      corpo.append(tr);
    });
    tabela.append(cabecalho, corpo);
    miolo.append(tabela);
  }
  definirAberto(miolo, alternar, false);
  alternar.addEventListener("click", () => {
    definirAberto(miolo, alternar, miolo.hidden);
  });
  bloco.append(topo, miolo);
  return bloco;
}

function abrirDia(valor) {
  if (dialogoChamada.open) dialogoChamada.close();
  diaAberto = valor;
  tituloDia.textContent = dataPorExtenso(valor);
  const doDia = sumulasPorDia.get(valor) || [];
  if (doDia.length === 0) {
    const nota = document.createElement("p");
    nota.textContent = "Não há súmula nesse dia.";
    paineisDia.replaceChildren(nota);
  } else {
    paineisDia.replaceChildren(...doDia.map(montarSumula));
  }
  if (!dialogoDia.open) dialogoDia.showModal();
}

function abrirChamada() {
  const doDia = porDia.get(diaAberto) || [];
  tituloChamada.textContent = dataPorExtenso(diaAberto);
  paineisChamada.replaceChildren(...doDia.map(montarTabela));
  if (!dialogoChamada.open) dialogoChamada.showModal();
}

function desenhar(ano, mes) {
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const quantidade = new Date(ano, mes, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiro; i += 1) celulas.push(0);
  for (let dia = 1; dia <= quantidade; dia += 1) celulas.push(dia);
  while (celulas.length % 7 !== 0) celulas.push(0);

  const tabela = document.createElement("table");
  tabela.className = "presenca-mes";
  tabela.setAttribute("aria-label", `${MESES[mes - 1]} de ${ano}`);
  const thead = document.createElement("thead");
  const trCabeca = document.createElement("tr");
  DIAS.forEach((dia, posicao) => {
    const th = document.createElement("th");
    th.scope = "col";
    const abrev = document.createElement("abbr");
    abrev.title = dia;
    abrev.textContent = "DSTQQSS"[posicao];
    th.append(abrev);
    trCabeca.append(th);
  });
  thead.append(trCabeca);
  const tbody = document.createElement("tbody");
  for (let i = 0; i < celulas.length; i += 7) {
    const tr = document.createElement("tr");
    celulas.slice(i, i + 7).forEach((dia) => {
      const td = document.createElement("td");
      if (dia === 0) {
        td.className = "vazio";
      } else {
        const quando = iso(ano, mes, dia);
        const doDia = porDia.get(quando) || [];
        if (doDia.length === 0) {
          td.textContent = String(dia);
        } else {
          const botao = document.createElement("button");
          botao.type = "button";
          botao.className = "presenca-dia";
          botao.textContent = String(dia);
          botao.setAttribute("aria-label", `${dataPorExtenso(quando)}, votos`);
          botao.addEventListener("click", () => abrirDia(quando));
          td.append(botao);
        }
      }
      tr.append(td);
    });
    tbody.append(tr);
  }
  tabela.append(thead, tbody);
  grade.replaceChildren(tabela);
  nome.textContent = `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} de ${ano}`;
  anterior.disabled = indice(ano, mes) <= limiteInicio;
  proximo.disabled = indice(ano, mes) >= limiteFim;
  anoAtual = ano;
  mesAtual = mes;
}

function mover(passo) {
  const data = new Date(anoAtual, mesAtual - 1 + passo, 1);
  desenhar(data.getFullYear(), data.getMonth() + 1);
}

function preparar(lista, lidas) {
  chamadas = lista;
  sumulas = lidas;
  porDia = new Map();
  sumulasPorDia = new Map();
  lista.forEach((chamada) => {
    const grupo = porDia.get(chamada.realizada_em) || [];
    grupo.push(chamada);
    porDia.set(chamada.realizada_em, grupo);
  });
  lidas.forEach((sumula) => {
    const dia = diaDaSessao(sumula);
    if (!dia) return;
    const grupo = sumulasPorDia.get(dia) || [];
    grupo.push(sumula);
    sumulasPorDia.set(dia, grupo);
  });
  const datas = lista.map((chamada) => chamada.realizada_em).sort();
  const [anoInicio, mesInicio] = datas[0].split("-").map(Number);
  const [anoFim, mesFim] = datas[datas.length - 1].split("-").map(Number);
  limiteInicio = indice(anoInicio, mesInicio);
  limiteFim = indice(anoFim, mesFim);
  desenhar(anoFim, mesFim);
}

async function carregar() {
  if (chamadas) return;
  const [resposta, respostaSumulas] = await Promise.all([
    fetch("../dados/silver/sessoes-plenarias/chamadas.json"),
    fetch("../dados/silver/sessoes-plenarias/sumulas.json"),
  ]);
  if (!resposta.ok || !respostaSumulas.ok) throw new Error("leitura");
  const lido = await resposta.json();
  const lidas = await respostaSumulas.json();
  if (!Array.isArray(lido.chamadas) || lido.chamadas.length === 0) throw new Error("formato");
  if (!Array.isArray(lidas.sumulas)) throw new Error("formato");
  lido.chamadas.forEach((chamada) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chamada.realizada_em)) throw new Error("formato");
    if (!Array.isArray(chamada.presencas) || chamada.presencas.length === 0) throw new Error("formato");
  });
  lidas.sumulas.forEach((sumula) => {
    if (!Array.isArray(sumula.votos)) throw new Error("formato");
  });
  preparar(lido.chamadas, lidas.sumulas);
}

async function carregarEleitos() {
  if (eleitos) return;
  const resposta = await fetch("../dados/silver/vereadores/cadastro.json");
  if (!resposta.ok) throw new Error("leitura");
  const cadastro = await resposta.json();
  if (!Array.isArray(cadastro.vereadores)) throw new Error("formato");
  eleitos = new Set(
    cadastro.vereadores
      .filter((pessoa) => String(pessoa.totalizacao || "").toLowerCase().startsWith("eleito"))
      .map((pessoa) => pessoa.nome_completo),
  );
}

const SVG = "http://www.w3.org/2000/svg";
const abrirIndicadores = document.querySelector("#abrir-presenca-indicadores");
const dialogoIndicadores = document.querySelector("#presenca-indicadores");
const fecharIndicadores = document.querySelector("#fechar-presenca-indicadores");
const filtrosIndicadores = document.querySelector("#filtros-presenca");
const paineisIndicadores = document.querySelector("#paineis-presenca-indicadores");
const vazioIndicadores = document.querySelector("#presenca-vazio");
const erroIndicadores = document.querySelector("#erro-presenca-indicadores");
const filtroMes = document.querySelector("#filtro-presenca-mes");
const filtroAno = document.querySelector("#filtro-presenca-ano");
const abaVoto = document.querySelector("#aba-voto");
const abaPresenca = document.querySelector("#aba-presenca");
const painelVoto = document.querySelector("#painel-voto");

function svg(nome, atributos) {
  const elemento = document.createElementNS(SVG, nome);
  Object.entries(atributos).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
  return elemento;
}

function percentual(parte, total) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format((parte / total) * 100);
}

function opcao(valor, rotulo) {
  const item = document.createElement("option");
  item.value = valor;
  item.textContent = rotulo;
  return item;
}

function noPeriodo(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) return false;
  const [ano, mes] = valor.split("-");
  if (filtroAno.value && ano !== filtroAno.value) return false;
  if (filtroMes.value && mes !== filtroMes.value) return false;
  return true;
}

function preencherFiltros() {
  const datas = [
    ...chamadas.map((chamada) => chamada.realizada_em),
    ...sumulas.map(diaDaSessao),
  ].filter((valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor));
  const anos = [...new Set(datas.map((valor) => valor.slice(0, 4)))].sort();
  const meses = [...new Set(datas.map((valor) => Number(valor.slice(5, 7))))];
  meses.sort((a, b) => a - b);
  filtroAno.replaceChildren(opcao("", "Todos"), ...anos.map((ano) => opcao(ano, ano)));
  filtroMes.replaceChildren(
    opcao("", "Todos"),
    ...meses.map((mes) => {
      const rotulo = MESES[mes - 1];
      return opcao(String(mes).padStart(2, "0"), rotulo[0].toUpperCase() + rotulo.slice(1));
    }),
  );
}

function chamadasDoFiltro() {
  return chamadas.filter((chamada) => noPeriodo(chamada.realizada_em));
}

function pessoasDoVoto() {
  const grupos = new Map();
  sumulas.forEach((sumula) => {
    if (!noPeriodo(diaDaSessao(sumula))) return;
    sumula.votos.forEach((linha) => {
      if (!linha.voto) return;
      const chave = chavePessoa(linha);
      const atual = grupos.get(chave) || { nome: linha.nome, total: 0, nomes: new Map() };
      atual.total += 1;
      atual.nomes.set(linha.nome, (atual.nomes.get(linha.nome) || 0) + 1);
      grupos.set(chave, atual);
    });
  });
  return [...grupos.values()]
    .map((pessoa) => ({
      nome: [...pessoa.nomes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0][0],
      total: pessoa.total,
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

function graficoVotos(pessoas) {
  const figura = document.createElement("figure");
  figura.className = "grafico";
  const titulo = document.createElement("figcaption");
  titulo.textContent = "Votos registrados";
  const margemEsq = 248;
  const margemDir = 48;
  const largura = 960;
  const alturaLinha = 40;
  const trilho = largura - margemEsq - margemDir;
  const maximo = Math.max(...pessoas.map((pessoa) => pessoa.total), 1);
  const altura = 8 + pessoas.length * alturaLinha;
  const desenho = svg("svg", {
    viewBox: `0 0 ${largura} ${altura}`,
    role: "img",
    "aria-label": "Total de votos registrados de cada vereador",
  });
  pessoas.forEach((pessoa, indice) => {
    const y = indice * alturaLinha;
    const meio = y + 24;
    const nome = svg("text", {
      class: "grafico-texto",
      x: margemEsq - 8,
      y: meio,
      "text-anchor": "end",
    });
    nome.textContent = pessoa.nome;
    const barra = svg("rect", {
      x: margemEsq,
      y: y + 8,
      width: (pessoa.total / maximo) * trilho,
      height: 16,
      fill: "var(--color-green)",
    });
    const dica = svg("title", {});
    dica.textContent = `${pessoa.nome}: ${pessoa.total} votos`;
    const valor = svg("text", {
      class: "grafico-texto",
      x: margemEsq + (pessoa.total / maximo) * trilho + 8,
      y: meio,
      "font-size": "12",
    });
    valor.textContent = String(pessoa.total);
    desenho.append(nome, barra, dica, valor);
  });
  const nota = document.createElement("p");
  nota.className = "grafico-nota";
  nota.textContent = "Cada barra é o total de votos registrados. Linha sem X não entra.";
  figura.append(titulo, desenho, nota);
  return figura;
}

function pessoasDoPeriodo(lista) {
  const pessoas = new Map();
  lista.forEach((chamada) => {
    chamada.presencas.forEach((linha) => {
      const atual = pessoas.get(linha.nome) || { nome: linha.nome, presente: 0, outras: 0 };
      if (linha.presenca === "Presente") atual.presente += 1;
      else atual.outras += 1;
      pessoas.set(linha.nome, atual);
    });
  });
  return [...pessoas.values()].sort((a, b) => {
    const pa = a.presente / (a.presente + a.outras);
    const pb = b.presente / (b.presente + b.outras);
    if (pb !== pa) return pb - pa;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function grafico(pessoas, totalChamadas) {
  const figura = document.createElement("figure");
  figura.className = "grafico";
  const titulo = document.createElement("figcaption");
  titulo.textContent = "Presença nas chamadas";
  const legenda = document.createElement("ul");
  legenda.className = "legenda-grafico";
  [
    ["marca-presente", "Presente"],
    ["marca-ausente", "Não presente"],
  ].forEach(([classe, rotulo]) => {
    const item = document.createElement("li");
    const marca = document.createElement("span");
    marca.className = `marca ${classe}`;
    item.append(marca, document.createTextNode(rotulo));
    legenda.append(item);
  });

  const margemEsq = 248;
  const margemDir = 64;
  const largura = 960;
  const alturaLinha = 40;
  const trilho = largura - margemEsq - margemDir;
  const altura = 28 + pessoas.length * alturaLinha;
  const desenho = svg("svg", {
    viewBox: `0 0 ${largura} ${altura}`,
    role: "img",
    "aria-label": "Presença ou não de cada vereador nas chamadas do período",
  });
  [0, 25, 50, 75, 100].forEach((marca) => {
    const x = margemEsq + (marca / 100) * trilho;
    const texto = svg("text", {
      class: "grafico-texto",
      x,
      y: 16,
      "text-anchor": marca === 0 ? "start" : "middle",
      "font-size": "12",
    });
    if (marca === 100) texto.setAttribute("text-anchor", "end");
    texto.textContent = `${marca}%`;
    desenho.append(texto);
  });
  pessoas.forEach((pessoa, indice) => {
    const total = pessoa.presente + pessoa.outras;
    const y = 28 + indice * alturaLinha;
    const meio = y + 24;
    const larguraPresente = (pessoa.presente / total) * trilho;
    const nome = svg("text", {
      class: "grafico-texto",
      x: margemEsq - 8,
      y: meio,
      "text-anchor": "end",
    });
    nome.textContent = pessoa.nome;
    const ausente = svg("rect", {
      x: margemEsq,
      y: y + 8,
      width: trilho,
      height: 16,
      fill: "var(--color-error)",
    });
    const presente = svg("rect", {
      x: margemEsq,
      y: y + 8,
      width: larguraPresente,
      height: 16,
      fill: "var(--color-green)",
    });
    const dica = svg("title", {});
    dica.textContent = `${pessoa.nome}: ${percentual(pessoa.presente, total)}% presente em ${total} chamadas`;
    const valor = svg("text", {
      class: "grafico-texto",
      x: margemEsq + trilho + 8,
      y: meio,
      "font-size": "12",
    });
    valor.textContent = `${percentual(pessoa.presente, total)}%`;
    desenho.append(nome, ausente, presente, dica, valor);
  });
  const nota = document.createElement("p");
  nota.className = "grafico-nota";
  nota.textContent = `${totalChamadas} chamadas no período. Cada chamada conta uma vez. Justificado entra em Não presente.`;
  figura.append(titulo, legenda, desenho, nota);
  return figura;
}

function abaDeVoto() {
  return abaVoto.getAttribute("aria-selected") === "true";
}

function selecionarAba(voto) {
  abaVoto.setAttribute("aria-selected", voto ? "true" : "false");
  abaPresenca.setAttribute("aria-selected", voto ? "false" : "true");
  painelVoto.hidden = !voto;
  paineisIndicadores.hidden = voto;
  desenharIndicadores();
}

function desenharIndicadores() {
  if (abaDeVoto()) {
    const pessoas = pessoasDoVoto();
    if (pessoas.length === 0) {
      painelVoto.replaceChildren();
      vazioIndicadores.textContent = "Não há voto nesse período.";
      vazioIndicadores.hidden = false;
      return;
    }
    vazioIndicadores.hidden = true;
    painelVoto.replaceChildren(graficoVotos(pessoas));
    return;
  }
  const lista = chamadasDoFiltro();
  if (lista.length === 0) {
    paineisIndicadores.replaceChildren();
    vazioIndicadores.textContent = "Não há chamada nesse período.";
    vazioIndicadores.hidden = false;
    return;
  }
  vazioIndicadores.hidden = true;
  paineisIndicadores.replaceChildren(grafico(pessoasDoPeriodo(lista), lista.length));
}

function pessoasComVoto() {
  const grupos = new Map();
  sumulas.forEach((sumula) => {
    sumula.votos.forEach((linha) => {
      if (!linha.voto) return;
      const chave = chavePessoa(linha);
      const atual = grupos.get(chave) || { chave, nomes: new Map() };
      atual.nomes.set(linha.nome, (atual.nomes.get(linha.nome) || 0) + 1);
      grupos.set(chave, atual);
    });
  });
  return [...grupos.values()]
    .map((pessoa) => ({
      chave: pessoa.chave,
      nome: [...pessoa.nomes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0][0],
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function corVoto(voto) {
  if (voto === "Favorável") return "var(--color-green)";
  if (voto === "Contrário") return "var(--color-error)";
  if (voto === "Abstenção") return "var(--color-warning)";
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
  const nota = document.createElement("p");
  nota.className = "grafico-nota";
  nota.textContent = "Linha sem X não entra.";
  bloco.append(titulo, desenho, legendaVotos(fatias, total), nota);
  return bloco;
}

function dataCurta(valor) {
  const forma = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!forma) return "—";
  return `${forma[3]}/${forma[2]}`;
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
  const margemBaixo = 72;
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
      transform: `translate(${x} ${base}) rotate(45)`,
    });
    rotulo.textContent = dataCurta(dia);
    desenho.append(rotulo);
  });
  rolagem.append(desenho);
  const nota = document.createElement("p");
  nota.className = "grafico-nota";
  nota.textContent = "Cada barra soma 100% dos votos daquele dia. A quantidade está na dica.";
  bloco.append(titulo, rolagem, nota);
  return bloco;
}

function mostrarVotos(pessoa) {
  listaVotos.querySelectorAll("button").forEach((botao) => {
    botao.setAttribute("aria-pressed", botao.dataset.chave === pessoa.chave ? "true" : "false");
  });
  const itens = [];
  sumulas.forEach((sumula) => {
    sumula.votos.forEach((linha) => {
      if (!linha.voto || chavePessoa(linha) !== pessoa.chave) return;
      itens.push({
        dia: diaDaSessao(sumula),
        titulo: sumula.titulo,
        documento: sumula.documento || "Súmula",
        voto: linha.voto,
      });
    });
  });
  itens.sort((a, b) => b.dia.localeCompare(a.dia) || a.documento.localeCompare(b.documento, "pt-BR"));
  const tabela = document.createElement("table");
  tabela.className = "presenca-lista";
  const cabecalho = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  ["Data", "Sessão", "Documento", "Voto"].forEach((rotulo) => {
    const th = celula(rotulo, "th");
    th.scope = "col";
    linhaCabecalho.append(th);
  });
  cabecalho.append(linhaCabecalho);
  const corpo = document.createElement("tbody");
  itens.forEach((item) => {
    const tr = document.createElement("tr");
    const voto = celula(item.voto, "td");
    voto.className = "presenca-valor";
    voto.dataset.voto = item.voto;
    tr.append(
      celula(item.dia ? dataPorExtenso(item.dia) : "—", "td"),
      celula(item.titulo, "td"),
      celula(item.documento, "td"),
      voto,
    );
    corpo.append(tr);
  });
  tabela.append(cabecalho, corpo);
  const faixa = document.createElement("div");
  faixa.className = "votos-graficos";
  faixa.append(pizzaVotos(itens), barrasDias(itens));
  painelVotos.replaceChildren(faixa, tabela);
}

function grupoVotos(titulo, pessoas, atual) {
  const secao = document.createElement("section");
  secao.className = "votos-grupo";
  const cabeca = document.createElement("h3");
  cabeca.textContent = titulo;
  const lista = document.createElement("ul");
  lista.className = "votos-pessoas";
  pessoas.forEach((pessoa) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = atual ? "voto-pessoa voto-atual" : "voto-pessoa";
    botao.dataset.chave = pessoa.chave;
    botao.textContent = pessoa.nome;
    botao.setAttribute("aria-pressed", "false");
    botao.addEventListener("click", () => mostrarVotos(pessoa));
    item.append(botao);
    lista.append(item);
  });
  secao.append(cabeca, lista);
  return secao;
}

function montarListaVotos() {
  const pessoas = pessoasComVoto();
  const atuais = pessoas.filter((pessoa) => eleitos.has(pessoa.chave));
  const anteriores = pessoas.filter((pessoa) => !eleitos.has(pessoa.chave));
  listaVotos.replaceChildren(grupoVotos("Atuais", atuais, true), grupoVotos("Anteriores", anteriores, false));
  painelVotos.replaceChildren();
  const nota = document.createElement("p");
  nota.textContent = "Escolha um vereador.";
  painelVotos.append(nota);
}

abrirIndicadores.addEventListener("click", async () => {
  try {
    await carregar();
    preencherFiltros();
    selecionarAba(true);
    filtrosIndicadores.hidden = false;
    erroIndicadores.hidden = true;
  } catch (falha) {
    filtrosIndicadores.hidden = true;
    painelVoto.replaceChildren();
    paineisIndicadores.replaceChildren();
    vazioIndicadores.hidden = true;
    erroIndicadores.hidden = false;
  }
  if (!dialogoIndicadores.open) dialogoIndicadores.showModal();
});

abaVoto.addEventListener("click", () => {
  if (chamadas) selecionarAba(true);
});

abaPresenca.addEventListener("click", () => {
  if (chamadas) selecionarAba(false);
});

filtroMes.addEventListener("change", () => {
  if (chamadas) desenharIndicadores();
});

filtroAno.addEventListener("change", () => {
  if (chamadas) desenharIndicadores();
});

abrir.addEventListener("click", async () => {
  try {
    await carregar();
    painel.hidden = false;
    erro.hidden = true;
  } catch (falha) {
    painel.hidden = true;
    erro.hidden = false;
  }
  if (!dialogo.open) dialogo.showModal();
});

anterior.addEventListener("click", () => {
  if (!anterior.disabled) mover(-1);
});

proximo.addEventListener("click", () => {
  if (!proximo.disabled) mover(1);
});

abrirChamadaDia.addEventListener("click", () => {
  if (diaAberto) abrirChamada();
});

abrirVotos.addEventListener("click", async () => {
  try {
    await carregar();
    await carregarEleitos();
    montarListaVotos();
    layoutVotos.hidden = false;
    erroVotos.hidden = true;
  } catch (falha) {
    layoutVotos.hidden = true;
    erroVotos.hidden = false;
  }
  if (!dialogoVotos.open) dialogoVotos.showModal();
});

ligar(dialogo, fechar);
ligar(dialogoDia, fecharDia);
ligar(dialogoChamada, fecharChamada);
ligar(dialogoVotos, fecharVotos);
ligar(dialogoIndicadores, fecharIndicadores);
})();
