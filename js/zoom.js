// Pré-visualização das cartas ao passar o mouse:
//  1) na hora: miniatura grande no canto da tela (<img id="zoom">)
//  2) após 2 s parado sobre a mesma carta: zoom grande no centro da tela
import { $, img, esc } from './utils.js';

const HOLD_MS = 2000;
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

function hideAll() {
  clearTimeout(holdTimer);
  overlay?.classList.remove('show');
  $('#zoom').style.display = 'none';
}

document.addEventListener('mouseover', (event) => {
  const card = event.target.closest('.c');
  if (card === hovered) return; // continua na mesma carta
  hovered = card;
  hideAll();
  if (!card || isDragging()) return;

  const preview = $('#zoom');
  preview.src = img(card.dataset.i, true);
  preview.style.display = 'block';

  holdTimer = setTimeout(() => {
    if (hovered !== card || !card.isConnected || isDragging()) return;
    $('#zoom').style.display = 'none';
    showOverlay(card);
  }, HOLD_MS);
});

// clicar, arrastar ou apertar Esc fecha o zoom
document.addEventListener('pointerdown', hideAll);
document.addEventListener('keydown', (event) => event.key === 'Escape' && hideAll());
