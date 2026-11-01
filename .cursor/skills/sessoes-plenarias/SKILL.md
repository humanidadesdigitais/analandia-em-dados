---
name: sessoes-plenarias
description: >-
  Coleta sessões plenárias, chamadas e súmulas da Câmara de Analândia e cruza
  presença e voto com o cadastro de vereadores. Use ao trabalhar com sessão
  plenária, chamada, súmula, presença, votação dos vereadores, ou com
  v2/scripts/sessoes-plenarias e v2/dados/*/sessoes-plenarias.
---

# Sessões plenárias

## Fonte

- Lista: `https://camaraanalandia.sp.gov.br/sessao/`
- Sessão: `https://camaraanalandia.sp.gov.br/sessao/?id={id}`
- Chamada: `https://file.tramitacao.online/61392/arquivo_chamada/{sessao}/{arquivo}.pdf`
- Súmula: `https://file.tramitacao.online/61392/arquivo_sumula/{votacao}/{arquivo}.pdf`

O código do órgão nos arquivos é `61392`. A lista já vem no HTML. `FIM DA TABELA` é o rodapé da tabela, não uma sessão. A linha “Última atualização: 12/09/2023” do rodapé não é a data dos dados.

O pager é `javascript:pagina(61392, N)`. N maior que 1 interrompe a coleta: essa função não está nos scripts da página, e `?pagina=` não troca a lista.

## Bronze

`v2/scripts/sessoes-plenarias/coletar.py` grava em `v2/dados/bronze/sessoes-plenarias/`:

- `lista.html`
- `sessoes/{id}.html`
- `chamadas/{sessao}/{arquivo}.pdf`
- `chamadas/{sessao}/{arquivo}.json`, a leitura do PDF, ao lado dele
- `sumulas/{votacao}/{arquivo}.pdf`
- `metadados.json`, só quando a coleta fecha

Súmula com href `https://file.tramitacao.online/` e sem `arquivo_sumula/...pdf` fica com URL nula. Não baixar e não criar arquivo. PDF com link completo entra mesmo sem texto. De `/tramitacao/?id=` guarda-se só o id.

A lista e o HTML de cada sessão são baixados de novo. PDF que já começa com `%PDF` fica.

## Leitura dos PDFs

A presença e o voto saem da posição das palavras (`pypdf`, `visitor_text`). `extract_text()` cola o X na coluna errada.

Na súmula, ler o x de Favorável, Contrário e Abstenção naquela página e atribuir cada X ao cabeçalho mais próximo. A contagem de X tem de ser igual à linha TOTAL. Sem esses cabeçalhos, não há voto.

Na chamada, a palavra na coluna Presença entra como foi publicada. Valores já vistos: Presente, Ausente, Justificado. Outra palavra permanece como está. `organizar.py` grava essa leitura em `chamadas/{sessao}/{arquivo}.json` e a lista em `v2/dados/silver/sessoes-plenarias/chamadas.json`, com `realizada_em` (`AAAA-MM-DD`, a data ao lado de “Realizada em:”) e `nome_completo` só quando o vínculo é único.

O sufixo ` - Presidente` é papel. Essa linha pode não ter X.

## Cruzamento com vereadores

O PDF traz o nome civil e uma sigla entre parênteses (`UNIAO`, `SD`). Isso não é o nome de urna nem a sigla do TSE. Normalizar acento e caixa. Ligar ao `nome_completo` da silver de vereadores só quando as palavras do nome no PDF cabem em uma única pessoa. Vários ou nenhum ficam sem vínculo, com o nome publicado. Sessões de 2023 têm outra composição da Câmara.

## O que fica de fora

Presença, voto, autor, quórum e resultado vêm do arquivo. Autor em linha de traços fica vazio. O resultado da página (Aprovado, Reprovado) não vira voto individual quando o PDF não tem a tabela. Silver e gold só depois da bronze. Esta coleta não abre `/tramitacao/`.
