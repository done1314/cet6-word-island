const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = 'word-island-cet6-v1';
const DAY = 86400000;
let words = [];
let state = { cards: {}, saved: [], dailyLimit: 210, day: '', learnedToday: 0, sprint2026: true };
let session = [];
let position = 0;
let phase = 'learn';
let shown = 60;
let deferredInstall;

function localDay() { return new Date().toLocaleDateString('sv-SE'); }
function safeText(selector, value) { $(selector).textContent = value; }
function save() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {} }
function load() {
  try { state = { ...state, ...JSON.parse(localStorage.getItem(STORAGE) || '{}') }; } catch {}
  if (!state.cards || typeof state.cards !== 'object') state.cards = {};
  if (!Array.isArray(state.saved)) state.saved = [];
  if (!state.sprint2026) { state.dailyLimit = 210; state.sprint2026 = true; save(); }
  if (state.day !== localDay()) { state.day = localDay(); state.learnedToday = 0; save(); }
}
function dayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function dueWords() { const now = dayStart() + DAY; return words.filter(w => state.cards[w.id] && state.cards[w.id].due < now); }
function mastered() { return Object.values(state.cards).filter(c => c.interval >= 7).length; }
function view(name) {
  $$('.view').forEach(el => el.classList.toggle('active', el.id === name));
  $$('.nav').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  if (name === 'library') renderLibrary();
  if (name === 'stats') renderStats();
  if (name === 'home') renderHome();
  window.scrollTo(0, 0);
}
function renderHome() {
  safeText('#date-label', new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()));
  safeText('#learned-today', state.learnedToday);
  safeText('#due-count', dueWords().length);
  safeText('#mastered-count', mastered());
  safeText('#today-hint', `12 月 5 日前学完 · 每天 ${state.dailyLimit} 个新词 · ${dueWords().length} 个待复习`);
}
function startSession() {
  const due = dueWords();
  const fresh = words.filter(w => !state.cards[w.id]).slice(0, Math.max(0, state.dailyLimit - state.learnedToday));
  session = [...due, ...fresh]; position = 0; phase = 'learn';
  if (!session.length) { alert('今天的词汇已经学完啦，明天再来复习。'); return; }
  view('study'); renderCard();
}
function renderCard() {
  if (position >= session.length) {
    if (phase === 'learn') { phase = 'spell'; position = 0; alert('今天的词卡学完了，开始集中拼写复习。'); }
    else { view('home'); alert('今天的拼写复习完成！'); return; }
  }
  const word = session[position];
  safeText('#session-progress', `${position + 1} / ${session.length}`);
  safeText('#session-label', phase === 'spell' ? '集中拼写复习' : (state.cards[word.id] ? '到期复习' : '新词学习'));
  safeText('#card-mode', phase === 'spell' ? '拼写复习' : (state.cards[word.id] ? '复习词' : '新词'));
  safeText('#word-index', phase === 'spell' ? `SPELL ${position + 1}` : `WORD ${String(word.id).padStart(4, '0')}`);
  safeText('#word-text', phase === 'spell' ? '听音 · 看词义 · 拼写' : word.word);
  safeText('#pronunciation', phase === 'spell' ? '' : (word.pronunciation || ''));
  safeText('#meaning', word.meaning);
  $('#answer').hidden = phase !== 'spell'; $('#rating').hidden = true; $('#reveal-btn').hidden = phase === 'spell';
  $('#spelling-input').value = '';
  $('#spelling-feedback').textContent = '';
  $('#spelling-check').hidden = phase !== 'spell';
  if (phase === 'spell') $('#spelling-input').focus();
  $('#progress-fill').style.width = `${position / session.length * 100}%`;
}
function rate(grade) {
  if (phase !== 'learn') return;
  const word = session[position];
  const old = state.cards[word.id];
  let interval = old?.interval || 0;
  if (grade === 'again') interval = 0;
  if (grade === 'hard') interval = 1;
  if (grade === 'good') interval = interval < 1 ? 3 : Math.min(180, Math.round(interval * 2));
  if (grade === 'easy') interval = interval < 1 ? 7 : Math.min(365, Math.round(interval * 2.5));
  state.cards[word.id] = { interval, due: dayStart() + Math.max(1, interval) * DAY, reviews: (old?.reviews || 0) + 1 };
  if (!old) state.learnedToday++;
  save(); position++; renderCard();
}
function filteredWords() {
  const q = $('#search-input').value.trim().toLocaleLowerCase();
  const filter = $('#filter-select').value;
  return words.filter(w => (filter === 'all' || (filter === 'saved' ? state.saved.includes(w.id) : !!state.cards[w.id])) && (!q || w.word.toLocaleLowerCase().includes(q) || w.meaning.toLocaleLowerCase().includes(q)));
}
function renderLibrary() {
  const results = filteredWords();
  safeText('#result-count', `找到 ${results.length.toLocaleString()} 个词`);
  const list = $('#word-list'); list.replaceChildren();
  for (const w of results.slice(0, shown)) {
    const row = document.createElement('article'); row.className = 'word-row';
    const title = document.createElement('strong'); title.textContent = w.word;
    const phonetic = document.createElement('span'); phonetic.className = 'phonetic'; phonetic.textContent = w.pronunciation;
    const definition = document.createElement('span'); definition.className = 'definition'; definition.textContent = w.meaning;
    const saveButton = document.createElement('button'); saveButton.className = `save-btn${state.saved.includes(w.id) ? ' saved' : ''}`; saveButton.textContent = state.saved.includes(w.id) ? '★' : '☆'; saveButton.setAttribute('aria-label', `收藏 ${w.word}`);
    saveButton.addEventListener('click', () => { state.saved = state.saved.includes(w.id) ? state.saved.filter(id => id !== w.id) : [...state.saved, w.id]; save(); renderLibrary(); });
    row.append(title, phonetic, definition, saveButton); list.append(row);
  }
  $('#load-more').hidden = results.length <= shown;
}
function renderStats() {
  const count = Object.keys(state.cards).length;
  const percent = words.length ? count / words.length * 100 : 0;
  safeText('#seen-count', count.toLocaleString());
  safeText('#coverage-label', `占词库 ${percent.toFixed(1)}%`);
  safeText('#stats-mastered', mastered());
  safeText('#stats-due', dueWords().length);
  safeText('#stats-saved', state.saved.length);
  $('#coverage-donut').style.background = `conic-gradient(var(--lime) ${percent}%, #547062 ${percent}%)`;
  $('#daily-limit').value = String(state.dailyLimit);
}
function speak() {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(session[position]?.word || ''); utterance.lang = 'en-US'; utterance.rate = .85; speechSynthesis.speak(utterance);
}
function exportProgress() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = '词屿-学习记录.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
async function init() {
  load();
  try { const response = await fetch('./data/words.json'); if (!response.ok) throw new Error('词库加载失败'); words = await response.json(); }
  catch { alert('词库加载失败。请通过本地服务器或 GitHub Pages 打开本项目。'); return; }
  $$('.nav').forEach(button => button.addEventListener('click', () => view(button.dataset.view)));
  $('#start-btn').addEventListener('click', startSession); $('#continue-btn').addEventListener('click', startSession);
  $('#back-btn').addEventListener('click', () => view('home'));
  const spelling = document.createElement('div');
  spelling.id = 'spelling-check';
  spelling.style.cssText = 'max-width:760px;margin:-5px auto 18px;padding:20px 24px;background:#e9eddf;border-radius:12px';
  spelling.innerHTML = '<label for="spelling-input" style="display:block;font-weight:700;margin-bottom:10px">今日拼写复习 · 答对才能进入下一词</label><div style="display:flex;gap:8px"><input id="spelling-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="根据词义输入英文单词" style="min-width:0;flex:1;padding:12px;border:1px solid #aab7a7;border-radius:8px;background:#fffdf6"><button id="check-spelling-btn" type="button" style="border:0;border-radius:8px;background:#172d26;color:white;padding:0 18px">检查</button></div><p id="spelling-feedback" role="status" style="margin:10px 0 0;min-height:20px;font-size:13px"></p>';
  $('#word-card').after(spelling);
  function checkSpelling() {
    const typed = $('#spelling-input').value.trim().normalize('NFKC').toLocaleLowerCase();
    const expected = session[position].word.trim().normalize('NFKC').toLocaleLowerCase();
    if (typed === expected) {
      position++;
      renderCard();
    } else {
      $('#spelling-feedback').textContent = '拼写不正确，请再试一次。';
      $('#spelling-input').focus();
    }
  }
  $('#check-spelling-btn').addEventListener('click', checkSpelling);
  $('#spelling-input').addEventListener('keydown', event => { if (event.key === 'Enter') checkSpelling(); });
  $('#reveal-btn').addEventListener('click', () => { $('#answer').hidden = false; $('#rating').hidden = false; $('#reveal-btn').hidden = true; });
  $$('#rating button').forEach(button => button.addEventListener('click', () => rate(button.dataset.grade)));
  $('#speak-btn').addEventListener('click', speak);
  $('#search-input').addEventListener('input', () => { shown = 60; renderLibrary(); });
  $('#filter-select').addEventListener('change', () => { shown = 60; renderLibrary(); });
  $('#load-more').addEventListener('click', () => { shown += 60; renderLibrary(); });
  $('#daily-limit').addEventListener('change', event => { state.dailyLimit = Number(event.target.value); save(); });
  for (const n of [210, 230, 250]) { const option = new Option(`${n} 词 · 冲刺`, String(n)); $('#daily-limit').add(option); }
  $('#export-btn').addEventListener('click', exportProgress);
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; $('#install-btn').hidden = false; });
  $('#install-btn').addEventListener('click', async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } });
  renderHome();
}
init();
