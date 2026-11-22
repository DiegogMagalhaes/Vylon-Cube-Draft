export const $ = s => document.querySelector(s);
export const app = $('#app');
export const RAR = ['C','R','SR','UR'];
export const RC = {C:'#8b93b8',R:'#4da3ff',SR:'#b06cff',UR:'#ffc83d'};
// aceita c/r/sr/ur (e nomes por extenso) e devolve a sigla padrão
export const normRar = s => { const k = String(s ?? '').trim().toLowerCase(); return ({c:'C',common:'C',comum:'C',r:'R',rare:'R',sr:'SR',super:'SR','super rare':'SR',ur:'UR',ultra:'UR','ultra rare':'UR'})[k] || (k ? k.toUpperCase() : 'C') };
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const img = (i, big) => `https://images.ygoprodeck.com/images/cards${big ? '' : '_small'}/${i}.jpg`;
export const cardEl = (c, x = '', a = '') => `<div class="c r-${normRar(c.r)} ${x}" ${a} data-i="${c.i}" style="border-color:${RC[normRar(c.r)] || '#666'}"><img loading="lazy" src="${img(c.i)}" alt="${esc(c.n)}" title="${esc(c.n)}${c.t ? ' · ' + esc(c.t) : ''}"><small>${esc(c.r)}</small></div>`;
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]] } return a };
export const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) };
export const copy = t => navigator.clipboard.writeText(t).then(() => alert('Copiado!'));

// pré-visualização grande da carta ao passar o mouse
document.addEventListener('mouseover', e => {
  const c = e.target.closest('.c'), z = $('#zoom');
  if (c) { z.src = img(c.dataset.i, 1); z.style.display = 'block' } else z.style.display = 'none';
});