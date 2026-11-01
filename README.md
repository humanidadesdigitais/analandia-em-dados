# Analândia em Dados

Acompanhamento do que acontece oficialmente em Analândia e das discussões da Câmara Municipal.

- [v2](v2/README.md) — projeto em curso
- [v1](v1/README.md) — arquivo da primeira versão, no ponto descrito em [Onde paramos](v1/README.md#onde-paramos)

O código está sob a licença MIT. Os dados públicos continuam das fontes de origem.

## Onde estamos

Em 01/11/2026, calendário das sessões, audiências públicas e vereadores estão nas três etapas. A coleta das sessões plenárias está na bronze, as chamadas estão na silver e a capa abre o calendário de presença e o gráfico de presença ou não. Diário oficial e tramitação de processos ainda não começaram.

A capa abre o calendário do mês e a análise de sessões contra recesso, a lista e os indicadores das audiências, e o cadastro dos candidatos a vereador em 2024. São 69 pessoas, em blocos de eleitos, suplentes e não eleitos, com busca por nome, filtro por partido e indicadores. O arquivo lista os PDFs já coletados do calendário e das audiências.

O JSON inteiro de cada detalhe de candidato fica na bronze. A silver guarda o sexo publicado. CPF e título de eleitor não entram no site.

## Roadmap

Cada tema passa por três etapas, nesta ordem. A coleta grava o original em `bronze`. As operações limpam em `silver` e calculam indicadores em `gold`. A visualização entra no site. Os caminhos ficam em [v2](v2/README.md): `v2/scripts/<tema>/` e `v2/dados/<camada>/<tema>/`. O andamento fica na coluna Status.

| Tema | Etapa | Trabalho | Status |
| --- | --- | --- | --- |
| Calendário das sessões | 1. Script de coleta | `coletar.py` baixa os PDFs de 2019 a 2026 para a bronze, com `metadados.json` | Feito |
| Calendário das sessões | 2. Operações em dados | `organizar.py` grava `calendario.json` na silver. `agregar.py` grava sessões, dias de recesso e semestres na gold | Feito |
| Calendário das sessões | 3. Visualização | A capa abre o mês corrente e a análise com os gráficos de sessões contra recesso e de semestres. O arquivo lista os oito PDFs | Feito |
| Diário oficial | 1. Script de coleta | Baixar as edições de https://imprensaoficialmunicipal.com.br/analandia para a bronze, com metadados | A fazer |
| Diário oficial | 2. Operações em dados | Organizar cada edição na silver e calcular na gold só o que o diário publica | A fazer |
| Diário oficial | 3. Visualização | Listar as edições no site e mostrar os indicadores | A fazer |
| Sessões plenárias | 1. Script de coleta | `v2/scripts/sessoes-plenarias/coletar.py` baixa a lista, os HTML e os PDFs de https://camaraanalandia.sp.gov.br/sessao/ para a bronze, com `metadados.json` | Feito |
| Sessões plenárias | 2. Operações em dados | `organizar.py` grava as chamadas em `chamadas.json` na silver. Súmulas e indicadores na gold ainda faltam | A fazer |
| Sessões plenárias | 3. Visualização | A capa abre o calendário de presença e o gráfico de presença ou não nas chamadas. Súmulas ainda faltam | A fazer |
| Audiências públicas | 1. Script de coleta | `v2/scripts/audiencias-publicas/coletar.py` baixa os PDFs de cada ano do seletor para a bronze, com `metadados.json` | Feito |
| Audiências públicas | 2. Operações em dados | `organizar.py` grava cada documento em `audiencias.json`. `agregar.py` conta convites, atas e peças na gold | Feito |
| Audiências públicas | 3. Visualização | A capa abre a lista e os indicadores de convites, atas e peças. O arquivo lista os PDFs | Feito |
| Vereadores | 1. Script de coleta | `coletar.py` grava o JSON da lista, o ZIP de votos e o JSON de cada um dos 69 detalhes na bronze, com `metadados.json` | Feito |
| Vereadores | 2. Operações em dados | `organizar.py` grava o cadastro na silver, com o sexo do detalhe. `agregar.py` grava sexo, partido, totalização e votos na gold | Feito |
| Vereadores | 3. Visualização | A capa abre o cadastro com filtros, títulos e cabeçalhos fixos, e os indicadores em pizzas e barras | Feito |
| Tramitação de processos | 1. Script de coleta | Baixar a lista de https://camaraanalandia.sp.gov.br/tramitacao/ para a bronze | A fazer |
| Tramitação de processos | 2. Operações em dados | Organizar cada processo na silver e os indicadores na gold | A fazer |
| Tramitação de processos | 3. Visualização | Listar os processos no site e mostrar os indicadores | A fazer |
