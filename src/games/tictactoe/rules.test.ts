import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAiMove, evaluateBoard, type CellValue } from './rules';

test('3x3 board detects row, column, diagonal wins and draws', () => {
  const rowWin: CellValue[] = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
  assert.deepEqual(evaluateBoard(rowWin, 3), { winner: 'X', line: [0, 1, 2] });

  const diagWin: CellValue[] = ['O', 'X', 'X', null, 'O', null, 'X', null, 'O'];
  assert.deepEqual(evaluateBoard(diagWin, 3), { winner: 'O', line: [0, 4, 8] });

  const draw: CellValue[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.deepEqual(evaluateBoard(draw, 3), { winner: 'draw', line: null });
});

test('4x4 board detects 4-in-a-row win correctly', () => {
  const board: CellValue[] = new Array(16).fill(null);
  board[3] = 'O';
  board[6] = 'O';
  board[9] = 'O';
  board[12] = 'O';
  assert.deepEqual(evaluateBoard(board, 4), { winner: 'O', line: [3, 6, 9, 12] });
});

test('unbeatable AI takes immediate win and blocks opponent fork/win', () => {
  const winSetup: CellValue[] = ['O', 'O', null, 'X', 'X', null, null, null, null];
  assert.equal(chooseAiMove(winSetup, 'O', 'unbeatable', 3), 2);

  const blockSetup: CellValue[] = ['X', null, 'X', null, 'O', null, null, null, null];
  assert.equal(chooseAiMove(blockSetup, 'O', 'unbeatable', 3), 1);
});
