"""Baixa as sessões plenárias publicadas pela Câmara de Analândia.

A lista está em https://camaraanalandia.sp.gov.br/sessao/.
Cada sessão é ?id=. Chamada e súmula são PDFs em file.tramitacao.online.
Súmula sem arquivo fica com URL nula. metadados.json descreve a pasta no fim.
A lista e o HTML de cada sessão são baixados de novo. PDF já válido fica.
"""

import html
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PAGINA = "https://camaraanalandia.sp.gov.br/sessao/"
ORGAO = "61392"
TEMA = "sessoes-plenarias"
USER_AGENT = "analandia-em-dados"
PAUSA_SEGUNDOS = 1

RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA

PAGINA_JS = re.compile(r"javascript:pagina\(\s*61392\s*,\s*(\d+)\s*\)")
LINHA_LISTA = re.compile(
    r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td[^>]*>\s*<a href="/sessao/\?id=(\d+)"',
    re.DOTALL,
)
TITULO = re.compile(r'<h2 class="m-40">(.*?)</h2>', re.DOTALL)
PERIODO_SESSAO = re.compile(r"(Realizada em [^<]+?\.)")
CHAMADA_URL = re.compile(
    rf"^https://file\.tramitacao\.online/{ORGAO}/arquivo_chamada/(\d+)/(\d+)\.pdf$"
)
SUMULA_URL = re.compile(
    rf"^https://file\.tramitacao\.online/{ORGAO}/arquivo_sumula/(\d+)/(\d+)\.pdf$"
)
SUMULA_AUSENTE = re.compile(r"^https://file\.tramitacao\.online/?$")
DATA_LISTA = re.compile(r"^\d{2}/\d{2}/\d{4} \d{2}:\d{2}$")


def baixar(url):
    pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    espera = PAUSA_SEGUNDOS
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(pedido, timeout=120) as resposta:
                return resposta.read()
        except urllib.error.HTTPError as erro:
            if erro.code not in {429, 500, 502, 503, 504} or tentativa == 2:
                detalhe = erro.read().decode("utf-8", errors="replace")
                raise SystemExit(f"Falha em {url}: HTTP {erro.code} {detalhe}") from erro
        except urllib.error.URLError as erro:
            if tentativa == 2:
                raise SystemExit(f"Falha em {url}: {erro.reason}") from erro
        except TimeoutError as erro:
            if tentativa == 2:
                raise SystemExit(f"Falha em {url}: {erro}") from erro
        time.sleep(espera)
        espera *= 2
    raise SystemExit(f"Falha em {url}")


def gravar(destino, conteudo):
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_name(destino.name + ".parcial")
    try:
        parcial.write_bytes(conteudo)
        parcial.replace(destino)
    except BaseException:
        parcial.unlink(missing_ok=True)
        raise


def texto(fragmento):
    sem_icone = re.sub(r"<i\b[^>]*>.*?</i>", " ", fragmento, flags=re.DOTALL)
    sem_tag = re.sub(r"<[^>]+>", " ", sem_icone)
    limpo = html.unescape(sem_tag)
    return re.sub(r"\s+", " ", limpo).strip()


def html_texto(conteudo, url):
    if not conteudo or not conteudo.strip():
        raise SystemExit(f"{url} devolveu HTML vazio.")
    try:
        return conteudo.decode("utf-8")
    except UnicodeError as erro:
        raise SystemExit(f"{url} não devolveu UTF-8: {erro}") from erro


def pdf_valido(caminho):
    if not caminho.is_file() or caminho.stat().st_size == 0:
        return False
    with caminho.open("rb") as arquivo:
        return arquivo.read(5) == b"%PDF-"


def garantir_pdf(url, destino):
    if pdf_valido(destino):
        return destino.stat().st_size
    time.sleep(PAUSA_SEGUNDOS)
    conteudo = baixar(url)
    if not conteudo.startswith(b"%PDF-"):
        raise SystemExit(f"{url} não devolveu um PDF.")
    gravar(destino, conteudo)
    return destino.stat().st_size


def exigir_pagina_unica(pagina):
    numeros = {int(numero) for numero in PAGINA_JS.findall(pagina)}
    if not numeros:
        raise SystemExit("A lista não trouxe o pager pagina(61392, N).")
    if any(numero > 1 for numero in numeros):
        raise SystemExit(
            "A lista aponta para outra página e o coletor ainda não sabe buscá-la: "
            + ", ".join(str(numero) for numero in sorted(numeros))
        )


def listar(pagina):
    exigir_pagina_unica(pagina)
    sessoes = []
    vistos = set()
    for titulo_html, data_html, identificador in LINHA_LISTA.findall(pagina):
        titulo = texto(titulo_html)
        data = texto(data_html)
        if not titulo or not DATA_LISTA.fullmatch(data):
            raise SystemExit(f"Linha de sessão ilegível: {titulo!r} {data!r}")
        if identificador in vistos:
            raise SystemExit(f"A lista repetiu a sessão {identificador}.")
        vistos.add(identificador)
        sessoes.append(
            {
                "id": int(identificador),
                "titulo": titulo,
                "data": data,
                "url": f"{PAGINA}?id={identificador}",
            }
        )
    if not sessoes:
        raise SystemExit("A lista não trouxe sessões.")
    return sessoes


def tds(linha):
    return re.findall(r"<td\b[^>]*>(.*?)</td>", linha, flags=re.DOTALL)


def corpo(tabela_html, nome):
    miolo = re.search(r"<tbody>(.*?)</tbody>", tabela_html, flags=re.DOTALL)
    if miolo is None:
        raise SystemExit(f"A tabela de {nome} não tem corpo.")
    return re.findall(r"<tr\b[^>]*>(.*?)</tr>", miolo.group(1), flags=re.DOTALL)


def tabelas(pagina, sessao_id):
    partes = pagina.split("<h2>Votações</h2>", 1)
    if len(partes) != 2:
        raise SystemExit(f"A sessão {sessao_id} não tem o bloco de votações.")
    antes = re.findall(r"<table\b[^>]*>.*?</table>", partes[0], flags=re.DOTALL)
    depois = re.findall(r"<table\b[^>]*>.*?</table>", partes[1], flags=re.DOTALL)
    if len(antes) != 1 or len(depois) != 1:
        raise SystemExit(f"A sessão {sessao_id} não tem uma tabela de chamada e uma de votação.")
    return antes[0], depois[0]


def ler_chamadas(tabela, sessao_id):
    chamadas = []
    for linha in corpo(tabela, "chamada"):
        colunas = tds(linha)
        if len(colunas) != 3:
            raise SystemExit(f"A sessão {sessao_id} tem chamada com {len(colunas)} colunas.")
        numero = re.fullmatch(r"Chamada Nº(\d+)", texto(colunas[0]))
        if numero is None:
            raise SystemExit(f"A sessão {sessao_id} tem chamada ilegível: {texto(colunas[0])!r}")
        periodo = texto(colunas[1])
        if not periodo:
            raise SystemExit(f"A sessão {sessao_id} tem chamada sem período.")
        href = re.search(r'<a\b[^>]*href="([^"]+)"', colunas[2])
        if href is None:
            raise SystemExit(f"A sessão {sessao_id} tem chamada sem arquivo.")
        caminho = CHAMADA_URL.fullmatch(href.group(1))
        if caminho is None or int(caminho.group(1)) != sessao_id:
            raise SystemExit(f"A sessão {sessao_id} tem chamada fora do padrão: {href.group(1)}")
        chamadas.append(
            {
                "numero": int(numero.group(1)),
                "periodo": periodo,
                "url": href.group(1),
                "arquivo_id": int(caminho.group(2)),
            }
        )
    return chamadas


def ler_documento(celula, sessao_id):
    tramitacao = re.search(r'href="/tramitacao/\?id=(\d+)"', celula)
    partes = re.split(r"<br\s*/?>", celula, maxsplit=1, flags=re.IGNORECASE)
    nome = texto(partes[0])
    if not nome:
        raise SystemExit(f"A sessão {sessao_id} tem votação sem documento.")
    ementa = None
    if len(partes) > 1:
        miolo = re.search(r'<span class="txt-small">(.*?)</span>', partes[1], flags=re.DOTALL)
        if miolo:
            ementa = texto(miolo.group(1)) or None
    return nome, ementa, int(tramitacao.group(1)) if tramitacao else None


def ler_sumula(celula, sessao_id):
    href = re.search(r'<a\b[^>]*href="([^"]*)"', celula)
    if href is None:
        raise SystemExit(f"A sessão {sessao_id} tem votação sem o campo da súmula.")
    url = href.group(1)
    if SUMULA_AUSENTE.fullmatch(url):
        return None, None
    caminho = SUMULA_URL.fullmatch(url)
    if caminho is None:
        raise SystemExit(f"A sessão {sessao_id} tem súmula fora do padrão: {url}")
    return url, (int(caminho.group(1)), int(caminho.group(2)))


def ler_votacoes(tabela, sessao_id):
    votacoes = []
    for linha in corpo(tabela, "votação"):
        colunas = tds(linha)
        if len(colunas) != 5:
            raise SystemExit(f"A sessão {sessao_id} tem votação com {len(colunas)} colunas.")
        documento, ementa, tramitacao_id = ler_documento(colunas[0], sessao_id)
        partes = [texto(parte) for parte in re.split(r"<br\s*/?>", colunas[1], flags=re.IGNORECASE)]
        partes = [parte for parte in partes if parte]
        if len(partes) != 2:
            raise SystemExit(f"A sessão {sessao_id} tem discussão ilegível: {texto(colunas[1])!r}")
        periodo = texto(colunas[2])
        resultado = texto(colunas[3])
        if not periodo or not resultado:
            raise SystemExit(f"A sessão {sessao_id} tem votação sem período ou resultado.")
        sumula_url, sumula = ler_sumula(colunas[4], sessao_id)
        votacoes.append(
            {
                "documento": documento,
                "ementa": ementa,
                "discussao": partes[0],
                "quorum": partes[1],
                "periodo": periodo,
                "resultado": resultado,
                "tramitacao_id": tramitacao_id,
                "sumula_url": sumula_url,
                "votacao_id": None if sumula is None else sumula[0],
                "arquivo_id": None if sumula is None else sumula[1],
            }
        )
    return votacoes


def ler_sessao(pagina, sessao):
    titulo_html = TITULO.search(pagina)
    if titulo_html is None:
        raise SystemExit(f"A sessão {sessao['id']} não tem título.")
    titulo = texto(titulo_html.group(1))
    if titulo != sessao["titulo"]:
        raise SystemExit(
            f"A sessão {sessao['id']} mudou de título: lista {sessao['titulo']!r}, página {titulo!r}"
        )
    periodo = PERIODO_SESSAO.search(pagina)
    if periodo is None:
        raise SystemExit(f"A sessão {sessao['id']} não tem o período.")
    tabela_chamada, tabela_votacao = tabelas(pagina, sessao["id"])
    return {
        **sessao,
        "periodo": texto(periodo.group(1)),
        "chamadas": ler_chamadas(tabela_chamada, sessao["id"]),
        "votacoes": ler_votacoes(tabela_votacao, sessao["id"]),
    }


def obter_html(url, destino):
    time.sleep(PAUSA_SEGUNDOS)
    conteudo = baixar(url)
    pagina = html_texto(conteudo, url)
    gravar(destino, conteudo)
    return pagina


def main():
    BRONZE.mkdir(parents=True, exist_ok=True)
    lista_html = baixar(PAGINA)
    lista = html_texto(lista_html, PAGINA)
    gravar(BRONZE / "lista.html", lista_html)
    sessoes = listar(lista)

    itens = []
    for sessao in sessoes:
        destino_html = BRONZE / "sessoes" / f"{sessao['id']}.html"
        pagina = obter_html(sessao["url"], destino_html)
        ficha = ler_sessao(pagina, sessao)
        ficha["arquivo"] = f"sessoes/{sessao['id']}.html"
        ficha["bytes"] = destino_html.stat().st_size

        chamadas = []
        for chamada in ficha["chamadas"]:
            relativo = f"chamadas/{sessao['id']}/{chamada['arquivo_id']}.pdf"
            tamanho = garantir_pdf(chamada["url"], BRONZE / relativo)
            chamadas.append(
                {
                    "numero": chamada["numero"],
                    "periodo": chamada["periodo"],
                    "url": chamada["url"],
                    "arquivo": relativo,
                    "bytes": tamanho,
                }
            )
            print(f"sessão {sessao['id']} chamada {chamada['numero']} {tamanho}", flush=True)

        votacoes = []
        for votacao in ficha["votacoes"]:
            registro = {
                "documento": votacao["documento"],
                "ementa": votacao["ementa"],
                "discussao": votacao["discussao"],
                "quorum": votacao["quorum"],
                "periodo": votacao["periodo"],
                "resultado": votacao["resultado"],
                "tramitacao_id": votacao["tramitacao_id"],
                "sumula_url": votacao["sumula_url"],
                "arquivo": None,
                "bytes": None,
            }
            if votacao["sumula_url"]:
                relativo = f"sumulas/{votacao['votacao_id']}/{votacao['arquivo_id']}.pdf"
                registro["arquivo"] = relativo
                registro["bytes"] = garantir_pdf(votacao["sumula_url"], BRONZE / relativo)
            votacoes.append(registro)
        print(
            f"sessão {sessao['id']} {ficha['titulo']} "
            f"{len(chamadas)} chamadas {len(votacoes)} votações",
            flush=True,
        )
        itens.append(
            {
                "id": ficha["id"],
                "titulo": ficha["titulo"],
                "data": ficha["data"],
                "periodo": ficha["periodo"],
                "url": ficha["url"],
                "arquivo": ficha["arquivo"],
                "bytes": ficha["bytes"],
                "chamadas": chamadas,
                "votacoes": votacoes,
            }
        )

    metadados = {
        "tema": TEMA,
        "fonte": PAGINA,
        "coletado_em": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "sessoes": itens,
    }
    (BRONZE / "metadados.json").write_text(
        json.dumps(metadados, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(itens)} sessões em {BRONZE.relative_to(RAIZ_V2.parent)}", flush=True)


if __name__ == "__main__":
    main()
