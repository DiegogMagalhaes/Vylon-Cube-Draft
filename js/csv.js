import { normRar } from './utils.js';
// Importação de CSV: colunas id, name, type, qty, rarity (rarity: c, r, sr, ur)
export function parseCsv(t){const l=t.split('\n')[0],d=l.split(';').length>l.split(',').length?';':',',rows=[];let r=[],f='',q=false;
for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch=='"'&&t[i+1]=='"'){f+='"';i++}else if(ch=='"')q=false;else f+=ch}
else if(ch=='"')q=true;else if(ch==d){r.push(f);f=''}
else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else f+=ch}
r.push(f);if(r.some(x=>x.trim()))rows.push(r);return rows}
export function rowsToCards(rows){
  const h=rows[0].map(x=>x.trim().toLowerCase()),
    hasH=h.some(x=>/^(id|passcode|code|name|nome|type|tipo|rarity|raridade|qty|qtd|quantity)$/.test(x)),
    ix=re=>h.findIndex(x=>re.test(x));
  // sem cabeçalho a ordem é fixa: id, name, type, qty, rarity
  const[ci,ni,ti,qi,ri]=hasH?[ix(/^(id|passcode|code)$/),ix(/^(name|nome)$/),ix(/^(type|tipo)$/),ix(/^(qty|qtd|quantity)$/),ix(/^(rarity|raridade)$/)]:[0,1,2,3,4];
  const out=[];
  for(const r of hasH?rows.slice(1):rows){
    const n=Math.max(1,parseInt(r[qi])||1),
      c={i:ci>=0?parseInt(r[ci])||0:0,n:ni>=0?(r[ni]||'').trim():'',t:ti>=0?(r[ti]||'').trim():'',r:normRar(ri>=0?r[ri]:'')};
    for(let k=0;k<n;k++)out.push({...c});
  }
  return out;
}