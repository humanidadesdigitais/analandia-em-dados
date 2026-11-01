"""Calcula indicadores do calendário das sessões para a gold."""

import json
from datetime import date
from pathlib import Path

TEMA = "calendario-das-sessoes"
RAIZ_V2 = Path(__file__).resolve().parents[2]
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "calendario.json"
GOLD = RAIZ_V2 / "dados" / "gold" / TEMA / "indicadores.json"

MESES = [
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
]


def dias_inclusive(inicio, fim):
    return (date.fromisoformat(fim) - date.fromisoformat(inicio)).days + 1


def agregar(calendario):
    por_ano = []
    por_mes = [{"mes": numero, "nome": MESES[numero - 1], "sessoes": 0} for numero in range(1, 13)]
    for ano in calendario["anos"]:
        primeiro = 0
        segundo = 0
        for sessao in ano["sessoes"]:
            quando = date.fromisoformat(sessao)
            por_mes[quando.month - 1]["sessoes"] += 1
            if quando.month <= 6:
                primeiro += 1
            else:
                segundo += 1
        por_ano.append(
            {
                "exercicio": ano["exercicio"],
                "sessoes": len(ano["sessoes"]),
                "dias_recesso": sum(dias_inclusive(item["inicio"], item["fim"]) for item in ano["recessos"]),
                "primeiro_semestre": primeiro,
                "segundo_semestre": segundo,
            }
        )
    return {
        "tema": TEMA,
        "por_ano": por_ano,
        "por_mes": por_mes,
    }


def main():
    calendario = json.loads(SILVER.read_text(encoding="utf-8"))
    indicadores = agregar(calendario)
    GOLD.parent.mkdir(parents=True, exist_ok=True)
    GOLD.write_text(json.dumps(indicadores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(indicadores['por_ano'])} anos em {GOLD.relative_to(RAIZ_V2.parent)}")


if __name__ == "__main__":
    main()
