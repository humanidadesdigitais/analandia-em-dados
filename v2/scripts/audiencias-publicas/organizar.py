"""Organiza a lista de audiências públicas na silver.

Os PDFs são digitalizações. Cada registro usa o título, a data e o exercício
que a página da Câmara publica.
"""

import json
import re
from pathlib import Path

TEMA = "audiencias-publicas"
RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA / "metadados.json"
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "audiencias.json"


def tipo_de(titulo):
    if re.search(r"convite", titulo, re.IGNORECASE):
        return "convite"
    if re.search(r"\bata\b", titulo, re.IGNORECASE):
        return "ata"
    raise SystemExit(f"O título não diz se é convite ou ata: {titulo}")


def peca_de(titulo):
    if re.search(r"PPA", titulo, re.IGNORECASE):
        return "PPA"
    if re.search(r"LOA|orçament", titulo, re.IGNORECASE):
        return "LOA"
    if re.search(r"LDO", titulo, re.IGNORECASE):
        return "LDO"
    return None


def registro(item):
    return {
        "exercicio": item["exercicio"],
        "tipo": tipo_de(item["titulo"]),
        "peca": peca_de(item["titulo"]),
        "data_documento": item["data_documento"],
        "titulo": item["titulo"],
        "origem": {
            "arquivo": item["arquivo"],
            "url": item["url"],
        },
    }


def main():
    metadados = json.loads(BRONZE.read_text(encoding="utf-8"))
    audiencias = [registro(item) for item in metadados["itens"]]
    audiencias.sort(key=lambda item: (item["exercicio"], item["data_documento"], item["origem"]["arquivo"]))
    SILVER.parent.mkdir(parents=True, exist_ok=True)
    SILVER.write_text(
        json.dumps({"tema": TEMA, "audiencias": audiencias}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(audiencias)} audiências em {SILVER.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
