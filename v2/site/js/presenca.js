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

let chamadas = null;
let porDia = new Map();
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

function abrirDia(valor, doDia) {
  tituloDia.textContent = dataPorExtenso(valor);
  paineisDia.replaceChildren(...doDia.map(montarTabela));
  if (!dialogoDia.open) dialogoDia.showModal();
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
          botao.setAttribute("aria-label", `${dataPorExtenso(quando)}, presença`);
          botao.addEventListener("click", () => abrirDia(quando, doDia));
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

function preparar(lista) {
  chamadas = lista;
  porDia = new Map();
  lista.forEach((chamada) => {
    const grupo = porDia.get(chamada.realizada_em) || [];
    grupo.push(chamada);
    porDia.set(chamada.realizada_em, grupo);
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
  const resposta = await fetch("../dados/silver/sessoes-plenarias/chamadas.json");
  if (!resposta.ok) throw new Error(String(resposta.status));
  const lido = await resposta.json();
  if (!Array.isArray(lido.chamadas) || lido.chamadas.length === 0) throw new Error("formato");
  lido.chamadas.forEach((chamada) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chamada.realizada_em)) throw new Error("formato");
    if (!Array.isArray(chamada.presencas) || chamada.presencas.length === 0) throw new Error("formato");
  });
  preparar(lido.chamadas);
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

function preencherFiltros() {
  const anos = [...new Set(chamadas.map((chamada) => chamada.realizada_em.slice(0, 4)))].sort();
  const meses = [...new Set(chamadas.map((chamada) => Number(chamada.realizada_em.slice(5, 7))))];
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
  return chamadas.filter((chamada) => {
    const [ano, mes] = chamada.realizada_em.split("-");
    if (filtroAno.value && ano !== filtroAno.value) return false;
    if (filtroMes.value && mes !== filtroMes.value) return false;
    return true;
  });
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

function desenharIndicadores() {
  const lista = chamadasDoFiltro();
  if (lista.length === 0) {
    paineisIndicadores.replaceChildren();
    vazioIndicadores.hidden = false;
    return;
  }
  vazioIndicadores.hidden = true;
  paineisIndicadores.replaceChildren(grafico(pessoasDoPeriodo(lista), lista.length));
}

abrirIndicadores.addEventListener("click", async () => {
  try {
    await carregar();
    preencherFiltros();
    desenharIndicadores();
    filtrosIndicadores.hidden = false;
    erroIndicadores.hidden = true;
  } catch (falha) {
    filtrosIndicadores.hidden = true;
    paineisIndicadores.replaceChildren();
    vazioIndicadores.hidden = true;
    erroIndicadores.hidden = false;
  }
  if (!dialogoIndicadores.open) dialogoIndicadores.showModal();
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

ligar(dialogo, fechar);
ligar(dialogoDia, fecharDia);
ligar(dialogoIndicadores, fecharIndicadores);
})();
