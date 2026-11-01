"""Lê os calendários em imagem e grava todos os anos num único JSON da silver.

O PDF de 2026 tem texto. O ano dele permanece o que já está em calendario.json.
"""

import asyncio
import json
import re
import statistics
from datetime import date
from pathlib import Path

from pypdf import PdfReader
from winsdk.windows.globalization import Language
from winsdk.windows.graphics.imaging import BitmapDecoder, BitmapPixelFormat, SoftwareBitmap
from winsdk.windows.media.ocr import OcrEngine
from winsdk.windows.storage.streams import DataWriter, InMemoryRandomAccessStream

TEMA = "calendario-das-sessoes"
RAIZ_V2 = Path(__file__).resolve().parents[2]
BRONZE = RAIZ_V2 / "dados" / "bronze" / TEMA
SILVER = RAIZ_V2 / "dados" / "silver" / TEMA

MESES = [
    ("JANEIRO", 1),
    ("FEVEREIRO", 2),
    ("MARÇO", 3),
    ("ABRIL", 4),
    ("MAIO", 5),
    ("JUNHO", 6),
    ("JULHO", 7),
    ("AGOSTO", 8),
    ("SETEMBRO", 9),
    ("OUTUBRO", 10),
    ("NOVEMBRO", 11),
    ("DEZEMBRO", 12),
]
NOME_MES = {
    "JANEIRO": 1,
    "JAN": 1,
    "FEVEREIRO": 2,
    "FEV": 2,
    "MARÇO": 3,
    "MARCO": 3,
    "MAR": 3,
    "ABRIL": 4,
    "ABR": 4,
    "MAIO": 5,
    "MAI": 5,
    "JUNHO": 6,
    "JUN": 6,
    "JULHO": 7,
    "JUL": 7,
    "AGOSTO": 8,
    "AGO": 8,
    "SETEMBRO": 9,
    "SET": 9,
    "OUTUBRO": 10,
    "OUT": 10,
    "NOVEMBRO": 11,
    "NOV": 11,
    "DEZEMBRO": 12,
    "DEZ": 12,
}


def metadados():
    dados = json.loads((BRONZE / "metadados.json").read_text(encoding="utf-8"))
    return dados["itens"]


def jpeg_da_pagina(caminho):
    pagina = PdfReader(str(caminho)).pages[0]
    texto = pagina.extract_text() or ""
    if texto.strip():
        return None
    return pagina.images[0].data


async def reconhecer(dados):
    motor = OcrEngine.try_create_from_language(Language("pt-BR"))
    if motor is None:
        raise SystemExit("O Windows não tem o reconhecimento de texto em português.")
    fluxo = InMemoryRandomAccessStream()
    escritor = DataWriter(fluxo)
    escritor.write_bytes(dados)
    await escritor.store_async()
    escritor.detach_stream()
    fluxo.seek(0)
    decodificador = await BitmapDecoder.create_async(fluxo)
    bitmap = await decodificador.get_software_bitmap_async()
    if bitmap.bitmap_pixel_format != BitmapPixelFormat.BGRA8:
        bitmap = SoftwareBitmap.convert(bitmap, BitmapPixelFormat.BGRA8)
    resultado = await motor.recognize_async(bitmap)
    palavras = []
    for linha in resultado.lines:
        for palavra in linha.words:
            caixa = palavra.bounding_rect
            palavras.append(
                {
                    "texto": palavra.text,
                    "x": caixa.x,
                    "y": caixa.y,
                    "largura": caixa.width,
                }
            )
    return palavras, bitmap.pixel_width


def chave(texto):
    return texto.upper().replace("Ç", "C")


def nome_de_mes(palavra, palavras):
    nome = chave(palavra["texto"])
    if nome == "MAR":
        vizinho = any(
            chave(outra["texto"]) in {"O", "CO", "ÇO"}
            and abs(outra["y"] - palavra["y"]) < 20
            and outra["x"] > palavra["x"]
            for outra in palavras
        )
        if vizinho:
            nome = "MARCO"
    return NOME_MES.get(nome)


def meses_da_tabela(palavras, largura):
    fevereiro = next(
        (palavra for palavra in palavras if chave(palavra["texto"]) == "FEVEREIRO"),
        None,
    )
    if fevereiro is None:
        raise SystemExit("A página não traz o mês de fevereiro.")
    tolerancia = largura * 0.08
    achados = []
    for palavra in palavras:
        numero = nome_de_mes(palavra, palavras)
        if numero is None:
            continue
        if abs(palavra["x"] - fevereiro["x"]) > tolerancia:
            continue
        achados.append({**palavra, "mes": numero})
    por_mes = {}
    for palavra in achados:
        atual = por_mes.get(palavra["mes"])
        if atual is None or abs(palavra["y"] - fevereiro["y"]) < abs(atual["y"] - fevereiro["y"]):
            por_mes[palavra["mes"]] = palavra
    if 2 not in por_mes:
        raise SystemExit("A página não traz o mês de fevereiro.")
    ordenados = [por_mes[2]]
    for numero in range(3, 13):
        if numero not in por_mes:
            raise SystemExit(f"A página não traz o mês {numero}.")
        if por_mes[numero]["y"] <= ordenados[-1]["y"]:
            raise SystemExit(f"A ordem dos meses não fecha no mês {numero}.")
        ordenados.append(por_mes[numero])
    intervalo = statistics.median(
        ordenados[i + 1]["y"] - ordenados[i]["y"] for i in range(len(ordenados) - 1)
    )
    if 1 in por_mes:
        janeiro = por_mes[1]
        acima = ordenados[0]["y"] - janeiro["y"]
        if 0 < acima < intervalo * 1.6:
            ordenados.insert(0, janeiro)
    return ordenados, intervalo


def numero_dia(texto):
    if re.fullmatch(r"\d{1,2}", texto):
        dia = int(texto)
        if 1 <= dia <= 31:
            return dia
    return None


def palavras_da_faixa(palavras, y_inicio, y_fim, x_min):
    return [
        palavra
        for palavra in palavras
        if x_min <= palavra["x"] and y_inicio <= palavra["y"] < y_fim
    ]


def texto_junto(palavras):
    linhas = []
    for palavra in sorted(palavras, key=lambda item: (round(item["y"] / 15), item["x"])):
        if linhas and abs(palavra["y"] - linhas[-1][0]) < 15:
            linhas[-1][1].append(palavra["texto"])
        else:
            linhas.append((palavra["y"], [palavra["texto"]]))
    return re.sub(r"\s+", " ", " ".join(" ".join(trecho) for _, trecho in linhas)).upper()


def corrigir_recesso(texto):
    # O reconhecimento lê o "º" de "1º" como zero.
    return re.sub(r"10\s+A\s+(?:31|1)\s+DE\s+JULHO", "1º A 31 DE JULHO", texto)


def mes_numero(nome):
    numero = NOME_MES.get(chave(nome))
    if numero is None:
        raise SystemExit(f"Mês desconhecido no recesso: {nome}")
    return numero


def recessos_do_texto(texto, ano):
    texto = corrigir_recesso(texto)
    encontrados = []
    for match in re.finditer(
        r"RECESSO(?:\s+A\s+PARTIR)?\s+DE\s+(\d+)\s*º?\s*(?:DE\s+([A-Z]+)\s+)?A\s+(\d+)\s+DE\s+([A-Z]+)",
        texto,
    ):
        dia_inicio = int(match.group(1))
        mes_inicio = mes_numero(match.group(2)) if match.group(2) else None
        dia_fim = int(match.group(3))
        mes_fim = mes_numero(match.group(4))
        if mes_inicio is None:
            mes_inicio = mes_fim
        ano_fim = ano + 1 if mes_fim < mes_inicio else ano
        inicio = date(ano, mes_inicio, dia_inicio)
        fim = date(ano_fim, mes_fim, dia_fim)
        frase = re.sub(r"\s+", " ", match.group(0)).strip().capitalize()
        encontrados.append({"inicio": inicio.isoformat(), "fim": fim.isoformat(), "texto": frase})
    return encontrados


def ler_tabela(palavras, largura, ano):
    meses, intervalo = meses_da_tabela(palavras, largura)
    margem = intervalo * 0.45
    sessoes = []
    recessos = []
    for indice, mes in enumerate(meses):
        y_fim = meses[indice + 1]["y"] - margem if indice + 1 < len(meses) else mes["y"] + intervalo * 3
        faixa = palavras_da_faixa(palavras, mes["y"] - margem, mes["y"] + margem, mes["x"] + mes["largura"])
        recesso = next((palavra for palavra in faixa if chave(palavra["texto"]) == "RECESSO"), None)
        limite = recesso["x"] if recesso else largura
        for palavra in faixa:
            if palavra["x"] >= limite:
                continue
            dia = numero_dia(palavra["texto"])
            if dia is None:
                continue
            quando = date(ano, mes["mes"], dia)
            sessoes.append(quando.isoformat())
        if recesso:
            bloco = palavras_da_faixa(
                palavras,
                mes["y"] - margem,
                y_fim,
                recesso["x"] - largura * 0.04,
            )
            lidos = recessos_do_texto(texto_junto(bloco), ano)
            if not lidos:
                raise SystemExit(f"O recesso de {mes['texto']} não fechou.")
            recessos.extend(lidos)
    if not sessoes:
        raise SystemExit("A página não traz datas de sessão.")
    return sorted(sessoes), recessos


def exercicio(palavras, item):
    texto = " ".join(palavra["texto"] for palavra in palavras)
    achado = re.search(r"ANO\s+DE\s+(\d{4})", texto, flags=re.IGNORECASE)
    if achado:
        return int(achado.group(1))
    if item["arquivo"] == "7141.pdf":
        return int(item["data_documento"][:4])
    raise SystemExit(f"{item['arquivo']} não informa o ano do calendário.")


def horario(palavras):
    texto = " ".join(palavra["texto"] for palavra in palavras)
    achado = re.search(r"(\d{1,2})\s*:\s*(\d{2})", texto)
    if not achado:
        return None
    return f"{int(achado.group(1)):02d}:{achado.group(2)}"


def regra(palavras):
    texto = " ".join(chave(palavra["texto"]) for palavra in palavras)
    if "TERCAS" in texto:
        return "2ª e 4ª terças-feiras"
    return None


def registro(item, ano, sessoes, recessos, hora, norma):
    return {
        "exercicio": ano,
        "origem": {
            "arquivo": item["arquivo"],
            "titulo": item["titulo"],
            "url": item["url"],
            "data_documento": item["data_documento"],
        },
        "horario": hora,
        "regra": norma,
        "sessoes": sessoes,
        "recessos": recessos,
    }


def anos_preservados(exercicios):
    destino = SILVER / "calendario.json"
    if not destino.exists():
        return []
    atual = json.loads(destino.read_text(encoding="utf-8"))
    return [ano for ano in atual.get("anos", []) if ano["exercicio"] not in exercicios]


def escrever(anos):
    anos = sorted(anos, key=lambda ano: ano["exercicio"])
    SILVER.mkdir(parents=True, exist_ok=True)
    destino = SILVER / "calendario.json"
    destino.write_text(
        json.dumps({"tema": TEMA, "anos": anos}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for antigo in SILVER.glob("????.json"):
        antigo.unlink()
    print(f"{len(anos)} anos em {destino.relative_to(RAIZ_V2.parent)}")
    for ano in anos:
        print(f"{ano['exercicio']}: {len(ano['sessoes'])} sessões")
        for data in ano["sessoes"]:
            if date.fromisoformat(data).weekday() != 1:
                print(f"aviso: {data} está na tabela e não cai numa terça.")


async def main():
    anos = []
    for item in metadados():
        caminho = BRONZE / item["arquivo"]
        jpeg = jpeg_da_pagina(caminho)
        if jpeg is None:
            continue
        palavras, largura = await reconhecer(jpeg)
        ano = exercicio(palavras, item)
        sessoes, recessos = ler_tabela(palavras, largura, ano)
        anos.append(registro(item, ano, sessoes, recessos, horario(palavras), regra(palavras)))
    exercicios = {ano["exercicio"] for ano in anos}
    escrever(anos + anos_preservados(exercicios))


if __name__ == "__main__":
    asyncio.run(main())
