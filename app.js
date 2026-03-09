// ════════════════════════════════════════════════════════════════
// app.js — Основная логика приложения
// ════════════════════════════════════════════════════════════════

// ── Состояние приложения ──────────────────────────────────────────
let curDay    = 'Понедельник';
let kSortKey  = null;
let kSortDir  = 1;
let _editProd = null, _psTarget = null, _atmRec = null, _syncDec = [], _renameTarget = null;

// Данные парсинга
let _parsedRows = [], _parsedCats = [];
const parseSelected = new Map();

// ── Инициализация ─────────────────────────────────────────────────
function init() {
  loadAll();
  initDOM();
  document.getElementById('topDate').textContent = new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  DOM.dayTabsWrap.style.display = 'block';
  buildDayTabs();
  renderMenuDay(curDay);
  renderKbju();
  renderSaved();
  renderNotesLists();
  DOM.notesArea.value = notes;

  // Фоновая загрузка из KV
  loadFromKV().then(ok => {
    if (ok) {
      renderMenuDay(curDay);
      renderKbju();
      renderSaved();
      renderNotesLists();
      DOM.notesArea.value = notes;
    }
  });

  // Глобальные обработчики
  document.addEventListener('click', e => {
    if (!e.target.closest('#navDropdown') && !e.target.closest('#sectionsBtn'))
      DOM.navDropdown.classList.remove('open');
    if (!e.target.closest('.dp') && !e.target.closest('.btn-q') && !e.target.closest('.td-time-cell'))
      document.querySelectorAll('.dp').forEach(d => d.remove());
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-ov.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.dp').forEach(d => d.remove());
    }
  });
  document.querySelectorAll('.modal-ov').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); })
  );
}

// ── Меню — логика ─────────────────────────────────────────────────

// Обновление веса ингредиента
function updW(day, meal, idx, val) {
  const w   = parseFloat(val) || 0;
  const ing = menuData[day]?.[meal]?.ingredients?.[idx];
  if (!ing) return;
  ing.weight = w;
  if (kbjuTable[ing.name]) {
    const k = kbjuTable[ing.name], r = w / 100;
    ing.proteins = k.proteins * r;
    ing.fats     = k.fats     * r;
    ing.carbs    = k.carbs    * r;
    ing.calories = k.calories * r;
  }
  saveAll();
  renderMenuDay(curDay);
}

// Удаление ингредиента
function delIng(day, meal, idx) {
  if (!confirm('Удалить ингредиент?')) return;
  menuData[day][meal].ingredients.splice(idx, 1);
  saveAll();
  renderMenuDay(curDay);
}

// Дропдаун выбора времени
function showTimeDp(e, meal) {
  e.stopPropagation();
  document.querySelectorAll('.dp').forEach(d => d.remove());
  const dp  = document.createElement('div'); dp.className = 'dp'; dp.style.minWidth = '75px';
  const frag = document.createDocumentFragment();
  for (let h = 5; h <= 23; h++) {
    const t = String(h).padStart(2, '0') + ':00';
    const it = document.createElement('div'); it.className = 'dp-i'; it.textContent = t;
    it.onclick = ev => { ev.stopPropagation(); mealTimes[meal] = t; saveAll(); renderMenuDay(curDay); dp.remove(); };
    frag.appendChild(it);
  }
  const bl = document.createElement('div'); bl.className = 'dp-i'; bl.textContent = '--:--';
  bl.onclick = ev => { ev.stopPropagation(); mealTimes[meal] = ''; saveAll(); renderMenuDay(curDay); dp.remove(); };
  frag.appendChild(bl);
  dp.appendChild(frag);
  const r = e.currentTarget.getBoundingClientRect();
  dp.style.left = r.left + 'px'; dp.style.top = (r.bottom + 3) + 'px';
  document.body.appendChild(dp);
}

// Дропдаун подстановки ингредиента
function showSug(e, day, meal, idx) {
  e.stopPropagation();
  document.querySelectorAll('.dp').forEach(d => d.remove());
  const ing  = menuData[day][meal].ingredients[idx];
  const term = (ing.originalName || ing.name).toLowerCase();
  let m = Object.keys(kbjuTable).filter(p =>
    p.toLowerCase().includes(term) ||
    term.includes(p.toLowerCase()) ||
    p.split(/\s+/).some(w => w.length > 2 && term.includes(w.toLowerCase()))
  );
  if (!m.length) m = Object.keys(kbjuTable).slice(0, 20);
  const dp = document.createElement('div'); dp.className = 'dp';
  const frag = document.createDocumentFragment();
  m.forEach(p => {
    const it = document.createElement('div'); it.className = 'dp-i'; it.textContent = p;
    it.onclick = ev => { ev.stopPropagation(); replIng(day, meal, idx, p); dp.remove(); };
    frag.appendChild(it);
  });
  dp.appendChild(frag);
  const r = e.currentTarget.getBoundingClientRect();
  dp.style.left = r.left + 'px'; dp.style.top = (r.bottom + 3) + 'px';
  document.body.appendChild(dp);
}

function replIng(day, meal, idx, name) {
  const ing = menuData[day][meal].ingredients[idx], k = kbjuTable[name], r = ing.weight / 100;
  Object.assign(ing, { name, originalName: name, status: 'exact', suggestions: [], proteins: k.proteins * r, fats: k.fats * r, carbs: k.carbs * r, calories: k.calories * r });
  saveAll(); renderMenuDay(curDay);
}

// Переименование блюда
function openRenameDish(day, meal) {
  _renameTarget = { day, meal };
  document.getElementById('rdInput').value = menuData[day]?.[meal]?.dish || '';
  openModal('renameDishModal');
  setTimeout(() => document.getElementById('rdInput').focus(), 100);
}
function confirmRenameDish() {
  if (!_renameTarget) return;
  const { day, meal } = _renameTarget;
  if (!menuData[day]) menuData[day] = {};
  if (!menuData[day][meal]) menuData[day][meal] = { dish: '', ingredients: [], recipe: '' };
  menuData[day][meal].dish = document.getElementById('rdInput').value.trim();
  saveAll(); renderMenuDay(curDay); closeModal('renameDishModal');
}

// Выбор продукта для добавления в меню
function openPS(day, meal) {
  _psTarget = { day, meal };
  DOM.psInput.value = '';
  filterPS();
  openModal('prodSelModal');
}
function pickProd(name) {
  if (!_psTarget) return;
  const { day, meal } = _psTarget;
  if (!menuData[day]) menuData[day] = {};
  if (!menuData[day][meal]) menuData[day][meal] = { dish: '', ingredients: [], recipe: '' };
  const k = kbjuTable[name];
  menuData[day][meal].ingredients.push({
    name, originalName: name, weight: 100, status: 'exact', suggestions: [],
    proteins: k.proteins, fats: k.fats, carbs: k.carbs, calories: k.calories
  });
  saveAll(); renderMenuDay(curDay); closeModal('prodSelModal');
}

// Сохранение приёма пищи как рецепта
function saveMealRecipe(day, meal) {
  const md = menuData[day]?.[meal];
  if (!md || !md.ingredients.length) { alert('Нет ингредиентов'); return; }
  let group = 'Ужин';
  const ml = meal.toLowerCase();
  if (ml.includes('завтрак')) group = 'Завтрак';
  else if (ml.includes('перекус')) group = 'Перекус';
  else if (ml.includes('обед')) group = 'Обед';
  if (!savedRecipes[group]) savedRecipes[group] = [];
  savedRecipes[group].push({ id: Date.now(), name: md.dish || meal, ingredients: JSON.parse(JSON.stringify(md.ingredients)), recipe: md.recipe, meal });
  saveAll(); alert('Рецепт сохранён в "' + group + '"!');
}

// ── Загрузка рецептов из текста ───────────────────────────────────
function findKbju(name) {
  const nl = name.toLowerCase();
  const ex = Object.keys(kbjuTable).find(k => k.toLowerCase() === nl);
  if (ex) return { type: 'exact', name: ex };
  const all = Object.keys(kbjuTable).filter(k => {
    const kl = k.toLowerCase();
    return kl.includes(nl) || nl.includes(kl) || kl.split(/\s+/).some(w => w.length > 2 && nl.includes(w));
  });
  return all.length ? { type: 'partial', name: all[0], all } : { type: 'not_found' };
}

function parseRecipes() {
  const text = document.getElementById('recipeTA').value.trim();
  if (!text) { alert('Пусто!'); return; }
  const blocks = text.split(/^===\s*$/m).map(b => b.trim()).filter(Boolean);
  let loaded = 0, skipped = 0;
  const logItems = [];

  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) { skipped++; return; }
    let li = 0;
    const meal = MEALS.find(m => m.toLowerCase() === lines[li]?.toLowerCase());
    if (!meal) { logItems.push({ ok: false, text: '⚠ Приём: "' + lines[0] + '"' }); skipped++; return; }
    li++;
    const day = DAYS.find(d => d.toLowerCase() === lines[li]?.toLowerCase());
    if (!day)  { logItems.push({ ok: false, text: '⚠ День: "' + lines[1] + '"' });  skipped++; return; }
    li++;
    let dish = '';
    if (lines[li] && !/^(состав|кбжу|приготовление)/i.test(lines[li])) { dish = lines[li]; li++; }
    let mode = null, ings = [], recipe = '';
    for (let i = li; i < lines.length; i++) {
      const l = lines[i];
      if (/^состав\s*:/i.test(l))        { mode = 'ing';    continue; }
      if (/^кбжу\s*:/i.test(l))          { mode = null;     continue; }
      if (/^приготовление\s*:/i.test(l)) { mode = 'recipe'; continue; }
      if (mode === 'ing') {
        const m = l.match(/^(.+?)\s*[–—\-]+\s*(\d+(?:\.\d+)?)\s*г?/);
        if (m) {
          const nm = m[1].trim(), w = parseFloat(m[2]), f = findKbju(nm);
          if (f.type !== 'not_found') {
            const k = kbjuTable[f.name], r = w / 100;
            ings.push({ name: f.name, originalName: nm, weight: w, status: f.type, suggestions: f.all || [], proteins: k.proteins * r, fats: k.fats * r, carbs: k.carbs * r, calories: k.calories * r });
          } else {
            ings.push({ name: nm, originalName: nm, weight: w, status: 'not_found', suggestions: [], proteins: 0, fats: 0, carbs: 0, calories: 0 });
          }
        }
      } else if (mode === 'recipe') {
        recipe += (recipe ? ' ' : '') + l;
      }
    }
    if (!menuData[day]) menuData[day] = {};
    menuData[day][meal] = { dish, ingredients: ings, recipe };
    loaded++;
    logItems.push({ ok: true, text: '✓ ' + day + ' / ' + meal + (dish ? ' — ' + dish : '') });
  });

  saveAll(); renderMenuDay(curDay);

  // Рендер лога через DOM (без innerHTML)
  const logDiv = DOM.recipeLog;
  logDiv.innerHTML = '';
  const summary = document.createElement('div');
  const spanOk  = document.createElement('span'); spanOk.style.color  = 'var(--green)'; spanOk.textContent = 'Загружено: ' + loaded;
  const spanBad = document.createElement('span'); spanBad.style.color = 'var(--red)';   spanBad.textContent = ' Пропущено: ' + skipped;
  summary.append(spanOk, spanBad);
  logDiv.appendChild(summary);
  logItems.forEach(item => {
    const div = document.createElement('div');
    div.style.color = item.ok ? 'var(--green)' : 'var(--yellow)';
    div.textContent = item.text;
    logDiv.appendChild(div);
  });
}

// ── Сохранённые рецепты — логика ─────────────────────────────────
function delSaved(g, i) {
  if (!confirm('Удалить?')) return;
  savedRecipes[g].splice(i, 1); saveAll(); renderSaved();
}
function openAtm(g, i) {
  _atmRec = { g, i };
  document.getElementById('atmName').textContent = savedRecipes[g][i].name;
  openModal('atmModal');
}
function confirmAtm() {
  if (!_atmRec) return;
  const r = savedRecipes[_atmRec.g][_atmRec.i];
  const day  = document.getElementById('atmDay').value;
  const meal = document.getElementById('atmMeal').value;
  if (!menuData[day]) menuData[day] = {};
  menuData[day][meal] = { dish: r.name, ingredients: JSON.parse(JSON.stringify(r.ingredients)), recipe: r.recipe };
  saveAll(); closeModal('atmModal'); goSec('menu');
  curDay = day;
  document.querySelectorAll('.day-btn').forEach((b, i) => b.classList.toggle('active', DAYS[i] === day));
  renderMenuDay(day);
}

// ── Стоимость ─────────────────────────────────────────────────────
function calcCosts() {
  const tot = {};
  Object.values(menuData).forEach(d => Object.values(d).forEach(m => (m.ingredients || []).forEach(ing => {
    if (ing.status === 'exact') tot[ing.name] = (tot[ing.name] || 0) + (ing.weight || 0);
  })));
  const rows = [];
  let grand = 0;
  Object.entries(tot).forEach(([name, g]) => {
    const k = kbjuTable[name]; if (!k) return;
    let cost = 0, pack = '—', buy = '—';
    const cur = k.priceHistory?.length ? k.priceHistory[k.priceHistory.length - 1].price : null;
    if (cur && k.priceType === 'kg')   { cost = (g / 1000) * cur; pack = cur.toLocaleString('ru-RU') + ' ֏/кг'; buy = (g / 1000).toFixed(2) + ' кг'; }
    else if (cur && k.priceType === 'pack' && k.packWeight) { const n = Math.ceil(g / k.packWeight); cost = n * cur; pack = k.packWeight + 'г / ' + cur.toLocaleString('ru-RU') + ' ֏'; buy = n + ' шт.'; }
    grand += cost;
    rows.push({ name, grams: g, pack, buy, cost });
  });
  renderCosts(rows, grand);
}

// ── КБЖУ — логика ─────────────────────────────────────────────────
function sortK(k) { kSortDir = kSortKey === k ? kSortDir * -1 : 1; kSortKey = k; renderKbju(); }
function togArc(n) { kbjuTable[n].archived = !kbjuTable[n].archived; saveAll(); renderKbju(); }

function togglePackRow() {
  document.getElementById('npPR').style.display = document.getElementById('npPT').value === 'pack' ? 'block' : 'none';
}
function openAddProd(name) {
  _editProd = name || null;
  document.getElementById('addProdTitle').textContent = name ? 'Редактировать' : 'Добавить продукт';
  document.getElementById('npDel').style.display = name ? 'inline-block' : 'none';
  if (name && kbjuTable[name]) {
    const d = kbjuTable[name], cur = d.priceHistory?.length ? d.priceHistory[d.priceHistory.length - 1].price : '';
    document.getElementById('npN').value  = name;
    document.getElementById('npB').value  = d.proteins || '';
    document.getElementById('npJ').value  = d.fats     || '';
    document.getElementById('npU').value  = d.carbs    || '';
    document.getElementById('npK').value  = d.calories || '';
    document.getElementById('npP').value  = cur;
    document.getElementById('npPT').value = d.priceType || 'kg';
    document.getElementById('npPW').value = d.packWeight || '';
    document.getElementById('npPR').style.display = d.priceType === 'pack' ? 'block' : 'none';
  } else {
    ['npN','npB','npJ','npU','npK','npP','npPW'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('npPT').value = 'kg';
    document.getElementById('npPR').style.display = 'none';
  }
  openModal('addProdModal');
}
function saveProd() {
  const name = document.getElementById('npN').value.trim(); if (!name) { alert('Введите название'); return; }
  const p = parseFloat(document.getElementById('npB').value) || 0;
  const f = parseFloat(document.getElementById('npJ').value) || 0;
  const c = parseFloat(document.getElementById('npU').value) || 0;
  const k = parseFloat(document.getElementById('npK').value) || 0;
  const price = parseFloat(document.getElementById('npP').value) || null;
  const pt = document.getElementById('npPT').value;
  const pw = parseFloat(document.getElementById('npPW').value) || null;
  const today = new Date().toLocaleDateString('ru-RU');
  if (_editProd && _editProd !== name) { kbjuTable[name] = kbjuTable[_editProd]; delete kbjuTable[_editProd]; }
  if (!kbjuTable[name]) kbjuTable[name] = { priceHistory: [] };
  const d = kbjuTable[name];
  Object.assign(d, { proteins: p, fats: f, carbs: c, calories: k, priceType: pt });
  if (pw) d.packWeight = pw;
  if (!d.priceHistory) d.priceHistory = [];
  if (price !== null) {
    const last = d.priceHistory.length ? d.priceHistory[d.priceHistory.length - 1].price : null;
    if (last !== price) d.priceHistory.push({ date: today, price });
  }
  saveAll(); renderKbju(); closeModal('addProdModal');
}
function delProd() {
  if (!_editProd || !confirm('Удалить "' + _editProd + '"?')) return;
  delete kbjuTable[_editProd]; saveAll(); renderKbju(); closeModal('addProdModal');
}

// ── КБЖУ — загрузка из файла / вставка ───────────────────────────
function loadKbjuFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,.csv';
  inp.onchange = e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = ev => applyKbjuText(ev.target.result); rd.readAsText(file, 'utf-8'); };
  inp.click();
}
function applyPasteKbju() { applyKbjuText(document.getElementById('pasteKbjuArea').value); closeModal('pasteKbjuModal'); }
function applyKbjuText(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const today = new Date().toLocaleDateString('ru-RU');
  let added = 0, updated = 0;
  lines.forEach(line => {
    if (/^(название|name|продукт|#)/i.test(line)) return;
    const pts = line.split(/\t|;/);
    const name = pts[0]?.trim(); if (!name) return;
    const p = parseFloat(pts[1]) || 0, f = parseFloat(pts[2]) || 0, c = parseFloat(pts[3]) || 0, k = parseFloat(pts[4]) || 0;
    const price = parseFloat(pts[5]) || null;
    if (kbjuTable[name]) {
      if (p || f || c || k) { kbjuTable[name].proteins = p; kbjuTable[name].fats = f; kbjuTable[name].carbs = c; kbjuTable[name].calories = k; }
      if (price) {
        if (!kbjuTable[name].priceHistory) kbjuTable[name].priceHistory = [];
        const last = kbjuTable[name].priceHistory.length ? kbjuTable[name].priceHistory[kbjuTable[name].priceHistory.length - 1].price : null;
        if (last !== price) kbjuTable[name].priceHistory.push({ date: today, price });
      }
      updated++;
    } else {
      kbjuTable[name] = { proteins: p, fats: f, carbs: c, calories: k, priceType: 'kg', priceHistory: price ? [{ date: today, price }] : [] };
      added++;
    }
  });
  saveAll(); renderKbju(); alert('Добавлено: ' + added + ', обновлено: ' + updated);
}

// ── Парсинг Yerevan City ──────────────────────────────────────────
async function apiCall(path, body) {
  const r = await fetch(WORKER_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function loadTopCats() {
  const panel = document.getElementById('catalogPanel');
  try {
    const data = await apiCall('/api/categories', { page: 1, pageSize: 200 });
    const cats = data?.data?.categories || [];
    panel.innerHTML = '';
    const frag = document.createDocumentFragment();
    cats.forEach(cat => frag.appendChild(buildCatNode(cat, 0)));
    panel.appendChild(frag);
  } catch(e) {
    panel.textContent = '⚠ Ошибка: ' + e.message;
    panel.style.color = 'var(--red)';
    panel.style.padding = '9px 13px';
  }
}
function buildCatNode(cat, depth) {
  const wrap = document.createElement('div'); wrap.dataset.id = cat.id;
  const row  = document.createElement('div'); row.className = 'cat-row';
  const tog  = document.createElement('div'); tog.className = 'cat-tog'; tog.textContent = '▶';
  const ck   = document.createElement('div'); ck.className = 'cat-ck';
  ck.onclick = e => { e.stopPropagation(); toggleCatSel(cat, ck); };
  const nm   = document.createElement('div'); nm.className = 'cat-nm'; nm.style.paddingLeft = (depth * 13) + 'px'; nm.textContent = cat.name;
  row.append(tog, ck, nm); wrap.appendChild(row);
  const ch = document.createElement('div'); ch.className = 'cat-ch'; wrap.appendChild(ch);
  let loaded = false, open = false;
  row.onclick = async () => {
    open = !open; tog.classList.toggle('open', open); ch.classList.toggle('open', open);
    if (open && !loaded) {
      loaded = true;
      ch.innerHTML = '';
      const spinner = document.createElement('div'); spinner.className = 'load-row';
      const spin = document.createElement('div'); spin.className = 'spin'; spinner.appendChild(spin); ch.appendChild(spinner);
      try {
        const d = await apiCall('/api/children', { parentId: cat.id, page: 1, pageSize: 100 });
        const inner = d?.data || {}, all = [...(inner.categoryWithChildren || []), ...(inner.categories || [])];
        ch.innerHTML = '';
        if (!all.length) {
          const empty = document.createElement('div'); empty.className = 'load-row'; empty.style.cssText = 'font-size:11px;color:var(--text2);'; empty.textContent = 'Конечная категория';
          ch.appendChild(empty);
        } else {
          const frag = document.createDocumentFragment();
          all.forEach(c => frag.appendChild(buildCatNode(c, depth + 1)));
          ch.appendChild(frag);
        }
      } catch(e) {
        ch.textContent = 'Ошибка'; ch.style.color = 'var(--red)';
      }
    }
  };
  return wrap;
}
function toggleCatSel(cat, el) {
  parseSelected.has(cat.id) ? (parseSelected.delete(cat.id), el.classList.remove('on')) : (parseSelected.set(cat.id, cat), el.classList.add('on'));
  renderSelPanel();
}
function removeCatSel(id) {
  parseSelected.delete(id);
  document.querySelectorAll(`.cat-ck[data-cid="${id}"]`).forEach(e => e.classList.remove('on'));
  renderSelPanel();
}
function renderSelPanel() {
  const p = document.getElementById('selectedPanel'), btn = DOM.exportBtn;
  if (!parseSelected.size) {
    p.innerHTML = '';
    const empty = document.createElement('div'); empty.className = 'sel-empty'; empty.textContent = 'Отметьте категории слева';
    p.appendChild(empty); btn.disabled = true; return;
  }
  btn.disabled = false; p.innerHTML = '';
  const frag = document.createDocumentFragment();
  parseSelected.forEach((cat, id) => {
    const t = document.createElement('div'); t.className = 'sel-tag';
    const tn = document.createElement('span'); tn.className = 'tn'; tn.textContent = cat.name;
    const tr = document.createElement('span'); tr.className = 'tr'; tr.textContent = '×'; tr.onclick = () => removeCatSel(id);
    t.append(tn, tr); frag.appendChild(t);
  });
  p.appendChild(frag);
}

async function exportData() {
  if (!parseSelected.size) return;
  const btn = DOM.exportBtn, fill = DOM.parseProg, msg = DOM.parseStatus;
  btn.disabled = true; btn.textContent = 'Загрузка...';
  _parsedRows = []; _parsedCats = []; fill.style.width = '0%';
  const cats = [...parseSelected.values()];
  for (let i = 0; i < cats.length; i++) {
    msg.textContent = 'Загружаю: ' + cats[i].name + '...';
    fill.style.width = ((i / cats.length) * 100) + '%';
    try {
      const prods = await fetchAllProds(cats[i].id);
      prods.sort((a, b) => { const pa = a.discountedPrice > 0 ? a.discountedPrice : a.price || 0, pb = b.discountedPrice > 0 ? b.discountedPrice : b.price || 0; return pa - pb; });
      _parsedCats.push({ cat: cats[i], prods });
      prods.forEach(item => {
        const disc = item.discountedPrice > 0 && item.discountedPrice < item.price;
        _parsedRows.push({ catId: cats[i].id, catName: cats[i].name, name: item.name || '', price: disc ? item.discountedPrice : item.price, origPrice: disc ? item.price : null, discPct: disc ? Math.round(item.discountPercent) : 0, pricePerUnit: item.productPricePerUnit, weightMeasure: item.weightMeasure, photo: item.photo || '' });
      });
    } catch(e) { console.warn(e); }
  }
  fill.style.width = '100%';
  DOM.parsedCount.textContent = _parsedRows.length + ' товаров';
  msg.textContent = '✅ Готово — ' + _parsedRows.length + ' товаров';
  btn.disabled = false; btn.textContent = '⬇ Выгрузить';
  renderProdTable();
}

async function fetchAllProds(catId) {
  const body = { categoryId: catId, parentId: catId, count: 100, page: 1, priceFrom: null, priceTo: null, countries: [], categories: [], brands: [], search: null, isDiscounted: false, sortBy: 3 };
  const first = await apiCall('/api/products', body);
  const inner = first?.data || {}, pages = inner.pageCount || 1;
  let items = inner.list || [];
  const ps = [];
  for (let p = 2; p <= pages; p++) ps.push(apiCall('/api/products', { ...body, page: p }));
  (await Promise.all(ps)).forEach(d => { items = items.concat(d?.data?.list || []); });
  return items;
}

function updLists() {
  const lists = { snack: [], breakfast: [], lunch: [], dinner: [] };
  document.querySelectorAll('.cb-m:checked').forEach(cb => {
    const r = _parsedRows[parseInt(cb.dataset.idx)];
    if (r) lists[cb.dataset.meal].push(r.name);
  });
  const all = [...new Set([...lists.snack, ...lists.breakfast, ...lists.lunch, ...lists.dinner])];
  const setList = (id, items) => {
    const ul = document.getElementById('lst-' + id); ul.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(n => { const li = document.createElement('li'); li.textContent = n; frag.appendChild(li); });
    ul.appendChild(frag);
  };
  setList('snack', lists.snack); setList('breakfast', lists.breakfast);
  setList('lunch', lists.lunch); setList('dinner', lists.dinner); setList('all', all);
}

function getListItems(id) {
  return [...document.getElementById('lst-' + id).querySelectorAll('li')].map(li => li.textContent);
}
function dlList(id, label) {
  const items = getListItems(id === 'all' ? 'all' : id);
  if (!items.length) { alert('Список пуст'); return; }
  const blob = new Blob([items.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = label.replace(/\s/g, '_') + '_' + new Date().toLocaleDateString('ru-RU').replace(/\./g, '.') + '.txt';
  a.click(); URL.revokeObjectURL(a.href);
}
function saveListToNotes(id, label) {
  const snack = getListItems('snack'), breakfast = getListItems('breakfast'), lunch = getListItems('lunch'), dinner = getListItems('dinner');
  const all   = [...new Set([...snack, ...breakfast, ...lunch, ...dinner])];
  const date  = new Date().toLocaleDateString('ru-RU');
  const entry = { id: Date.now(), date, label: 'Список продуктов из Yerevan City за ' + date, snack, breakfast, lunch, dinner, all };
  saveListToNotesStorage(entry);
  renderNotesLists(); goSec('notes'); alert('Список сохранён в заметках!');
}
function transferToKbju() {
  const names = new Set();
  document.querySelectorAll('.cb-m:checked').forEach(cb => { const r = _parsedRows[parseInt(cb.dataset.idx)]; if (r) names.add(r.name); });
  if (!names.size) { alert('Отметьте продукты'); return; }
  const today = new Date().toLocaleDateString('ru-RU'), conflicts = [], toAdd = [];
  names.forEach(name => {
    const pr   = _parsedRows.find(r => r.name === name), newP = pr ? pr.price : null;
    const ex   = kbjuTable[name];
    if (ex) {
      const last = ex.priceHistory?.length ? ex.priceHistory[ex.priceHistory.length - 1].price : null;
      if (newP && last !== newP) { if (!ex.priceHistory) ex.priceHistory = []; ex.priceHistory.push({ date: today, price: newP }); }
    } else {
      const sim = Object.keys(kbjuTable).find(k => k.toLowerCase().includes(name.toLowerCase().slice(0, 5)) || name.toLowerCase().includes(k.toLowerCase().slice(0, 5)));
      if (sim) conflicts.push({ newName: name, existingName: sim, price: newP });
      else toAdd.push({ name, price: newP });
    }
  });
  toAdd.forEach(({ name, price }) => { kbjuTable[name] = { proteins: 0, fats: 0, carbs: 0, calories: 0, priceType: 'kg', priceHistory: price ? [{ date: today, price }] : [] }; });
  if (conflicts.length) {
    _syncDec = conflicts.map(c => ({ ...c, decision: 'new' }));
    const sc = document.getElementById('scConflicts'); sc.innerHTML = '';
    const frag = document.createDocumentFragment();
    conflicts.forEach((c, i) => {
      const div = document.createElement('div'); div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:11px;margin-bottom:9px;';
      const p   = document.createElement('p'); p.style.cssText = 'font-size:12px;margin-bottom:9px;';
      p.textContent = 'Новый: '; const s1 = document.createElement('strong'); s1.style.color = 'var(--accent)'; s1.textContent = c.newName;
      p.appendChild(s1); p.appendChild(document.createElement('br'));
      const txt2 = document.createTextNode('Похожий: '); p.appendChild(txt2); const s2 = document.createElement('strong'); s2.textContent = c.existingName; p.appendChild(s2);
      const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:7px;';
      const bR = document.createElement('button'); bR.className = 'ctrl-btn sec'; bR.style.cssText = 'font-size:12px;padding:5px 9px;'; bR.textContent = 'Заменить';   bR.onclick = () => setSyncDec(i, 'replace');
      const bN = document.createElement('button'); bN.className = 'ctrl-btn';     bN.style.cssText = 'font-size:12px;padding:5px 9px;'; bN.textContent = 'Добавить новым'; bN.onclick = () => setSyncDec(i, 'new');
      btns.append(bR, bN);
      const fb = document.createElement('div'); fb.id = 'sd-' + i; fb.style.cssText = 'margin-top:5px;font-size:11px;color:var(--green);';
      div.append(p, btns, fb); frag.appendChild(div);
    });
    sc.appendChild(frag);
    document.getElementById('scSummary').textContent = 'Авто: ' + toAdd.length + ', конфликты: ' + conflicts.length;
    saveAll(); openModal('syncConflModal');
  } else {
    saveAll(); renderKbju(); alert('Перенесено: ' + toAdd.length);
  }
}
function setSyncDec(i, d) { _syncDec[i].decision = d; document.getElementById('sd-' + i).textContent = d === 'new' ? '→ Добавить новым' : '→ Заменить'; }
function applySyncDec() {
  const today = new Date().toLocaleDateString('ru-RU');
  _syncDec.forEach(d => {
    if (d.decision === 'replace') { const ex = kbjuTable[d.existingName]; if (ex && d.price) { if (!ex.priceHistory) ex.priceHistory = []; ex.priceHistory.push({ date: today, price: d.price }); } }
    else { kbjuTable[d.newName] = { proteins: 0, fats: 0, carbs: 0, calories: 0, priceType: 'kg', priceHistory: d.price ? [{ date: today, price: d.price }] : [] }; }
  });
  saveAll(); renderKbju(); closeModal('syncConflModal');
}

document.addEventListener('DOMContentLoaded', init);

// ── PWA: Регистрация Service Worker ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.warn('SW:', err));
  });
}
