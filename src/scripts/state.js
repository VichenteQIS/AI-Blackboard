export const boardState = {
  items: [],
  panX: 0,
  panY: 0,
  nextWriteX: 0,
  nextWriteY: 0,
  nextId: 1,
  recordedAudioBlob: null,
};

export function resetBoardState() {
  boardState.items = [];
  boardState.nextId = 1;
}

export function makeEqKey(eq, i) {
  return `${eq.label || 'eq'}::${(eq.latex || '').replace(/\s+/g, '')}::${i}`;
}
