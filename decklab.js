const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'el-rifty-deck-v1';
const LIBRARY_KEY = 'el-rifty-deck-library-v1';
const INCLUDED_CATALOG = globalThis.EL_RIFTY_CATALOG;

const fallbackCards = [
  ['OGN-251', 'Jinx, Loose Cannon', 'Legend', ['fury', 'chaos'], 'https://openrift.app/media/cards/b2/734d72cf-5e39-4e92-bc48-57cdcebc60b2-full.webp', ['Jinx']],
  ['OGN-202', 'Jinx, Rebel', 'Unit', ['fury', 'chaos'], 'https://openrift.app/media/cards/35/6b1025c9-3793-43f0-aa45-b568236fa135-full.webp', ['Jinx', 'Champion']],
  ['OGN-006', 'Flame Chompers', 'Unit', ['fury'], 'https://openrift.app/media/cards/37/79b9328b-ff9b-4d1f-a561-55478a7bcd37-full.webp', []],
  ['OGN-008', 'Get Excited!', 'Spell', ['chaos'], 'https://openrift.app/media/cards/00/b48d9ea0-49ce-4828-9c21-2527c8650400-full.webp', ['Signature', 'Jinx']],
  ['OGN-265', 'Viktor, Herald of the Arcane', 'Legend', ['mind', 'order'], 'https://openrift.app/media/cards/74/9319a89a-a09a-4623-b945-f4fa34a1b674-full.webp', ['Viktor']],
  ['OGN-246', 'Viktor, Leader', 'Unit', ['mind', 'order'], 'https://openrift.app/media/cards/dd/544df4e8-7d43-4ffa-a9b1-3a08e8be6add-full.webp', ['Viktor', 'Champion']],
  ['OGN-266', 'Siphon Power', 'Spell', ['mind', 'order'], 'https://openrift.app/media/cards/5f/1b425192-9d11-46b4-9b41-58b336ac1c5f-full.webp', ['Signature', 'Viktor']],
  ['OGN-275', 'Altar to Unity', 'Battlefield', [], 'https://openrift.app/media/cards/fd/1d70eb16-56be-499a-8ef9-0de742766cfd-full.webp', []],
  ['OGN-278', 'Bandle Tree', 'Battlefield', [], 'https://openrift.app/media/cards/43/9e889364-eb80-4c06-9d83-7b44ce6fdc43-full.webp', []],
  ['OGN-283', 'Navori Fighting Pit', 'Battlefield', [], 'https://openrift.app/media/cards/e6/ea0d4f7f-f324-4c3c-a441-7550e7d51be6-full.webp', []],
  ['OGN-007', 'Fury Rune', 'Rune', ['fury'], '', []],
  ['OGN-089', 'Chaos Rune', 'Rune', ['chaos'], '', []],
].map(([code, name, type, domains, image, tags]) => ({ code, name, type, domains, image, tags, text: '' }));

let catalog = [...fallbackCards];
let selectedCode = null;
let catalogState = 'fallback';
let catalogMode = 'build';
let catalogStepOverride = null;
const requestedDetails = new Set();

function blankBuilder() {
  return { name: 'Mazo sin nombre', description: '', legend: null, champion: null, battlefields: {}, runes: {}, main: {}, sideboard: {}, unresolved: {} };
}

function loadBuilder() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? { ...blankBuilder(), ...saved } : blankBuilder();
  } catch { return blankBuilder(); }
}

let builder = loadBuilder();

function loadLibrary() {
  try { const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY)); return Array.isArray(saved) ? saved : []; }
  catch { return []; }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function canonicalType(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('legend')) return 'Legend';
  if (text.includes('battlefield')) return 'Battlefield';
  if (text.includes('rune')) return 'Rune';
  if (text.includes('gear')) return 'Gear';
  if (text.includes('spell')) return 'Spell';
  if (text.includes('unit')) return 'Unit';
  return value ? String(value) : 'Unknown';
}

function toArray(value) {
  if (Array.isArray(value)) return value.flatMap(toArray);
  if (value === undefined || value === null) return [];
  if (typeof value === 'object') return Object.values(value).flatMap(toArray);
  return String(value).split(/[,/|]/).map(item => item.trim()).filter(Boolean);
}

function normalizeCode(raw) {
  const source = String(raw || '').trim().toUpperCase();
  const match = source.match(/^([A-Z0-9]{3})-((?:R)?\d+[A-Z*]?)(?:-\d+)?$/);
  return match ? `${match[1]}-${match[2]}` : source;
}

function normalizeCard(raw) {
  const setId = raw.set_id || raw.set?.id || raw.set || raw.expansion || '';
  const collector = raw.collector_number || raw.card_number || raw.number || raw.collectorNumber || '';
  const sourceCode = raw.card_code || raw.cardCode || raw.code || raw.id || (setId && collector ? `${setId}-${collector}` : '');
  const code = normalizeCode(sourceCode);
  const domains = toArray(raw.faction || raw.factions || raw.domain || raw.domains || raw.colors).map(item => item.toLowerCase());
  const tags = toArray(raw.tags || raw.tag_names || raw.tag || raw.supertype);
  return {
    code,
    name: raw.name || raw.card_name || code || 'Carta sin nombre',
    type: canonicalType(raw.type || raw.card_type || raw.types || raw.category),
    domains,
    tags,
    image: raw.image_url || raw.image || raw.imageUrl || raw.art_url || raw.artwork_url || raw.card_image || '',
    text: raw.rules_text || raw.text || raw.ability_text || raw.description || raw.effect || '',
    rawType: raw.type || raw.card_type || '',
    isBanned: Boolean(raw.is_banned || raw.isBanned || raw.banned),
    maxCopies: raw.maxCopies ?? raw.max_copies ?? null,
  };
}

function catalogByCode() { return new Map(catalog.map(card => [card.code, card])); }
function getCard(code) { return catalogByCode().get(normalizeCode(code)) || { code: normalizeCode(code), name: normalizeCode(code), type: 'Unknown', domains: [], tags: [], image: '', text: 'Carta importada pendiente de resolver con el catálogo.' }; }
function total(entries) { return Object.values(entries).reduce((sum, count) => sum + Number(count || 0), 0); }
function recordsToEntries(record) { return Object.entries(record).filter(([, count]) => count > 0).map(([cardCode, count]) => ({ cardCode, count })); }
function cardIsChampion(card) { return card.type === 'Unit' && card.tags.some(tag => tag.toLowerCase() === 'champion'); }
function cardIsSignature(card) { return card.tags.some(tag => tag.toLowerCase() === 'signature'); }
function hasTag(card, tag) { return card.tags.some(item => item.toLowerCase() === tag.toLowerCase()); }
function cardCopyLimit(card) {
  const statedLimit = Number(card.maxCopies);
  if (Number.isFinite(statedLimit) && statedLimit > 0) return statedLimit;
  return hasTag(card, 'unique') ? 1 : 3;
}
function thumbnail(card) { return card.image ? `<img src="${escapeHtml(card.image)}" alt="">` : `<span class="card-glyph">✦</span>`; }

function selectedLegend() { return builder.legend ? getCard(builder.legend) : null; }
function cardMatchesLegendDomains(card) {
  const legend = selectedLegend();
  if (!legend || !card.domains.length) return true;
  const allowed = new Set(legend.domains.map(domain => domain.toLowerCase()));
  return card.domains.every(domain => allowed.has(domain.toLowerCase()));
}
function championMatchesLegend(card) {
  const legend = selectedLegend();
  if (!legend || !cardIsChampion(card)) return false;
  if (!cardMatchesLegendDomains(card)) return false;
  if (!legend.tags.length || !card.tags.length) return true;
  const tags = new Set(legend.tags.map(tag => tag.toLowerCase()));
  return card.tags.some(tag => tags.has(tag.toLowerCase()));
}
function constructionStep() {
  if (!builder.legend) return 1;
  if (!builder.champion) return 2;
  if (Object.keys(builder.battlefields).length < 3) return 3;
  return 4;
}
function activeCatalogStep() { return catalogStepOverride || constructionStep(); }
function stageLabel(step) { return ({ 1: 'Leyenda', 2: 'Campeón', 3: 'Escenarios', 4: 'Cartas y runas' })[step]; }
function cardBelongsToStage(card, step) {
  if (step === 1) return card.type === 'Legend';
  if (step === 2) return championMatchesLegend(card);
  if (step === 3) return card.type === 'Battlefield';
  return card.type === 'Battlefield' || ((card.type === 'Rune' || ['Unit', 'Gear', 'Spell'].includes(card.type)) && cardMatchesLegendDomains(card));
}
function workflowProblem(zone, card) {
  if (zone === 'legend') return card.type === 'Legend' ? '' : 'La primera elección debe ser una carta de tipo Leyenda.';
  if (!builder.legend) return 'Primero elige una Leyenda: ella define los dominios permitidos para tu mazo.';
  if (zone === 'champion') {
    if (!cardIsChampion(card)) return 'El Campeón elegido debe ser una Unidad con etiqueta Champion.';
    if (!championMatchesLegend(card)) return 'Elige un Campeón compatible con las etiquetas y dominios de la Leyenda.';
    return '';
  }
  if (!builder.champion) return 'Después de la Leyenda, elige el Campeón compatible.';
  if (zone === 'battlefields') return card.type === 'Battlefield' ? '' : 'Esta zona solo acepta Escenarios.';
  if (Object.keys(builder.battlefields).length < 3) return 'Primero completa tus 3 Escenarios; después añade runas y el resto del mazo.';
  if ((zone === 'main' || zone === 'sideboard' || zone === 'runes') && !cardMatchesLegendDomains(card)) return 'Esta carta tiene un dominio fuera de los que permite tu Leyenda.';
  return '';
}
function resetSelectionsForLegend() {
  builder.champion = null;
  builder.battlefields = {};
  builder.runes = {};
  builder.main = {};
  builder.sideboard = {};
  builder.unresolved = {};
}

function persistDraft() {
  builder.name = $('#deckName').value.trim() || 'Mazo sin nombre';
  builder.description = $('#deckDescription').value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(builder));
}

function setStatus(text, kind = '') {
  const node = $('#importStatus');
  node.textContent = text;
  node.dataset.kind = kind;
}

function renderCatalog() {
  document.querySelectorAll('[data-catalog-mode]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.catalogMode === catalogMode)));
  const search = $('#cardSearch').value.trim().toLowerCase();
  const type = $('#typeFilter').value;
  const domain = $('#domainFilter').value;
  const stage = activeCatalogStep();
  const cards = catalog.filter(card => {
    const haystack = `${card.name} ${card.code} ${card.text} ${card.tags.join(' ')}`.toLowerCase();
    const modeMatch = catalogMode === 'learn' || cardBelongsToStage(card, stage);
    return modeMatch && (!search || haystack.includes(search)) && (!type || card.type === type) && (!domain || card.domains.includes(domain));
  }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 120);
  if (catalogMode === 'build' && cards.length && !cards.some(card => card.code === selectedCode)) selectedCode = cards[0].code;
  $('#cardGallery').innerHTML = cards.length ? cards.map(card => {
    const zone = quickZone(card); const count = zone === 'legend' ? (builder.legend === card.code ? 1 : 0) : zone === 'champion' ? (builder.champion === card.code ? 1 : 0) : Number(builder[zone]?.[card.code] || 0);
    const actions = catalogMode === 'learn' ? `<button class="card-peek" data-preview-card="${escapeHtml(card.code)}" aria-label="Ampliar ${escapeHtml(card.name)}">◉</button>` : `<button class="card-peek" data-preview-card="${escapeHtml(card.code)}" aria-label="Ampliar ${escapeHtml(card.name)}">◉</button><button data-quick-zone="${zone}" data-quick-code="${escapeHtml(card.code)}" data-quick-delta="-1" aria-label="Quitar ${escapeHtml(card.name)}">−</button><b>${count}</b><button data-quick-zone="${zone}" data-quick-code="${escapeHtml(card.code)}" data-quick-delta="1" aria-label="Añadir ${escapeHtml(card.name)}">+</button>`;
    return `<article class="catalog-card ${selectedCode === card.code ? 'selected' : ''}"><button class="catalog-select" data-select-card="${escapeHtml(card.code)}" aria-label="Ver ${escapeHtml(card.name)}">${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : ''}<span class="card-type">${escapeHtml(card.type)}</span><h3>${escapeHtml(card.name)}</h3><small>${escapeHtml(card.code)}</small></button><div class="card-quick-actions" aria-label="Acciones de ${escapeHtml(card.name)}">${actions}</div></article>`;
  }).join('') : '<p class="deck-empty">No hay cartas que coincidan con esos filtros.</p>';
  const count = catalogState === 'included' ? `${catalog.length} cartas incluidas de Piltover Archive` : `${catalog.length} cartas de muestra · vuelve a cargar para obtener la colección completa`;
  $('#catalogStatus').textContent = `${count} · mostrando ${cards.length}${cards.length === 120 ? '+' : ''}`;
  $('#catalogGuide').innerHTML = catalogMode === 'learn'
    ? `<strong>Modo aprender.</strong> Explora cualquier carta sin tocar tu mazo. Pasa sobre el ◉ para leerla completa y elige un tipo abajo.`
    : `<strong>Paso ${stage} de 4 · ${stageLabel(stage)}.</strong> ${stage === 1 ? 'Elige una Leyenda; cambiarla reinicia las demás elecciones del mazo.' : stage === 2 ? 'Elige el Campeón que comparte identidad y dominios con tu Leyenda.' : stage === 3 ? 'Elige 3 Escenarios distintos. Podrás modificarlos después.' : 'Ahora completa runas y cartas permitidas por los dominios de tu Leyenda.'}`;
}

function quickZone(card) {
  if (activeCatalogStep() === 2 && cardIsChampion(card)) return 'champion';
  if (card.type === 'Legend') return 'legend';
  if (card.type === 'Battlefield') return 'battlefields';
  if (card.type === 'Rune') return 'runes';
  return 'main';
}

function quickAdjust(zone, code, delta) {
  if (delta > 0) return addCard(zone, code);
  if ((zone === 'legend' || zone === 'champion') && builder[zone] !== code) return;
  removeCard(zone, code);
}

function adjustRecord(zone, code, delta) {
  const record = builder[zone];
  const previous = Number(record[code] || 0);
  const next = previous + delta;
  if (next <= 0) delete record[code]; else record[code] = next;
}

function addCard(zone, code) {
  const card = getCard(code);
  const workflowError = workflowProblem(zone, card);
  if (workflowError) return setStatus(workflowError);
  if (zone === 'legend') {
    if (builder.legend && builder.legend !== code) {
      resetSelectionsForLegend();
      setStatus(`Cambiaste a ${card.name}: se reiniciaron Campeón, Escenarios, Runas y demás cartas para respetar sus dominios.`);
    } else if (!builder.legend && (total(builder.main) || total(builder.runes) || Object.keys(builder.battlefields).length || total(builder.sideboard))) {
      setStatus(`Leyenda ${card.name} elegida. Conservé las cartas importadas para que puedas comprobar su compatibilidad.`);
    }
    builder.legend = code;
    catalogStepOverride = null;
  }
  if (zone === 'champion') {
    if ((builder.main[code] || 0) >= cardCopyLimit(card)) return setStatus(`Ese campeón ya tiene ${cardCopyLimit(card)} copias en el mazo principal; el campeón elegido cuenta dentro del límite.`);
    builder.champion = code;
  }
  if (zone === 'battlefields') { if (card.type !== 'Battlefield') return setStatus('Esta zona solo acepta Escenarios.'); if (!builder.battlefields[code] && Object.keys(builder.battlefields).length >= 3) return setStatus('Un mazo construido lleva exactamente tres escenarios.'); builder.battlefields[code] = 1; }
  if (zone === 'runes') { if (card.type !== 'Rune') return setStatus('Esta zona solo acepta Runas.'); if (total(builder.runes) >= 12) return setStatus('El mazo de runas ya tiene 12 cartas.'); adjustRecord('runes', code, 1); }
  if (zone === 'main') {
    if (!['Unit', 'Gear', 'Spell'].includes(card.type)) return setStatus('El mazo principal solo admite Unidades, Equipo y Hechizos; esa carta pertenece a otra zona.');
    if ((builder.main[code] || 0) + (builder.champion === code ? 1 : 0) >= cardCopyLimit(card)) return setStatus(`No puedes pasar de ${cardCopyLimit(card)} copias de esta carta, contando al Campeón elegido.`);
    adjustRecord('main', code, 1);
  }
  if (zone === 'sideboard') { if (!['Unit', 'Gear', 'Spell'].includes(card.type)) return setStatus('El banquillo solo admite Unidades, Equipo y Hechizos.'); if (total(builder.sideboard) >= 8) return setStatus('El banquillo está limitado a 8 cartas en este constructor.'); if ((builder.sideboard[code] || 0) >= cardCopyLimit(card)) return setStatus(`El banquillo no puede llevar más de ${cardCopyLimit(card)} copias de esta carta.`); adjustRecord('sideboard', code, 1); }
  if (zone === 'battlefields' && Object.keys(builder.battlefields).length === 3 && catalogStepOverride === 3) catalogStepOverride = null;
  persistDraft(); renderAll();
}

function removeCard(zone, code) {
  if (zone === 'legend') { builder.legend = null; resetSelectionsForLegend(); catalogStepOverride = null; setStatus('Leyenda quitada: las demás elecciones se reiniciaron para mantener el mazo consistente.'); }
  else if (zone === 'champion') builder.champion = null;
  else adjustRecord(zone, code, -1);
  if (catalogStepOverride && catalogStepOverride > constructionStep()) catalogStepOverride = null;
  persistDraft(); renderAll();
}

function renderRows(zone, nodeId, single = false) {
  const node = $(`#${nodeId}`);
  const entries = single ? (builder[zone] ? [[builder[zone], 1]] : []) : Object.entries(builder[zone]).filter(([, count]) => count > 0);
  node.innerHTML = entries.length ? entries.map(([code, count]) => {
    const card = getCard(code);
    return `<div class="deck-row" data-deck-preview-card="${escapeHtml(code)}" title="Pasa el mouse para ampliar ${escapeHtml(card.name)}">${thumbnail(card)}<span class="deck-row-name">${escapeHtml(card.name)}<small class="deck-row-code">${escapeHtml(code)}</small></span><span class="quantity"><button data-adjust-zone="${zone}" data-code="${escapeHtml(code)}" data-delta="-1">−</button><b>${count}</b>${single ? '' : `<button data-adjust-zone="${zone}" data-code="${escapeHtml(code)}" data-delta="1">+</button>`}</span></div>`;
  }).join('') : '<p class="deck-empty">Vacío</p>';
}

function validateDeck() {
  const errors = [], warnings = [];
  const mainTotal = total(builder.main), fullMainTotal = mainTotal + (builder.champion ? 1 : 0), runeTotal = total(builder.runes), battlefieldTotal = Object.keys(builder.battlefields).length, sideboardTotal = total(builder.sideboard);
  if (!builder.legend) errors.push('Falta la Leyenda de Campeón (debe ser exactamente 1).');
  if (!builder.champion) errors.push('Falta el Campeón elegido (debe ser exactamente 1).');
  if (fullMainTotal < 40) errors.push(`El mazo principal debe tener al menos 40 cartas contando al Campeón elegido; lleva ${fullMainTotal}.`);
  if (runeTotal !== 12) errors.push(`El mazo de runas debe tener 12 cartas; lleva ${runeTotal}.`);
  if (battlefieldTotal !== 3) errors.push(`Debes incluir 3 escenarios distintos; llevas ${battlefieldTotal}.`);
  recordsToEntries(builder.main).forEach(({ cardCode }) => { if (!['Unit', 'Gear', 'Spell'].includes(getCard(cardCode).type)) errors.push(`${getCard(cardCode).name} no puede estar en el mazo principal.`); });
  Object.entries(builder.main).filter(([code, count]) => count + (builder.champion === code ? 1 : 0) > cardCopyLimit(getCard(code))).forEach(([code]) => errors.push(`${getCard(code).name} supera el límite de ${cardCopyLimit(getCard(code))} copia${cardCopyLimit(getCard(code)) === 1 ? '' : 's'} contando al Campeón elegido.`));
  const legend = builder.legend ? getCard(builder.legend) : null;
  const champion = builder.champion ? getCard(builder.champion) : null;
  if (legend && legend.type !== 'Legend') errors.push('La carta elegida como Leyenda no tiene tipo Leyenda.');
  if (champion && (champion.type !== 'Unit' || !cardIsChampion(champion))) errors.push('El Campeón elegido debe ser una Unidad con etiqueta Champion.');
  if (legend && champion && legend.tags.length && champion.tags.length) {
    const legendTags = new Set(legend.tags.map(tag => tag.toLowerCase()));
    if (!champion.tags.some(tag => legendTags.has(tag.toLowerCase()))) errors.push('El Campeón elegido no comparte una etiqueta de campeón con la Leyenda.');
  } else if (legend && champion) warnings.push('No se pudieron verificar las etiquetas de la Leyenda y el Campeón con los datos cargados.');
  if (legend?.domains.length) {
    const allowed = new Set(legend.domains);
    [...recordsToEntries(builder.main), ...recordsToEntries(builder.runes), ...(builder.champion ? [{ cardCode: builder.champion, count: 1 }] : [])].forEach(({ cardCode }) => {
      const card = getCard(cardCode);
      if (card.domains.length && !card.domains.every(domain => allowed.has(domain))) errors.push(`${card.name} no respeta todos los dominios de la Leyenda.`);
    });
  }
  const signatureTotal = recordsToEntries(builder.main).filter(({ cardCode }) => cardIsSignature(getCard(cardCode))).reduce((sum, entry) => sum + entry.count, 0);
  if (signatureTotal > 3) errors.push(`Hay ${signatureTotal} cartas de firma; el máximo permitido es 3.`);
  if (legend && legend.tags.length) {
    const legendTags = new Set(legend.tags.map(tag => tag.toLowerCase()));
    recordsToEntries(builder.main).filter(({ cardCode }) => cardIsSignature(getCard(cardCode))).forEach(({ cardCode }) => {
      const card = getCard(cardCode);
      if (card.tags.length && !card.tags.some(tag => tag.toLowerCase() !== 'signature' && legendTags.has(tag.toLowerCase()))) errors.push(`${card.name} es una carta de firma que no coincide con la etiqueta de campeón de la Leyenda.`);
      else if (!card.tags.length) warnings.push(`No se pudieron comprobar las etiquetas de firma de ${card.name}.`);
    });
  }
  const selectedCards = [builder.legend, builder.champion, ...Object.keys(builder.main), ...Object.keys(builder.runes), ...Object.keys(builder.battlefields)].filter(Boolean).map(getCard);
  selectedCards.filter(card => card.isBanned).forEach(card => errors.push(`${card.name} está marcada como prohibida en el catálogo cargado.`));
  if (sideboardTotal && sideboardTotal !== 8) warnings.push(`Tu banquillo tiene ${sideboardTotal} cartas. En construido de torneo debe tener exactamente 0 u 8; confirma el formato de tu evento.`);
  const unknownCount = total(builder.unresolved);
  if (unknownCount) warnings.push(`${unknownCount} cartas importadas esperan resolución del catálogo; vuelve a cargar o revisa sus códigos.`);
  return { errors, warnings };
}

function renderValidation() {
  const { errors, warnings } = validateDeck();
  const node = $('#validation');
  node.className = `validation ${errors.length ? 'invalid' : 'valid'}`;
  node.innerHTML = errors.length ? `<b>Faltan ajustes para que sea legal:</b><ul>${errors.slice(0, 5).map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : '<b>✓ Mazo válido para construido 1 vs 1.</b>';
  if (warnings.length) node.innerHTML += `<ul>${warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`;
}

function renderInspector() {
  const card = selectedCode ? getCard(selectedCode) : null;
  if (!card) return;
  const action = (label, zone, primary = false) => {
    const problem = workflowProblem(zone, card);
    return `<button ${primary ? 'class="primary"' : ''} data-add-zone="${zone}" ${problem ? `disabled title="${escapeHtml(problem)}"` : ''}>${label}</button>`;
  };
  const actions = [];
  if (catalogMode === 'build') {
    if (card.type === 'Legend') actions.push(action('Establecer como Leyenda', 'legend', true));
    if (card.type === 'Unit') { actions.push(action('+ Mazo principal', 'main', true)); actions.push(action('Elegir campeón', 'champion')); actions.push(action('+ Banquillo', 'sideboard')); }
    if (['Spell', 'Gear'].includes(card.type)) { actions.push(action('+ Mazo principal', 'main', true)); actions.push(action('+ Banquillo', 'sideboard')); }
    if (card.type === 'Battlefield') actions.push(action('+ Escenarios', 'battlefields', true));
    if (card.type === 'Rune') actions.push(action('+ Runa', 'runes', true));
  }
  const studyCopy = { Legend: 'La Leyenda es el punto de partida: marca los dos dominios que puede usar tu mazo.', Unit: 'Las Unidades entran al mazo principal; una Unidad con etiqueta Champion puede ser tu Campeón elegido.', Spell: 'Los Hechizos son cartas de acción: lee su texto y coste para saber cuándo pueden jugarse.', Gear: 'El Equipo modifica una Unidad; su texto indica a qué puede vincularse y qué aporta.', Battlefield: 'Los Escenarios son los lugares que se disputan. Un mazo construido lleva 3 distintos.', Rune: 'Las Runas forman un mazo separado de 12 y solo pueden usar dominios de tu Leyenda.' }[card.type] || 'Lee el tipo, dominios y texto de reglas para conocer el papel de esta carta.';
  const study = catalogMode === 'learn' ? `<div class="study-insight"><b>Para aprender:</b> ${studyCopy}</div>` : '';
  $('#cardInspector').innerHTML = `<div class="inspect-card">${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : '<div class="empty-inspector">✦</div>'}<div><span class="inspect-meta">${escapeHtml(card.type)} · ${escapeHtml(card.code)}</span><h2>${escapeHtml(card.name)}</h2><p>${escapeHtml(card.domains.join(' · ') || 'Sin dominio')} ${card.tags.length ? `· ${escapeHtml(card.tags.join(', '))}` : ''}</p><p>${escapeHtml(card.text || 'Sin texto de reglas disponible en la respuesta del catálogo.')}</p>${study}<div class="inspect-actions">${actions.join('') || (catalogMode === 'learn' ? '<span class="deck-empty">Estás en modo aprender: esta vista no modifica tu mazo.</span>' : '<span class="deck-empty">Tipo de carta pendiente de identificar.</span>')}</div></div></div>`;
}

function renderBuildFlow() {
  const current = constructionStep();
  const active = activeCatalogStep();
  const steps = [{ number: 1, title: 'Leyenda', detail: 'define dominios' }, { number: 2, title: 'Campeón', detail: 'compatible' }, { number: 3, title: 'Escenarios', detail: '3 distintos' }, { number: 4, title: 'Cartas y runas', detail: 'completar mazo' }];
  $('#buildFlow').innerHTML = `<p class="build-flow-title">ORDEN DE CONSTRUCCIÓN</p><div class="build-steps">${steps.map(step => `<button class="build-step ${active === step.number ? 'current' : ''} ${current > step.number ? 'done' : ''}" data-open-build-step="${step.number}" ${step.number > current ? 'disabled' : ''}><b>${step.number}. ${step.title}</b><span>${step.detail}</span></button>`).join('')}</div>`;
}

function renderLearningControls() {
  if (catalogMode !== 'learn') return;
  const types = [['Legend', 'Leyendas'], ['Unit', 'Unidades'], ['Spell', 'Hechizos'], ['Gear', 'Equipo'], ['Battlefield', 'Escenarios'], ['Rune', 'Runas']];
  $('#catalogGuide').innerHTML += `<div class="study-actions"><span class="study-note"><b>Elige una familia:</b></span>${types.map(([type, label]) => `<button class="study-type" data-study-type="${type}">${label}</button>`).join('')}</div><p class="study-note">Consejo: selecciona una carta para ver una explicación corta de su papel. El ◉ abre una lectura grande sin cambiar de pantalla.</p>`;
}

function renderAll() {
  if (catalogStepOverride && catalogStepOverride > constructionStep()) catalogStepOverride = null;
  $('#deckName').value = builder.name || 'Mazo sin nombre';
  $('#deckDescription').value = builder.description || '';
  renderRows('legend', 'legendList', true); renderRows('champion', 'championList', true); renderRows('battlefields', 'battlefieldList'); renderRows('runes', 'runeList'); renderRows('main', 'mainList'); renderRows('sideboard', 'sideboardList');
  $('#legendCount').textContent = `${builder.legend ? 1 : 0}/1`; $('#championCount').textContent = `${builder.champion ? 1 : 0}/1`; $('#battlefieldCount').textContent = `${Object.keys(builder.battlefields).length}/3`; $('#runeCount').textContent = `${total(builder.runes)}/12`; $('#mainCount').textContent = `${total(builder.main) + (builder.champion ? 1 : 0)}/40+`; $('#sideboardCount').textContent = total(builder.sideboard);
  renderBuildFlow(); renderValidation(); renderCatalog(); renderLearningControls(); renderInspector();
}

function saveToLibrary() {
  persistDraft();
  const library = loadLibrary();
  const snapshot = JSON.parse(JSON.stringify({ ...builder, savedAt: new Date().toISOString() }));
  const index = library.findIndex(deck => deck.name === snapshot.name);
  if (index >= 0) library[index] = snapshot; else library.unshift(snapshot);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  renderDeckLibrary();
  setStatus(`“${snapshot.name}” quedó guardado en Mis mazos.`);
}

function renderDeckLibrary() {
  const library = loadLibrary();
  $('#deckLibraryList').innerHTML = library.length ? library.map((deck, index) => {
    const main = total(deck.main || {}) + (deck.champion ? 1 : 0);
    return `<article class="saved-deck"><h3>${escapeHtml(deck.name || 'Mazo sin nombre')}</h3><p>${escapeHtml(deck.description || 'Sin descripción.')}</p><small>${main} cartas · ${total(deck.runes || {})} runas · ${(Object.keys(deck.battlefields || {})).length} escenarios</small><div class="saved-deck-actions"><button data-load-deck="${index}">Abrir</button><button class="delete" data-delete-deck="${index}">Eliminar</button></div></article>`;
  }).join('') : '<p class="empty-library">Todavía no has guardado mazos. Ponles un nombre y una descripción, luego pulsa Guardar.</p>';
}

function openLibrary() {
  renderDeckLibrary();
  $('#scrim').classList.remove('hidden'); $('#deckLibraryModal').classList.remove('hidden');
}

function closeLibrary() { $('#deckLibraryModal').classList.add('hidden'); $('#scrim').classList.add('hidden'); }

function loadFromLibrary(index) {
  const deck = loadLibrary()[index]; if (!deck) return;
  builder = { ...blankBuilder(), ...JSON.parse(JSON.stringify(deck)) }; delete builder.savedAt;
  selectedCode = builder.champion || builder.legend || null; persistDraft(); renderAll(); closeLibrary(); setStatus(`Abierto “${builder.name}”.`);
}

function deleteFromLibrary(index) {
  const library = loadLibrary(); const [removed] = library.splice(index, 1); localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)); renderDeckLibrary(); setStatus(`Se eliminó “${removed?.name || 'el mazo'}” de Mis mazos.`);
}

async function hydrateCard(code) {
  if (catalogState !== 'live' || requestedDetails.has(code)) return;
  requestedDetails.add(code);
  try {
    const response = await fetch(`https://riftscribe.gg/api/cards/${encodeURIComponent(code)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error();
    const detailed = normalizeCard(await response.json());
    const index = catalog.findIndex(card => card.code === code);
    if (index >= 0) catalog[index] = { ...catalog[index], ...detailed, domains: detailed.domains.length ? detailed.domains : catalog[index].domains };
    if (selectedCode === code) renderAll();
  } catch { /* El catálogo compacto sigue siendo útil si no hay detalle disponible. */ }
}

function classifyImported(cardCode, count, zoneHint = '') {
  const code = normalizeCode(cardCode); const card = getCard(code);
  const zone = zoneHint || ({ Battlefield: 'battlefields', Rune: 'runes', Legend: 'legend' }[card.type] || 'main');
  if (card.type === 'Unknown') { builder.unresolved[code] = (builder.unresolved[code] || 0) + count; return; }
  if (zone === 'legend') { builder.legend = code; return; }
  if (zone === 'battlefields') { builder.battlefields[code] = 1; return; }
  if (zone === 'runes') { builder.runes[code] = (builder.runes[code] || 0) + count; return; }
  builder[zone][code] = (builder[zone][code] || 0) + count;
}

function rehydrateUnknown() {
  const pending = Object.entries(builder.unresolved);
  if (!pending.length) return;
  builder.unresolved = {};
  pending.forEach(([code, count]) => classifyImported(code, count));
  persistDraft();
}

function extractCode(input) {
  const urlMatch = input.match(/[?&]code=([A-Z2-7]+)/i);
  if (urlMatch) return urlMatch[1];
  const exact = input.trim().match(/^([A-Z2-7]{12,})$/i);
  return exact ? exact[1] : null;
}

function importDeck() {
  const input = $('#importInput').value.trim();
  if (!input) return setStatus('Pega un código, enlace o lista de cartas antes de importar.');
  try {
    if (input.startsWith('{')) { builder = { ...blankBuilder(), ...JSON.parse(input) }; setStatus('Archivo de El Rifty importado.'); }
    else {
      const sharedCode = extractCode(input);
      builder = blankBuilder();
      if (sharedCode) {
        if (!globalThis.RiftyDeckCodes?.getDeckFromCode) throw new Error('El códec de Piltover Archive no se cargó.');
        const decoded = globalThis.RiftyDeckCodes.getDeckFromCode(sharedCode);
        decoded.mainDeck.forEach(entry => classifyImported(entry.cardCode, entry.count));
        decoded.sideboard.forEach(entry => classifyImported(entry.cardCode, entry.count, 'sideboard'));
        builder.champion = decoded.chosenChampion ? normalizeCode(decoded.chosenChampion) : null;
        setStatus('Código de Piltover Archive importado. Selecciona la Leyenda: los códigos compartidos no la incluyen.');
      } else {
        const matches = [...input.matchAll(/(?:^|\n)\s*(\d+)\s*(?:x\s*)?([A-Z0-9]{3}-(?:R)?\d+[A-Z*]?)/gim)];
        if (!matches.length) throw new Error('No encontré códigos como “3 OGN-006” en el texto.');
        matches.forEach(([, count, code]) => classifyImported(code, Number(count)));
        setStatus(`Lista de texto importada: ${matches.length} entradas.`);
      }
    }
    selectedCode = builder.champion || builder.legend; rehydrateUnknown(); persistDraft(); renderAll();
  } catch (error) { setStatus(`No se pudo importar: ${error.message}`); }
}

function exportCodeFor(cardCode) {
  const source = String(cardCode || '').trim().toUpperCase();
  const match = source.match(/^([A-Z0-9]{3})-((?:R)?\d+|SP\d+)([A-Z*]?)(?:-[A-Z0-9]+)?$/);
  if (!match) return null;
  const [, set, number, variant] = match;
  return `${set}-${number}${variant === '*' ? '*' : variant.toLowerCase()}`;
}

function exportEntries(record, invalidCodes) {
  const grouped = new Map();
  recordsToEntries(record).forEach(({ cardCode, count }) => {
    const exportCode = exportCodeFor(cardCode);
    if (!exportCode) { invalidCodes.push(`${getCard(cardCode).name} (${cardCode})`); return; }
    grouped.set(exportCode, (grouped.get(exportCode) || 0) + Number(count));
  });
  return [...grouped].map(([cardCode, count]) => ({ cardCode, count }));
}

function getDeckCode() {
  const invalidCodes = [];
  const cards = [...exportEntries(builder.main, invalidCodes), ...exportEntries(builder.runes, invalidCodes), ...exportEntries(builder.battlefields, invalidCodes)];
  const sideboard = exportEntries(builder.sideboard, invalidCodes);
  const champion = builder.champion ? exportCodeFor(builder.champion) : undefined;
  if (builder.champion && !champion) invalidCodes.push(`${getCard(builder.champion).name} (${builder.champion})`);
  if (invalidCodes.length) throw new Error(`Estas cartas no tienen un código compatible para compartir: ${invalidCodes.slice(0, 3).join(', ')}${invalidCodes.length > 3 ? '…' : ''}.`);
  if (!globalThis.RiftyDeckCodes?.getCodeFromDeck) throw new Error('El códec de Piltover Archive no se cargó. Recarga la página e inténtalo de nuevo.');
  return globalThis.RiftyDeckCodes.getCodeFromDeck(cards, sideboard, champion);
}

function exportDeck() {
  try {
    persistDraft(); const code = getDeckCode();
    $('#exportTitle').textContent = `Exportar “${builder.name}”`; $('#deckCodeOutput').value = code; $('#exportMessage').textContent = validateDeck().errors.length ? 'El código se generó, pero revisa las advertencias de legalidad antes de jugar.' : 'Código listo para Piltover Archive y herramientas compatibles.';
    $('#scrim').classList.remove('hidden'); $('#exportModal').classList.remove('hidden');
  } catch (error) { setStatus(`No se pudo exportar: ${error.message}`); }
}

async function copyCode() {
  try { await navigator.clipboard.writeText($('#deckCodeOutput').value); $('#exportMessage').textContent = 'Código copiado.'; }
  catch { $('#deckCodeOutput').select(); document.execCommand('copy'); $('#exportMessage').textContent = 'Código copiado.'; }
}

function downloadDeck() {
  persistDraft(); const file = new Blob([JSON.stringify({ app: 'El Rifty', version: 1, ...builder }, null, 2)], { type: 'application/json' }); const href = URL.createObjectURL(file); const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${builder.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'mazo'}-el-rifty.json`; anchor.click(); URL.revokeObjectURL(href);
}

async function fetchCatalog() {
  $('#catalogStatus').textContent = 'Cargando la colección incluida…';
  try {
    const data = INCLUDED_CATALOG;
    const rawCards = Array.isArray(data) ? data : data?.cards || data?.data || data?.results || [];
    const normalized = rawCards.map(normalizeCard).filter(card => card.code && card.name);
    if (!normalized.length) throw new Error('la respuesta no incluyó cartas reconocibles');
    catalog = [...new Map(normalized.map(card => [card.code, card])).values()]; catalogState = 'included'; rehydrateUnknown(); selectedCode ||= catalog[0].code; setStatus(`Colección cargada: ${catalog.length} cartas de Piltover Archive.`); renderAll();
  } catch (error) { catalog = [...fallbackCards]; catalogState = 'fallback'; $('#catalogStatus').textContent = `No se pudo cargar la colección incluida (${error.message}). Están disponibles cartas de muestra; intenta actualizar de nuevo.`; renderAll(); }
}

document.addEventListener('click', event => {
  const modeButton = event.target.closest('[data-catalog-mode]'); const buildStepButton = event.target.closest('[data-open-build-step]'); const studyType = event.target.closest('[data-study-type]'); const preview = event.target.closest('[data-preview-card]'); const cardButton = event.target.closest('[data-select-card]'); const addButton = event.target.closest('[data-add-zone]'); const adjustment = event.target.closest('[data-adjust-zone]'); const quick = event.target.closest('[data-quick-zone]'); const loadDeck = event.target.closest('[data-load-deck]'); const deleteDeck = event.target.closest('[data-delete-deck]');
  if (modeButton) { catalogMode = modeButton.dataset.catalogMode; catalogStepOverride = null; document.querySelectorAll('[data-catalog-mode]').forEach(button => button.setAttribute('aria-selected', String(button === modeButton))); renderAll(); return; }
  if (buildStepButton) { catalogMode = 'build'; catalogStepOverride = Number(buildStepButton.dataset.openBuildStep); renderAll(); return; }
  if (studyType) { catalogMode = 'learn'; $('#typeFilter').value = studyType.dataset.studyType; renderAll(); return; }
  if (preview) { selectedCode = preview.dataset.previewCard; renderInspector(); showCardPreview(preview.dataset.previewCard, preview); return; }
  if (cardButton) { selectedCode = cardButton.dataset.selectCard; renderAll(); hydrateCard(selectedCode); }
  if (addButton && selectedCode) addCard(addButton.dataset.addZone, selectedCode);
  if (adjustment) { const zone = adjustment.dataset.adjustZone; const code = adjustment.dataset.code; const delta = Number(adjustment.dataset.delta); if (delta < 0) removeCard(zone, code); else addCard(zone, code); }
  if (quick) quickAdjust(quick.dataset.quickZone, quick.dataset.quickCode, Number(quick.dataset.quickDelta));
  if (loadDeck) loadFromLibrary(Number(loadDeck.dataset.loadDeck));
  if (deleteDeck) deleteFromLibrary(Number(deleteDeck.dataset.deleteDeck));
});

function showCardPreview(code, anchor) {
  const card = getCard(code); const preview = $('#cardPreview'); const rect = anchor.getBoundingClientRect();
  const width = Math.min(280, window.innerWidth - 20); const left = rect.left > window.innerWidth * .58 ? Math.max(10, rect.left - width - 12) : Math.min(window.innerWidth - width - 10, rect.right + 12);
  const top = Math.max(10, Math.min(window.innerHeight - Math.min(390, window.innerHeight - 20), rect.top - 8));
  preview.style.left = `${left}px`; preview.style.top = `${top}px`;
  preview.innerHTML = card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}"><p>${escapeHtml(card.name)} · ${escapeHtml(card.code)}</p>` : `<div class="preview-empty"><span>✦</span><p>${escapeHtml(card.name)}<br>${escapeHtml(card.text || 'Sin imagen disponible')}</p></div>`;
  preview.classList.remove('hidden'); preview.setAttribute('aria-hidden', 'false');
}
function hideCardPreview() { $('#cardPreview').classList.add('hidden'); $('#cardPreview').setAttribute('aria-hidden', 'true'); }

document.addEventListener('pointerover', event => {
  const eye = event.target.closest('[data-preview-card]'); if (eye) return showCardPreview(eye.dataset.previewCard, eye);
  const row = event.target.closest('[data-deck-preview-card]'); if (row && !row.contains(event.relatedTarget)) showCardPreview(row.dataset.deckPreviewCard, row);
});
document.addEventListener('pointerout', event => {
  const eye = event.target.closest('[data-preview-card]'); if (eye && !eye.contains(event.relatedTarget)) return hideCardPreview();
  const row = event.target.closest('[data-deck-preview-card]'); if (row && !row.contains(event.relatedTarget)) hideCardPreview();
});
document.addEventListener('focusin', event => { const eye = event.target.closest('[data-preview-card]'); if (eye) showCardPreview(eye.dataset.previewCard, eye); });
document.addEventListener('focusout', event => { const eye = event.target.closest('[data-preview-card]'); if (eye) hideCardPreview(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideCardPreview(); });

$('#cardSearch').addEventListener('input', renderCatalog);
['typeFilter', 'domainFilter'].forEach(id => { $(`#${id}`).addEventListener('input', renderCatalog); $(`#${id}`).addEventListener('change', renderCatalog); });
['deckName', 'deckDescription'].forEach(id => $(`#${id}`).addEventListener('input', persistDraft));
$('#reloadCatalog').addEventListener('click', fetchCatalog);
$('#clearDeck').addEventListener('click', () => { builder = blankBuilder(); selectedCode = null; persistDraft(); renderAll(); setStatus('Mazo vacío.'); });
$('#saveDeck').addEventListener('click', saveToLibrary);
$('#openLibrary').addEventListener('click', openLibrary);
$('#closeLibrary').addEventListener('click', closeLibrary);
$('#importDeck').addEventListener('click', importDeck);
$('#exportDeck').addEventListener('click', exportDeck);
$('#closeExport').addEventListener('click', () => { $('#exportModal').classList.add('hidden'); $('#scrim').classList.add('hidden'); });
$('#scrim').addEventListener('click', () => { $('#exportModal').classList.add('hidden'); $('#deckLibraryModal').classList.add('hidden'); $('#scrim').classList.add('hidden'); });
$('#copyCode').addEventListener('click', copyCode);
$('#downloadDeck').addEventListener('click', downloadDeck);

renderAll();
fetchCatalog();
