export const state = {
  analysis: null,
  activeView: "analysis",
  referenceLine: "all",
};

export function setAnalysis(value) { state.analysis = value; }
