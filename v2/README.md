# Analândia em Dados

Projeto voltado para acompanhar a Câmara Municipal de Analândia e os atos oficiais da cidade. O ponto atual e o que falta construir estão no [roadmap](../README.md#onde-estamos).

A coleta lê os sites abaixo. O coletor de cada tema, os que já existem e os que ainda forem criados, fica em `scripts/<tema>/`. Os arquivos coletados ficam em `dados/`.

## Fontes

- Diário oficial: https://imprensaoficialmunicipal.com.br/analandia — `diario-oficial`
- Calendário das sessões: https://camaraanalandia.sp.gov.br/doc/?doc=1903 — `calendario-das-sessoes`
- Sessões plenárias: https://camaraanalandia.sp.gov.br/sessao/ — `sessoes-plenarias`
- Audiências públicas: https://camaraanalandia.sp.gov.br/doc/?doc=1877 — `audiencias-publicas`
- Vereadores: https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2024/61395/2045202024/13/candidatos , o detalhe `candidatura/buscar/2024/61395/2045202024/candidato/{id}` e https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2024.zip — `vereadores`
- Tramitação de processos: https://camaraanalandia.sp.gov.br/tramitacao/ — `tramitacao-de-processos`

## Pastas

`scripts/<tema>/` guarda o coletor daquele tema: a coleta, a organização e a agregação. Um tema novo começa por essa pasta. As dependências Python ficam em `scripts/requirements.txt`.

`dados/` guarda o que foi coletado, em três camadas, e cada camada repete os mesmos temas:

- `bronze/` — arquivo como veio da fonte
- `silver/` — dado limpo
- `gold/` — dado pronto para consulta

O caminho de um tema é `scripts/<tema>/`, depois `dados/bronze/<tema>/`, `dados/silver/<tema>/` e `dados/gold/<tema>/`.
