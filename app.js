const cardArt = {
  jinxLegend: 'https://openrift.app/media/cards/b2/734d72cf-5e39-4e92-bc48-57cdcebc60b2-full.webp',
  jinxRebel: 'https://openrift.app/media/cards/35/6b1025c9-3793-43f0-aa45-b568236fa135-full.webp',
  viktorLegend: 'https://openrift.app/media/cards/74/9319a89a-a09a-4623-b945-f4fa34a1b674-full.webp',
  viktorLeader: 'https://openrift.app/media/cards/dd/544df4e8-7d43-4ffa-a9b1-3a08e8be6add-full.webp',
  teemoLegend: 'https://openrift.app/media/cards/74/44108736-b705-47dd-9793-e0d08cb7ee74-full.webp',
  altar: 'https://openrift.app/media/cards/fd/1d70eb16-56be-499a-8ef9-0de742766cfd-full.webp',
  bandle: 'https://openrift.app/media/cards/43/9e889364-eb80-4c06-9d83-7b44ce6fdc43-full.webp',
  navori: 'https://openrift.app/media/cards/e6/ea0d4f7f-f324-4c3c-a441-7550e7d51be6-full.webp',
};

const battlefields = [
  { id: 'altar', code: 'OGN-275', name: 'Altar to Unity', text: 'Escenario de Origins. Consulta su texto para resolver sus habilidades.', image: cardArt.altar },
  { id: 'bandle', code: 'OGN-278', name: 'Bandle Tree', text: 'Escenario de Origins. Consulta su texto para resolver sus habilidades.', image: cardArt.bandle },
  { id: 'navori', code: 'OGN-283', name: 'Navori Fighting Pit', text: 'Escenario de Origins. Consulta su texto para resolver sus habilidades.', image: cardArt.navori },
];

const decks = {
  jinx: { key: 'jinx', legendCode: 'OGN-251', championCode: 'OGN-202', name: 'Jinx, Loose Cannon', champion: 'Jinx, Rebel', domains: ['fury', 'chaos'], image: cardArt.jinxLegend, championImage: cardArt.jinxRebel, legendText: '', description: 'Furia + Caos · presión y descarte', cards: [] },
  viktor: { key: 'viktor', legendCode: 'OGN-265', championCode: 'OGN-246', name: 'Viktor, Herald of the Arcane', champion: 'Viktor, Leader', domains: ['mind', 'order'], image: cardArt.viktorLegend, championImage: cardArt.viktorLeader, legendText: '', description: 'Mente + Orden · mejoras y control', cards: [] },
  teemo: { key: 'teemo', legendCode: 'OGN-263', championCode: 'OGN-197', name: 'Teemo, Swift Scout', champion: 'Teemo, Scout', domains: ['mind', 'chaos'], image: cardArt.teemoLegend, championImage: cardArt.teemoLegend, legendText: '', description: 'Mente + Caos · exploración y trucos', cards: [] },
};

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);
const catalogCards = () => globalThis.EL_RIFTY_CATALOG?.cards || [];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const otherPlayer = id => id === 0 ? 1 : 0;

function domainLabel(domain) {
  return { fury: 'FURIA', chaos: 'CAOS', mind: 'MENTE', order: 'ORDEN', body: 'CUERPO', calm: 'CALMA' }[domain] || String(domain || '').toUpperCase();
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) { const target = Math.floor(Math.random() * (index + 1)); [result[index], result[target]] = [result[target], result[index]]; }
  return result;
}

function cardForTable(card) {
  return { name: card.name, image: card.image, type: card.type === 'Unit' ? 'Unidad' : 'Hechizo', cost: Number(card.energy || 0), might: Number(card.might || 0), rules: card.text || 'Consulta el texto impreso de esta carta.', code: card.code };
}

function makeLegalPracticeMainDeck(deck) {
  const names = new Set(); const domains = new Set(deck.domains);
  const legalCards = catalogCards().filter(card => ['Unit', 'Spell'].includes(card.type) && !card.isBanned && card.domains.length && card.domains.every(domain => domains.has(domain)) && !card.tags.some(tag => tag.toLowerCase() === 'signature') && card.name !== deck.champion)
    .sort((a, b) => Number(a.energy || 0) - Number(b.energy || 0) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code))
    .filter(card => !names.has(card.name) && names.add(card.name));
  const candidates = [...legalCards.filter(card => card.type === 'Unit').slice(0, 8), ...legalCards.filter(card => card.type === 'Spell').slice(0, 5)];
  return candidates.length === 13 ? candidates.flatMap(card => Array.from({ length: 3 }, () => cardForTable(card))) : [];
}

function applyIncludedPracticeDecks() {
  const cards = catalogCards(); if (!cards.length) return;
  Object.values(decks).forEach(deck => {
    const legend = cards.find(card => card.code === deck.legendCode); const champion = cards.find(card => card.code === deck.championCode);
    if (!legend || !champion) return;
    deck.name = legend.name; deck.champion = champion.name; deck.domains = legend.domains; deck.image = legend.image; deck.championImage = champion.image; deck.legendText = legend.text; deck.cards = makeLegalPracticeMainDeck(deck);
  });
  battlefields.forEach(field => { const card = cards.find(item => item.code === field.code); if (card) { field.name = card.name; field.text = card.text || field.text; field.image = card.image; } });
}

function cloneCards(deck) {
  return deck.cards.map((card, index) => ({ ...card, uid: `${deck.key}-${index}-${Math.random().toString(16).slice(2)}` }));
}

function championForTable(deck, playerId) {
  const card = catalogCards().find(item => item.code === deck.championCode);
  return card ? { ...cardForTable(card), uid: `chosen-${playerId}-${Math.random().toString(16).slice(2)}` } : { name: deck.champion, image: deck.championImage, type: 'Unidad', cost: 0, might: 0, rules: '', uid: `chosen-${playerId}` };
}

function runeCardFor(domain) {
  const card = catalogCards().find(item => item.type === 'Rune' && item.domains.includes(domain) && item.image);
  return { domain, name: card?.name || `${domainLabel(domain)} Rune`, image: card?.image || '' };
}

function makeRuneDeck(deck) {
  return shuffle(deck.domains.flatMap(domain => Array.from({ length: 6 }, () => ({ ...runeCardFor(domain) }))));
}

applyIncludedPracticeDecks();

let setup = [{ deck: 'jinx', battlefield: 'altar' }, { deck: 'viktor', battlefield: 'navori' }];
let firstPlayerChoice = 0;
let state;
let faceToFace = false;

function renderSetup() {
  setup.forEach((selection, player) => {
    const current = decks[selection.deck];
    byId(`legendOptions${player}`).innerHTML = Object.values(decks).map(deck => `<button class="legend-option ${selection.deck === deck.key ? 'active' : ''}" data-select-deck="${deck.key}" data-player="${player}"><img src="${escapeHtml(deck.image)}" alt="${escapeHtml(deck.name)}"><span><h3>${escapeHtml(deck.name)}</h3><small>${escapeHtml(deck.description)}</small><span class="domains">${deck.domains.map(domain => `<i class="domain-chip ${domain}">${domainLabel(domain)}</i>`).join('')}</span></span></button>`).join('');
    const bringsBattlefield = player !== firstPlayerChoice;
    byId(`selectionSummary${player}`).innerHTML = `<b>Campeón elegido:</b> ${escapeHtml(current.champion)}<br><span>Runas asignadas: 6 ${domainLabel(current.domains[0])} + 6 ${domainLabel(current.domains[1])}</span><br><span>${bringsBattlefield ? 'Vas segundo: este será el escenario de la partida.' : 'Vas primero: tus escenarios se retiran en 1 vs 1.'}</span>`;
    byId(`battlefieldPicker${player}`).innerHTML = battlefields.map(field => `<button class="battlefield-choice ${selection.battlefield === field.id ? 'active' : ''}" data-select-field="${field.id}" data-player="${player}" ${bringsBattlefield ? '' : 'disabled'}><img src="${escapeHtml(field.image)}" alt=""><span>${escapeHtml(field.name)}</span></button>`).join('');
  });
  document.querySelectorAll('[data-first-player]').forEach(button => button.classList.toggle('active', Number(button.dataset.firstPlayer) === firstPlayerChoice));
}

function startGame() {
  const firstPlayer = firstPlayerChoice;
  const battlefieldPlayer = otherPlayer(firstPlayer);
  state = {
    turn: 1, active: firstPlayer, firstPlayer, phase: 'mulligan', priority: null, focus: null, priorityPasses: 0, responseWindow: false, chain: [], selected: null, selectedOwner: null, selectedFromChampion: false, selectedBoard: null, targetedField: null, showdown: null, winner: null,
    mulliganQueue: [firstPlayer, otherPlayer(firstPlayer)], mulliganSelected: [],
    players: setup.map((selection, id) => {
      const deck = decks[selection.deck]; const main = shuffle(cloneCards(deck));
      return { id, name: id === 0 ? 'Invocador azul' : 'Invocador rojo', deck, score: 0, hand: main.splice(0, 4), mainDeck: main, trash: [], board: [], runes: [], runeDeck: makeRuneDeck(deck), battlefield: selection.battlefield, championInZone: true, hasChanneled: false, hasChanneledBefore: false };
    }),
    fields: [{ id: setup[battlefieldPlayer].battlefield, source: battlefieldPlayer, controller: null, units: [] }],
  };
  $('#setupScreen').classList.add('hidden'); $('#gameScreen').classList.remove('hidden'); renderGame('Partida preparada. El primer jugador retira sus escenarios; ' + seatLabel(battlefieldPlayer) + ' aporta el único escenario de esta partida 1 vs 1. Resuelvan el mulligan en orden de turno.'); renderMulligan(); showModal('mulliganModal');
}

function runesAvailable(player) { return player.runes.filter(rune => !rune.exhausted).length; }
function getField(id) { return state.fields.find(field => field.id === id); }
function getCardArea(id) {
  if (String(id).startsWith('player-')) {
    const player = state.players[Number(String(id).slice(7))];
    return player ? { id, kind: 'board', owner: player.id, units: player.board, setUnits: units => { player.board = units; } } : null;
  }
  const field = getField(id);
  return field ? { id, kind: 'field', owner: null, units: field.units, setUnits: units => { field.units = units; } } : null;
}
function phaseLabel() { return ({ mulligan: 'Mulligan', awaken: 'Despertar', beginning: 'Inicio', channel: 'Canalización', draw: 'Robo', main: 'Fase principal', showdown: 'Confrontación', ending: 'Fase final' })[state.phase] || state.phase; }
function priorityName() { return state.priority === null ? 'Sin prioridad' : `Prioridad: ${state.players[state.priority].name}`; }
function canAct(playerId) { return !state.winner && ['main', 'showdown'].includes(state.phase) && state.priority === playerId; }
function seatLabel(id) { return id === 0 ? 'JUGADOR AZUL' : 'JUGADOR ROJO'; }
function controllerPrompt() {
  if (state.phase === 'mulligan') return 'Mulligan de ' + seatLabel(state.mulliganQueue[0]) + ': elige hasta 2 cartas y confirma.';
  if (state.phase === 'showdown') return 'Confrontación abierta: ambos jugadores cuentan Might y registran el resultado manualmente.';
  if (state.priority === null) return 'Acciones del paso: ' + seatLabel(state.active) + ' sigue la fase actual.';
  return 'Entrega el dispositivo a ' + seatLabel(state.priority) + '. El otro jugador espera o responde cuando reciba prioridad.';
}

function legacyPlayerMat(player) {
  const isOpponent = player.id === 1; const canSeeHand = canAct(player.id);
  const handCards = player.hand.map(card => canSeeHand ? `<button class="hand-card ${state.selected?.uid === card.uid ? 'selected' : ''}" data-card="${card.uid}" draggable="true" aria-label="${escapeHtml(card.name)}"><img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}"></button>` : '<div class="hand-card" title="Carta privada"><div class="card-back">✦</div></div>').join('');
  const runes = player.runes.map((rune, index) => `<button class="rune ${rune.domain} ${rune.exhausted ? 'exhausted' : ''}" data-rune-player="${player.id}" data-rune="${index}" title="${escapeHtml(rune.name)} · ${rune.exhausted ? 'agotada' : 'lista'}">${rune.image ? `<img src="${escapeHtml(rune.image)}" alt="${escapeHtml(rune.name)}">` : '<span>✦</span>'}</button>`).join('') || '<span class="zone-empty">Canaliza runas</span>';
  const runeBack = player.runeDeck[0]?.image ? `style="background-image:url('${escapeHtml(player.runeDeck[0].image)}')"` : '';
  return `<div class="mat-inner ${isOpponent ? 'upside' : ''}"><div class="zone"><span class="zone-label">MAZO PRINCIPAL</span><span class="zone-count">${player.mainDeck.length}</span><div class="deck-card main"></div></div><div class="zone"><span class="zone-label">MAZO DE RUNAS</span><span class="zone-count">${player.runeDeck.length}</span><div class="deck-card rune" ${runeBack}></div></div><div class="zone"><span class="zone-label">RUNAS · ${runesAvailable(player)} listas</span><div class="runes-area">${runes}</div></div><div class="zone champion-holder"><span class="zone-label">CAMPEÓN ELEGIDO</span><div class="champion-zone">${player.championInZone ? `<button class="champion-card" data-champion="${player.id}" aria-label="Seleccionar ${escapeHtml(player.deck.champion)}"><img src="${escapeHtml(player.deck.championImage)}" alt="${escapeHtml(player.deck.champion)}"></button>` : '<span class="zone-empty">En juego o fuera de zona</span>'}</div></div><div class="zone legend-holder"><span class="zone-label">LEYENDA</span><div class="legend-zone"><img src="${escapeHtml(player.deck.image)}" alt="${escapeHtml(player.deck.name)}"></div></div><div class="zone board-zone" style="grid-column:1 / span 5"><span class="zone-label">DESECHOS</span><span class="zone-empty">${player.trash.length ? `${player.trash.length} cartas` : 'Sin cartas'}</span></div></div><div class="hand-zone" aria-label="${isOpponent ? 'Mano oponente' : 'Tu mano'}">${handCards || '<span class="zone-empty">Sin cartas en mano</span>'}</div><div class="hand-caption">${canSeeHand ? `${isOpponent ? 'MANO ROJA' : 'MANO AZUL'} · ${player.hand.length} CARTAS` : `${isOpponent ? 'MANO DEL OPONENTE' : 'MANO PRIVADA'}`}</div>`;
}

function playerMat(player) {
  const isOpponent = player.id === 1;
  const canSeeHand = canAct(player.id);
  const handCards = player.hand.map(card => {
    if (!canSeeHand) return '<div class="hand-card" title="Carta privada"><div class="card-back">✦</div></div>';
    return '<button class="hand-card ' + (state.selected?.uid === card.uid ? 'selected' : '') + '" data-card="' + card.uid + '" draggable="true" aria-label="' + escapeHtml(card.name) + '"><img src="' + escapeHtml(card.image) + '" alt="' + escapeHtml(card.name) + '"></button>';
  }).join('');
  const runes = player.runes.map((rune, index) => {
    const face = rune.image ? '<img src="' + escapeHtml(rune.image) + '" alt="' + escapeHtml(rune.name) + '">' : '<span>✦</span>';
    return '<button class="rune ' + rune.domain + ' ' + (rune.exhausted ? 'exhausted' : '') + '" data-rune-player="' + player.id + '" data-rune="' + index + '" title="' + escapeHtml(rune.name) + ' · ' + (rune.exhausted ? 'agotada' : 'lista') + '">' + face + '</button>';
  }).join('') || '<span class="zone-empty">Canaliza runas</span>';
  const runeBack = player.runeDeck[0]?.image ? 'style="background-image:url(' + escapeHtml(player.runeDeck[0].image) + ')"' : '';
  const boardCards = player.board.map(unit => miniCard(unit, 'player-' + player.id)).join('') || '<span class="zone-empty">Juega unidades aquí; después arrástralas al escenario.</span>';
  const handCaption = canSeeHand ? 'MANO DE ' + seatLabel(player.id) + ' · ' + player.hand.length + ' CARTAS' : 'MANO DE ' + seatLabel(player.id) + ' · ESPERANDO PRIORIDAD';
  return '<div class="mat-inner playmat-layout ' + (isOpponent ? 'team-red' : 'team-blue') + '">'
    + '<section class="zone rune-deck-zone"><span class="zone-label">MAZO DE RUNAS</span><span class="zone-count">' + player.runeDeck.length + '</span><div class="deck-card rune" ' + runeBack + '></div></section>'
    + '<section class="zone runes-zone"><span class="zone-label">RUNAS · ' + runesAvailable(player) + ' LISTAS</span><div class="runes-area">' + runes + '</div></section>'
    + '<section class="zone staging-zone" data-drop-player-board="' + player.id + '"><span class="zone-label">ZONA DE DESPLIEGUE · ENTRADA DESDE MANO</span><div class="staging-cards">' + boardCards + '</div></section>'
    + '<section class="zone legend-holder"><span class="zone-label">LEYENDA SELECCIONADA</span><div class="legend-zone"><img src="' + escapeHtml(player.deck.image) + '" alt="' + escapeHtml(player.deck.name) + '"></div></section>'
    + '<section class="zone champion-holder"><span class="zone-label">CAMPEÓN SELECCIONADO</span><div class="champion-zone">' + (player.championInZone ? '<button class="champion-card" data-champion="' + player.id + '" aria-label="Seleccionar ' + escapeHtml(player.deck.champion) + '"><img src="' + escapeHtml(player.deck.championImage) + '" alt="' + escapeHtml(player.deck.champion) + '"></button>' : '<span class="zone-empty">En juego o fuera de zona</span>') + '</div></section>'
    + '<section class="zone main-deck-zone"><span class="zone-label">MAZO DE CARTAS</span><span class="zone-count">' + player.mainDeck.length + '</span><div class="deck-card main"></div></section>'
    + '<section class="zone trash-zone"><span class="zone-label">BASURA / DESECHOS</span><span class="zone-empty">' + (player.trash.length ? player.trash.length + ' cartas' : 'Sin cartas') + '</span></section>'
    + '</div><div class="hand-zone" aria-label="' + (isOpponent ? 'Mano del jugador rojo' : 'Mano del jugador azul') + '">' + (handCards || '<span class="zone-empty">Sin cartas en mano</span>') + '</div><div class="hand-caption">' + handCaption + '</div>';
}

function miniCard(unit, fieldId) {
  const selected = state.selectedBoard?.uid === unit.card.uid;
  const classes = ['unit-mini', unit.exhausted ? 'exhausted-unit' : '', unit.faceDown ? 'card-hidden' : '', selected ? 'selected-board' : ''].filter(Boolean).join(' ');
  const angle = Number(unit.rotation || 0);
  const tapped = unit.exhausted ? 90 : 0;
  const face = unit.faceDown ? '<div class="card-back">✦</div>' : `<img src="${escapeHtml(unit.card.image)}" alt="${escapeHtml(unit.card.name)}">`;
  return `<button class="${classes}" style="--manual-rotation:${angle}deg;--tapped-rotation:${tapped}deg" data-board-card="${unit.card.uid}" data-board-field="${fieldId}" draggable="${canAct(unit.owner)}" aria-label="${unit.faceDown ? 'Carta oculta' : escapeHtml(unit.card.name)}">${face}<span class="board-card-badge">${unit.faceDown ? 'OCULTA' : unit.card.might || '•'}</span></button>`;
}

function renderBattlefields() {
  byId('battlefieldRow').innerHTML = state.fields.map(field => {
    const details = battlefields.find(item => item.id === field.id); const units = field.units.map(unit => miniCard(unit, field.id)).join('');
    const owner = field.controller === null ? { class: 'neutral', text: 'NEUTRAL' } : field.controller === 0 ? { class: 'blue', text: 'AZUL CONTROLA' } : { class: 'red', text: 'ROJO CONTROLA' };
    const sourceLabel = field.source === 0 ? 'ESCENARIO AZUL' : 'ESCENARIO ROJO';
    const showdownTools = state.showdown === field.id ? `<div class="showdown-tools"><span>Registra el resultado:</span><button data-conquer="0" data-showdown-field="${field.id}">Azul</button><button data-conquer="1" data-showdown-field="${field.id}">Rojo</button><button data-conquer="none" data-showdown-field="${field.id}">Empate</button></div>` : '';
    return `<article class="battlefield ${state.targetedField === field.id ? 'targeted' : ''} ${state.showdown === field.id ? 'in-showdown' : ''}" data-field="${field.id}" data-drop-field="${field.id}"><img class="battlefield-art" src="${escapeHtml(details.image)}" alt=""><div class="scenario-card"><span>${sourceLabel}</span><img src="${escapeHtml(details.image)}" alt="${escapeHtml(details.name)}"></div><div class="battlefield-content"><div class="battlefield-top"><h3>${escapeHtml(details.name)}</h3><span class="owner-badge ${owner.class}">${owner.text}</span></div><div class="battlefield-bottom"><p class="battlefield-note">${escapeHtml(details.text)}</p><div class="battle-units">${units}</div></div>${showdownTools}</div></article>`;
  }).join('');
}

function renderGame(message) {
  byId('mat0').innerHTML = playerMat(state.players[0]); byId('mat1').innerHTML = playerMat(state.players[1]); renderBattlefields();
  [0, 1].forEach(id => {
    const caption = byId('mat' + id).querySelector('.hand-caption');
    if (caption) caption.textContent = canAct(id) ? 'MANO DE ' + seatLabel(id) + ' · ' + state.players[id].hand.length + ' CARTAS' : 'MANO DE ' + seatLabel(id) + ' · ESPERANDO PRIORIDAD';
  });
  byId('score0').textContent = state.players[0].score; byId('score1').textContent = state.players[1].score;
  const active = state.players[state.active]; byId('turnPlayer').textContent = active.name; byId('turnLabel').textContent = `Turno ${state.turn} · ${phaseLabel()}`;
  byId('turnPip').style.background = state.active === 0 ? 'var(--blue)' : 'var(--red)'; byId('turnPip').style.boxShadow = `0 0 11px ${state.active === 0 ? 'var(--blue)' : 'var(--red)'}`;
  const banner = byId('turnBanner');
  if (banner) {
    const headline = state.phase === 'mulligan' ? 'MULLIGAN' : seatLabel(state.active);
    const turnKind = state.phase === 'mulligan' ? 'PREPARACIÓN' : 'JUGADOR ACTIVO';
    banner.className = 'turn-banner ' + (state.active === 0 ? 'blue' : 'red');
    banner.innerHTML = '<div class="turn-banner-row"><div><span class="turn-kicker">TURNO ' + state.turn + ' · ' + turnKind + '</span><strong>' + headline + '</strong><p>' + phaseLabel() + ' · ' + priorityName() + '</p></div><div class="handoff">' + controllerPrompt() + '</div></div>';
  }
  byId('priorityReadout').innerHTML = `<b>${priorityName()}</b><small>${state.chain.length ? `Cadena: ${state.chain.map(item => escapeHtml(item.name)).join(' → ')}` : state.responseWindow ? 'Ventana de respuesta abierta' : state.phase === 'main' ? 'Pasa prioridad para dar respuesta' : 'Sigue las fases en orden'}</small>`;
  if (message) byId('actionMessage').textContent = message;
  const mainWithPriority = state.phase === 'main' && state.priority === state.active;
  byId('channelRunes').disabled = state.phase !== 'channel' || active.runeDeck.length === 0 || active.hasChanneled || Boolean(state.winner);
  const channelCount = !active.hasChanneledBefore && active.id !== state.firstPlayer ? 3 : 2; byId('channelRunes').textContent = active.hasChanneled ? 'Runas canalizadas' : `Canalizar ${channelCount} runas`;
  const unitReady = state.selected && state.selectedOwner === state.active && state.selected.type.includes('Unidad') && mainWithPriority;
  const spellReady = state.selected && state.selectedOwner === state.priority && state.selected.type.includes('Hechizo') && canAct(state.priority);
  byId('playCard').disabled = !(unitReady || spellReady); byId('playCard').textContent = unitReady ? 'Jugar a despliegue' : spellReady ? 'Anunciar hechizo' : 'Jugar carta';
  byId('passPriority').disabled = !canAct(state.priority); byId('passPriority').textContent = state.priority === null ? 'Pasar prioridad' : `Ceder prioridad a ${state.players[otherPlayer(state.priority)].name.split(' ')[1] || 'rival'}`;
  byId('resolveShowdown').disabled = true; byId('resolveShowdown').textContent = state.showdown ? 'Confrontación en curso' : 'Mover abre confrontación';
  byId('nextTurn').disabled = Boolean(state.winner) || state.phase === 'mulligan' || Boolean(state.chain.length) || (state.phase === 'channel' && !active.hasChanneled && active.runeDeck.length > 0); byId('nextTurn').textContent = ({ awaken: 'Ir a inicio →', beginning: 'Ir a canalización →', channel: 'Ir a robo →', draw: 'Ir a fase principal →', main: 'Ir a fase final →', ending: 'Pasar batuta →' })[state.phase] || 'Siguiente fase →';
  const boardSelection = selectedBoardItem();
  const boardReady = Boolean(boardSelection && canAct(boardSelection.unit.owner));
  byId('tapCard').disabled = !boardReady; byId('tapCard').textContent = boardSelection?.unit.exhausted ? 'Enderezar 90°' : 'Agotar 90°';
  byId('flipCard').disabled = !boardReady; byId('flipCard').textContent = boardSelection?.unit.faceDown ? 'Mostrar carta (Z)' : 'Voltear (Z)';
  byId('rotateCard').disabled = !boardReady; byId('rotateCard').textContent = 'Girar 180° (I)';
  byId('discardCard').disabled = !boardReady;
}

function selectCard(uid) {
  const player = state.players.find(item => item.hand.some(card => card.uid === uid)); if (!player || !canAct(player.id)) return;
  state.selected = player.hand.find(card => card.uid === uid); state.selectedOwner = player.id; state.selectedFromChampion = false; state.selectedBoard = null;
  renderGame(`${state.selected.name} seleccionada. ${state.selected.type.includes('Unidad') ? 'Júgala en tu zona de despliegue; después podrás arrastrarla al escenario.' : 'Anúnciala para abrir la ventana de respuesta.'}`);
}

function selectChampion(playerId) {
  state.selectedBoard = null;
  if (!canAct(playerId) || state.phase !== 'main') return; const player = state.players[playerId]; if (!player.championInZone) return;
  state.selected = championForTable(player.deck, playerId); state.selectedOwner = playerId; state.selectedFromChampion = true; renderGame(`${player.deck.champion} seleccionado desde la Zona de Campeón. Juega el campeón a tu Base; entrará agotado.`);
}

function selectField(id) {
  state.targetedField = id; const details = battlefields.find(item => item.id === id); const hasShowdown = canShowdown(getField(id));
  renderGame(details.name + ' seleccionado. ' + (hasShowdown ? 'Hay una confrontación disponible.' : 'Arrastra una unidad desde tu zona de despliegue a este escenario.'));
}

function readyControlledObjects(player) {
  player.runes.forEach(rune => { rune.exhausted = false; });
  player.board.forEach(unit => { unit.exhausted = false; });
  state.fields.forEach(field => field.units.filter(unit => unit.owner === player.id).forEach(unit => { unit.exhausted = false; }));
}

function beginTurn(message) {
  const player = state.players[state.active];
  state.phase = 'awaken'; state.priority = null; state.focus = state.active; state.priorityPasses = 0; state.responseWindow = false;
  state.selected = null; state.selectedBoard = null; state.targetedField = null; state.showdown = null; player.hasChanneled = false;
  readyControlledObjects(player);
  renderGame(message || player.name + ' despierta todas sus runas y unidades agotadas.');
}

function scoreBeginningPhase(player) {
  const controlled = state.fields.filter(field => field.controller === player.id).length;
  if (controlled) player.score += controlled;
  return controlled;
}

function legacyBeginTurn(message) {
  const player = state.players[state.active]; state.phase = 'beginning'; state.priority = null; state.focus = state.active; state.priorityPasses = 0; state.responseWindow = false; state.selected = null; state.selectedBoard = null; state.targetedField = null; player.hasChanneled = false; player.runes.forEach(rune => { rune.exhausted = false; });
  const skipsDraw = state.turn === 1 && player.id === state.firstPlayer; const drewCard = !skipsDraw && player.mainDeck.length > 0;
  if (drewCard) player.hand.push(player.mainDeck.shift());
  state.fields.filter(field => field.controller === player.id).forEach(field => { player.score += 1; });
  if (player.score >= 8) { state.winner = player.id; renderGame(`${player.name} alcanza 8 puntos y gana la partida.`); return; }
  renderGame(`${player.name}: endereza sus runas${skipsDraw ? ' y omite el robo de su primer turno' : drewCard ? ' y roba una carta' : ' y no puede robar porque su mazo está vacío'}.`);
}

function legacyAdvanceFlow() {
  if (state.winner || state.chain.length) return;
  if (state.phase === 'beginning') { state.phase = 'channel'; state.priority = null; renderGame('Fase de canalización. Canaliza 2 runas; el segundo jugador canaliza 3 en su primera vez.'); return; }
  if (state.phase === 'channel') { state.phase = 'main'; state.priority = state.active; state.focus = state.active; state.priorityPasses = 0; renderGame(`${state.players[state.active].name} recibe prioridad en la fase principal.`); return; }
  if (state.phase === 'main') { state.phase = 'ending'; state.priority = null; state.selected = null; state.selectedBoard = null; renderGame('Fase final. Comprueben expiraciones y efectos de fin de turno antes de pasar la batuta.'); return; }
  if (state.phase === 'ending') { if (state.active === 1) state.turn += 1; state.active = otherPlayer(state.active); beginTurn(`${state.players[state.active].name} toma la batuta.`); }
}

function advanceFlow() {
  if (state.winner || state.chain.length) return;
  const player = state.players[state.active];
  if (state.phase === 'awaken') {
    state.phase = 'beginning';
    const scored = scoreBeginningPhase(player);
    if (player.score >= 8) { state.winner = player.id; renderGame(player.name + ' alcanza 8 puntos y gana la partida.'); return; }
    renderGame(player.name + ' entra a Inicio.' + (scored ? ' Anota ' + scored + ' punto' + (scored === 1 ? '' : 's') + ' por los escenarios que controla.' : ' No controla escenarios para puntuar.'));
    return;
  }
  if (state.phase === 'beginning') {
    state.phase = 'channel'; state.priority = null;
    renderGame('Canalización: toma ' + (!player.hasChanneledBefore && player.id !== state.firstPlayer ? '3' : '2') + ' runas del mazo de runas. Entran listas, salvo que una carta diga otra cosa.');
    return;
  }
  if (state.phase === 'channel') {
    if (!player.hasChanneled && player.runeDeck.length) { renderGame('Primero canaliza tus runas antes de pasar a Robo.'); return; }
    state.phase = 'draw'; state.priority = null;
    const skipsDraw = state.turn === 1 && player.id === state.firstPlayer;
    const drew = !skipsDraw && player.mainDeck.length > 0;
    if (drew) player.hand.push(player.mainDeck.shift());
    renderGame(skipsDraw ? 'Robo: el primer jugador omite su robo en el primer turno.' : drew ? 'Robo: toma 1 carta de tu mazo principal.' : 'Robo: el mazo principal está vacío.');
    return;
  }
  if (state.phase === 'draw') {
    state.phase = 'main'; state.priority = state.active; state.focus = state.active; state.priorityPasses = 0;
    renderGame(player.name + ' recibe prioridad en la fase principal.');
    return;
  }
  if (state.phase === 'main') {
    state.phase = 'ending'; state.priority = null; state.selected = null; state.selectedBoard = null;
    renderGame('Fase final. Resuelvan efectos de final de turno y curación según el texto/reglas antes de pasar la batuta.');
    return;
  }
  if (state.phase === 'ending') {
    if (state.active === 1) state.turn += 1;
    state.active = otherPlayer(state.active);
    beginTurn(state.players[state.active].name + ' toma la batuta.');
  }
}

function channelRunes() {
  const player = state.players[state.active]; if (state.phase !== 'channel' || player.hasChanneled || !player.runeDeck.length) return;
  const allowed = !player.hasChanneledBefore && player.id !== state.firstPlayer ? 3 : 2; const count = Math.min(allowed, player.runeDeck.length);
  for (let index = 0; index < count; index += 1) player.runes.push({ ...player.runeDeck.shift(), exhausted: false });
  player.hasChanneled = true; player.hasChanneledBefore = true; renderGame(`${player.name} canalizó ${count} runa${count === 1 ? '' : 's'} listas. Continúa a la fase de Robo.`);
}

function toggleRune(playerId, index) {
  if (!canAct(playerId)) return; const rune = state.players[playerId].runes[index]; if (!rune) return; rune.exhausted = !rune.exhausted; renderGame(`${rune.name}: ${rune.exhausted ? 'agotada' : 'enderezada'} manualmente.`);
}

function playSelected() {
  const card = state.selected; const player = state.players[state.selectedOwner]; if (!card || !player || !canAct(player.id)) return;
  if (card.type.includes('Hechizo')) {
    player.hand = player.hand.filter(item => item.uid !== card.uid); state.chain.push({ name: card.name, owner: player.id, card }); state.selected = null; state.selectedOwner = null; state.targetedField = null; state.responseWindow = true; state.priorityPasses = 0; state.priority = otherPlayer(player.id); renderGame(`${card.name} está en la cadena. Se abre la ventana de respuesta para ${state.players[state.priority].name}.`); return;
  }
  if (player.id === state.active && card.type.includes('Unidad')) {
    if (state.selectedFromChampion) player.championInZone = false; else player.hand = player.hand.filter(item => item.uid !== card.uid);
    player.board.push({ owner: player.id, card, exhausted: true, faceDown: false, rotation: 0 });
    state.selected = null; state.selectedOwner = null; state.selectedFromChampion = false; state.selectedBoard = null; state.targetedField = null; state.priorityPasses = 0;
    renderGame(card.name + ' entró agotada a tu Base. Despiértala en tu próximo Despertar; entonces podrás moverla al escenario.');
    return;
  }
  const field = getField(state.targetedField); if (!field || player.id !== state.active || !card.type.includes('Unidad')) return;
  if (state.selectedFromChampion) player.championInZone = false; else player.hand = player.hand.filter(item => item.uid !== card.uid);
  field.units.push({ owner: player.id, card, exhausted: false, faceDown: false, rotation: 0 }); state.selected = null; state.selectedOwner = null; state.selectedFromChampion = false; state.selectedBoard = null; state.targetedField = null; state.priorityPasses = 0;
  renderGame(`${card.name} se desplegó en ${battlefields.find(item => item.id === field.id).name}. Confirmen manualmente sus costes y efectos de juego.`);
}

function passPriority() {
  if (!canAct(state.priority)) return; const passing = state.priority; state.priorityPasses += 1;
  if (state.priorityPasses >= 2) {
    if (state.chain.length) { const item = state.chain.pop(); state.players[item.owner].trash.push(item.card); state.responseWindow = false; state.priority = state.active; state.priorityPasses = 0; renderGame(`Ambos jugadores pasaron. Resuelvan ${item.name} según su texto y registren sus efectos manualmente; después quedó en desechos.`); }
    else if (state.phase === 'showdown' && state.showdown) { state.responseWindow = false; state.priority = null; state.priorityPasses = 0; renderGame('Ambos jugadores pasaron. Determinen el resultado de la confrontación y pulsa Azul, Rojo o Empate en el escenario.'); }
    else { state.responseWindow = false; state.priority = state.active; state.priorityPasses = 0; renderGame('Ambos jugadores pasaron prioridad. El jugador de turno vuelve a tener prioridad.'); }
    return;
  }
  state.priority = otherPlayer(passing); state.responseWindow = true; renderGame(`${state.players[passing].name} cedió prioridad. ${state.players[state.priority].name} puede responder.`);
}

function canShowdown(field) { return field && field.units.some(unit => unit.owner === 0) && field.units.some(unit => unit.owner === 1); }

function selectedBoardItem() {
  if (!state.selectedBoard) return null;
  const area = getCardArea(state.selectedBoard.fieldId);
  const unit = area?.units.find(item => item.card.uid === state.selectedBoard.uid);
  return area && unit ? { area, unit } : null;
}

function selectBoardCard(uid, fieldId, toggleTap = false) {
  const area = getCardArea(fieldId); const unit = area?.units.find(item => item.card.uid === uid);
  if (!unit || !canAct(unit.owner)) return;
  state.selected = null; state.selectedOwner = null; state.selectedFromChampion = false; state.selectedBoard = { uid, fieldId };
  if (toggleTap) unit.exhausted = !unit.exhausted;
  renderGame(unit.card.name + ': ' + (toggleTap ? unit.exhausted ? 'agotada' : 'enderezada' : 'seleccionada') + '. Arrastra para moverla, o usa Voltear (Z) / Girar (I).');
}

function toggleSelectedBoardTap() {
  const selected = selectedBoardItem(); if (!selected || !canAct(selected.unit.owner)) return;
  selected.unit.exhausted = !selected.unit.exhausted;
  renderGame(selected.unit.card.name + ': ' + (selected.unit.exhausted ? 'agotada a 90°.' : 'enderezada.'));
}

function flipSelectedBoardCard() {
  const selected = selectedBoardItem(); if (!selected || !canAct(selected.unit.owner)) return;
  selected.unit.faceDown = !selected.unit.faceDown;
  renderGame(selected.unit.faceDown ? 'Carta oculta. Usa Z o “Mostrar carta” para revelarla.' : selected.unit.card.name + ' está boca arriba.');
}

function rotateSelectedBoardCard() {
  const selected = selectedBoardItem(); if (!selected || !canAct(selected.unit.owner)) return;
  selected.unit.rotation = (Number(selected.unit.rotation || 0) + 180) % 360;
  renderGame(selected.unit.card.name + ' giró 180°.');
}

function discardSelectedBoardCard() {
  const selected = selectedBoardItem(); if (!selected || !canAct(selected.unit.owner)) return;
  selected.area.setUnits(selected.area.units.filter(item => item.card.uid !== selected.unit.card.uid));
  state.players[selected.unit.owner].trash.push(selected.unit.card);
  state.selectedBoard = null;
  renderGame('Carta movida a desechos manualmente.');
}

function moveBoardCard(uid, fromFieldId, toFieldId) {
  const source = getCardArea(fromFieldId); const destination = getCardArea(toFieldId);
  const unit = source?.units.find(item => item.card.uid === uid);
  if (!source || !destination || !unit || source.id === destination.id || !canAct(unit.owner) || state.phase !== 'main') return;
  if (source.kind === 'field' && destination.kind === 'field') { renderGame('Mover de escenario a escenario requiere Ganking u otro efecto. Confírmalo manualmente con el texto de la carta.'); return; }
  if (source.kind === 'board' && destination.kind === 'board') return;
  if (unit.exhausted) { renderGame(unit.card.name + ' está agotada: una unidad debe estar lista para hacer un movimiento estándar.'); return; }
  source.setUnits(source.units.filter(item => item.card.uid !== uid));
  unit.exhausted = true;
  destination.units.push(unit);
  state.selectedBoard = { uid, fieldId: destination.id };
  if (destination.kind === 'board') {
    renderGame(unit.card.name + ' regresó a tu Base agotada.');
    return;
  }
  const field = getField(destination.id); const hasOpponent = field.units.some(item => item.owner !== unit.owner);
  state.targetedField = destination.id; state.showdown = destination.id; state.phase = 'showdown'; state.focus = unit.owner; state.priority = unit.owner; state.priorityPasses = 0; state.responseWindow = true;
  renderGame((hasOpponent ? 'Confrontación de combate' : 'Confrontación abierta') + ' en ' + battlefields.find(item => item.id === destination.id).name + '. La unidad llegó agotada; ambos jugadores pueden responder y después registran el resultado.');
}

function openShowdown() {
  const field = getField(state.targetedField); if (!canShowdown(field) || state.phase !== 'main' || state.priority !== state.active) return;
  state.showdown = field.id; state.phase = 'showdown'; state.focus = state.active; state.priority = state.active; state.priorityPasses = 0; state.responseWindow = true; renderGame(`Confrontación abierta en ${battlefields.find(item => item.id === field.id).name}. Lleva la prioridad y resuelve ataques, defensas y respuestas por el texto de las cartas.`);
}

function registerShowdownResult(fieldId, controller) {
  if (state.showdown !== fieldId) return; const field = getField(fieldId); field.controller = controller === 'none' ? null : Number(controller); state.showdown = null; state.phase = 'main'; state.priority = state.active; state.priorityPasses = 0; state.responseWindow = false; renderGame(controller === 'none' ? 'Confrontación registrada sin controlador. Ajusten unidades, daño y desechos manualmente.' : `${state.players[Number(controller)].name} controla ${battlefields.find(item => item.id === field.id).name}. Ajusten unidades y efectos manualmente.`);
}

function previewCard(uid) {
  const all = state.players.flatMap(player => [...player.hand, ...player.trash, ...state.fields.flatMap(field => field.units.map(unit => unit.card))]); const card = all.find(item => item.uid === uid); if (!card) return;
  byId('modalContents').innerHTML = `<div class="modal-card"><img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}"><div><span class="modal-meta">${escapeHtml(card.type.toUpperCase())}</span><h2 id="modalTitle">${escapeHtml(card.name)}</h2><span class="modal-cost">Coste de energía: ${card.cost} · Might: ${card.might || '—'}</span><p>${escapeHtml(card.rules)}</p><p class="modal-note">Mesa local de práctica: resuelve el texto y los costes impresos entre jugadores.</p></div></div>`; showModal('cardModal');
}

function showModal(id) { byId('scrim').classList.remove('hidden'); byId(id).classList.remove('hidden'); }
function closeModals() { byId('scrim').classList.add('hidden'); document.querySelectorAll('.card-modal,.rules-modal,.mulligan-modal').forEach(element => element.classList.add('hidden')); }

function renderMulligan() {
  const player = state.players[state.mulliganQueue[0]]; byId('mulliganTitle').textContent = `Mulligan · ${player.name}`; byId('mulliganText').textContent = `${player.name}, elige hasta 2 de tus 4 cartas para reemplazar o conserva la mano.`;
  byId('mulliganHand').innerHTML = player.hand.map(card => `<button class="mulligan-card ${state.mulliganSelected.includes(card.uid) ? 'selected' : ''}" data-mulligan="${card.uid}" aria-label="Cambiar ${escapeHtml(card.name)}"><img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}"></button>`).join('');
  byId('replaceMulligan').textContent = `Reemplazar ${state.mulliganSelected.length} carta${state.mulliganSelected.length === 1 ? '' : 's'}`; byId('replaceMulligan').disabled = state.mulliganSelected.length === 0;
}

function toggleMulligan(uid) { if (state.mulliganSelected.includes(uid)) state.mulliganSelected = state.mulliganSelected.filter(item => item !== uid); else if (state.mulliganSelected.length < 2) state.mulliganSelected.push(uid); renderMulligan(); }
function finishMulligan(replace) {
  const player = state.players[state.mulliganQueue[0]]; const toRecycle = replace ? player.hand.filter(card => state.mulliganSelected.includes(card.uid)) : [];
  if (toRecycle.length) { player.hand = player.hand.filter(card => !state.mulliganSelected.includes(card.uid)); player.hand.push(...player.mainDeck.splice(0, toRecycle.length)); player.mainDeck.push(...toRecycle); }
  state.mulliganQueue.shift(); state.mulliganSelected = [];
  if (state.mulliganQueue.length) renderMulligan(); else { closeModals(); beginTurn(`${state.players[state.active].name} empieza el primer turno.`); }
}

document.addEventListener('click', event => {
  const deckButton = event.target.closest('[data-select-deck]'); const fieldButton = event.target.closest('[data-select-field]'); const firstButton = event.target.closest('[data-first-player]'); const handCard = event.target.closest('[data-card]'); const boardCard = event.target.closest('[data-board-card]'); const field = event.target.closest('[data-field]'); const rune = event.target.closest('[data-rune]'); const preview = event.target.closest('[data-preview]'); const mulligan = event.target.closest('[data-mulligan]'); const champion = event.target.closest('[data-champion]'); const conquer = event.target.closest('[data-conquer]');
  if (deckButton) { setup[Number(deckButton.dataset.player)].deck = deckButton.dataset.selectDeck; renderSetup(); }
  if (fieldButton) { setup[Number(fieldButton.dataset.player)].battlefield = fieldButton.dataset.selectField; renderSetup(); }
  if (firstButton) { firstPlayerChoice = Number(firstButton.dataset.firstPlayer); renderSetup(); }
  if (boardCard) { selectBoardCard(boardCard.dataset.boardCard, boardCard.dataset.boardField); return; }
  if (handCard) selectCard(handCard.dataset.card); if (field) selectField(field.dataset.field); if (rune) toggleRune(Number(rune.dataset.runePlayer), Number(rune.dataset.rune)); if (preview) previewCard(preview.dataset.preview); if (mulligan) toggleMulligan(mulligan.dataset.mulligan); if (champion) selectChampion(Number(champion.dataset.champion)); if (conquer) registerShowdownResult(conquer.dataset.showdownField, conquer.dataset.conquer);
});

document.addEventListener('contextmenu', event => {
  const boardCard = event.target.closest('[data-board-card]'); if (!boardCard) return;
  event.preventDefault(); selectBoardCard(boardCard.dataset.boardCard, boardCard.dataset.boardField);
});
document.addEventListener('keydown', event => {
  const target = event.target; if (target?.matches?.('input,textarea,select')) return;
  const key = event.key.toLowerCase();
  if (key === 'z') { event.preventDefault(); flipSelectedBoardCard(); }
  if (key === 'i') { event.preventDefault(); rotateSelectedBoardCard(); }
  if (key === 't') { event.preventDefault(); toggleSelectedBoardTap(); }
  if (key === 'd') { event.preventDefault(); discardSelectedBoardCard(); }
});

document.addEventListener('dragstart', event => {
  const handCard = event.target.closest('[data-card][draggable="true"]'); const boardCard = event.target.closest('[data-board-card][draggable="true"]');
  if (!handCard && !boardCard) return;
  const payload = handCard ? { kind: 'hand', uid: handCard.dataset.card } : { kind: 'board', uid: boardCard.dataset.boardCard, fieldId: boardCard.dataset.boardField };
  event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', JSON.stringify(payload)); (handCard || boardCard).classList.add('dragging');
});
document.addEventListener('dragend', event => { event.target.closest('[data-card],[data-board-card]')?.classList.remove('dragging'); document.querySelectorAll('.battlefield.drop-target').forEach(field => field.classList.remove('drop-target')); });
document.addEventListener('dragover', event => {
  const target = event.target.closest('[data-drop-field],[data-drop-player-board]');
  if (!target || state?.phase !== 'main' || state.priority === null) return;
  event.preventDefault(); target.classList.add('drop-target');
});
document.addEventListener('dragleave', event => event.target.closest('[data-drop-field],[data-drop-player-board]')?.classList.remove('drop-target'));
document.addEventListener('drop', event => {
  const target = event.target.closest('[data-drop-field],[data-drop-player-board]'); if (!target) return;
  event.preventDefault(); target.classList.remove('drop-target');
  const destination = target.dataset.dropField || 'player-' + target.dataset.dropPlayerBoard;
  let payload; try { payload = JSON.parse(event.dataTransfer.getData('text/plain')); } catch { payload = { kind: 'hand', uid: event.dataTransfer.getData('text/plain') }; }
  if (!payload?.uid) return;
  if (payload.kind === 'board') { moveBoardCard(payload.uid, payload.fieldId, destination); return; }
  selectCard(payload.uid); if (target.dataset.dropField) selectField(target.dataset.dropField); playSelected();
});

function toggleTableOrientation() {
  faceToFace = !faceToFace;
  $('#gameScreen').classList.toggle('face-to-face', faceToFace);
  byId('toggleTableOrientation').textContent = faceToFace ? 'Vista compartida' : 'Vista cara a cara';
}

byId('startGame').addEventListener('click', startGame);
byId('backToSetup').addEventListener('click', () => { $('#gameScreen').classList.add('hidden'); $('#setupScreen').classList.remove('hidden'); });
byId('toggleTableOrientation').addEventListener('click', toggleTableOrientation);
byId('channelRunes').addEventListener('click', channelRunes); byId('playCard').addEventListener('click', playSelected); byId('passPriority').addEventListener('click', passPriority); byId('resolveShowdown').addEventListener('click', openShowdown); byId('nextTurn').addEventListener('click', advanceFlow);
byId('tapCard').addEventListener('click', toggleSelectedBoardTap); byId('flipCard').addEventListener('click', flipSelectedBoardCard); byId('rotateCard').addEventListener('click', rotateSelectedBoardCard); byId('discardCard').addEventListener('click', discardSelectedBoardCard);
byId('rulesButton').addEventListener('click', () => showModal('rulesModal')); byId('closeRules').addEventListener('click', closeModals); byId('closeModal').addEventListener('click', closeModals); byId('scrim').addEventListener('click', () => { if (!state?.mulliganQueue?.length) closeModals(); }); byId('confirmMulligan').addEventListener('click', () => finishMulligan(false)); byId('replaceMulligan').addEventListener('click', () => finishMulligan(true));

renderSetup();
