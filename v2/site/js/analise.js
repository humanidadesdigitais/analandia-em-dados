(() => {
const abrir = document.querySelector("#abrir-analise");
const dialogo = document.querySelector("#analise-dados");
const fechar = document.querySelector("#fechar-analise");
const paineis = document.querySelector("#paineis-analise");
const erro = document.querySelector("#erro-analise");

function comparar(porAno) {
  const maximo = Math.max(
    ...porAno.flatMap((ano) => [ano.sessoes, ano.dias_recesso]),
    1,
  );
  const quantidade = porAno.length;
  const largura = 640;
  const margem = 28;
  const topo = 22;
  const barraMax = 150;
  const base = topo + barraMax;
  const altura = base + 36;
  const passo = (largura - margem * 2) / quantidade;
  const larguraBarra = Math.min(22, Math.round(passo * 0.32));
  const formas = porAno.map((ano, indice) => {
    const centro = margem + passo * indice + passo / 2;
    const sessoes = ano.sessoes === 0 ? 0 : Math.max(4, Math.round((ano.sessoes / maximo) * barraMax));
    const recesso = ano.dias_recesso === 0 ? 0 : Math.max(4, Math.round((ano.dias_recesso / maximo) * barraMax));
    const x1 = Math.round(centro - larguraBarra - 3);
    const x2 = Math.round(centro + 3);
    return `<rect x="${x1}" y="${base - sessoes}" width="${larguraBarra}" height="${sessoes}" rx="4" fill="var(--color-info)"></rect>
      <text class="grafico-texto" x="${x1 + larguraBarra / 2}" y="${base - sessoes - 8}" text-anchor="middle">${ano.sessoes}</text>
      <rect x="${x2}" y="${base - recesso}" width="${larguraBarra}" height="${recesso}" rx="4" fill="var(--color-error)"></rect>
      <text class="grafico-texto" x="${x2 + larguraBarra / 2}" y="${base - recesso - 8}" text-anchor="middle">${ano.dias_recesso}</text>
      <text class="grafico-texto" x="${Math.round(centro)}" y="${base + 22}" text-anchor="middle">${ano.exercicio}</text>`;
  });
  const eixo = `<line x1="${margem}" y1="${base}" x2="${largura - margem}" y2="${base}" stroke="var(--color-border)"></line>`;
  return `<svg viewBox="0 0 ${largura} ${altura}" role="img">${eixo}${formas.join("")}</svg>`;
}

function semestres(porAno) {
  const maximo = Math.max(
    ...porAno.flatMap((ano) => [ano.primeiro_semestre, ano.segundo_semestre]),
    1,
  );
  const quantidade = porAno.length;
  const largura = 640;
  const margem = 28;
  const topo = 22;
  const barraMax = 150;
  const base = topo + barraMax;
  const altura = base + 36;
  const passo = (largura - margem * 2) / quantidade;
  const larguraBarra = Math.min(18, Math.round(passo * 0.28));
  const formas = porAno.map((ano, indice) => {
    const centro = margem + passo * indice + passo / 2;
    const primeira = Math.max(4, Math.round((ano.primeiro_semestre / maximo) * barraMax));
    const segunda = Math.max(4, Math.round((ano.segundo_semestre / maximo) * barraMax));
    const x1 = Math.round(centro - larguraBarra - 3);
    const x2 = Math.round(centro + 3);
    return `      <rect x="${x1}" y="${base - primeira}" width="${larguraBarra}" height="${primeira}" rx="4" fill="var(--color-yellow)"></rect>
      <text class="grafico-texto" x="${x1 + larguraBarra / 2}" y="${base - primeira - 8}" text-anchor="middle">${ano.primeiro_semestre}</text>
      <rect x="${x2}" y="${base - segunda}" width="${larguraBarra}" height="${segunda}" rx="4" fill="var(--color-green)"></rect>
      <text class="grafico-texto" x="${x2 + larguraBarra / 2}" y="${base - segunda - 8}" text-anchor="middle">${ano.segundo_semestre}</text>
      <text class="grafico-texto" x="${Math.round(centro)}" y="${base + 22}" text-anchor="middle">${ano.exercicio}</text>`;
  });
  const eixo = `<line x1="${margem}" y1="${base}" x2="${largura - margem}" y2="${base}" stroke="var(--color-border)"></line>`;
  return `<svg viewBox="0 0 ${largura} ${altura}" role="img">${eixo}${formas.join("")}</svg>`;
}

function montar(indicadores) {
  const porAno = indicadores.por_ano;
  paineis.innerHTML = `
    <figure class="grafico">
      <figcaption>Sessões e dias de recesso por ano</figcaption>
      <ul class="legenda-grafico">
        <li><span class="marca marca-sessao"></span> Sessões</li>
        <li><span class="marca marca-recesso"></span> Dias de recesso</li>
      </ul>
      ${comparar(porAno)}
      <p class="grafico-nota">O recesso conta o período que o calendário daquele ano declara, inclusive janeiro do ano seguinte quando o texto chega até lá.</p>
    </figure>
    <figure class="grafico">
      <figcaption>Sessões por semestre</figcaption>
      <ul class="legenda-grafico">
        <li><span class="marca marca-primeiro"></span> Primeiro semestre</li>
        <li><span class="marca marca-segundo"></span> Segundo semestre</li>
      </ul>
      ${semestres(porAno)}
    </figure>`;
}

async function carregar() {
  const resposta = await fetch("../dados/gold/calendario-das-sessoes/indicadores.json");
  if (!resposta.ok) throw new Error(String(resposta.status));
  const lido = await resposta.json();
  if (!Array.isArray(lido.por_ano) || !Array.isArray(lido.por_mes)) {
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
