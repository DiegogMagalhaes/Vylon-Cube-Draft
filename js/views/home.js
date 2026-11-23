// Página inicial: apresentação do site e atalhos.
import { app } from '../utils.js';
import { state } from '../auth.js';

const FEATURES = [
  ['Pool', 'Importe seu cubo por CSV ou YDKE e defina a raridade de cada carta.'],
  ['Jogar', 'Crie uma sala, convide jogadores e defina pacotes, cartas por pacote e raridades.'],
  ['Deckbuilder', 'Monte o deck em tiles (Main, Extra e Side) e exporte em YDKE ou .ydk.'],
];

export function homeView() {
  const actions = state.user
    ? `<a class="btn" href="#/play">Jogar</a>
       <a class="btn g" href="#/pool">Meu pool</a>
       <a class="btn g" href="#/history">Histórico</a>`
    : '<a class="btn" href="#/login">Entrar ou criar conta</a>';

  const features = FEATURES.map(
    ([title, text]) => `<div class="box"><h3>${title}</h3><p class="mu">${text}</p></div>`,
  ).join('');

  app.innerHTML = `
    <section class="hero">
      <img class="hero-art" src="assets/logo.jpg" alt="Vylon Cube">
      <div>
        <h1>Vylon Cube Draft</h1>
        <p class="mu">Monte um cubo, convide os amigos e faça drafts de Yu-Gi-Oh! em tempo real.</p>
        <div class="row">${actions}</div>
      </div>
    </section>
    <section class="features">${features}</section>`;
}
