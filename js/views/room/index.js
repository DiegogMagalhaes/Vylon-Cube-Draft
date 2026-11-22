// Tela da sala: lobby, escolha de cartas em tempo real e deck final.
import { app, esc, cardEl, copy } from '../../utils.js';
import { sb } from '../../supabase.js';
import { state, uname } from '../../auth.js';
import { fetchPlayers, startDraft, advanceDraft } from './draft.js';
import { createDeckbuilder } from './deckbuilder.js';

// Retorna uma função de limpeza (encerra a conexão em tempo real ao sair da sala).
export async function roomView(rawCode) {
  const code = (rawCode || '').toUpperCase();
  let { data: room } = await sb.from('rooms').select('*').eq('code', code).maybeSingle();
  if (!room) {
    app.innerHTML = '<div class="box">Sala não encontrada.</div>';
    return;
  }

  let players = await fetchPlayers(room.id);
  let advancing = false; // evita avançar a rodada duas vezes ao mesmo tempo
  let historySaved = false;
  let saveStatus = { message: 'Salvando no histórico…', failed: false };
  let refreshTimer;

  await joinIfLobby();
  app.innerHTML = `
    <div id="room-info"></div>
    <div id="room-stage"></div>
    <div id="room-deck"></div>`;
  const deckbuilder = createDeckbuilder({
    mount: $('#room-deck'),
    roomId: room.id,
    roomCode: room.code,
  });
  const channel = subscribeToChanges();
  paint();
  return () => sb.removeChannel(channel);

  // ---------- entrar e acompanhar a sala ----------
  async function joinIfLobby() {
    const isMember = players.some((p) => p.user_id === state.user.id);
    if (isMember || room.status !== 'lobby') return;
    await sb.from('room_players').insert({
      room_id: room.id,
      user_id: state.user.id,
      username: uname(),
      seat: players.length,
    });
    players = await fetchPlayers(room.id);
  }

  function subscribeToChanges() {
    const table = (name, filter) => ({ event: '*', schema: 'public', table: name, filter });
    return sb
      .channel(`room-${room.id}`)
      .on('postgres_changes', table('room_players', `room_id=eq.${room.id}`), scheduleRefresh)
      .on('postgres_changes', table('rooms', `id=eq.${room.id}`), scheduleRefresh)
      .subscribe();
  }

  async function refresh() {
    room = (await sb.from('rooms').select('*').eq('id', room.id).single()).data;
    players = await fetchPlayers(room.id);
    paint();
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer); // junta várias mudanças seguidas em uma só atualização
    refreshTimer = setTimeout(refresh, 150);
  }

  // ---------- ações ----------
  async function start() {
    try {
      await startDraft(room, players);
    } catch (error) {
      alert(error.message);
    }
  }

  async function advance() {
    if (advancing) return;
    advancing = true;
    try {
      await advanceDraft(room.id);
    } finally {
      advancing = false;
    }
    scheduleRefresh();
  }

  async function pick(me, handIndex) {
    await sb.from('room_players').update({ chosen: handIndex }).eq('id', me.id);
    scheduleRefresh();
  }

  async function saveDraft(me) {
    const { error } = await sb.from('drafts').insert({
      user_id: state.user.id,
      room_id: room.id,
      cube_name: room.cube_name,
      settings: room.settings,
      picks: me.picks,
    });
    const failed = Boolean(error) && error.code !== '23505'; // 23505 = já estava salvo
    saveStatus = {
      failed,
      message: failed ? `Erro ao salvar: ${error.message}` : 'Salvo no histórico ✓',
    };
    paint();
  }

  // ---------- desenho ----------
  function paint() {
    if (!$('#room-info')) return; // a tela já foi fechada
    const me = players.find((p) => p.user_id === state.user.id);
    const isHost = room.host === state.user.id;
    const drafting = room.status === 'drafting';

    $('#room-info').innerHTML = headerHtml(drafting);
    $('#room-stage').innerHTML = stageHtml(me, isHost);
    bindEvents(me);
    deckbuilder.setPicks(me ? me.picks : []);

    if (room.status === 'done' && me && !historySaved) {
      historySaved = true;
      saveDraft(me);
    }
    if (drafting && isHost && players.every((p) => p.chosen != null)) advance();
  }

  function bindEvents(me) {
    $('#btn-invite').onclick = () => copy(location.href);
    if ($('#btn-start')) $('#btn-start').onclick = start;
    if ($('#btn-retry')) $('#btn-retry').onclick = () => saveDraft(me);
    app.querySelectorAll('.pk').forEach((el) => {
      el.onclick = () => pick(me, Number(el.dataset.k));
    });
  }

  function headerHtml(drafting) {
    const { packs, size, rar } = room.settings;
    const rarities = Object.entries(rar)
      .filter(([, count]) => count)
      .map(([rarity, count]) => `${count} ${rarity}`)
      .join(' · ');
    const chips = players
      .map((p) => {
        const dot = drafting ? `<i class="dot ${p.chosen != null ? '' : 'w'}"></i>` : '';
        const star = p.user_id === room.host ? ' ★' : '';
        return `<span class="chip">${dot}${esc(p.username)}${star}</span>`;
      })
      .join('');
    return `
      <div class="box">
        <div class="row">
          <div>
            <div class="mu" style="font-size:11px;letter-spacing:.15em">SALA</div>
            <div class="code">${esc(room.code)}</div>
          </div>
          <div style="flex:1">
            <div><b>${esc(room.cube_name)}</b></div>
            <div class="mu">${packs} pacotes × ${size} cartas${rarities ? ` · ${rarities}` : ''}</div>
          </div>
          <button class="g" id="btn-invite">Copiar link de convite</button>
        </div>
        <div class="row" style="margin-top:12px">${chips}</div>
      </div>`;
  }

  function stageHtml(me, isHost) {
    if (!me) return '<div class="box">Esta sala já foi iniciada.</div>';
    if (room.status === 'lobby') return lobbyHtml(isHost);
    if (room.status === 'drafting') return packHtml(me);
    return finishedHtml();
  }

  function lobbyHtml(isHost) {
    const plural = players.length > 1 ? 'es' : '';
    const action = isHost
      ? `<button id="btn-start">Iniciar draft (${players.length} jogador${plural})</button>`
      : '<p class="mu">Aguardando o host iniciar…</p>';
    return `
      <div class="box center">
        <h3>Sala de espera</h3>
        <p class="mu">Convide os jogadores com o código <b>${esc(room.code)}</b> ou pelo link.</p>
        ${action}
      </div>`;
  }

  function packHtml(me) {
    const { packs, size } = room.settings;
    const progress = Math.round((me.picks.length / (packs * size)) * 100);
    const hint =
      me.chosen != null
        ? 'Aguardando os outros jogadores… (você pode trocar a escolha)'
        : 'Escolha uma carta';
    const cards = me.hand
      .map((card, i) => cardEl(card, `pk${me.chosen === i ? ' sel' : ''}`, `data-k="${i}"`))
      .join('');
    return `
      <div class="box">
        <div class="row">
          <h3 style="margin:0">Pacote ${room.state.round + 1}/${packs}</h3>
          <span class="mu">Escolha ${size - me.hand.length + 1} de ${size}</span>
          <span style="flex:1"></span>
          <span class="mu">${hint}</span>
        </div>
        <div class="bar"><i style="width:${progress}%"></i></div>
        <div class="pack">${cards}</div>
      </div>`;
  }

  function finishedHtml() {
    const retry = saveStatus.failed
      ? '<button class="g" id="btn-retry">Tentar salvar de novo</button>'
      : '';
    return `
      <div class="box center">
        <h3>Draft finalizado</h3>
        <p class="mu">${esc(saveStatus.message)}</p>
        ${retry}
      </div>`;
  }
}
