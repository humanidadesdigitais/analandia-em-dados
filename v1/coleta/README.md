# Coleta

Scripts em Python que baixam as fontes públicas. O download bruto fica fora do Git. O resultado estável fica em `dados/organizado/`.

Ainda não há pacotes obrigatórios. Quando a primeira fonte precisar de algum, acrescente em [requirements.txt](requirements.txt).

## Como adicionar uma fonte

Crie `coleta/fontes/<fonte>/coletar.py`. Não é preciso abrir uma pasta para cada fonte antes de existir script.

1. Grave o download em `dados/bruto/`. Essa pasta não entra no Git.
2. Grave o resultado estável em `dados/organizado/cidade.json` ou `dados/organizado/politicos.json`.
3. A cópia desses arquivos para `site/dados/` ainda não tem script. Ela entra no passo de organização dos dados.

## Fontes com script

Querido Diário, a partir da raiz do repositório:

```
python coleta/fontes/querido_diario/coletar.py
```

O script lê a API pública, guarda a resposta em `dados/bruto/querido_diario/` e atualiza `fontes.querido_diario` em `dados/organizado/cidade.json`.

## Catálogo

O objetivo, os dados e o acesso de cada fonte estão na seção [Descobrir fontes de dados](../README.md#1-descobrir-fontes-de-dados).

- SAPL / Portal da Câmara Municipal
- Portal de Dados Abertos da Câmara
- DivulgaCandContas (TSE)
- Base dos Dados / Dados Abertos TSE
- Diário Oficial do Município
- Portal da Transparência Municipal
- Tribunal de Contas do Estado (TCE-SP)
- Querido Diário
- DataSenado / Interlegis
