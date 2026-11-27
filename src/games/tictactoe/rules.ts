export type Mark = 'X' | 'O';
export type CellValue = Mark | null;
export type AiDifficulty = 'easy' | 'medium' | 'unbeatable';
export type GameMode = 'ai' | 'pvp';

export interface WinResult {
  winner: Mark | 'draw' | null;
  line: number[] | null;
}

export function getWinLines(size: 3 | 4): number[][] {
  const lines: number[][] = [];
  // Rows
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(r * size + c);
    lines.push(row);
  }
  // Cols
  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    for (let r = 0; r < size; r++) col.push(r * size + c);
    lines.push(col);
  }
  // Main diagonal
  const d1: number[] = [];
  const d2: number[] = [];
  for (let i = 0; i < size; i++) {
    d1.push(i * size + i);
    d2.push(i * size + (size - 1 - i));
  }
  lines.push(d1, d2);
  return lines;
}

export function evaluateBoard(board: CellValue[], size: 3 | 4 = 3): WinResult {
  const lines = getWinLines(size);
  for (const line of lines) {
    const first = board[line[0]];
    if (!first) continue;
    if (line.every((idx) => board[idx] === first)) {
      return { winner: first, line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

export function getAvailableMoves(board: CellValue[]): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

function minimax3(
  board: CellValue[],
  depth: number,
  isMaximizing: boolean,
  aiMark: Mark,
  humanMark: Mark,
  alpha: number,
  beta: number
): number {
  const res = evaluateBoard(board, 3);
  if (res.winner === aiMark) return 10 - depth;
  if (res.winner === humanMark) return depth - 10;
  if (res.winner === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = aiMark;
      const score = minimax3(board, depth + 1, false, aiMark, humanMark, alpha, beta);
      board[i] = null;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = humanMark;
      const score = minimax3(board, depth + 1, true, aiMark, humanMark, alpha, beta);
      board[i] = null;
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findImmediateWinningMove(board: CellValue[], mark: Mark, size: 3 | 4): number | null {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    board[i] = mark;
    const res = evaluateBoard(board, size);
    board[i] = null;
    if (res.winner === mark) return i;
  }
  return null;
}

function scoreHeuristicMove4(board: CellValue[], idx: number, aiMark: Mark, humanMark: Mark): number {
  const lines = getWinLines(4);
  board[idx] = aiMark;
  let score = 0;
  for (const line of lines) {
    let aiCount = 0;
    let humanCount = 0;
    for (const cellIdx of line) {
      if (board[cellIdx] === aiMark) aiCount++;
      else if (board[cellIdx] === humanMark) humanCount++;
    }
    if (aiCount > 0 && humanCount === 0) {
      score += Math.pow(4, aiCount);
    } else if (humanCount > 0 && aiCount === 0) {
      score -= Math.pow(3.5, humanCount);
    }
  }
  board[idx] = null;
  // Center bonus
  if (idx === 5 || idx === 6 || idx === 9 || idx === 10) score += 6;
  return score;
}

export function chooseAiMove(
  board: CellValue[],
  aiMark: Mark,
  difficulty: AiDifficulty,
  size: 3 | 4 = 3,
  rng: () => number = Math.random
): number {
  const available = getAvailableMoves(board);
  if (available.length === 0) return -1;

  const humanMark: Mark = aiMark === 'X' ? 'O' : 'X';
  const copy = board.slice();

  if (difficulty === 'easy') {
    if (rng() < 0.35) {
      const win = findImmediateWinningMove(copy, aiMark, size);
      if (win !== null) return win;
    }
    return available[Math.floor(rng() * available.length)];
  }

  // Medium: take immediate win or block immediate loss, otherwise 55% smart / 45% random
  const immediateWin = findImmediateWinningMove(copy, aiMark, size);
  if (immediateWin !== null) return immediateWin;

  const immediateBlock = findImmediateWinningMove(copy, humanMark, size);
  if (immediateBlock !== null && (difficulty === 'unbeatable' || rng() < 0.85)) {
    return immediateBlock;
  }

  if (difficulty === 'medium' && rng() < 0.45) {
    return available[Math.floor(rng() * available.length)];
  }

  if (size === 3) {
    // Fast opening optimization for empty board
    if (available.length === 9) return 4;
    let bestScore = -Infinity;
    let bestMove = available[0];
    for (const idx of available) {
      copy[idx] = aiMark;
      const score = minimax3(copy, 0, false, aiMark, humanMark, -Infinity, Infinity);
      copy[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  // 4x4 heuristic tactical lookahead
  let bestScore = -Infinity;
  let bestMove = available[0];
  for (const idx of available) {
    const score = scoreHeuristicMove4(copy, idx, aiMark, humanMark);
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }
  return bestMove;
}
