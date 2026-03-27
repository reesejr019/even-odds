// ── Game State ────────────────────────────────────────────────
const STARTING_BALANCE = 100;
const TOTAL_ROUNDS = 5;

let state = {
  balance: STARTING_BALANCE,
  round: 1,
  currentBet: 0,
  history: [],   // { round, die1, die2, total, bet, won, balanceAfter }
  doubleOrNothing: false,
};

// ── DOM References ────────────────────────────────────────────
const screens = {
  start:   document.getElementById('screen-start'),
  game:    document.getElementById('screen-game'),
  summary: document.getElementById('screen-summary'),
};

const el = {
  balance:      document.getElementById('balance'),
  roundDisplay: document.getElementById('round-display'),
  die1:         document.getElementById('die1'),
  die2:         document.getElementById('die2'),
  rollResult:   document.getElementById('roll-result'),
  bettingArea:  document.getElementById('betting-area'),
  betDisplay:   document.getElementById('bet-display'),
  betInput:     document.getElementById('bet-input'),
  btnRoll:      document.getElementById('btn-roll'),
  btnNext:      document.getElementById('btn-next'),
  doubleOption: document.getElementById('double-option'),
  doubleToggle: document.getElementById('double-toggle'),
  chips:        document.querySelectorAll('.chip'),

  // Summary
  summaryTitle:  document.getElementById('summary-title'),
  summaryVerdict:document.getElementById('summary-verdict'),
  finalBalance:  document.getElementById('final-balance'),
  netResult:     document.getElementById('net-result'),
  roundHistory:  document.getElementById('round-history'),
};

// ── Screen Management ─────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── HUD Update ────────────────────────────────────────────────
function updateHUD() {
  el.balance.textContent = state.balance;
  el.roundDisplay.textContent = `${state.round} / ${TOTAL_ROUNDS}`;
}

// ── Bet Selection ─────────────────────────────────────────────
function setBet(amount) {
  const max = state.balance;
  let bet = (amount === 'all') ? max : Math.min(parseInt(amount, 10), max);
  if (isNaN(bet) || bet < 1) return;

  state.currentBet = bet;
  el.betDisplay.textContent = bet;
  el.btnRoll.disabled = false;

  // Update chip selection highlight
  el.chips.forEach(chip => {
    const val = chip.dataset.amount;
    chip.classList.toggle('selected',
      val === 'all' ? amount === 'all' : parseInt(val, 10) === bet
    );
  });

  // Sync custom input
  el.betInput.value = bet;
}

function clearBet() {
  state.currentBet = 0;
  el.betDisplay.textContent = '—';
  el.btnRoll.disabled = true;
  el.chips.forEach(c => c.classList.remove('selected'));
  el.betInput.value = '';
}

// ── Dice Roll ─────────────────────────────────────────────────
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function animateRoll(callback) {
  const duration = 500;
  const interval = 60;
  let elapsed = 0;

  [el.die1, el.die2].forEach(d => d.classList.add('rolling'));

  const timer = setInterval(() => {
    el.die1.textContent = rollDie();
    el.die2.textContent = rollDie();
    elapsed += interval;
    if (elapsed >= duration) {
      clearInterval(timer);
      [el.die1, el.die2].forEach(d => d.classList.remove('rolling'));
      callback();
    }
  }, interval);
}

// ── Core Round Logic ──────────────────────────────────────────
function resolveRound(d1, d2) {
  const total = d1 + d2;
  const isEven = total % 2 === 0;

  let bet = state.currentBet;
  if (state.doubleOrNothing) bet *= 2;

  // Cap effective bet at current balance so displayed amounts are accurate
  const effectiveBet = Math.min(bet, state.balance);
  const change = isEven ? effectiveBet : -effectiveBet;
  state.balance = Math.max(0, state.balance + change);
  bet = effectiveBet;

  state.history.push({
    round: state.round,
    die1: d1,
    die2: d2,
    total,
    bet,
    won: isEven,
    balanceAfter: state.balance,
    doubled: state.doubleOrNothing,
  });

  return { total, isEven, change };
}

// ── Roll Button Handler ───────────────────────────────────────
function handleRoll() {
  // Lock UI during animation
  el.bettingArea.classList.add('hidden');
  el.btnRoll.disabled = true;
  el.rollResult.textContent = '';
  el.rollResult.className = 'roll-result';

  animateRoll(() => {
    const d1 = rollDie();
    const d2 = rollDie();
    el.die1.textContent = d1;
    el.die2.textContent = d2;

    const { total, isEven, change } = resolveRound(d1, d2);

    // Show result
    el.rollResult.textContent = isEven
      ? `Total: ${total} — EVEN! +${Math.abs(change)} credits`
      : `Total: ${total} — ODD! −${Math.abs(change)} credits`;
    el.rollResult.className = `roll-result ${isEven ? 'win' : 'lose'}`;

    updateHUD();

    // Decide what comes next
    const isLastRound = state.round >= TOTAL_ROUNDS;
    const broke = state.balance === 0;

    if (isLastRound || broke) {
      el.btnNext.textContent = 'See Summary';
      el.btnNext.classList.remove('hidden');
    } else {
      el.btnNext.textContent = 'Next Round';
      el.btnNext.classList.remove('hidden');
    }
  });
}

// ── Next Round / Summary Handler ──────────────────────────────
function handleNext() {
  el.btnNext.classList.add('hidden');
  el.rollResult.textContent = '';
  el.rollResult.className = 'roll-result';
  el.die1.textContent = '?';
  el.die2.textContent = '?';

  const isLastRound = state.round >= TOTAL_ROUNDS;
  const broke = state.balance === 0;

  if (isLastRound || broke) {
    showSummary();
    return;
  }

  state.round++;
  clearBet();
  state.doubleOrNothing = false;
  el.doubleToggle.checked = false;
  updateHUD();

  // Show double-or-nothing toggle on final round
  if (state.round === TOTAL_ROUNDS) {
    el.doubleOption.classList.remove('hidden');
  } else {
    el.doubleOption.classList.add('hidden');
  }

  el.bettingArea.classList.remove('hidden');
}

// ── Summary Screen ────────────────────────────────────────────
function showSummary() {
  const net = state.balance - STARTING_BALANCE;
  const won = net > 0;
  const broke = state.balance === 0;

  el.summaryTitle.textContent = broke ? 'Busted' : won ? 'You Profited' : 'You Lost';
  el.summaryVerdict.textContent = broke
    ? 'You ran out of credits. It happens faster than you think.'
    : won
    ? `You came out ahead. Lucky — or disciplined?`
    : `You finished in the red. Would you try again?`;

  el.finalBalance.textContent = `${state.balance} credits`;
  el.finalBalance.className = `stat-value ${state.balance >= STARTING_BALANCE ? 'positive' : 'negative'}`;

  el.netResult.textContent = `${net >= 0 ? '+' : ''}${net} credits`;
  el.netResult.className = `stat-value ${net >= 0 ? 'positive' : 'negative'}`;

  // Round history
  el.roundHistory.innerHTML = '<h3>Round History</h3>';
  state.history.forEach(h => {
    const row = document.createElement('div');
    row.className = `history-row ${h.won ? 'win-row' : 'lose-row'}`;
    const doubleTag = h.doubled ? ' (doubled)' : '';
    row.innerHTML = `
      <span>Round ${h.round} — Rolled ${h.die1}+${h.die2}=${h.total}${doubleTag}</span>
      <span>${h.won ? `+${h.bet}` : `−${h.bet}`} → ${h.balanceAfter}</span>
    `;
    el.roundHistory.appendChild(row);
  });

  showScreen('summary');
}

// ── Reset / Restart ───────────────────────────────────────────
function resetGame() {
  state = {
    balance: STARTING_BALANCE,
    round: 1,
    currentBet: 0,
    history: [],
    doubleOrNothing: false,
  };

  clearBet();
  el.die1.textContent = '?';
  el.die2.textContent = '?';
  el.rollResult.textContent = '';
  el.rollResult.className = 'roll-result';
  el.btnNext.classList.add('hidden');
  el.doubleOption.classList.add('hidden');
  el.doubleToggle.checked = false;
  el.bettingArea.classList.remove('hidden');

  updateHUD();
  showScreen('game');
}

// ── Event Listeners ───────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => {
  resetGame();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  resetGame();
});

el.btnRoll.addEventListener('click', handleRoll);
el.btnNext.addEventListener('click', handleNext);

// Chip buttons
el.chips.forEach(chip => {
  chip.addEventListener('click', () => setBet(chip.dataset.amount));
});

// Custom input
el.betInput.addEventListener('input', () => {
  const val = parseInt(el.betInput.value, 10);
  if (!isNaN(val) && val >= 1) {
    setBet(val);
  } else if (el.betInput.value === '') {
    clearBet();
  }
});

// Double-or-nothing toggle
el.doubleToggle.addEventListener('change', () => {
  state.doubleOrNothing = el.doubleToggle.checked;
});
