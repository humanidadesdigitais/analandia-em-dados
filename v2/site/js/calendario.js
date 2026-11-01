const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const abrir = document.querySelector("#abrir-calendario");
const dialogo = document.querySelector("#calendario-sessoes");
const fechar = document.querySelector("#fechar-calendario");
const info = document.querySelector("#info-sessoes");
const painel = document.querySelector("#painel-mes");
const erro = document.querySelector("#dialogo-erro");
const nome = document.querySelector("#mes-nome");
const datas = document.querySelector("#datas-sessoes");
const tabela = document.querySelector("#mes-tabela");
const anterior = document.querySelector("#mes-anterior");
const proximo = document.querySelector("#mes-proximo");

let dados = null;
let mesAtual = 1;

function iso(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function mesDeHoje(exercicio) {
  const hoje = new Date();
  if (hoje.getFullYear() === exercicio) return hoje.getMonth() + 1;
  return 1;
}

function recessosNoMes(recessos, ano, mes) {
  const inicio = iso(ano, mes, 1);
  const fim = iso(ano, mes, new Date(ano, mes, 0).getDate());
  return recessos.filter((recesso) => recesso.inicio <= fim && recesso.fim >= inicio);
}

function emRecesso(recessos, dia) {
  return recessos.some((recesso) => recesso.inicio <= dia && dia <= recesso.fim);
}

function frase(dias, recessos) {
  const partes = [];
  if (dias.length === 0) {
    partes.push("Não há sessão ordinária.");
  } else if (dias.length === 1) {
    partes.push(`Sessão no dia ${dias[0]}.`);
  } else {
    const ultimo = dias[dias.length - 1];
    const anteriores = dias.slice(0, -1).join(", ");
    partes.push(`Sessões nos dias ${anteriores} e ${ultimo}.`);
  }
  recessos.forEach((recesso) => {
    const texto = recesso.texto.replace(/\.$/, "");
    partes.push(`${texto}.`);
  });
  return partes.join(" ");
}

function desenhar(mes) {
  const ano = dados.exercicio;
  const sessoes = new Set(dados.sessoes);
  const diasDeSessao = dados.sessoes
    .filter((data) => data.startsWith(`${ano}-${String(mes).padStart(2, "0")}-`))
    .map((data) => Number(data.slice(8)));
  const recessos = recessosNoMes(dados.recessos, ano, mes);
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const quantidade = new Date(ano, mes, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiro; i += 1) celulas.push(0);
  for (let dia = 1; dia <= quantidade; dia += 1) celulas.push(dia);
  while (celulas.length % 7 !== 0) celulas.push(0);

  const cabecalho = DIAS.map(
    (dia, indice) => `<th scope="col"><abbr title="${dia}">${"DSTQQSS"[indice]}</abbr></th>`,
  ).join("");
  const linhas = [];
  for (let i = 0; i < celulas.length; i += 7) {
    const semana = celulas.slice(i, i + 7).map((dia) => {
      if (dia === 0) return '<td class="vazio"></td>';
      const quando = iso(ano, mes, dia);
      if (sessoes.has(quando)) return `<td class="sessao" title="Sessão">${dia}</td>`;
      if (emRecesso(dados.recessos, quando)) return `<td class="recesso" title="Recesso">${dia}</td>`;
      return `<td>${dia}</td>`;
    });
    linhas.push(`<tr>${semana.join("")}</tr>`);
  }

  nome.textContent = `${MESES[mes - 1]} de ${ano}`;
  datas.textContent = frase(diasDeSessao, recessos);
  tabela.innerHTML = `<table class="mes" aria-label="${MESES[mes - 1]} de ${ano}"><thead><tr>${cabecalho}</tr></thead><tbody>${linhas.join("")}</tbody></table>`;
  anterior.disabled = mes === 1;
  proximo.disabled = mes === 12;
  mesAtual = mes;
}

async function carregar() {
  if (dados) return dados;
  const resposta = await fetch("../dados/silver/calendario-das-sessoes/calendario.json");
  if (!resposta.ok) throw new Error(String(resposta.status));
  const lido = await resposta.json();
  if (!Array.isArray(lido.anos) || lido.anos.length === 0) throw new Error("formato");
  const hoje = new Date().getFullYear();
  const ano = lido.anos.find((item) => item.exercicio === hoje) || lido.anos[lido.anos.length - 1];
  if (!Array.isArray(ano.sessoes) || !Array.isArray(ano.recessos) || typeof ano.exercicio !== "number") {
    throw new Error("formato");
  }
  dados = ano;
  return dados;
}

function mostrarErro() {
  painel.hidden = true;
  erro.hidden = false;
}

function mostrarMes() {
  painel.hidden = false;
  erro.hidden = true;
  desenhar(mesDeHoje(dados.exercicio));
}

abrir.addEventListener("click", async () => {
  try {
    await carregar();
    mostrarMes();
  } catch (falha) {
    mostrarErro();
  }
  if (!dialogo.open) dialogo.showModal();
});

fechar.addEventListener("click", () => dialogo.close());

dialogo.addEventListener("click", (evento) => {
  if (evento.target === dialogo) dialogo.close();
});

dialogo.addEventListener("close", () => {
  info.setAttribute("aria-expanded", "false");
});

anterior.addEventListener("click", () => {
  if (mesAtual > 1) desenhar(mesAtual - 1);
});

proximo.addEventListener("click", () => {
  if (mesAtual < 12) desenhar(mesAtual + 1);
});

info.addEventListener("click", (evento) => {
  evento.stopPropagation();
  const aberto = info.getAttribute("aria-expanded") === "true";
  info.setAttribute("aria-expanded", aberto ? "false" : "true");
});

document.addEventListener("click", (evento) => {
  if (!info.contains(evento.target)) info.setAttribute("aria-expanded", "false");
});
