export interface HistoryEntry<T> {
  id: string;
  label: string;
  timestamp: number;
  data: T;
}

export class CommandHistory<T> {
  private entries: HistoryEntry<T>[] = [];
  private cursor = -1;
  private maxDepth: number;

  constructor(maxDepth = 40) {
    this.maxDepth = Math.max(5, maxDepth);
  }

  push(label: string, data: T): void {
    if (this.cursor < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.cursor + 1);
    }
    this.entries.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      timestamp: Date.now(),
      data,
    });
    if (this.entries.length > this.maxDepth) {
      const overflow = this.entries.length - this.maxDepth;
      this.entries.splice(0, overflow);
    }
    this.cursor = this.entries.length - 1;
  }

  canUndo(): boolean {
    return this.cursor > 0;
  }

  canRedo(): boolean {
    return this.cursor >= 0 && this.cursor < this.entries.length - 1;
  }

  undo(): HistoryEntry<T> | null {
    if (!this.canUndo()) return null;
    this.cursor -= 1;
    return this.entries[this.cursor];
  }

  redo(): HistoryEntry<T> | null {
    if (!this.canRedo()) return null;
    this.cursor += 1;
    return this.entries[this.cursor];
  }

  jumpTo(index: number): HistoryEntry<T> | null {
    if (index < 0 || index >= this.entries.length) return null;
    this.cursor = index;
    return this.entries[this.cursor];
  }

  getCurrentIndex(): number {
    return this.cursor;
  }

  getEntries(): readonly HistoryEntry<T>[] {
    return this.entries;
  }

  setMaxDepth(depth: number): void {
    this.maxDepth = Math.max(5, depth);
    if (this.entries.length > this.maxDepth) {
      const overflow = this.entries.length - this.maxDepth;
      this.entries.splice(0, overflow);
      this.cursor = Math.max(0, this.cursor - overflow);
    }
  }

  clear(): void {
    this.entries = [];
    this.cursor = -1;
  }
}
