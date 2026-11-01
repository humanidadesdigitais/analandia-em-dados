"""Coleta o cadastro e os diários oficiais de Analândia no Querido Diário.

A documentação do projeto está em
https://docs.queridodiario.ok.org.br/pt-br/latest/index.html
A API pública pede bom senso: cerca de 60 requisições por minuto.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://api.queridodiario.org.br"
DOCUMENTACAO = "https://docs.queridodiario.ok.org.br/pt-br/latest/index.html"
TERRITORIO_ID = "3502002"
TAMANHO_PAGINA = 100
PAUSA_SEGUNDOS = 1
USER_AGENT = "analandia-em-dados"

RAIZ = Path(__file__).resolve().parents[3]
BRUTO = RAIZ / "dados" / "bruto" / "querido_diario" / "analandia.json"
ORGANIZADO = RAIZ / "dados" / "organizado" / "cidade.json"


def obter(caminho, parametros):
    consulta = urllib.parse.urlencode(parametros)
    url = f"{API}{caminho}?{consulta}" if consulta else f"{API}{caminho}"
    pedido = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    espera = PAUSA_SEGUNDOS
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(pedido, timeout=60) as resposta:
                return json.load(resposta)
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


def texto_ou_nulo(valor):
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def coletar_diarios():
    diarios = []
    paginas = []
    deslocamento = 0
    total = 0
    while True:
        if deslocamento:
            time.sleep(PAUSA_SEGUNDOS)
        pagina = obter(
            "/gazettes",
            {
                "territory_ids": TERRITORIO_ID,
                "size": TAMANHO_PAGINA,
                "offset": deslocamento,
                "sort_by": "ascending_date",
            },
        )
        paginas.append(pagina)
        lote = pagina.get("gazettes") or []
        total = pagina.get("total_gazettes") or 0
        diarios.extend(lote)
        deslocamento += len(lote)
        if not lote or deslocamento >= total:
            break
    if len(diarios) != total:
        raise SystemExit(
            f"A API informou {total} diários e devolveu {len(diarios)}."
        )
    return total, diarios, paginas


def organizar_diario(diario):
    return {
        "data": diario.get("date"),
        "edicao": texto_ou_nulo(diario.get("edition")),
        "edicao_extra": diario.get("is_extra_edition"),
        "url": texto_ou_nulo(diario.get("url")),
        "url_texto": texto_ou_nulo(diario.get("txt_url")),
        "coletado_pela_fonte_em": diario.get("scraped_at"),
    }


def gravar_json(caminho, conteudo):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(
        json.dumps(conteudo, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    coletado_em = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    resposta_cidade = obter(f"/cities/{TERRITORIO_ID}", {})
    cidade = resposta_cidade.get("city") or {}
    if cidade.get("territory_id") != TERRITORIO_ID:
        raise SystemExit("A API não devolveu Analândia para o código IBGE 3502002.")

    total, diarios, paginas = coletar_diarios()
    gravar_json(
        BRUTO,
        {
            "fonte": API,
            "territorio_id": TERRITORIO_ID,
            "coletado_em": coletado_em,
            "cidade": resposta_cidade,
            "diarios": {"total_gazettes": total, "paginas": paginas},
        },
    )

    if ORGANIZADO.exists():
        organizado = json.loads(ORGANIZADO.read_text(encoding="utf-8"))
    else:
        organizado = {}
    municipio = organizado.setdefault("municipio", {})
    municipio.update(
        {
            "nome": cidade.get("territory_name"),
            "codigo_ibge": cidade.get("territory_id"),
            "uf": cidade.get("state_code"),
        }
    )
    fontes = organizado.setdefault("fontes", {})
    fontes["querido_diario"] = {
        "nome": "Querido Diário",
        "documentacao": DOCUMENTACAO,
        "api": API,
        "coletado_em": coletado_em,
        "territorio": {
            "codigo_ibge": cidade.get("territory_id"),
            "nome": cidade.get("territory_name"),
            "uf": cidade.get("state_code"),
            "nivel": texto_ou_nulo(cidade.get("level")),
            "disponivel_desde": texto_ou_nulo(cidade.get("availability_date")),
            "urls_publicacao": cidade.get("publication_urls") or [],
        },
        "total_diarios": total,
        "diarios": [organizar_diario(diario) for diario in diarios],
    }
    gravar_json(ORGANIZADO, organizado)
    print(f"{cidade.get('territory_name')}: {total} diários")
    print(f"bruto: {BRUTO.relative_to(RAIZ)}")
    print(f"organizado: {ORGANIZADO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
