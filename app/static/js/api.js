async function request(path, options = {}) {
  const response = await fetch(path, {headers: {"Content-Type": "application/json"}, ...options});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map(item => `${item.loc?.at(-1) || "Field"}: ${item.msg || "Invalid value"}`).join(" · ")
      : data.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data;
}

export const api = {
  modelInfo: () => request("/api/model-info"),
  analyze: (payload) => request("/api/analyze", {method: "POST", body: JSON.stringify(payload)}),
  testLLM: (payload) => request("/api/llm/test", {method: "POST", body: JSON.stringify(payload)}),
  explain: (payload) => request("/api/llm/explain", {method: "POST", body: JSON.stringify(payload)}),
};
