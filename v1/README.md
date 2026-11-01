# Analândia em Dados

Aplicação para consultar dados do município de Analândia e dados dos políticos locais.

Esta pasta é o arquivo da primeira versão. O acompanhamento em curso está na [v2](../v2/README.md).

## Onde paramos

- O catálogo de fontes e o site (capa, Cidade, Políticos e Metodologia) ficaram prontos. As páginas ainda não leem dados, porque a cópia para `site/dados/` não foi feita.
- O único script é [coleta/fontes/querido_diario/coletar.py](coleta/fontes/querido_diario/coletar.py). Ele gravou Analândia (IBGE 3502002) e 0 diários.
- A conferência de 21/10/2026 achou a edição 539 no site da imprensa oficial. O Querido Diário não coleta Analândia: a cidade está só no cadastro, sem URL de publicação.
- Esta linha para aqui. O acompanhamento segue na v2, direto nas fontes da cidade.

## Organização do repositório

A coleta, os dados e as páginas ficam separados para que cada contribuição mexa numa parte só.

- [coleta/](coleta/README.md) — scripts de coleta, uma fonte por pasta
- [dados/](dados/README.md) — bruto fora do Git e organizado versionado
- [site/](site/README.md) — páginas do site
- [testes/](testes/README.md) — Playwright, quando houver o que verificar

O código está sob a licença MIT. Os dados públicos continuam das fontes de origem.

Para contribuir, leia [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

1. [Descobrir fontes de dados](#1-descobrir-fontes-de-dados)
2. [Desenvolver scripts de coleta e organização](#2-desenvolver-scripts-de-coleta-e-organização)
3. [Construir e publicar o site](#3-construir-e-publicar-o-site)

## 1. Descobrir fontes de dados

Catálogo inicial de fontes públicas municipais, a partir desta nota:

https://gemini.google.com/share/f2511b8bf3d5?skid=f445f971-9485-4c13-b61f-1601281121ce

| Nome do Site / Fonte | Objetivo | Dados que Possui | Link para Acesso |
| --- | --- | --- | --- |
| SAPL / Portal da Câmara Municipal | Acompanhar a atividade e votações dos vereadores locais | Projetos de lei, votos nominais (Sim/Não), atas das sessões, presenças e discursos | Busque por "SAPL [Nome do seu Município]" ou acesse o site da Câmara local |
| Portal de Dados Abertos da Câmara | Fiscalizar gastos dos gabinetes dos vereadores | Folha de pagamento, assessores nomeados, cota parlamentar (combustível, viagens, etc.) | Aba "Dados Abertos" no site da Câmara do seu município |
| DivulgaCandContas (TSE) | Mapear o perfil e a evolução patrimonial dos políticos | Declaração de bens, histórico de candidaturas, doadores e gastos de campanha | DivulgaCandContas |
| Base dos Dados / Dados Abertos TSE | Analisar dados eleitorais consolidados em escala | Resultados completos de eleições, votação por seção/bairro e perfil dos candidatos em `.csv`/BigQuery | Base dos Dados |
| Diário Oficial do Município (DOM) | Monitorar atos oficiais do Poder Executivo e Legislativo | Leis sancionadas, decretos, nomeações/exonerações de cargos, licitações e contratos | Site da Prefeitura/Câmara do município ou imprensa oficial do estado |
| Portal da Transparência Municipal | Acompanhar a arrecadação e os gastos da Prefeitura | Receitas, despesas detalhadas, fornecedores contratados e salários de servidores | Site oficial de Transparência da Prefeitura do município |
| Tribunal de Contas do Estado (TCE) | Fiscalizar a legalidade e gestão dos recursos públicos | Prestação de contas anuais de Prefeitos/Câmaras, relatórios de auditoria e irregularidades | TCE-SP (`tce.sp.gov.br`), tribunal de contas do estado de São Paulo, onde fica Analândia |
| Querido Diário (OKBR) | Centralizar e estruturar os Diários Oficiais de municípios | Textos limpos e pesquisáveis extraídos de diários oficiais municipais | Querido Diário |
| DataSenado / Interlegis | Mapear a estrutura e dados das Câmaras pelo Brasil | Mapeamento e informações institucionais das câmaras municipais brasileiras | Panorama Legislativo |

## 2. Desenvolver scripts de coleta e organização

Scripts que coletam as fontes acima, limpam os dados e os organizam em um conjunto estável sobre a cidade e os políticos, pronto para o site usar.

## 3. Construir e publicar o site

Site público que apresenta os dados organizados da cidade e dos políticos locais.
