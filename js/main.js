import { state, initAuth, renderNav, authView } from './auth.js';
import { playView } from './views/play.js';
import { poolView } from './views/pool.js';
import { historyView } from './views/history.js';
import { roomView } from './views/room.js';

const routes = { pool: poolView, history: historyView, room: p => roomView(p[1]) };
let cleanup = null, rid = 0;

async function route() {
  const id = ++rid;
  if (cleanup) { cleanup(); cleanup = null }
  const p = location.hash.slice(2).split('/');
  renderNav(p[0]);
  if (!state.user) return authView();
  const c = await (routes[p[0]] || playView)(p);
  if (id !== rid) c?.(); else cleanup = c || null; // se mudou de rota no meio, encerra
}

addEventListener('hashchange', route);
initAuth(route).then(route);
