# Como contribuir

A coleta, os dados e as páginas ficam em pastas diferentes. Mexa só na parte que a tarefa pede.

## Fonte nova

1. Crie `coleta/fontes/<fonte>/coletar.py`.
2. Salve o download em `dados/bruto/`.
3. Salve o resultado estável em `dados/organizado/cidade.json` ou `dados/organizado/politicos.json`.
4. Declare dependência nova em `coleta/requirements.txt`.

O catálogo está no README, na seção "Descobrir fontes de dados".

## Dado organizado

`dados/organizado/` é o que outras pessoas revisam no Git. Não envie arquivo bruto. Não invente registros: só entre dado que o script coletou, com a origem identificada no pedido de mudança.

`site/dados/` é a cópia que o site publica. O script que copia ainda não existe.

## Página

As páginas ficam em `site/`. O texto da interface fica em português.

Siga [.cursor/skills/using-ui-stack.md](../.cursor/skills/using-ui-stack.md). Cores, espaços e tipo saem de `site/css/tokens.css`.

## Testar no navegador

Na pasta `site/`:

```
python -m http.server
```

Abra http://localhost:8000/ e percorra o fluxo que você mudou.

Teste automatizado, quando fizer falta, segue [.cursor/skills/webapp-testing/scripts/SKILL.md](../.cursor/skills/webapp-testing/scripts/SKILL.md). Veja [testes/README.md](testes/README.md).

## Idioma

Interface, documentos e mensagens para outras pessoas ficam em português.
