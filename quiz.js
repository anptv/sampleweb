/* quiz.js — Basketball Positions Quiz game logic (pure vanilla JS, no external deps) */

// ── DATA ──────────────────────────────────────────────────────────────────────
const POSITIONS = [
  { id: 1,
    nameEN: 'Point Guard (PG)',      nameVN: 'Hậu vệ dẫn bóng (PG)',
    descEN: 'Directs the offense, controls game tempo, and sets up teammates with court vision',
    descVN: 'Chỉ đạo tấn công, điều tiết nhịp chơi và tổ chức cơ hội cho đồng đội' },
  { id: 2,
    nameEN: 'Shooting Guard (SG)',   nameVN: 'Hậu vệ ném rổ (SG)',
    descEN: 'Perimeter scorer who excels at off-ball movement and catch-and-shoot plays',
    descVN: 'Chuyên gia ghi điểm ngoài vòng cung, di chuyển không bóng và bắt-ném chuẩn xác' },
  { id: 3,
    nameEN: 'Small Forward (SF)',    nameVN: 'Tiền đạo nhỏ (SF)',
    descEN: 'Versatile two-way player who can score from anywhere and guard multiple positions',
    descVN: 'Cầu thủ đa năng, ghi điểm linh hoạt mọi vị trí và phòng thủ nhiều vị trí' },
  { id: 4,
    nameEN: 'Power Forward (PF)',    nameVN: 'Tiền đạo lớn (PF)',
    descEN: 'Physical inside player who dominates the boards, sets screens, and scores in the post',
    descVN: 'Thể lực vượt trội, cướp bóng rổ, đặt màn chắn và ghi điểm ở gần rổ' },
  { id: 5,
    nameEN: 'Center (C)',            nameVN: 'Trung phong (C)',
    descEN: 'Rim protector who blocks shots, dominates the paint, and scores around the basket',
    descVN: 'Bảo vệ rổ, cản phá cú ném, khống chế khu vực sơn và ghi điểm quanh rổ' },
];

// ── STATE ─────────────────────────────────────────────────────────────────────
const STATE = {
  lang: 'en',
  timerStarted: false,
  timerInterval: null,
  elapsed: 0,  // seconds
  zones: { 1: { name: null, desc: null }, 2: { name: null, desc: null },
           3: { name: null, desc: null }, 4: { name: null, desc: null },
           5: { name: null, desc: null } },
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function getRank(elapsed) {
  if (elapsed < 45) return { en: 'Elite Playmaker', vn: 'Bậc thầy điều phối' };
  if (elapsed < 90) return { en: 'Starter',         vn: 'Cầu thủ chính thức' };
  return               { en: 'Rookie',              vn: 'Tân binh' };
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function startTimerIfNeeded() {
  if (STATE.timerStarted) return;
  STATE.timerStarted = true;
  STATE.timerInterval = setInterval(() => {
    STATE.elapsed++;
    document.getElementById('timer').textContent = formatTime(STATE.elapsed);
  }, 1000);
}
function stopTimer() {
  clearInterval(STATE.timerInterval);
  STATE.timerInterval = null;
}

// ── LANGUAGE ──────────────────────────────────────────────────────────────────
function applyLang() {
  // Scoped to .js-i18n — prevents clobbering elements without bilingual data
  document.querySelectorAll('.js-i18n').forEach(el => {
    el.textContent = el.dataset[STATE.lang];
  });
}
function toggleLang() {
  STATE.lang = STATE.lang === 'en' ? 'vn' : 'en';
  document.documentElement.lang = STATE.lang;
  applyLang();
  // Update rank in modal if it's open
  const modal = document.getElementById('modal-scoreboard');
  if (modal.open) {
    document.getElementById('score-rank').textContent = getRank(STATE.elapsed)[STATE.lang];
  }
}

// ── CARD MOVEMENT ─────────────────────────────────────────────────────────────
function returnCardToTray(cardEl) {
  const tray = cardEl.dataset.type === 'name'
    ? document.querySelector('.tray--names')
    : document.querySelector('.tray--desc');
  tray.appendChild(cardEl);
  cardEl.classList.remove('locked', 'shake');
  cardEl.setAttribute('draggable', 'true');
}

function placeCard(cardEl, targetSlot) {
  // Evict existing card from target slot → return it to its tray
  const existing = targetSlot.querySelector('.card');
  if (existing) {
    const evictZoneId = Number(targetSlot.closest('.drop-zone').dataset.zone);
    STATE.zones[evictZoneId][targetSlot.dataset.accepts] = null;
    returnCardToTray(existing);
  }
  // If card is currently in a slot → vacate that slot's STATE entry
  const sourceSlot = cardEl.closest('.slot');
  if (sourceSlot) {
    const srcZoneId = Number(sourceSlot.closest('.drop-zone').dataset.zone);
    STATE.zones[srcZoneId][sourceSlot.dataset.accepts] = null;
  }
  // Move the original card element (no cloning — avoids STATE duplication)
  targetSlot.appendChild(cardEl);
  // Update STATE
  const targetZoneId = Number(targetSlot.closest('.drop-zone').dataset.zone);
  STATE.zones[targetZoneId][targetSlot.dataset.accepts] = Number(cardEl.dataset.position);
  targetSlot.closest('.drop-zone').classList.remove('dragover');
}

// ── DRAG-AND-DROP (HTML5 DnD) ─────────────────────────────────────────────────
function bindDnDEvents() {
  // Dragstart/dragend: delegate on document — catches cards in trays AND slots
  document.addEventListener('dragstart', e => {
    const card = e.target.closest('.card');
    if (!card || card.classList.contains('locked')) { e.preventDefault(); return; }
    // Store data-id; validated before use in drop handlers to prevent injection
    e.dataTransfer.setData('text/plain', card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
    startTimerIfNeeded();
  });
  document.addEventListener('dragend', e => {
    if (e.target.classList.contains('card')) e.target.classList.remove('dragging');
    document.querySelectorAll('.drop-zone.dragover').forEach(z => z.classList.remove('dragover'));
  });

  // Drop targets: bind directly to slots (static DOM elements — no rebinding needed)
  document.querySelectorAll('.slot').forEach(slot => {
    slot.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.closest('.drop-zone').classList.add('dragover');
    });
    slot.addEventListener('dragleave', e => {
      // Only remove if leaving the slot entirely (not moving to a child element)
      if (!slot.contains(e.relatedTarget)) {
        slot.closest('.drop-zone').classList.remove('dragover');
      }
    });
    slot.addEventListener('drop', e => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('text/plain');
      // Validate cardId allowlist before using in querySelector (prevents injection)
      if (!/^(name|desc)-[1-5]$/.test(cardId)) return;
      const cardEl = document.querySelector(`[data-id="${cardId}"]`);
      if (!cardEl || cardEl.dataset.type !== slot.dataset.accepts) return;
      placeCard(cardEl, slot);
    });
  });

  // Tray drop targets: allow returning cards from slots back to the tray
  document.querySelectorAll('.tray').forEach(tray => {
    tray.addEventListener('dragover', e => {
      e.preventDefault();
      tray.classList.add('dragover-tray');
    });
    tray.addEventListener('dragleave', e => {
      if (!tray.contains(e.relatedTarget)) tray.classList.remove('dragover-tray');
    });
    tray.addEventListener('drop', e => {
      e.preventDefault();
      tray.classList.remove('dragover-tray');
      const cardId = e.dataTransfer.getData('text/plain');
      if (!/^(name|desc)-[1-5]$/.test(cardId)) return;
      const cardEl = document.querySelector(`[data-id="${cardId}"]`);
      if (!cardEl) return;
      // If card came from a slot, clear STATE entry
      const sourceSlot = cardEl.closest('.slot');
      if (sourceSlot) {
        const srcZoneId = Number(sourceSlot.closest('.drop-zone').dataset.zone);
        STATE.zones[srcZoneId][sourceSlot.dataset.accepts] = null;
      }
      returnCardToTray(cardEl);
    });
  });
}

// ── TOUCH POLYFILL ────────────────────────────────────────────────────────────
// Synthesizes drag-and-drop from touch events; zero external deps
function initTouchPolyfill() {
  let dragEl = null;
  let clone = null;
  let offsetX = 0, offsetY = 0;

  document.addEventListener('touchstart', e => {
    const card = e.target.closest('.card');
    if (!card || card.classList.contains('locked')) return;
    e.preventDefault(); // prevent scroll initiation when touch-dragging a card
    dragEl = card;
    const rect = card.getBoundingClientRect();
    const touch = e.touches[0];
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    // Clone goes on body (fixed pos) so .court overflow:hidden doesn't clip it
    clone = card.cloneNode(true);
    clone.id = 'touch-drag-clone';
    clone.style.width = rect.width + 'px';
    clone.style.left = (touch.clientX - offsetX) + 'px';
    clone.style.top  = (touch.clientY - offsetY) + 'px';
    document.body.appendChild(clone);
    card.classList.add('dragging');
    startTimerIfNeeded();
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!dragEl) return;
    e.preventDefault();
    const touch = e.touches[0];
    clone.style.left = (touch.clientX - offsetX) + 'px';
    clone.style.top  = (touch.clientY - offsetY) + 'px';
    // Find element beneath finger (hide clone first so it doesn't block the hit test)
    clone.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    clone.style.visibility = '';
    document.querySelectorAll('.drop-zone.dragover').forEach(z => z.classList.remove('dragover'));
    const slot = el && el.closest('.slot');
    if (slot) slot.closest('.drop-zone').classList.add('dragover');
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!dragEl) return;
    const touch = e.changedTouches[0];
    clone.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    clone.remove(); clone = null;
    dragEl.classList.remove('dragging');
    document.querySelectorAll('.drop-zone.dragover').forEach(z => z.classList.remove('dragover'));

    if (el) {
      const slot = el.closest('.slot');
      const tray = el.closest('.tray');
      if (slot && dragEl.dataset.type === slot.dataset.accepts) {
        placeCard(dragEl, slot);
      } else if (tray) {
        const sourceSlot = dragEl.closest('.slot');
        if (sourceSlot) {
          const srcZoneId = Number(sourceSlot.closest('.drop-zone').dataset.zone);
          STATE.zones[srcZoneId][sourceSlot.dataset.accepts] = null;
        }
        returnCardToTray(dragEl);
      }
    }
    dragEl = null;
  }, { passive: true });
}

// ── VALIDATION & SCORING ──────────────────────────────────────────────────────
function lockSlot(zone, type) {
  const card = zone.querySelector(`.slot--${type} .card`);
  if (!card) return;
  card.classList.add('locked');
  card.setAttribute('draggable', 'false');
}

function triggerIncorrect(zone) {
  zone.querySelectorAll('.card').forEach(c => {
    c.classList.remove('shake');
    // Force reflow to restart animation if already shaking
    void c.offsetWidth;
    c.classList.add('shake');
  });
}

function returnIncorrectCard(zone, type) {
  const slot = zone.querySelector(`.slot--${type}`);
  const card = slot && slot.querySelector('.card');
  if (!card) return;
  const zoneId = Number(zone.dataset.zone);
  STATE.zones[zoneId][type] = null;
  returnCardToTray(card);
}

function showScoreboard(correct) {
  document.getElementById('score-accuracy').textContent = `${correct}/10`;
  document.getElementById('score-time').textContent = formatTime(STATE.elapsed);
  document.getElementById('score-rank').textContent = getRank(STATE.elapsed)[STATE.lang];
  document.getElementById('modal-scoreboard').showModal();
}

function submitGame() {
  stopTimer();
  let correct = 0;

  for (let zoneId = 1; zoneId <= 5; zoneId++) {
    const zone = document.querySelector(`.drop-zone[data-zone="${zoneId}"]`);
    const nameCorrect = Number(STATE.zones[zoneId].name) === zoneId;
    const descCorrect = Number(STATE.zones[zoneId].desc) === zoneId;

    if (nameCorrect) {
      correct++;
      lockSlot(zone, 'name');
    } else {
      returnIncorrectCard(zone, 'name');
    }

    if (descCorrect) {
      correct++;
      lockSlot(zone, 'desc');
    } else {
      returnIncorrectCard(zone, 'desc');
    }

    // Visual feedback: both correct = green glow, any wrong = red glow + shake
    zone.classList.toggle('correct',   nameCorrect && descCorrect);
    zone.classList.toggle('incorrect', !nameCorrect || !descCorrect);
    if (!nameCorrect || !descCorrect) triggerIncorrect(zone);
  }

  showScoreboard(correct);
}

// ── REVIEW MODE ───────────────────────────────────────────────────────────────
function showReview() {
  document.getElementById('modal-scoreboard').close();
  const overlay = document.getElementById('review-overlay');
  // Populate all 5 positions with EN/VN labels
  POSITIONS.forEach(p => {
    const el = overlay.querySelector(`[data-review-zone="${p.id}"]`);
    if (!el) return;
    el.querySelector('.review-name').textContent = `${p.nameEN} / ${p.nameVN}`;
    el.querySelector('.review-desc').textContent = `${p.descEN} / ${p.descVN}`;
  });
  overlay.hidden = false;
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function shuffleTray(selector) {
  const tray = document.querySelector(selector);
  const cards = Array.from(tray.querySelectorAll('.card'));
  shuffle(cards);
  cards.forEach(c => tray.appendChild(c));
}

function resetGame() {
  // 0. Stop timer first — prevents interval leak on rapid resets
  stopTimer();
  STATE.timerStarted = false;

  // 1. Close modal and review overlay if open
  const modal = document.getElementById('modal-scoreboard');
  if (modal.open) modal.close();
  document.getElementById('review-overlay').hidden = true;

  // 2. Return all placed cards to their trays, then clear slots
  document.querySelectorAll('.slot').forEach(slot => {
    const card = slot.querySelector('.card');
    if (card) returnCardToTray(card);
    slot.innerHTML = '';
  });

  // 3. Reset STATE
  STATE.elapsed = 0;
  STATE.timerInterval = null;
  document.getElementById('timer').textContent = formatTime(0);
  for (let i = 1; i <= 5; i++) STATE.zones[i] = { name: null, desc: null };

  // 4. Remove validation classes from zones and cards
  document.querySelectorAll('.drop-zone').forEach(z =>
    z.classList.remove('correct', 'incorrect'));
  document.querySelectorAll('.card').forEach(c =>
    c.classList.remove('locked', 'shake'));

  // 5. Re-shuffle trays
  shuffleTray('.tray--names');
  shuffleTray('.tray--desc');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initGame() {
  // Initial shuffle so cards appear in random order
  shuffleTray('.tray--names');
  shuffleTray('.tray--desc');

  // Apply initial language state
  applyLang();

  // Bind HTML5 DnD events
  bindDnDEvents();

  // Touch polyfill for tablet support
  initTouchPolyfill();

  // Control buttons
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('btn-submit').addEventListener('click', submitGame);
  document.getElementById('btn-reset').addEventListener('click', resetGame);
  document.getElementById('btn-play-again').addEventListener('click', resetGame);
  document.getElementById('btn-review').addEventListener('click', showReview);
  document.getElementById('btn-close-review').addEventListener('click', () => {
    document.getElementById('review-overlay').hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', initGame);
