(() => {
const abrir = document.querySelector("#abrir-audiencias");
const dialogo = document.querySelector("#audiencias-dados");
const fechar = document.querySelector("#fechar-audiencias");
const paineis = document.querySelector("#paineis-audiencias");
const erro = document.querySelector("#erro-audiencias");

const PECAS = [
  { chave: "LDO", nome: "LDO", cor: "var(--color-accent)", classe: "grafico-pct" },
  { chave: "LOA", nome: "LOA", cor: "var(--color-info)", classe: "grafico-pct" },
  { chave: "PPA", nome: "PPA", cor: "var(--color-green)", classe: "grafico-pct" },
  { chave: "sem_peca", nome: "Sem peça", cor: "var(--color-yellow)", classe: "grafico-pct grafico-pct-escuro" },
];

function percentual(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

function pilha(contagem, x, larguraBarra, base, barraMax) {
  const total = PECAS.reduce((soma, peca) => soma + (contagem[peca.chave] || 0), 0);
  if (!total) return "";
  let y = base;
  return PECAS.map((peca) => {
    const quantidade = contagem[peca.chave] || 0;
    if (!quantidade) return "";
    const altura = Math.round((quantidade / total) * barraMax);
    y -= altura;
    const pct = percentual(quantidade, total);
    const texto = altura >= 16
      ? `<text class="${peca.classe}" x="${x + larguraBarra / 2}" y="${y + altura / 2 + 4}" text-anchor="middle">${pct}%</text>`
      : "";
    return `<rect x="${x}" y="${y}" width="${larguraBarra}" height="${altura}" fill="${peca.cor}"></rect>${texto}`;
  }).join("");
}

function empilhado(composicao) {
  const quantidade = composicao.length;
  const largura = 640;
  const margem = 24;
  const topo = 8;
  const barraMax = 160;
  const base = topo + barraMax;
  const altura = base + 48;
  const passo = (largura - margem * 2) / quantidade;
  const larguraBarra = Math.min(28, Math.round(passo * 0.34));
  const formas = composicao.map((ano, indice) => {
    const centro = margem + passo * indice + passo / 2;
    const x1 = Math.round(centro - larguraBarra - 3);
    const x2 = Math.round(centro + 3);
    return `${pilha(ano.convites, x1, larguraBarra, base, barraMax)}
      ${pilha(ano.atas, x2, larguraBarra, base, barraMax)}
      <text class="grafico-texto" x="${x1 + larguraBarra / 2}" y="${base + 16}" text-anchor="middle">C</text>
      <text class="grafico-texto" x="${x2 + larguraBarra / 2}" y="${base + 16}" text-anchor="middle">A</text>
      <text class="grafico-texto" x="${Math.round(centro)}" y="${base + 34}" text-anchor="middle">${ano.exercicio}</text>`;
  });
  const eixo = `<line x1="${margem}" y1="${base}" x2="${largura - margem}" y2="${base}" stroke="var(--color-border)"></line>`;
  return `<svg viewBox="0 0 ${largura} ${altura}" role="img">${eixo}${formas.join("")}</svg>`;
}

function montar(indicadores) {
  paineis.innerHTML = `
    <figure class="grafico">
      <figcaption>Convites e atas por exercício</figcaption>
      <ul class="legenda-grafico">
        ${PECAS.map((peca) => `<li><span class="marca marca-${peca.chave === "sem_peca" ? "sem-peca" : peca.chave.toLowerCase()}"></span> ${peca.nome}</li>`).join("")}
      </ul>
      <p class="grafico-nota">Cada barra soma 100%. C é o convite e A é a ata. A cor é a parcela da peça citada no título.</p>
      ${empilhado(indicadores.composicao)}
    </figure>`;
}

async function carregar() {
  const resposta = await fetch("../dados/gold/audiencias-publicas/indicadores.json?v=2");
  if (!resposta.ok) throw new Error(String(resposta.status));
  const lido = await resposta.json();
  if (!Array.isArray(lido.composicao)) {
    throw new Error("formato");
  }
  return lido;
}

abrir.addEventListener("click", async () => {
  try {
    montar(await carregar());
    paineis.hidden = false;
    erro.hidden = true;
  } catch (falha) {
    paineis.hidden = true;
    erro.hidden = false;
  }
  if (!dialogo.open) dialogo.showModal();
});

fechar.addEventListener("click", () => dialogo.close());

dialogo.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") dialogo.close();
});

dialogo.addEventListener("click", (evento) => {
  if (evento.target === dialogo) dialogo.close();
});
})();
