// Regras do draft: montar os pacotes, iniciar e avançar as escolhas.
import { sb } from '../../supabase.js';
import { shuffle } from '../../utils.js';

export async function fetchPlayers(roomId) {
  const { data } = await sb
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('seat')
    .order('created_at');
  return data || [];
}

// Tira do `pool` as cartas de um pacote, respeitando a quantidade por raridade.
// O que sobrar até completar `size` vem de qualquer raridade.
function makePack(pool, { size, rar }) {
  const pack = [];
  for (const [rarity, count] of Object.entries(rar)) {
    for (let n = 0; n < count; n++) {
      const index = pool.findIndex((card) => card.r === rarity);
      if (index < 0) throw new Error(`Faltam cartas da raridade ${rarity}`);
      pack.push(...pool.splice(index, 1));
    }
  }
  while (pack.length < size) pack.push(pool.pop());
  return shuffle(pack);
}

// Sorteia todos os pacotes e entrega a 1ª rodada. Só o host chama.
export async function startDraft(room, players) {
  const { packs, size } = room.settings;
  const { data: cube } = await sb.from('cubes').select('cards').eq('id', room.cube_id).single();

  const needed = players.length * packs * size;
  if (cube.cards.length < needed) {
    throw new Error(`O cubo tem ${cube.cards.length} cartas e são necessárias ${needed}.`);
  }

  const pool = shuffle([...cube.cards]);
  // rounds[rodada][assento] = pacote daquele jogador
  const rounds = Array.from({ length: packs }, () =>
    players.map(() => makePack(pool, room.settings)),
  );

  await Promise.all(
    players.map((p, seat) =>
      sb
        .from('room_players')
        .update({ seat, hand: rounds[0][seat], picks: [], chosen: null })
        .eq('id', p.id),
    ),
  );
  await sb
    .from('rooms')
    .update({ status: 'drafting', state: { round: 0, rounds } })
    .eq('id', room.id);
}

// Quando todos escolheram: guarda as cartas, passa os pacotes e abre a próxima rodada.
// Relê o banco antes de agir para nunca avançar duas vezes.
export async function advanceDraft(roomId) {
  const players = await fetchPlayers(roomId);
  const { data: room } = await sb.from('rooms').select('state,status').eq('id', roomId).single();

  const everyonePicked = players.every((p) => p.chosen != null && p.chosen < p.hand.length);
  if (room.status !== 'drafting' || !everyonePicked) return;

  const { round, rounds } = room.state;
  const direction = round % 2 ? -1 : 1; // rodadas pares passam para um lado, ímpares para o outro
  const total = players.length;

  // 1) cada jogador fica com a carta escolhida
  const after = players.map((p) => ({
    ...p,
    picks: [...p.picks, p.hand[p.chosen]],
    hand: p.hand.filter((_, i) => i !== p.chosen),
  }));

  // 2) decide o que cada jogador recebe agora
  let nextRound = round;
  let status = 'drafting';
  let hands;
  if (after[0].hand.length > 0) {
    hands = after.map((_, seat) => after[(seat - direction + total) % total].hand); // passa o pacote
  } else if (round + 1 < rounds.length) {
    nextRound = round + 1;
    hands = rounds[nextRound]; // pacotes novos
  } else {
    status = 'done';
    hands = after.map(() => []);
  }

  await Promise.all(
    after.map((p, seat) =>
      sb
        .from('room_players')
        .update({ picks: p.picks, hand: hands[seat], chosen: null })
        .eq('id', p.id),
    ),
  );
  await sb
    .from('rooms')
    .update({ status, state: { ...room.state, round: nextRound } })
    .eq('id', roomId);
}
