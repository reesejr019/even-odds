// ── Constants ─────────────────────────────────────────────────
const BJ_STARTING = 100;
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = new Set(['♥', '♦']);

// ── State ─────────────────────────────────────────────────────
let bj = {};

// ── DOM References ────────────────────────────────────────────
const bjEl = {
  balance:      document.getElementById('bj-balance'),
  handsPlayed:  document.getElementById('bj-hands-played'),
  dealerLabel:  document.getElementById('bj-dealer-label'),
  playerLabel:  document.getElementById('bj-player-label'),
  dealerCards:  document.getElementById('bj-dealer-cards'),
  playerCards:  document.getElementById('bj-player-cards'),
  result:       document.getElementById('bj-result'),

  bettingPanel: document.getElementById('bj-betting-panel'),
  actionPanel:  document.getElementById('bj-action-panel'),
  afterPanel:   document.getElementById('bj-after-panel'),

  chips:        document.querySelectorAll('.bj-chip'),
  betInput:     document.getElementById('bj-bet-input'),
  betDisplay:   document.getElementById('bj-bet-display'),
  btnDeal:      document.getElementById('bj-btn-deal'),

  btnHit:       document.getElementById('bj-btn-hit'),
  btnStand:     document.getElementById('bj-btn-stand'),
  btnDouble:    document.getElementById('bj-btn-double'),

  btnNextHand:  document.getElementById('bj-btn-next-hand'),

  // Summary
  summaryTitle:   document.getElementById('bj-summary-title'),
  summaryVerdict: document.getElementById('bj-summary-verdict'),
  finalBalance:   document.getElementById('bj-final-balance'),
  netResult:      document.getElementById('bj-net-result'),
  summaryHands:   document.getElementById('bj-summary-hands'),
  handHistory:    document.getElementById('bj-hand-history'),
};

// ── Deck Utilities ────────────────────────────────────────────
function buildDeck(numDecks = 6) {
  const deck = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealCard() {
  if (bj.deck.length < 15) bj.deck = shuffle(buildDeck(6));
  return bj.deck.pop();
}

// ── Hand Math ─────────────────────────────────────────────────
function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handTotal(hand) === 21;
}

// ── Rendering ─────────────────────────────────────────────────
function makeCardEl(card, faceDown = false) {
  const div = document.createElement('div');
  if (faceDown) {
    div.className = 'playing-card face-down';
  } else {
    div.className = `playing-card${RED_SUITS.has(card.suit) ? ' red' : ''}`;
    div.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span>`;
  }
  return div;
}

function renderHands(dealerHidden) {
  // ── Dealer ─────────────────────────────────────────────────
  // Only touch cards that changed so existing ones don't re-animate.
  const existingDealerEls = Array.from(bjEl.dealerCards.children);
  bj.dealer.forEach((card, i) => {
    const existing = existingDealerEls[i];
    if (!existing) {
      // New card — append with deal animation
      bjEl.dealerCards.appendChild(makeCardEl(card, dealerHidden && i === 0));
    } else if (!dealerHidden && existing.classList.contains('face-down')) {
      // Hole card being revealed — swap face-down for face-up (animates once)
      bjEl.dealerCards.replaceChild(makeCardEl(card, false), existing);
    }
    // Already rendered and no state change — leave it alone
  });

  bjEl.dealerLabel.textContent = dealerHidden
    ? 'Dealer — ?'
    : `Dealer — ${handTotal(bj.dealer)}`;

  // ── Player ─────────────────────────────────────────────────
  // Only append cards that aren't in the DOM yet
  const renderedPlayerCount = bjEl.playerCards.children.length;
  bj.player.forEach((card, i) => {
    if (i >= renderedPlayerCount) {
      bjEl.playerCards.appendChild(makeCardEl(card));
    }
  });

  bjEl.playerLabel.textContent = `You — ${handTotal(bj.player)}`;
}

function updateBjHUD() {
  bjEl.balance.textContent = bj.balance;
  bjEl.handsPlayed.textContent = bj.handsPlayed;
}

// ── Panel Management ──────────────────────────────────────────
function showPanel(which) {
  bjEl.bettingPanel.classList.toggle('hidden', which !== 'betting');
  bjEl.actionPanel.classList.toggle('hidden', which !== 'action');
  bjEl.afterPanel.classList.toggle('hidden', which !== 'after');
}

// ── Bet Handling ──────────────────────────────────────────────
function bjSetBet(amount) {
  const max = bj.balance;
  const bet = (amount === 'all') ? max : Math.min(parseInt(amount, 10), max);
  if (isNaN(bet) || bet < 1) return;

  bj.bet = bet;
  bjEl.betDisplay.textContent = bet;
  bjEl.btnDeal.disabled = false;

  bjEl.chips.forEach(chip => {
    const val = chip.dataset.amount;
    chip.classList.toggle('selected',
      val === 'all' ? amount === 'all' : parseInt(val, 10) === bet
    );
  });

  bjEl.betInput.value = bet;
}

function bjClearBet() {
  bj.bet = 0;
  bjEl.betDisplay.textContent = '—';
  bjEl.btnDeal.disabled = true;
  bjEl.chips.forEach(c => c.classList.remove('selected'));
  bjEl.betInput.value = '';
}

// ── Deal ──────────────────────────────────────────────────────
function bjDeal() {
  bj.originalBet = bj.bet;
  bj.balanceBefore = bj.balance;
  bj.balance -= bj.bet;
  bj.doubled = false;
  bj.handsPlayed++;

  bj.player = [dealCard(), dealCard()];
  bj.dealer = [dealCard(), dealCard()];

  updateBjHUD();
  renderHands(true);

  bjEl.result.textContent = '';
  bjEl.result.className = 'bj-result';

  // Check immediate blackjack on either side — skip player turn entirely
  if (isBlackjack(bj.player) || isBlackjack(bj.dealer)) {
    endHand();
    return;
  }

  // Re-enable Hit/Stand for this hand, then conditionally disable Double
  setActionButtons(true);
  bjEl.btnDouble.disabled = bj.balance < bj.originalBet;
  showPanel('action');
}

// ── Player Actions ────────────────────────────────────────────
function bjHit() {
  setActionButtons(false);
  bj.player.push(dealCard());
  renderHands(true);

  if (handTotal(bj.player) >= 21) {
    endHand();
  } else {
    setActionButtons(true);
    bjEl.btnDouble.disabled = true; // can only double on first two cards
  }
}

function bjStand() {
  setActionButtons(false);
  endHand();
}

function bjDouble() {
  bj.balance -= bj.originalBet;
  bj.bet = bj.originalBet * 2;
  bj.doubled = true;
  updateBjHUD();
  setActionButtons(false);

  bj.player.push(dealCard());
  renderHands(true);
  endHand();
}

function setActionButtons(enabled) {
  bjEl.btnHit.disabled    = !enabled;
  bjEl.btnStand.disabled  = !enabled;
  bjEl.btnDouble.disabled = !enabled;
}

// ── Dealer Draw ───────────────────────────────────────────────
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function dealerDraw() {
  while (handTotal(bj.dealer) < 17) {
    await delay(650);
    bj.dealer.push(dealCard());
    renderHands(false);
  }
}

// ── End of Hand ───────────────────────────────────────────────
async function endHand() {
  const playerTotal = handTotal(bj.player);
  const playerBJ    = isBlackjack(bj.player);
  const dealerBJ    = isBlackjack(bj.dealer);

  // Reveal dealer's hole card
  renderHands(false);

  // Dealer draws only if player is still alive and didn't get blackjack
  if (playerTotal <= 21 && !playerBJ) {
    await dealerDraw();
  }

  const dealerTotal = handTotal(bj.dealer);

  // Determine outcome & payout
  // Note: bj.balance was already reduced by bj.bet (total wagered incl. double).
  let payout = 0;
  let outcomeText = '';
  let outcomeClass = '';

  if (playerBJ && dealerBJ) {
    outcomeText  = 'Both Blackjack — Push.';
    outcomeClass = 'push';
    payout = bj.bet;
  } else if (playerBJ) {
    const bonus  = Math.floor(bj.bet * 1.5);
    outcomeText  = `Blackjack! +${bonus} credits`;
    outcomeClass = 'win';
    payout = bj.bet + bonus;
  } else if (playerTotal > 21) {
    outcomeText  = `Bust! −${bj.bet} credits`;
    outcomeClass = 'lose';
    payout = 0;
  } else if (dealerTotal > 21) {
    outcomeText  = `Dealer busts! +${bj.bet} credits`;
    outcomeClass = 'win';
    payout = bj.bet * 2;
  } else if (playerTotal > dealerTotal) {
    outcomeText  = `You win! +${bj.bet} credits`;
    outcomeClass = 'win';
    payout = bj.bet * 2;
  } else if (playerTotal < dealerTotal) {
    outcomeText  = `Dealer wins. −${bj.bet} credits`;
    outcomeClass = 'lose';
    payout = 0;
  } else {
    outcomeText  = 'Push — bet returned.';
    outcomeClass = 'push';
    payout = bj.bet;
  }

  bj.balance += payout;
  updateBjHUD();

  bj.history.push({
    hand:         bj.handsPlayed,
    bet:          bj.bet,
    playerTotal,
    dealerTotal,
    outcomeText,
    outcomeClass,
    balanceAfter: bj.balance,
  });

  bjEl.result.textContent = outcomeText;
  bjEl.result.className   = `bj-result ${outcomeClass}`;

  // If broke, go straight to summary after a short pause so the result is visible
  if (bj.balance === 0) {
    await delay(1400);
    showBjSummary();
    return;
  }

  showPanel('after');
}

// ── Summary Screen ────────────────────────────────────────────
function showBjSummary() {
  const net   = bj.balance - BJ_STARTING;
  const broke = bj.balance === 0;
  const won   = net > 0;

  bjEl.summaryTitle.textContent = broke ? 'Busted' : won ? 'You Profited' : 'You Lost';
  bjEl.summaryVerdict.textContent = broke
    ? 'You ran out of credits. It happens faster than you think.'
    : won
    ? 'You came out ahead. Lucky — or disciplined?'
    : 'You finished in the red. Would you try again?';

  bjEl.finalBalance.textContent = `${bj.balance} credits`;
  bjEl.finalBalance.className   = `stat-value ${bj.balance >= BJ_STARTING ? 'positive' : 'negative'}`;

  bjEl.netResult.textContent = `${net >= 0 ? '+' : ''}${net} credits`;
  bjEl.netResult.className   = `stat-value ${net >= 0 ? 'positive' : 'negative'}`;

  bjEl.summaryHands.textContent = bj.handsPlayed;

  bjEl.handHistory.innerHTML = '<h3>Hand History</h3>';
  bj.history.forEach(h => {
    const row = document.createElement('div');
    row.className = `history-row ${h.outcomeClass === 'win' ? 'win-row' : h.outcomeClass === 'lose' ? 'lose-row' : 'push-row'}`;
    row.innerHTML = `<span>Hand ${h.hand} — ${h.outcomeText}</span><span>→ ${h.balanceAfter}</span>`;
    bjEl.handHistory.appendChild(row);
  });

  showScreen('screen-bj-summary');
}

// ── Init / Reset ──────────────────────────────────────────────
function bjInit() {
  bj = {
    balance: BJ_STARTING,
    bet: 0,
    originalBet: 0,
    balanceBefore: 0,
    doubled: false,
    deck: shuffle(buildDeck(6)),
    player: [],
    dealer: [],
    handsPlayed: 0,
    history: [],
  };

  bjEl.dealerCards.innerHTML = '';
  bjEl.playerCards.innerHTML = '';
  bjEl.dealerLabel.textContent = 'Dealer';
  bjEl.playerLabel.textContent = 'You';
  bjEl.result.textContent = '';
  bjEl.result.className = 'bj-result';

  bjClearBet();
  updateBjHUD();
  showPanel('betting');
  showScreen('screen-bj');
}

function bjNextHand() {
  // Reset bet if it exceeds current balance
  if (bj.bet > bj.balance) bjClearBet();

  bjEl.dealerCards.innerHTML = '';
  bjEl.playerCards.innerHTML = '';
  bjEl.dealerLabel.textContent = 'Dealer';
  bjEl.playerLabel.textContent = 'You';
  bjEl.result.textContent = '';
  bjEl.result.className = 'bj-result';

  showPanel('betting');
}

// ── Event Listeners ───────────────────────────────────────────
document.getElementById('menu-btn-bj').addEventListener('click', bjInit);

bjEl.chips.forEach(chip => {
  chip.addEventListener('click', () => bjSetBet(chip.dataset.amount));
});

bjEl.betInput.addEventListener('input', () => {
  const val = parseInt(bjEl.betInput.value, 10);
  if (!isNaN(val) && val >= 1) {
    bjSetBet(val);
  } else if (bjEl.betInput.value === '') {
    bjClearBet();
  }
});

bjEl.btnDeal.addEventListener('click', bjDeal);
bjEl.btnHit.addEventListener('click', bjHit);
bjEl.btnStand.addEventListener('click', bjStand);
bjEl.btnDouble.addEventListener('click', bjDouble);

bjEl.btnNextHand.addEventListener('click', bjNextHand);

document.getElementById('bj-btn-menu-bet').addEventListener('click', () => showScreen('screen-menu'));
document.getElementById('bj-btn-menu-after').addEventListener('click', showBjSummary);
document.getElementById('bj-btn-play-again').addEventListener('click', bjInit);
document.getElementById('bj-btn-summary-menu').addEventListener('click', () => showScreen('screen-menu'));
