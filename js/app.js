/* ═══════════════════════════════════════════════════════════════
   Life Dashboard — app.js
   Vanilla JavaScript, no frameworks, no build tools.
   Semua data disimpan di localStorage.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────────────────────────
   UTIL: localStorage wrapper
─────────────────────────────────────────────────────────────── */
const LS = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full / private mode */ }
  },
};

/* ───────────────────────────────────────────────────────────────
   UTIL: Toast notifikasi singkat
─────────────────────────────────────────────────────────────── */
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, duration = 2500) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

/* ───────────────────────────────────────────────────────────────
   SETTINGS — nama pengguna, durasi pomodoro, tema
─────────────────────────────────────────────────────────────── */
const SETTING_KEYS = {
  name:     'dash_name',
  pomodoro: 'dash_pomodoro',
  theme:    'dash_theme',
};

const DEFAULT_SETTINGS = {
  name:     '',
  pomodoro: 25,
  theme:    'light',
};

function getSettings() {
  return {
    name:     LS.get(SETTING_KEYS.name,     DEFAULT_SETTINGS.name),
    pomodoro: LS.get(SETTING_KEYS.pomodoro, DEFAULT_SETTINGS.pomodoro),
    theme:    LS.get(SETTING_KEYS.theme,    DEFAULT_SETTINGS.theme),
  };
}

function setSettings(partial) {
  const curr = getSettings();
  const next = { ...curr, ...partial };
  LS.set(SETTING_KEYS.name,     next.name);
  LS.set(SETTING_KEYS.pomodoro, next.pomodoro);
  LS.set(SETTING_KEYS.theme,    next.theme);
  return next;
}

/* ═══════════════════════════════════════════════════════════════
   MODUL 1 — GREETING & CLOCK
   • Jam real-time (hh:mm:ss)
   • Tanggal lengkap
   • Sapaan dinamis berdasarkan waktu + nama tersimpan
   ═══════════════════════════════════════════════════════════════ */

const elTime     = document.getElementById('el-time');
const elDate     = document.getElementById('el-date');
const elGreeting = document.getElementById('el-greeting');

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

/**
 * Mengembalikan teks sapaan berdasarkan jam.
 * @param {number} jam - 0..23
 */
function getSapaan(jam) {
  if (jam >= 5  && jam < 12) return 'Selamat Pagi';
  if (jam >= 12 && jam < 15) return 'Selamat Siang';
  if (jam >= 15 && jam < 19) return 'Selamat Sore';
  return 'Selamat Malam';
}

/** Memformat angka jadi 2 digit, misal 7 → "07" */
function pad(n) {
  return String(n).padStart(2, '0');
}

/** Update tampilan jam, tanggal, dan sapaan setiap detik */
function updateClock() {
  const now  = new Date();
  const jam  = now.getHours();
  const mnt  = now.getMinutes();
  const dtk  = now.getSeconds();

  // Jam
  elTime.textContent = `${pad(jam)}:${pad(mnt)}:${pad(dtk)}`;

  // Tanggal
  elDate.textContent =
    `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

  // Sapaan
  const { name } = getSettings();
  elGreeting.textContent = name.trim()
    ? `${getSapaan(jam)}, ${name.trim()}! 👋`
    : `${getSapaan(jam)}! 👋`;
}

updateClock();
setInterval(updateClock, 1000);

/* ═══════════════════════════════════════════════════════════════
   MODUL 2 — FOCUS TIMER
   • Default 25 menit (dapat diubah via Settings)
   • Tombol: Mulai, Berhenti, Reset
   • Lingkaran progress SVG
   • Notifikasi saat selesai
   ═══════════════════════════════════════════════════════════════ */

const elTimer        = document.getElementById('el-timer');
const elTimerStatus  = document.getElementById('timer-status-text');
const ringFill       = document.getElementById('ring-fill');
const btnStart       = document.getElementById('btn-timer-start');
const btnStop        = document.getElementById('btn-timer-stop');
const btnReset       = document.getElementById('btn-timer-reset');

// circumference = 2π × r = 2π × 70 ≈ 439.82
const CIRCUMFERENCE = 2 * Math.PI * 70;

let timerInterval = null;
let timerRunning  = false;
let totalSecs     = 0;
let remainSecs    = 0;

/** Mengambil durasi pomodoro dari settings (dalam detik) */
function getPomoSecs() {
  return getSettings().pomodoro * 60;
}

/** Format detik ke "mm:ss" */
function fmtTime(secs) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

/** Update posisi lingkaran progress */
function updateRing(remaining, total) {
  const pct    = total > 0 ? remaining / total : 1;
  const offset = CIRCUMFERENCE * (1 - pct);
  ringFill.style.strokeDashoffset = offset;
}

/** Inisialisasi / reset tampilan timer ke nilai awal */
function initTimer() {
  totalSecs  = getPomoSecs();
  remainSecs = totalSecs;
  elTimer.textContent = fmtTime(remainSecs);
  ringFill.style.strokeDasharray  = CIRCUMFERENCE;
  ringFill.style.strokeDashoffset = 0;
  ringFill.classList.remove('done');
  elTimer.classList.remove('done');
  elTimerStatus.textContent = 'Siap untuk fokus 💪';
}

function startTimer() {
  if (timerRunning) return;
  if (remainSecs <= 0) initTimer();

  timerRunning = true;
  btnStart.disabled = true;
  btnStop.disabled  = false;
  elTimerStatus.textContent = 'Sedang fokus… 🔥';

  timerInterval = setInterval(() => {
    remainSecs--;
    elTimer.textContent = fmtTime(remainSecs);
    updateRing(remainSecs, totalSecs);

    if (remainSecs <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      btnStart.disabled = false;
      btnStop.disabled  = true;
      onTimerDone();
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  btnStart.disabled = false;
  btnStop.disabled  = true;
  elTimerStatus.textContent = 'Dijeda ⏸';
}

function resetTimer() {
  stopTimer();
  initTimer();
}

function onTimerDone() {
  ringFill.classList.add('done');
  elTimer.classList.add('done');
  elTimerStatus.textContent = 'Sesi selesai! Istirahat sebentar ☕';
  showToast('⏰ Sesi fokus selesai! Waktunya istirahat.', 4000);

  // Browser notification (opsional)
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Sesi Fokus Selesai! 🎉', { body: 'Waktu istirahat sebentar.' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('Sesi Fokus Selesai! 🎉', { body: 'Waktu istirahat sebentar.' });
        }
      });
    }
  }
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);

initTimer(); // inisialisasi pertama kali

/* ═══════════════════════════════════════════════════════════════
   MODUL 3 — TO-DO LIST
   • Tambah tugas baru
   • Edit tugas (klik teks, langsung bisa diketik)
   • Tandai selesai (checkbox)
   • Hapus tugas
   • Semua data tersimpan di localStorage
   ═══════════════════════════════════════════════════════════════ */

const formTodo   = document.getElementById('form-todo');
const inputTodo  = document.getElementById('input-todo');
const listTodo   = document.getElementById('list-todo');
const elTodoEmpty   = document.getElementById('todo-empty');
const elTodoCounter = document.getElementById('todo-counter');

// Muat data dari localStorage; pastikan setiap item punya `id`
let todos = (LS.get('dash_todos', []) || []).map(t => ({
  id:   t.id   ?? crypto.randomUUID(),
  text: t.text ?? '',
  done: t.done ?? false,
}));

function saveTodos() {
  LS.set('dash_todos', todos);
}

/** Render ulang seluruh daftar tugas */
function renderTodos() {
  listTodo.innerHTML = '';

  const total    = todos.length;
  const selesai  = todos.filter(t => t.done).length;

  // Counter
  elTodoCounter.textContent = total === 0
    ? '0 tugas'
    : `${selesai}/${total} selesai`;

  // Empty state
  elTodoEmpty.classList.toggle('hidden', total > 0);

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    /* Checkbox */
    const chk = document.createElement('input');
    chk.type      = 'checkbox';
    chk.className = 'todo-check';
    chk.checked   = todo.done;
    chk.setAttribute('aria-label', `Tandai "${todo.text}" selesai`);
    chk.addEventListener('change', () => toggleTodo(todo.id));

    /* Teks (bisa diedit langsung) */
    const span = document.createElement('span');
    span.className       = 'todo-text';
    span.textContent     = todo.text;
    span.contentEditable = 'true';
    span.setAttribute('role',       'textbox');
    span.setAttribute('aria-label', 'Teks tugas');

    span.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
      if (e.key === 'Escape') { span.textContent = todo.text; span.blur(); }
    });

    span.addEventListener('blur', () => {
      const baru = span.textContent.trim();
      if (baru && baru !== todo.text) {
        todo.text = baru;
        saveTodos();
        renderTodos();
      } else {
        span.textContent = todo.text; // kembalikan jika kosong
      }
    });

    /* Tombol hapus */
    const del = document.createElement('button');
    del.className   = 'todo-delete';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Hapus "${todo.text}"`);
    del.addEventListener('click', () => deleteTodo(todo.id));

    li.append(chk, span, del);
    listTodo.appendChild(li);
  });
}

function addTodo(text) {
  todos.unshift({ id: crypto.randomUUID(), text: text.trim(), done: false });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const t = todos.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

formTodo.addEventListener('submit', e => {
  e.preventDefault();
  const text = inputTodo.value.trim();
  if (!text) return;
  addTodo(text);
  inputTodo.value = '';
  inputTodo.focus();
});

renderTodos();

/* ═══════════════════════════════════════════════════════════════
   MODUL 4 — QUICK LINKS
   • Tambah link dengan label + URL
   • Favikon otomatis dari Google S2
   • Edit (double-click) dan hapus (hover × )
   • Tersimpan di localStorage
   ═══════════════════════════════════════════════════════════════ */

const linksGrid    = document.getElementById('links-grid');
const elLinksEmpty = document.getElementById('links-empty');
const btnAddLink   = document.getElementById('btn-add-link');

// Modal link
const modalLink     = document.getElementById('modal-link');
const modalLinkTitle = document.getElementById('modal-link-title');
const inputLinkLabel = document.getElementById('input-link-label');
const inputLinkUrl   = document.getElementById('input-link-url');
const btnLinkSave   = document.getElementById('btn-link-save');
const btnLinkCancel = document.getElementById('btn-link-cancel');
const btnLinkClose  = document.getElementById('btn-link-close');

let links      = (LS.get('dash_links', []) || []).map(l => ({
  id:    l.id    ?? crypto.randomUUID(),
  label: l.label ?? '',
  url:   l.url   ?? '',
}));
let editLinkId = null;

function saveLinks() { LS.set('dash_links', links); }

/** Mengambil URL favicon lewat Google S2 */
function faviconSrc(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(origin)}`;
  } catch {
    return '';
  }
}

function renderLinks() {
  linksGrid.innerHTML = '';
  elLinksEmpty.classList.toggle('hidden', links.length > 0);

  links.forEach(link => {
    /* Wrapper (untuk posisi tombol hapus) */
    const wrap = document.createElement('div');
    wrap.className = 'link-chip-wrap';

    /* Chip / tautan */
    const a = document.createElement('a');
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'link-chip';
    a.title     = link.url;

    // Favicon
    const fav = faviconSrc(link.url);
    if (fav) {
      const img = document.createElement('img');
      img.src       = fav;
      img.alt       = '';
      img.className = 'link-favicon';
      img.onerror   = () => img.remove();
      a.appendChild(img);
    }

    const lbl = document.createElement('span');
    lbl.textContent = link.label;
    a.appendChild(lbl);

    // Double-click → edit
    a.addEventListener('dblclick', e => {
      e.preventDefault();
      openLinkModal(link.id);
    });

    /* Tombol hapus (muncul saat hover) */
    const removeBtn = document.createElement('button');
    removeBtn.className = 'link-remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `Hapus ${link.label}`);
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      links = links.filter(l => l.id !== link.id);
      saveLinks();
      renderLinks();
      showToast(`🗑️ Link "${link.label}" dihapus`);
    });

    wrap.append(a, removeBtn);
    linksGrid.appendChild(wrap);
  });
}

function openLinkModal(id = null) {
  editLinkId = id;
  if (id) {
    const link = links.find(l => l.id === id);
    modalLinkTitle.textContent = '✏️ Edit Link';
    inputLinkLabel.value       = link.label;
    inputLinkUrl.value         = link.url;
  } else {
    modalLinkTitle.textContent = '🔗 Tambah Link';
    inputLinkLabel.value       = '';
    inputLinkUrl.value         = '';
  }
  modalLink.classList.remove('hidden');
  inputLinkLabel.focus();
}

function closeLinkModal() {
  modalLink.classList.add('hidden');
  editLinkId = null;
}

btnLinkSave.addEventListener('click', () => {
  const label = inputLinkLabel.value.trim();
  let   url   = inputLinkUrl.value.trim();

  if (!label || !url) {
    showToast('⚠️ Label dan URL wajib diisi!');
    return;
  }

  // Tambah https:// jika belum ada
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  if (editLinkId) {
    const link = links.find(l => l.id === editLinkId);
    if (link) { link.label = label; link.url = url; }
    showToast('✅ Link diperbarui!');
  } else {
    links.push({ id: crypto.randomUUID(), label, url });
    showToast('✅ Link ditambahkan!');
  }

  saveLinks();
  renderLinks();
  closeLinkModal();
});

btnLinkCancel.addEventListener('click', closeLinkModal);
btnLinkClose.addEventListener('click',  closeLinkModal);
btnAddLink.addEventListener('click', () => openLinkModal());
modalLink.addEventListener('click', e => { if (e.target === modalLink) closeLinkModal(); });

renderLinks();

/* ═══════════════════════════════════════════════════════════════
   CHALLENGE 1 — LIGHT / DARK MODE
   • Toggle via tombol 🌙/☀️ di topbar
   • Preferensi tersimpan di localStorage
   ═══════════════════════════════════════════════════════════════ */

const btnTheme  = document.getElementById('btn-theme');
const themeIcon = document.getElementById('theme-icon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  btnTheme.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap',
  );
  btnTheme.title = theme === 'dark' ? 'Mode Terang' : 'Mode Gelap';
}

btnTheme.addEventListener('click', () => {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  setSettings({ theme: next });
});

// Terapkan tema saat halaman dibuka
applyTheme(getSettings().theme);

/* ═══════════════════════════════════════════════════════════════
   CHALLENGE 2 — CUSTOM NAME IN GREETING
   (Diimplementasikan lewat Settings Modal + updateClock())
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   CHALLENGE 3 — CHANGE POMODORO TIME
   (Diimplementasikan lewat Settings Modal + initTimer())
   ═══════════════════════════════════════════════════════════════ */

/* ─── Settings Modal ────────────────────────────────────────── */
const modalSettings   = document.getElementById('modal-settings');
const btnSettingsOpen  = document.getElementById('btn-settings-open');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsSave  = document.getElementById('btn-settings-save');
const btnSettingsCancel = document.getElementById('btn-settings-cancel');
const inputName        = document.getElementById('input-name');
const inputPomodoro    = document.getElementById('input-pomodoro');

function openSettingsModal() {
  const s = getSettings();
  inputName.value     = s.name;
  inputPomodoro.value = s.pomodoro;
  modalSettings.classList.remove('hidden');
  inputName.focus();
}

function closeSettingsModal() {
  modalSettings.classList.add('hidden');
}

btnSettingsOpen.addEventListener('click', openSettingsModal);
btnSettingsClose.addEventListener('click', closeSettingsModal);
btnSettingsCancel.addEventListener('click', closeSettingsModal);
modalSettings.addEventListener('click', e => {
  if (e.target === modalSettings) closeSettingsModal();
});

btnSettingsSave.addEventListener('click', () => {
  const name     = inputName.value.trim();
  const pomodoro = Math.max(1, Math.min(120, parseInt(inputPomodoro.value, 10) || 25));

  setSettings({ name, pomodoro });

  // Perbarui tampilan segera
  updateClock();
  if (!timerRunning) initTimer(); // hanya reset jika timer tidak sedang berjalan

  closeSettingsModal();
  showToast('✅ Pengaturan disimpan!');
});

/* ─── Tutup modal dengan Escape ────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSettingsModal();
    closeLinkModal();
  }
});
