"""Baixa as audiências públicas publicadas pela Câmara de Analândia.

A lista está em https://camaraanalandia.sp.gov.br/doc/?doc=1877.
Cada ano do seletor abre ?doc=1877&a=ANO.
Cada PDF vai para a bronze e metadados.json descreve a pasta.
"""

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PAGINA = "https://camaraanalandia.sp.gov.br/doc/?doc=1877"
TEMA = "audiencias-publicas"
USER_AGENT = "analandia-em-dados"
PAUSA_SEGUNDOS = 1

RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA

MESES = {
    "janeiro": 1,
    "fevereiro": 2,
    "março": 3,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}

ANO = re.compile(r'<option value="(\d{4})"')
ITEM = re.compile(
    r'href="(https://file\.camaraanalandia\.sp\.gov\.br/[^"]+/(\d+)\.pdf)"[^>]*>'
    r"(?:<i[^>]*>\s*</i>\s*)?([^<]+)</a>\s+de\s+(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})",
    re.IGNORECASE,
)


def baixar(url, accept):
    pedido = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": accept},
    )
    espera = PAUSA_SEGUNDOS
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(pedido, timeout=60) as resposta:
                return resposta.read()
        except urllib.error.HTTPError as erro:
            if erro.code not in {429, 500, 502, 503, 504} or tentativa == 2:
                detalhe = erro.read().decode("utf-8", errors="replace")
                raise SystemExit(f"Falha em {url}: HTTP {erro.code} {detalhe}") from erro
        except urllib.error.URLError as erro:
            if tentativa == 2:
                raise SystemExit(f"Falha em {url}: {erro.reason}") from erro
        time.sleep(espera)
        espera *= 2
    raise SystemExit(f"Falha em {url}")


def data_documento(dia, mes, ano):
    numero = MESES.get(mes.lower())
    if numero is None:
        raise SystemExit(f"Mês desconhecido: {mes}")
    return f"{int(ano):04d}-{numero:02d}-{int(dia):02d}"


def pagina_do_ano(exercicio):
    return f"{PAGINA}&a={exercicio}"


def anos_do_seletor(html):
    anos = []
    for valor in ANO.findall(html):
        ano = int(valor)
        if ano not in anos:
            anos.append(ano)
    if not anos:
        raise SystemExit("O seletor de ano não trouxe nenhum exercício.")
    return anos


def listar(html, exercicio):
    itens = []
    for url, arquivo_id, titulo, dia, mes, ano in ITEM.findall(html):
        itens.append(
            {
                "titulo": re.sub(r"\s+", " ", titulo).strip(),
                "arquivo": f"{arquivo_id}.pdf",
                "url": url,
                "data_documento": data_documento(dia, mes, ano),
                "exercicio": exercicio,
            }
        )
    if not itens:
        raise SystemExit(f"O exercício {exercicio} não trouxe nenhum PDF.")
    return itens


def main():
    html = baixar(PAGINA, "text/html").decode("utf-8", errors="replace")
    itens = []
    for indice, exercicio in enumerate(anos_do_seletor(html)):
        if indice:
            time.sleep(PAUSA_SEGUNDOS)
        pagina = baixar(pagina_do_ano(exercicio), "text/html").decode("utf-8", errors="replace")
        itens.extend(listar(pagina, exercicio))
    itens.sort(key=lambda item: (item["exercicio"], item["data_documento"], item["arquivo"]))

    BRONZE.mkdir(parents=True, exist_ok=True)
    for indice, item in enumerate(itens):
        if indice:
            time.sleep(PAUSA_SEGUNDOS)
        conteudo = baixar(item["url"], "application/pdf")
        if not conteudo.startswith(b"%PDF"):
            raise SystemExit(f"{item['url']} não devolveu um PDF.")
        destino = BRONZE / item["arquivo"]
        destino.write_bytes(conteudo)
        item["bytes"] = destino.stat().st_size
        print(f"{item['exercicio']} {item['arquivo']} {item['titulo']}")

    metadados = {
        "tema": TEMA,
        "fonte": PAGINA,
        "coletado_em": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "itens": itens,
    }
    (BRONZE / "metadados.json").write_text(
        json.dumps(metadados, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(itens)} audiências em {BRONZE.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
