// Helpers compartilhados e o componente visual de carta.
//
// Formato de uma carta (salvo no banco, por isso as chaves são curtas):
//   i = código da carta (passcode)   n = nome   t = tipo   r = raridade (C, R, SR, UR)
//   x = 1 se for do Extra Deck
export const $ = (s) => document.querySelector(s);
export const app = $('#app');
export const RAR = ['C', 'R', 'SR', 'UR'];
export const RC = { C: '#8b93b8', R: '#4da3ff', SR: '#b06cff', UR: '#ffc83d' };
// aceita c/r/sr/ur (e nomes por extenso) e devolve a sigla padrão
export const normRar = (s) => {
  const k = String(s ?? '')
    .trim()
    .toLowerCase();
  return (
    {
      c: 'C',
      common: 'C',
      comum: 'C',
      r: 'R',
      rare: 'R',
      sr: 'SR',
      super: 'SR',
      'super rare': 'SR',
      ur: 'UR',
      ultra: 'UR',
      'ultra rare': 'UR',
    }[k] || (k ? k.toUpperCase() : 'C')
  );
};
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
export const img = (i, big) =>
  `https://images.ygoprodeck.com/images/cards${big ? '' : '_small'}/${i}.jpg`;
// HTML de uma carta. `extra` = classes CSS extras; `attrs` = atributos extras (ex.: data-k="3").
// Os data-* alimentam o zoom (zoom.js).
export const cardEl = (c, extra = '', attrs = '') => {
  const rarity = normRar(c.r);
  const data = `data-i="${c.i}" data-n="${esc(c.n)}" data-t="${esc(c.t || '')}" data-r="${esc(c.r)}"`;
  return `
    <div class="c r-${rarity} ${extra}" ${attrs} ${data} style="border-color:${RC[rarity] || '#666'}">
      <img loading="lazy" src="${img(c.i)}" alt="${esc(c.n)}">
      <small>${esc(c.r)}</small>
    </div>`;
};
export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const download = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
export const copy = (t) => navigator.clipboard.writeText(t).then(() => alert('Copiado!'));
