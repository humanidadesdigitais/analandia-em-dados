"""Baixa os vereadores de Analândia e a votação nominal de 2024.

O JSON da lista e cada detalhe são gravados byte a byte.
O ZIP nacional de votos também entra inteiro na bronze.
Se a lista e o ZIP já estão na bronze, a coleta só busca os detalhes.
"""

import json
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

TEMA = "vereadores"
USER_AGENT = "analandia-em-dados"
PAUSA_SEGUNDOS = 1
MUNICIPIO = "61395"
CARGO = 13

URL_CANDIDATOS = (
    "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/"
    "2024/61395/2045202024/13/candidatos"
)
URL_VOTOS = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/"
    "votacao_candidato_munzona_2024.zip"
)
URL_DETALHE = (
    "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/"
    "2024/61395/2045202024/candidato/{identificador}"
)
ARQUIVO_JSON = "candidatos.json"
ARQUIVO_ZIP = "votacao_candidato_munzona_2024.zip"
CSV_SP = "votacao_candidato_munzona_2024_SP.csv"
ESPERADOS = 69

RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA


def baixar(url, destino):
    pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    espera = PAUSA_SEGUNDOS
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(pedido, timeout=120) as resposta, destino.open("wb") as saida:
                while True:
                    bloco = resposta.read(1024 * 1024)
                    if not bloco:
                        break
                    saida.write(bloco)
            return
        except urllib.error.HTTPError as erro:
            destino.unlink(missing_ok=True)
            if erro.code not in {429, 500, 502, 503, 504} or tentativa == 2:
                detalhe = erro.read().decode("utf-8", errors="replace")
                raise SystemExit(f"Falha em {url}: HTTP {erro.code} {detalhe}") from erro
        except urllib.error.URLError as erro:
            destino.unlink(missing_ok=True)
            if tentativa == 2:
                raise SystemExit(f"Falha em {url}: {erro.reason}") from erro
        except TimeoutError as erro:
            destino.unlink(missing_ok=True)
            if tentativa == 2:
                raise SystemExit(f"Falha em {url}: {erro}") from erro
        time.sleep(espera)
        espera *= 2
    raise SystemExit(f"Falha em {url}")


def validar_candidatos(caminho):
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as erro:
        raise SystemExit(f"A API não devolveu JSON: {erro}") from erro
    except UnicodeError as erro:
        raise SystemExit(f"A API não devolveu texto UTF-8: {erro}") from erro
    unidade = dados.get("unidadeEleitoral") or {}
    cargo = dados.get("cargo") or {}
    if str(unidade.get("codigo")) != MUNICIPIO or cargo.get("codigo") != CARGO:
        raise SystemExit(
            "A API não é Analândia, cargo vereador: "
            f"codigo={unidade.get('codigo')} cargo={cargo.get('codigo')}"
        )
    if not isinstance(dados.get("candidatos"), list) or not dados["candidatos"]:
        raise SystemExit("A API não trouxe candidatos.")


def classe(texto):
    normal = str(texto or "").strip().casefold()
    if normal.startswith("não eleito") or normal.startswith("nao eleito"):
        return "nao_eleito"
    if normal.startswith("eleito"):
        return "eleito"
    if normal.startswith("suplente"):
        return "suplente"
    return ""


def ids_do_cadastro(caminho):
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    ids = []
    for candidato in dados["candidatos"]:
        if not classe(candidato.get("descricaoTotalizacao")):
            continue
        ids.append(int(candidato["id"]))
    if len(ids) != ESPERADOS:
        raise SystemExit(f"A lista trouxe {len(ids)} candidatos no cadastro, e a coleta espera {ESPERADOS}.")
    return ids


def validar_detalhe(caminho, identificador):
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as erro:
        raise SystemExit(f"O detalhe {identificador} não é JSON: {erro}") from erro
    except UnicodeError as erro:
        raise SystemExit(f"O detalhe {identificador} não é UTF-8: {erro}") from erro
    cargo = dados.get("cargo") or {}
    if dados.get("id") != identificador or str(dados.get("ufCandidatura")) != MUNICIPIO or cargo.get("codigo") != CARGO:
        raise SystemExit(
            f"O detalhe {identificador} não é o candidato de Analândia: "
            f"id={dados.get('id')} uf={dados.get('ufCandidatura')} cargo={cargo.get('codigo')}"
        )


def validar_zip(caminho):
    try:
        with zipfile.ZipFile(caminho) as arquivo:
            nomes = arquivo.namelist()
    except zipfile.BadZipFile as erro:
        raise SystemExit(f"{caminho.name} não abriu como ZIP.") from erro
    if not any(Path(nome).name == CSV_SP for nome in nomes):
        lista = "\n".join(nomes)
        raise SystemExit(f"O ZIP não contém {CSV_SP}. Nomes dentro do arquivo:\n{lista}")


def garantir_fontes():
    json_caminho = BRONZE / ARQUIVO_JSON
    zip_caminho = BRONZE / ARQUIVO_ZIP
    if json_caminho.exists() and zip_caminho.exists():
        validar_candidatos(json_caminho)
        validar_zip(zip_caminho)
        return
    json_parcial = BRONZE / f"{ARQUIVO_JSON}.parcial"
    zip_parcial = BRONZE / f"{ARQUIVO_ZIP}.parcial"
    try:
        baixar(URL_CANDIDATOS, json_parcial)
        validar_candidatos(json_parcial)
        time.sleep(PAUSA_SEGUNDOS)
        baixar(URL_VOTOS, zip_parcial)
        validar_zip(zip_parcial)
        json_parcial.replace(json_caminho)
        zip_parcial.replace(zip_caminho)
    except BaseException:
        json_parcial.unlink(missing_ok=True)
        zip_parcial.unlink(missing_ok=True)
        raise


def baixar_detalhes(ids):
    pasta = BRONZE / "detalhes"
    pasta.mkdir(parents=True, exist_ok=True)
    for identificador in ids:
        destino = pasta / f"{identificador}.json"
        if destino.exists():
            validar_detalhe(destino, identificador)
            continue
        parcial = pasta / f"{identificador}.json.parcial"
        url = URL_DETALHE.format(identificador=identificador)
        try:
            time.sleep(PAUSA_SEGUNDOS)
            baixar(url, parcial)
            validar_detalhe(parcial, identificador)
            parcial.replace(destino)
        except BaseException:
            parcial.unlink(missing_ok=True)
            raise
        print(f"detalhes/{destino.name} {destino.stat().st_size}")


def main():
    BRONZE.mkdir(parents=True, exist_ok=True)
    garantir_fontes()
    ids = ids_do_cadastro(BRONZE / ARQUIVO_JSON)
    baixar_detalhes(ids)

    itens = []
    for arquivo, url in ((ARQUIVO_JSON, URL_CANDIDATOS), (ARQUIVO_ZIP, URL_VOTOS)):
        destino = BRONZE / arquivo
        itens.append({"arquivo": arquivo, "url": url, "bytes": destino.stat().st_size})
        print(f"{arquivo} {itens[-1]['bytes']}")
    for identificador in ids:
        arquivo = f"detalhes/{identificador}.json"
        destino = BRONZE / arquivo
        itens.append({
            "arquivo": arquivo,
            "url": URL_DETALHE.format(identificador=identificador),
            "bytes": destino.stat().st_size,
        })

    metadados = {
        "tema": TEMA,
        "coletado_em": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "itens": itens,
    }
    (BRONZE / "metadados.json").write_text(
        json.dumps(metadados, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(itens)} arquivos em {BRONZE.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
