import { $, app, esc, cardEl, copy, download, shuffle, normRar, RAR, RC } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';
import { deckToYdke, deckToYdk } from '../ydke.js';

// ---------- Sala / draft em tempo real ----------
export async function roomView(code){code=(code||'').toUpperCase();
let{data:room}=await sb.from('rooms').select('*').eq('code',code).maybeSingle();
if(!room){app.innerHTML='<div class=box>Sala não encontrada.</div>';return}
let players=[],busy=false,saved=false,tm,saveMsg='Salvando no histórico…',saveErr=false;
const fetchPlayers=async()=>(await sb.from('room_players').select('*').eq('room_id',room.id).order('seat').order('created_at')).data||[];
players=await fetchPlayers();
if(!players.find(p=>p.user_id==state.user.id)&&room.status=='lobby'){await sb.from('room_players').insert({room_id:room.id,user_id:state.user.id,username:uname(),seat:players.length});players=await fetchPlayers()}
const load=async()=>{room=(await sb.from('rooms').select('*').eq('id',room.id).single()).data;players=await fetchPlayers();paint()};
const sched=()=>{clearTimeout(tm);tm=setTimeout(load,150)};
const ch=sb.channel('r'+room.id).on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:'room_id=eq.'+room.id},sched).on('postgres_changes',{event:'*',schema:'public',table:'rooms',filter:'id=eq.'+room.id},sched).subscribe();

function makePack(pool,s){const pk=[];for(const[r,k]of Object.entries(s.rar))for(let j=0;j<k;j++){const x=pool.findIndex(c=>c.r==r);if(x<0)throw Error('Faltam cartas da raridade '+r);pk.push(...pool.splice(x,1))}
while(pk.length<s.size)pk.push(pool.pop());return shuffle(pk)}
async function start(){try{const s=room.settings,n=players.length,need=n*s.packs*s.size;
const{data:cube}=await sb.from('cubes').select('cards').eq('id',room.cube_id).single();
if(cube.cards.length<need)return alert(`O cubo tem ${cube.cards.length} cartas e são necessárias ${need}.`);
const pool=shuffle([...cube.cards]),rounds=Array.from({length:s.packs},()=>Array.from({length:n},()=>makePack(pool,s)));
await Promise.all(players.map((p,i)=>sb.from('room_players').update({seat:i,hand:rounds[0][i],picks:[],chosen:null}).eq('id',p.id)));
await sb.from('rooms').update({status:'drafting',state:{round:0,rounds}}).eq('id',room.id)}catch(e){alert(e.message)}}
async function advance(){if(busy)return;busy=true;try{
const ps=await fetchPlayers(),st=(await sb.from('rooms').select('state,status').eq('id',room.id).single()).data;
if(st.status!='drafting'||!ps.every(p=>p.chosen!=null&&p.chosen<p.hand.length))return;
const n=ps.length,round=st.state.round,dir=round%2?-1:1;
const np=ps.map(p=>({...p,picks:[...p.picks,p.hand[p.chosen]],hand:p.hand.filter((_,k)=>k!=p.chosen)}));
let hands,nr=round,status='drafting';
if(!np[0].hand.length){if(round+1<st.state.rounds.length){nr=round+1;hands=st.state.rounds[nr]}else{status='done';hands=np.map(()=>[])}}
else hands=np.map((_,s)=>np[(s-dir+n)%n].hand);
await Promise.all(np.map((p,s)=>sb.from('room_players').update({picks:p.picks,hand:hands[s],chosen:null}).eq('id',p.id)));
await sb.from('rooms').update({status,state:{...st.state,round:nr}}).eq('id',room.id)}finally{busy=false}}

async function saveDraft(me){
  const{error}=await sb.from('drafts').insert({user_id:state.user.id,room_id:room.id,cube_name:room.cube_name,settings:room.settings,picks:me.picks});
  saveErr=!!error&&error.code!=='23505'; // 23505 = já estava salvo
  saveMsg=saveErr?'Erro ao salvar: '+error.message:'Salvo no histórico ✓';
  paint()}
// ----- deckbuilder em tiles: Main / Extra / Side (arraste para reordenar ou mover) -----
const key='deck:'+room.id,SEC=['main','extra','side'],TITLE={main:'Main Deck',extra:'Extra Deck',side:'Side Deck'},MIN={main:40,extra:15,side:15},STEP={main:10,extra:15,side:15},ORD=['UR','SR','R','C'];
let L={main:[],extra:[],side:[]},mine={picks:[]},drag=null;
try{L={...L,...JSON.parse(localStorage.getItem(key)||'{}')}}catch(e){}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(L))}catch(e){}};
app.innerHTML=`<div id=info></div><div id=stage></div><div class=box><div class=row><h3 id=bt style="margin:0">Seu deck</h3><span style="flex:1"></span><button class=g id=b1>Ordenar por tipo</button><button class=g id=b2>Por raridade</button><button class=g id=b6>Reiniciar</button><button class=g id=b3>Copiar YDKE</button><button id=b4>Baixar YDKE</button><button class=g id=b5>Baixar .ydk</button></div><p class=mu>Arraste as cartas para reordenar ou mover entre Main, Extra e Side. A organização fica salva neste navegador.</p><div id=deck></div></div>`;
const deck=$('#deck'),secCards=x=>L[x].map(k=>mine.picks[k]);
function sync(){const n=mine.picks.length,seen=new Set();
  for(const x of SEC)L[x]=(Array.isArray(L[x])?L[x]:[]).filter(k=>k<n&&!seen.has(k)&&seen.add(k));
  for(let k=0;k<n;k++)if(!seen.has(k))L[mine.picks[k].x?'extra':'main'].push(k)}
const bad=(x,n)=>x=='main'?(n<40||n>60):n>15;
function renderDeck(){if(drag)return;sync();
  deck.innerHTML=SEC.map(x=>{const a=L[x],n=a.length,tot=Math.max(MIN[x],Math.ceil((n+1)/STEP[x])*STEP[x]);
    return `<div class=sec><h3>${TITLE[x]} <span class="cnt ${bad(x,n)?'warn':''}">${n}${x=='main'?' (40–60)':' / 15'}</span></h3><div class="dg dg-${x}" data-s=${x}>${Array.from({length:tot},(_,i)=>`<div class=slot data-s=${x} data-i=${i}>${i<n?cardEl(mine.picks[a[i]],'tc',`data-k=${a[i]}`):''}</div>`).join('')}</div></div>`}).join('');
  $('#bt').textContent=`Seu deck (${mine.picks.length} cartas)`}
const trank=c=>/spell/i.test(c.t||'')?1:/trap/i.test(c.t||'')?2:/monster/i.test(c.t||'')?0:3;
const rrank=c=>{const i=ORD.indexOf(normRar(c.r));return i<0?9:i};
const sortBy=f=>{for(const x of SEC)L[x].sort((a,b)=>f(mine.picks[a],mine.picks[b])||mine.picks[a].n.localeCompare(mine.picks[b].n));save();renderDeck()};
$('#b1').onclick=()=>sortBy((a,b)=>trank(a)-trank(b));
$('#b2').onclick=()=>sortBy((a,b)=>rrank(a)-rrank(b));
$('#b6').onclick=()=>{L={main:[],extra:[],side:[]};save();renderDeck()};
$('#b3').onclick=()=>copy(deckToYdke(secCards('main'),secCards('extra'),secCards('side')));
$('#b4').onclick=()=>download(`draft-${room.code}.ydke.txt`,deckToYdke(secCards('main'),secCards('extra'),secCards('side')));
$('#b5').onclick=()=>download(`draft-${room.code}.ydk`,deckToYdk(secCards('main'),secCards('extra'),secCards('side')));
// arrastar e soltar por ponteiro (mouse e toque): a carta encaixa no tile sob o cursor
function target(e){const el=document.elementFromPoint(e.clientX,e.clientY),sl=el?.closest('.slot'),g=el?.closest('.dg');
  return sl?{s:sl.dataset.s,i:+sl.dataset.i,el:sl}:g?{s:g.dataset.s,i:1e9}:null}
function mv(e){if(!drag)return;
  if(!drag.on){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.on=true;
    const g=drag.c.cloneNode(true);g.classList.add('ghost');g.style.width=drag.c.offsetWidth+'px';document.body.appendChild(g);drag.g=g;drag.c.style.opacity='.25'}
  drag.g.style.left=e.clientX-drag.g.offsetWidth/2+'px';drag.g.style.top=e.clientY-drag.g.offsetHeight/2+'px';
  deck.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));target(e)?.el?.classList.add('over')}
function up(e){removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
  const d=drag;drag=null;if(!d||!d.on)return;d.g.remove();const t=target(e);
  if(t){for(const x of SEC){const j=L[x].indexOf(d.k);if(j>=0)L[x].splice(j,1)}L[t.s].splice(Math.min(t.i,L[t.s].length),0,d.k);save()}
  renderDeck()}
deck.onpointerdown=e=>{const c=e.target.closest('.tc');if(!c||e.button)return;e.preventDefault();
  drag={c,k:+c.dataset.k,x:e.clientX,y:e.clientY,on:false};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up)};

function paint(){if(!$('#info'))return;
const me=players.find(p=>p.user_id==state.user.id),host=room.host==state.user.id,s=room.settings,drafting=room.status=='drafting';
mine=me||{picks:[]};
const rar=Object.entries(s.rar).filter(e=>e[1]).map(e=>e[1]+' '+e[0]).join(' · ');
$('#info').innerHTML=`<div class=box><div class=row><div><div class=mu style="font-size:11px;letter-spacing:.15em">SALA</div><div class=code>${esc(room.code)}</div></div><div style="flex:1"><div><b>${esc(room.cube_name)}</b></div><div class=mu>${s.packs} pacotes × ${s.size} cartas${rar?' · '+rar:''}</div></div><button class=g id=cp>Copiar link de convite</button></div><div class=row style="margin-top:12px">${players.map(p=>`<span class=chip>${drafting?`<i class="dot ${p.chosen!=null?'':'w'}"></i>`:''}${esc(p.username)}${p.user_id==room.host?' ★':''}</span>`).join('')}</div></div>`;
let h;
if(!me)h='<div class=box>Esta sala já foi iniciada.</div>';
else if(room.status=='lobby')h=`<div class="box center"><h3>Sala de espera</h3><p class=mu>Convide os jogadores com o código <b>${esc(room.code)}</b> ou pelo link.</p>${host?`<button id=st>Iniciar draft (${players.length} jogador${players.length>1?'es':''})</button>`:'<p class=mu>Aguardando o host iniciar…</p>'}</div>`;
else if(drafting){const pct=Math.round(me.picks.length/(s.packs*s.size)*100);
h=`<div class=box><div class=row><h3 style="margin:0">Pacote ${room.state.round+1}/${s.packs}</h3><span class=mu>Escolha ${s.size-me.hand.length+1} de ${s.size}</span><span style="flex:1"></span><span class=mu>${me.chosen!=null?'Aguardando os outros jogadores… (você pode trocar a escolha)':'Escolha uma carta'}</span></div><div class=bar><i style="width:${pct}%"></i></div><div class=pack>${me.hand.map((c,k)=>cardEl(c,'pk'+(me.chosen==k?' sel':''),`data-k=${k}`)).join('')}</div></div>`}
else h=`<div class="box center"><h3>Draft finalizado</h3><p class=mu>${esc(saveMsg)}</p>${saveErr?'<button class=g id=rt>Tentar salvar de novo</button>':''}</div>`;
$('#stage').innerHTML=h;
$('#cp').onclick=()=>copy(location.href);
if($('#st'))$('#st').onclick=start;
if($('#rt'))$('#rt').onclick=()=>saveDraft(me);
app.querySelectorAll('.pk').forEach(el=>el.onclick=()=>sb.from('room_players').update({chosen:+el.dataset.k}).eq('id',me.id).then(sched));
renderDeck();
if(room.status=='done'&&me&&!saved){saved=true;saveDraft(me)}
if(drafting&&host&&players.every(p=>p.chosen!=null))advance().then(sched)}
paint();return()=>sb.removeChannel(ch)}