// ════════════════════════════════════════════════════════════════
// storage.js — Хранение данных (localStorage + Cloudflare KV)
// ════════════════════════════════════════════════════════════════

// ── Состояние приложения ─────────────────────────────────────────
let menuData     = {};
let kbjuTable    = {};
let mealTimes    = {};
let savedRecipes = { Завтрак: [], Перекус: [], Обед: [], Ужин: [] };
let notes        = '';

// Таймер отложенной синхронизации с KV
let _kvTimer = null;

// ── Загрузка из localStorage ─────────────────────────────────────
function loadAll() {
  try { menuData     = JSON.parse(localStorage.getItem('menuData')     || '{}'); } catch(e) { menuData = {}; }
  try { kbjuTable    = JSON.parse(localStorage.getItem('kbjuTable')    || '{}'); } catch(e) { kbjuTable = {}; }
  try { mealTimes    = JSON.parse(localStorage.getItem('mealTimes')    || '{}'); } catch(e) { mealTimes = {}; }
  try { savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '{"Завтрак":[],"Перекус":[],"Обед":[],"Ужин":[]}'); } catch(e) { savedRecipes = { Завтрак:[], Перекус:[], Обед:[], Ужин:[] }; }
  notes = localStorage.getItem('notes') || '';
}

// ── Сохранение в localStorage + отложенная синхронизация ─────────
function saveAll() {
  localStorage.setItem('menuData',     JSON.stringify(menuData));
  localStorage.setItem('kbjuTable',    JSON.stringify(kbjuTable));
  localStorage.setItem('mealTimes',    JSON.stringify(mealTimes));
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  localStorage.setItem('notes',        notes);
  clearTimeout(_kvTimer);
  _kvTimer = setTimeout(syncToKV, 1500);
}

// ── Cloudflare KV: запись ────────────────────────────────────────
async function syncToKV() {
  try {
    await fetch(WORKER_URL + '/kv/app_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuData, kbjuTable, mealTimes, savedRecipes, notes })
    });
    showBadge('✓ Сохранено в облаке', '#4caf50');
  } catch(e) {
    showBadge('⚠ Только локально', '#ff9800');
  }
}

// ── Cloudflare KV: загрузка ──────────────────────────────────────
async function loadFromKV() {
  try {
    const r   = await fetch(WORKER_URL + '/kv/app_data');
    const res = await r.json();
    if (res.found && res.data) {
      const d = res.data;
      // Берём облачные данные только если они «богаче» локальных
      if (d.menuData     && Object.keys(d.menuData).length     >= Object.keys(menuData).length)     menuData     = d.menuData;
      if (d.kbjuTable    && Object.keys(d.kbjuTable).length    >= Object.keys(kbjuTable).length)    kbjuTable    = d.kbjuTable;
      if (d.mealTimes    && Object.keys(d.mealTimes).length    >= Object.keys(mealTimes).length)    mealTimes    = d.mealTimes;
      if (d.savedRecipes)  savedRecipes = d.savedRecipes;
      if (d.notes        && d.notes.length >= notes.length)                                          notes        = d.notes;
      // Обновляем localStorage
      localStorage.setItem('menuData',     JSON.stringify(menuData));
      localStorage.setItem('kbjuTable',    JSON.stringify(kbjuTable));
      localStorage.setItem('mealTimes',    JSON.stringify(mealTimes));
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
      localStorage.setItem('notes',        notes);
      showBadge('✓ Загружено из облака', '#4a9eff');
      return true;
    }
  } catch(e) {
    showBadge('⚠ Офлайн', '#ff9800');
  }
  return false;
}

// ── Ручная синхронизация (кнопка в topbar) ───────────────────────
async function doSync() {
  const ok = await loadFromKV();
  if (ok) {
    renderMenuDay(curDay);
    renderKbju();
    renderSaved();
    renderNotesLists();
    document.getElementById('notesArea').value = notes;
  }
}

// ── Экспорт резервной копии JSON ─────────────────────────────────
function exportBackup() {
  const data = { menuData, kbjuTable, mealTimes, savedRecipes, notes, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my_menu_backup_' + new Date().toLocaleDateString('ru-RU').replace(/\./g,'-') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Импорт резервной копии JSON ──────────────────────────────────
function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.menuData && !d.kbjuTable) { alert('Неверный формат файла'); return; }
      if (!confirm('Заменить все текущие данные данными из резервной копии?')) return;
      if (d.menuData)     menuData     = d.menuData;
      if (d.kbjuTable)    kbjuTable    = d.kbjuTable;
      if (d.mealTimes)    mealTimes    = d.mealTimes;
      if (d.savedRecipes) savedRecipes = d.savedRecipes;
      if (d.notes != null) notes       = d.notes;
      saveAll();
      renderMenuDay(curDay);
      renderKbju();
      renderSaved();
      renderNotesLists();
      document.getElementById('notesArea').value = notes;
      alert('Резервная копия успешно загружена!');
    } catch(e) {
      alert('Ошибка при разборе файла: ' + e.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ── Уведомление-badge ────────────────────────────────────────────
function showBadge(text, color) {
  let b = document.getElementById('syncBadge');
  if (!b) {
    b = document.createElement('div');
    b.id = 'syncBadge';
    b.style.cssText = 'position:fixed;bottom:14px;right:16px;padding:5px 13px;border-radius:20px;font-size:12px;z-index:9999;transition:opacity .5s;pointer-events:none;';
    document.body.appendChild(b);
  }
  b.style.background = color;
  b.style.color = '#fff';
  b.style.opacity = '1';
  b.textContent = text;
  setTimeout(() => { b.style.opacity = '0'; }, 3000);
}

// ── Заметки в localStorage ────────────────────────────────────────
function saveNotes() {
  notes = document.getElementById('notesArea').value;
  saveAll();
}

// ── Списки продуктов (из парсинга) ───────────────────────────────
function saveListToNotesStorage(entry) {
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem('notesLists') || '[]'); } catch(e) {}
  stored.push(entry);
  localStorage.setItem('notesLists', JSON.stringify(stored));
}
function loadNotesLists() {
  try { return JSON.parse(localStorage.getItem('notesLists') || '[]'); } catch(e) { return []; }
}
function deleteNotesList(i) {
  let stored = loadNotesLists();
  stored.splice(i, 1);
  localStorage.setItem('notesLists', JSON.stringify(stored));
}
function clearAllData() {
  if (!confirm('Удалить ВСЕ данные? Это действие нельзя отменить.')) return;
  localStorage.clear();
  menuData     = {};
  kbjuTable    = {};
  mealTimes    = {};
  savedRecipes = { Завтрак: [], Перекус: [], Обед: [], Ужин: [] };
  notes        = '';
  renderMenuDay(curDay);
  renderKbju();
  renderSaved();
  document.getElementById('notesArea').value = '';
  alert('Все данные удалены.');
}
