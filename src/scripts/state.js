export const boardState = {
  items: [],
  panX: 0,
  panY: 0,
  nextWriteX: 0,
  nextWriteY: 0,
  nextId: 1,
  recordedAudioBlob: null,
  drawPaths: [],
  shapes: [],
  stickyNotes: [],
  settings: {
    volume: 0.5,
    equationColor: '#fff6de',
    drawColor: '#fef5dd',
  },
  tools: {
    mode: 'pan', // pan | draw | shape | sticky
    shapeType: 'circle',
  },
};

export function resetBoardState() {
  boardState.items = [];
  boardState.nextId = 1;
  boardState.drawPaths = [];
  boardState.shapes = [];
  boardState.stickyNotes = [];
}

export function makeEqKey(eq, i) {
  return `${eq.label || 'eq'}::${(eq.latex || '').replace(/\s+/g, '')}::${i}`;
}
