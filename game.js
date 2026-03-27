// ── Shared Navigation ─────────────────────────────────────────
// Used by both game.js and blackjack.js
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Game State ────────────────────────────────────────────────
const STARTING_BALANCE = 100;
const TOTAL_ROUNDS = 5;

let state = {
  balance: STARTING_BALANCE,
  round: 1,
  currentBet: 0,
  history: [],
  doubleOrNothing: false,
};

// ── DOM References ────────────────────────────────────────────
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
  chips:        document.querySelectorAll('#screen-game .chip, #screen-start .chip'),

  // Summary
  summaryTitle:  document.getElementById('summary-title'),
  summaryVerdict:document.getElementById('summary-verdict'),
  finalBalance:  document.getElementById('final-balance'),
  netResult:     document.getElementById('net-result'),
  roundHistory:  document.getElementById('round-history'),
};

// Chips scoped to the dice betting area only
const diceChips = document.querySelectorAll('#betting-area .chip');

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

  diceChips.forEach(chip => {
    const val = chip.dataset.amount;
    chip.classList.toggle('selected',
      val === 'all' ? amount === 'all' : parseInt(val, 10) === bet
    );
  });

  el.betInput.value = bet;
}

function clearBet() {
  state.currentBet = 0;
  el.betDisplay.textContent = '—';
  el.btnRoll.disabled = true;
  diceChips.forEach(c => c.classList.remove('selected'));
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

    el.rollResult.textContent = isEven
      ? `Total: ${total} — EVEN! +${Math.abs(change)} credits`
      : `Total: ${total} — ODD! −${Math.abs(change)} credits`;
    el.rollResult.className = `roll-result ${isEven ? 'win' : 'lose'}`;

    updateHUD();

    const isLastRound = state.round >= TOTAL_ROUNDS;
    const broke = state.balance === 0;

    el.btnNext.textContent = (isLastRound || broke) ? 'See Summary' : 'Next Round';
    el.btnNext.classList.remove('hidden');
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

  el.doubleOption.classList.toggle('hidden', state.round !== TOTAL_ROUNDS);
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
    ? 'You came out ahead. Lucky — or disciplined?'
    : 'You finished in the red. Would you try again?';

  el.finalBalance.textContent = `${state.balance} credits`;
  el.finalBalance.className = `stat-value ${state.balance >= STARTING_BALANCE ? 'positive' : 'negative'}`;

  el.netResult.textContent = `${net >= 0 ? '+' : ''}${net} credits`;
  el.netResult.className = `stat-value ${net >= 0 ? 'positive' : 'negative'}`;

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

  showScreen('screen-summary');
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
  showScreen('screen-game');
}

// ── Event Listeners ───────────────────────────────────────────
document.getElementById('menu-btn-dice').addEventListener('click', () => {
  showScreen('screen-start');
});

document.getElementById('btn-start').addEventListener('click', () => {
  resetGame();
});

document.getElementById('dice-back-to-menu').addEventListener('click', () => {
  showScreen('screen-menu');
});

document.getElementById('btn-restart').addEventListener('click', () => {
  resetGame();
});

document.getElementById('dice-summary-back-to-menu').addEventListener('click', () => {
  showScreen('screen-menu');
});

el.btnRoll.addEventListener('click', handleRoll);
el.btnNext.addEventListener('click', handleNext);

diceChips.forEach(chip => {
  chip.addEventListener('click', () => setBet(chip.dataset.amount));
});

el.betInput.addEventListener('input', () => {
  const val = parseInt(el.betInput.value, 10);
  if (!isNaN(val) && val >= 1) {
    setBet(val);
  } else if (el.betInput.value === '') {
    clearBet();
  }
});

el.doubleToggle.addEventListener('change', () => {
  state.doubleOrNothing = el.doubleToggle.checked;
});
