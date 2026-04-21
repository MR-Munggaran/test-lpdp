// Deklarasikan variabel data di tingkat global
let data = null;

// ──────────────────────────────────────────
// KONFIGURASI WAKTU PER SEKSI (dalam detik)
// ──────────────────────────────────────────
const SECTION_TIME_LIMITS = {
  0: 35 * 60,  // Verbal: 35 menit
  1: 40 * 60,  // Kuantitatif: 40 menit
  2: 25 * 60   // Pemecahan Masalah: 25 menit
};

// ──────────────────────────────────────────
// STATE TAMBAHAN UNTUK TIMER
// ──────────────────────────────────────────
let timerState = {
  intervalId: null,
  remaining: { 0: null, 1: null, 2: null },
  isRunning: false,
  currentSection: null  // ✅ FIX: track section mana yang sedang berjalan
};

// ──────────────────────────────────────────
// STATE
// ──────────────────────────────────────────
let state = {
  paketIdx: 0,
  sectionIdx: 0,
  qIdx: 0,
  answers: [],
  revealed: [],
  started: false,
};

function initState(pi) {
  state.paketIdx = pi;
  state.answers = data.pakets[pi].sections.map(s => Array(s.questions.length).fill(null));
  state.revealed = data.pakets[pi].sections.map(s => Array(s.questions.length).fill(false));
  state.sectionIdx = 0;
  state.qIdx = 0;

  // Reset timer untuk semua section
  timerState.remaining = { 0: null, 1: null, 2: null };
  timerState.isRunning = false;
  timerState.currentSection = null;
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
}

// ──────────────────────────────────────────
// FUNGSI TIMER
// ──────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startTimer(sectionIdx) {
  // ✅ FIX: Jangan restart jika timer sudah berjalan untuk section yang sama
  if (timerState.isRunning && timerState.currentSection === sectionIdx) {
    updateTimerDisplay(sectionIdx); // cukup update tampilan saja
    return;
  }

  // Inisialisasi waktu jika belum ada
  if (timerState.remaining[sectionIdx] === null) {
    timerState.remaining[sectionIdx] = SECTION_TIME_LIMITS[sectionIdx];
  }

  // Stop timer sebelumnya
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  timerState.isRunning = true;
  timerState.currentSection = sectionIdx;
  updateTimerDisplay(sectionIdx);

  timerState.intervalId = setInterval(() => {
    if (!timerState.isRunning) return;

    timerState.remaining[sectionIdx]--;
    updateTimerDisplay(sectionIdx);

    // Warning saat 5 menit terakhir
    const warningEl = document.getElementById('timer-warning');
    if (timerState.remaining[sectionIdx] <= 300 && timerState.remaining[sectionIdx] > 0) {
      warningEl.style.display = 'block';
    } else {
      warningEl.style.display = 'none';
    }

    // Waktu habis
    if (timerState.remaining[sectionIdx] <= 0) {
      stopTimer();
      showTimeUp(sectionIdx);
    }
  }, 1000);
}

function stopTimer() {
  timerState.isRunning = false;
  timerState.currentSection = null;
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
}

function updateTimerDisplay(sectionIdx) {
  // ✅ FIX: Hanya satu #timer-display (di quiz-screen), tidak ada lagi di header
  const display = document.getElementById('timer-display');
  const text = document.getElementById('timer-text');
  const timeLeft = timerState.remaining[sectionIdx];

  if (timeLeft === null || !display || !text) return;

  display.style.display = 'flex';
  text.textContent = formatTime(timeLeft);

  // Ubah warna saat waktu kritis
  if (timeLeft <= 60) {
    text.style.color = 'var(--red)';
    display.style.borderColor = 'var(--red)';
  } else if (timeLeft <= 300) {
    text.style.color = 'var(--accent3)';
    display.style.borderColor = 'var(--accent3)';
  } else {
    text.style.color = 'var(--text)';
    display.style.borderColor = 'var(--border)';
  }
}

function showTimeUp(sectionIdx) {
  const overlay = document.getElementById('time-up-overlay');
  const message = document.getElementById('time-up-message');
  const isLastSection = sectionIdx >= data.pakets[state.paketIdx].sections.length - 1;

  message.textContent = isLastSection
    ? 'Waktu ujian telah selesai. Klik tombol di bawah untuk melihat hasil.'
    : 'Waktu untuk seksi ini telah berakhir. Lanjut ke seksi berikutnya.';

  overlay.style.display = 'flex';
}

function closeTimeUp() {
  document.getElementById('time-up-overlay').style.display = 'none';

  const currentSection = state.sectionIdx;
  const isLastSection = currentSection >= data.pakets[state.paketIdx].sections.length - 1;

  if (isLastSection) {
    finishQuiz();
  } else {
    switchSection(currentSection + 1);
  }
}

// ──────────────────────────────────────────
// BUILD HOME
// ──────────────────────────────────────────
function buildHome() {
  const grid = document.getElementById('paket-grid');
  grid.innerHTML = '';

  if (!data || !data.pakets) {
    grid.innerHTML = '<p style="color: var(--red);">Gagal memuat data soal. Pastikan kamu menjalankan aplikasi ini menggunakan Local Server.</p>';
    return;
  }

  data.pakets.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'paket-card';
    card.innerHTML = `
      <div class="paket-num">PAKET 0${i+1}</div>
      <div class="paket-name" style="color:${p.color}">${p.name}</div>
      <div class="paket-stats">
        ${p.sections.map(s=>`<div class="stat-row"><span>${s.name}</span><strong>${s.questions.length} Soal</strong></div>`).join('')}
        <div class="stat-row" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px"><span>Total</span><strong>${p.sections.reduce((a,s)=>a+s.questions.length,0)} Soal</strong></div>
      </div>
    `;
    card.onclick = () => startPaket(i);
    grid.appendChild(card);
  });
}

// ──────────────────────────────────────────
// START PAKET
// ──────────────────────────────────────────
function startPaket(i) {
  initState(i);
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  document.getElementById('paket-title').textContent = data.pakets[i].name;
  renderSection();
}

function goHome() {
  stopTimer();
  const display = document.getElementById('timer-display');
  if (display) display.style.display = 'none';
  document.getElementById('timer-warning').style.display = 'none';
  document.getElementById('home-screen').style.display = 'block';
  document.getElementById('quiz-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'none';
}

// ──────────────────────────────────────────
// SECTION / QUESTION RENDER
// ──────────────────────────────────────────
function switchSection(idx) {
  stopTimer(); // stop timer section lama
  state.sectionIdx = idx;
  state.qIdx = 0;
  renderSection(); // akan start timer baru untuk section ini
}

function renderSection() {
  const p = data.pakets[state.paketIdx];
  const secs = p.sections;

  // Update tabs
  secs.forEach((s, i) => {
    const tb = document.getElementById(`tab${i}`);
    tb.className = 'tab-btn' + (i === state.sectionIdx ? ' active' : '');
    const answered = state.answers[i].filter(a => a !== null).length;
    tb.innerHTML = `${s.name} <span class="count">${answered}/${s.questions.length}</span>`;
  });

  document.getElementById('section-label').textContent = `Seksi: ${secs[state.sectionIdx].name}`;

  // ✅ FIX: startTimer sudah aman — tidak akan restart jika section sama & masih berjalan
  startTimer(state.sectionIdx);

  renderQuestion();
}

function renderQuestion() {
  const p = data.pakets[state.paketIdx];
  const sec = p.sections[state.sectionIdx];
  const q = sec.questions[state.qIdx];
  const total = sec.questions.length;
  const answered = state.answers[state.sectionIdx].filter(a => a !== null).length;

  // Progress
  document.getElementById('progress-bar').style.width = `${(answered / total) * 100}%`;

  // Q Map
  const map = document.getElementById('q-map');
  map.innerHTML = '';
  sec.questions.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'qm-dot' +
      (i === state.qIdx ? ' current' : (state.answers[state.sectionIdx][i] !== null ? ' answered' : ''));
    dot.textContent = i + 1;
    dot.onclick = () => { state.qIdx = i; renderQuestion(); };
    map.appendChild(dot);
  });

  // Counter
  document.getElementById('q-counter').textContent = `${state.qIdx + 1} / ${total}`;

  // Question area
  const area = document.getElementById('question-area');
  const isRevealed = state.revealed[state.sectionIdx][state.qIdx];
  const userAns = state.answers[state.sectionIdx][state.qIdx];

  let passageHtml = '';
  if (q.passage) {
    passageHtml = `<div class="reading-passage">${q.passage}</div>`;
  }

  const opts = q.opts.map((opt, i) => {
    let cls = 'option-btn';
    if (isRevealed) {
      if (i === q.ans) cls += ' correct';
      else if (i === userAns && userAns !== q.ans) cls += ' wrong';
    } else if (i === userAns) {
      cls += ' selected';
    }
    return `<button class="${cls}" onclick="selectAnswer(${i})" ${isRevealed ? 'disabled' : ''}>
      <span class="opt-label">${'ABCD'[i]}</span>
      <span>${opt}</span>
    </button>`;
  }).join('');

  const expHtml = isRevealed ? `<div class="explanation show">
    <strong>📝 Pembahasan:</strong> ${q.exp}
  </div>` : '';

  const revealBtn = !isRevealed && userAns !== null
    ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px;border-color:var(--accent2);color:var(--accent2)" onclick="revealAnswer()">Lihat Pembahasan</button>`
    : '';

  area.innerHTML = `
    <div class="question-header">
      <div class="q-num">SOAL ${state.qIdx + 1}</div>
      <div class="q-type-badge">${q.type}</div>
    </div>
    <div class="question-card">
      ${passageHtml}
      <div class="question-text">${q.text}</div>
      <div class="options">${opts}</div>
      ${expHtml}
    </div>
    ${revealBtn}
  `;

  // Nav buttons
  document.getElementById('btn-prev').disabled = state.qIdx === 0;
  document.getElementById('btn-next').textContent = state.qIdx === total - 1 ? 'Seksi Berikutnya →' : 'Selanjutnya →';
}

// ✅ FIX: selectAnswer hanya update jawaban + re-render tampilan,
//         TIDAK memanggil renderSection() yang akan restart timer
function selectAnswer(i) {
  if (state.revealed[state.sectionIdx][state.qIdx]) return;
  state.answers[state.sectionIdx][state.qIdx] = i;

  // Update tab count tanpa restart timer
  const p = data.pakets[state.paketIdx];
  p.sections.forEach((s, si) => {
    const tb = document.getElementById(`tab${si}`);
    if (!tb) return;
    const answered = state.answers[si].filter(a => a !== null).length;
    tb.innerHTML = `${s.name} <span class="count">${answered}/${s.questions.length}</span>`;
  });

  renderQuestion(); // hanya re-render soal, timer tidak tersentuh
}

function revealAnswer() {
  state.revealed[state.sectionIdx][state.qIdx] = true;
  renderQuestion();
}

function prevQ() {
  if (state.qIdx > 0) { state.qIdx--; renderQuestion(); }
}

function nextQ() {
  const sec = data.pakets[state.paketIdx].sections[state.sectionIdx];
  if (state.qIdx < sec.questions.length - 1) {
    state.qIdx++;
    renderQuestion();
  } else {
    if (state.sectionIdx < data.pakets[state.paketIdx].sections.length - 1) {
      switchSection(state.sectionIdx + 1);
    }
  }
}

// ──────────────────────────────────────────
// FINISH & RESULTS
// ──────────────────────────────────────────
function finishQuiz() {
  const p = data.pakets[state.paketIdx];
  let totalCorrect = 0;
  let totalQ = 0;
  const breakdown = p.sections.map((sec, si) => {
    let correct = 0;
    sec.questions.forEach((q, qi) => {
      if (state.answers[si][qi] === q.ans) correct++;
    });
    totalCorrect += correct;
    totalQ += sec.questions.length;
    return { name: sec.name, correct, total: sec.questions.length };
  });

  stopTimer();
  const display = document.getElementById('timer-display');
  if (display) display.style.display = 'none';
  document.getElementById('timer-warning').style.display = 'none';

  document.getElementById('quiz-screen').style.display = 'none';
  const rs = document.getElementById('result-screen');
  rs.style.display = 'block';

  const pct = Math.round((totalCorrect / totalQ) * 100);
  document.getElementById('final-score').textContent = totalCorrect;

  let verdict, sub;
  if (pct >= 80) { verdict = '🎉 Excellent!'; sub = 'Hasil sangat bagus! Kamu siap menghadapi TBS LPDP.'; }
  else if (pct >= 60) { verdict = '👍 Bagus!'; sub = 'Hasil cukup baik. Tingkatkan lagi untuk hasil maksimal.'; }
  else { verdict = '💪 Terus Berlatih!'; sub = 'Jangan menyerah! Review pembahasan dan latih lagi.'; }

  document.getElementById('result-title').textContent = verdict;
  document.getElementById('result-sub').textContent = sub;

  const bd = document.getElementById('result-breakdown');
  const colors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];
  bd.innerHTML = breakdown.map((b, i) => `
    <div class="breakdown-item">
      <div class="score-num" style="color:${colors[i]}">${b.correct}/${b.total}</div>
      <div class="score-lbl">${b.name}</div>
      <div style="margin-top:8px;height:4px;background:var(--border);border-radius:2px">
        <div style="height:100%;width:${(b.correct/b.total)*100}%;background:${colors[i]};border-radius:2px"></div>
      </div>
    </div>
  `).join('');

  document.getElementById('review-container').innerHTML = '';
}

function showReview() {
  const p = data.pakets[state.paketIdx];
  const rc = document.getElementById('review-container');
  rc.innerHTML = `<div style="text-align:left">
    <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:20px;margin-bottom:16px">📋 Pembahasan Lengkap</div>
    ${p.sections.map((sec, si) => `
      <div style="margin-bottom:24px">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--accent2);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">${sec.name}</div>
        ${sec.questions.map((q, qi) => {
          const userAns = state.answers[si][qi];
          const isCorrect = userAns === q.ans;
          const isAnswered = userAns !== null;
          return `
            <div class="review-item ${isCorrect ? 'correct-item' : isAnswered ? 'wrong-item' : ''}">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">SOAL ${qi+1}</span>
                <span style="font-family:'DM Mono',monospace;font-size:10px;padding:2px 6px;border-radius:10px;background:${isCorrect?'rgba(52,211,153,0.15)':isAnswered?'rgba(255,92,114,0.15)':'rgba(136,146,176,0.15)'};color:${isCorrect?'var(--green)':isAnswered?'var(--red)':'var(--muted)'}">${isCorrect?'✓ BENAR':isAnswered?'✗ SALAH':'– TIDAK DIJAWAB'}</span>
              </div>
              <div class="review-q">${q.text}</div>
              <div class="review-ans" style="color:var(--green)"><strong>Jawaban benar:</strong> ${'ABCD'[q.ans]}. ${q.opts[q.ans]}</div>
              ${!isCorrect && isAnswered ? `<div class="review-ans" style="color:var(--red)"><strong>Jawaban kamu:</strong> ${'ABCD'[userAns]}. ${q.opts[userAns]}</div>` : ''}
              <div style="margin-top:8px;font-size:14px;color:var(--accent2);background:rgba(0,229,192,0.06);border:1px solid rgba(0,229,192,0.15);border-radius:8px;padding:10px 14px">
                💡 ${q.exp}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('')}
  </div>`;
}

// ──────────────────────────────────────────
// INIT DENGAN FETCH API
// ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    data = await response.json();
    buildHome();
  } catch (error) {
    console.error("Gagal memuat data:", error);
    const grid = document.getElementById('paket-grid');
    if (grid) {
      grid.innerHTML = '<p style="color: var(--red);">Gagal memuat bank soal. Pastikan file data.json tersedia dan kamu menjalankannya via Local Server.</p>';
    }
  }
});