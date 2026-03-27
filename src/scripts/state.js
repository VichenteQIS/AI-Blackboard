export const boardState = {
  title: '',
  equations: [],
  notes: [],
  recordedAudioBlob: null,
};

export function resetBoardState() {
  boardState.title = '';
  boardState.equations = [];
  boardState.notes = [];
}

export function makeEqKey(eq, i) {
  return `${eq.label || 'eq'}::${(eq.latex || '').replace(/\s+/g, '')}::${i}`;
}
