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
const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=';
const KEYWORD_CLASS = {
  action: 'action', acción: 'action', reaction: 'reaction', reacción: 'reaction', flow: 'flow', flujo: 'flow', assault: 'assault', asalto: 'assault', hidden: 'hidden', oculto: 'hidden', deflect: 'deflect', desviar: 'deflect', ambush: 'ambush', emboscada: 'ambush', backline: 'backline', retaguardia: 'backline', deathknell: 'deathknell', sentencia: 'deathknell', empower: 'empower', potenciar: 'empower', empowered: 'empower', potenciado: 'empower', equip: 'equip', equipar: 'equip', weaponmaster: 'weaponmaster', armero: 'weaponmaster', ganking: 'ganking', hunt: 'hunt', cazar: 'hunt', predict: 'predict', predecir: 'predict', repeat: 'repeat', repetir: 'repeat', shield: 'shield', escudo: 'shield', tank: 'tank', tanque: 'tank', vision: 'vision', visión: 'vision', accelerate: 'accelerate', acelerar: 'accelerate', level: 'level', nivel: 'level', mighty: 'mighty', poderoso: 'mighty', temporary: 'temporary', temporal: 'temporary', unique: 'unique', única: 'unique', unico: 'unique', único: 'unique', unica: 'unique',
};
let cards = [];
let selectedCode = null;
const activeMechanics = new Set();
let favoritesOnly = false;
let compareCodes = [];
const translationCache = new Map();
let touchGesture = null;
let gestureBusy = false;
let closeTimer = null;

function loadFavorites() {
  try { const stored = JSON.parse(globalThis.localStorage?.getItem(FAVORITES_KEY) || '[]'); return new Set(Array.isArray(stored) ? stored : []); }
  catch { return new Set(); }
}
const favorites = loadFavorites();
function saveFavorites() { try { globalThis.localStorage?.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch { /* El estudio sigue funcionando si el navegador bloquea almacenamiento local. */ } }
function isMobileView() { return globalThis.matchMedia?.('(max-width: 760px)').matches || false; }
function clearStudyMotion(panel = $('#studyPanel')) {
  panel.classList.remove('gesture-dragging', 'gesture-exit', 'gesture-closing', 'gesture-opening', 'gesture-enter-next', 'gesture-enter-previous');
  panel.style.removeProperty('--study-drag-x');
  panel.style.removeProperty('--study-drag-y');
  panel.style.removeProperty('opacity');
  $('#studyScrim').style.removeProperty('opacity');
}
function finishCloseMobileStudy() {
  const panel = $('#studyPanel');
  clearTimeout(closeTimer);
  closeTimer = null;
  clearStudyMotion(panel);
  panel.classList.remove('mobile-open');
  $('#studyScrim').classList.add('hidden');
  gestureBusy = false;
}
function openMobileStudy() {
  if (!isMobileView()) return;
  const panel = $('#studyPanel');
  const wasOpen = panel.classList.contains('mobile-open');
  clearTimeout(closeTimer);
  closeTimer = null;
  clearStudyMotion(panel);
  panel.classList.add('mobile-open');
  $('#studyScrim').classList.remove('hidden');
  if (!wasOpen) {
    panel.classList.add('gesture-opening');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('gesture-opening')));
  }
}
function closeMobileStudy({ animate = true } = {}) {
  const panel = $('#studyPanel');
  if (!panel.classList.contains('mobile-open')) { finishCloseMobileStudy(); return; }
  if (!animate || !isMobileView() || panel.classList.contains('gesture-closing')) { finishCloseMobileStudy(); return; }
  touchGesture = null;
  gestureBusy = true;
  panel.classList.remove('gesture-dragging', 'gesture-exit');
  panel.classList.add('gesture-closing');
  panel.style.setProperty('--study-drag-x', '0px');
  panel.style.setProperty('--study-drag-y', `${Math.max(panel.clientHeight, globalThis.innerHeight || 0) + 36}px`);
  panel.style.opacity = '0';
  $('#studyScrim').classList.add('hidden');
  closeTimer = setTimeout(finishCloseMobileStudy, 260);
}

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
function keywordCssClass(value) {
  const normalized = String(value || '').toLowerCase().replace(/^\[|\]$/g, '').trim().split(/\s+/)[0];
  return KEYWORD_CLASS[normalized] || '';
}
function formatCardRules(text = '') {
  const escaped = escapeHtml(text);
  const keywordPattern = /\[([^\]\n]{2,28})\]|\b(Action|Acción|Reaction|Reacción|Flow|Flujo|Assault(?:\s+\d+)?|Asalto(?:\s+\d+)?|Hidden|Oculto|Deflect|Ambush|Emboscada|Backline|Retaguardia|Deathknell|Empower(?:ed)?|Potenciado|Equip(?:ar)?|Weaponmaster|Ganking|Hunt|Cazar|Predict|Predecir|Repeat|Repetir|Shield|Escudo|Tank|Tanque|Vision|Visión|Accelerate|Acelerar|Level|Nivel|Mighty|Poderoso|Temporary|Temporal|Unique|Única|Unica|Único|Unico)\b/gi;
  return escaped.replace(keywordPattern, (match, bracketLabel, bareLabel) => {
    const label = bracketLabel || bareLabel || match;
    const className = keywordCssClass(label);
    return className ? `<span class="rule-keyword kw-${className}">${match}</span>` : match;
  });
}
async function translateCardText(card) {
  if (!card?.text) return;
  const target = $('#cardTranslationText');
  if (!target) return;
  if (translationCache.has(card.code)) {
    target.classList.remove('loading', 'error');
    target.innerHTML = formatCardRules(translationCache.get(card.code));
    return;
  }
  try {
    const response = await fetch(`${TRANSLATE_ENDPOINT}${encodeURIComponent(card.text)}`);
    if (!response.ok) throw new Error('Servicio temporalmente no disponible');
    const payload = await response.json();
    const translated = Array.isArray(payload?.[0]) ? payload[0].map(part => part?.[0] || '').join('') : '';
    if (!translated) throw new Error('No llegó una traducción');
    translationCache.set(card.code, translated);
    if (selectedCode === card.code && $('#cardTranslationText')) {
      const currentTarget = $('#cardTranslationText');
      currentTarget.classList.remove('loading', 'error');
      currentTarget.innerHTML = formatCardRules(translated);
    }
  } catch {
    if (selectedCode === card.code && $('#cardTranslationText')) {
      const currentTarget = $('#cardTranslationText');
      currentTarget.classList.remove('loading');
      currentTarget.classList.add('error');
      currentTarget.textContent = 'No se pudo cargar la traducción automática. El texto original permanece arriba como referencia.';
    }
  }
}

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
  $('#learnerInspector').innerHTML = `<article class="study-card"><div class="mobile-gesture-bar" aria-hidden="true"><span></span></div><button class="mobile-close" data-close-study aria-label="Cerrar carta">×</button><p class="mobile-gesture-hint">Desliza ← / → para cambiar · baja desde la barra para cerrar</p>${card.image ? `<img class="study-art" src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : ''}<div><span class="study-code">${escapeHtml(card.collectionName)} · ${escapeHtml(card.code)}</span><h2>${escapeHtml(card.name)}</h2><p class="study-meta">${escapeHtml(card.type)}${card.domains.length ? ` · ${escapeHtml(card.domains.map(readable).join(' · '))}` : ''}${stats ? ` · ${escapeHtml(stats)}` : ''}</p><div class="study-actions"><button class="favorite ${isFavorite ? 'active' : ''}" data-toggle-favorite><span>♥</span> ${isFavorite ? 'Quitar favorita' : 'Favorita'}</button><button class="compare ${inComparison ? 'active' : ''}" data-toggle-compare>${inComparison ? '✓ En comparación' : '⇄ Comparar carta'}</button></div><div class="mechanic-list">${card.mechanics.length ? card.mechanics.map(mechanic => `<span class="mechanic-badge">${escapeHtml(readable(mechanic))}</span>`).join('') : '<span class="mechanic-badge">Texto de reglas</span>'}</div><p class="study-text">${formatCardRules(card.text || 'No hay texto de reglas disponible para esta impresión.')}</p><section class="translation"><h3>Traducción al español <small>automática · confirma el original</small></h3><p id="cardTranslationText" class="translation-text loading">Traduciendo esta carta…</p></section>${mechanicsGlossary(card)}</div><section class="synergy"><h3>Cartas que podrían jugarse con esta</h3><p>Son sugerencias de estudio por dominios, etiquetas y mecánicas compartidas; confirma siempre la interacción en el texto de ambas cartas.</p><div class="synergy-list">${related.length ? related.map(({ candidate, reasons }) => `<button class="synergy-card" data-learn-card="${escapeHtml(candidate.code)}">${candidate.image ? `<img src="${escapeHtml(candidate.image)}" alt="">` : '<span class="synergy-fallback">✦</span>'}<span><b>${escapeHtml(candidate.name)}</b><span>${escapeHtml(reasons.slice(0, 2).join(' · '))}</span></span></button>`).join('') : '<p class="source-note">Todavía no hay una coincidencia fuerte en el catálogo para esta carta. Prueba con su dominio o sus etiquetas.</p>'}</div><p class="source-note">Colección incluida de Piltover Archive. Las sugerencias no ejecutan ni inventan efectos.</p></section></article>`;
  translateCardText(card);
}

function comparisonCard(card) {
  const stats = [card.energy !== undefined ? `Energía ${card.energy}` : '', card.might ? `Might ${card.might}` : '', card.power ? `Power ${card.power}` : ''].filter(Boolean).join(' · ');
  return `<article class="compare-card">${card.image ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name)}">` : '<span class="synergy-fallback">✦</span>'}<div><span class="study-code">${escapeHtml(card.collectionName)} · ${escapeHtml(card.type)}</span><h3>${escapeHtml(card.name)}</h3><p class="study-meta">${escapeHtml(card.domains.map(readable).join(' · ') || 'Sin dominio')}${stats ? ` · ${escapeHtml(stats)}` : ''}</p><div class="mechanic-list">${card.mechanics.length ? card.mechanics.map(mechanic => `<span class="mechanic-badge">${escapeHtml(readable(mechanic))}</span>`).join('') : '<span class="mechanic-badge">Texto de reglas</span>'}</div><p>${formatCardRules(card.text || 'Sin texto de reglas.')}</p></div></article>`;
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

function browseStudyCard(delta) {
  const visibleCards = filterCards();
  if (visibleCards.length < 2) return;
  const currentIndex = Math.max(0, visibleCards.findIndex(card => card.code === selectedCode));
  selectedCode = visibleCards[(currentIndex + delta + visibleCards.length) % visibleCards.length].code;
  renderAll();
  openMobileStudy();
}

function animateStudyCardChange(delta) {
  const visibleCards = filterCards();
  const panel = $('#studyPanel');
  if (gestureBusy || visibleCards.length < 2) { clearStudyMotion(panel); return; }
  const currentIndex = Math.max(0, visibleCards.findIndex(card => card.code === selectedCode));
  const exitDirection = delta > 0 ? -1 : 1;
  const exitDistance = Math.max(panel.clientWidth, 320) * exitDirection;
  gestureBusy = true;
  panel.classList.remove('gesture-dragging');
  panel.classList.add('gesture-exit');
  panel.getBoundingClientRect();
  panel.style.setProperty('--study-drag-x', `${exitDistance}px`);
  panel.style.setProperty('--study-drag-y', '0px');
  panel.style.opacity = '0';
  setTimeout(() => {
    selectedCode = visibleCards[(currentIndex + delta + visibleCards.length) % visibleCards.length].code;
    renderAll();
    const enterClass = delta > 0 ? 'gesture-enter-next' : 'gesture-enter-previous';
    clearStudyMotion(panel);
    panel.classList.add(enterClass);
    requestAnimationFrame(() => {
      panel.classList.remove(enterClass);
      setTimeout(() => { gestureBusy = false; }, 220);
    });
  }, 210);
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
$('#studyPanel').addEventListener('pointerdown', event => {
  if (!isMobileView() || gestureBusy || event.pointerType === 'mouse' || event.target.closest('button, input, select, a, textarea')) return;
  const panel = $('#studyPanel');
  touchGesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    axis: null,
    controlling: false,
    canClose: Boolean(event.target.closest('.mobile-gesture-bar')) || panel.scrollTop < 3,
  };
});
$('#studyPanel').addEventListener('pointermove', event => {
  if (!touchGesture || touchGesture.id !== event.pointerId || gestureBusy) return;
  const panel = $('#studyPanel');
  const deltaX = event.clientX - touchGesture.x;
  const deltaY = event.clientY - touchGesture.y;
  const distanceX = Math.abs(deltaX);
  const distanceY = Math.abs(deltaY);
  if (!touchGesture.axis) {
    if (Math.max(distanceX, distanceY) < 12) return;
    touchGesture.axis = distanceX > distanceY ? 'horizontal' : 'vertical';
    if (touchGesture.axis === 'vertical' && (!touchGesture.canClose || deltaY <= 0)) { touchGesture = null; return; }
    touchGesture.controlling = true;
    try { panel.setPointerCapture(event.pointerId); } catch { /* Algunos navegadores móviles ya capturaron el puntero. */ }
  }
  if (touchGesture.axis === 'horizontal') {
    if (event.cancelable) event.preventDefault();
    const maxDrag = Math.max(120, panel.clientWidth * 0.58);
    const softenedX = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.82, maxDrag);
    panel.classList.add('gesture-dragging');
    panel.style.setProperty('--study-drag-x', `${softenedX}px`);
    panel.style.setProperty('--study-drag-y', '0px');
    return;
  }
  if (event.cancelable) event.preventDefault();
  const maxDrag = Math.max(150, panel.clientHeight * 0.62);
  const softenedY = Math.min(deltaY * 0.82, maxDrag);
  panel.classList.add('gesture-dragging');
  panel.style.setProperty('--study-drag-x', '0px');
  panel.style.setProperty('--study-drag-y', `${softenedY}px`);
  $('#studyScrim').style.opacity = String(Math.max(0.28, 1 - softenedY / Math.max(1, panel.clientHeight * 0.8)));
});
$('#studyPanel').addEventListener('pointerup', event => {
  if (!touchGesture || touchGesture.id !== event.pointerId) return;
  const gesture = touchGesture;
  const deltaX = event.clientX - gesture.x;
  const deltaY = event.clientY - gesture.y;
  touchGesture = null;
  const panel = $('#studyPanel');
  if (gesture.controlling) { try { panel.releasePointerCapture(event.pointerId); } catch { /* El navegador puede soltarlo automáticamente. */ } }
  if (!gesture.controlling) return;
  const horizontalThreshold = Math.max(78, panel.clientWidth * 0.19);
  const closeThreshold = Math.max(96, panel.clientHeight * 0.14);
  if (gesture.axis === 'vertical' && deltaY >= closeThreshold) { closeMobileStudy(); return; }
  if (gesture.axis === 'horizontal' && Math.abs(deltaX) >= horizontalThreshold) { animateStudyCardChange(deltaX < 0 ? 1 : -1); return; }
  clearStudyMotion(panel);
});
$('#studyPanel').addEventListener('pointercancel', () => { touchGesture = null; clearStudyMotion(); });

loadCatalog();
