// Importação de CSV: colunas id|passcode, name|nome, rarity|raridade, qty|qtd
export function parseCsv(t){const l=t.split('\n')[0],d=l.split(';').length>l.split(',').length?';':',',rows=[];let r=[],f='',q=false;
for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch=='"'&&t[i+1]=='"'){f+='"';i++}else if(ch=='"')q=false;else f+=ch}
else if(ch=='"')q=true;else if(ch==d){r.push(f);f=''}
else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else f+=ch}
r.push(f);if(r.some(x=>x.trim()))rows.push(r);return rows}
export function rowsToCards(rows){const h=rows[0].map(x=>x.trim().toLowerCase()),hasH=h.some(x=>/^(id|passcode|code|name|nome|rarity|raridade|qty|qtd|quantity)$/.test(x));
const ix=re=>h.findIndex(x=>re.test(x));let ci=-1,ni=-1,ri=1,qi=-1;
if(hasH){ci=ix(/^(id|passcode|code)$/);ni=ix(/^(name|nome)$/);ri=ix(/^(rarity|raridade)$/);qi=ix(/^(qty|qtd|quantity)$/)}else if(isNaN(+rows[0][0]))ni=0;else ci=0;
const out=[];for(const r of hasH?rows.slice(1):rows){const n=Math.max(1,parseInt(r[qi])||1),c={i:ci>=0?parseInt(r[ci])||0:0,n:ni>=0?(r[ni]||'').trim():'',r:(ri>=0&&(r[ri]||'').trim())||'Common'};for(let k=0;k<n;k++)out.push({...c})}return out}
