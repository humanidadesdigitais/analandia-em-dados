"""Calcula indicadores das audiências públicas para a gold."""

import json
from pathlib import Path

TEMA = "audiencias-publicas"
RAIZ_V2 = Path(__file__).resolve().parents[2]
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "audiencias.json"
GOLD = RAIZ_V2 / "dados" / "gold" / TEMA / "indicadores.json"

PECAS = ("LDO", "LOA", "PPA")
CHAVES = (*PECAS, "sem_peca")


def chave_peca(peca):
    if peca in PECAS:
        return peca
    if peca is None:
        return "sem_peca"
    raise SystemExit(f"Peça desconhecida: {peca}")


def contagem():
    return {chave: 0 for chave in CHAVES}


def agregar(audiencias):
    por_exercicio = {}
    por_peca = {peca: 0 for peca in PECAS}
    sem_peca = 0
    composicao = {}
    for item in audiencias:
        ano = por_exercicio.setdefault(
            item["exercicio"],
            {"exercicio": item["exercicio"], "documentos": 0, "convites": 0, "atas": 0},
        )
        ano["documentos"] += 1
        if item["tipo"] == "convite":
            ano["convites"] += 1
            lado = "convites"
        elif item["tipo"] == "ata":
            ano["atas"] += 1
            lado = "atas"
        else:
            raise SystemExit(f"Tipo desconhecido: {item['tipo']}")
        chave = chave_peca(item["peca"])
        if chave == "sem_peca":
            sem_peca += 1
        else:
            por_peca[chave] += 1
        partes = composicao.setdefault(
            item["exercicio"],
            {"exercicio": item["exercicio"], "convites": contagem(), "atas": contagem()},
        )
        partes[lado][chave] += 1
    return {
        "tema": TEMA,
        "por_exercicio": [por_exercicio[ano] for ano in sorted(por_exercicio)],
        "por_peca": [{"peca": peca, "documentos": por_peca[peca]} for peca in PECAS]
        + [{"peca": None, "documentos": sem_peca}],
        "composicao": [composicao[ano] for ano in sorted(composicao)],
    }


def main():
    lido = json.loads(SILVER.read_text(encoding="utf-8"))
    indicadores = agregar(lido["audiencias"])
    GOLD.parent.mkdir(parents=True, exist_ok=True)
    GOLD.write_text(json.dumps(indicadores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(indicadores['por_exercicio'])} exercícios em {GOLD.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
