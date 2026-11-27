import {
  chooseAiMove,
  evaluateBoard,
  type AiDifficulty,
  type CellValue,
  type GameMode,
  type Mark,
} from './rules';

interface ScoreBoard {
  xWins: number;
  oWins: number;
  draws: number;
  streak: number;
}

const STORAGE_KEY = 'kairo_ttt_stats_v1';

class TttAudio {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playMove(mark: Mark): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mark === 'X' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(mark === 'X' ? 520 : 410, now);
    osc.frequency.exponentialRampToValueAtTime(mark === 'X' ? 680 : 320, now + 0.08);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playWin(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playDraw(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    [340, 290].forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }
}

function loadScores(): ScoreBoard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { xWins: 0, oWins: 0, draws: 0, streak: 0 };
    const parsed = JSON.parse(raw) as Partial<ScoreBoard>;
    return {
      xWins: Number(parsed.xWins) || 0,
      oWins: Number(parsed.oWins) || 0,
      draws: Number(parsed.draws) || 0,
      streak: Number(parsed.streak) || 0,
    };
  } catch {
    return { xWins: 0, oWins: 0, draws: 0, streak: 0 };
  }
}

function saveScores(scores: ScoreBoard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // ignore storage errors
  }
}

function createMarkSvg(mark: Mark): string {
  if (mark === 'X') {
    return `<svg viewBox="0 0 64 64" class="ttt-mark ttt-mark-x" aria-hidden="true">
      <line x1="16" y1="16" x2="48" y2="48" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      <line x1="48" y1="16" x2="16" y2="48" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 64 64" class="ttt-mark ttt-mark-o" aria-hidden="true">
    <circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" stroke-width="7"/>
  </svg>`;
}

export function initTicTacToe(): void {
  const audio = new TttAudio();
  let state: 'title' | 'playing' | 'gameover' = 'title';
  let mode: GameMode = 'ai';
  let difficulty: AiDifficulty = 'medium';
  let boardSize: 3 | 4 = 3;
  let humanMark: Mark = 'X';
  let turn: Mark = 'X';
  let board: CellValue[] = new Array(9).fill(null);
  let winLine: number[] | null = null;
  let winner: Mark | 'draw' | null = null;
  let aiTimer: number | null = null;
  let scores = loadScores();

  const titleScreen = document.getElementById('ttt-title-screen') as HTMLElement;
  const playScreen = document.getElementById('ttt-play-screen') as HTMLElement;
  const boardEl = document.getElementById('ttt-board') as HTMLElement;
  const winLineSvg = document.getElementById('ttt-win-svg') as unknown as SVGSVGElement;
  const turnLabel = document.getElementById('ttt-turn-label') as HTMLElement;
  const resultModal = document.getElementById('ttt-result-modal') as HTMLElement;
  const resultTitle = document.getElementById('ttt-result-title') as HTMLElement;
  const resultSub = document.getElementById('ttt-result-sub') as HTMLElement;

  const scoreXEl = document.getElementById('score-x') as HTMLElement;
  const scoreDrawEl = document.getElementById('score-draws') as HTMLElement;
  const scoreOEl = document.getElementById('score-o') as HTMLElement;
  const btnMute = document.getElementById('ttt-mute-btn') as HTMLButtonElement;
  const difficultyGroup = document.getElementById('ttt-difficulty-group') as HTMLElement;

  function setAppState(next: 'title' | 'playing' | 'gameover'): void {
    state = next;
    document.body.dataset.state = next;
    titleScreen.hidden = next !== 'title';
    playScreen.hidden = next === 'title';
    resultModal.hidden = next !== 'gameover';
  }

  function renderScores(): void {
    scoreXEl.textContent = String(scores.xWins);
    scoreDrawEl.textContent = String(scores.draws);
    scoreOEl.textContent = String(scores.oWins);
  }

  function clearAiTimer(): void {
    if (aiTimer !== null) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
    }
  }

  function renderWinSvg(): void {
    winLineSvg.innerHTML = '';
    if (!winLine || winLine.length < 2) return;
    const startIdx = winLine[0];
    const endIdx = winLine[winLine.length - 1];
    const sr = Math.floor(startIdx / boardSize);
    const sc = startIdx % boardSize;
    const er = Math.floor(endIdx / boardSize);
    const ec = endIdx % boardSize;

    const step = 100 / boardSize;
    const x1 = sc * step + step / 2;
    const y1 = sr * step + step / 2;
    const x2 = ec * step + step / 2;
    const y2 = er * step + step / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${x1}%`);
    line.setAttribute('y1', `${y1}%`);
    line.setAttribute('x2', `${x2}%`);
    line.setAttribute('y2', `${y2}%`);
    line.setAttribute('stroke', winner === 'X' ? '#38BDF8' : '#F59E0B');
    line.setAttribute('stroke-width', '5');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('class', 'ttt-win-stroke');
    winLineSvg.appendChild(line);
  }

  function renderBoard(): void {
    boardEl.dataset.size = String(boardSize);
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, minmax(0, 1fr))`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, minmax(0, 1fr))`;
    boardEl.innerHTML = '';

    for (let i = 0; i < board.length; i++) {
      const val = board[i];
      const row = Math.floor(i / boardSize) + 1;
      const col = (i % boardSize) + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ttt-cell';
      if (val) btn.classList.add(val === 'X' ? 'is-x' : 'is-o');
      if (winLine && winLine.includes(i)) btn.classList.add('is-win');
      btn.dataset.index = String(i);
      btn.setAttribute(
        'aria-label',
        `Row ${row}, Column ${col}, ${val ? val : 'empty'}`
      );
      const isAiThinking = mode === 'ai' && turn !== humanMark && winner === null;
      btn.disabled = val !== null || state !== 'playing' || isAiThinking;
      if (val) {
        btn.innerHTML = createMarkSvg(val);
      }
      btn.addEventListener('click', () => handleCellClick(i));
      boardEl.appendChild(btn);
    }

    if (winner === 'draw') {
      turnLabel.textContent = 'Match Draw';
    } else if (winner) {
      turnLabel.textContent = `${winner} Wins the Round`;
    } else if (mode === 'ai' && turn !== humanMark) {
      turnLabel.textContent = `AI (${turn}) Thinking...`;
    } else if (mode === 'ai') {
      turnLabel.textContent = `Your Turn (${humanMark})`;
    } else {
      turnLabel.textContent = `Player ${turn} Turn`;
    }

    renderWinSvg();
  }

  function finishRound(resWinner: Mark | 'draw', resLine: number[] | null): void {
    winner = resWinner;
    winLine = resLine;
    if (resWinner === 'X') {
      scores.xWins++;
      if (mode === 'pvp' || humanMark === 'X') scores.streak++;
      else scores.streak = 0;
      audio.playWin();
    } else if (resWinner === 'O') {
      scores.oWins++;
      if (mode === 'pvp' || humanMark === 'O') scores.streak++;
      else scores.streak = 0;
      audio.playWin();
    } else {
      scores.draws++;
      audio.playDraw();
    }
    saveScores(scores);
    renderScores();
    renderBoard();

    window.setTimeout(() => {
      if (state === 'title') return;
      if (resWinner === 'draw') {
        resultTitle.textContent = 'Draw Match';
        resultSub.textContent = 'Every square claimed without a line. Try another round.';
      } else if (mode === 'ai') {
        if (resWinner === humanMark) {
          resultTitle.textContent = 'Victory';
          resultSub.textContent = `You outplayed the ${difficulty} AI playing as ${humanMark}.`;
        } else {
          resultTitle.textContent = 'AI Wins';
          resultSub.textContent = `The ${difficulty} AI connected a winning line as ${resWinner}.`;
        }
      } else {
        resultTitle.textContent = `Player ${resWinner} Wins`;
        resultSub.textContent = `Player ${resWinner} completed a winning line.`;
      }
      setAppState('gameover');
    }, 380);
  }

  function scheduleAiIfNeeded(): void {
    clearAiTimer();
    const aiMark: Mark = humanMark === 'X' ? 'O' : 'X';
    if (state !== 'playing' || mode !== 'ai' || turn !== aiMark || winner !== null) return;
    aiTimer = window.setTimeout(() => {
      aiTimer = null;
      if (state !== 'playing' || winner !== null) return;
      const move = chooseAiMove(board, aiMark, difficulty, boardSize);
      if (move >= 0 && board[move] === null) {
        board[move] = aiMark;
        audio.playMove(aiMark);
        const res = evaluateBoard(board, boardSize);
        if (res.winner) {
          finishRound(res.winner, res.line);
        } else {
          turn = humanMark;
          renderBoard();
        }
      }
    }, 280);
  }

  function handleCellClick(idx: number): void {
    if (state !== 'playing' || winner !== null || board[idx] !== null) return;
    if (mode === 'ai' && turn !== humanMark) return;

    board[idx] = turn;
    audio.playMove(turn);
    const res = evaluateBoard(board, boardSize);
    if (res.winner) {
      finishRound(res.winner, res.line);
      return;
    }

    turn = turn === 'X' ? 'O' : 'X';
    renderBoard();
    scheduleAiIfNeeded();
  }

  function startNewRound(): void {
    clearAiTimer();
    board = new Array(boardSize * boardSize).fill(null);
    winLine = null;
    winner = null;
    turn = 'X';
    setAppState('playing');
    renderScores();
    renderBoard();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    scheduleAiIfNeeded();
  }

  // Option pill tabs in Title menu
  document.querySelectorAll<HTMLButtonElement>('[data-ttt-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = (btn.dataset.tttMode as GameMode) || 'ai';
      document.querySelectorAll('[data-ttt-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      difficultyGroup.hidden = mode !== 'ai';
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-ttt-diff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      difficulty = (btn.dataset.tttDiff as AiDifficulty) || 'medium';
      document.querySelectorAll('[data-ttt-diff]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-ttt-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardSize = btn.dataset.tttSize === '4' ? 4 : 3;
      document.querySelectorAll('[data-ttt-size]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-ttt-mark]').forEach((btn) => {
    btn.addEventListener('click', () => {
      humanMark = btn.dataset.tttMark === 'O' ? 'O' : 'X';
      document.querySelectorAll('[data-ttt-mark]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('ttt-start-btn')?.addEventListener('click', startNewRound);
  document.getElementById('ttt-restart-btn')?.addEventListener('click', startNewRound);
  document.getElementById('ttt-play-again-btn')?.addEventListener('click', startNewRound);
  document.getElementById('ttt-menu-btn')?.addEventListener('click', () => {
    clearAiTimer();
    setAppState('title');
  });
  document.getElementById('ttt-over-menu-btn')?.addEventListener('click', () => {
    clearAiTimer();
    setAppState('title');
  });
  document.getElementById('ttt-reset-scores-btn')?.addEventListener('click', () => {
    scores = { xWins: 0, oWins: 0, draws: 0, streak: 0 };
    saveScores(scores);
    renderScores();
  });

  btnMute?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    btnMute.setAttribute('aria-pressed', String(audio.muted));
    btnMute.textContent = audio.muted ? 'Sound: Off' : 'Sound: On';
    btnMute.blur();
  });

  window.addEventListener('keydown', (e) => {
    if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startNewRound();
      return;
    }
    if (state === 'playing' && e.key >= '1' && e.key <= '9' && boardSize === 3) {
      const idx = Number(e.key) - 1;
      handleCellClick(idx);
    }
    if (state === 'playing' && e.key.toLowerCase() === 'r') {
      startNewRound();
    }
  });

  renderScores();
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    startNewRound();
  } else {
    setAppState('title');
  }
}

initTicTacToe();
