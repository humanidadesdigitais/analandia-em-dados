"""Lê cada PDF de súmula e grava a votação na silver.

O JSON lido fica ao lado do PDF, em sumulas/{votacao}/{arquivo}.json.
A silver cruza o nome com o cadastro só quando o vínculo é único.
Súmula sem texto fica com os campos vazios e sem votos.
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
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA / "sumulas.json"
CADASTRO = RAIZ_V2 / "dados" / "silver" / "vereadores" / "cadastro.json"

NOME = re.compile(r"^(.+) \(([^)]+)\)$")
DATA = re.compile(r"^(\d{2})/(\d{2})/(\d{4})$")
ATA = re.compile(r"^ata\b", re.IGNORECASE)
NUMERO_ATA = re.compile(r"N[ºo°]\s*(\d+)\s*[/-]\s*(\d+)")
COLUNAS = ("Favorável", "Contrário", "Abstenção")


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
    return achados


def rotulo(itens, nome, arquivo):
    achados = [item for item in itens if item[2] == nome]
    if len(achados) != 1:
        raise SystemExit(f"{arquivo} não tem um único “{nome}”.")
    return achados[0]


def ao_lado(itens, alvo, arquivo, limite=None):
    y_alvo, x_alvo, _texto = alvo
    partes = []
    for y, x, texto in sorted(itens, key=lambda item: item[1]):
        if abs(y - y_alvo) > 3 or x <= x_alvo + 5:
            continue
        if limite is not None and x >= limite - 5:
            continue
        partes.append(texto)
    return " ".join(partes).strip()


def campo(texto):
    if not texto or set(texto) <= set("_-. "):
        return None
    return texto


def numero_ata(documento):
    if documento is None or ATA.match(documento) is None:
        return None
    achado = NUMERO_ATA.search(documento)
    if achado is None:
        return None
    return f"{achado.group(1)}/{achado.group(2)}"


def documento_publicado(itens, arquivo):
    autor = rotulo(itens, "Autor(es):", arquivo)
    votacao = rotulo(itens, "Votação:", arquivo)
    meio = [
        (y, x, texto)
        for y, x, texto in itens
        if y < autor[0] - 5 and y > votacao[0] + 5 and x < 80
    ]
    linhas = []
    for y, x, texto in sorted(meio, key=lambda item: -item[0]):
        if linhas and abs(linhas[-1][0][0] - y) <= 2:
            linhas[-1].append((y, x, texto))
        else:
            linhas.append([(y, x, texto)])
    if not linhas:
        raise SystemExit(f"{arquivo} não tem a matéria publicada.")
    primeira = linhas[0]
    return " ".join(texto for _y, _x, texto in sorted(primeira, key=lambda item: item[1])).strip()


def data_realizada(itens, arquivo, data_lista):
    alvo = rotulo(itens, "Realizada em:", arquivo)
    texto = ao_lado(itens, alvo, arquivo)
    forma = DATA.fullmatch(texto)
    if forma is None:
        raise SystemExit(f"{arquivo} não tem uma data ao lado de “Realizada em:”.")
    dia, mes, ano = forma.groups()
    iso = f"{ano}-{mes}-{dia}"
    dia_lista = datetime.strptime(data_lista, "%d/%m/%Y %H:%M").date().isoformat()
    if iso != dia_lista:
        raise SystemExit(f"{arquivo} diverge do dia publicado: PDF {iso}, lista {dia_lista}")
    return iso


def separar_papel(nome):
    if nome.endswith(" - Presidente"):
        return nome[: -len(" - Presidente")].strip(), "Presidente"
    if nome.endswith(" -"):
        return nome[:-2].strip(), "Presidente"
    return nome, None


def votos_do_pdf(itens, arquivo):
    cabecalhos = {nome: rotulo(itens, nome, arquivo) for nome in COLUNAS}
    xs = {nome: item[1] for nome, item in cabecalhos.items()}
    y_cabecalho = cabecalhos["Favorável"][0]
    limite = min(xs.values()) - 20
    abaixo = [item for item in itens if item[0] < y_cabecalho - 5]
    grupos = []
    for item in sorted(abaixo, key=lambda atual: -atual[0]):
        if grupos and abs(grupos[-1][0][0] - item[0]) <= 2:
            grupos[-1].append(item)
        else:
            grupos.append([item])

    votos = []
    totais = None
    for grupo in grupos:
        if any(texto == "TOTAL" for _y, _x, texto in grupo):
            totais = []
            for nome in COLUNAS:
                numeros = [
                    (abs(x - xs[nome]), texto)
                    for _y, x, texto in grupo
                    if texto.isdigit()
                ]
                if not numeros:
                    raise SystemExit(f"{arquivo} não tem o total de {nome}.")
                totais.append(int(min(numeros)[1]))
            break
        nomes = [texto for _y, x, texto in sorted(grupo, key=lambda item: item[1]) if x < limite]
        marcas = [(x, texto) for _y, x, texto in grupo if x >= limite]
        if not nomes and not marcas:
            continue
        if any(texto != "X" for _x, texto in marcas) or len(marcas) > 1:
            raise SystemExit(f"{arquivo} tem marca de voto ilegível: {nomes} {marcas}")
        bruto = " ".join(nomes).strip()
        nome, papel = separar_papel(bruto)
        forma = NOME.fullmatch(nome)
        if forma is None:
            raise SystemExit(f"{arquivo} tem nome fora do padrão: {bruto!r}")
        voto = None
        if marcas:
            x_marca = marcas[0][0]
            distancias = sorted((abs(x - x_marca), coluna) for coluna, x in xs.items())
            if len(distancias) > 1 and distancias[0][0] == distancias[1][0]:
                raise SystemExit(f"{arquivo} tem X entre duas colunas: {nome}")
            voto = distancias[0][1]
        votos.append(
            {
                "nome": forma.group(1),
                "sigla": forma.group(2),
                "papel": papel,
                "voto": voto,
            }
        )
    if totais is None:
        raise SystemExit(f"{arquivo} não tem a linha TOTAL.")
    contagem = [sum(1 for linha in votos if linha["voto"] == coluna) for coluna in COLUNAS]
    if contagem != totais:
        raise SystemExit(f"{arquivo} diverge do TOTAL: marcas {contagem}, linha {totais}")
    if not votos:
        raise SystemExit(f"{arquivo} não trouxe votos.")
    return votos


def leitura_vazia():
    return {
        "realizada_em": None,
        "presidente": None,
        "primeiro_secretario": None,
        "segundo_secretario": None,
        "documento": None,
        "numero_ata": None,
        "tipo_votacao": None,
        "resultado": None,
        "votos": [],
    }


def ler_pdf(caminho, data_lista):
    itens = palavras(caminho)
    if not itens:
        return leitura_vazia()
    documento = campo(documento_publicado(itens, caminho.name))
    resultado_rotulo = rotulo(itens, "Resultado:", caminho.name)
    return {
        "realizada_em": data_realizada(itens, caminho.name, data_lista),
        "presidente": campo(ao_lado(itens, rotulo(itens, "Presidente:", caminho.name), caminho.name)),
        "primeiro_secretario": campo(ao_lado(itens, rotulo(itens, "1º Sec.:", caminho.name), caminho.name)),
        "segundo_secretario": campo(ao_lado(itens, rotulo(itens, "2º Sec.:", caminho.name), caminho.name)),
        "documento": documento,
        "numero_ata": numero_ata(documento),
        "tipo_votacao": campo(
            ao_lado(itens, rotulo(itens, "Votação:", caminho.name), caminho.name, resultado_rotulo[1])
        ),
        "resultado": campo(ao_lado(itens, resultado_rotulo, caminho.name)),
        "votos": votos_do_pdf(itens, caminho.name),
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


def main():
    metadados = json.loads((BRONZE / "metadados.json").read_text(encoding="utf-8"))
    pessoas = indice_cadastro()
    sumulas = []
    for sessao in metadados["sessoes"]:
        for votacao in sessao["votacoes"]:
            if not votacao["arquivo"]:
                continue
            pdf = BRONZE / votacao["arquivo"]
            leitura = ler_pdf(pdf, sessao["data"])
            gravar_leitura(pdf, leitura)
            votos = []
            for linha in leitura["votos"]:
                votos.append(
                    {
                        **linha,
                        "nome_completo": nome_completo(linha["nome"], pessoas, pdf.name),
                    }
                )
            sumulas.append(
                {
                    "sessao_id": sessao["id"],
                    "titulo": sessao["titulo"],
                    "data": sessao["data"],
                    "realizada_em": leitura["realizada_em"],
                    "presidente": leitura["presidente"],
                    "primeiro_secretario": leitura["primeiro_secretario"],
                    "segundo_secretario": leitura["segundo_secretario"],
                    "documento": leitura["documento"],
                    "numero_ata": leitura["numero_ata"],
                    "tipo_votacao": leitura["tipo_votacao"],
                    "resultado": leitura["resultado"],
                    "origem": {
                        "arquivo": votacao["arquivo"],
                        "url": votacao["sumula_url"],
                    },
                    "votos": votos,
                }
            )

    SILVER.parent.mkdir(parents=True, exist_ok=True)
    SILVER.write_text(
        json.dumps({"tema": TEMA, "sumulas": sumulas}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(sumulas)} súmulas em {SILVER.relative_to(RAIZ_V2.parent)}", flush=True)


if __name__ == "__main__":
    main()
