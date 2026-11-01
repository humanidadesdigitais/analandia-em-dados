"""Calcula os indicadores dos vereadores para a gold.

Sexo e partido contam o cadastro inteiro. A totalização e os votos
contam só os eleitos.
"""

import json
from pathlib import Path

TEMA = "vereadores"
RAIZ_V2 = Path(__file__).resolve().parents[2]
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "cadastro.json"
GOLD = RAIZ_V2 / "dados" / "gold" / TEMA / "indicadores.json"
CADASTRO = 69
ELEITOS = 9
SEXO = {"MASC.": "Homens", "FEM.": "Mulheres"}
TOTALIZACAO = ("Eleito por QP", "Eleito por média")


def classe(texto):
    normal = str(texto or "").strip().casefold()
    if normal.startswith("não eleito") or normal.startswith("nao eleito"):
        return "nao_eleito"
    if normal.startswith("eleito"):
        return "eleito"
    if normal.startswith("suplente"):
        return "suplente"
    return ""


def agregar(vereadores):
    if len(vereadores) != CADASTRO:
        raise SystemExit(f"O cadastro tem {len(vereadores)} pessoas, e os indicadores esperam {CADASTRO}.")
    sexo = {rotulo: 0 for rotulo in SEXO.values()}
    partidos = {}
    totalizacao = {rotulo: 0 for rotulo in TOTALIZACAO}
    votos = []
    for pessoa in vereadores:
        quem = pessoa.get("nome_urna") or pessoa.get("numero")
        bruto = str(pessoa.get("sexo") or "").strip()
        if bruto not in SEXO:
            raise SystemExit(f"{quem}: sexo desconhecido ({bruto}).")
        sexo[SEXO[bruto]] += 1
        sigla = str(pessoa.get("partido") or "").strip()
        if not sigla:
            raise SystemExit(f"{quem} não tem partido.")
        partidos[sigla] = partidos.get(sigla, 0) + 1
        if classe(pessoa.get("totalizacao")) != "eleito":
            continue
        rotulo = str(pessoa.get("totalizacao") or "").strip()
        if rotulo not in totalizacao:
            raise SystemExit(f"{quem}: totalização de eleito desconhecida ({rotulo}).")
        if pessoa.get("votos_nominais") is None:
            raise SystemExit(f"{quem} é eleito e não tem votos nominais.")
        totalizacao[rotulo] += 1
        votos.append({"nome_urna": pessoa["nome_urna"], "votos_nominais": pessoa["votos_nominais"]})
    if len(votos) != ELEITOS:
        raise SystemExit(f"Há {len(votos)} eleitos, e os indicadores esperam {ELEITOS}.")
    votos.sort(key=lambda item: -item["votos_nominais"])
    return {
        "tema": TEMA,
        "sexo": [{"rotulo": rotulo, "quantidade": sexo[rotulo]} for rotulo in SEXO.values()],
        "partidos": [
            {"partido": sigla, "quantidade": quantidade}
            for sigla, quantidade in sorted(partidos.items(), key=lambda item: (-item[1], item[0]))
        ],
        "totalizacao_eleitos": [
            {"rotulo": rotulo, "quantidade": totalizacao[rotulo]} for rotulo in TOTALIZACAO
        ],
        "votos_eleitos": votos,
    }


def main():
    lido = json.loads(SILVER.read_text(encoding="utf-8"))
    indicadores = agregar(lido["vereadores"])
    GOLD.parent.mkdir(parents=True, exist_ok=True)
    GOLD.write_text(json.dumps(indicadores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"{sum(item['quantidade'] for item in indicadores['sexo'])} pessoas em "
        f"{GOLD.relative_to(RAIZ_V2.parent)}"
    )


if __name__ == "__main__":
    main()
