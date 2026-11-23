// Zoom das cartas: ao ficar 2 segundos com o mouse sobre a mesma carta,
// ela aparece grande no centro da tela.
import { img, esc } from './utils.js';

const HOLD_MS = 1000;
let hovered = null; // carta sob o mouse
let holdTimer = null;
let overlay = null; // criado na primeira vez que for preciso

const isDragging = () => Boolean(document.querySelector('.ghost'));

function getOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zoom-overlay';
    overlay.innerHTML = `
      <div class="zoom-card">
        <img alt="">
        <div class="zoom-info"></div>
      </div>`;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function showOverlay(card) {
  const el = getOverlay();
  const details = [card.dataset.t, card.dataset.r].filter(Boolean).join(' · ');
  el.querySelector('img').src = img(card.dataset.i, true);
  el.querySelector('.zoom-info').innerHTML =
    `<b>${esc(card.dataset.n)}</b><span>${esc(details)}</span>`;
  el.classList.add('show');
}

function hideOverlay() {
  clearTimeout(holdTimer);
  overlay?.classList.remove('show');
}

document.addEventListener('mouseover', (event) => {
  const card = event.target.closest('.c');
  if (card === hovered) return; // continua na mesma carta
  hovered = card;
  hideOverlay();
  if (!card || isDragging()) return;

  holdTimer = setTimeout(() => {
    if (hovered === card && card.isConnected && !isDragging()) showOverlay(card);
  }, HOLD_MS);
});

// clicar, arrastar ou apertar Esc fecha o zoom
document.addEventListener('pointerdown', hideOverlay);
document.addEventListener('keydown', (event) => event.key === 'Escape' && hideOverlay());