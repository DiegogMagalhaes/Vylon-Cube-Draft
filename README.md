# Vylon Cube Draft

Site estático (GitHub Pages) + Supabase (login, banco e tempo real).

```
index.html              página base
css/style.css           estilos (tema, cartas, draft, deckbuilder)
js/
  main.js               ponto de entrada e roteador (#/play, #/pool, #/history, #/room/CODIGO)
  config.js             URL e chave do Supabase  <-- edite
  supabase.js           cliente Supabase
  auth.js               sessão, menu, login e cadastro
  utils.js              helpers e componente de carta (formato da carta documentado no topo)
  ydke.js               ydke:// (ler e gerar) e arquivo .ydk
  csv.js                leitura de CSV de cubos
  zoom.js               miniatura e zoom (após 2 s) das cartas
  api.js                nomes/tipos das cartas via API do YGOPRODeck
  views/
    home.js             página inicial
    play.js             criar ou entrar em uma sala
    pool.js             importar cubos e editar raridades
    history.js          histórico de drafts
    room/
      index.js          tela da sala: lobby, pacote atual, tempo real
      draft.js          regras: montar pacotes, iniciar, avançar rodadas
      deckbuilder.js    deck em tiles (Main/Extra/Side), arrastar e exportar
assets/                 logo e favicon
sql/schema.sql          tabelas e regras (cole no SQL Editor do Supabase)
```

## Rodar localmente
Módulos ES não funcionam abrindo o arquivo direto. Use um servidor local:

    python -m http.server 8000   # e abra http://localhost:8000

## Publicar
Suba tudo num repositório e ative o GitHub Pages (Settings > Pages > branch main, pasta root).
