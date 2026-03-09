// ════════════════════════════════════════════════════════════════
// ui.js — Функции интерфейса (только работа с DOM)
// ════════════════════════════════════════════════════════════════

// ── Кэшированные DOM-элементы (инициализируются в init) ──────────
let DOM = {};

function initDOM() {
  DOM.menuWrap     = document.getElementById('menuWrap');
  DOM.kbjuBody     = document.getElementById('kbjuBody');
  DOM.savedGroups  = document.getElementById('savedGroups');
  DOM.costBody     = document.getElementById('costBody');
  DOM.dayTabs      = document.getElementById('dayTabs');
  DOM.navDropdown  = document.getElementById('navDropdown');
  DOM.dayTabsWrap  = document.getElementById('dayTabsWrap');
  DOM.notesArea    = document.getElementById('notesArea');
  DOM.notesListWrap= document.getElementById('notesListWrap');
  DOM.psBody       = document.getElementById('psBody');
  DOM.psInput      = document.getElementById('psInput');
  DOM.kbjuSearch   = document.getElementById('kbjuSearch');
  DOM.prodBody     = document.getElementById('prodBody');
  DOM.parsedCount  = document.getElementById('parsedCount');
  DOM.parseStatus  = document.getElementById('parseStatus');
  DOM.parseProg    = document.getElementById('parseProg');
  DOM.exportBtn    = document.getElementById('exportBtn');
  DOM.recipeLog    = document.getElementById('recipeLog');
}

// ── Вспомогательные функции ───────────────────────────────────────
function n1(v) {
  if (!v && v !== 0) return '—';
  return (Math.round(v * 10) / 10).toFixed(1);
}
function esc(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── Навигация ────────────────────────────────────────────────────
function toggleNav() {
  DOM.navDropdown.classList.toggle('open');
}

function goSec(sec) {
  DOM.navDropdown.classList.remove('open');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.sec === sec));
  DOM.dayTabsWrap.style.display = sec === 'menu' ? 'block' : 'none';
  if (sec === 'cost')  calcCosts();
  if (sec === 'kbju')  renderKbju();
  if (sec === 'saved') renderSaved();
  if (sec === 'parse' && !window._catLoaded) { loadTopCats(); window._catLoaded = true; }
}

// ── Вкладки дней ─────────────────────────────────────────────────
function buildDayTabs() {
  const frag = document.createDocumentFragment();
  DAYS.forEach(d => {
    const b = document.createElement('button');
    b.className = 'day-btn' + (d === curDay ? ' active' : '');
    b.textContent = d;
    b.addEventListener('click', () => {
      curDay = d;
      document.querySelectorAll('.day-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderMenuDay(d);
    });
    frag.appendChild(b);
  });
  DOM.dayTabs.innerHTML = '';
  DOM.dayTabs.appendChild(frag);
}

// ════════════════════════════════════════════════════════════════
// МЕНЮ — карточки приёмов пищи
// ════════════════════════════════════════════════════════════════

function renderMenuDay(day) {
  const dd   = menuData[day] || {};
  const wrap = DOM.menuWrap;
  wrap.innerHTML = '';

  const frag = document.createDocumentFragment();
  let dayT = { p: 0, f: 0, c: 0, k: 0 };

  MEALS.forEach(meal => {
    const md   = dd[meal];
    const ings = (md && md.ingredients) ? md.ingredients : [];
    const time = mealTimes[meal] || '--:--';

    // Итоги приёма пищи
    const mealT = { p: 0, f: 0, c: 0, k: 0 };
    ings.forEach(ing => {
      mealT.p += ing.proteins  || 0;
      mealT.f += ing.fats      || 0;
      mealT.c += ing.carbs     || 0;
      mealT.k += ing.calories  || 0;
    });
    dayT.p += mealT.p; dayT.f += mealT.f; dayT.c += mealT.c; dayT.k += mealT.k;

    // ── Карточка приёма пищи ──────────────────────────────────
    const card = document.createElement('div');
    card.className = 'meal-card';

    // ── Шапка карточки ────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'meal-card-header';

    // Время
    const timeBtn = document.createElement('div');
    timeBtn.className = 'meal-time';
    timeBtn.textContent = time;
    timeBtn.title = 'Изменить время';
    timeBtn.addEventListener('click', e => showTimeDp(e, meal));

    // Название приёма пищи
    const mealName = document.createElement('div');
    mealName.className = 'meal-name';
    mealName.textContent = meal;

    // Кнопка сохранить как рецепт
    const btnSave = document.createElement('button');
    btnSave.className = 'meal-save-btn';
    btnSave.textContent = '★';
    btnSave.title = 'Сохранить как рецепт';
    btnSave.addEventListener('click', () => saveMealRecipe(day, meal));

    // Название блюда + карандаш
    const dishWrap = document.createElement('div');
    dishWrap.className = 'meal-dish-wrap';

    const dishName = document.createElement('span');
    dishName.className = 'meal-dish-name';
    dishName.textContent = (md && md.dish) ? md.dish : '';

    const btnPencil = document.createElement('button');
    btnPencil.className = 'meal-dish-edit';
    btnPencil.textContent = '✎';
    btnPencil.title = 'Переименовать блюдо';
    btnPencil.addEventListener('click', () => openRenameDish(day, meal));

    dishWrap.appendChild(dishName);
    dishWrap.appendChild(btnPencil);

    // КБЖУ итого приёма — в шапке справа
    const mealTotals = document.createElement('div');
    mealTotals.className = 'meal-header-totals';
    [
      { label: 'Б',    val: mealT.p },
      { label: 'Ж',    val: mealT.f },
      { label: 'У',    val: mealT.c },
      { label: 'ккал', val: mealT.k },
    ].forEach(({ label, val }) => {
      const chip = document.createElement('span');
      chip.className = 'meal-total-chip' + (label === 'ккал' ? ' chip-kcal' : '');
      const lbl = document.createElement('span'); lbl.className = 'chip-label'; lbl.textContent = label;
      const num = document.createElement('span'); num.className = 'chip-val';   num.textContent = n1(val);
      chip.appendChild(lbl); chip.appendChild(num);
      mealTotals.appendChild(chip);
    });

    header.appendChild(timeBtn);
    header.appendChild(mealName);
    header.appendChild(btnSave);
    header.appendChild(dishWrap);
    header.appendChild(mealTotals);
    card.appendChild(header);

    // ── Рецепт (если есть) ────────────────────────────────────
    if (md && md.recipe) {
      const recipeRow = document.createElement('div');
      recipeRow.className = 'meal-recipe-row';
      const recipeLabel = document.createElement('span');
      recipeLabel.className = 'meal-recipe-label';
      recipeLabel.textContent = 'Приготовление:';
      const recipeText = document.createElement('span');
      recipeText.className = 'meal-recipe-text';
      recipeText.textContent = md.recipe;
      recipeRow.appendChild(recipeLabel);
      recipeRow.appendChild(recipeText);
      card.appendChild(recipeRow);
    }

    // ── Таблица ингредиентов ──────────────────────────────────
    const tableWrap = document.createElement('div');
    tableWrap.className = 'meal-table-wrap';

    const table = document.createElement('table');
    table.className = 'meal-ing-table';

    // Заголовок таблицы ингредиентов
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    [
      { text: 'Состав блюда', cls: 'col-ing'  },
      { text: 'Вес, г',       cls: 'col-w'    },
      { text: 'Б',            cls: 'col-num'  },
      { text: 'Ж',            cls: 'col-num'  },
      { text: 'У',            cls: 'col-num'  },
      { text: 'Ккал',         cls: 'col-kcal' },
    ].forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.text;
      th.className   = col.cls;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Тело таблицы — строки ингредиентов
    const tbody = document.createElement('tbody');

    if (ings.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyTd  = document.createElement('td');
      emptyTd.colSpan = 6;
      emptyTd.className = 'meal-empty-hint';
      emptyTd.textContent = 'Нажмите + чтобы добавить ингредиент';
      emptyRow.appendChild(emptyTd);
      tbody.appendChild(emptyRow);
    } else {
      ings.forEach((ing, i) => {
        tbody.appendChild(buildIngRow(ing, i, day, meal));
      });
    }

    // Строка итого + кнопка добавить
    const footRow = document.createElement('tr');
    footRow.className = 'ing-foot-row';

    const tdAddWrap = document.createElement('td');
    tdAddWrap.className = 'col-ing';
    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn-add-ing';
    btnAdd.textContent = '+ Добавить';
    btnAdd.title = 'Добавить ингредиент';
    btnAdd.addEventListener('click', () => openPS(day, meal));
    tdAddWrap.appendChild(btnAdd);

    const tdW = document.createElement('td'); tdW.className = 'col-w';
    const tdP = document.createElement('td'); tdP.className = 'col-num';  tdP.textContent = n1(mealT.p);
    const tdF = document.createElement('td'); tdF.className = 'col-num';  tdF.textContent = n1(mealT.f);
    const tdC = document.createElement('td'); tdC.className = 'col-num';  tdC.textContent = n1(mealT.c);
    const tdK = document.createElement('td'); tdK.className = 'col-kcal'; tdK.textContent = n1(mealT.k);

    footRow.appendChild(tdAddWrap);
    footRow.appendChild(tdW);
    footRow.appendChild(tdP);
    footRow.appendChild(tdF);
    footRow.appendChild(tdC);
    footRow.appendChild(tdK);
    tbody.appendChild(footRow);

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    frag.appendChild(card);
  });

  // ── Итого за день ─────────────────────────────────────────────
  const dayTotal = document.createElement('div');
  dayTotal.className = 'day-total-bar';
  const dayLabel = document.createElement('span');
  dayLabel.className = 'day-total-label';
  dayLabel.textContent = 'Всего за день:';
  dayTotal.appendChild(dayLabel);
  [
    { label: 'Белки', val: dayT.p },
    { label: 'Жиры',  val: dayT.f },
    { label: 'Углев', val: dayT.c },
    { label: 'Ккал',  val: dayT.k },
  ].forEach(({ label, val }) => {
    const chip = document.createElement('span');
    chip.className = 'day-total-chip';
    const lbl = document.createElement('span'); lbl.className = 'chip-label'; lbl.textContent = label;
    const num = document.createElement('span'); num.className = 'chip-val chip-val-lg'; num.textContent = n1(val);
    chip.appendChild(lbl); chip.appendChild(num);
    dayTotal.appendChild(chip);
  });
  frag.appendChild(dayTotal);
  wrap.appendChild(frag);
}

// ── Строка ингредиента ────────────────────────────────────────────
function buildIngRow(ing, i, day, meal) {
  const nf  = ing.status === 'not_found';
  const row = document.createElement('tr');
  row.className = nf ? 'ing-row not-found-bg' : 'ing-row';

  const tdIng   = document.createElement('td');
  tdIng.className = 'col-ing';
  const ingWrap = document.createElement('div');
  ingWrap.className = 'ing-wrap';
  const ingName = document.createElement('span');
  ingName.className = 'ing-name';
  ingName.textContent = ing.originalName || ing.name;
  const btn = document.createElement('button');
  if (nf || ing.status === 'partial') {
    btn.className = 'btn-q';
    btn.textContent = '?';
    btn.title = 'Найти замену';
    btn.addEventListener('click', e => showSug(e, day, meal, i));
  } else {
    btn.className = 'btn-x';
    btn.textContent = '✕';
    btn.title = 'Удалить';
    btn.addEventListener('click', () => delIng(day, meal, i));
  }
  ingWrap.appendChild(ingName);
  ingWrap.appendChild(btn);
  tdIng.appendChild(ingWrap);

  const tdW = document.createElement('td');
  tdW.className = 'col-w';
  const inp = document.createElement('input');
  inp.className = 'w-inp';
  inp.type  = 'number';
  inp.value = ing.weight;
  inp.addEventListener('change', () => updW(day, meal, i, inp.value));
  tdW.appendChild(inp);

  const tdP = document.createElement('td'); tdP.className = 'col-num';  tdP.textContent = n1(ing.proteins);
  const tdF = document.createElement('td'); tdF.className = 'col-num';  tdF.textContent = n1(ing.fats);
  const tdC = document.createElement('td'); tdC.className = 'col-num';  tdC.textContent = n1(ing.carbs);
  const tdK = document.createElement('td'); tdK.className = 'col-kcal'; tdK.textContent = n1(ing.calories);

  row.appendChild(tdIng);
  row.appendChild(tdW);
  row.appendChild(tdP);
  row.appendChild(tdF);
  row.appendChild(tdC);
  row.appendChild(tdK);
  return row;
}

// ── КБЖУ — рендер таблицы ────────────────────────────────────────
function renderKbju() {
  const q   = (DOM.kbjuSearch?.value || '').toLowerCase();
  let act   = Object.entries(kbjuTable).filter(([n, d]) => !d.archived && (!q || n.toLowerCase().includes(q)));
  let arc   = Object.entries(kbjuTable).filter(([n, d]) =>  d.archived && (!q || n.toLowerCase().includes(q)));

  if (kSortKey) {
    const sf = (a, b) => {
      const va = kSortKey === 'name' ? a[0] : (a[1][kSortKey] || 0);
      const vb = kSortKey === 'name' ? b[0] : (b[1][kSortKey] || 0);
      return kSortDir * (va < vb ? -1 : va > vb ? 1 : 0);
    };
    act.sort(sf); arc.sort(sf);
  }

  const frag = document.createDocumentFragment();

  const buildRow = ([name, d], i, isA) => {
    const h    = d.priceHistory || [];
    const cur  = h.length ? h[h.length - 1] : null;
    const prev = h.length > 1 ? h[h.length - 2].price : null;
    let bc = 'eq', sym = '=';
    if (cur && prev !== null) {
      if (cur.price > prev)      { bc = 'up'; sym = '↑'; }
      else if (cur.price < prev) { bc = 'dn'; sym = '↓'; }
    }
    const tr = document.createElement('tr');
    if (isA) tr.style.opacity = '0.6';

    const tdN  = document.createElement('td'); tdN.style.textAlign  = 'center'; tdN.style.color = 'var(--text2)'; tdN.textContent = i + 1;
    const tdNm = document.createElement('td'); tdNm.style.textAlign = 'left';   tdNm.textContent = name;
    const tdP  = document.createElement('td'); tdP.style.textAlign  = 'center'; tdP.textContent = n1(d.proteins);
    const tdF  = document.createElement('td'); tdF.style.textAlign  = 'center'; tdF.textContent = n1(d.fats);
    const tdC  = document.createElement('td'); tdC.style.textAlign  = 'center'; tdC.textContent = n1(d.carbs);
    const tdK  = document.createElement('td'); tdK.style.textAlign  = 'center'; tdK.textContent = n1(d.calories);

    const tdPr  = document.createElement('td');
    const pcDiv = document.createElement('div'); pcDiv.className = 'price-cell';
    const prSpan = document.createElement('span'); prSpan.textContent = cur ? cur.price.toLocaleString('ru-RU') + ' ֏' : '—';
    pcDiv.appendChild(prSpan);
    if (h.length) {
      const badge = document.createElement('span'); badge.className = 'p-badge ' + bc; badge.title = 'История'; badge.textContent = sym;
      badge.addEventListener('click', () => showPH(name));
      pcDiv.appendChild(badge);
    }
    if (cur) {
      const dt = document.createElement('span'); dt.className = 'p-date'; dt.textContent = cur.date; pcDiv.appendChild(dt);
    }
    tdPr.appendChild(pcDiv);

    const tdAct = document.createElement('td'); tdAct.style.cssText = 'display:flex;gap:5px;';
    const btnEdit = document.createElement('button'); btnEdit.className = 'ctrl-btn sec'; btnEdit.style.cssText = 'padding:2px 7px;font-size:12px;'; btnEdit.textContent = 'Ред.';
    btnEdit.addEventListener('click', () => openAddProd(name));
    const btnArc  = document.createElement('button'); btnArc.className  = 'ctrl-btn sec'; btnArc.style.cssText  = 'padding:2px 7px;font-size:12px;'; btnArc.textContent  = isA ? '↩' : 'Арх.';
    btnArc.addEventListener('click', () => togArc(name));
    tdAct.appendChild(btnEdit); tdAct.appendChild(btnArc);

    tr.append(tdN, tdNm, tdP, tdF, tdC, tdK, tdPr, tdAct);
    return tr;
  };

  act.forEach((e, i) => frag.appendChild(buildRow(e, i, false)));
  if (arc.length) {
    const hdrRow = document.createElement('tr'); hdrRow.className = 'arc-hdr';
    const hdrTd  = document.createElement('td'); hdrTd.colSpan = 8; hdrTd.textContent = 'Архив (' + arc.length + ')';
    hdrRow.appendChild(hdrTd); frag.appendChild(hdrRow);
    arc.forEach((e, i) => frag.appendChild(buildRow(e, i, true)));
  }

  DOM.kbjuBody.innerHTML = '';
  DOM.kbjuBody.appendChild(frag);
}

// ── Сохранённые рецепты ──────────────────────────────────────────
function renderSaved() {
  const c = DOM.savedGroups;
  c.innerHTML = '';
  const frag = document.createDocumentFragment();

  Object.entries(savedRecipes).forEach(([g, recs]) => {
    const wrap = document.createElement('div'); wrap.className = 'saved-group';
    const hdr  = document.createElement('div'); hdr.className = 'saved-group-hdr';
    const h3   = document.createElement('h3');  h3.textContent = g + ' ';
    const cnt  = document.createElement('span'); cnt.style.cssText = 'color:var(--text2);font-weight:normal;'; cnt.textContent = '(' + recs.length + ')';
    h3.appendChild(cnt);
    const arr  = document.createElement('span'); arr.textContent = '▶';
    hdr.appendChild(h3); hdr.appendChild(arr);

    const body = document.createElement('div');
    body.className = 'saved-group-body collapsed';
    hdr.addEventListener('click', () => {
      const cl = body.classList.toggle('collapsed');
      arr.style.transform = cl ? '' : 'rotate(90deg)';
    });

    if (recs.length) {
      const rfrag = document.createDocumentFragment();
      recs.forEach((r, i) => {
        const t = r.ingredients.reduce((a, x) => ({
          p: a.p+(x.proteins||0), f: a.f+(x.fats||0), c: a.c+(x.carbs||0), k: a.k+(x.calories||0)
        }), { p:0,f:0,c:0,k:0 });
        const card  = document.createElement('div'); card.className = 'recipe-card';
        const h4    = document.createElement('h4');  h4.textContent = r.name;
        const kbju  = document.createElement('div'); kbju.className = 'rc-kbju';
        kbju.textContent = 'Б '+n1(t.p)+' / Ж '+n1(t.f)+' / У '+n1(t.c)+' / '+n1(t.k)+' ккал';
        const ings  = document.createElement('div'); ings.className = 'rc-ings';
        ings.textContent = r.ingredients.map(x => (x.originalName||x.name)+' — '+x.weight+'г').join('\n');
        ings.style.whiteSpace = 'pre-line';
        const btnMenu = document.createElement('button'); btnMenu.className = 'btn-to-menu'; btnMenu.textContent = '+ В меню';
        btnMenu.addEventListener('click', () => openAtm(g, i));
        const btnDel  = document.createElement('button'); btnDel.className = 'ctrl-btn red';
        btnDel.style.cssText = 'width:100%;font-size:12px;padding:5px;';
        btnDel.textContent = 'Удалить';
        btnDel.addEventListener('click', () => delSaved(g, i));
        card.append(h4, kbju, ings, btnMenu, btnDel);
        rfrag.appendChild(card);
      });
      body.appendChild(rfrag);
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px;color:var(--text2);font-size:12px;';
      empty.textContent = 'Нет рецептов';
      body.appendChild(empty);
    }
    wrap.append(hdr, body);
    frag.appendChild(wrap);
  });
  c.appendChild(frag);
}

// ── Стоимость ────────────────────────────────────────────────────
function renderCosts(rows, grand) {
  const frag = document.createDocumentFragment();
  rows.forEach(r => {
    const tr = document.createElement('tr');
    [r.name, Math.round(r.grams)+' г', r.pack, r.buy,
     r.cost ? Math.round(r.cost).toLocaleString('ru-RU')+' ֏' : '—'
    ].forEach((val, ci) => {
      const td = document.createElement('td'); td.textContent = val;
      if (ci===1||ci===2||ci===3) td.style.color = 'var(--text2)';
      if (ci===4) { td.style.fontWeight='bold'; td.style.color='var(--accent)'; }
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  const trTot = document.createElement('tr'); trTot.className = 'cost-total';
  const tdLbl = document.createElement('td'); tdLbl.colSpan=4; tdLbl.style.textAlign='right'; tdLbl.textContent='ИТОГО:';
  const tdVal = document.createElement('td'); tdVal.textContent = Math.round(grand).toLocaleString('ru-RU')+' ֏';
  trTot.append(tdLbl, tdVal);
  frag.appendChild(trTot);
  DOM.costBody.innerHTML = '';
  DOM.costBody.appendChild(frag);
}

// ── Список продуктов из парсинга (заметки) ───────────────────────
function renderNotesLists() {
  const wrap = DOM.notesListWrap; if (!wrap) return;
  const stored = loadNotesLists();
  wrap.innerHTML = '';
  if (!stored.length) return;
  const frag = document.createDocumentFragment();
  stored.forEach((e, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:5px 10px;margin:0 6px 6px 0;cursor:pointer;font-size:12px;';
    div.addEventListener('click', () => viewNotesList(i));
    const lbl = document.createElement('span'); lbl.textContent = '📋 '+e.label;
    const del = document.createElement('span'); del.style.cssText='color:var(--text2);margin-left:4px;cursor:pointer;'; del.textContent='×';
    del.addEventListener('click', ev => { ev.stopPropagation(); deleteNotesList(i); renderNotesLists(); });
    div.append(lbl, del);
    frag.appendChild(div);
  });
  wrap.appendChild(frag);
}

// ── Продукты из парсинга ─────────────────────────────────────────
function fmtUnit(row) {
  const ppu = row.pricePerUnit; if (!ppu||ppu<=0) return '';
  const m = row.weightMeasure||'';
  let u='кг';
  if (m==='ML'||m==='L') u='л';
  else if (m==='PCS'||m==='PIECE'||m==='EA') u='шт.';
  return '1 '+u+' / '+Math.round(ppu).toLocaleString('ru-RU')+' ֏';
}
function fmtPrice(v) { if(!v) return '—'; return Math.round(v).toLocaleString('ru-RU')+' ֏'; }

function renderProdTable() {
  const tbody = DOM.prodBody;
  tbody.innerHTML = '';
  const groups = {};
  _parsedRows.forEach((row,i) => {
    if (!groups[row.catId]) groups[row.catId]={name:row.catName,rows:[]};
    groups[row.catId].rows.push({...row,idx:i});
  });
  const frag = document.createDocumentFragment();
  Object.entries(groups).forEach(([catId,g]) => {
    const hdr = document.createElement('tr'); hdr.className='cat-hdr-row'; hdr.dataset.catid=catId;
    const tdH = document.createElement('td'); tdH.colSpan=10; tdH.textContent=g.name+' ('+g.rows.length+')';
    hdr.appendChild(tdH);
    hdr.addEventListener('click', () => {
      hdr.classList.toggle('open');
      const isOpen = hdr.classList.contains('open');
      tbody.querySelectorAll('.prod-row[data-catid="'+catId+'"]').forEach(r=>r.classList.toggle('hidden',!isOpen));
    });
    frag.appendChild(hdr);
    g.rows.forEach(row => {
      const tr = document.createElement('tr'); tr.className='prod-row hidden'; tr.dataset.catid=catId;
      const tdCat=document.createElement('td');
      const tdPh=document.createElement('td'); tdPh.style.cssText='padding:4px 6px;';
      const thumb=document.createElement('div'); thumb.className='photo-thumb';
      if (row.photo) {
        thumb.textContent='🖼';
        const popup=document.createElement('div'); popup.className='photo-popup';
        const img=document.createElement('img'); img.src=row.photo; img.alt=''; img.loading='lazy'; img.decoding='async';
        img.width=150; img.height=150; img.style.cssText='object-fit:contain;border-radius:5px;display:block;';
        popup.appendChild(img); thumb.appendChild(popup);
      } else {
        thumb.style.cssText='cursor:default;font-size:10px;color:var(--text2);'; thumb.textContent='—';
      }
      tdPh.appendChild(thumb);
      const tdNm=document.createElement('td'); tdNm.style.textAlign='left'; tdNm.textContent=row.name;
      const tdPr=document.createElement('td'); tdPr.className='td-price'; tdPr.textContent=fmtPrice(row.price);
      if(row.discPct){const badge=document.createElement('span');badge.className='discount-badge';badge.textContent='-'+row.discPct+'%';tdPr.appendChild(badge);}
      const tdOr=document.createElement('td'); tdOr.className='td-orig'; tdOr.textContent=row.origPrice?fmtPrice(row.origPrice):'';
      const tdKg=document.createElement('td'); tdKg.className='td-kg'; tdKg.textContent=fmtUnit(row);
      tr.append(tdCat,tdPh,tdNm,tdPr,tdOr,tdKg);
      ['snack','breakfast','lunch','dinner'].forEach(m=>{
        const td=document.createElement('td'); td.style.textAlign='center';
        const cb=document.createElement('input'); cb.type='checkbox'; cb.className='cb-m';
        cb.dataset.idx=row.idx; cb.dataset.meal=m;
        cb.addEventListener('change',updLists);
        td.appendChild(cb); tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
  });
  tbody.innerHTML='';
  tbody.appendChild(frag);
}

// ── История цен ──────────────────────────────────────────────────
function showPH(name) {
  const d=kbjuTable[name]; if(!d?.priceHistory?.length) return;
  document.getElementById('phTitle').textContent='История цен: '+name;
  const h=d.priceHistory,cv=document.getElementById('phCanvas'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H); ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,W,H);
  const prices=h.map(x=>x.price),mn=Math.min(...prices),mx=Math.max(...prices),rng=mx-mn||1;
  const pd={l:44,r:14,t:14,b:26},iW=W-pd.l-pd.r,iH=H-pd.t-pd.b;
  ctx.strokeStyle='#404040'; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pd.t+(iH/4)*i;
    ctx.beginPath();ctx.moveTo(pd.l,y);ctx.lineTo(W-pd.r,y);ctx.stroke();
    ctx.fillStyle='#b0b0b0';ctx.font='10px Segoe UI';ctx.fillText(Math.round(mx-(rng/4)*i),2,y+4);
  }
  if(h.length>1){
    ctx.strokeStyle='#4a9eff';ctx.lineWidth=2;ctx.beginPath();
    h.forEach((x,i)=>{const px=pd.l+(i/(h.length-1))*iW,py=pd.t+(1-(x.price-mn)/rng)*iH;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
    ctx.stroke();
  }
  h.forEach((x,i)=>{
    const px=pd.l+(h.length>1?i/(h.length-1):0.5)*iW;
    const py=pd.t+(h.length>1?(1-(x.price-mn)/rng):0.5)*iH;
    ctx.fillStyle='#4a9eff';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
  });
  const phList=document.getElementById('phList'); phList.innerHTML='';
  const lf=document.createDocumentFragment();
  h.slice().reverse().forEach(x=>{
    const div=document.createElement('div'); div.textContent=x.date+': ';
    const s=document.createElement('strong'); s.style.color='var(--accent)'; s.textContent=x.price.toLocaleString('ru-RU')+' ֏';
    div.appendChild(s); lf.appendChild(div);
  });
  phList.appendChild(lf);
  openModal('priceHistModal');
}

// ── Выбор продукта (модал) ───────────────────────────────────────
function filterPS() {
  const q=DOM.psInput.value.toLowerCase();
  const frag=document.createDocumentFragment();
  Object.entries(kbjuTable)
    .filter(([n,d])=>!d.archived&&(!q||n.toLowerCase().includes(q)))
    .forEach(([name,d])=>{
      const tr=document.createElement('tr');
      tr.addEventListener('click',()=>pickProd(name));
      const tdN=document.createElement('td'); tdN.style.textAlign='left'; tdN.textContent=name;
      [d.proteins,d.fats,d.carbs,d.calories].forEach(v=>{
        const td=document.createElement('td'); td.textContent=n1(v); tr.appendChild(td);
      });
      tr.insertBefore(tdN,tr.firstChild);
      frag.appendChild(tr);
    });
  DOM.psBody.innerHTML='';
  DOM.psBody.appendChild(frag);
}

// ── Модальные окна ───────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Просмотр сохранённого списка продуктов ───────────────────────
function viewNotesList(i) {
  const stored=loadNotesLists();
  const e=stored[i]; if(!e) return;
  document.getElementById('nlmTitle').textContent=e.label;
  const body=document.getElementById('nlmBody'); body.innerHTML='';
  const sections=[
    {label:'Перекус',items:e.snack},{label:'Завтрак',items:e.breakfast},
    {label:'Обед',items:e.lunch},{label:'Ужин',items:e.dinner},
  ];
  const frag=document.createDocumentFragment();
  sections.forEach(s=>{
    const div=document.createElement('div');
    const hdr=document.createElement('strong'); hdr.style.color='var(--accent)'; hdr.textContent=s.label;
    const content=document.createElement('div'); content.textContent=s.items.map(n=>'• '+n).join('\n'); content.style.whiteSpace='pre-line';
    div.append(hdr,document.createElement('br'),content);
    frag.appendChild(div);
  });
  const divAll=document.createElement('div'); divAll.style.gridColumn='span 2';
  const hdrAll=document.createElement('strong'); hdrAll.style.color='var(--accent)'; hdrAll.textContent='Общий список';
  const allContent=document.createElement('div'); allContent.textContent=e.all.map(n=>'• '+n).join('\n'); allContent.style.whiteSpace='pre-line';
  divAll.append(hdrAll,document.createElement('br'),allContent);
  frag.appendChild(divAll);
  body.appendChild(frag);
  openModal('notesListModal');
}
