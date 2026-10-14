# Data Model: Pesquisa de nichos

Tipos em `lib/models/nicho.ts`. Nada novo é persistido além do cache (`trend_cache`) e do cálculo salvo (`calculosPreco`, existente).

## FiltrosNicho
| Campo | Tipo | Regra |
|---|---|---|
| umaCor | boolean | padrão `true` — só perfis com 1 filamento e sem AMS |
| compativelA1 | boolean | padrão `true` — perfil A1 (`N2S`) ou A1 mini (`N1`) |

## PerfilSugerido
| Campo | Tipo |
|---|---|
| id, profileId | number |
| nome | string (título do perfil) |
| segundos | number (> 0) |
| gramas | number (> 0) |
| mesas | number (≥ 1) |
| cores | number |
| impressora | string (`N2S`, `N1`…) |
| impressoes | number |

## ModeloSugerido
| Campo | Tipo |
|---|---|
| id | number |
| nome, slug, capa, autor | string |
| licenca | `"CC0" \| "BY" \| "BY-SA"` |
| downloads | number |
| url | string (`https://makerworld.com/pt/models/{id}-{slug}#profileId-{profileId}`) |
| perfil | PerfilSugerido |

## Concorrencia
| Campo | Tipo |
|---|---|
| nivel | `"baixa" \| "media" \| "alta" \| "indisponivel"` |
| produtosCatalogo | number \| null (10000 = teto) |

## Potencial
| Campo | Tipo |
|---|---|
| nivel | `"baixo" \| "medio" \| "alto" \| "nao_avaliado"` |
| motivo | string |

## Oportunidade
| Campo | Tipo |
|---|---|
| termo | string |
| posicao | number \| null (null na pesquisa por termo/link) |
| potencial | Potencial |
| concorrencia | Concorrencia |
| modelos | ModeloSugerido[] (1 a 3, ordenados por downloads) |

## Resultado por categoria (cache `nichos:cat:...`)
`{ tipo: "nichos_categoria", categoriaId, categoriaNome, oportunidades: Oportunidade[] (só médio/alto, alto primeiro), ocultas: number, descartados: number }`

## Resultado por termo (cache `nichos:termo:...`)
`{ tipo: "nichos_termo", termo, oportunidade: Oportunidade }` — `modelos` pode vir vazio (mostra "nenhum modelo de 1 cor encontrado").

## Regras de transição
Nenhuma — resultados são somente leitura; "Levar para a calculadora" cria um `CalculoPreco` novo a cada clique.
