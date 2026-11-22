import { $, app, esc, cardEl, copy, download, shuffle, normRar, RAR, RC } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';
import { toYdke, toYdk } from '../ydke.js';

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
// ----- tabuleiro livre: cartas escolhidas arrastáveis (posição salva no navegador) -----
const key='board:'+room.id;let pos={};try{pos=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
const BW=96,BH=140,G=10,ORD=['UR','SR','R','C'];let drag=null,zi=1,mine={picks:[]};
app.innerHTML=`<div id=info></div><div id=stage></div><div class=box><div class=row><h3 id=bt style="margin:0">Seu deck</h3><span style="flex:1"></span><button class=g id=b1>Organizar</button><button class=g id=b2>Por raridade</button><button class=g id=b3>Copiar YDKE</button><button id=b4>Baixar YDKE</button><button class=g id=b5>Baixar .ydk</button></div><p class=mu>Arraste as cartas e posicione como quiser. A posição fica salva neste navegador.</p><div id=board class=board></div></div>`;
const board=$('#board'),cardsEl=()=>[...board.children];
const slot=(i,cols)=>[G+(i%cols)*(BW+G),G+Math.floor(i/cols)*(BH+G)];
const colsN=()=>Math.max(1,Math.floor((board.clientWidth-G)/(BW+G)));
function layout(){cardsEl().forEach(d=>{const p=pos[d.dataset.k];if(p){d.style.left=p[0]+'px';d.style.top=p[1]+'px'}});
  board.style.height=Math.max(440,...cardsEl().map(d=>d.offsetTop+BH+G))+'px';try{localStorage.setItem(key,JSON.stringify(pos))}catch(e){}}
function arrange(order){order.forEach((k,i)=>pos[k]=slot(i,colsN()));layout()}
function renderBoard(){const n=mine.picks.length;
  for(let k=board.children.length;k<n;k++){board.insertAdjacentHTML('beforeend',cardEl(mine.picks[k],'bc',`data-k=${k}`));
    if(!pos[k]){let i=0;while(Object.values(pos).some(p=>p[0]==slot(i,colsN())[0]&&p[1]==slot(i,colsN())[1]))i++;pos[k]=slot(i,colsN())}}
  $('#bt').textContent=`Seu deck (${n})`;layout()}
$('#b1').onclick=()=>{pos={};arrange(cardsEl().map(d=>+d.dataset.k))};
$('#b2').onclick=()=>{const r=k=>{const i=ORD.indexOf(normRar(mine.picks[k].r));return i<0?9:i};arrange(cardsEl().map(d=>+d.dataset.k).sort((a,b)=>r(a)-r(b)||mine.picks[a].n.localeCompare(mine.picks[b].n)))};
$('#b3').onclick=()=>copy(toYdke(mine.picks));
$('#b4').onclick=()=>download(`draft-${room.code}.ydke.txt`,toYdke(mine.picks));
$('#b5').onclick=()=>download(`draft-${room.code}.ydk`,toYdk(mine.picks));
board.onpointerdown=e=>{const d=e.target.closest('.bc');if(!d)return;const r=board.getBoundingClientRect();
  drag={d,ox:e.clientX-r.left-d.offsetLeft,oy:e.clientY-r.top-d.offsetTop};d.setPointerCapture(e.pointerId);d.style.zIndex=++zi;d.classList.add('drag');e.preventDefault()};
board.onpointermove=e=>{if(!drag)return;const r=board.getBoundingClientRect();
  drag.d.style.left=Math.min(Math.max(0,e.clientX-r.left-drag.ox),board.clientWidth-BW)+'px';drag.d.style.top=Math.max(0,e.clientY-r.top-drag.oy)+'px'};
board.onpointerup=board.onpointercancel=()=>{if(!drag)return;pos[drag.d.dataset.k]=[drag.d.offsetLeft,drag.d.offsetTop];drag.d.classList.remove('drag');drag=null;layout()};

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
renderBoard();
if(room.status=='done'&&me&&!saved){saved=true;saveDraft(me)}
if(drafting&&host&&players.every(p=>p.chosen!=null))advance().then(sched)}
paint();return()=>sb.removeChannel(ch)}