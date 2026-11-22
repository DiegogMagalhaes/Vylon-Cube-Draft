export const $ = s => document.querySelector(s);
export const app = $('#app');
export const RAR = ['Common','Rare','Super Rare','Ultra Rare','Secret Rare'];
export const RC = {'Common':'#8b93b8','Rare':'#4da3ff','Super Rare':'#b06cff','Ultra Rare':'#ffc83d','Secret Rare':'#ff6fb5'};
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const img = (i, big) => `https://images.ygoprodeck.com/images/cards${big ? '' : '_small'}/${i}.jpg`;
export const cardEl = (c, x = '', a = '') => `<div class="c ${x}" ${a} data-i="${c.i}" style="border-color:${RC[c.r] || '#666'}"><img loading="lazy" src="${img(c.i)}" alt="${esc(c.n)}" title="${esc(c.n)}"><small>${esc(c.r)}</small></div>`;
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]] } return a };
export const copy = t => navigator.clipboard.writeText(t).then(() => alert('Copiado!'));

// pré-visualização grande da carta ao passar o mouse
document.addEventListener('mouseover', e => {
  const c = e.target.closest('.c'), z = $('#zoom');
  if (c) { z.src = img(c.dataset.i, 1); z.style.display = 'block' } else z.style.display = 'none';
});
