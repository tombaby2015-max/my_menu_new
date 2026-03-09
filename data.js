// ════════════════════════════════════════════════════════════════
// data.js — Константы и начальные данные
// ════════════════════════════════════════════════════════════════

const DAYS  = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const MEALS = ['Завтрак','1й перекус','Обед','2й перекус','Ужин','3й перекус'];
const WORKER_URL = 'https://my-menu.belovolov-email.workers.dev';

// Начальные пустые данные (используются если localStorage пуст)
const DEFAULT_MENU_DATA      = {};
const DEFAULT_KBJU_TABLE     = {};
const DEFAULT_MEAL_TIMES     = {};
const DEFAULT_SAVED_RECIPES  = { Завтрак: [], Перекус: [], Обед: [], Ужин: [] };
const DEFAULT_NOTES          = '';
