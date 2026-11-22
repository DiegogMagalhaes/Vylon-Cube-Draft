import { $, app, esc, cardEl, copy, shuffle, RAR, RC } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';
import { toYdke } from '../ydke.js';

// ---------- Sala / draft em tempo real ----------
export async function roomView(code){code=(code||'').toUpperCase();
let{data:room}=await sb.from('rooms').select('*').eq('code',code).maybeSingle();
if(!room){app.innerHTML='<div class=box>Sala não encontrada.</div>';return}
let players=[],busy=false,saved=false,tm;
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

function paint(){const me=players.find(p=>p.user_id==state.user.id),host=room.host==state.user.id,s=room.settings;
let h=`<div class=box><div class=row><h2 style="margin:0">Sala ${room.code}</h2><button class=g id=cp>Copiar link de convite</button><span class=mu>${esc(room.cube_name)} · ${s.packs} pacotes × ${s.size} cartas${Object.keys(s.rar).length?' · '+Object.entries(s.rar).map(e=>e[1]+' '+e[0]).join(', '):''}</span></div><p>Jogadores: ${players.map(p=>esc(p.username)+(room.status=='drafting'?(p.chosen!=null?' ✓':' …'):'')).join(' · ')}</p></div>`;
if(!me)h+='<div class=box>Esta sala já foi iniciada.</div>';
else if(room.status=='lobby')h+=host?`<div class=box><button id=st>Iniciar draft (${players.length} jogador${players.length>1?'es':''})</button></div>`:'<div class=box>Aguardando o host iniciar…</div>';
else if(room.status=='drafting')h+=`<div class=box><h3>Pacote ${room.state.round+1}/${s.packs} · escolha ${me.picks.length+1}</h3><p class=mu>Clique numa carta para escolher (dá para trocar até todos escolherem).</p><div class=grid>${me.hand.map((c,k)=>cardEl(c,'pk'+(me.chosen==k?' sel':''),`data-k=${k}`)).join('')}</div></div>`;
else h+=`<div class=box><h3>Draft finalizado ✓</h3><button id=yd>Copiar YDKE</button> <span class=mu>Salvo no seu histórico.</span></div>`;
if(me)h+=`<div class=box><h3>Suas escolhas (${me.picks.length})</h3><div class=grid>${me.picks.map(c=>cardEl(c)).join('')}</div></div>`;
app.innerHTML=h;
$('#cp').onclick=()=>copy(location.href);
if($('#st'))$('#st').onclick=start;
if($('#yd'))$('#yd').onclick=()=>copy(toYdke(me.picks));
app.querySelectorAll('.pk').forEach(el=>el.onclick=()=>sb.from('room_players').update({chosen:+el.dataset.k}).eq('id',me.id).then(sched));
if(room.status=='done'&&me&&!saved){saved=true;sb.from('drafts').upsert({user_id:state.user.id,room_id:room.id,cube_name:room.cube_name,settings:s,picks:me.picks},{onConflict:'user_id,room_id',ignoreDuplicates:true})}
if(room.status=='drafting'&&host&&players.every(p=>p.chosen!=null))advance().then(sched)}
paint();return()=>sb.removeChannel(ch)}
