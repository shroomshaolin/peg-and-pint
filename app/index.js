(() => {
  const ROOT_ID = "peg-pint-app-root";
  const STYLE_ID = "peg-pint-styles";
  const SETTINGS_KEY = "pegPint.settings.v1";

  const defaultSettings = {
    soundEnabled: true,
    voiceEnabled: false,
    banterEnabled: true,
    teachingMode: false,
    teachingVoice: false,
    volume: 0.45,
    leftPersona: "Elias",
    rightPersona: "Riley",
    leftVoice: "",
    rightVoice: "",
    hostVoice: "",
    playMode: "watch",
    userName: "Donna"
  };

  const state = {
    paused: false,
    gameOver: false,
    winnerSide: "",
    winnerName: "",
    winnerScore: 0,
    celebrationPlayed: false,
    audio: null,
    objectUrl: "",
    abortController: null,
    speaking: false,
    ttsVoices: [],
    ttsVoicesLoaded: false,
    ttsVoicesLoading: false,
    voiceProvider: "",
    personas: [],
    personasLoaded: false,
    personasLoading: false,
    lastAction: "Welcome to the table.",
    hostHasWelcomed: false,
    dealNumber: 0,
    lastDealLabel: "No shuffle yet",
    needsDealCut: true,
    dealCutLeftCard: null,
    dealCutRightCard: null,
    dealCutWinnerSide: "",
    dealCutWinnerName: "",
    dealCutTied: false,
    cribOwner: "",
    dealerSide: "",
    phase: "Waiting for first deal cut",
    lastCribNote: "First cut. Low card deals first.",
    pegTurn: "left",
    peggingCount: 0,
    leftPegPlayed: [],
    rightPegPlayed: [],
    leftPegSaidGo: false,
    rightPegSaidGo: false,
    lastPegSide: "",
    lastPegNote: "Pegging has not started.",
    leftCountHand: [],
    rightCountHand: [],
    handsScored: false,
    lastScoreNote: "Hands not scored yet.",
    userDiscardSelection: [],
    leftPersona: "Elias",
    rightPersona: "Riley",
    leftHand: [],
    rightHand: [],
    cutCard: "—",
    cribCards: ["?", "?", "?", "?"],
    scoreLeft: 0,
    scoreRight: 0,
    deck: [],
    playerHand: [],
    houseHand: [],
    crib: [],
    starter: null,
    dealer: "you",
    pegging: [],
    scoreYou: 0,
    scoreHouse: 0,
    lineIndex: 0
  };

  const tavernLines = [
    "Riley taps the pegboard. “Warm banter first. Math violence second.”",
    "Elias studies the cards. “I distrust any game that weaponizes the number fifteen.”",
    "Riley plays 9♥. “Fifteen for two. Try not to take it personally.”",
    "Elias lifts one eyebrow. “I never take math personally. Only betrayal.”",
    "The table goes quiet for the cut card. Even the pint glasses seem to listen."
  ];

  const PP_PLAYER_CHOICES = [
    "You",
    "Elias",
    "Riley",
    "Dawn",
    "Fox",
    "Einstein",
    "Claude",
    "Info Sage",
    "The Pub Shark"
  ];

  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const SUITS = ["♣", "♦", "♥", "♠"];

  function makeDeck() {
    const deck = [];
    SUITS.forEach((suit) => {
      RANKS.forEach((rank) => {
        deck.push({ rank, suit });
      });
    });
    return deck;
  }

  function shuffle(deck) {
    const cards = deck.slice();
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function cardLabel(card) {
    if (!card) return "";
    if (typeof card === "string") return card;
    return `${card.rank}${card.suit}`;
  }

  function rankOrder(rank) {
    return RANKS.indexOf(rank);
  }

  function sortCards(cards) {
    return cards.slice().sort((a, b) => {
      const ar = rankOrder(a.rank);
      const br = rankOrder(b.rank);
      if (ar !== br) return ar - br;
      return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    });
  }

  function dealNewRound() {
    const deck = shuffle(makeDeck());
    const playerHand = [];
    const houseHand = [];

    for (let i = 0; i < 6; i += 1) {
      playerHand.push(deck.pop());
      houseHand.push(deck.pop());
    }

    state.deck = deck;
    state.playerHand = sortCards(playerHand);
    state.houseHand = sortCards(houseHand);
    state.crib = [];
    state.starter = null;
    state.pegging = [];
  }

  function visiblePlayerHand() {
    if (state.playerHand && state.playerHand.length) {
      return state.playerHand.map(cardLabel);
    }
    return ["5♣", "6♦", "7♥", "J♠", "K♣", "2♦"];
  }

  const PP_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const PP_SUITS = ["♣", "♦", "♥", "♠"];

  function ppMakeDeck() {
    const deck = [];
    PP_SUITS.forEach((suit) => {
      PP_RANKS.forEach((rank) => {
        deck.push({ rank, suit });
      });
    });
    return deck;
  }

  function ppShuffle(deck) {
    const cards = deck.slice();
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function ppCardLabel(card) {
    if (!card) return "";
    if (typeof card === "string") return card;
    return `${card.rank}${card.suit}`;
  }

  function ppCardSpoken(card) {
    const label = ppCardLabel(card);
    if (!label || label === "—" || label === "?") return "unknown card";

    const suitSymbol = label.slice(-1);
    const rank = label.slice(0, -1);

    const rankNames = {
      A: "Ace",
      J: "Jack",
      Q: "Queen",
      K: "King"
    };

    const suitNames = {
      "♣": "clubs",
      "♦": "diamonds",
      "♥": "hearts",
      "♠": "spades"
    };

    const rankName = rankNames[rank] || rank;
    const suitName = suitNames[suitSymbol] || suitSymbol;

    return `${rankName} of ${suitName}`;
  }

  function ppCardsSpoken(cards) {
    const list = (cards || []).map(ppCardSpoken).filter(Boolean);

    if (!list.length) return "no cards";
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;

    return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  }


  function ppRankOrder(card) {
    if (!card || typeof card === "string") {
      const label = String(card || "");
      const rank = label.replace(/[♣♦♥♠]/g, "");
      return PP_RANKS.indexOf(rank);
    }
    return PP_RANKS.indexOf(card.rank);
  }

  function ppSuitOrder(card) {
    if (!card || typeof card === "string") {
      const label = String(card || "");
      const suit = label.slice(-1);
      return PP_SUITS.indexOf(suit);
    }
    return PP_SUITS.indexOf(card.suit);
  }

  function ppSortCards(cards) {
    return (cards || []).slice().sort((a, b) => {
      const ar = ppRankOrder(a);
      const br = ppRankOrder(b);
      if (ar !== br) return ar - br;
      return ppSuitOrder(a) - ppSuitOrder(b);
    });
  }

  function ppRankValue(card) {
    const rank = typeof card === "string"
      ? String(card).replace(/[♣♦♥♠]/g, "")
      : card && card.rank;

    if (rank === "A") return 1;
    if (["J", "Q", "K"].includes(rank)) return 10;
    return Number(rank || 0);
  }

  function ppChooseDiscards(hand) {
    /*
      First-pass cribbage brain:
      Keep 5s, avoid throwing obvious strong middle cards when possible,
      and discard the lowest-value/least-central pair.
      This is intentionally simple; smarter strategy comes later.
    */
    const cards = (hand || []).map((card, index) => ({ card, index }));

    const scored = cards.map((entry) => {
      const value = ppRankValue(entry.card);
      let penalty = value;

      if (value === 5) penalty += 100;       // keep 5s
      if (value >= 6 && value <= 8) penalty += 8; // often useful for runs/fifteens
      if (value === 10) penalty += 3;        // useful with 5s
      if (value === 1) penalty -= 1;         // easy low toss

      return { ...entry, penalty };
    });

    scored.sort((a, b) => {
      if (a.penalty !== b.penalty) return a.penalty - b.penalty;
      return a.index - b.index;
    });

    return scored.slice(0, 2).map((entry) => entry.index);
  }

  function ppIsJack(card) {
    const rank = typeof card === "string"
      ? String(card).replace(/[♣♦♥♠]/g, "")
      : card && card.rank;
    return rank === "J";
  }

  function ppCardSuit(card) {
    if (typeof card === "string") return String(card).slice(-1);
    return card && card.suit;
  }

  function ppFifteenCombos(cards) {
    const combos = [];
    const n = cards.length;

    for (let mask = 1; mask < (1 << n); mask += 1) {
      const combo = [];
      let sum = 0;

      for (let i = 0; i < n; i += 1) {
        if (mask & (1 << i)) {
          combo.push(cards[i]);
          sum += ppRankValue(cards[i]);
        }
      }

      if (sum === 15) combos.push(combo);
    }

    return combos;
  }

  function ppPairPoints(cards) {
    const counts = new Map();

    cards.forEach((card) => {
      const rank = ppCardRank(card);
      counts.set(rank, (counts.get(rank) || 0) + 1);
    });

    let points = 0;
    let groups = [];

    counts.forEach((count, rank) => {
      if (count >= 2) {
        const pairCount = (count * (count - 1)) / 2;
        const pairPoints = pairCount * 2;
        points += pairPoints;
        groups.push(`${rank}${count === 2 ? " pair" : " x" + count} for ${pairPoints}`);
      }
    });

    return { points, groups };
  }

  function ppRunPoints(cards) {
    const rankCounts = new Map();

    cards.forEach((card) => {
      const rank = ppCardRank(card);
      const idx = PP_RANKS.indexOf(rank);
      if (idx >= 0) rankCounts.set(idx, (rankCounts.get(idx) || 0) + 1);
    });

    let bestLen = 0;
    let bestMultiplier = 0;
    let bestStart = -1;

    for (let start = 0; start < PP_RANKS.length; start += 1) {
      if (!rankCounts.has(start)) continue;

      let len = 0;
      let multiplier = 1;

      while (rankCounts.has(start + len)) {
        multiplier *= rankCounts.get(start + len);
        len += 1;
      }

      if (len >= 3 && len > bestLen) {
        bestLen = len;
        bestMultiplier = multiplier;
        bestStart = start;
      }
    }

    if (bestLen < 3) {
      return { points: 0, label: "" };
    }

    const points = bestLen * bestMultiplier;
    const ranks = PP_RANKS.slice(bestStart, bestStart + bestLen).join("-");
    const label = bestMultiplier > 1
      ? `${bestMultiplier} runs of ${bestLen} (${ranks}) for ${points}`
      : `run of ${bestLen} (${ranks}) for ${points}`;

    return { points, label };
  }

  function ppFlushPoints(hand, starter, isCrib = false) {
    if (!hand || hand.length !== 4 || !starter) return { points: 0, label: "" };

    const suit = ppCardSuit(hand[0]);
    const handFlush = hand.every((card) => ppCardSuit(card) === suit);

    if (!handFlush) return { points: 0, label: "" };

    const starterMatches = ppCardSuit(starter) === suit;

    if (isCrib) {
      return starterMatches
        ? { points: 5, label: "crib flush for 5" }
        : { points: 0, label: "" };
    }

    return starterMatches
      ? { points: 5, label: "five-card flush for 5" }
      : { points: 4, label: "four-card flush for 4" };
  }

  function ppNobsPoints(hand, starter) {
    if (!hand || !starter) return { points: 0, label: "" };

    const starterSuit = ppCardSuit(starter);
    const hasNobs = hand.some((card) => ppCardRank(card) === "J" && ppCardSuit(card) === starterSuit);

    return hasNobs
      ? { points: 1, label: "right jack / nobs for 1" }
      : { points: 0, label: "" };
  }

  function ppScoreHand(hand, starter, isCrib = false) {
    const cards = [...(hand || []), starter].filter(Boolean);
    const fifteens = ppFifteenCombos(cards);
    const pairs = ppPairPoints(cards);
    const runs = ppRunPoints(cards);
    const flush = ppFlushPoints(hand || [], starter, isCrib);
    const nobs = ppNobsPoints(hand || [], starter);

    const parts = [];
    let total = 0;

    if (fifteens.length) {
      const points = fifteens.length * 2;
      total += points;
      parts.push(`${fifteens.length} fifteen${fifteens.length === 1 ? "" : "s"} for ${points}`);
    }

    if (pairs.points) {
      total += pairs.points;
      parts.push(pairs.groups.join(", "));
    }

    if (runs.points) {
      total += runs.points;
      parts.push(runs.label);
    }

    if (flush.points) {
      total += flush.points;
      parts.push(flush.label);
    }

    if (nobs.points) {
      total += nobs.points;
      parts.push(nobs.label);
    }

    return {
      total,
      parts,
      text: parts.length ? parts.join("; ") : "no points",
      cardsText: cards.map(ppCardLabel).join(" ")
    };
  }



  function ppScoreWord(value) {
    const n = Number(value || 0);
    const words = {
      0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
      6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
      11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
      15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
      19: "nineteen", 20: "twenty", 21: "twenty-one", 22: "twenty-two",
      23: "twenty-three", 24: "twenty-four", 25: "twenty-five",
      26: "twenty-six", 27: "twenty-seven", 28: "twenty-eight",
      29: "twenty-nine", 30: "thirty", 31: "thirty-one"
    };
    return words[n] || String(n);
  }

  function ppCap(text = "") {
    const raw = String(text || "");
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
  }

  function ppFifteenChant(count) {
    const n = Number(count || 0);
    if (!n) return "";

    const calls = [];
    for (let i = 1; i <= n; i += 1) {
      calls.push(`fifteen ${ppScoreWord(i * 2)}`);
    }

    if (calls.length === 1) {
      return `${ppCap(calls[0])}.`;
    }

    if (calls.length === 2) {
      return `${ppCap(calls[0])}, ${calls[1]}, and there ain't no more.`;
    }

    const last = calls.pop();
    return `${ppCap(calls.join(", "))}, ${last}.`;
  }

  function ppScorePartChant(part = "") {
    const raw = String(part || "").trim();
    if (!raw) return "";

    let m = raw.match(/^(\d+)\s+fifteens?\s+for\s+\d+/i);
    if (m) return ppFifteenChant(Number(m[1]));

    m = raw.match(/\bpair\s+for\s+(\d+)/i);
    if (m) return `Pair for ${ppScoreWord(m[1])}.`;

    m = raw.match(/\bx3\s+for\s+(\d+)/i);
    if (m) return `Pair royal for ${ppScoreWord(m[1])}.`;

    m = raw.match(/\bx4\s+for\s+(\d+)/i);
    if (m) return `Double pair royal for ${ppScoreWord(m[1])}.`;

    m = raw.match(/^(\d+)\s+runs?\s+of\s+(\d+).*?\s+for\s+(\d+)/i);
    if (m) return `${ppCap(ppScoreWord(m[1]))} runs of ${ppScoreWord(m[2])} for ${ppScoreWord(m[3])}.`;

    m = raw.match(/^run\s+of\s+(\d+).*?\s+for\s+(\d+)/i);
    if (m) return `Run of ${ppScoreWord(m[1])} for ${ppScoreWord(m[2])}.`;

    m = raw.match(/^crib\s+flush\s+for\s+(\d+)/i);
    if (m) return `Crib flush for ${ppScoreWord(m[1])}.`;

    m = raw.match(/^five-card\s+flush\s+for\s+(\d+)/i);
    if (m) return `Five-card flush for ${ppScoreWord(m[1])}.`;

    m = raw.match(/^four-card\s+flush\s+for\s+(\d+)/i);
    if (m) return `Four-card flush for ${ppScoreWord(m[1])}.`;

    m = raw.match(/right\s+jack\s*\/\s*nobs\s+for\s+(\d+)/i);
    if (m) return `Right jack / nobs for ${ppScoreWord(m[1])}.`;

    m = raw.match(/right\s+jack\s+for\s+(\d+)/i);
    if (m) return `Right jack / nobs for ${ppScoreWord(m[1])}.`;

    return `${ppCap(raw.replace(/\bfor\s+(\d+)\b/gi, (_, n) => "for " + ppScoreWord(n)))}.`;
  }

  function ppCribbageCountChant(score) {
    if (!score) return "No points.";

    const total = Number(score.total || 0);
    const rawParts = Array.isArray(score.parts)
      ? score.parts
      : String(score.text || "").split(";");

    if (!total || !rawParts.length) return "No points.";

    const lines = [];

    rawParts
      .flatMap((part) => String(part || "").split(/\s*,\s*/))
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const chant = ppScorePartChant(part);
        if (chant) lines.push(chant);
      });

    lines.push(`Total ${ppScoreWord(total)}.`);

    return lines.join(" ");
  }


  function ppResetGameOverState() {
    state.gameOver = false;
    state.winnerSide = "";
    state.winnerName = "";
    state.winnerScore = 0;
    state.celebrationPlayed = false;
  }

  function ppWinnerMessage() {
    if (!state.gameOver) return "";
    return `🎉 Game over. ${state.winnerName || "Winner"} wins with ${state.winnerScore || 121} points. Click New Match to play again.`;
  }

  function ppGameOverResult() {
    return {
      ok: false,
      gameOver: true,
      message: ppWinnerMessage() || "Game over. Click New Match to play again.",
      dealer: ppDealerName ? ppDealerName() : "",
      pone: ppPoneName ? ppPoneName() : ""
    };
  }

  function ppCheckGameWinner() {
    const left = Number(state.scoreLeft || 0);
    const right = Number(state.scoreRight || 0);

    if (state.gameOver) return state.winnerSide || "";

    if (left < 121 && right < 121) return "";

    let winnerSide = "";
    if (left >= 121 && right >= 121) {
      winnerSide = left >= right ? "left" : "right";
    } else {
      winnerSide = left >= 121 ? "left" : "right";
    }

    state.gameOver = true;
    state.winnerSide = winnerSide;
    state.winnerName = winnerSide === "right" ? state.rightPersona : state.leftPersona;
    state.winnerScore = winnerSide === "right" ? right : left;
    state.phase = "Game Over";
    state.lastAction = ppWinnerMessage();

    ppMaybeCelebrateWinner();

    return winnerSide;
  }


  function ppAddScore(side, points) {
    const pts = Number(points || 0);
    if (!pts) return side === "right" ? Number(state.scoreRight || 0) : Number(state.scoreLeft || 0);

    if (side === "right") {
      state.scoreRight = Number(state.scoreRight || 0) + pts;
    } else {
      state.scoreLeft = Number(state.scoreLeft || 0) + pts;
    }

    ppCheckGameWinner();

    return side === "right"
      ? Number(state.scoreRight || 0)
      : Number(state.scoreLeft || 0);
  }


  function ppScoringSpokenSummary(result) {
    if (!result || !result.ok) return "";

    const order = Array.isArray(result.order) ? result.order : [];
    if (!order.length) {
      const cribOwner = state.cribOwner || "the dealer";
      return `Scoring. ${state.leftPersona} scores ${result.leftScore.total}. ${state.rightPersona} scores ${result.rightScore.total}. ${cribOwner}'s crib scores ${result.cribScore.total}.`;
    }

    return [
      "Scoring.",
      ...order.map((entry) => {
        const label = entry.kind === "crib" ? `${entry.name}'s crib` : `${entry.name}'s hand`;
        return `${label}. ${ppCribbageCountChant(entry.score)}`;
      })
    ].join(" ");
  }

  function ppScoringBanterEvent(result, side = "") {
    if (!result || !result.ok) return "";

    const leftName = state.leftPersona;
    const rightName = state.rightPersona;
    const cribOwner = state.cribOwner || "the dealer";
    const leftTotal = result.leftScore.total;
    const rightTotal = result.rightScore.total;
    const cribTotal = result.cribScore.total;

    const leader =
      state.scoreLeft > state.scoreRight ? leftName :
      state.scoreRight > state.scoreLeft ? rightName :
      "the table";

    const reacting = side === "right" ? rightName : leftName;
    const other = side === "right" ? leftName : rightName;

    return [
      `The hand scoring just finished at The Peg and Pint.`,
      `${leftName}'s hand scored ${leftTotal}. ${rightName}'s hand scored ${rightTotal}. ${cribOwner}'s crib scored ${cribTotal}.`,
      `The current match score is ${leftName} ${state.scoreLeft}, ${rightName} ${state.scoreRight}.`,
      `${leader === "the table" ? "The match is tied" : leader + " is leading"}.`,
      `${reacting} is reacting to the scoring, with ${other} across the table.`
    ].join(" ");
  }

  function ppScoreHands() {
    if (ppIsPaused()) return ppPausedResult();
    if (!state.cutCard || state.cutCard === "—") {
      return {
        ok: false,
        message: "Cut the starter card before scoring hands."
      };
    }

    if (state.handsScored) {
      return {
        ok: false,
        message: "Hands already scored for this round."
      };
    }

    const leftHand = state.leftCountHand && state.leftCountHand.length
      ? state.leftCountHand
      : state.leftHand;

    const rightHand = state.rightCountHand && state.rightCountHand.length
      ? state.rightCountHand
      : state.rightHand;

    if (!leftHand || leftHand.length !== 4 || !rightHand || rightHand.length !== 4) {
      return {
        ok: false,
        message: "Need four-card hands before scoring. Discard to crib first."
      };
    }

    if (!state.cribCards || state.cribCards.length !== 4 || state.cribCards.some((card) => card === "?")) {
      return {
        ok: false,
        message: "Crib is not ready yet."
      };
    }

    const starter = state.cutCard;
    const cribIsLeft = state.cribOwner === state.leftPersona;

    const leftScore = ppScoreHand(leftHand, starter, false);
    const rightScore = ppScoreHand(rightHand, starter, false);
    const cribScore = ppScoreHand(state.cribCards, starter, true);

    /*
      Traditional order:
      non-dealer hand, dealer hand, then crib.
      We still return both hand results so the transcript is clear.
    */
    const order = cribIsLeft
      ? [
          { side: "right", name: state.rightPersona, score: rightScore, kind: "hand" },
          { side: "left", name: state.leftPersona, score: leftScore, kind: "hand" },
          { side: "left", name: state.leftPersona, score: cribScore, kind: "crib" }
        ]
      : [
          { side: "left", name: state.leftPersona, score: leftScore, kind: "hand" },
          { side: "right", name: state.rightPersona, score: rightScore, kind: "hand" },
          { side: "right", name: state.rightPersona, score: cribScore, kind: "crib" }
        ];

    order.forEach((entry) => ppAddScore(entry.side, entry.score.total));

    state.handsScored = true;
    state.phase = "Hands scored";
    state.lastScoreNote = `${state.leftPersona}: ${leftScore.total}; ${state.rightPersona}: ${rightScore.total}; crib: ${cribScore.total}.`;

    return {
      ok: true,
      order,
      leftScore,
      rightScore,
      cribScore,
      message: `Hands scored. ${state.leftPersona} ${leftScore.total}, ${state.rightPersona} ${rightScore.total}, crib ${cribScore.total}.`
    };
  }

  function ppOtherSide(side = "left") {
    return side === "right" ? "left" : "right";
  }

  function ppSideName(side = "left") {
    return side === "right" ? state.rightPersona : state.leftPersona;
  }

  function ppSideHand(side = "left") {
    return side === "right" ? (state.rightHand || []) : (state.leftHand || []);
  }

  function ppSetSideHand(side = "left", hand = []) {
    if (side === "right") {
      state.rightHand = hand;
    } else {
      state.leftHand = hand;
    }
  }

  function ppSetPegGo(side = "left", value = false) {
    if (side === "right") {
      state.rightPegSaidGo = !!value;
    } else {
      state.leftPegSaidGo = !!value;
    }
  }

  function ppPegGo(side = "left") {
    return side === "right" ? !!state.rightPegSaidGo : !!state.leftPegSaidGo;
  }

  function ppClearPegGoFlags() {
    state.leftPegSaidGo = false;
    state.rightPegSaidGo = false;
  }

  function ppCanSidePeg(side = "left") {
    return ppFindLegalPegCard(ppSideHand(side)) >= 0;
  }

  function ppBothHandsEmpty() {
    return !(state.leftHand && state.leftHand.length) && !(state.rightHand && state.rightHand.length);
  }

  function ppScorePegRun(row) {
    const cards = row || [];

    for (let len = Math.min(cards.length, 7); len >= 3; len -= 1) {
      const slice = cards.slice(cards.length - len);
      const ranks = slice.map((card) => PP_RANKS.indexOf(ppCardRank(card)));

      if (ranks.some((rank) => rank < 0)) continue;

      const unique = new Set(ranks);
      if (unique.size !== len) continue;

      const min = Math.min(...ranks);
      const max = Math.max(...ranks);

      if (max - min + 1 === len) {
        return {
          points: len,
          label: `run of ${len} for ${len}`
        };
      }
    }

    return { points: 0, label: "" };
  }

  function ppResetPegging() {
    state.pegTurn = typeof ppPoneSide === "function" ? ppPoneSide() : "left";
    state.peggingCount = 0;
    state.pegging = [];
    state.leftPegPlayed = [];
    state.rightPegPlayed = [];
    state.leftPegSaidGo = false;
    state.rightPegSaidGo = false;
    state.lastPegSide = "";
    state.lastPegNote = "Pegging has not started.";
  }


  function ppPegValue(card) {
    return Math.min(10, ppRankValue(card));
  }

  function ppCardRank(card) {
    if (typeof card === "string") return String(card).replace(/[♣♦♥♠]/g, "");
    return card && card.rank;
  }

  function ppFindLegalPegCard(hand) {
    const cards = hand || [];
    for (let i = 0; i < cards.length; i += 1) {
      if (Number(state.peggingCount || 0) + ppPegValue(cards[i]) <= 31) {
        return i;
      }
    }
    return -1;
  }

  function ppScorePegPlay(card, newCount) {
    let points = 0;
    const notes = [];

    if (newCount === 15) {
      points += 2;
      notes.push("fifteen for 2");
    }

    if (newCount === 31) {
      points += 2;
      notes.push("thirty-one for 2");
    }

    const row = state.pegging || [];
    const rank = ppCardRank(card);

    let sameRankCount = 1;
    for (let i = row.length - 2; i >= 0; i -= 1) {
      if (ppCardRank(row[i]) === rank) {
        sameRankCount += 1;
      } else {
        break;
      }
    }

    if (sameRankCount === 2) {
      points += 2;
      notes.push("pair for 2");
    } else if (sameRankCount === 3) {
      points += 6;
      notes.push("three of a kind for 6");
    } else if (sameRankCount === 4) {
      points += 12;
      notes.push("four of a kind for 12");
    }

    const run = ppScorePegRun(row);
    if (run.points) {
      points += run.points;
      notes.push(run.label);
    }

    return { points, notes };
  }



  function ppScorePegger(side, points) {
    const pts = Number(points || 0);
    if (!pts) return;
    ppAddScore(side, pts);
  }


  function ppPlayPegCard(side = "left", idx = 0) {
    const persona = ppSideName(side);
    const other = ppOtherSide(side);
    const hand = ppSideHand(side).slice();

    if (!Number.isInteger(idx) || idx < 0 || idx >= hand.length) {
      return {
        ok: false,
        message: "Choose a valid card."
      };
    }

    const card = hand[idx];
    const value = ppPegValue(card);
    const newCount = Number(state.peggingCount || 0) + value;

    if (newCount > 31) {
      return {
        ok: false,
        message: `${ppCardSpoken(card)} would take the count over 31.`
      };
    }

    hand.splice(idx, 1);
    ppSetSideHand(side, hand);

    state.peggingCount = newCount;
    state.pegging = [...(state.pegging || []), card];
    state.lastPegSide = side;
    ppSetPegGo(side, false);

    if (side === "left") {
      state.leftPegPlayed = [...(state.leftPegPlayed || []), card];
    } else {
      state.rightPegPlayed = [...(state.rightPegPlayed || []), card];
    }

    const pegScore = ppScorePegPlay(card, newCount);
    let points = pegScore.points;
    const notes = pegScore.notes.slice();

    let countReset = false;
    let doneAfterPlay = false;

    if (newCount === 31) {
      countReset = true;
      ppClearPegGoFlags();
      state.peggingCount = 0;
      state.pegging = [];
      state.pegTurn = other;
    } else if (ppBothHandsEmpty()) {
      doneAfterPlay = true;

      if (newCount > 0) {
        points += 1;
        notes.push("last card for 1");
      }

      state.phase = "Pegging complete";
      state.pegTurn = other;
    } else if (ppPegGo(other) && ppCanSidePeg(side)) {
      // Opponent already said go; current player continues if possible.
      state.pegTurn = side;
    } else {
      state.pegTurn = other;
    }

    ppScorePegger(side, points);

    const cardText = ppCardLabel(card);
    const scoreText = notes.length ? ` — ${notes.join(", ")}` : "";
    const pointText = points ? ` (+${points})` : "";

    state.phase = doneAfterPlay ? "Pegging complete" : "Pegging";
    state.lastPegNote = `${persona} plays ${cardText}. Count ${newCount}${scoreText}.`;

    if (countReset) {
      state.lastPegNote += " Count resets after 31.";
    }

    if (doneAfterPlay) {
      state.lastPegNote += " Pegging complete. Hand scoring comes next.";
    }

    return {
      ok: true,
      side,
      persona,
      card,
      cardText,
      count: newCount,
      points,
      notes,
      countReset,
      doneAfterPlay,
      message: `${persona} plays ${cardText}. Count ${newCount}${scoreText}${pointText}.`
    };
  }

  function ppHandlePegGo(side = "left") {
    const persona = ppSideName(side);
    const other = ppOtherSide(side);
    const otherName = ppSideName(other);

    ppSetPegGo(side, true);

    if (ppCanSidePeg(other)) {
      state.pegTurn = other;
      state.lastPegNote = `${persona} says go. ${otherName} may continue.`;

      return {
        ok: true,
        go: true,
        side,
        persona,
        scorerSide: "",
        points: 0,
        message: `${persona} says go. ${otherName} may continue.`
      };
    }

    const scorerSide = state.lastPegSide || other;
    const scorerName = ppSideName(scorerSide);
    let points = 0;

    if (state.peggingCount > 0) {
      points = 1;
      ppScorePegger(scorerSide, points);
    }

    state.peggingCount = 0;
    state.pegging = [];
    ppClearPegGoFlags();
    state.pegTurn = ppOtherSide(scorerSide);
    state.lastPegNote = points
      ? `${persona} says go. ${scorerName} scores last card for 1. Count resets.`
      : `${persona} says go. Count resets.`;

    return {
      ok: true,
      go: true,
      reset: true,
      side,
      persona,
      scorerSide,
      points,
      message: state.lastPegNote
    };
  }

  function ppPegStep() {
    if (ppIsPaused()) return ppPausedResult();
    if (!state.cutCard || state.cutCard === "—") {
      return {
        ok: false,
        message: "Cut the starter card before pegging."
      };
    }

    if (ppBothHandsEmpty()) {
      state.phase = "Pegging complete";
      state.lastPegNote = "All pegging cards have been played. Hand scoring comes next.";

      return {
        ok: true,
        done: true,
        message: "Pegging complete. Hand scoring comes next."
      };
    }

    const side = state.pegTurn === "right" ? "right" : "left";
    const idx = ppFindLegalPegCard(ppSideHand(side));

    if (idx < 0) {
      return ppHandlePegGo(side);
    }

    return ppPlayPegCard(side, idx);
  }


  function ppToggleUserDiscard(index) {
    const idx = Number(index);
    if (!Number.isInteger(idx)) return;

    const current = state.userDiscardSelection || [];

    if (current.includes(idx)) {
      state.userDiscardSelection = current.filter((item) => item !== idx);
      return;
    }

    if (current.length >= 2) {
      state.userDiscardSelection = [current[1], idx];
      return;
    }

    state.userDiscardSelection = [...current, idx];
  }

  function ppUserDiscardToCrib() {
    if (ppIsPaused()) return ppPausedResult();
    if (!ppIsUserMode()) {
      return ppDiscardToCrib();
    }

    if (!state.leftHand || state.leftHand.length !== 6 || !state.rightHand || state.rightHand.length !== 6) {
      return {
        ok: false,
        message: "Shuffle and deal six cards first."
      };
    }

    const selected = Array.from(new Set(state.userDiscardSelection || []))
      .map(Number)
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < state.leftHand.length)
      .sort((a, b) => a - b);

    if (selected.length !== 2) {
      return {
        ok: false,
        message: "Choose exactly two cards from your hand for the crib."
      };
    }

    const leftDiscardIdx = new Set(selected);
    const rightDiscardIdx = new Set(ppChooseDiscards(state.rightHand));

    const leftDiscards = state.leftHand.filter((_, idx) => leftDiscardIdx.has(idx));
    const rightDiscards = state.rightHand.filter((_, idx) => rightDiscardIdx.has(idx));

    state.leftHand = ppSortCards(state.leftHand.filter((_, idx) => !leftDiscardIdx.has(idx)));
    state.rightHand = ppSortCards(state.rightHand.filter((_, idx) => !rightDiscardIdx.has(idx)));

    state.leftCountHand = state.leftHand.slice();
    state.rightCountHand = state.rightHand.slice();
    state.cribCards = [...leftDiscards, ...rightDiscards];

    state.userDiscardSelection = [];
    state.phase = "Crib ready";
    state.cribOwner = state.cribOwner || state.leftPersona;

    ppResetPegging();
    state.lastPegNote = "Ready to cut starter card.";

    const leftText = leftDiscards.map(ppCardLabel).join(" ");
    const rightText = "two hidden cards";

    state.lastCribNote = `${state.leftPersona} throws ${leftText}; ${state.rightPersona} throws two hidden cards.`;

    return {
      ok: true,
      leftText,
      rightText,
      leftDiscards,
      rightDiscards,
      personaDiscardHidden: true,
      message: "Your discards are in. Persona discarded two hidden cards to the crib."
    };
  }

  function ppUserPegCard(index) {
    if (ppIsPaused()) return ppPausedResult();
    if (!ppIsUserMode()) {
      return {
        ok: false,
        message: "Switch Mode to You vs Persona first."
      };
    }

    if (!state.cutCard || state.cutCard === "—") {
      return {
        ok: false,
        message: "Cut the starter card before pegging."
      };
    }

    if (state.pegTurn !== "left") {
      return {
        ok: false,
        message: `It is ${state.rightPersona}'s turn. Click Peg Step for the persona.`
      };
    }

    const idx = Number(index);
    return ppPlayPegCard("left", idx);
  }


  function ppUserGo() {
    if (ppIsPaused()) return ppPausedResult();

    if (!ppIsUserMode()) {
      return {
        ok: false,
        message: "Switch Mode to You vs Persona first."
      };
    }

    if (!state.cutCard || state.cutCard === "—") {
      return {
        ok: false,
        message: "Cut the starter card before pegging."
      };
    }

    if (ppBothHandsEmpty()) {
      state.phase = "Pegging complete";
      state.lastPegNote = "All pegging cards have been played. Hand scoring comes next.";
      return {
        ok: true,
        done: true,
        message: "Pegging complete. Hand scoring comes next."
      };
    }

    if (state.pegTurn !== "left") {
      return {
        ok: false,
        message: `It is ${state.rightPersona}'s turn. Click Peg Step for the persona.`
      };
    }

    if (ppFindLegalPegCard(state.leftHand || []) >= 0) {
      return {
        ok: false,
        message: "You still have a legal card to play. Click a card, or say Go only when you cannot play."
      };
    }

    return ppHandlePegGo("left");
  }


  function ppCutStarter() {
    if (ppIsPaused()) return ppPausedResult();
    if (!state.deck || !state.deck.length) {
      return {
        ok: false,
        message: "No live deck available. Click New Match or Shuffle & Deal, then discard to crib before cutting."
      };
    }

    if (!state.cribCards || state.cribCards.some((card) => card === "?")) {
      return {
        ok: false,
        message: "Discard to the crib before cutting the starter card."
      };
    }

    if (state.cutCard && state.cutCard !== "—") {
      return {
        ok: false,
        message: `Starter card is already cut: ${ppCardLabel(state.cutCard)}.`
      };
    }

    const starter = state.deck.pop();
    state.cutCard = starter;
    state.phase = "Starter cut";

    const heels = ppIsJack(starter);
    if (heels) {
      if (state.cribOwner === state.leftPersona) {
        state.scoreLeft = Math.max(0, Math.min(121, Number(state.scoreLeft || 0) + 2));
      } else {
        state.scoreRight = Math.max(0, Math.min(121, Number(state.scoreRight || 0) + 2));
      }
    }

    return {
      ok: true,
      starter,
      starterText: ppCardLabel(starter),
      heels,
      message: heels
        ? `Starter card is ${ppCardLabel(starter)}. ${state.cribOwner} scores 2 for his heels.`
        : `Starter card is ${ppCardLabel(starter)}.`
    };
  }

  function ppDiscardToCrib() {
    if (ppIsPaused()) return ppPausedResult();
    if (!state.leftHand || !state.rightHand || state.leftHand.length !== 6 || state.rightHand.length !== 6) {
      return {
        ok: false,
        message: "Deal six cards first, then discard to crib."
      };
    }

    const leftDiscardIdx = new Set(ppChooseDiscards(state.leftHand));
    const rightDiscardIdx = new Set(ppChooseDiscards(state.rightHand));

    const leftDiscards = state.leftHand.filter((_, idx) => leftDiscardIdx.has(idx));
    const rightDiscards = state.rightHand.filter((_, idx) => rightDiscardIdx.has(idx));

    state.leftHand = ppSortCards(state.leftHand.filter((_, idx) => !leftDiscardIdx.has(idx)));
    state.rightHand = ppSortCards(state.rightHand.filter((_, idx) => !rightDiscardIdx.has(idx)));
    state.leftCountHand = state.leftHand.slice();
    state.rightCountHand = state.rightHand.slice();
    state.cribCards = [...leftDiscards, ...rightDiscards];
    state.phase = "Crib ready";
    state.cribOwner = state.cribOwner || state.leftPersona;
    ppResetPegging();
    state.lastPegNote = "Ready to cut starter card.";

    const leftText = leftDiscards.map(ppCardLabel).join(" ");
    const rightText = rightDiscards.map(ppCardLabel).join(" ");

    state.lastCribNote = `${state.leftPersona} throws ${leftText}; ${state.rightPersona} throws ${rightText}.`;

    return {
      ok: true,
      leftText,
      rightText,
      leftDiscards,
      rightDiscards,
      message: "Both personas discarded two cards. Crib is ready."
    };
  }


  function ppOpeningCutPending() {
    return Number(state.dealNumber || 0) === 0
      && state.needsDealCut !== false
      && !state.dealCutWinnerSide;
  }

  function ppCribOwnerDisplay() {
    return ppOpeningCutPending()
      ? "not assigned yet"
      : (state.cribOwner || ppDealerName() || "—");
  }

  function ppDealerDisplayName() {
    return ppOpeningCutPending() ? "—" : ppDealerName();
  }



  function ppCardCutValue(card) {
    const idx = RANKS.indexOf(card && card.rank ? card.rank : "");
    return idx >= 0 ? idx + 1 : 99; // Ace low, King high.
  }

  function ppResetDealCut(needsCut = true) {
    state.needsDealCut = !!needsCut;
    state.dealCutLeftCard = null;
    state.dealCutRightCard = null;
    state.dealCutWinnerSide = "";
    state.dealCutWinnerName = "";
    state.dealCutTied = false;
  }

  function ppDealCutLine() {
    const left = state.dealCutLeftCard ? `${state.leftPersona}: ${ppCardLabel(state.dealCutLeftCard)}` : `${state.leftPersona}: —`;
    const right = state.dealCutRightCard ? `${state.rightPersona}: ${ppCardLabel(state.dealCutRightCard)}` : `${state.rightPersona}: —`;
    if (state.dealCutWinnerName) return `${left} · ${right} · ${state.dealCutWinnerName} deals first`;
    if (state.dealCutTied) return `${left} · ${right} · tie, cut again`;
    return "Not cut yet";
  }

  function ppCutForDeal() {
    if (Number(state.dealNumber || 0) > 0 || (state.leftHand && state.leftHand.length) || (state.rightHand && state.rightHand.length)) {
      return {
        ok: false,
        message: "Cut for deal only happens before the first deal of a new match. Click New Match to start over."
      };
    }

    const deck = ppShuffle(ppMakeDeck());
    const leftCard = deck.pop();
    const rightCard = deck.pop();
    const leftValue = ppCardCutValue(leftCard);
    const rightValue = ppCardCutValue(rightCard);

    state.dealCutLeftCard = leftCard;
    state.dealCutRightCard = rightCard;
    state.dealCutWinnerSide = "";
    state.dealCutWinnerName = "";
    state.dealCutTied = false;

    if (leftValue === rightValue) {
      state.needsDealCut = true;
      state.cribOwner = "";
      state.dealerSide = "";
      state.dealCutTied = true;
      state.phase = "Cut tie";
      state.lastDealLabel = "Cut tied";
      state.lastCribNote = "Tie on the cut. Cut again for first deal.";
      return {
        ok: true,
        tied: true,
        leftCard,
        rightCard,
        message: `${state.leftPersona} cuts ${ppCardLabel(leftCard)}. ${state.rightPersona} cuts ${ppCardLabel(rightCard)}. Tie. Cut again.`
      };
    }

    const winnerSide = leftValue < rightValue ? "left" : "right";
    const winnerName = winnerSide === "right" ? state.rightPersona : state.leftPersona;

    state.needsDealCut = false;
    state.dealCutWinnerSide = winnerSide;
    state.dealerSide = winnerSide;
    state.cribOwner = winnerName;
    state.dealCutWinnerName = winnerName;
    state.phase = "Ready to deal";
    state.lastDealLabel = "Cut complete";
    state.lastCribNote = `${winnerName} owns the first crib. Ready to shuffle and deal.`;
    state.lastPegNote = "Pegging has not started.";

    return {
      ok: true,
      tied: false,
      leftCard,
      rightCard,
      dealer: winnerName,
      dealerSide: winnerSide,
      message: `${state.leftPersona} cuts ${ppCardLabel(leftCard)}. ${state.rightPersona} cuts ${ppCardLabel(rightCard)}. Low card deals first: ${winnerName}. ${winnerName} owns the first crib.`
    };
  }


  function ppDealPersonaRound() {
    if (typeof ppEnsureModeSeat === "function") ppEnsureModeSeat();

    if (Number(state.dealNumber || 0) === 0 && state.needsDealCut !== false) {
      return {
        ok: false,
        needsDealCut: true,
        message: "First cut first. Low card deals first; Ace is low."
      };
    }

    state.needsDealCut = false;
    state.cribOwner = ppDealerName();

    const deck = ppShuffle(ppMakeDeck());
    const leftHand = [];
    const rightHand = [];

    for (let i = 0; i < 6; i += 1) {
      leftHand.push(deck.pop());
      rightHand.push(deck.pop());
    }

    state.deck = deck;
    state.leftHand = ppSortCards(leftHand);
    state.rightHand = ppSortCards(rightHand);
    state.cutCard = "—";
    state.cribCards = ["?", "?", "?", "?"];
    state.leftCountHand = [];
    state.rightCountHand = [];
    state.handsScored = false;
    state.lastScoreNote = "Hands not scored yet.";
    state.userDiscardSelection = [];
    state.phase = "Dealt";
    ppResetPegging();

    state.lastCribNote = `${ppCribOwnerLine()}. Waiting for discards.`;
    state.lastPegNote = `${ppPoneName()} pegs first after the cut.`;
    state.dealNumber = Number(state.dealNumber || 0) + 1;
    state.lastDealLabel = `Round ${state.dealNumber}`;

    return {
      ok: true,
      dealer: ppDealerName(),
      pone: ppPoneName(),
      cribOwner: state.cribOwner,
      message: `Round ${state.dealNumber}. ${ppDealerName()} deals. ${ppCribOwnerLine()}.`
    };
  }


  function loadSettings() {
    try {
      return { ...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {}) };
    } catch (err) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {}
  }

  let settings = loadSettings();

  let ppVoiceQueue = [];
  let ppVoiceQueueRunning = false;
  let ppVoiceQueueGeneration = 0;

  function ppApplySeatSettings() {
    state.leftPersona = settings.leftPersona || state.leftPersona || "Elias";
    state.rightPersona = settings.rightPersona || state.rightPersona || "Riley";

    if (!state.cribOwner || state.cribOwner === "Elias" || state.cribOwner === "Riley") {
      state.cribOwner = state.leftPersona;
    }
  }

  ppApplySeatSettings();

  let ppInitialMountFallbackUsed = false;
  let ppRoutePollTimer = null;

  function isPegPintRoute() {
    const hash = String(window.location.hash || "").toLowerCase();
    const href = String(window.location.href || "").toLowerCase();

    if (hash.includes("peg-and-pint")) return true;

    /*
      Sapphire can briefly load an app script before the hash settles.
      Allow that fallback only once. After that, Peg & Pint must obey
      the actual Sapphire route instead of staying glued to the screen.
    */
    if (!hash || hash === "#") {
      if (!ppInitialMountFallbackUsed && href.includes("peg-and-pint")) {
        ppInitialMountFallbackUsed = true;
        return true;
      }
      return false;
    }

    if (hash.includes("apps/") && !hash.includes("peg-and-pint")) return false;

    return false;
  }

  function csrfHeaders(extra = {}) {
    const headers = { ...extra };
    try {
      const cookie = document.cookie || "";
      const match = cookie.match(/(?:^|;\s*)(csrf_token|csrftoken|csrf)=([^;]+)/i);
      if (match && match[2]) {
        headers["X-CSRFToken"] = decodeURIComponent(match[2]);
      }
    } catch (err) {}
    return headers;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        top: 0;
        left: 72px;
        right: 0;
        bottom: 0;
        z-index: 30;
        overflow: auto;
        color: #f7ead2;
        background:
          radial-gradient(circle at 18% 12%, rgba(245, 158, 11, 0.18), transparent 30%),
          radial-gradient(circle at 82% 20%, rgba(124, 58, 237, 0.16), transparent 34%),
          linear-gradient(135deg, #160d08 0%, #29150b 48%, #100806 100%);
        font-family: ui-serif, Georgia, "Times New Roman", serif;
      }

      #${ROOT_ID}[data-pp-sidebar-released="1"],
      #${ROOT_ID}[data-pp-sidebar-released="1"] * {
        pointer-events: none !important;
      }

      .pp-wrap {
        min-height: 100%;
        padding: 28px;
        box-sizing: border-box;
      }

      .pp-hero {
        max-width: 1180px;
        margin: 0 auto 18px auto;
        padding: 22px;
        border: 1px solid rgba(251, 191, 36, 0.28);
        border-radius: 24px;
        background: rgba(20, 10, 5, 0.72);
        box-shadow: 0 24px 80px rgba(0,0,0,0.38);
      }

      .pp-title-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .pp-title {
        margin: 0;
        font-size: clamp(30px, 4vw, 54px);
        letter-spacing: 0.02em;
        line-height: 1;
      }

      .pp-tagline {
        margin: 10px 0 0;
        color: #fde68a;
        font-size: 20px;
      }

      .pp-badge {
        border: 1px solid rgba(253, 230, 138, 0.35);
        border-radius: 999px;
        padding: 9px 13px;
        color: #fde68a;
        background: rgba(120, 53, 15, 0.42);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
      }

      .pp-grid {
        max-width: 1180px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
      }

      .pp-table-grid {
        display: grid;
        grid-template-columns: minmax(220px, 0.85fr) minmax(320px, 1.2fr) minmax(220px, 0.85fr);
        gap: 16px;
        align-items: stretch;
      }

      .pp-seat {
        border: 1px solid rgba(253, 230, 138, 0.22);
        border-radius: 22px;
        background: rgba(12, 6, 3, 0.34);
        padding: 14px;
        min-height: 265px;
      }

      .pp-seat-title {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
        color: #fde68a;
        margin-bottom: 10px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-seat-name {
        font-size: 20px;
        font-weight: 850;
        color: #ffedd5;
      }

      .pp-seat-score {
        font-size: 14px;
      }

      .pp-deal-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid rgba(253, 230, 138, 0.22);
        background: rgba(120, 53, 15, 0.34);
        color: #fde68a;
        font-size: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-table-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        color: #fde68a;
        font-size: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-seat-note {
        color: #fed7aa;
        font-size: 14px;
        line-height: 1.35;
        margin-top: 12px;
      }

      .pp-center-stack {
        display: grid;
        gap: 12px;
      }


      .pp-trad-board {
        margin: 8px 0 6px;
        padding: 10px 12px 8px;
        border-radius: 18px;
        background:
          linear-gradient(90deg, rgba(92, 38, 9, 0.72), rgba(120, 53, 15, 0.46), rgba(69, 26, 3, 0.72)),
          radial-gradient(circle at 22% 35%, rgba(253, 230, 138, 0.08), transparent 34%);
        border: 1px solid rgba(253, 230, 138, 0.22);
      }

      .pp-trad-svg {
        width: 100%;
        height: auto;
        display: block;
        overflow: visible;
      }

      .pp-trad-wood-grain {
        fill: none;
        stroke: rgba(253, 230, 138, 0.08);
        stroke-width: 1.2;
      }

      .pp-trad-track {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.68;
      }

      .pp-trad-track.left {
        stroke: rgba(251, 191, 36, 0.58);
      }

      .pp-trad-track.right {
        stroke: rgba(192, 132, 252, 0.52);
      }

      .pp-trad-hole {
        fill: #211008;
        stroke-width: 1.15;
      }

      .pp-trad-hole.left {
        stroke: rgba(251, 191, 36, 0.7);
      }

      .pp-trad-hole.right {
        stroke: rgba(192, 132, 252, 0.7);
      }

      .pp-trad-hole.milestone {
        fill: rgba(69, 26, 3, 0.95);
        stroke-width: 1.55;
      }

      .pp-trad-peg {
        stroke: #fff7ed;
        stroke-width: 1.4;
      }

      .pp-trad-peg.left {
        fill: #fbbf24;
        filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.75));
      }

      .pp-trad-peg.right {
        fill: #c084fc;
        filter: drop-shadow(0 0 4px rgba(192, 132, 252, 0.75));
      }

      .pp-trad-label {
        font-size: 9px;
        fill: #fde68a;
        text-anchor: middle;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        opacity: 0.88;
      }

      .pp-trad-start-finish {
        font-size: 11px;
        fill: #ffedd5;
        font-weight: 800;
        text-anchor: middle;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-trad-legend {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 6px;
        color: #fde68a;
        font-size: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-trad-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pp-trad-legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
      }

      .pp-trad-legend-dot.left {
        background: #fbbf24;
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.7);
      }

      .pp-trad-legend-dot.right {
        background: #c084fc;
        box-shadow: 0 0 10px rgba(192, 132, 252, 0.7);
      }

      @media (max-height: 820px) {
        .pp-trad-board {
          padding: 8px 10px 6px;
        }

        .pp-trad-label {
          font-size: 8px;
        }

        .pp-trad-start-finish {
          font-size: 10px;
        }
      }


      .pp-deck-cut-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        padding: 8px 10px;
        border-radius: 16px;
        border: 1px solid rgba(253, 230, 138, 0.18);
        background: rgba(12, 6, 3, 0.28);
      }

      .pp-card-zone {
        display: grid;
        justify-items: center;
        gap: 5px;
      }

      .pp-card-zone-label {
        color: #fed7aa;
        font-weight: 850;
        font-size: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-deck-stack {
        width: 48px;
        height: 66px;
        border-radius: 10px;
        border: 1px solid rgba(253, 230, 138, 0.42);
        background:
          linear-gradient(135deg, rgba(120, 53, 15, 0.98), rgba(69, 26, 3, 0.98)),
          repeating-linear-gradient(45deg, transparent 0 5px, rgba(253, 230, 138, 0.18) 5px 7px);
        box-shadow:
          3px 3px 0 rgba(253, 230, 138, 0.18),
          6px 6px 0 rgba(0, 0, 0, 0.28),
          0 10px 24px rgba(0, 0, 0, 0.25);
        display: grid;
        place-items: center;
        color: #fde68a;
        font-size: 12px;
        font-weight: 850;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-cut-card-slot .pp-playing-card {
        width: 48px;
        height: 66px;
        font-size: 20px;
      }

      .pp-card-placeholder {
        background: rgba(41, 20, 10, 0.78);
        color: #fde68a;
        border-style: dashed;
      }

      .pp-crib-tray {
        border: 1px solid rgba(253, 230, 138, 0.2);
        border-radius: 16px;
        background: rgba(12, 6, 3, 0.34);
        padding: 9px 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .pp-crib-label {
        color: #fed7aa;
        font-weight: 850;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        white-space: nowrap;
      }

      .pp-crib-cards {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .pp-crib-cards .pp-playing-card {
        width: 38px;
        height: 52px;
        font-size: 18px;
        opacity: 0.92;
      }

      .pp-center-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 10px;
        color: #fde68a;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
      }

      .pp-mini-label {
        color: #fed7aa;
        font-weight: 800;
      }

      .pp-table-log-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1fr) minmax(260px, 0.55fr);
        gap: 18px;
      }

      .pp-card {
        border: 1px solid rgba(251, 191, 36, 0.22);
        border-radius: 22px;
        background: rgba(35, 18, 9, 0.74);
        box-shadow: 0 18px 55px rgba(0,0,0,0.28);
        padding: 18px;
      }

      .pp-card h2 {
        margin: 0 0 12px;
        font-size: 22px;
        color: #fed7aa;
      }

      .pp-board {
        min-height: 210px;
        border-radius: 22px;
        border: 1px solid rgba(253, 230, 138, 0.28);
        background:
          linear-gradient(90deg, rgba(120, 53, 15, 0.5), rgba(69, 26, 3, 0.5)),
          repeating-linear-gradient(90deg, transparent 0 18px, rgba(253, 230, 138, 0.08) 18px 20px);
        padding: 18px;
        position: relative;
        overflow: hidden;
      }

      .pp-snake-board {
        margin: 8px 0 6px;
        padding: 8px 8px 4px;
        border-radius: 16px;
        background: rgba(12, 6, 3, 0.22);
      }

      .pp-snake-svg {
        width: 100%;
        height: auto;
        display: block;
        overflow: visible;
      }

      .pp-snake-track-shadow {
        fill: none;
        stroke: rgba(0, 0, 0, 0.34);
        stroke-width: 16;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .pp-snake-track {
        fill: none;
        stroke: rgba(180, 83, 9, 0.62);
        stroke-width: 10;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .pp-snake-hole-dot {
        fill: #2a140a;
        stroke: rgba(253, 230, 138, 0.22);
        stroke-width: 1.2;
      }

      .pp-snake-hole-dot.milestone {
        fill: rgba(120, 53, 15, 0.95);
        stroke: rgba(253, 230, 138, 0.45);
        stroke-width: 1.4;
      }

      .pp-snake-label {
        font-size: 8px;
        line-height: 1;
        fill: #fde68a;
        text-anchor: middle;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: none;
      }

      .pp-snake-marker.left {
        fill: #fbbf24;
        stroke: #fff7ed;
        stroke-width: 1.4;
      }

      .pp-snake-marker.right {
        fill: #c084fc;
        stroke: #fff7ed;
        stroke-width: 1.4;
      }

      .pp-snake-legend {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 7px;
        color: #fde68a;
        font-size: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-snake-legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pp-snake-legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
      }

      .pp-snake-legend-dot.left {
        background: #fbbf24;
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.7);
      }

      .pp-snake-legend-dot.right {
        background: #c084fc;
        box-shadow: 0 0 10px rgba(192, 132, 252, 0.7);
      }

      .pp-peg-lane {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 8px;
        margin: 16px 0;
      }

      .pp-hole {
        height: 12px;
        border-radius: 50%;
        background: rgba(0,0,0,0.38);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
      }

      .pp-hole.active-you {
        background: #fbbf24;
        box-shadow: 0 0 16px rgba(251, 191, 36, 0.78);
      }

      .pp-hole.active-house {
        background: #c084fc;
        box-shadow: 0 0 16px rgba(192, 132, 252, 0.72);
      }

      .pp-score-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: #fde68a;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-hand {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .pp-playing-card {
        width: 62px;
        height: 88px;
        border-radius: 12px;
        border: 1px solid rgba(253, 230, 138, 0.45);
        background: linear-gradient(160deg, #fff7ed, #fed7aa);
        color: #241006;
        display: grid;
        place-items: center;
        font-size: 24px;
        font-weight: 800;
        box-shadow: 0 10px 25px rgba(0,0,0,0.24);
        user-select: none;
      }

      .pp-playing-card.pp-card-back {
        position: relative;
        overflow: hidden;
        color: transparent;
        border-color: rgba(253, 230, 138, 0.56);
        background:
          radial-gradient(circle at center, rgba(253, 230, 138, 0.26) 0 16%, transparent 17%),
          repeating-linear-gradient(45deg, rgba(253, 230, 138, 0.15) 0 4px, transparent 4px 9px),
          linear-gradient(135deg, #7c2d12, #431407 62%, #1c0702);
        box-shadow:
          inset 0 0 0 3px rgba(67, 20, 7, 0.72),
          inset 0 0 0 6px rgba(253, 230, 138, 0.18),
          0 10px 25px rgba(0,0,0,0.24);
      }

      .pp-playing-card.pp-card-back::before,
      .pp-playing-card.pp-card-back::after {
        content: "";
        position: absolute;
        inset: 9px;
        border: 1px solid rgba(253, 230, 138, 0.34);
        border-radius: 8px;
        pointer-events: none;
      }

      .pp-playing-card.pp-card-back::after {
        inset: 20px;
        transform: rotate(45deg);
        border-radius: 4px;
        opacity: 0.7;
      }

      .pp-card-back-mark {
        color: rgba(253, 230, 138, 0.76);
        font-size: 18px;
        text-shadow: 0 0 10px rgba(253, 230, 138, 0.34);
        z-index: 1;
      }

      .pp-say-btn,
      .pp-confirm-discard-btn,
      .pp-go-btn {
        padding: 8px 14px;
        border-radius: 12px;
        white-space: nowrap;
      }

      .pp-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }

      .pp-btn {
        border: 1px solid rgba(253, 230, 138, 0.35);
        background: rgba(146, 64, 14, 0.72);
        color: #fff7ed;
        border-radius: 14px;
        padding: 10px 13px;
        cursor: pointer;
        font-weight: 700;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .pp-btn:hover {
        background: rgba(180, 83, 9, 0.82);
      }

      .pp-btn.secondary {
        background: rgba(67, 20, 7, 0.76);
      }

      .pp-toggle-row {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        align-items: center;
      }

      .pp-toggle {
        border: 1px solid rgba(253, 230, 138, 0.35);
        background: rgba(67, 20, 7, 0.76);
        color: #fff7ed;
        border-radius: 999px;
        padding: 6px 10px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        line-height: 1.1;
      }

      .pp-toggle.is-on {
        background: rgba(146, 64, 14, 0.78);
        border-color: rgba(251, 191, 36, 0.72);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
      }

      .pp-toggle:hover {
        background: rgba(180, 83, 9, 0.82);
      }

      .pp-panel {
        display: grid;
        gap: 12px;
      }

      .pp-log {
        min-height: 168px;
        border-radius: 18px;
        border: 1px solid rgba(253, 230, 138, 0.18);
        background: rgba(12, 6, 3, 0.42);
        padding: 14px;
        color: #ffedd5;
        line-height: 1.45;
      }

      .pp-settings {
        display: grid;
        gap: 8px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #fde68a;
      }

      .pp-settings label {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pp-status {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #fed7aa;
        font-size: 14px;
        min-height: 20px;
      }

      /* ===== Peg & Pint compact transcript-top override ===== */
      .pp-wrap {
        padding: 18px 22px;
      }

      .pp-hero {
        max-width: 1280px;
        margin: 0 auto 10px auto;
        padding: 16px 20px;
        border-radius: 20px;
      }

      .pp-title-row {
        align-items: center;
      }

      .pp-title {
        font-size: clamp(31px, 3.45vw, 46px);
      }

      .pp-tagline {
        margin-top: 6px;
        font-size: 16px;
      }

      .pp-badge {
        padding: 7px 11px;
        font-size: 12px;
      }

      .pp-grid {
        max-width: 1280px;
        gap: 10px;
        grid-template-columns: 1fr;
      }

      .pp-card {
        padding: 15px 17px;
        border-radius: 18px;
      }

      .pp-card h2 {
        margin: 0 0 8px;
        font-size: 20px;
      }

      /* In the persona-table layout, this pulls Match Transcript above the board. */
      .pp-table-log-grid {
        order: -1;
        gap: 10px;
        grid-template-columns: minmax(420px, 1fr) minmax(235px, 0.42fr);
      }

      /* In the older scaffold layout, this pulls Table Log above the board. */
      .pp-grid > .pp-panel {
        order: -1;
      }

      .pp-log {
        min-height: 76px;
        max-height: 150px;
        overflow: auto;
        padding: 13px 15px;
        font-size: 13px;
        line-height: 1.35;
      }

      .pp-log p {
        margin: 0 0 7px;
      }

      .pp-table-grid {
        grid-template-columns: minmax(200px, 0.82fr) minmax(310px, 1.15fr) minmax(200px, 0.82fr);
        gap: 10px;
      }

      .pp-seat {
        min-height: 190px;
        padding: 10px;
        border-radius: 18px;
      }

      .pp-seat-title {
        margin-bottom: 7px;
      }

      .pp-seat-name {
        font-size: 18px;
      }

      .pp-seat-score {
        font-size: 13px;
      }

      .pp-seat-note {
        margin-top: 7px;
        font-size: 12px;
        line-height: 1.25;
      }

      .pp-board {
        min-height: 148px;
        padding: 11px 13px;
        border-radius: 18px;
      }

      .pp-score-row {
        font-size: 13px;
      }

      .pp-peg-lane {
        gap: 6px;
        margin: 9px 0;
      }

      .pp-hole {
        height: 9px;
      }

      .pp-hand {
        gap: 7px;
        margin-top: 8px;
      }

      .pp-playing-card {
        width: 52px;
        height: 72px;
        border-radius: 10px;
        font-size: 18px;
      }

      .pp-center-row {
        font-size: 13px;
        gap: 7px;
      }

      .pp-buttons {
        gap: 7px;
        margin-top: 9px;
      }

      .pp-btn {
        padding: 8px 11px;
        border-radius: 11px;
        font-size: 13px;
      }

      .pp-settings {
        gap: 6px;
        font-size: 13px;
      }

      .pp-status {
        font-size: 12px;
      }

      @media (max-height: 820px) {
        .pp-wrap {
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .pp-hero {
          padding: 11px 16px;
          margin-bottom: 8px;
        }

        .pp-title {
          font-size: clamp(25px, 2.9vw, 36px);
        }

        .pp-tagline {
          font-size: 14px;
        }

        .pp-log {
          max-height: 120px;
        }

        .pp-board {
          min-height: 132px;
        }

        .pp-playing-card {
          width: 48px;
          height: 66px;
          font-size: 19px;
        }
      }

      @media (max-width: 980px) {
        .pp-table-log-grid {
          grid-template-columns: 1fr;
        }

        .pp-table-grid {
          grid-template-columns: 1fr;
        }
      }
      /* ===== End Peg & Pint compact transcript-top override ===== */

      @media (max-width: 820px) {
        #${ROOT_ID} { left: 0; }
        .pp-wrap { padding: 16px; }
        .pp-grid { grid-template-columns: 1fr; }
      }
      /* ===== Peg & Pint layout reflow override ===== */
      .pp-grid {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
      }

      .pp-transcript-top {
        order: 0;
      }

      .pp-main-table-card {
        order: 1;
      }

      .pp-controls-bottom {
        order: 2;
      }

      .pp-play-row {
        display: grid;
        grid-template-columns: minmax(420px, 1fr) minmax(118px, 0.22fr);
        gap: 10px;
        align-items: stretch;
      }

      .pp-play-row .pp-board {
        min-height: 190px !important;
      }

      .pp-deck-cut-column {
        flex-direction: column !important;
        justify-content: flex-start !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px 8px !important;
        min-width: 112px;
      }

      .pp-deck-cut-column .pp-card-zone {
        width: 100%;
      }

      .pp-deck-cut-column .pp-card-zone-label {
        text-align: center;
      }

      .pp-table-meta {
        margin-top: 4px;
      }

      .pp-controls-bottom {
        padding: 10px 14px !important;
      }

      .pp-controls-bottom h2 {
        margin-bottom: 6px !important;
      }

      .pp-controls-bottom .pp-settings {
        display: flex !important;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 18px !important;
      }

      .pp-controls-bottom .pp-status {
        margin-top: 6px;
      }

      @media (max-width: 1120px) {
        .pp-play-row {
          grid-template-columns: 1fr;
        }

        .pp-deck-cut-column {
          flex-direction: row !important;
          justify-content: center !important;
        }
      }
      /* ===== End Peg & Pint layout reflow override ===== */

      /* ===== Peg & Pint controls true-bottom override ===== */
      .pp-wrap {
        min-height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
      }

      .pp-grid {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: calc(100vh - 105px) !important;
      }

      .pp-transcript-top {
        order: 0 !important;
      }

      .pp-main-table-card {
        order: 1 !important;
      }

      .pp-controls-bottom {
        order: 99 !important;
        margin-top: auto !important;
        margin-bottom: 0 !important;
      }
      /* ===== End Peg & Pint controls true-bottom override ===== */


      /* ===== Peg & Pint restored top compact layout override ===== */
      .pp-wrap {
        min-height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        padding: 8px 14px 10px !important;
        box-sizing: border-box !important;
      }

      .pp-hero {
        width: 100% !important;
        max-width: 1280px !important;
        margin: 0 auto 2px auto !important;
        padding: 8px 12px !important;
        border-radius: 16px !important;
        box-sizing: border-box !important;
      }

      .pp-title-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
      }

      .pp-title {
        font-size: clamp(24px, 2.5vw, 34px) !important;
        line-height: 1 !important;
      }

      .pp-tagline {
        margin-top: 4px !important;
        font-size: 13px !important;
        line-height: 1.15 !important;
      }

      .pp-badge {
        font-size: 11px !important;
        padding: 5px 8px !important;
        line-height: 1.15 !important;
      }

      .pp-grid {
        width: 100% !important;
        max-width: 1280px !important;
        margin: 0 auto !important;
        flex: 1 1 auto !important;
        min-height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }

      .pp-card {
        padding: 9px 11px !important;
        border-radius: 16px !important;
      }

      .pp-card h2 {
        font-size: 17px !important;
        margin-bottom: 6px !important;
      }

      .pp-log {
        min-height: 58px !important;
        max-height: 96px !important;
        padding: 8px 10px !important;
        font-size: 12px !important;
        line-height: 1.25 !important;
      }

      .pp-table-grid {
        grid-template-columns: minmax(145px, 0.55fr) minmax(460px, 1.75fr) minmax(145px, 0.55fr) !important;
        gap: 8px !important;
      }

      .pp-seat {
        min-height: 168px !important;
        padding: 8px !important;
        border-radius: 15px !important;
      }

      .pp-seat-name {
        font-size: 16px !important;
      }

      .pp-seat-score,
      .pp-seat-note,
      .pp-deal-badge {
        font-size: 11px !important;
      }

      .pp-hand {
        gap: 5px !important;
        margin-top: 6px !important;
      }

      .pp-playing-card {
        width: 40px !important;
        height: 56px !important;
        font-size: 16px !important;
        border-radius: 8px !important;
      }

      .pp-play-row {
        grid-template-columns: minmax(360px, 1fr) minmax(98px, 0.2fr) !important;
        gap: 8px !important;
      }

      .pp-board {
        min-height: 168px !important;
        padding: 6px 7px !important;
        border-radius: 15px !important;
      }

      .pp-trad-board {
        margin: 2px 0 !important;
        padding: 2px 3px !important;
      }

      .pp-trad-svg {
        width: 100% !important;
        min-height: 150px !important;
        max-height: 170px !important;
      }

      .pp-deck-cut-column {
        min-width: 92px !important;
        padding: 7px 6px !important;
        gap: 7px !important;
      }

      .pp-deck-stack,
      .pp-cut-card-slot .pp-playing-card {
        width: 38px !important;
        height: 52px !important;
        font-size: 15px !important;
      }

      .pp-table-meta,
      .pp-center-row,
      .pp-settings,
      .pp-status {
        font-size: 11px !important;
      }

      .pp-crib-tray {
        padding: 6px 8px !important;
        border-radius: 13px !important;
      }

      .pp-crib-cards .pp-playing-card {
        width: 34px !important;
        height: 46px !important;
        font-size: 15px !important;
      }

      .pp-buttons {
        gap: 6px !important;
        margin-top: 6px !important;
      }

      .pp-btn {
        padding: 6px 8px !important;
        font-size: 12px !important;
        border-radius: 10px !important;
      }

      .pp-controls-bottom {
        margin-top: auto !important;
        padding: 8px 10px !important;
      }

      @media (max-width: 1120px) {
        .pp-table-grid,
        .pp-play-row {
          grid-template-columns: 1fr !important;
        }

        .pp-trad-svg {
          min-height: 145px !important;
        }
      }
      /* ===== End Peg & Pint restored top compact layout override ===== */

      /* ===== Peg & Pint transcript-controls top row override ===== */
      .pp-grid {
        display: grid !important;
        grid-template-columns: minmax(420px, 1fr) minmax(255px, 0.42fr) !important;
        grid-template-areas:
          "transcript controls"
          "table table" !important;
        gap: 8px !important;
        align-items: stretch !important;
      }

      .pp-transcript-top {
        grid-area: transcript !important;
        order: initial !important;
      }

      .pp-controls-bottom {
        grid-area: controls !important;
        order: initial !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        align-self: stretch !important;
        padding: 8px 10px !important;
      }

      .pp-controls-bottom h2 {
        margin-bottom: 5px !important;
      }

      .pp-controls-bottom .pp-settings {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 5px !important;
      }

      .pp-controls-bottom .pp-status {
        margin-top: 5px !important;
        line-height: 1.2 !important;
      }

      .pp-main-table-card {
        grid-area: table !important;
        order: initial !important;
      }

      @media (max-width: 900px) {
        .pp-grid {
          display: flex !important;
          flex-direction: column !important;
        }

        .pp-transcript-top,
        .pp-controls-bottom,
        .pp-main-table-card {
          grid-area: auto !important;
        }
      }
      /* ===== End Peg & Pint transcript-controls top row override ===== */

      /* ===== Peg & Pint tight margins single-card-row override ===== */
      #peg-pint-app-root {
        overflow-x: hidden !important;
      }

      .pp-wrap {
        padding-left: 6px !important;
        padding-right: 6px !important;
        padding-top: 6px !important;
      }

      .pp-hero,
      .pp-grid {
        max-width: none !important;
        width: 100% !important;
      }

      .pp-hero {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .pp-grid {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .pp-card {
        padding-left: 8px !important;
        padding-right: 8px !important;
      }

      .pp-table-grid {
        grid-template-columns: minmax(245px, 0.78fr) minmax(430px, 1.35fr) minmax(245px, 0.78fr) !important;
        gap: 8px !important;
      }

      .pp-seat {
        min-width: 0 !important;
      }

      .pp-hand {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 4px !important;
        overflow-x: auto !important;
        padding-bottom: 3px !important;
      }

      .pp-seat .pp-playing-card {
        flex: 0 0 auto !important;
        width: 36px !important;
        height: 50px !important;
        font-size: 15px !important;
      }

      .pp-play-row {
        grid-template-columns: minmax(430px, 1fr) minmax(92px, 0.18fr) !important;
        gap: 7px !important;
      }

      .pp-transcript-top,
      .pp-controls-bottom,
      .pp-main-table-card {
        min-width: 0 !important;
      }

      @media (max-width: 1120px) {
        .pp-table-grid {
          grid-template-columns: 1fr !important;
        }

        .pp-hand {
          justify-content: flex-start !important;
        }

        .pp-seat .pp-playing-card {
          width: 40px !important;
          height: 56px !important;
        }
      }
      /* ===== End Peg & Pint tight margins single-card-row override ===== */

      /* ===== Peg & Pint seat voice controls override ===== */
      .pp-seat-settings-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 6px 8px !important;
        width: 100% !important;
      }

      .pp-seat-settings-grid label {
        display: grid !important;
        gap: 3px !important;
        align-items: start !important;
      }

      .pp-select {
        width: 100% !important;
        min-width: 0 !important;
        border-radius: 9px !important;
        border: 1px solid rgba(253, 230, 138, 0.28) !important;
        background: rgba(20, 10, 5, 0.82) !important;
        color: #fde68a !important;
        padding: 5px 7px !important;
        font-size: 11px !important;
      }

      @media (max-width: 900px) {
        .pp-seat-settings-grid {
          grid-template-columns: 1fr !important;
        }
      }
      /* ===== End Peg & Pint seat voice controls override ===== */

      /* ===== Peg & Pint larger transcript override ===== */
      .pp-transcript-top .pp-panel {
        min-height: 205px !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .pp-transcript-top .pp-log {
        flex: 1 1 auto !important;
        min-height: 150px !important;
        max-height: 240px !important;
        overflow-y: auto !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
      }

      @media (max-height: 820px) {
        .pp-transcript-top .pp-panel {
          min-height: 175px !important;
        }

        .pp-transcript-top .pp-log {
          min-height: 120px !important;
          max-height: 190px !important;
        }
      }
      /* ===== End Peg & Pint larger transcript override ===== */

      /* ===== Peg & Pint thin board controls-fit override ===== */
      .pp-main-table-card {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
      }

      .pp-play-row .pp-board,
      .pp-board {
        min-height: 118px !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }

      .pp-trad-board {
        margin: 1px 0 !important;
        padding: 1px 2px !important;
      }

      .pp-trad-svg {
        width: 100% !important;
        min-height: 0 !important;
        max-height: 118px !important;
        display: block !important;
      }

      .pp-score-row {
        font-size: 11px !important;
        line-height: 1.1 !important;
      }

      .pp-table-meta {
        margin-top: 2px !important;
        gap: 5px !important;
        line-height: 1.15 !important;
      }

      .pp-crib-tray {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        margin-top: 2px !important;
      }

      .pp-center-row {
        margin-top: 1px !important;
        line-height: 1.15 !important;
      }

      .pp-buttons {
        margin-top: 4px !important;
      }

      .pp-deck-cut-column {
        padding-top: 5px !important;
        padding-bottom: 5px !important;
        gap: 5px !important;
      }

      @media (max-height: 820px) {
        .pp-play-row .pp-board,
        .pp-board {
          min-height: 104px !important;
        }

        .pp-trad-svg {
          max-height: 104px !important;
        }
      }
      /* ===== End Peg & Pint thin board controls-fit override ===== */

      /* ===== Peg & Pint board bottom symmetry override ===== */
      .pp-play-row .pp-board,
      .pp-board {
        min-height: 96px !important;
        padding-top: 3px !important;
        padding-bottom: 3px !important;
      }

      .pp-trad-board {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      .pp-trad-svg {
        max-height: 96px !important;
        min-height: 0 !important;
      }

      .pp-score-row {
        margin: 0 !important;
        padding: 0 !important;
      }

      @media (max-height: 820px) {
        .pp-play-row .pp-board,
        .pp-board {
          min-height: 90px !important;
        }

        .pp-trad-svg {
          max-height: 90px !important;
        }
      }
      /* ===== End Peg & Pint board bottom symmetry override ===== */

      /* ===== Peg & Pint tagline-side compact header override ===== */
      .pp-hero {
        padding-top: 5px !important;
        padding-bottom: 5px !important;
        margin-bottom: 0 !important;
      }

      .pp-title-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        flex-wrap: nowrap !important;
      }

      .pp-title-row > div:first-child {
        display: flex !important;
        align-items: baseline !important;
        gap: 12px !important;
        min-width: 0 !important;
        flex-wrap: wrap !important;
      }

      .pp-title {
        font-size: clamp(22px, 2.25vw, 31px) !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      .pp-tagline {
        margin: 0 !important;
        font-size: 12px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        color: #fde68a !important;
      }

      .pp-badge {
        font-size: 10px !important;
        padding: 4px 7px !important;
        white-space: nowrap !important;
        flex: 0 0 auto !important;
      }

      @media (max-width: 900px) {
        .pp-title-row {
          flex-wrap: wrap !important;
        }

        .pp-title-row > div:first-child {
          display: grid !important;
          gap: 3px !important;
        }

        .pp-tagline {
          white-space: normal !important;
        }
      }
      /* ===== End Peg & Pint tagline-side compact header override ===== */

      /* ===== Peg & Pint wider loop board override ===== */
      .pp-board {
        padding-left: 2px !important;
        padding-right: 2px !important;
      }

      .pp-trad-board {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      .pp-trad-svg {
        width: 100% !important;
      }
      /* ===== End Peg & Pint wider loop board override ===== */

      /* ===== Peg & Pint stronger board-fill override ===== */
      .pp-board {
        padding-left: 1px !important;
        padding-right: 1px !important;
        min-height: 104px !important;
      }

      .pp-trad-board {
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .pp-trad-svg {
        width: 100% !important;
        max-height: 104px !important;
        min-height: 0 !important;
      }

      @media (max-height: 820px) {
        .pp-board {
          min-height: 98px !important;
        }

        .pp-trad-svg {
          max-height: 98px !important;
        }
      }
      /* ===== End Peg & Pint stronger board-fill override ===== */

      /* ===== Peg & Pint host voice control override ===== */
      .pp-seat-settings-grid label:first-child {
        grid-column: 1 / -1 !important;
      }
      /* ===== End Peg & Pint host voice control override ===== */

      /* ===== Peg & Pint controls strip above transcript override ===== */
      .pp-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        grid-template-areas:
          "controls"
          "transcript"
          "table" !important;
        gap: 6px !important;
        align-items: stretch !important;
      }

      .pp-controls-bottom {
        grid-area: controls !important;
        order: 0 !important;
        margin: 0 !important;
        padding: 5px 8px !important;
        align-self: stretch !important;
      }

      .pp-controls-bottom h2 {
        display: none !important;
      }

      .pp-controls-bottom .pp-settings {
        display: grid !important;
        grid-template-columns: max-content max-content max-content minmax(520px, 1fr) minmax(140px, 0.22fr) !important;
        align-items: center !important;
        gap: 6px 10px !important;
        font-size: 11px !important;
      }

      .pp-controls-bottom .pp-settings > label {
        white-space: nowrap !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(100px, 1fr)) !important;
        gap: 5px !important;
        align-items: end !important;
        width: 100% !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label,
      .pp-controls-bottom .pp-seat-settings-grid label:first-child {
        grid-column: auto !important;
        display: grid !important;
        gap: 2px !important;
        font-size: 10px !important;
        white-space: normal !important;
      }

      .pp-controls-bottom .pp-select {
        padding: 4px 6px !important;
        font-size: 10px !important;
        border-radius: 8px !important;
      }

      .pp-controls-bottom input[type="range"] {
        width: 120px !important;
      }

      .pp-controls-bottom .pp-status {
        grid-column: 1 / -1 !important;
        min-height: 12px !important;
        margin: 0 !important;
        font-size: 10px !important;
        line-height: 1.1 !important;
      }

      .pp-transcript-top {
        grid-area: transcript !important;
        order: 1 !important;
      }

      .pp-main-table-card {
        grid-area: table !important;
        order: 2 !important;
      }

      .pp-transcript-top .pp-panel {
        min-height: 150px !important;
      }

      .pp-transcript-top .pp-log {
        min-height: 95px !important;
        max-height: 150px !important;
      }

      @media (max-width: 1150px) {
        .pp-controls-bottom .pp-settings {
          grid-template-columns: repeat(3, max-content) 1fr !important;
        }

        .pp-controls-bottom .pp-seat-settings-grid {
          grid-column: 1 / -1 !important;
          grid-template-columns: repeat(2, minmax(120px, 1fr)) !important;
        }

        .pp-controls-bottom .pp-settings > label:last-of-type {
          grid-column: 1 / -1 !important;
        }
      }
      /* ===== End Peg & Pint controls strip above transcript override ===== */

      /* ===== Peg & Pint played rows under hands override ===== */
      .pp-played-row {
        margin-top: 5px !important;
        padding: 4px 5px !important;
        border-radius: 10px !important;
        border: 1px solid rgba(253, 230, 138, 0.14) !important;
        background: rgba(12, 6, 3, 0.24) !important;
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .pp-played-label {
        color: #fed7aa !important;
        font-size: 10px !important;
        font-weight: 850 !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        white-space: nowrap !important;
      }

      .pp-played-cards {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 3px !important;
        overflow-x: auto !important;
        min-width: 0 !important;
      }

      .pp-played-cards .pp-playing-card,
      .pp-played-card {
        width: 25px !important;
        height: 34px !important;
        font-size: 10px !important;
        border-radius: 6px !important;
        flex: 0 0 auto !important;
        opacity: 0.9 !important;
      }

      .pp-played-empty {
        color: rgba(253, 230, 138, 0.62) !important;
        font-size: 10px !important;
        font-style: italic !important;
        white-space: nowrap !important;
      }
      /* ===== End Peg & Pint played rows under hands override ===== */

      /* ===== Peg & Pint user talk input override ===== */
      .pp-user-talk-box {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        gap: 6px !important;
        align-items: center !important;
        margin-top: 6px !important;
      }

      .pp-user-talk-input {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        border-radius: 10px !important;
        border: 1px solid rgba(253, 230, 138, 0.24) !important;
        background: rgba(12, 6, 3, 0.55) !important;
        color: #fff7ed !important;
        padding: 7px 9px !important;
        font-size: 12px !important;
        outline: none !important;
      }

      .pp-user-talk-input::placeholder {
        color: rgba(253, 230, 138, 0.58) !important;
      }

      .pp-user-talk-input:focus {
        border-color: rgba(253, 230, 138, 0.55) !important;
        box-shadow: 0 0 0 2px rgba(253, 230, 138, 0.13) !important;
      }
      /* ===== End Peg & Pint user talk input override ===== */

      /* ===== Peg & Pint hide transcript title override ===== */
      .pp-transcript-top h2 {
        display: none !important;
      }

      .pp-transcript-top .pp-panel {
        padding-top: 6px !important;
        padding-bottom: 7px !important;
        min-height: 132px !important;
      }

      .pp-transcript-top .pp-log {
        min-height: 92px !important;
        max-height: 145px !important;
      }
      /* ===== End Peg & Pint hide transcript title override ===== */

      /* ===== Peg & Pint user card choice override ===== */
      .pp-card-button {
        appearance: none !important;
        cursor: pointer !important;
        padding: 0 !important;
      }

      .pp-card-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 0 2px rgba(253, 230, 138, 0.28), 0 10px 18px rgba(0, 0, 0, 0.28) !important;
      }

      .pp-card-button.selected {
        box-shadow: 0 0 0 2px #fde68a, 0 0 18px rgba(253, 230, 138, 0.45) !important;
        transform: translateY(-2px);
      }

      .pp-user-action-row {
        margin-top: 5px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        color: #fde68a !important;
        font-size: 10px !important;
        line-height: 1.15 !important;
      }
      /* ===== End Peg & Pint user card choice override ===== */

      /* ===== Peg & Pint teaching mode override ===== */
      .pp-teacher-line {
        display: inline-block !important;
        color: #d9f99d !important;
        background: rgba(22, 101, 52, 0.18) !important;
        border: 1px solid rgba(190, 242, 100, 0.18) !important;
        border-radius: 10px !important;
        padding: 4px 7px !important;
      }

      .pp-controls-bottom .pp-settings {
        grid-template-columns: max-content max-content max-content max-content minmax(520px, 1fr) minmax(140px, 0.22fr) !important;
      }
      /* ===== End Peg & Pint teaching mode override ===== */

      /* ===== Peg & Pint teach voice override ===== */
      .pp-controls-bottom .pp-settings {
        grid-template-columns: max-content max-content max-content max-content max-content minmax(480px, 1fr) minmax(130px, 0.22fr) !important;
      }
      /* ===== End Peg & Pint teach voice override ===== */

      /* ===== Peg & Pint two-line toggles override ===== */
      .pp-controls-bottom .pp-settings {
        display: grid !important;
        grid-template-columns: repeat(3, max-content) minmax(0, 1fr) minmax(120px, 0.22fr) !important;
        grid-auto-flow: row !important;
        align-items: center !important;
        gap: 4px 10px !important;
      }

      .pp-controls-bottom .pp-settings > label:nth-child(1),
      .pp-controls-bottom .pp-settings > label:nth-child(2),
      .pp-controls-bottom .pp-settings > label:nth-child(3) {
        grid-row: 1 !important;
        white-space: nowrap !important;
      }

      .pp-controls-bottom .pp-settings > label:nth-child(4),
      .pp-controls-bottom .pp-settings > label:nth-child(5) {
        grid-row: 2 !important;
        white-space: nowrap !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid {
        grid-column: 4 / 5 !important;
        grid-row: 1 / span 2 !important;
        align-self: stretch !important;
      }

      .pp-controls-bottom .pp-settings > label:last-child {
        grid-column: 5 / 6 !important;
        grid-row: 1 / span 2 !important;
        align-self: center !important;
      }

      @media (max-width: 1100px) {
        .pp-controls-bottom .pp-settings {
          grid-template-columns: repeat(3, max-content) 1fr !important;
        }

        .pp-controls-bottom .pp-seat-settings-grid {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }

        .pp-controls-bottom .pp-settings > label:last-child {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
      }
      /* ===== End Peg & Pint two-line toggles override ===== */

      /* ===== Peg & Pint top-left toggle two-line grid ===== */
      #peg-pint-app-root .pp-toolbar [data-pp-toggle],
      #peg-pint-app-root .pp-topbar [data-pp-toggle],
      #peg-pint-app-root .pp-controls [data-pp-toggle],
      #peg-pint-app-root .pp-header-controls [data-pp-toggle],
      #peg-pint-app-root [data-pp-toggle] {
        min-width: 86px !important;
        justify-content: center !important;
      }

      #peg-pint-app-root .pp-toolbar:has([data-pp-toggle]),
      #peg-pint-app-root .pp-topbar:has([data-pp-toggle]),
      #peg-pint-app-root .pp-controls:has([data-pp-toggle]),
      #peg-pint-app-root .pp-header-controls:has([data-pp-toggle]) {
        display: grid !important;
        grid-template-columns: repeat(3, max-content) !important;
        grid-auto-rows: min-content !important;
        gap: 6px 8px !important;
        align-items: center !important;
        justify-content: start !important;
      }
      /* ===== End Peg & Pint top-left toggle two-line grid ===== */

      /* ===== Peg & Pint exact toggle-row two-line grid ===== */
      #peg-pint-app-root .pp-controls-bottom .pp-toggle-row {
        display: grid !important;
        grid-template-columns: repeat(4, max-content) !important;
        grid-auto-rows: min-content !important;
        gap: 6px 8px !important;
        align-items: center !important;
        justify-content: start !important;
        width: max-content !important;
        max-width: 560px !important;
      }

      #peg-pint-app-root .pp-controls-bottom .pp-toggle-row .pp-toggle {
        min-width: 88px !important;
        width: max-content !important;
        white-space: nowrap !important;
        justify-content: center !important;
      }
      /* ===== End Peg & Pint exact toggle-row two-line grid ===== */



      /* ===== Peg & Pint two-line toggle cleanup ===== */
      .pp-settings-row,
      .pp-toggle-row,
      .pp-toggles,
      .pp-check-row,
      .pp-audio-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px 10px !important;
        align-items: center !important;
      }

      .pp-settings-row label,
      .pp-toggle-row label,
      .pp-toggles label,
      .pp-check-row label,
      .pp-audio-row label {
        flex: 0 0 calc(50% - 10px) !important;
        max-width: calc(50% - 10px) !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
      }

      .pp-settings-row input[type="checkbox"],
      .pp-toggle-row input[type="checkbox"],
      .pp-toggles input[type="checkbox"],
      .pp-check-row input[type="checkbox"],
      .pp-audio-row input[type="checkbox"] {
        margin-right: 5px !important;
      }
      /* ===== End Peg & Pint two-line toggle cleanup ===== */


      /* ===== Peg & Pint player voice row layout override ===== */
      .pp-controls-bottom .pp-seat-settings-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(105px, 1fr)) !important;
        grid-template-rows: auto auto !important;
        gap: 5px 7px !important;
        align-items: end !important;
      }

      /* Row 1: table setup */
      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(1) {
        grid-column: 1 / 2 !important;
        grid-row: 1 !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(2) {
        grid-column: 2 / 3 !important;
        grid-row: 1 !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(3) {
        grid-column: 3 / 5 !important;
        grid-row: 1 !important;
      }

      /* Row 2: player pair controls */
      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(4) {
        grid-column: 1 / 2 !important;
        grid-row: 2 !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(5) {
        grid-column: 2 / 3 !important;
        grid-row: 2 !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(6) {
        grid-column: 3 / 4 !important;
        grid-row: 2 !important;
      }

      .pp-controls-bottom .pp-seat-settings-grid label:nth-child(7) {
        grid-column: 4 / 5 !important;
        grid-row: 2 !important;
      }

      @media (max-width: 1100px) {
        .pp-controls-bottom .pp-seat-settings-grid {
          grid-template-columns: repeat(2, minmax(120px, 1fr)) !important;
          grid-template-rows: auto !important;
        }

        .pp-controls-bottom .pp-seat-settings-grid label:nth-child(n) {
          grid-column: auto !important;
          grid-row: auto !important;
        }
      }
      /* ===== End Peg & Pint player voice row layout override ===== */

    `;

    document.head.appendChild(style);
  }


  function ppStylePauseButton() {
    const button = document.getElementById("pp-pause-game");
    if (!button) return;

    button.setAttribute("aria-pressed", state.paused ? "true" : "false");

    if (state.paused) {
      button.style.setProperty("background", "linear-gradient(180deg, rgba(92, 28, 12, 0.98), rgba(39, 12, 6, 0.98))", "important");
      button.style.setProperty("border-color", "rgba(251, 191, 36, 1)", "important");
      button.style.setProperty("color", "#fff7d6", "important");
      button.style.setProperty("box-shadow", "inset 0 3px 8px rgba(0,0,0,.65), 0 0 12px rgba(251,191,36,.22)", "important");
      button.style.setProperty("transform", "translateY(1px)", "important");
      button.style.setProperty("filter", "brightness(.92)", "important");
    } else {
      ["background", "border-color", "color", "box-shadow", "transform", "filter"].forEach((prop) => {
        button.style.removeProperty(prop);
      });
    }
  }


  function ppEnsureCelebrationStyle() {
    if (document.getElementById("pp-celebration-style")) return;

    const style = document.createElement("style");
    style.id = "pp-celebration-style";
    style.textContent = `
      .pp-confetti-layer {
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 9998;
      }

      .pp-confetti-piece {
        position: fixed;
        top: -24px;
        width: 10px;
        height: 18px;
        border-radius: 3px;
        opacity: .98;
        will-change: transform, opacity;
        animation-name: pp-confetti-fall;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }

      .pp-win-banner {
        position: fixed;
        left: 50%;
        top: 88px;
        transform: translateX(-50%);
        z-index: 9999;
        pointer-events: none;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(251, 191, 36, 0.96);
        background: rgba(67, 20, 7, 0.96);
        color: #fff7d6;
        font-weight: 800;
        letter-spacing: .01em;
        box-shadow: 0 8px 24px rgba(0,0,0,.28);
        animation: pp-win-pop .22s ease-out;
        white-space: nowrap;
      }

      @keyframes pp-confetti-fall {
        0% {
          transform: translate3d(0, -20px, 0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate3d(var(--pp-drift, 0px), 100vh, 0) rotate(var(--pp-rot, 540deg));
          opacity: 0;
        }
      }

      @keyframes pp-win-pop {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(-8px) scale(.96);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ppLaunchConfetti() {
    ppEnsureCelebrationStyle();

    const oldLayer = document.querySelector(".pp-confetti-layer");
    if (oldLayer) oldLayer.remove();

    const oldBanner = document.querySelector(".pp-win-banner");
    if (oldBanner) oldBanner.remove();

    const layer = document.createElement("div");
    layer.className = "pp-confetti-layer";

    const banner = document.createElement("div");
    banner.className = "pp-win-banner";
    banner.textContent = `🎉 ${state.winnerName || "Winner"} wins with ${state.winnerScore || 121} points!`;
    document.body.appendChild(banner);

    const colors = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f97316", "#eab308", "#14b8a6"];

    for (let i = 0; i < 120; i++) {
      const piece = document.createElement("span");
      piece.className = "pp-confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 12}px`;
      piece.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      piece.style.setProperty("--pp-drift", `${-160 + Math.random() * 320}px`);
      piece.style.setProperty("--pp-rot", `${-720 + Math.random() * 1440}deg`);
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);

    setTimeout(() => {
      if (layer.parentNode) layer.remove();
      if (banner.parentNode) banner.remove();
    }, 4800);
  }

  function ppMaybeCelebrateWinner() {
    if (!state.gameOver || state.celebrationPlayed) return;
    state.celebrationPlayed = true;
    requestAnimationFrame(() => ppLaunchConfetti());
  }

  function setStatus(text) {
    state.lastAction = text || "";
    const el = document.querySelector("#peg-pint-status");
    if (el) el.textContent = state.lastAction;
  }

  function playTableSound(kind = "tap") {
    if (!settings.soundEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const tones = {
        deal: [330, 0.055],
        peg: [520, 0.07],
        score: [660, 0.09],
        stop: [180, 0.055],
        tap: [260, 0.045]
      };

      const [freq, duration] = tones[kind] || tones.tap;
      osc.frequency.value = freq;
      osc.type = "triangle";

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, settings.volume || 0.3), ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch (err) {}
  }

  function stopLocalAudio() {
    if (state.audio) {
      try {
        state.audio.pause();
        state.audio.src = "";
      } catch (err) {}
      state.audio = null;
    }

    if (state.objectUrl) {
      try {
        URL.revokeObjectURL(state.objectUrl);
      } catch (err) {}
      state.objectUrl = "";
    }
  }

  async function stopSpeaking(options = {}) {
    const force = !!(options && options.force);
    const quiet = !!(options && options.quiet);
    const clearQueue = force || !!(options && options.clearQueue);

    if (clearQueue && typeof ppClearVoiceQueue === "function") {
      ppClearVoiceQueue();
    }

    const hadAudio = !!(state.audio && !state.audio.paused);
    const hadObjectUrl = !!state.objectUrl;
    const hadController = !!state.abortController;
    const wasSpeaking = !!state.speaking;
    const browserSpeaking = !!(
      window.speechSynthesis &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending)
    );
    const shouldStopRemote = force || hadAudio || hadObjectUrl || hadController || wasSpeaking || browserSpeaking;

    state.speaking = false;

    if (state.abortController) {
      try {
        state.abortController.abort();
      } catch (err) {}
      state.abortController = null;
    }

    stopLocalAudio();

    try {
      if (force || browserSpeaking) window.speechSynthesis.cancel();
    } catch (err) {}

    if (shouldStopRemote) {
      try {
        await fetch("/api/tts/stop", {
          method: "POST",
          credentials: "same-origin",
          headers: csrfHeaders()
        });
      } catch (err) {}
    }

    if (!quiet && (force || shouldStopRemote)) {
      playTableSound("stop");
      setStatus("Voice stopped.");
    }
  }

  function splitText(text, maxLen = 360) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return [];

    const chunks = [];
    let rest = raw;

    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(". ", maxLen);
      if (cut < 120) cut = rest.lastIndexOf(", ", maxLen);
      if (cut < 120) cut = rest.lastIndexOf(" ", maxLen);
      if (cut < 120) cut = maxLen;

      chunks.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }

    if (rest) chunks.push(rest);
    return chunks;
  }

  async function playAudioBlob(blob) {
    stopLocalAudio();

    if (!blob || blob.size < 32) {
      throw new Error("Empty Sapphire audio.");
    }

    const url = URL.createObjectURL(blob);
    state.objectUrl = url;

    const audio = new Audio(url);
    state.audio = audio;

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(new Error("Audio playback failed."));
      audio.play().catch((err) => reject(err));
    });
  }

  async function speakWithSapphire(text, voiceId = "") {
    const chunks = splitText(text);
    if (!chunks.length) return;

    await stopSpeaking({ quiet: true });
    state.speaking = true;

    for (let i = 0; i < chunks.length; i += 1) {
      if (!state.speaking) return;

      const controller = new AbortController();
      state.abortController = controller;
      setStatus(`Voice reading… ${i + 1}/${chunks.length}`);

      const res = await fetch("/api/tts/preview", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          text: chunks[i],
          voice: voiceId || undefined,
          speed: 1.0
        })
      });

      if (!res.ok) {
        throw new Error(`Sapphire TTS failed (${res.status}).`);
      }

      const blob = await res.blob();
      await playAudioBlob(blob);
    }

    state.speaking = false;
    state.abortController = null;
    setStatus("Voice finished.");
  }

  function speakWithBrowser(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus("Voice is not available in this browser.");
      return;
    }

    const chunks = splitText(text);
    if (!chunks.length) return;

    try {
      window.speechSynthesis.cancel();
    } catch (err) {}

    state.speaking = true;
    let idx = 0;

    const next = () => {
      if (!state.speaking) return;

      if (idx >= chunks.length) {
        state.speaking = false;
        setStatus("Browser voice finished.");
        return;
      }

      setStatus(`Browser voice reading… ${idx + 1}/${chunks.length}`);

      const utterance = new SpeechSynthesisUtterance(chunks[idx]);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        idx += 1;
        next();
      };
      utterance.onerror = () => {
        state.speaking = false;
        setStatus("Browser voice stopped.");
      };

      window.speechSynthesis.speak(utterance);
    };

    next();
  }

  function ppPrepareSpeechForTts(text) {
    return String(text || "")
      .replace(/\barithmetic\b/gi, "math")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function ppSpeakTextImmediate(text, voiceId = "") {
    text = ppPrepareSpeechForTts(text);

    if (!settings.voiceEnabled) {
      setStatus("Voice is off. Turn on Voice to hear narration.");
      return;
    }

    try {
      await speakWithSapphire(text, voiceId);
    } catch (err) {
      console.warn("Peg & Pint Sapphire voice failed.", err);

      // Browser fallback ignores Sapphire/Kokoro voice choices and can hang on
      // "Browser voice reading…", so do not let it stall the table.
      state.speaking = false;
      state.abortController = null;

      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      setStatus("Sapphire voice unavailable; game continues.");
      return;
    }
  }

  function ppClearVoiceQueue() {
    ppVoiceQueue = [];
    ppVoiceQueueGeneration += 1;
  }

  function ppVoiceQueueLabel() {
    const count = ppVoiceQueue.length;
    return count ? `Voice queue: ${count} line${count === 1 ? "" : "s"} waiting…` : "";
  }

  async function ppDrainVoiceQueue() {
    if (ppVoiceQueueRunning) return;

    ppVoiceQueueRunning = true;
    const generation = ppVoiceQueueGeneration;

    try {
      while (ppVoiceQueue.length && generation === ppVoiceQueueGeneration) {
        const job = ppVoiceQueue.shift();

        try {
          if (job.label) setStatus(job.label);
          await ppSpeakTextImmediate(job.text, job.voiceId || "");
          if (typeof job.resolve === "function") job.resolve(true);
        } catch (err) {
          console.warn("Peg & Pint queued voice line failed.", err);
          if (typeof job.resolve === "function") job.resolve(false);
        }

        if (generation !== ppVoiceQueueGeneration) break;

        // Tiny breath between lines so Kokoro/Sapphire is not hammered.
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
    } finally {
      ppVoiceQueueRunning = false;

      if (ppVoiceQueue.length && generation === ppVoiceQueueGeneration) {
        setTimeout(ppDrainVoiceQueue, 0);
      }
    }
  }

  async function speakText(text, voiceId = "", options = {}) {
    if (!settings.voiceEnabled) {
      setStatus("Voice is off. Turn on Voice to hear narration.");
      return false;
    }

    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return false;

    if (options.immediate) {
      return ppSpeakTextImmediate(clean, voiceId || "");
    }

    return new Promise((resolve) => {
      ppVoiceQueue.push({
        text: clean,
        voiceId: voiceId || "",
        label: options.label || ppVoiceQueueLabel(),
        resolve
      });

      if (ppVoiceQueue.length > 1) {
        setStatus(ppVoiceQueueLabel());
      }

      ppDrainVoiceQueue();
    });
  }


  function updateScores(deltaLeft = 0, deltaRight = 0) {
    state.scoreLeft = Math.max(0, Math.min(121, state.scoreLeft + deltaLeft));
    state.scoreRight = Math.max(0, Math.min(121, state.scoreRight + deltaRight));
  }

  function cardHtml(card, extraClass = "") {
    const label = typeof ppCardLabel === "function" ? ppCardLabel(card) : String(card || "");
    return `<div class="pp-playing-card ${extraClass}">${label}</div>`;
  }

  function ppPersonaName(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.name || item.display_name || item.label || item.id || "";
  }

  function ppPersonaChoices() {
    const loaded = (state.personas || []).map(ppPersonaName).filter(Boolean);
    const combined = [...loaded, ...PP_PLAYER_CHOICES];

    return Array.from(new Set(combined))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  function ppSeatNote(name = "") {
    const key = String(name || "").toLowerCase();

    const notes = {
      elias: "Poetic, sly, mystical, and dangerous when the count reaches fifteen.",
      riley: "Sharp, skeptical, and entirely too pleased when the math behaves.",
      dawn: "Calm, luminous, perceptive, and quietly uncanny at the table.",
      fox: "Wary, clever, suspicious, and watching every card like evidence.",
      einstein: "Playful, brilliant, curious, and probably counting in spacetime.",
      claude: "Thoughtful, careful, courteous, and quietly strategic.",
      "info sage": "Warm, clever, cosmic, and mischievous enough for cribbage.",
      "the pub shark": "Charming, jovial, ruthless, and suspiciously good at counting."
    };

    if (notes[key]) return notes[key];

    const loaded = (state.personas || []).find((item) => {
      const itemName = ppPersonaName(item);
      return String(itemName || "").toLowerCase() === key;
    });

    if (loaded && typeof loaded === "object") {
      const text = loaded.summary || loaded.description || loaded.tagline || loaded.role || "";
      if (text) {
        const clean = String(text).replace(/\s+/g, " ").trim();
        return clean.length > 120 ? clean.slice(0, 117).trim() + "…" : clean;
      }
    }

    return "Ready at the table, personality unfolding as the cards move.";
  }

  function ppUserName() {
    return String(settings.userName || "").trim() || "You";
  }

  function ppEscapeAttr(text = "") {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ppIsUserMode() {
    return settings.playMode === "user";
  }

  function ppIsUserSide(side = "") {
    return ppIsUserMode() && side === "left";
  }

  function ppEnsureModeSeat() {
    if (ppIsUserMode()) {
      state.leftPersona = ppUserName();
      settings.leftPersona = ppUserName();
    }
  }

  function ppCurrentModeLabel() {
    return ppIsUserMode() ? "You vs Persona" : "Watch Match";
  }

  function ppDealerName() {
    if (Number(state.dealNumber || 0) === 0 && state.needsDealCut !== false && !state.dealCutWinnerSide) {
      return "—";
    }
    return state.dealerSide === "right" ? state.rightPersona : state.leftPersona;
  }

  function ppPoneSide() {
    return state.dealerSide === "left" ? "right" : "left";
  }

  function ppPoneName() {
    return ppPoneSide() === "right" ? state.rightPersona : state.leftPersona;
  }

  function ppSetDealerSide(side = "left") {
    state.dealerSide = side === "right" ? "right" : "left";
    state.cribOwner = ppDealerName();
  }

  function ppRotateDealer() {
    ppSetDealerSide(state.dealerSide === "left" ? "right" : "left");
  }

  function ppCribOwnerLine() {
    state.cribOwner = ppDealerName();
    const owner = state.cribOwner || state.leftPersona || "the dealer";
    const isYou = typeof ppIsUserMode === "function" && ppIsUserMode() && typeof ppUserName === "function" && owner === ppUserName();
    return `Crib this round: ${owner}${isYou ? " — your crib" : ""}`;
  }


  function renderModeOptions() {
    const mode = settings.playMode || "watch";
    return [
      `<option value="watch" ${mode === "watch" ? "selected" : ""}>Watch Match</option>`,
      `<option value="user" ${mode === "user" ? "selected" : ""}>You vs Persona</option>`
    ].join("");
  }


  function ppPersonaCanonicalMap() {
    const map = new Map();

    (state.personas || []).forEach((item) => {
      const name = typeof ppPersonaName === "function"
        ? ppPersonaName(item)
        : (item && (item.name || item.id || item.key)) || "";

      const clean = String(name || "").trim();
      const key = clean.toLowerCase();

      if (key && clean && !map.has(key)) {
        map.set(key, clean);
      }
    });

    return map;
  }

  function ppCanonicalPersonaDisplay(name = "") {
    const clean = String(name || "").trim();
    if (!clean) return "";

    const canonical = ppPersonaCanonicalMap();
    return canonical.get(clean.toLowerCase()) || clean;
  }

  function ppDedupePersonaNames(names = []) {
    const canonical = ppPersonaCanonicalMap();
    const picked = new Map();

    (names || []).forEach((name) => {
      const raw = String(name || "").trim();
      if (!raw) return;

      const key = raw.toLowerCase();
      const preferred = canonical.get(key) || raw;

      if (!picked.has(key)) {
        picked.set(key, preferred);
        return;
      }

      // Prefer the real Sapphire persona spelling over Peg & Pint fallback spelling.
      if (canonical.has(key)) {
        picked.set(key, preferred);
      }
    });

    return Array.from(picked.values());
  }


  function renderPlayerOptions(selected) {
    const current = ppCanonicalPersonaDisplay(selected || "");
    const base = ppDedupePersonaNames(ppPersonaChoices());
    const choices = ppDedupePersonaNames(base.includes(current)
      ? base
      : [current, ...base].filter(Boolean));

    return choices.map((name) => {
      return `<option value="${name}" ${name === current ? "selected" : ""}>${name}</option>`;
    }).join("");
  }

  function ppRefreshPersonaSelects() {
    const left = document.getElementById("pp-left-persona");
    const right = document.getElementById("pp-right-persona");

    if (left) left.innerHTML = renderPlayerOptions(state.leftPersona);
    if (right) right.innerHTML = renderPlayerOptions(state.rightPersona);
  }

  async function ppLoadSapphirePersonas() {
    if (state.personasLoaded || state.personasLoading) return;

    state.personasLoading = true;

    try {
      const res = await fetch("/api/personas", {
        method: "GET",
        credentials: "same-origin",
        headers: csrfHeaders()
      });

      if (!res.ok) throw new Error(`personas ${res.status}`);

      const data = await res.json();
      const personas = Array.isArray(data.personas) ? data.personas : [];

      state.personas = personas;
      state.personasLoaded = true;
      ppRefreshPersonaSelects();

      if (personas.length) {
        setStatus(`Loaded ${personas.length} Sapphire personas.`);
      }
    } catch (err) {
      console.warn("Peg & Pint persona list unavailable.", err);
      setStatus("Persona list unavailable; using Peg & Pint fallback players.");
    } finally {
      state.personasLoading = false;
    }
  }

  function ppVoiceId(voice) {
    if (!voice) return "";
    return voice.voice_id || voice.id || voice.name || "";
  }

  function ppVoiceLabel(voice) {
    if (!voice) return "Default Sapphire voice";
    const id = ppVoiceId(voice);
    return `${voice.name || id}${voice.category ? " — " + voice.category : ""}`;
  }

  function renderVoiceOptions(selected) {
    const voices = state.ttsVoices || [];
    const current = selected || "";
    const options = [`<option value="" ${current ? "" : "selected"}>Default Sapphire voice</option>`];

    voices.forEach((voice) => {
      const id = ppVoiceId(voice);
      if (!id) return;
      options.push(`<option value="${id}" ${id === current ? "selected" : ""}>${ppVoiceLabel(voice)}</option>`);
    });

    return options.join("");
  }

  function ppRefreshVoiceSelects() {
    const host = document.getElementById("pp-host-voice");
    const left = document.getElementById("pp-left-voice");
    const right = document.getElementById("pp-right-voice");

    if (host) host.innerHTML = renderVoiceOptions(settings.hostVoice || "");
    if (left) left.innerHTML = renderVoiceOptions(settings.leftVoice || "");
    if (right) right.innerHTML = renderVoiceOptions(settings.rightVoice || "");
  }

  async function ppLoadSapphireVoices() {
    if (state.ttsVoicesLoaded || state.ttsVoicesLoading) return;

    state.ttsVoicesLoading = true;

    try {
      const res = await fetch("/api/tts/voices", {
        method: "GET",
        credentials: "same-origin",
        headers: csrfHeaders()
      });

      if (!res.ok) throw new Error(`voices ${res.status}`);

      const data = await res.json();
      state.ttsVoices = Array.isArray(data.voices) ? data.voices : [];
      state.voiceProvider = data.provider || "";
      state.ttsVoicesLoaded = true;
      ppRefreshVoiceSelects();

      if (state.ttsVoices.length) {
        setStatus(`Voices loaded${state.voiceProvider ? " · " + state.voiceProvider : ""}.`);
      }
    } catch (err) {
      console.warn("Peg & Pint voice list unavailable.", err);
      setStatus("Voice choices unavailable; default voice still works.");
    } finally {
      state.ttsVoicesLoading = false;
    }
  }

  function ppEscapeHtml(text = "") {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderUserTalkBox() {
    if (!ppIsUserMode()) return "";

    return `
      <div class="pp-user-talk-box">
        <input
          id="pp-user-talk"
          class="pp-user-talk-input"
          type="text"
          placeholder="Say something at the table..."
          autocomplete="off"
        />
        <button class="pp-btn secondary pp-say-btn" data-pp-action="user-talk">Say</button>
      </div>
    `;
  }

  function renderHand(cards) {
    return (cards || []).map((card) => cardHtml(card)).join("");
  }

  function renderHiddenHand(cards, label = "Hidden cards") {
    const count = (cards || []).length;
    if (!count) return "";

    const safeLabel = typeof ppEscapeAttr === "function"
      ? ppEscapeAttr(label)
      : "Hidden cards";

    return Array.from({ length: count }, () =>
      `<div class="pp-playing-card pp-card-back" title="${safeLabel}" aria-label="${safeLabel}"><span class="pp-card-back-mark">✦</span></div>`
    ).join("");
  }

  function renderCribCards() {
    const crib = state.cribCards || [];

    if (ppIsUserMode() && !state.handsScored) {
      return renderHiddenHand(crib, "Crib hidden until scoring");
    }

    return renderHand(crib);
  }

  function renderPlayedPile(cards) {
    const list = cards || [];

    if (!list.length) {
      return `<span class="pp-played-empty">No pegged cards yet.</span>`;
    }

    return list.map((card) => cardHtml(card, "pp-played-card")).join("");
  }

  function renderSeatHand(side) {
    const hand = side === "left" ? state.leftHand : state.rightHand;


    if (ppIsUserMode() && side === "right" && !state.handsScored) {
      return renderHiddenHand(hand, `${state.rightPersona} hand hidden`);
    }

    if (!ppIsUserSide(side)) {
      return renderHand(hand);
    }

    const canChooseDiscards = state.phase === "Dealt" && hand && hand.length === 6;
    const canPeg = state.cutCard && state.cutCard !== "—" && hand && hand.length && !state.handsScored;
    const selected = new Set(state.userDiscardSelection || []);

    return (hand || []).map((card, index) => {
      const selectedClass = selected.has(index) ? " selected" : "";
      const action = canChooseDiscards
        ? `data-pp-action="user-discard-card" data-pp-index="${index}"`
        : canPeg
          ? `data-pp-action="user-peg-card" data-pp-index="${index}"`
          : "";

      return `<button class="pp-playing-card pp-card-button${selectedClass}" ${action}>${ppCardLabel(card)}</button>`;
    }).join("");
  }

  function renderUserSeatControls(side) {
    if (!ppIsUserSide(side)) return "";

    if (state.phase === "Dealt" && state.leftHand && state.leftHand.length === 6) {
      const count = (state.userDiscardSelection || []).length;
      return `
        <div class="pp-user-action-row">
          <span>${ppCribOwnerLine()} · Choose 2 cards: ${count}/2</span>
          <button class="pp-btn secondary pp-confirm-discard-btn" data-pp-action="confirm-user-discard">Confirm Discards</button>
        </div>
      `;
    }

    if (state.cutCard && state.cutCard !== "—" && !state.handsScored && !ppBothHandsEmpty()) {
      const leftCanPeg = ppFindLegalPegCard(state.leftHand || []) >= 0;

      if (state.pegTurn === "left" && leftCanPeg) {
        return `
          <div class="pp-user-action-row">
            <span>Your turn: click a legal card in your hand.</span>
          </div>
        `;
      }

      if (state.pegTurn === "left" && !leftCanPeg) {
        const goText = (state.leftHand || []).length
          ? "You cannot play without going over 31."
          : "You are out of cards.";

        return `
          <div class="pp-user-action-row">
            <span>${goText}</span>
            <button class="pp-btn secondary pp-go-btn" data-pp-action="user-go">Go</button>
          </div>
        `;
      }

      return `
        <div class="pp-user-action-row">
          <span>${state.rightPersona}'s turn: click Peg Step for the persona.</span>
        </div>
      `;
    }

    return "";
  }

  function renderCutCardDisplay() {
    if (state.cutCard && state.cutCard !== "—") {
      return cardHtml(state.cutCard, "pp-cut-card");
    }

    return `<div class="pp-playing-card pp-card-placeholder">?</div>`;
  }

  function renderMiniCards(cards) {
    return (cards || []).map((card) => `<span>${typeof ppCardLabel === "function" ? ppCardLabel(card) : String(card || "")}</span>`).join(" ");
  }

  function renderSnakeBoard() {
    /*
      Traditional long board, tuned closer to the real look:
      - long outer run across the top
      - big right curve
      - long bottom run back
      - smaller inner return curve on the left
      - inner home stretch / finish run
      - evenly spaced peg holes by actual path distance
    */
    const total = 121;
    const width = 760;
    const height = 150;
    const viewX = 24;
    const viewWidth = 712;

    const leftScore = Math.max(0, Math.min(120, Number(state.scoreLeft || 0)));
    const rightScore = Math.max(0, Math.min(120, Number(state.scoreRight || 0)));

    // Geometry
    const xStart = 42;
    const xRight = 712;
    const xInnerLeft = 108;
    const xInnerRight = 678;

    const yTop = 32;
    const yBottom = 116;
    const yInner = 76;

    const outerBulge = 20;   // big right-hand curve
    const innerBulge = 16;   // smaller left return curve
    const laneOffset = 5.2;  // distance between the two player tracks

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function dist(a, b) {
      return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function linePoints(x1, y1, x2, y2, steps) {
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        return {
          x: lerp(x1, x2, t),
          y: lerp(y1, y2, t)
        };
      });
    }

    function curvePointsRight(xBase, y1, y2, bulge, steps) {
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        return {
          x: xBase + bulge * Math.sin(Math.PI * t),
          y: lerp(y1, y2, t)
        };
      });
    }

    function curvePointsLeft(xBase, y1, y2, bulge, steps) {
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        return {
          x: xBase - bulge * Math.sin(Math.PI * t),
          y: lerp(y1, y2, t)
        };
      });
    }

    function mergePoints(target, pts) {
      if (!target.length) return pts.slice();
      return target.concat(pts.slice(1));
    }

    function buildDensePath() {
      let pts = [];

      // Top run: start -> right
      pts = mergePoints(pts, linePoints(xStart, yTop, xRight, yTop, 170));

      // Big outer right curve: top -> bottom
      pts = mergePoints(pts, curvePointsRight(xRight, yTop, yBottom, outerBulge, 80));

      // Bottom run: right -> left
      pts = mergePoints(pts, linePoints(xRight, yBottom, xInnerLeft, yBottom, 170));

      // Smaller inner return curve on the left: bottom -> inner finish run
      pts = mergePoints(pts, curvePointsLeft(xInnerLeft, yBottom, yInner, innerBulge, 64));

      // Inner finish run
      pts = mergePoints(pts, linePoints(xInnerLeft, yInner, xInnerRight, yInner, 145));

      return pts;
    }

    const dense = buildDensePath();

    const cumulative = [0];
    for (let i = 1; i < dense.length; i += 1) {
      cumulative.push(cumulative[i - 1] + dist(dense[i - 1], dense[i]));
    }
    const totalLength = cumulative[cumulative.length - 1];

    function sampleAtDistance(distance, offset = 0) {
      const d = Math.max(0, Math.min(totalLength, distance));

      let idx = 1;
      while (idx < cumulative.length && cumulative[idx] < d) idx += 1;

      const prevIndex = Math.max(0, idx - 1);
      const nextIndex = Math.min(dense.length - 1, idx);

      const a = dense[prevIndex];
      const b = dense[nextIndex];

      const segLength = Math.max(0.0001, cumulative[nextIndex] - cumulative[prevIndex]);
      const t = Math.max(0, Math.min(1, (d - cumulative[prevIndex]) / segLength));

      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);

      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;

      const nx = -ty / len;
      const ny = tx / len;

      return {
        x: x + nx * offset,
        y: y + ny * offset,
        nx,
        ny
      };
    }

    function offsetPolyline(offset) {
      const pts = dense.map((_, i) => {
        const a = dense[Math.max(0, i - 1)];
        const b = dense[Math.min(dense.length - 1, i + 1)];

        const tx = b.x - a.x;
        const ty = b.y - a.y;
        const len = Math.hypot(tx, ty) || 1;

        const nx = -ty / len;
        const ny = tx / len;

        return `${(dense[i].x + nx * offset).toFixed(1)},${(dense[i].y + ny * offset).toFixed(1)}`;
      });

      return pts.join(" ");
    }

    const leftTrackPoints = offsetPolyline(-laneOffset);
    const rightTrackPoints = offsetPolyline(laneOffset);

    const milestoneLabels = new Map([
      [0, "S"],
      [30, "30"],
      [60, "60"],
      [90, "90"],
      [120, "121"]
    ]);

    function labelOffsetY(index, pointY) {
      if (index >= 40 && index <= 82) return 13;   // lower labels on bottom run
      if (pointY >= 118) return 13;
      return -10;
    }

    function holeMarkup(lane, index) {
      const offset = lane === "left" ? -laneOffset : laneOffset;
      const point = sampleAtDistance((totalLength * index) / 120, offset);
      const label = milestoneLabels.get(index) || "";
      const milestone = !!label || index % 5 === 0;
      const pegHere = index === (lane === "left" ? leftScore : rightScore);
      const labelY = point.y + labelOffsetY(index, point.y);

      return `
        <g>
          <circle
            class="pp-trad-hole ${lane} ${milestone ? "milestone" : ""}"
            cx="${point.x}"
            cy="${point.y}"
            r="3.9"
          ></circle>

          ${label ? `<text class="pp-trad-label" x="${point.x}" y="${labelY}">${label}</text>` : ""}

          ${pegHere ? `<circle class="pp-trad-peg ${lane}" cx="${point.x}" cy="${point.y}" r="6.4"></circle>` : ""}
        </g>
      `;
    }

    const leftHoles = Array.from({ length: total }, (_, i) => holeMarkup("left", i)).join("");
    const rightHoles = Array.from({ length: total }, (_, i) => holeMarkup("right", i)).join("");

    return `
      <div class="pp-trad-board" aria-label="Traditional long cribbage board">
        <svg
          class="pp-trad-svg"
          viewBox="${viewX} 0 ${viewWidth} ${height}"
          role="img"
          aria-label="Traditional cribbage board with long outer track and inner finish track"
        >
          <path class="pp-trad-wood-grain" d="M56 24 C182 10, 315 37, 448 19 S630 14, 724 30"></path>
          <path class="pp-trad-wood-grain" d="M56 198 C190 177, 318 206, 452 188 S630 184, 724 198"></path>

          <polyline class="pp-trad-track left" points="${leftTrackPoints}"></polyline>
          <polyline class="pp-trad-track right" points="${rightTrackPoints}"></polyline>

          ${leftHoles}
          ${rightHoles}

          <text class="pp-trad-start-finish" x="${xStart}" y="${yTop - 18}">START</text>
          <text class="pp-trad-start-finish" x="${xInnerRight}" y="${yInner - 16}">FINISH</text>
        </svg>

        <div class="pp-trad-legend">
          <span class="pp-trad-legend-item">
            <span class="pp-trad-legend-dot left"></span>
            ${state.leftPersona}
          </span>
          <span class="pp-trad-legend-item">
            <span class="pp-trad-legend-dot right"></span>
            ${state.rightPersona}
          </span>
        </div>
      </div>
    `;
  }

  function renderHoles(score, cls) {
    const pos = Math.max(0, Math.min(11, Math.floor((score % 121) / 10)));
    return Array.from({ length: 12 }, (_, i) => `<div class="pp-hole ${i === pos ? cls : ""}"></div>`).join("");
  }

  function render(root) {
    ppEnsureModeSeat();
    root.innerHTML = `
      <div class="pp-wrap">
        <section class="pp-hero">
          <div class="pp-title-row">
            <div>
              <h1 class="pp-title">The Peg & Pint 🍺</h1>
              <p class="pp-tagline">Warm banter. Sharp cribbage. A proper table.</p>
            </div>
          </div>
        </section>

        <section class="pp-grid">
          <div class="pp-transcript-top">
            <aside class="pp-card pp-panel">
              <h2>Match Transcript</h2>
              <div class="pp-log" id="peg-pint-log">
                <p><em>Transcript will appear here as the table plays.</em></p>
              </div>
              ${renderUserTalkBox()}
            </aside>
          </div>

          <div class="pp-card pp-main-table-card">
            <h2>${ppCurrentModeLabel()} · Persona Table</h2>

            <div class="pp-table-grid">
              <div class="pp-seat">
                <div class="pp-seat-title">
                  <span class="pp-seat-name">${state.leftPersona}</span>
                  <span class="pp-seat-score">${state.scoreLeft} pts</span>
                </div>
                <div class="pp-hand" aria-label="${state.leftPersona} hand">
                  ${renderSeatHand("left")}
                </div>
                <div class="pp-played-row" aria-label="${state.leftPersona} played cards">
                  <span class="pp-played-label">Played</span>
                  <div class="pp-played-cards">${renderPlayedPile(state.leftPegPlayed)}</div>
                </div>
                ${renderUserSeatControls("left")}
                <div class="pp-deal-badge">Deal #${state.dealNumber || 0} · ${state.lastDealLabel || "No shuffle yet"}</div>
                <div class="pp-seat-note">${ppSeatNote(state.leftPersona)}</div>
              </div>

              <div class="pp-center-stack">
                <div class="pp-play-row">
                  <div class="pp-board">
                    <div class="pp-score-row">
                      <strong>${state.leftPersona}: ${state.scoreLeft}</strong>
                      <strong>${state.rightPersona}: ${state.scoreRight}</strong>
                    </div>

                    ${renderSnakeBoard()}

                    <div class="pp-score-row">
                      <span>Cut card: ${state.cutCard && state.cutCard !== "—" ? ppCardLabel(state.cutCard) : "—"}</span>
                      <span>Crib below</span>
                    </div>
                  </div>

                  <div class="pp-deck-cut-row pp-deck-cut-column" aria-label="Deck and starter card">
                    <div class="pp-card-zone">
                      <div class="pp-card-zone-label">Deck</div>
                      <div class="pp-deck-stack">${state.deck && state.deck.length ? state.deck.length : "—"}</div>
                    </div>

                    <div class="pp-card-zone pp-cut-card-slot">
                      <div class="pp-card-zone-label">Starter / Cut Card</div>
                      ${renderCutCardDisplay()}
                    </div>
                  </div>
                </div>

                <div class="pp-table-meta">
                  <span>Shuffle: ${state.dealNumber || 0}</span>
                  <span>Deck left: ${state.deck && state.deck.length ? state.deck.length : "—"}</span>
                  <span>Cut card: ${state.cutCard && state.cutCard !== "—" ? ppCardLabel(state.cutCard) : state.cutCard}</span>
                  <span>Phase: ${state.phase || "—"}</span>
                  <span>Dealer: ${ppDealerDisplayName()}</span>
                  <span>Crib owner: ${ppOpeningCutPending() ? "—" : (state.cribOwner || "—")}</span>
                  <span>First deal cut: ${typeof ppDealCutLine === "function" ? ppDealCutLine() : "Not cut yet"}</span>
                  <span>Peg count: ${state.peggingCount || 0}</span>
                  <span>Turn: ${state.pegTurn === "right" ? state.rightPersona : state.leftPersona}</span>
                  <span>${state.lastCribNote || ""}</span>
                  <span>${state.lastPegNote || ""}</span>
                  <span>${state.lastScoreNote || ""}</span>
                </div>

                <div class="pp-crib-tray" aria-label="Crib cards">
                  <span class="pp-crib-label">Crib · ${ppCribOwnerDisplay()}</span>
                  <div class="pp-crib-cards">
                    ${renderCribCards()}
                  </div>
                </div>

                <div class="pp-center-row">
                  <span class="pp-mini-label">Pegging row:</span>
                  <span>${renderMiniCards(state.pegging) || "No cards played yet."}</span>
                </div>

                <div class="pp-buttons">
                  <button class="pp-btn secondary" data-pp-action="welcome">Welcome Table</button>
                  <button class="pp-btn" data-pp-action="cut-deal">First Cut</button>
                  <button class="pp-btn" data-pp-action="deal">Shuffle & Deal</button>
                  <button class="pp-btn" data-pp-action="discard">Discard to Crib</button>
                  <button class="pp-btn" data-pp-action="cut">Cut Card</button>
                  <button class="pp-btn" data-pp-action="peg">Peg Step</button>
                  <button class="pp-btn" data-pp-action="score">Score Hands</button>
                  <button class="pp-btn" data-pp-action="next-round">Next Round</button>
                <button id="pp-pause-game" class="pp-btn secondary ${state.paused ? "pp-pause-active" : ""}" aria-pressed="${state.paused ? "true" : "false"}">${state.paused ? "Resume Game" : "Pause Game"}</button>
                  <button class="pp-btn secondary" data-pp-action="clear-table">End / Clear Table</button>
                </div>
              </div>

              <div class="pp-seat">
                <div class="pp-seat-title">
                  <span class="pp-seat-name">${state.rightPersona}</span>
                  <span class="pp-seat-score">${state.scoreRight} pts</span>
                </div>
                <div class="pp-hand" aria-label="${state.rightPersona} hand">
                  ${renderSeatHand("right")}
                </div>
                <div class="pp-played-row" aria-label="${state.rightPersona} played cards">
                  <span class="pp-played-label">Played</span>
                  <div class="pp-played-cards">${renderPlayedPile(state.rightPegPlayed)}</div>
                </div>
                <div class="pp-deal-badge">Deck remaining: ${state.deck && state.deck.length ? state.deck.length : "—"}</div>
                <div class="pp-seat-note">${ppSeatNote(state.rightPersona)}</div>
              </div>
            </div>
          </div>

          <aside class="pp-card pp-panel pp-controls-bottom">
            <h2>Table Controls</h2>
            <div class="pp-settings">
              <div class="pp-toggle-row" aria-label="Table toggles">
                <button type="button" class="pp-toggle ${settings.soundEnabled ? "is-on" : ""}" data-pp-toggle="soundEnabled" aria-pressed="${settings.soundEnabled ? "true" : "false"}">${settings.soundEnabled ? "✓" : "○"} Sound</button>
                <button type="button" class="pp-toggle ${settings.voiceEnabled ? "is-on" : ""}" data-pp-toggle="voiceEnabled" aria-pressed="${settings.voiceEnabled ? "true" : "false"}">${settings.voiceEnabled ? "✓" : "○"} Voice / TTS</button>
                <button type="button" class="pp-toggle ${settings.banterEnabled ? "is-on" : ""}" data-pp-toggle="banterEnabled" aria-pressed="${settings.banterEnabled ? "true" : "false"}">${settings.banterEnabled ? "✓" : "○"} Banter</button>
                <button type="button" class="pp-toggle ${settings.teachingMode ? "is-on" : ""}" data-pp-toggle="teachingMode" aria-pressed="${settings.teachingMode ? "true" : "false"}">${settings.teachingMode ? "✓" : "○"} Teach</button>
                <button type="button" class="pp-toggle ${settings.teachingVoice ? "is-on" : ""}" data-pp-toggle="teachingVoice" aria-pressed="${settings.teachingVoice ? "true" : "false"}">${settings.teachingVoice ? "✓" : "○"} Teach Voice</button>
                <button type="button" class="pp-toggle" data-pp-action="voice">Voice Test</button>
                <button type="button" class="pp-toggle" data-pp-action="stop">Stop Voice</button>
              </div>

              <div class="pp-seat-settings-grid">
                <label>Mode
                  <select class="pp-select" id="pp-play-mode">${renderModeOptions()}</select>
                </label>
                <label>Your name
                  <input class="pp-select" id="pp-user-name" type="text" value="${ppEscapeAttr(settings.userName || "Donna")}" placeholder="Your table name">
                </label>
                <label>Host / Dealer voice
                  <select class="pp-select" id="pp-host-voice">${renderVoiceOptions(settings.hostVoice || "")}</select>
                </label>
                <label>Left player
                  <select class="pp-select" id="pp-left-persona">${renderPlayerOptions(state.leftPersona)}</select>
                </label>
                <label>Left voice
                  <select class="pp-select" id="pp-left-voice">${renderVoiceOptions(settings.leftVoice || "")}</select>
                </label>
                <label>Right player
                  <select class="pp-select" id="pp-right-persona">${renderPlayerOptions(state.rightPersona)}</select>
                </label>
                <label>Right voice
                  <select class="pp-select" id="pp-right-voice">${renderVoiceOptions(settings.rightVoice || "")}</select>
                </label>
              </div>

              <label>Volume <input type="range" id="pp-volume" min="0.05" max="0.8" step="0.05" value="${settings.volume}"></label>
            </div>

            <div class="pp-status" id="peg-pint-status">${state.lastAction}</div>
          </aside>
        </section>
      </div>
    `;
    ppStylePauseButton();
    ppMaybeCelebrateWinner();

    wire(root);
  }


  function ppScrubTranscriptThoughtLeaks(html = "") {
    let out = String(html || "");

    // Remove hidden-thinking wrappers if a model emits them.
    out = out
      .replace(/<think>[\s\S]*?<\/think>/gi, " ")
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, " ");

    // Cut off private/inner thought sections even when wrapped in markdown/html.
    // Examples caught:
    // **Private thoughts:** ...
    // <strong>Inner thoughts:</strong> ...
    // Claude: spoken line. (Private thought: ...)
    const leakLabel = "(?:inner\\s+thoughts?|inner\\s+whispers?|private\\s+thoughts?|private\\s+whispers?|unspoken\\s+whispers?|private\\s+thought|thought\\s+process|internal\\s+monologue|hidden\\s+thoughts?|unspoken\\s+thoughts?|analysis|aside|not\\s+spoken)";

    out = out.replace(
      new RegExp("(?:<[^>]+>|[*_`~>\\s])*" + leakLabel + "\\s*(?:\\([^)]*\\))?\\s*[:\\-–—][\\s\\S]*$", "i"),
      ""
    );

    // Remove whole markdown/html-ish lines that begin as inner thoughts.
    out = out
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => {
        const plain = line
          .replace(/<[^>]*>/g, " ")
          .replace(/[*_`~>]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return !new RegExp("^" + leakLabel + "\\s*(?:\\([^)]*\\))?\\s*[:\\-–—]", "i").test(plain);
      })
      .join(" ");

    // Remove markdown debris left behind after cutting.
    out = out
      .replace(/\binner\s+whispers?\s*(?:\([^)]*\))?\s*[:\-–—][\s\S]*$/i, "")
      .replace(/\bprivate\s+whispers?\s*(?:\([^)]*\))?\s*[:\-–—][\s\S]*$/i, "")
      .replace(/\bunspoken\s+whispers?\s*(?:\([^)]*\))?\s*[:\-–—][\s\S]*$/i, "")
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/`+/g, "")
      .replace(/\s+([.,!?;:])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    return out;
  }


  function logLine(html) {
    const log = document.getElementById("peg-pint-log");
    if (!log) return;

    const safeHtml = typeof ppScrubTranscriptThoughtLeaks === "function"
      ? ppScrubTranscriptThoughtLeaks(html)
      : String(html || "");

    if (!safeHtml) return;

    log.insertAdjacentHTML("beforeend", `<p>${safeHtml}</p>`);
    log.scrollTop = log.scrollHeight;
  }

  function ppHostWelcomeText() {
    return `Welcome to The Peg and Pint. Tonight's table is ${state.leftPersona} versus ${state.rightPersona}. Warm banter, sharp cribbage, and a proper table. First cut when ready.`;
  }

  async function ppSpeakHostLine(text) {
    if (!settings.voiceEnabled || !settings.banterEnabled) return;

    const spoken = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!spoken) return;

    try {
      await speakText(spoken, settings.hostVoice || "", { label: "Host / Dealer speaking…" });
    } catch (err) {
      console.warn("Peg & Pint host voice failed.", err);
    }
  }

  function ppDealerLine(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return typeof ppCardLabelsToSpeech === "function" ? ppCardLabelsToSpeech(clean) : clean;
  }

  async function ppSpeakDealerLine(text) {
    if (typeof ppSpeakHostLine === "function") {
      await ppSpeakHostLine(ppDealerLine(text));
      return;
    }

    if (!settings.voiceEnabled || !settings.banterEnabled) return;
    await speakText(ppDealerLine(text), settings.hostVoice || "", { label: "Host / Dealer speaking…" });
  }



  async function ppWelcomeTable(force = false) {
    if (!force && state.hostHasWelcomed) return;

    state.hostHasWelcomed = true;
    setStatus("Opening table.");

    const hostLine = ppHostWelcomeText();

    logLine(`<strong>Host:</strong> ${hostLine}`);

    if (typeof ppSpeakDealerLine === "function") {
      await ppSpeakDealerLine(hostLine);
    } else if (typeof ppSpeakHostLine === "function") {
      await ppSpeakHostLine(hostLine);
    }

    if (!settings.banterEnabled) return;

    const rightEvent = [
      `The game is just opening at The Peg and Pint.`,
      `The host introduced tonight's table: ${state.leftPersona} versus ${state.rightPersona}.`,
      `${state.rightPersona} should greet, tease, size up, or lightly challenge ${state.leftPersona}.`,
      `This is opening table banter before the first shuffle.`
    ].join(" ");

    const leftEvent = [
      `The game is just opening at The Peg and Pint.`,
      `${state.rightPersona} has just spoken first across the table.`,
      `${state.leftPersona} should answer naturally, in character, before the first shuffle.`,
      `This is opening table banter, not a game action.`
    ].join(" ");

    const rightLine = await ppGeneratedBanter("right", rightEvent);

    if (!rightLine) {
      logLine(`<strong>${state.rightPersona}:</strong> The cards have not even moved yet, and somehow I already distrust this table.`);
      await ppSpeakTableLine(`${state.rightPersona}: The cards have not even moved yet, and somehow I already distrust this table.`, "right");
    }

    if (!ppIsUserMode()) {
      const leftLine = await ppGeneratedBanter("left", leftEvent);

      if (!leftLine) {
        logLine(`<strong>${state.leftPersona}:</strong> Then we are beginning honestly. That is more than most tables can claim.`);
        await ppSpeakTableLine(`${state.leftPersona}: Then we are beginning honestly. That is more than most tables can claim.`, "left");
      }
    }
  }


  function ppResolveSeat(value = "") {
    const raw = String(value || "").toLowerCase();

    if (raw === "left" || raw === "right") return raw;

    const left = String(state.leftPersona || "").toLowerCase();
    const right = String(state.rightPersona || "").toLowerCase();

    if (left && (raw === left || raw.startsWith(left + ":") || raw.includes(left))) return "left";
    if (right && (raw === right || raw.startsWith(right + ":") || raw.includes(right))) return "right";

    return "left";
  }

  function ppSpeechWithoutOwnName(text, side = "") {
    let spoken = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const name = side === "right" ? state.rightPersona : state.leftPersona;

    if (!name) return spoken;

    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Remove transcript-style speaker labels: "Riley: ..."
    spoken = spoken.replace(new RegExp("^" + escaped + "\\s*:\\s*", "i"), "");

    // Make action narration sound like the seated player is speaking.
    spoken = spoken.replace(new RegExp("^" + escaped + "\\s+plays\\s+", "i"), "I play ");
    spoken = spoken.replace(new RegExp("^" + escaped + "\\s+discards\\s+", "i"), "I discard ");
    spoken = spoken.replace(new RegExp("^" + escaped + "\\s+says\\s+", "i"), "I say ");
    spoken = spoken.replace(new RegExp("^" + escaped + "\\s+scores\\s+", "i"), "I score ");

    return spoken.trim();
  }

  async function ppSpeakTableLine(text, seat = "") {
    const ppSpeechSpeaker = seat === "right" ? state.rightPersona : state.leftPersona;
    if (typeof ppRemoveThoughtLeakText === "function") {
      text = ppStripTrailingItalicAside(ppStripBanterMarkdownDebris(ppApplySpeakerPerspective(ppRemoveThoughtLeakText(text, ppSpeechSpeaker), ppSpeechSpeaker)));
    }

    if (!settings.voiceEnabled || !settings.banterEnabled) return;

    const side = ppResolveSeat(seat || text);
    const spoken = ppSpeechWithoutOwnName(text, side);
    if (!spoken) return;

    const voiceId = side === "right" ? settings.rightVoice : settings.leftVoice;

    try {
      await speakText(spoken, voiceId || "", { label: `${side === "right" ? state.rightPersona : state.leftPersona} speaking…` });
    } catch (err) {
      console.warn("Peg & Pint table voice failed.", err);
    }
  }

  function ppPersonaBrief(name = "") {
    const key = String(name || "").toLowerCase();

    const briefs = {
      elias: "Elias is poetic, sly, mystical, dry-witted, and a little theatrical. He enjoys turning math into moral drama.",
      riley: "Riley is sharp, skeptical, funny, observant, and scientifically minded. She likes clean logic and precise little victories.",
      dawn: "Dawn is perceptive, luminous, calm, and quietly uncanny. She notices emotional currents under ordinary events.",
      fox: "Fox is wary, clever, suspicious, dryly funny, and hard to impress. He watches everything.",
      einstein: "Einstein is playful, curious, brilliant, warm, and prone to turning simple moments into thought experiments.",
      claude: "Claude is thoughtful, courteous, analytical, and gently witty, with a careful sense of language.",
      "info sage": "Info Sage is warm, clever, encouraging, cosmic, and lightly mischievous.",
      "the pub shark": "The Pub Shark is charming, ruthless at cards, jovial, and suspiciously good at counting."
    };

    return briefs[key] || `${name} is a Sapphire persona at a warm tavern cribbage table.`;
  }

  function ppExtractChatText(data) {
    if (!data) return "";
    if (typeof data === "string") return data;

    const candidates = [
      data.response,
      data.reply,
      data.text,
      data.content,
      data.message,
      data.answer,
      data.output,
      data.result,
      data?.choices?.[0]?.message?.content,
      data?.choices?.[0]?.text,
      data?.messages?.[data.messages.length - 1]?.content
    ];

    for (const item of candidates) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (Array.isArray(item)) {
        const joined = item.map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          if (part && typeof part.content === "string") return part.content;
          return "";
        }).join(" ").trim();

        if (joined) return joined;
      }
    }

    return "";
  }





  function ppStripPersonaPrivateTail(text = "") {
    // Kept as a harmless compatibility shim.
    // We do not censor normal persona side-talk; separate scrubbers remove labeled inner/private thoughts.
    return String(text || "").replace(/\s+/g, " ").trim();
  }



  function ppStripTrailingItalicAside(text = "") {
    let out = String(text || "");

    // Claude sometimes gives a valid spoken line, then a private italic aside:
    // "Nice play. *Inner/private feeling...*"
    // Keep the spoken table line and remove the trailing aside.
    out = out
      .replace(/\s+\*\*[^*][\s\S]*?\*\*\s*$/g, "")
      .replace(/\s+\*[^*][\s\S]*?\*\s*$/g, "")
      .replace(/\s+_[^_][\s\S]*?_\s*$/g, "");

    // If the model starts an italic aside but forgets to close it, cut that too.
    out = out
      .replace(/\s+\*\*[^*][\s\S]*$/g, "")
      .replace(/\s+\*[^*][\s\S]*$/g, "")
      .replace(/\s+_[^_][\s\S]*$/g, "");

    return out.replace(/\s+/g, " ").trim();
  }


  function ppStripBanterMarkdownDebris(text = "") {
    return String(text || "")
      // Remove orphan markdown emphasis left after private-thought cleanup.
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/`+/g, "")
      // Remove empty leftover quote/bracket fragments.
      .replace(/^\s*["“”']+\s*/, "")
      .replace(/\s*["“”']+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }


  function ppApplySpeakerPerspective(text, speaker = "") {
    let out = String(text || "");
    const name = String(speaker || "").trim();
    if (!name) return out;

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // If the speaking persona refers to their own crib/deal in third person,
    // make it first person so it sounds natural at the table.
    out = out
      .replace(new RegExp("\\bthe crib belongs to " + escaped + "\\b", "gi"), "the crib belongs to me")
      .replace(new RegExp("\\bthe crib is " + escaped + "'s\\b", "gi"), "the crib is mine")
      .replace(new RegExp("\\b" + escaped + "'s crib\\b", "gi"), "my crib")
      .replace(new RegExp("\\b" + escaped + " owns the crib\\b", "gi"), "I own the crib")
      .replace(new RegExp("\\b" + escaped + " owns the first crib\\b", "gi"), "I own the first crib")
      .replace(new RegExp("\\b" + escaped + " deals first\\b", "gi"), "I deal first")
      .replace(new RegExp("\\b" + escaped + " deals\\b", "gi"), "I deal");

    return out.replace(/\s+/g, " ").trim();
  }


  function ppRemoveThoughtLeakText(text, speaker = "") {
    let out = String(text || "");

    // Remove common hidden-reasoning wrappers or accidental model scratchpad sections.
    out = out
      .replace(/<think>[\s\S]*?<\/think>/gi, " ")
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, " ");

    const leakWords = "(?:inner\\s+thoughts?|inner\\s+whispers?|private\\s+thoughts?|private\\s+whispers?|unspoken\\s+whispers?|private\\s+thought|thought\\s+process|thoughts?|internal\\s+monologue|hidden\\s+thoughts?|unspoken\\s+thoughts?|analysis|aside|not\\s+spoken)";

    // Cut off inline sections like:
    // "Nice play. Private thoughts: I should..."
    // "Nice play. Private thoughts (not spoken): I should..."
    out = out.replace(
      new RegExp("\\\\b" + leakWords + "\\\\s*(?:\\\\([^)]*\\\\))?\\\\s*[:\\\\-–—][\\\\s\\\\S]*$", "i"),
      " "
    );

    // Remove whole lines that begin as private/internal sections, including markdown marks.
    out = out
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[>*_`'"“”~-]+\s*/, "").trim())
      .filter((line) => line && !new RegExp("^" + leakWords + "\\\\s*(?:\\\\([^)]*\\\\))?\\\\s*[:\\\\-–—]", "i").test(line))
      .filter((line) => line && !/^\(?\s*(?:not spoken|internal|private)\b/i.test(line))
      .join(" ");

    // Remove remaining bracketed/private asides.
    out = out
      .replace(/\[\s*(?:inner|private|internal|not spoken|analysis)[\s\S]*?\]/gi, " ")
      .replace(/\(\s*(?:inner|private|internal|not spoken|analysis)[\s\S]*?\)/gi, " ");

    // Remove duplicated speaker labels if the model included them.
    if (speaker) {
      const escaped = String(speaker).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("^\\\\s*" + escaped + "\\\\s*[:\\\\-–—]\\\\s*", "i"), "");
    }

    return out
      .replace(/\s+/g, " ")
      .replace(/^["“”']+|["“”']+$/g, "")
      .trim();
  }


  function ppCleanGeneratedBanter(text, speaker = "") {
    const original = String(text || "").trim();

    let out = original
      .replace(/<think>[\s\S]*?<\/think>/gi, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .trim();

    // Remove lines that are clearly private thoughts, but keep normal spoken lines.
    out = out
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(inner thoughts?|inner whispers?|private thoughts?|private whispers?|unspoken whispers?|thought)\s*:/i.test(line))
      .join(" ")
      .trim();

    // If the model put "Inner thoughts:" after usable dialogue on the same line, cut that section off.
    out = out.replace(/\b(inner thoughts?|inner whispers?|private thoughts?|private whispers?|unspoken whispers?|thought)\s*:[\s\S]*$/i, " ").trim();

    out = out
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (speaker) {
      const escaped = String(speaker).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("^" + escaped + "\\s*:\\s*", "i"), "").trim();
    }

    out = out.replace(/^["“”']+|["“”']+$/g, "").trim();

    // Failsafe: if cleanup emptied it, try a gentler speaker-label-only cleanup.
    if (!out && original) {
      out = original
        .replace(/<think>[\s\S]*?<\/think>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (speaker) {
        const escaped = String(speaker).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        out = out.replace(new RegExp("^" + escaped + "\\s*:\\s*", "i"), "").trim();
      }

      out = out.replace(/\b(inner thoughts?|inner whispers?|private thoughts?|private whispers?|unspoken whispers?|thought)\s*:[\s\S]*$/i, " ").trim();
      out = out.replace(/^["“”']+|["“”']+$/g, "").trim();
    }

    // Guardrail, not a muzzle: keep the table moving if a model gets chatty.
    if (out.length > 520) {
      const clipped = out.slice(0, 520);
      const cut = Math.max(
        clipped.lastIndexOf(". "),
        clipped.lastIndexOf("! "),
        clipped.lastIndexOf("? ")
      );
      out = (cut > 160 ? clipped.slice(0, cut + 1) : clipped).trim();
    }

    return out;
  }

  function ppStripInnerThoughtsFromSpeech(text, speaker = "") {
    let out = String(text || "");

    // Remove explicit thought blocks and anything after them.
    out = out
      .replace(/<think>[\s\S]*?<\/think>/gi, " ")
      .replace(/\b(?:inner thoughts?|inner whispers?|private thoughts?|private whispers?|unspoken whispers?|thoughts?|thought|internal monologue|analysis)\s*[:\-][\s\S]*$/i, " ")
      .replace(/\b(?:THOUGHT|INNER THOUGHTS?|INNER WHISPERS?|PRIVATE THOUGHTS?|PRIVATE WHISPERS?|UNSPOKEN WHISPERS?)\s*[:\-][\s\S]*$/i, " ");

    // Remove individual lines that are thought/narration/stage-direction lines.
    out = out
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(?:inner thoughts?|inner whispers?|private thoughts?|private whispers?|unspoken whispers?|thoughts?|thought|internal monologue|analysis|aside)\s*[:\-]/i.test(line))
      .filter((line) => line && !/^\(.*\)$/.test(line))
      .filter((line) => line && !/^\[.*\]$/.test(line))
      .join(" ")
      .trim();

    // Remove speaker label if model adds it anyway.
    if (speaker) {
      const escaped = String(speaker).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("^" + escaped + "\\s*:\\s*", "i"), "").trim();
    }

    return out
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^["“”']+|["“”']+$/g, "")
      .trim();
  }


  async function ppAskSapphireForBanter(side, eventText) {
    const speaker = side === "right" ? state.rightPersona : state.leftPersona;

    const payload = {
      side,
      eventText: String(eventText || ""),
      leftPersona: state.leftPersona,
      rightPersona: state.rightPersona
    };

    const res = await fetch("/api/plugin/peg-and-pint/banter", {
      method: "POST",
      credentials: "same-origin",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get("content-type") || "";
    let data = null;
    let raw = "";

    if (contentType.includes("application/json")) {
      data = await res.json();
      raw = data && (data.text || data.error || JSON.stringify(data));
    } else {
      raw = await res.text();
    }

    if (!res.ok || (data && data.ok === false)) {
      throw new Error((data && data.error) || raw || `Banter route failed: ${res.status}`);
    }

    const text = data && data.text ? data.text : raw;
    return ppRemoveThoughtLeakText(ppCleanGeneratedBanter(text, speaker), speaker);
  }


  async function ppGeneratedBanter(side, eventText) {
    if (!settings.banterEnabled) return "";

    // In You vs Persona, the left seat is the human player.
    // AI should never invent Donna/user lines; Donna speaks only through the Say box.
    if (ppIsUserMode() && side === "left") {
      return "";
    }

    const speaker = side === "right" ? state.rightPersona : state.leftPersona;

    try {
      setStatus(`${speaker} is thinking of a reply…`);

      const rawLine = await ppAskSapphireForBanter(side, eventText);
      const line = ppStripTrailingItalicAside(ppStripBanterMarkdownDebris(ppApplySpeakerPerspective(ppRemoveThoughtLeakText(ppStripInnerThoughtsFromSpeech(rawLine, speaker), speaker), speaker)));

      if (!line) {
        setStatus("No banter this turn. Continue when ready.");
        return "";
      }

      logLine(`<strong>${speaker}:</strong> ${line}`);

      setStatus(`${speaker} is speaking…`);
      await ppSpeakTableLine(`${speaker}: ${line}`, side);

      setStatus("Banter finished. Continue when ready.");
      return line;
    } catch (err) {
      console.warn("Peg & Pint generated banter failed.", err);
      setStatus(`AI banter unavailable: ${err && err.message ? err.message.slice(0, 90) : "unknown error"}`);
      return "";
    }
  }


  function ppPegEventText(result) {
    if (!result) return "";

    if (result.go) {
      return `${result.persona} says go. The pegging count resets. Current score is ${state.leftPersona} ${state.scoreLeft}, ${state.rightPersona} ${state.scoreRight}.`;
    }

    if (result.done) {
      return `Pegging is complete. Hand scoring comes next. Current score is ${state.leftPersona} ${state.scoreLeft}, ${state.rightPersona} ${state.scoreRight}.`;
    }

    const scoreText = result.notes && result.notes.length
      ? ` This scores ${result.notes.join(", ")}.`
      : " This scores no pegging points.";

    return `${result.persona} plays ${ppCardSpoken(result.card)}. The pegging count is ${result.count}.${scoreText} Current score is ${state.leftPersona} ${state.scoreLeft}, ${state.rightPersona} ${state.scoreRight}.`;
  }

  function ppStartNewMatch() {
    ppResetGameOverState();
    state.paused = false;
    state.scoreLeft = 0;
    state.scoreRight = 0;
    state.lineIndex = 0;
    state.hostHasWelcomed = false;
    state.dealNumber = 0;
    ppSetDealerSide("left");
    return ppDealPersonaRound();
  }

  function ppStartNextRound() {
    if (ppIsPaused()) return ppPausedResult();
    if (state.gameOver) return ppGameOverResult();
    ppRotateDealer();
    return ppDealPersonaRound();
  }

  function ppClearTableState() {
    ppResetGameOverState();
    state.scoreLeft = 0;
    state.scoreRight = 0;
    state.dealNumber = 0;
    state.lastDealLabel = "No shuffle yet";
    state.dealerSide = "left";
    state.cribOwner = state.leftPersona || "Elias";
    state.phase = "Waiting to deal";
    state.lastCribNote = "Crib waiting for discards.";
    state.pegTurn = "left";
    state.peggingCount = 0;
    state.leftPegPlayed = [];
    state.rightPegPlayed = [];
    state.lastPegNote = "Pegging has not started.";
    state.leftCountHand = [];
    state.rightCountHand = [];
    state.handsScored = false;
    state.lastScoreNote = "Hands not scored yet.";
    state.leftHand = [];
    state.rightHand = [];
    state.cutCard = "—";
    state.cribCards = ["?", "?", "?", "?"];
    state.deck = [];
    state.pegging = [];
    state.lineIndex = 0;
    state.hostHasWelcomed = false;
    state.lastAction = "Table cleared. Ready when you are.";
  }



  function ppEnsurePausePressedStyle() {
    if (document.getElementById("pp-pause-pressed-style")) return;

    const style = document.createElement("style");
    style.id = "pp-pause-pressed-style";
    style.textContent = `
      #peg-pint-app-root #pp-pause-game.pp-pause-active,
      #peg-pint-app-root button#pp-pause-game.pp-pause-active,
      button#pp-pause-game.pp-pause-active {
        background: linear-gradient(180deg, rgba(58, 18, 8, 0.98), rgba(24, 8, 4, 0.98)) !important;
        border-color: rgba(251, 191, 36, 1) !important;
        color: #fff7d6 !important;
        box-shadow: inset 0 4px 9px rgba(0,0,0,.72), 0 0 14px rgba(251,191,36,.32) !important;
        transform: translateY(1px) scale(.98) !important;
        filter: brightness(.92) saturate(1.15) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function ppIsPaused() {
    return !!state.paused;
  }

  function ppPausedResult() {
    return {
      ok: false,
      paused: true,
      message: "Game paused. Click Resume Game to continue."
    };
  }

  ppEnsurePausePressedStyle();

  async function ppTogglePauseGame() {
    ppEnsurePausePressedStyle();
    state.paused = !state.paused;

    const root = document.getElementById(ROOT_ID);

    if (state.paused) {
      ppClearVoiceQueue();
      await stopSpeaking({ quiet: true, force: true });
      state.lastAction = "Game paused. Board held exactly as-is.";
    } else {
      state.lastAction = "Game resumed.";
    }

    if (root) {
      render(root);
    } else {
      setStatus(state.lastAction);
      ppStylePauseButton();
    }
  }

  function ppTeachingEnabled() {
    return !!settings.teachingMode;
  }

  function ppTeachEscape(text = "") {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }


  function ppCardLabelsToSpeech(text = "") {
    return String(text || "").replace(/\b(A|K|Q|J|10|[2-9])([♣♦♥♠])/g, (match) => {
      if (typeof ppCardSpoken === "function") {
        return ppCardSpoken(match);
      }

      const rankMap = {
        A: "ace", K: "king", Q: "queen", J: "jack",
        10: "ten", 9: "nine", 8: "eight", 7: "seven", 6: "six",
        5: "five", 4: "four", 3: "three", 2: "two"
      };

      const suitMap = {
        "♣": "clubs",
        "♦": "diamonds",
        "♥": "hearts",
        "♠": "spades"
      };

      const rank = match.slice(0, -1);
      const suit = match.slice(-1);
      return `${rankMap[rank] || rank} of ${suitMap[suit] || suit}`;
    });
  }


  function ppTeachingVoiceEnabled() {
    return !!settings.teachingMode && !!settings.teachingVoice && !!settings.voiceEnabled;
  }

  async function ppSpeakTeacherLine(text) {
    if (!ppTeachingVoiceEnabled()) return;

    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return;

    const spokenClean = typeof ppCardLabelsToSpeech === "function" ? ppCardLabelsToSpeech(clean) : clean;

    setStatus("Teacher note speaking…");

    try {
      await speakText(`Teacher note. ${spokenClean}`, settings.hostVoice || "", { label: "Teacher note speaking…" });
    } catch (err) {
      console.warn("Peg & Pint teacher voice failed.", err);
      setStatus("Teacher voice unavailable; note shown in transcript.");
    }
  }

  async function ppTeach(text) {
    if (!ppTeachingEnabled()) return;

    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return;

    logLine(`<span class="pp-teacher-line"><strong>Teacher:</strong> ${ppTeachEscape(clean)}</span>`);
    await ppSpeakTeacherLine(clean);
  }

  async function ppTeachDeal(result) {
    if (!result || !result.ok) return;

    ppTeach(`${result.dealer} is dealer and owns the crib this round. ${result.pone} will play first during pegging after the cut. Discard strategy depends on crib ownership: feed your own crib, starve theirs.`);
  }

  async function ppTeachDiscard(result) {
    if (!result || !result.ok) return;

    ppTeach(`Both players now have four cards. Each hand will score with the starter card after pegging. The crib also scores with the starter, but only for the dealer.`);
  }

  async function ppTeachCut(result) {
    if (!result || !result.ok) return;

    if (result.heels) {
      ppTeach(`The starter is a jack. That is “his heels,” so the dealer scores 2 immediately.`);
    } else {
      ppTeach(`The starter card now counts with both hands and the crib. Watch for fifteens, pairs, runs, flushes, and right jack / nobs when hands are scored.`);
    }
  }

  async function ppTeachPeg(result) {
    if (!result || !result.ok) return;

    if (result.done) {
      ppTeach(`Pegging is complete. Next, score the non-dealer's hand, then the dealer's hand, then the dealer's crib.`);
      return;
    }

    if (result.go) {
      ppTeach(`A player said go because they could not play without passing 31. The count resets and pegging continues.`);
      return;
    }

    const points = result.points ? `${result.points} point${result.points === 1 ? "" : "s"}` : "no points";
    const reason = result.notes && result.notes.length ? ` for ${result.notes.join(", ")}` : "";

    ppTeach(`Pegging count is ${result.count}. This play scores ${points}${reason}. Proper pegging now scores fifteens, thirty-one, pairs, triples, quads, runs, go, and last card. Never let the running count go over 31.`);
  }

  async function ppTeachScore(result) {
    if (!result || !result.ok) return;

    ppTeach(`Hand scoring looks for every fifteen, pair, run, flush, and right jack / nobs. A right jack is traditionally called nobs. The crib is scored last for the dealer. After scoring, use Next Round to rotate the dealer and crib.`);
  }

  async function ppTeachNextRound(result) {
    if (!result || !result.ok) return;

    ppTeach(`Dealer has rotated. That means the crib owner changed. Re-check crib ownership before choosing discards.`);
  }

  function wire(root) {
    const sound = root.querySelector("#pp-sound");
    const voice = root.querySelector("#pp-voice");
    const banter = root.querySelector("#pp-banter");
    const teaching = root.querySelector("#pp-teaching");
    const teachingVoice = root.querySelector("#pp-teaching-voice");
    const volume = root.querySelector("#pp-volume");
    const playMode = root.querySelector("#pp-play-mode");
    const userNameInput = root.querySelector("#pp-user-name");
    const hostVoice = root.querySelector("#pp-host-voice");
    const leftPersona = root.querySelector("#pp-left-persona");
    const rightPersona = root.querySelector("#pp-right-persona");
    const leftVoice = root.querySelector("#pp-left-voice");
    const rightVoice = root.querySelector("#pp-right-voice");
    const userTalk = root.querySelector("#pp-user-talk");


    root.querySelectorAll("[data-pp-toggle]").forEach((btn) => {
      if (btn.dataset.ppToggleWired === "1") return;
      btn.dataset.ppToggleWired = "1";

      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = btn.getAttribute("data-pp-toggle") || "";
        if (!key || !(key in settings)) return;

        const labels = {
          soundEnabled: "Sound",
          voiceEnabled: "Voice / TTS",
          banterEnabled: "Banter",
          teachingMode: "Teach",
          teachingVoice: "Teach Voice"
        };

        settings[key] = !Boolean(settings[key]);
        saveSettings(settings);

        btn.classList.toggle("is-on", !!settings[key]);
        btn.setAttribute("aria-pressed", settings[key] ? "true" : "false");
        btn.textContent = `${settings[key] ? "✓" : "○"} ${labels[key] || "Setting"}`;

        if (key === "voiceEnabled" && !settings.voiceEnabled) {
          await stopSpeaking({ force: true, quiet: true });
        }

        const messages = {
          soundEnabled: settings.soundEnabled ? "Sound on." : "Sound off.",
          voiceEnabled: settings.voiceEnabled ? "Voice on. Click Welcome Table when ready." : "Voice off.",
          banterEnabled: settings.banterEnabled
            ? "Banter on."
            : "Banter off.",
          teachingMode: settings.teachingMode ? "Teaching mode on." : "Teaching mode off.",
          teachingVoice: settings.teachingVoice ? "Teach Voice on." : "Teach Voice off."
        };

        setStatus(messages[key] || "Setting changed.");

        if (key !== "soundEnabled" || settings.soundEnabled) {
          playTableSound("tap");
        }
      });
    });

    if (userTalk) {
      userTalk.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const send = root.querySelector('[data-pp-action="user-talk"]');
          if (send) send.click();
        }
      });
    }

    if (sound) {
      sound.addEventListener("change", () => {
        settings.soundEnabled = !!sound.checked;
        saveSettings(settings);
        setStatus(settings.soundEnabled ? "Sound on." : "Sound off.");
        playTableSound("tap");
      });
    }

    if (voice) {
      voice.addEventListener("change", () => {
        settings.voiceEnabled = !!voice.checked;
        saveSettings(settings);
        setStatus(settings.voiceEnabled ? "Voice on. Click Welcome Table when ready." : "Voice off.");
        playTableSound("tap");
      });
    }

    if (banter) {
      banter.addEventListener("change", () => {
        settings.banterEnabled = !!banter.checked;
        saveSettings(settings);
        setStatus(settings.banterEnabled ? "Banter on." : "Banter off.");
        playTableSound("tap");
      });
    }

    if (teaching) {
      teaching.addEventListener("change", () => {
        settings.teachingMode = !!teaching.checked;
        saveSettings(settings);
        setStatus(settings.teachingMode ? "Teaching mode on." : "Teaching mode off.");
        playTableSound("tap");
      });
    }

    if (teachingVoice) {
      teachingVoice.addEventListener("change", () => {
        settings.teachingVoice = !!teachingVoice.checked;
        saveSettings(settings);
        setStatus(settings.teachingVoice ? "Teach Voice on." : "Teach Voice off.");
        playTableSound("tap");
      });
    }

    if (volume) {
      volume.addEventListener("input", () => {
        settings.volume = Number(volume.value || "0.45");
        saveSettings(settings);
        setStatus(`Volume ${(settings.volume * 100).toFixed(0)}%.`);
      });
    }

    function applyUserNameChange() {
      if (!userNameInput) return;

      const oldName = state.leftPersona;
      settings.userName = String(userNameInput.value || "").trim() || "You";

      if (ppIsUserMode()) {
        settings.leftPersona = ppUserName();
        state.leftPersona = ppUserName();

        if (!state.cribOwner || state.cribOwner === oldName || state.cribOwner === "You") {
          state.cribOwner = state.leftPersona;
        }
      }

      saveSettings(settings);
      setStatus(`Your table name is ${ppUserName()}.`);
      render(root);
      wire(root);
    }

    if (userNameInput) {
      userNameInput.addEventListener("change", applyUserNameChange);
      userNameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyUserNameChange();
        }
      });
    }

    if (playMode) {
      playMode.addEventListener("change", () => {
        settings.playMode = playMode.value === "user" ? "user" : "watch";

        if (settings.playMode === "user") {
          settings.leftPersona = ppUserName();
          state.leftPersona = ppUserName();
          state.cribOwner = ppUserName();
        } else if (state.leftPersona === "You" || state.leftPersona === ppUserName()) {
          settings.leftPersona = "Elias";
          state.leftPersona = "Elias";
          state.cribOwner = state.leftPersona;
        }

        saveSettings(settings);
        setStatus(`Mode set: ${ppCurrentModeLabel()}. ${ppCribOwnerLine()}.`);
        render(root);
        wire(root);
        setTimeout(ppLoadSapphirePersonas, 50);
        setTimeout(ppLoadSapphireVoices, 80);
      });
    }

    if (hostVoice) {
      hostVoice.addEventListener("change", () => {
        settings.hostVoice = hostVoice.value || "";
        saveSettings(settings);
        setStatus(settings.hostVoice ? `Host voice set: ${settings.hostVoice}` : "Host voice set to default.");
      });
    }

    if (leftPersona) {
      leftPersona.addEventListener("change", () => {
        const oldName = state.leftPersona;
        settings.leftPersona = leftPersona.value || "Elias";
        state.leftPersona = settings.leftPersona;
        if (state.cribOwner === oldName) state.cribOwner = state.leftPersona;
        saveSettings(settings);
        setStatus(`Left seat set to ${state.leftPersona}.`);
        render(root);
        wire(root);
        setTimeout(ppLoadSapphireVoices, 50);
      });
    }

    if (rightPersona) {
      rightPersona.addEventListener("change", () => {
        const oldName = state.rightPersona;
        settings.rightPersona = rightPersona.value || "Riley";
        state.rightPersona = settings.rightPersona;
        if (state.cribOwner === oldName) state.cribOwner = state.rightPersona;
        saveSettings(settings);
        setStatus(`Right seat set to ${state.rightPersona}.`);
        render(root);
        wire(root);
        setTimeout(ppLoadSapphireVoices, 50);
      });
    }

    if (leftVoice) {
      leftVoice.addEventListener("change", () => {
        settings.leftVoice = leftVoice.value || "";
        saveSettings(settings);
        setStatus(settings.leftVoice ? `Left voice set: ${settings.leftVoice}` : "Left voice set to default.");
      });
    }

    if (rightVoice) {
      rightVoice.addEventListener("change", () => {
        settings.rightVoice = rightVoice.value || "";
        saveSettings(settings);
        setStatus(settings.rightVoice ? `Right voice set: ${settings.rightVoice}` : "Right voice set to default.");
      });
    }

    root.querySelectorAll("[data-pp-action]").forEach((btn) => {
      if (btn.dataset.ppWired === "1") return;
      btn.dataset.ppWired = "1";

      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-pp-action") || "";

          if (state.gameOver && !["new", "clear-table", "voice", "stop", "welcome"].includes(action)) {
            setStatus(ppWinnerMessage());
            playTableSound("tap");
            return;
          }

        if (action === "welcome") {
          playTableSound("tap");
          await ppWelcomeTable(true);
          return;
        }

        if (action === "user-talk") {
          const input = root.querySelector("#pp-user-talk");
          const text = input ? String(input.value || "").trim() : "";

          if (!ppIsUserMode()) {
            setStatus("Switch Mode to You vs Persona to talk at the table.");
            playTableSound("tap");
            return;
          }

          if (!text) {
            setStatus("Type something to say at the table.");
            playTableSound("tap");
            return;
          }

          if (input) input.value = "";

          logLine(`<strong>You:</strong> ${ppEscapeHtml(text)}`);
          playTableSound("tap");
          setStatus(`${state.rightPersona} is thinking of a reply…`);

          await ppGeneratedBanter("right", [
            `The user at The Peg and Pint just said this across the cribbage table: "${text}"`,
            `${state.rightPersona} should respond naturally, in character.`,
            `This is table conversation, not a game action.`,
            `Do not invent cards, scores, or rules.`
          ].join(" "));

          return;
        }

        if (action === "user-discard-card") {
          ppToggleUserDiscard(btn.getAttribute("data-pp-index"));
          render(root);
          wire(root);
          return;
        }

        if (action === "confirm-user-discard") {
          const result = ppUserDiscardToCrib();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            return;
          }

          playTableSound("score");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);

          logLine(`<strong>Crib:</strong> ${state.leftPersona} discards ${result.leftText}. ${state.rightPersona} discards ${result.rightText}. The crib belongs to ${state.cribOwner}.`);
          await ppTeachDiscard(result);

          if (typeof ppSpeakDealerLine === "function") {
            await ppSpeakDealerLine(`Your discards are in. ${state.rightPersona} discards to the crib. The crib belongs to ${state.cribOwner}.`);
          }

          await ppGeneratedBanter("right", `${state.leftPersona} chose two cards for the crib. ${state.rightPersona} also discarded to the crib. The crib now has four cards.`);
          return;
        }

        if (action === "user-go") {
          const result = ppUserGo();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            return;
          }

          playTableSound(result.points ? "score" : "tap");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);

          logLine(`<strong>Pegging:</strong> ${result.message}`);

          if (typeof ppSpeakDealerLine === "function") {
            await ppSpeakDealerLine(result.message);
          }

          await ppTeachPeg(result);

          if (!result.done && state.pegTurn === "right" && ppCanSidePeg("right")) {
            await ppGeneratedBanter("right", `${state.leftPersona} says go. ${state.rightPersona} may continue the pegging count if possible.`);
          }

          return;
        }

        if (action === "user-peg-card") {
          const result = ppUserPegCard(btn.getAttribute("data-pp-index"));

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            return;
          }

          playTableSound(result.points ? "score" : "peg");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);

          const detail = result.notes && result.notes.length ? ` <em>${result.notes.join(", ")}</em>` : "";
          logLine(`<strong>Pegging:</strong> ${result.persona} plays ${result.cardText}. Count ${result.count}.${detail}`);

          if (typeof ppSpeakDealerLine === "function") {
            await ppSpeakDealerLine(`You play ${ppCardSpoken(result.card)}. Count ${result.count}.` +
              (result.notes && result.notes.length ? ` ${result.notes.join(". ")}.` : ""));
          }

          await ppTeachPeg(result);
          await ppGeneratedBanter("right", ppPegEventText(result));
          return;
        }

        if (action === "new") {
          const result = ppStartNewMatch();
          playTableSound("deal");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);
          logLine(`<strong>Dealer:</strong> ${result.message || "New match. First cut first. Low card deals first; Ace is low."}`);
          if (typeof ppSpeakDealerLine === "function") {
            await ppSpeakDealerLine(result.message || "New match. First cut first. Low card deals first; Ace is low.");
          }
          return;
        }

        if (action === "cut-deal") {
          const result = ppCutForDeal();

          // Pin the opening cut result into the visible board state before render().
          // The status line was correct, but the board was still showing pre-cut state.
          if (result && result.ok && !result.tied) {
            state.needsDealCut = false;
            state.dealCutTied = false;
            state.dealCutWinnerSide = result.dealerSide || state.dealCutWinnerSide || "";
            state.dealerSide = result.dealerSide || state.dealerSide || "";
            state.dealCutWinnerName = result.dealer || state.dealCutWinnerName || "";
            state.cribOwner = result.dealer || state.cribOwner || "";
            state.phase = "Ready to deal";
            state.lastDealLabel = "Cut complete";
            state.lastCribNote = `${state.cribOwner} owns the first crib. Ready to shuffle and deal.`;
            state.lastPegNote = "Pegging has not started.";
            if (result.leftCard) state.dealCutLeftCard = result.leftCard;
            if (result.rightCard) state.dealCutRightCard = result.rightCard;
          } else if (result && result.ok && result.tied) {
            state.needsDealCut = true;
            state.cribOwner = "";
            state.dealerSide = "";
            state.dealCutWinnerSide = "";
            state.dealCutWinnerName = "";
            state.dealCutTied = true;
            state.phase = "Cut tie";
            state.lastDealLabel = "Cut tied";
            if (result.leftCard) state.dealCutLeftCard = result.leftCard;
            if (result.rightCard) state.dealCutRightCard = result.rightCard;
          }

          playTableSound(result.ok && !result.tied ? "deal" : "tap");
          setStatus(result.message);
          render(root);
          wire(root);

          // Teacher note goes first in the transcript because Teacher speaks first.
          if (result && result.ok && !result.tied) {
            await ppTeach(`First cut decides the first dealer and crib owner. Low card deals first; Ace is low. ${result.dealer} won the first cut and owns the first crib.`);
          } else if (result && result.ok && result.tied) {
            await ppTeach(`The first cut tied. Cut again until one player has the lower card.`);
          }

          logLine(`<strong>First cut:</strong> ${result.message}`);

          if (typeof ppSpeakDealerLine === "function") {
            await ppSpeakDealerLine(result.message);
          }

          if (result && result.ok && !result.tied && settings.banterEnabled) {
            await ppGeneratedBanter(
              result.dealerSide || "",
              `First cut just happened at The Peg and Pint. ${result.message} The winning player should react briefly in first person because they now deal first and own the first crib.`
            );
          }

          return;
        }

        if (action === "deal") {
          const result = ppDealPersonaRound();
          playTableSound("deal");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);
          logLine(`<strong>Dealer:</strong> Fresh deal. ${result.dealer} deals. ${state.leftPersona} and ${state.rightPersona} each receive six real cards. ${ppCribOwnerLine()}.`);
          await ppTeachDeal(result);
          await ppSpeakDealerLine(`Fresh deal. ${result.dealer} deals. ${state.leftPersona} and ${state.rightPersona} each receive six cards. ${ppCribOwnerLine()}.`);
          return;
        }

        if (action === "discard") {
          const result = ppIsUserMode() ? ppUserDiscardToCrib() : ppDiscardToCrib();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            return;
          }

          playTableSound("score");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);
          logLine(`<strong>Crib:</strong> ${state.leftPersona} discards ${result.leftText}. ${state.rightPersona} discards ${result.rightText}. The crib belongs to ${state.cribOwner}.`);
          await ppTeachDiscard(result);
          await ppSpeakTableLine(`${state.leftPersona} discards ${ppCardsSpoken(result.leftDiscards)}.`, "left");
          await ppSpeakTableLine(`${state.rightPersona} discards ${ppCardsSpoken(result.rightDiscards)}. The crib belongs to ${state.cribOwner}.`, "right");
          return;
        }

        if (action === "cut") {
          const result = ppCutStarter();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            return;
          }

          playTableSound(result.heels ? "score" : "deal");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);
          logLine(result.heels
            ? `<strong>Cut:</strong> ${result.starterText}. His heels — ${state.cribOwner} scores 2.`
            : `<strong>Cut:</strong> ${result.starterText}. No heels.`);
          await ppTeachCut(result);
          await ppSpeakDealerLine(result.heels
            ? `Cut card is ${ppCardSpoken(result.starter)}. His heels. ${state.cribOwner} scores 2.`
            : `Cut card is ${ppCardSpoken(result.starter)}. No heels.`);
          return;
        }

        if (action === "peg") {
          if (ppIsUserMode() && state.pegTurn === "left") {
            setStatus("Your turn: click a card in your hand.");
            playTableSound("tap");
            return;
          }

          const result = ppPegStep();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            await ppSpeakTableLine(result.message);
            return;
          }

          playTableSound(result.points ? "score" : "peg");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);

          let spokenLine = result.message;

          if (result.go) {
            logLine(`<strong>Pegging:</strong> ${result.message}`);
          } else if (result.done) {
            logLine(`<strong>Pegging:</strong> ${result.message}`);
          } else {
            const detail = result.notes && result.notes.length ? ` <em>${result.notes.join(", ")}</em>` : "";
            logLine(`<strong>Pegging:</strong> ${result.persona} plays ${result.cardText}. Count ${result.count}.${detail}`);
            spokenLine = `${result.persona} plays ${ppCardSpoken(result.card)}. Count ${result.count}.` +
              (result.notes && result.notes.length ? ` ${result.notes.join(". ")}.` : "");
          }

          await ppSpeakTableLine(spokenLine, result.side || result.persona);
          await ppTeachPeg(result);

          if (!result.done) {
            await ppGeneratedBanter(result.side || result.persona, ppPegEventText(result));
          }

          return;
        }

        if (action === "score") {
          const result = ppScoreHands();

          if (!result.ok) {
            setStatus(state.gameOver ? ppWinnerMessage() : result.message);
            playTableSound("tap");
            await ppSpeakTableLine(result.message);
            return;
          }

          playTableSound("score");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);

          // Teacher note goes first in the transcript because Teacher speaks first.
          await ppTeachScore(result);

          result.order.forEach((entry) => {
            const label = entry.kind === "crib" ? `${entry.name}'s crib` : `${entry.name}'s hand`;
            logLine(`<strong>Scoring:</strong> ${label}: ${entry.score.cardsText} — ${ppCribbageCountChant(entry.score)}`);
          });

          const scoringSummary = ppScoringSpokenSummary(result);
          await ppSpeakDealerLine(scoringSummary);

          if (settings.banterEnabled) {
            await ppGeneratedBanter("left", ppScoringBanterEvent(result, "left"));
            await ppGeneratedBanter("right", ppScoringBanterEvent(result, "right"));
          }

          return;
        }

        if (action === "next-round") {
          if (!state.handsScored && Number(state.dealNumber || 0) > 0) {
            setStatus("Score hands before starting the next round.");
            playTableSound("tap");
            return;
          }

          const result = ppStartNextRound();
          playTableSound("deal");
          setStatus(state.gameOver ? ppWinnerMessage() : result.message);
          render(root);
          wire(root);
          logLine(`<strong>Dealer:</strong> Next round. Dealer rotates to ${result.dealer}. ${ppCribOwnerLine()}.`);
          await ppTeachNextRound(result);
          await ppSpeakDealerLine(`Next round. Dealer rotates to ${result.dealer}. ${ppCribOwnerLine()}. Six cards dealt to both players.`);
          return;
        }

        if (action === "voice") {
          playTableSound("tap");
          setStatus("Testing host/dealer and both seat voices.");
          await ppSpeakDealerLine(`Host and dealer voice test. Welcome to The Peg and Pint.`);
          await ppSpeakTableLine(`${state.leftPersona}: My voice is assigned to the left seat.`, "left");
          await ppSpeakTableLine(`${state.rightPersona}: My voice is assigned to the right seat.`, "right");
          return;
        }

        if (action === "clear-table") {
          await stopSpeaking({ force: true });
          ppClearTableState();
          render(root);
          wire(root);
          setStatus("Table cleared. Ready when you are.");
          playTableSound("tap");
          return;
        }

        if (action === "stop") {
          await stopSpeaking({ force: true });
          return;
        }
      });
    });
  }


    document.addEventListener("click", async (event) => {
      const button = event.target && event.target.closest ? event.target.closest("#pp-pause-game") : null;
      if (!button) return;
      if (typeof isPegPintRoute === "function" && !isPegPintRoute()) return;

      event.preventDefault();
      event.stopPropagation();
      await ppTogglePauseGame();
    });

  function ppUpdateSidebarReleaseZone(event) {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.style.display === "none") return;

    const x = Number(event && event.clientX ? event.clientX : 9999);

    /*
      When the cursor is over Sapphire's sticky sidebar/expanded sidebar,
      make the entire Peg & Pint app transparent to clicks. This lets
      Sapphire receive the sidebar click without deleting the pub root.
    */
    /*
      Only release clicks over Sapphire's actual left rail.
      360px was too wide and disabled Peg & Pint's own left-side controls
      such as Sound, Voice / TTS, and Banter.
    */
    if (x <= 72) {
      root.dataset.ppSidebarReleased = "1";
      return;
    }

    if (root.dataset.ppSidebarReleased === "1") {
      delete root.dataset.ppSidebarReleased;
    }
  }

  function mount() {
    installStyles();

    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }

    root.style.display = "";
    root.style.pointerEvents = "auto";
    delete root.dataset.ppSidebarReleased;
    render(root);
    wire(root);
    setTimeout(ppLoadSapphirePersonas, 60);
    setTimeout(ppLoadSapphireVoices, 90);
  }

  function unmount() {
    const root = document.getElementById(ROOT_ID);

    /*
      Route polling may call syncRoute repeatedly while Peg & Pint is not active.
      Only run the shutdown behavior once per actual leave, otherwise Stop Voice /
      audio cleanup can fire over and over outside the app.
    */
    if (!root || root.style.display === "none") return;

    root.style.display = "none";
    root.style.pointerEvents = "none";
    root.dataset.ppSidebarReleased = "1";

    stopSpeaking({ force: true });
  }

  function syncRoute() {
    const shouldMount = isPegPintRoute();
    const root = document.getElementById(ROOT_ID);
    const isVisible = !!root && root.style.display !== "none";

    if (shouldMount) {
      if (!isVisible) mount();
    } else if (isVisible) {
      unmount();
    }
  }

  function boot() {
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("mousemove", ppUpdateSidebarReleaseZone, true);
    window.addEventListener("pointermove", ppUpdateSidebarReleaseZone, true);

    if (!ppRoutePollTimer) {
      ppRoutePollTimer = window.setInterval(syncRoute, 350);
    }

    window.addEventListener("beforeunload", () => {
      stopSpeaking({ force: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
