# YGO Cube Draft

Site estático (GitHub Pages) + Supabase (login, banco e tempo real).

```
index.html          página base
css/style.css       estilos
js/
  config.js         URL e chave do Supabase  <-- edite
  supabase.js       cliente Supabase
  main.js           roteador (#/play, #/pool, #/history, #/room/CODIGO)
  auth.js           sessão, login, cadastro e menu
  utils.js          helpers e componente de carta
  ydke.js           codificar/decodificar ydke://
  csv.js            leitura de CSV de cubos
  api.js            nomes/tipos via API do YGOPRODeck
  views/
    play.js         criar/entrar em sala
    room.js         lobby e draft em tempo real
    pool.js         importar cubos e editar raridades
    history.js      histórico de drafts
sql/schema.sql      tabelas e regras (cole no SQL Editor do Supabase)
```

## Rodar localmente
Módulos ES não funcionam abrindo o arquivo direto. Use um servidor local:

    python -m http.server 8000   # e abra http://localhost:8000

## Publicar
Suba tudo num repositório e ative GitHub Pages (Settings > Pages > branch main, pasta root).
