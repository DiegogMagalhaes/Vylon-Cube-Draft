import { $, app, esc } from '../utils.js';
import { sb } from '../supabase.js';
import { state, uname } from '../auth.js';

// ---------- Jogar: criar/entrar em sala ----------
export async function playView() {
  const { data: cubes } = await sb
    .from('cubes')
    .select('id,name,cards')
    .order('created_at', { ascending: false });
  app.innerHTML = `<div class=box><h3>Entrar em sala</h3><div class=row><input id=cd placeholder="Código" maxlength=5><button id=jn>Entrar</button></div></div>
<div class=box><h3>Criar sala</h3>${cubes?.length ? `<div class=row><select id=cb>${cubes.map((c) => `<option value="${c.id}">${esc(c.name)} (${c.cards.length})</option>`).join('')}</select><label>Pacotes <input id=np type=number value=3 min=1 style="width:70px"></label><label>Cartas/pacote <input id=sz type=number value=15 min=1 style="width:70px"></label></div><p class=mu>Cartas por raridade em cada pacote (o restante é sorteado do cubo):</p><div class=row id=rr></div><p><button id=cr>Criar sala</button></p>` : '<p class=mu>Importe um cubo na aba Pool primeiro.</p>'}</div>`;
  $('#jn').onclick = () => {
    if ($('#cd').value) location.hash = '#/room/' + $('#cd').value.toUpperCase();
  };
  if (!cubes?.length) return;
  const rr = () => {
    const c = cubes.find((x) => x.id == $('#cb').value);
    $('#rr').innerHTML = [...new Set(c.cards.map((x) => x.r))]
      .map(
        (r) =>
          `<label>${esc(r)} <input type=number min=0 value=0 data-r="${esc(r)}" style="width:60px"></label>`,
      )
      .join('');
  };
  $('#cb').onchange = rr;
  rr();
  $('#cr').onclick = async () => {
    const rar = {};
    document.querySelectorAll('#rr input').forEach((i) => {
      if (+i.value) rar[i.dataset.r] = +i.value;
    });
    const size = +$('#sz').value;
    if (Object.values(rar).reduce((a, b) => a + b, 0) > size)
      return alert('A soma das raridades passa de cartas por pacote.');
    const cb = cubes.find((x) => x.id == $('#cb').value),
      code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const { data: room, error } = await sb
      .from('rooms')
      .insert({
        code,
        cube_id: cb.id,
        cube_name: cb.name,
        settings: { packs: +$('#np').value, size, rar },
      })
      .select()
      .single();
    if (error) return alert(error.message);
    await sb
      .from('room_players')
      .insert({ room_id: room.id, user_id: state.user.id, username: uname(), seat: 0 });
    location.hash = '#/room/' + code;
  };
}
