"""Lê cada PDF de chamada e grava a presença na silver.

O JSON lido fica ao lado do PDF, em chamadas/{sessao}/{arquivo}.json.
A silver cruza o nome com o cadastro só quando o vínculo é único.
"""

import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader

TEMA = "sessoes-plenarias"
RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "chamadas.json"
CADASTRO = RAIZ_V2 / "dados" / "silver" / "vereadores" / "cadastro.json"

NOME = re.compile(r"^(.+) \(([^)]+)\)$")
DATA = re.compile(r"^(\d{2})/(\d{2})/(\d{4})$")


def normalizar(texto):
    base = unicodedata.normalize("NFD", texto)
    sem_acento = "".join(letra for letra in base if unicodedata.category(letra) != "Mn")
    return re.sub(r"\s+", " ", sem_acento).upper().strip()


def palavras(caminho):
    leitor = PdfReader(caminho)
    achados = []

    def visitar(texto, cm, tm, fonte, tamanho):
        if texto and texto.strip():
            achados.append((tm[5], tm[4], texto.strip()))

    for pagina in leitor.pages:
        pagina.extract_text(visitor_text=visitar)
    if not achados:
        raise SystemExit(f"{caminho.name} não tem texto.")
    return achados


def titulo_do_pdf(itens, arquivo):
    titulos = [texto for _y, x, texto in itens if x < 200 and texto.startswith("Sessão")]
    if len(titulos) != 1:
        raise SystemExit(f"{arquivo} não tem um único título de sessão: {titulos}")
    return titulos[0]


def presencas_do_pdf(itens, arquivo):
    cabecalhos = [(y, x, texto) for y, x, texto in itens if texto == "Vereador"]
    presencas = [(y, x, texto) for y, x, texto in itens if texto == "Presença"]
    if len(cabecalhos) != 1 or len(presencas) != 1:
        raise SystemExit(f"{arquivo} não tem as colunas Vereador e Presença.")
    y_cabecalho = cabecalhos[0][0]
    x_presenca = presencas[0][1]
    abaixo = [(y, x, texto) for y, x, texto in itens if y < y_cabecalho - 5]
    grupos = []
    for y, x, texto in sorted(abaixo, key=lambda item: -item[0]):
        if grupos and abs(grupos[-1][0][0] - y) <= 2:
            grupos[-1].append((y, x, texto))
        else:
            grupos.append([(y, x, texto)])

    linhas = []
    for grupo in grupos:
        nomes = [texto for _y, x, texto in sorted(grupo, key=lambda item: item[1]) if x < x_presenca - 30]
        marcas = [texto for _y, x, texto in grupo if x >= x_presenca - 30]
        nome = " ".join(nomes).strip()
        if len(marcas) != 1 or not nome:
            raise SystemExit(f"{arquivo} tem linha de presença ilegível: {nome!r} {marcas}")
        forma = NOME.fullmatch(nome)
        if forma is None:
            raise SystemExit(f"{arquivo} tem nome fora do padrão: {nome!r}")
        linhas.append(
            {
                "nome": forma.group(1),
                "sigla": forma.group(2),
                "presenca": marcas[0],
            }
        )
    if not linhas:
        raise SystemExit(f"{arquivo} não trouxe presenças.")
    return linhas


def data_realizada(itens, arquivo, data_lista):
    rotulos = [item for item in itens if item[2] == "Realizada em:"]
    if len(rotulos) != 1:
        raise SystemExit(f"{arquivo} não tem “Realizada em:”.")
    y_rotulo = rotulos[0][0]
    datas = []
    for y, _x, texto in itens:
        forma = DATA.fullmatch(texto)
        if forma and abs(y - y_rotulo) <= 3:
            datas.append(forma)
    if len(datas) != 1:
        raise SystemExit(f"{arquivo} não tem uma data ao lado de “Realizada em:”.")
    dia, mes, ano = datas[0].groups()
    iso = f"{ano}-{mes}-{dia}"
    dia_lista = datetime.strptime(data_lista, "%d/%m/%Y %H:%M").date().isoformat()
    if iso != dia_lista:
        raise SystemExit(f"{arquivo} diverge do dia publicado: PDF {iso}, lista {dia_lista}")
    return iso


def ler_pdf(caminho, titulo_esperado, data_lista):
    itens = palavras(caminho)
    titulo = titulo_do_pdf(itens, caminho.name)
    if titulo != titulo_esperado:
        raise SystemExit(
            f"{caminho.name} diverge do título publicado: PDF {titulo!r}, lista {titulo_esperado!r}"
        )
    return {
        "titulo": titulo,
        "realizada_em": data_realizada(itens, caminho.name, data_lista),
        "presencas": presencas_do_pdf(itens, caminho.name),
    }


def gravar_leitura(pdf, leitura):
    destino = pdf.with_suffix(".json")
    destino.write_text(
        json.dumps(leitura, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return destino


def indice_cadastro():
    dados = json.loads(CADASTRO.read_text(encoding="utf-8"))
    return [
        (vereador["nome_completo"], set(normalizar(vereador["nome_completo"]).split()))
        for vereador in dados["vereadores"]
    ]


def nome_completo(nome, pessoas, arquivo):
    tokens = set(normalizar(nome).split())
    achados = [completo for completo, alvo in pessoas if tokens <= alvo]
    if len(achados) > 1:
        raise SystemExit(f"{arquivo} liga {nome!r} a mais de um cadastro: {achados}")
    if not achados:
        return None
    return achados[0]


def chave(chamada, data):
    return datetime.strptime(data, "%d/%m/%Y %H:%M"), chamada["numero"]


def main():
    metadados = json.loads((BRONZE / "metadados.json").read_text(encoding="utf-8"))
    pessoas = indice_cadastro()
    chamadas = []
    for sessao in metadados["sessoes"]:
        for chamada in sessao["chamadas"]:
            pdf = BRONZE / chamada["arquivo"]
            leitura = ler_pdf(pdf, sessao["titulo"], sessao["data"])
            gravar_leitura(pdf, leitura)
            presencas = []
            for linha in leitura["presencas"]:
                presencas.append(
                    {
                        **linha,
                        "nome_completo": nome_completo(linha["nome"], pessoas, pdf.name),
                    }
                )
            chamadas.append(
                {
                    "sessao_id": sessao["id"],
                    "titulo": sessao["titulo"],
                    "data": sessao["data"],
                    "realizada_em": leitura["realizada_em"],
                    "numero": chamada["numero"],
                    "periodo": chamada["periodo"],
                    "origem": {
                        "arquivo": chamada["arquivo"],
                        "url": chamada["url"],
                    },
                    "presencas": presencas,
                }
            )

    chamadas.sort(key=lambda item: chave(item, item["data"]))
    SILVER.parent.mkdir(parents=True, exist_ok=True)
    SILVER.write_text(
        json.dumps({"tema": TEMA, "chamadas": chamadas}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(chamadas)} chamadas em {SILVER.relative_to(RAIZ_V2.parent)}", flush=True)


if __name__ == "__main__":
    main()
