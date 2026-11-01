# Dados

`dados/bruto/` guarda o download local de cada fonte. O conteúdo não entra no Git. A pasta existe por causa do `.gitkeep`.

`dados/organizado/` é a fonte da verdade que outras pessoas revisam. O site não lê esta pasta direto: o GitHub Pages publica só `site/`, então a cópia que as páginas leem fica em `site/dados/`. O script que faz essa cópia ainda não existe.

## Arquivos previstos

- `cidade.json` — dados do município. `coleta/fontes/querido_diario/coletar.py` grava `municipio` e `fontes.querido_diario` (cadastro na API e a lista de diários, com data, edição e URLs).
- `politicos.json` — dados dos políticos locais. Ainda sem script.

Os dados públicos continuam das fontes de origem. A licença MIT do repositório cobre o código.
