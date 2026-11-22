// Busca nome/tipo das cartas na API do YGOPRODeck
export async function enrich(cs, msg) {
  const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?',
    info = {},
    byName = {};
  const ids = [...new Set(cs.filter((c) => c.i).map((c) => c.i))];
  for (let k = 0; k < ids.length; k += 40) {
    msg(`Buscando cartas ${k}/${ids.length}…`);
    try {
      const j = await (await fetch(API + 'id=' + ids.slice(k, k + 40).join(','))).json();
      (j.data || []).forEach((d) => (info[d.id] = d));
    } catch (e) {}
  }
  for (const c of cs)
    if (!c.i && c.n) {
      if (!(c.n in byName)) {
        msg('Buscando ' + c.n);
        try {
          const j = await (await fetch(API + 'name=' + encodeURIComponent(c.n))).json();
          byName[c.n] = j.data?.[0] || null;
          if (byName[c.n]) info[byName[c.n].id] = byName[c.n];
        } catch (e) {
          byName[c.n] = null;
        }
      }
      if (byName[c.n]) c.i = byName[c.n].id;
    }
  cs.forEach((c) => {
    const d = info[c.i];
    if (d) {
      c.n = d.name;
      c.t = c.t || d.type;
      c.x = /fusion|synchro|xyz|link/.test(d.frameType) ? 1 : 0;
    } else c.n = c.n || '#' + c.i;
    c.x = c.x || 0;
  });
  return cs.filter((c) => c.i);
}
