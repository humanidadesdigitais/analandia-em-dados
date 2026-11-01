"""Monta o cadastro dos candidatos a vereador em Analândia.

Entram eleitos, suplentes e não eleitos. A lista é unida aos votos
nominais do CSV e ao sexo publicado no detalhe. CPF e título ficam
só na bronze.
"""

import csv
import io
import json
import zipfile
from pathlib import Path

TEMA = "vereadores"
MUNICIPIO = 61395
CARGO = 13
CSV_SP = "votacao_candidato_munzona_2024_SP.csv"
COLUNAS = (
    "CD_MUNICIPIO",
    "CD_CARGO",
    "SQ_CANDIDATO",
    "NR_CANDIDATO",
    "SG_PARTIDO",
    "DS_SIT_TOT_TURNO",
    "QT_VOTOS_NOMINAIS",
)

RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "cadastro.json"


def classe(texto):
    normal = texto.strip().casefold()
    if normal.startswith("não eleito") or normal.startswith("nao eleito"):
        return "nao_eleito"
    if normal.startswith("eleito"):
        return "eleito"
    if normal.startswith("suplente"):
        return "suplente"
    return ""


def inteiro(valor, campo, quem):
    try:
        return int(str(valor).strip())
    except (TypeError, ValueError) as erro:
        raise SystemExit(f"{quem}: {campo} não é número ({valor})") from erro


def membro_sp(arquivo):
    nomes = arquivo.namelist()
    achados = [nome for nome in nomes if Path(nome).name == CSV_SP]
    if len(achados) != 1:
        lista = "\n".join(nomes)
        raise SystemExit(f"O ZIP não contém um único {CSV_SP}. Nomes dentro do arquivo:\n{lista}")
    return achados[0]


def votos_de_analandia(caminho_zip):
    try:
        arquivo = zipfile.ZipFile(caminho_zip)
    except zipfile.BadZipFile as erro:
        raise SystemExit(f"{caminho_zip.name} não abriu como ZIP.") from erro
    with arquivo:
        with arquivo.open(membro_sp(arquivo)) as bruto:
            texto = io.TextIOWrapper(bruto, encoding="latin-1", newline="")
            leitor = csv.DictReader(texto, delimiter=";")
            faltando = [coluna for coluna in COLUNAS if coluna not in (leitor.fieldnames or [])]
            if faltando:
                raise SystemExit(f"O CSV não tem as colunas {', '.join(faltando)}.")
            por_candidato = {}
            for linha in leitor:
                if inteiro(linha["CD_MUNICIPIO"], "CD_MUNICIPIO", "linha") != MUNICIPIO:
                    continue
                if inteiro(linha["CD_CARGO"], "CD_CARGO", "linha") != CARGO:
                    continue
                chave = inteiro(linha["SQ_CANDIDATO"], "SQ_CANDIDATO", "linha")
                registro = por_candidato.setdefault(
                    chave,
                    {
                        "numero": inteiro(linha["NR_CANDIDATO"], "NR_CANDIDATO", chave),
                        "partido": linha["SG_PARTIDO"].strip(),
                        "totalizacao": linha["DS_SIT_TOT_TURNO"].strip(),
                        "votos": 0,
                    },
                )
                numero = inteiro(linha["NR_CANDIDATO"], "NR_CANDIDATO", chave)
                partido = linha["SG_PARTIDO"].strip()
                totalizacao = linha["DS_SIT_TOT_TURNO"].strip()
                if numero != registro["numero"] or partido != registro["partido"]:
                    raise SystemExit(f"O candidato {chave} muda de número ou partido entre zonas.")
                if totalizacao != registro["totalizacao"]:
                    raise SystemExit(f"O candidato {chave} muda de totalização entre zonas.")
                registro["votos"] += inteiro(linha["QT_VOTOS_NOMINAIS"], "QT_VOTOS_NOMINAIS", chave)
    return por_candidato


def sexo_publicado(identificador, quem):
    caminho = BRONZE / "detalhes" / f"{identificador}.json"
    if not caminho.exists():
        raise SystemExit(f"{quem} não tem detalhe na bronze.")
    try:
        detalhe = json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as erro:
        raise SystemExit(f"{quem}: o detalhe não é JSON ({erro}).") from erro
    if detalhe.get("id") != identificador:
        raise SystemExit(f"{quem}: o detalhe é de outro id ({detalhe.get('id')}).")
    sexo = str(detalhe.get("descricaoSexo") or "").strip()
    if not sexo:
        raise SystemExit(f"{quem} não tem descricaoSexo no detalhe.")
    return sexo


def url_de(metadados, arquivo):
    for item in metadados["itens"]:
        if item["arquivo"] == arquivo:
            return item["url"]
    raise SystemExit(f"metadados.json não aponta {arquivo}.")


def main():
    metadados = json.loads((BRONZE / "metadados.json").read_text(encoding="utf-8"))
    candidatos = json.loads((BRONZE / "candidatos.json").read_text(encoding="utf-8"))
    votos = votos_de_analandia(BRONZE / "votacao_candidato_munzona_2024.zip")
    origem = {
        "candidatos": url_de(metadados, "candidatos.json"),
        "votos": url_de(metadados, "votacao_candidato_munzona_2024.zip"),
    }
    vereadores = []
    for candidato in candidatos["candidatos"]:
        totalizacao = str(candidato.get("descricaoTotalizacao") or "").strip()
        if not classe(totalizacao):
            continue
        chave = inteiro(candidato.get("id"), "id", candidato.get("nomeUrna"))
        apurado = votos.get(chave)
        quem = candidato.get("nomeUrna") or chave
        numero = inteiro(candidato.get("numero"), "numero", quem)
        partido = str((candidato.get("partido") or {}).get("sigla") or "").strip()
        votos_nominais = None
        if apurado is not None:
            if classe(totalizacao) != classe(apurado["totalizacao"]):
                raise SystemExit(f"{quem} está {totalizacao} na API e {apurado['totalizacao']} no CSV.")
            if numero != apurado["numero"] or partido != apurado["partido"]:
                raise SystemExit(
                    f"{quem} diverge entre as fontes: "
                    f"API {numero} {partido}, CSV {apurado['numero']} {apurado['partido']}."
                )
            votos_nominais = apurado["votos"]
        vereadores.append(
            {
                "nome_urna": candidato.get("nomeUrna"),
                "nome_completo": candidato.get("nomeCompleto"),
                "numero": numero,
                "partido": partido,
                "sexo": sexo_publicado(chave, quem),
                "totalizacao": totalizacao,
                "votos_nominais": votos_nominais,
                "origem": origem,
            }
        )
    if not vereadores:
        raise SystemExit("A API não trouxe eleitos, suplentes nem não eleitos.")
    vereadores.sort(key=lambda item: (item["votos_nominais"] is None, -(item["votos_nominais"] or 0), item["numero"]))
    SILVER.parent.mkdir(parents=True, exist_ok=True)
    SILVER.write_text(
        json.dumps({"tema": TEMA, "vereadores": vereadores}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(vereadores)} vereadores em {SILVER.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
