// Ponto de entrada: roteador por hash (#/play, #/pool, #/history, #/room/CODIGO).
import './zoom.js';
import { state, initAuth, renderNav, authView } from './auth.js';
import { playView } from './views/play.js';
import { poolView } from './views/pool.js';
import { historyView } from './views/history.js';
import { homeView } from './views/home.js';
import { roomView } from './views/room/index.js';

const routes = {
  '': homeView,
  home: homeView,
  play: playView,
  pool: poolView,
  history: historyView,
  room: (p) => roomView(p[1]),
};
const PUBLIC_PAGES = new Set(['', 'home']); // as demais exigem login
let cleanup = null,
  rid = 0;

async function route() {
  const id = ++rid;
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  const p = location.hash.slice(2).split('/');
  const page = p[0];
  renderNav(page);

  if (page === 'login' && state.user) {
    location.hash = '#/play'; // já logado: o hashchange chama route() de novo
    return;
  }
  if (page === 'login' || (!state.user && !PUBLIC_PAGES.has(page))) return authView();

  const c = await (routes[page] || homeView)(p);
  if (id !== rid) c?.();
  else cleanup = c || null; // se mudou de rota no meio, encerra
}

addEventListener('hashchange', route);
initAuth(route).then(route);
