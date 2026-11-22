// Deckbuilder em tiles (Main / Extra / Side): arraste para reordenar e mover cartas.
import { cardEl, copy, download, normRar } from '../../utils.js';
import { deckToYdke, deckToYdk } from '../../ydke.js';

const SECTIONS = ['main', 'extra', 'side'];
const TITLES = { main: 'Main Deck', extra: 'Extra Deck', side: 'Side Deck' };
const MIN_SLOTS = { main: 40, extra: 15, side: 15 }; // tiles sempre visíveis
const ROW_SIZE = { main: 10, extra: 15, side: 15 }; // a grade cresce linha a linha
const RARITY_ORDER = ['UR', 'SR', 'R', 'C'];
const DRAG_THRESHOLD = 6; // px de movimento até um clique virar arrasto

// ---------- critérios de ordenação e limites ----------
function typeRank(card) {
  const type = card.t || '';
  if (/monster/i.test(type)) return 0;
  if (/spell/i.test(type)) return 1;
  if (/trap/i.test(type)) return 2;
  return 3;
}
function rarityRank(card) {
  const index = RARITY_ORDER.indexOf(normRar(card.r));
  return index < 0 ? 9 : index;
}
const outOfLimits = (section, count) =>
  section === 'main' ? count < 40 || count > 60 : count > 15;

/**
 * Cria o deckbuilder dentro de `mount`.
 * Use `setPicks(cartas)` sempre que a lista de cartas escolhidas mudar.
 * A organização (qual carta está em qual tile) fica no localStorage, por sala.
 */
export function createDeckbuilder({ mount, roomId, roomCode }) {
  const storageKey = `deck:${roomId}`;
  let picks = []; // cartas escolhidas, na ordem em que chegaram
  let layout = loadLayout(); // { main: [índices de picks], extra: [...], side: [...] }
  let drag = null; // arrasto em andamento

  mount.innerHTML = `
    <div class="box">
      <div class="row">
        <h3 class="deck-title" style="margin:0">Seu deck</h3>
        <span style="flex:1"></span>
        <button class="g" data-act="sort-type">Ordenar por tipo</button>
        <button class="g" data-act="sort-rarity">Por raridade</button>
        <button class="g" data-act="reset">Reiniciar</button>
        <button class="g" data-act="copy">Copiar YDKE</button>
        <button data-act="download-ydke">Baixar YDKE</button>
        <button class="g" data-act="download-ydk">Baixar .ydk</button>
      </div>
      <p class="mu">
        Arraste as cartas para reordenar ou mover entre Main, Extra e Side.
        A organização fica salva neste navegador.
      </p>
      <div class="deck"></div>
    </div>`;
  const deckEl = mount.querySelector('.deck');

  const cardsOf = (section) => layout[section].map((i) => picks[i]);
  const exportArgs = () => SECTIONS.map(cardsOf); // [main, extra, side]

  const actions = {
    'sort-type': () => sortAll((a, b) => typeRank(a) - typeRank(b)),
    'sort-rarity': () => sortAll((a, b) => rarityRank(a) - rarityRank(b)),
    reset: () => {
      layout = { main: [], extra: [], side: [] };
      saveLayout();
      render();
    },
    copy: () => copy(deckToYdke(...exportArgs())),
    'download-ydke': () => download(`draft-${roomCode}.ydke.txt`, deckToYdke(...exportArgs())),
    'download-ydk': () => download(`draft-${roomCode}.ydk`, deckToYdk(...exportArgs())),
  };
  mount.querySelectorAll('[data-act]').forEach((button) => {
    button.onclick = () => actions[button.dataset.act]();
  });
  deckEl.onpointerdown = onPointerDown;

  // ---------- persistência ----------
  function loadLayout() {
    const empty = { main: [], extra: [], side: [] };
    try {
      return { ...empty, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch {
      return empty;
    }
  }
  function saveLayout() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* localStorage indisponível: segue sem salvar */
    }
  }

  // Garante que cada carta esteja em exatamente uma seção.
  // Cartas novas entram no Extra (fusão, sincro, xyz, link) ou no Main.
  function syncLayout() {
    const placed = new Set();
    for (const section of SECTIONS) {
      const indexes = Array.isArray(layout[section]) ? layout[section] : [];
      layout[section] = indexes.filter((i) => {
        const valid = i < picks.length && !placed.has(i);
        placed.add(i);
        return valid;
      });
    }
    picks.forEach((card, i) => {
      if (!placed.has(i)) layout[card.x ? 'extra' : 'main'].push(i);
    });
  }

  // ---------- desenho ----------
  function sectionHtml(section) {
    const indexes = layout[section];
    const count = indexes.length;
    const rowSize = ROW_SIZE[section];
    const slotCount = Math.max(MIN_SLOTS[section], Math.ceil((count + 1) / rowSize) * rowSize);

    const slots = Array.from({ length: slotCount }, (_, i) => {
      const card = i < count ? cardEl(picks[indexes[i]], 'tc', `data-k="${indexes[i]}"`) : '';
      return `<div class="slot" data-s="${section}" data-i="${i}">${card}</div>`;
    }).join('');

    const warn = outOfLimits(section, count) ? 'warn' : '';
    const limit = section === 'main' ? ' (40–60)' : ' / 15';
    return `
      <div class="sec">
        <h3>${TITLES[section]} <span class="cnt ${warn}">${count}${limit}</span></h3>
        <div class="dg dg-${section}" data-s="${section}">${slots}</div>
      </div>`;
  }

  function render() {
    if (drag) return; // não redesenha no meio de um arrasto
    syncLayout();
    deckEl.innerHTML = SECTIONS.map(sectionHtml).join('');
    mount.querySelector('.deck-title').textContent = `Seu deck (${picks.length} cartas)`;
  }

  function sortAll(compare) {
    for (const section of SECTIONS) {
      layout[section].sort(
        (a, b) => compare(picks[a], picks[b]) || picks[a].n.localeCompare(picks[b].n),
      );
    }
    saveLayout();
    render();
  }

  // ---------- arrastar e soltar (mouse e toque) ----------
  // Tile (ou grade) sob o cursor; soltar fora de um tile coloca a carta no fim da seção.
  function dropTarget(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const slot = element?.closest('.slot');
    const grid = element?.closest('.dg');
    if (slot) return { section: slot.dataset.s, index: Number(slot.dataset.i), slot };
    if (grid) return { section: grid.dataset.s, index: Infinity };
    return null;
  }

  function onPointerDown(event) {
    const cardElement = event.target.closest('.tc');
    if (!cardElement || event.button) return;
    event.preventDefault();
    drag = {
      cardElement,
      pickIndex: Number(cardElement.dataset.k),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);
    addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(event) {
    if (!drag) return;
    if (!drag.active) {
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (moved < DRAG_THRESHOLD) return;
      startGhost();
    }
    drag.ghost.style.left = `${event.clientX - drag.ghost.offsetWidth / 2}px`;
    drag.ghost.style.top = `${event.clientY - drag.ghost.offsetHeight / 2}px`;
    deckEl.querySelectorAll('.over').forEach((el) => el.classList.remove('over'));
    dropTarget(event)?.slot?.classList.add('over');
  }

  // Cópia da carta que acompanha o cursor; a original fica esmaecida.
  function startGhost() {
    const ghost = drag.cardElement.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.style.width = `${drag.cardElement.offsetWidth}px`;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.active = true;
    drag.cardElement.style.opacity = '.25';
  }

  function onPointerUp(event) {
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerup', onPointerUp);
    removeEventListener('pointercancel', onPointerUp);

    const finished = drag;
    drag = null;
    if (!finished?.active) return; // foi só um clique
    finished.ghost.remove();

    const target = dropTarget(event);
    if (target) {
      for (const section of SECTIONS) {
        const at = layout[section].indexOf(finished.pickIndex);
        if (at >= 0) layout[section].splice(at, 1); // tira da posição antiga
      }
      const list = layout[target.section];
      list.splice(Math.min(target.index, list.length), 0, finished.pickIndex);
      saveLayout();
    }
    render();
  }

  return {
    setPicks(newPicks) {
      picks = newPicks;
      render();
    },
  };
}
