// Sessão do usuário, menu de navegação e tela de login/cadastro.
import { sb } from './supabase.js';
import { app, esc } from './utils.js';

export const state = { user: null };
export const uname = () => state.user.user_metadata?.username || state.user.email.split('@')[0];

export async function initAuth(onChange) {
  state.user = (await sb.auth.getSession()).data.session?.user || null;
  sb.auth.onAuthStateChange((_, s) => {
    const u = s?.user || null;
    if (u?.id !== state.user?.id) {
      state.user = u;
      onChange();
    }
  });
}

export function renderNav(page) {
  const link = (hash, label) =>
    `<a href="#/${hash}" class="${page === hash ? 'on' : ''}">${label}</a>`;
  const spacer = '<span style="flex:1"></span>';

  if (!state.user) {
    $('#nav').innerHTML = spacer + link('login', 'Entrar');
    return;
  }
  $('#nav').innerHTML =
    link('play', 'Jogar') +
    link('pool', 'Pool') +
    link('history', 'Histórico') +
    spacer +
    `<span class="mu">${esc(uname())}</span><button class="g" id="logout">Sair</button>`;
  $('#logout').onclick = () => sb.auth.signOut();
}

export function authView() {
  app.innerHTML = `<div class=box style="max-width:380px;margin:40px auto"><h2>Entrar</h2><div class=row style="flex-direction:column;align-items:stretch"><input id=u placeholder="Nome de usuário (só no cadastro)"><input id=e type=email placeholder="Email"><input id=p type=password placeholder="Senha (mín. 6)"><button id=li>Entrar</button><button class=g id=su>Criar conta</button><div id=m class=mu></div></div></div>`;
  const m = (t) => ($('#m').textContent = t);
  $('#li').onclick = async () => {
    const { error } = await sb.auth.signInWithPassword({
      email: $('#e').value,
      password: $('#p').value,
    });
    if (error) m(error.message);
  };
  $('#su').onclick = async () => {
    const { data, error } = await sb.auth.signUp({
      email: $('#e').value,
      password: $('#p').value,
      options: { data: { username: $('#u').value || $('#e').value.split('@')[0] } },
    });
    if (error) m(error.message);
    else if (!data.session) m('Conta criada. Confirme o email e depois entre.');
  };
}
