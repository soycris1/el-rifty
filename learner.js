const $ = selector => document.querySelector(selector);

const SET_NAMES = {
  OGN: 'Origins',
  OGS: 'Origins · Starter',
  SFD: 'Spiritforged',
  UNL: 'Unleashed',
  VEN: 'VEN',
  ARC: 'ARC',
  RAD: 'RAD',
};

const MECHANICS = [
  'action', 'reaction', 'hidden', 'deflect', 'ambush', 'assault', 'backline', 'deathknell', 'empower', 'equip', 'flow', 'ganking', 'hunt', 'predict', 'repeat', 'shield', 'tank', 'vision', 'weaponmaster', 'accelerate', 'level', 'mighty', 'temporary', 'unique',
];

const GLOSSARY = {
  action: 'Se juega en tu turno o durante un showdown; revisa el texto recordatorio específico de la carta.',
  reaction: 'Puede jugarse en cualquier momento, incluso antes de que resuelvan hechizos y habilidades.',
  hidden: 'Se puede ocultar ahora pagando una Runa para reaccionar después por 0. Lee las condiciones de la carta.',
  deflect: 'El rival debe pagar una Runa para elegir esta carta con un hechizo o habilidad.',
  ambush: 'Agrupa cartas que entran o reaccionan en momentos de combate; el detalle exacto está en el texto de cada carta.',
  assault: 'Una mejora de combate. La cifra concreta y su duración aparecen en la propia carta.',
  backline: 'Agrupa cartas que interactúan con la retaguardia; el texto de reglas concreta cómo.',
  deathknell: 'Agrupa efectos que se disparan al morir o destruirse una carta.',
  empower: 'Una carta puede volverse Empowered al pagar el coste o cumplir la condición que indica.',
  equip: 'Permite vincular Equipo a una Unidad. Comprueba coste y restricciones de la carta.',
  flow: 'Palabra clave de sinergia: mira las cartas con Flow para descubrir qué condición comparten.',
  ganking: 'La unidad puede moverse de campo de batalla a campo de batalla.',
  hunt: 'Se relaciona con ganar XP al conquistar o mantener; lee el recordatorio de cada carta.',
  predict: 'Mira la carta superior de tu mazo principal y puedes reciclarla.',
  repeat: 'Agrupa efectos que vuelven a realizar una acción; la carta define exactamente qué se repite.',
  shield: 'Mejora de defensa que la carta explica en su texto recordatorio.',
  tank: 'Esta unidad debe recibir primero el daño de combate asignado.',
  vision: 'Palabra clave de sinergia. Explora otras cartas Vision para ver sus interacciones.',
  weaponmaster: 'Al jugar la unidad, puede permitir Equipar con descuento, según su texto.',
  accelerate: 'Agrupa cartas que adelantan una acción o recurso; usa su texto para conocer el alcance.',
  level: 'Se relaciona con XP y niveles. La carta indica el umbral y el beneficio.',
  mighty: 'Palabra clave de fuerza; consulta el texto recordatorio de la carta.',
  temporary: 'El efecto o mejora dura solo el tiempo que especifica la carta.',
  unique: 'Límite de una copia en el mazo para esa carta.',
};

const GENERIC_TAGS = new Set(['champion', 'signature', 'unique', 'equipment', 'token']);
const FAVORITES_KEY = 'el-rifty-card-learner-favorites-v1';
let cards = [];
let selectedCode = null;
const activeMechanics = new Set();
let favoritesOnly = false;
let compareCodes = [];

function loadFavorites() {
  try { const stored = JSON.parse(globalThis.localStorage?.getItem(FAVORITES_KEY) || '[]'); return new Set(Array.isArray(stored) ? stored : []); }
  catch { return new Set(); }
}
const favorites = loadFavorites();
function saveFavorites() { try { globalThis.localStorage?.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch { /* El estudio sigue funcionando si el navegador bloquea almacenamiento local. */ } }
function isMobileView() { return globalThis.matchMedia?.('(max-width: 760px)').matches || false; }
function openMobileStudy() { if (!isMobileView()) return; $('#studyPanel').classList.add('mobile-open'); $('#studyScrim').classList.remove('hidden'); }
function closeMobileStudy() { $('#studyPanel').classList.remove('mobile-open'); $('#studyScrim').classList.add('hidden'); }

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function collectionCode(code) { return String(code || '').split('-')[0] || 'OTR'; }
function collectionName(code) { return SET_NAMES[collectionCode(code)] || collectionCode(code); }
function canonicalPrint(code) {
  const source = String(code || '').toUpperCase();
  const match = source.match(/^([A-Z0-9]{3}-(?:(?:R)?\d+|SP\d+))[A-Z*]?(?:-[A-Z0-9]+)?$/);
  return match ? match[1] : source;
}
function mechanicsFor(text = '') {
  const normalized = String(text).toLowerCase();
  return MECHANICS.filter(mechanic => new RegExp(`(?:\\[${mechanic}\\]|\\b${mechanic}\\b)`, 'i').test(normalized));
}
function normaliseCard(raw) {
  const code = String(raw.code || raw.card_code || '').toUpperCase();
  return {
    code,
    identity: canonicalPrint(code),
    name: raw.name || code || 'Carta sin nombre',
    type: raw.type || 'Unknown',
    domains: Array.isArray(raw.domains) ? raw.domains.map(domain => String(domain).toLowerCase()) : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    image: raw.image || '',
    text: raw.text || '',
    collection: collectionCode(code),
    collectionName: collectionName(code),
    mechanics: mechanicsFor(raw.text),
    energy: raw.energy,
    might: raw.might,
    power: raw.power,
    variantType: raw.variantType || '',
  };
}
function readable(value) { return String(value || '').replace(/\b\w/g, letter => letter.toUpperCase()); }
function getCard(code) { return cards.find(card => card.code === code) || null; }

function filterCards() {
  const search = $('#learnSearch').value.trim().toLowerCase();
  const collection = $('#collectionFilter').value;
  const type = $('#learnType').value;
  const domain = $('#learnDomain').value;
  return cards.filter(card => {
    const haystack = `${card.name} ${card.code} ${card.text} ${card.tags.join(' ')} ${card.mechanics.join(' ')}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!collection || card.collection === collection)
      && (!type || card.type === type)
      && (!domain || card.domains.includes(domain))
      && (!favoritesOnly || favorites.has(card.code))
      && [...activeMechanics].every(mechanic => card.mechanics.includes(mechanic));
  });
}

function renderMechanicChips() {
  $('#mechanicChips').innerHTML = MECHANICS.map(mechanic => `<button class="mechanic-chip ${activeMechanics.has(mechanic) ? 'active' : ''}" data-mechanic="${mechanic}" aria-pressed="${activeMechanics.has(mechanic)}">${escapeHtml(readable(mechanic))}</button>`).join('');
}

function renderCatalog() {
  const shown = filterCards();
  if (shown.length && !shown.some(card => card.code === selectedCode)) selectedCode = shown[0].code;
  $('#catalogTitle').textContent = activeMechanics.size ? `Cartas con ${[...activeMechanics].map(readable).join(' + ')}` : 'Todas las cartas';
  $('#learnerStatus').textContent = `${shown.length} de ${cards.length} cartas · impresiones alternativas agrupadas${favoritesOnly ? ' · favoritas' : ''}`;
  $('#learnerGallery').innerHTML = shown.length ? shown.map(card => `<button class="learn-card ${selectedCode === card.code ? 'selected' : ''}" data-learn-card="${escapeHtml(card.code)}" aria-label="Estudiar ${escapeHtml(card.name)}">${favorites.has(card.code) ? '<span class="favorite-mark" aria-hidden="true">♥</span>' : ''}${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}" loading="lazy">` : '<span class="missing-art">✦</span>'}<span class="learn-card-label"><b>${escapeHtml(card.name)}</b><span>${escapeHtml(card.collectionName)} · ${escapeHtml(card.type)}</span></span></button>`).join('') : '<p class="no-results">No encontré cartas con esa combinación. Quita una mecánica o ajusta los filtros.</p>';
}

function sharedTags(card, candidate) {
  const own = new Set(card.tags.map(tag => String(tag).toLowerCase()).filter(tag => !GENERIC_TAGS.has(tag)));
  return candidate.tags.map(tag => String(tag)).filter(tag => own.has(tag.toLowerCase()));
}

function relatedCards(card) {
  const cardDomainSet = new Set(card.domains);
  const cardMechanicSet = new Set(card.mechanics);
  const results = cards.filter(candidate => candidate.code !== card.code).map(candidate => {
    const reasons = [];
    let score = 0;
    const tags = sharedTags(card, candidate);
    if (tags.length) { score += 5 + tags.length; reasons.push(`comparte ${tags.slice(0, 2).join(' · ')}`); }
    const sharedMechanics = candidate.mechanics.filter(mechanic => cardMechanicSet.has(mechanic));
    if (sharedMechanics.length) { score += 3 + sharedMechanics.length; reasons.push(`usa ${sharedMechanics.slice(0, 2).map(readable).join(' · ')}`); }
    const sharedDomains = candidate.domains.filter(domain => cardDomainSet.has(domain));
    if (sharedDomains.length) { score += 1; reasons.push(`mismo dominio: ${sharedDomains.map(readable).join(' · ')}`); }
    const text = `${card.text} ${candidate.text}`.toLowerCase();
    if (card.type === 'Gear' && candidate.type === 'Unit') { score += 2; reasons.push('Unidad + Equipo'); }
    if (card.type === 'Unit' && candidate.type === 'Gear') { score += 2; reasons.push('Equipo para Unidad'); }
    if (/\brune\b/.test(text) && (card.type === 'Rune' || candidate.type === 'Rune')) { score += 2; reasons.push('interacción con Runas'); }
    if (/\bspell\b/.test(text) && (card.type === 'Spell' || candidate.type === 'Spell')) { score += 1; reasons.push('interacción con Hechizos'); }
    return { candidate, score, reasons };
  }).filter(item => item.score >= 3 && item.reasons.length).sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
  return results.slice(0, 7);
}

function mechanicsGlossary(card) {
  if (!card.mechanics.length) return '<p class="source-note">No detecté una de las mecánicas estudiables de esta carta. Su texto completo sigue siendo la fuente principal.</p>';
  return `<section class="glossary"><h3>Qué estudiar aquí</h3>${card.mechanics.map(mechanic => `<p><b>${escapeHtml(readable(mechanic))}:</b> ${escapeHtml(GLOSSARY[mechanic] || 'Consulta el texto recordatorio de la carta.')}</p>`).join('')}</section>`;
}

function renderInspector() {
  const card = getCard(selectedCode);
  if (!card) return;
  const related = relatedCards(card);
  const stats = [card.energy !== undefined ? `Energía ${card.energy}` : '', card.might ? `Might ${card.might}` : '', card.power ? `Power ${card.power}` : ''].filter(Boolean).join(' · ');
  const isFavorite = favorites.has(card.code);
  const inComparison = compareCodes.includes(card.code);
  $('#learnerInspector').innerHTML = `<article class="study-card"><button class="mobile-close" data-close-study aria-label="Cerrar carta">×</button>${card.image ? `<img class="study-art" src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : ''}<div><span class="study-code">${escapeHtml(card.collectionName)} · ${escapeHtml(card.code)}</span><h2>${escapeHtml(card.name)}</h2><p class="study-meta">${escapeHtml(card.type)}${card.domains.length ? ` · ${escapeHtml(card.domains.map(readable).join(' · '))}` : ''}${stats ? ` · ${escapeHtml(stats)}` : ''}</p><div class="study-actions"><button class="favorite ${isFavorite ? 'active' : ''}" data-toggle-favorite><span>♥</span> ${isFavorite ? 'Quitar favorita' : 'Favorita'}</button><button class="compare ${inComparison ? 'active' : ''}" data-toggle-compare>${inComparison ? '✓ En comparación' : '⇄ Comparar carta'}</button></div><div class="mechanic-list">${card.mechanics.length ? card.mechanics.map(mechanic => `<span class="mechanic-badge">${escapeHtml(readable(mechanic))}</span>`).join('') : '<span class="mechanic-badge">Texto de reglas</span>'}</div><p class="study-text">${escapeHtml(card.text || 'No hay texto de reglas disponible para esta impresión.')}</p>${mechanicsGlossary(card)}</div><section class="synergy"><h3>Cartas que podrían jugarse con esta</h3><p>Son sugerencias de estudio por dominios, etiquetas y mecánicas compartidas; confirma siempre la interacción en el texto de ambas cartas.</p><div class="synergy-list">${related.length ? related.map(({ candidate, reasons }) => `<button class="synergy-card" data-learn-card="${escapeHtml(candidate.code)}">${candidate.image ? `<img src="${escapeHtml(candidate.image)}" alt="">` : '<span class="synergy-fallback">✦</span>'}<span><b>${escapeHtml(candidate.name)}</b><span>${escapeHtml(reasons.slice(0, 2).join(' · '))}</span></span></button>`).join('') : '<p class="source-note">Todavía no hay una coincidencia fuerte en el catálogo para esta carta. Prueba con su dominio o sus etiquetas.</p>'}</div><p class="source-note">Colección incluida de Piltover Archive. Las sugerencias no ejecutan ni inventan efectos.</p></section></article>`;
}

function comparisonCard(card) {
  const stats = [card.energy !== undefined ? `Energía ${card.energy}` : '', card.might ? `Might ${card.might}` : '', card.power ? `Power ${card.power}` : ''].filter(Boolean).join(' · ');
  return `<article class="compare-card">${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : '<span class="synergy-fallback">✦</span>'}<div><span class="study-code">${escapeHtml(card.collectionName)} · ${escapeHtml(card.type)}</span><h3>${escapeHtml(card.name)}</h3><p class="study-meta">${escapeHtml(card.domains.map(readable).join(' · ') || 'Sin dominio')}${stats ? ` · ${escapeHtml(stats)}` : ''}</p><div class="mechanic-list">${card.mechanics.length ? card.mechanics.map(mechanic => `<span class="mechanic-badge">${escapeHtml(readable(mechanic))}</span>`).join('') : '<span class="mechanic-badge">Texto de reglas</span>'}</div><p>${escapeHtml(card.text || 'Sin texto de reglas.')}</p></div></article>`;
}

function renderCompareTray() {
  const tray = $('#compareTray');
  const chosen = compareCodes.map(getCard).filter(Boolean);
  tray.classList.toggle('hidden', !chosen.length);
  if (!chosen.length) { tray.innerHTML = ''; return; }
  tray.innerHTML = `<strong>Comparar (${chosen.length}/2)</strong><div class="compare-slots">${chosen.map(card => `<span class="compare-slot">${card.image ? `<img src="${escapeHtml(card.image)}" alt="">` : ''}<span>${escapeHtml(card.name)}</span><button class="compare-remove" data-compare-remove="${escapeHtml(card.code)}" aria-label="Quitar ${escapeHtml(card.name)}">×</button></span>`).join('')}</div><button class="compare-open" data-open-comparison ${chosen.length !== 2 ? 'disabled' : ''}>Ver comparación</button>`;
}

function openComparison() {
  const chosen = compareCodes.map(getCard).filter(Boolean);
  if (chosen.length !== 2) return;
  $('#compareModal').innerHTML = `<button class="compare-close" data-close-comparison aria-label="Cerrar comparación">×</button><span class="eyebrow">COMPARACIÓN</span><h2>${escapeHtml(chosen[0].name)} vs. ${escapeHtml(chosen[1].name)}</h2><div class="compare-grid">${chosen.map(comparisonCard).join('')}</div>`;
  $('#compareOverlay').classList.remove('hidden');
}

function closeComparison() { $('#compareOverlay').classList.add('hidden'); }
function toggleCurrentFavorite() {
  if (!selectedCode) return;
  favorites.has(selectedCode) ? favorites.delete(selectedCode) : favorites.add(selectedCode);
  saveFavorites(); renderAll();
}
function toggleCurrentComparison() {
  if (!selectedCode) return;
  if (compareCodes.includes(selectedCode)) compareCodes = compareCodes.filter(code => code !== selectedCode);
  else if (compareCodes.length < 2) compareCodes = [...compareCodes, selectedCode];
  else { compareCodes = [compareCodes[1], selectedCode]; }
  renderAll();
}

function renderAll() {
  renderMechanicChips(); renderCatalog(); renderInspector(); renderCompareTray();
  $('#favoriteFilter').classList.toggle('active', favoritesOnly); $('#favoriteFilter').setAttribute('aria-pressed', String(favoritesOnly));
}

function populateCollections(rawCards) {
  const entries = [...new Set(rawCards.map(card => collectionCode(card.code)))].sort();
  $('#collectionFilter').innerHTML = `<option value="">Todas las colecciones</option>${entries.map(code => `<option value="${escapeHtml(code)}">${escapeHtml(SET_NAMES[code] || code)} (${escapeHtml(code)})</option>`).join('')}`;
}

function loadCatalog() {
  const source = globalThis.EL_RIFTY_CATALOG;
  const raw = Array.isArray(source) ? source : source?.cards || source?.data || [];
  const unique = new Map();
  raw.map(normaliseCard).filter(card => card.code && card.name).forEach(card => {
    if (!unique.has(card.identity) || unique.get(card.identity).variantType !== 'Standard' && card.variantType === 'Standard') unique.set(card.identity, card);
  });
  cards = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  selectedCode = cards[0]?.code || null;
  populateCollections(cards);
  renderAll();
}

document.addEventListener('click', event => {
  const cardButton = event.target.closest('[data-learn-card]');
  const mechanicButton = event.target.closest('[data-mechanic]');
  const removeComparison = event.target.closest('[data-compare-remove]');
  if (event.target.closest('[data-close-study]')) { closeMobileStudy(); return; }
  if (event.target.closest('[data-close-comparison]')) { closeComparison(); return; }
  if (event.target.closest('[data-toggle-favorite]')) { toggleCurrentFavorite(); return; }
  if (event.target.closest('[data-toggle-compare]')) { toggleCurrentComparison(); return; }
  if (event.target.closest('[data-open-comparison]')) { openComparison(); return; }
  if (removeComparison) { compareCodes = compareCodes.filter(code => code !== removeComparison.dataset.compareRemove); renderAll(); return; }
  if (cardButton) { selectedCode = cardButton.dataset.learnCard; renderAll(); openMobileStudy(); return; }
  if (mechanicButton) { const mechanic = mechanicButton.dataset.mechanic; activeMechanics.has(mechanic) ? activeMechanics.delete(mechanic) : activeMechanics.add(mechanic); renderAll(); }
});
['learnSearch', 'collectionFilter', 'learnType', 'learnDomain'].forEach(id => { $(`#${id}`).addEventListener('input', renderAll); $(`#${id}`).addEventListener('change', renderAll); });
$('#clearFilters').addEventListener('click', () => { $('#learnSearch').value = ''; $('#collectionFilter').value = ''; $('#learnType').value = ''; $('#learnDomain').value = ''; activeMechanics.clear(); renderAll(); });
$('#favoriteFilter').addEventListener('click', () => { favoritesOnly = !favoritesOnly; renderAll(); });
$('#studyScrim').addEventListener('click', closeMobileStudy);
$('#compareOverlay').addEventListener('click', event => { if (event.target === $('#compareOverlay')) closeComparison(); });

loadCatalog();
