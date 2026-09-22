async function request(path, options = {}) {
  const response = await fetch(path, {headers: {"Content-Type": "application/json"}, ...options});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  modelInfo: () => request("/api/model-info"),
  analyze: (payload) => request("/api/analyze", {method: "POST", body: JSON.stringify(payload)}),
  testLLM: (payload) => request("/api/llm/test", {method: "POST", body: JSON.stringify(payload)}),
  explain: (payload) => request("/api/llm/explain", {method: "POST", body: JSON.stringify(payload)}),
};

