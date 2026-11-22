import { $, app, esc, cardEl, copy, shuffle, RAR, RC } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';
import { toYdke } from '../ydke.js';

// ---------- Histórico de drafts ----------
export async function historyView(){const{data}=await sb.from('drafts').select('*').order('created_at',{ascending:false});
app.innerHTML=`<h2>Histórico</h2>`+((data||[]).map((d,k)=>`<details class=box><summary><b>${esc(d.cube_name)}</b> · ${new Date(d.created_at).toLocaleString('pt-BR')} · ${d.picks.length} cartas · ${d.settings.packs}×${d.settings.size}</summary><p class=row><button class=g data-y=${k}>Copiar YDKE</button><button class=g data-c=${k}>Baixar CSV</button></p><div class=grid>${d.picks.map(c=>cardEl(c)).join('')}</div></details>`).join('')||'<p class=mu>Nenhum draft ainda.</p>');
app.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>copy(toYdke(data[b.dataset.y].picks)));
app.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const p=data[b.dataset.c].picks,a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['id,name,rarity\n'+p.map(c=>`${c.i},"${c.n.replace(/"/g,'""')}",${c.r}`).join('\n')]));a.download='draft.csv';a.click()})}

