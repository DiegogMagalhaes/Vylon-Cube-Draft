import { sb } from './supabase.js';
import { $, app, esc } from './utils.js';

export const state = { user: null };
export const uname = () => state.user.user_metadata?.username || state.user.email.split('@')[0];

export async function initAuth(onChange) {
  state.user = (await sb.auth.getSession()).data.session?.user || null;
  sb.auth.onAuthStateChange((_, s) => {
    const u = s?.user || null;
    if (u?.id !== state.user?.id) { state.user = u; onChange() }
  });
}

export function renderNav(on) {
  $('#nav').innerHTML = state.user
    ? [['play','Jogar'],['pool','Pool'],['history','Histórico']].map(([k,t]) => `<a href="#/${k}" class="${on == k ? 'on' : ''}">${t}</a>`).join('')
      + `<span style="flex:1"></span><span class=mu>${esc(uname())}</span><button class=g id=lo>Sair</button>`
    : '';
  if (state.user) $('#lo').onclick = () => sb.auth.signOut();
}

export function authView() {
  app.innerHTML = `<div class=box style="max-width:380px;margin:40px auto"><h2>Entrar</h2><div class=row style="flex-direction:column;align-items:stretch"><input id=u placeholder="Nome de usuário (só no cadastro)"><input id=e type=email placeholder="Email"><input id=p type=password placeholder="Senha (mín. 6)"><button id=li>Entrar</button><button class=g id=su>Criar conta</button><div id=m class=mu></div></div></div>`;
  const m = t => $('#m').textContent = t;
  $('#li').onclick = async () => { const { error } = await sb.auth.signInWithPassword({ email: $('#e').value, password: $('#p').value }); if (error) m(error.message) };
  $('#su').onclick = async () => {
    const { data, error } = await sb.auth.signUp({ email: $('#e').value, password: $('#p').value, options: { data: { username: $('#u').value || $('#e').value.split('@')[0] } } });
    if (error) m(error.message); else if (!data.session) m('Conta criada. Confirme o email e depois entre.');
  };
}
