export function horizontalBars(container, rows, suffix = "") {
  if (!container) return;
  container.innerHTML = rows.map(row => `<div class="bar-row"><span>${row.label}</span><div class="bar-track"><span style="width:${Math.max(3, Math.min(100, row.value))}%"></span></div><b>${row.display ?? row.value}${suffix}</b></div>`).join("");
}

export function verticalBars(rows, valueKey, max, suffix = "") {
  return `<div class="kpi-bars">${rows.map(row => `<div class="kpi-column"><b>${row[valueKey]}${suffix}</b><span style="height:${Math.max(6, row[valueKey] / max * 125)}px"></span><small>${row.line_id}</small></div>`).join("")}</div>`;
}

