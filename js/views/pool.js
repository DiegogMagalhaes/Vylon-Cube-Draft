import { $, app, esc, cardEl, copy, shuffle, RAR, RC } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';
import { parseCsv, rowsToCards } from '../csv.js';
import { fromYdke, toYdke } from '../ydke.js';
import { enrich } from '../api.js';

// ---------- Pool: importar e editar cubos ----------
export async function poolView(){const{data:cubes}=await sb.from('cubes').select('id,name,cards,created_at').order('created_at',{ascending:false});
app.innerHTML=`<div class=box><h3>Importar cubo</h3><div class=row><input id=cn placeholder="Nome do cubo"><input id=cf type=file accept=".csv,.txt"></div><p class=mu>Envie um CSV (colunas: <code>id, name, rarity, qty</code> — só id <i>ou</i> name já basta) ou cole uma lista <code>ydke://…</code>.</p><textarea id=ct placeholder="Cole CSV ou ydke:// aqui"></textarea><p><button id=im>Importar</button> <span id=ms class=mu></span></p></div>
<div class=box><h3>Meus cubos</h3>${(cubes||[]).map(c=>`<div class=row style="padding:6px 0"><b>${esc(c.name)}</b><span class=mu>${c.cards.length} cartas</span><span style="flex:1"></span><button class=g data-o="${c.id}">Abrir / raridades</button><button class=d data-x="${c.id}">Excluir</button></div>`).join('')||'<span class=mu>Nenhum cubo ainda.</span>'}</div><div id=ed></div>`;
$('#im').onclick=async()=>{const ms=t=>$('#ms').textContent=t;try{let t=$('#ct').value;const f=$('#cf').files[0];if(f)t=await f.text();if(!t.trim())return ms('Nada para importar.');
let cs=/^\s*ydke:\/\//i.test(t)?fromYdke(t):rowsToCards(parseCsv(t));cs=await enrich(cs,ms);if(!cs.length)return ms('Nenhuma carta reconhecida.');
const{error}=await sb.from('cubes').insert({name:$('#cn').value||'Cubo sem nome',cards:cs});if(error)return ms(error.message);poolView()}catch(e){ms('Erro: '+e.message)}};
app.querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{if(confirm('Excluir cubo?')){await sb.from('cubes').delete().eq('id',b.dataset.x);poolView()}});
app.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>editor(cubes.find(c=>c.id==b.dataset.o)))}
function editor(cube){let rs=[...new Set([...RAR,...cube.cards.map(c=>c.r)])];
const opts=v=>rs.map(r=>`<option ${r==v?'selected':''}>${esc(r)}</option>`).join('');
const draw=()=>{$('#ed').innerHTML=`<div class=box><h3>${esc(cube.name)}</h3><div class=row><select id=bk>${opts('')}</select><button class=g id=ba>Aplicar a todas</button><button class=g id=nr>+ Nova raridade</button><button id=sv>Salvar</button><button class=g id=yd>Copiar YDKE</button><span id=ms2 class=mu></span></div><br><div class=grid>${cube.cards.map((c,k)=>`<div>${cardEl(c)}<select data-k=${k} style="width:100%;margin-top:4px">${opts(c.r)}</select></div>`).join('')}</div></div>`;
$('#ed').querySelectorAll('select[data-k]').forEach(s=>s.onchange=()=>{cube.cards[s.dataset.k].r=s.value;s.previousElementSibling.style.borderColor=RC[s.value]||'#666';s.previousElementSibling.querySelector('small').textContent=s.value});
$('#ba').onclick=()=>{cube.cards.forEach(c=>c.r=$('#bk').value);draw()};
$('#nr').onclick=()=>{const n=prompt('Nome da raridade:');if(n){rs.push(n);draw()}};
$('#yd').onclick=()=>copy(toYdke(cube.cards));
$('#sv').onclick=async()=>{const{error}=await sb.from('cubes').update({cards:cube.cards}).eq('id',cube.id);$('#ms2').textContent=error?error.message:'Salvo ✓'}};
draw();$('#ed').scrollIntoView()}

