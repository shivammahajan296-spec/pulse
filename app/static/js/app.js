import { api } from "./api.js";
import { state, setAnalysis } from "./state.js";
import { horizontalBars, verticalBars } from "./charts.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const fmt = (n) => new Intl.NumberFormat("en-US").format(n);

const DEMO_LINES = [
  {rank:1,line_id:"F04",line_name:"Piston Performance Line",score:87.4,oee:81.2,interval:[77.1,84.8],scrap:2.3,throughput:7500,lineSpeed:132,labor:5,changeover:68,risk:"Low"},
  {rank:2,line_id:"F07",line_name:"Compact Bottle Line",score:79.8,oee:78.1,interval:[73.4,82.6],scrap:3.1,throughput:7100,lineSpeed:128,labor:5,changeover:49,risk:"Medium"},
  {rank:3,line_id:"F02",line_name:"FlexiFill Multi-format",score:71.6,oee:76.5,interval:[70.2,81.9],scrap:3.8,throughput:6800,lineSpeed:120,labor:6,changeover:92,risk:"Medium"},
];

const DEMO_REFERENCES = [
  {sku:"SKU-1184",name:"Aqua Repair Lotion",line:"F04",similarity:93,formula:"Lotion",package:"Bottle · Pump",oee:79.4,scrap:2.8,throughput:6710,why:["Same filling technology","Similar viscosity","Same pump package"]},
  {sku:"SKU-1067",name:"Barrier Cloud Lotion",line:"F04",similarity:89,formula:"Emulsion",package:"Bottle · Pump",oee:77.8,scrap:3.1,throughput:6480,why:["Same package class","Fill volume within 8%","Same category"]},
  {sku:"SKU-1321",name:"Daily Defense 200",line:"F07",similarity:84,formula:"Lotion",package:"Bottle · Pump",oee:74.6,scrap:3.7,throughput:6020,why:["Same formula type","Exact fill volume","Similar complexity"]},
  {sku:"SKU-1219",name:"Hydra Balance 12",line:"F02",similarity:81,formula:"Emulsion",package:"Airless Pump",oee:72.2,scrap:4.2,throughput:5635,why:["Similar viscosity","Same product family","Pump filling"]},
  {sku:"SKU-1398",name:"Calm Restore 8",line:"F04",similarity:78,formula:"Cream",package:"Bottle · Pump",oee:75.9,scrap:3.5,throughput:6290,why:["Same line","Package match","Comparable process complexity"]},
];

const DEMO_HISTORY_ROWS = [
  {sku:"SKU-1024",name:"Hydrating Body Lotion",line:"F04",similarity:94,formula:"Lotion",package:"200ml Pump",viscosity:14800,oee:82.1,scrap:2.1,throughput:7600,changeover:65,why:["Same formula","Same package","Viscosity ±2%"],date:"12-Mar-2024",outcome:"Successful"},
  {sku:"SKU-0891",name:"Daily Moisturizer",line:"F04",similarity:91,formula:"Lotion",package:"200ml Pump",viscosity:13900,oee:79.8,scrap:2.5,throughput:7400,changeover:72,why:["Same package","Same category","Piston filling"],date:"18-Nov-2023",outcome:"Successful"},
  {sku:"SKU-1144",name:"Soothing Lotion",line:"F07",similarity:88,formula:"Lotion",package:"200ml Pump",viscosity:15200,oee:80.6,scrap:2.8,throughput:7100,changeover:80,why:["Viscosity +6%","Same formula"],date:"04-Jun-2024",outcome:"Successful"},
  {sku:"SKU-0771",name:"Vitamin E Lotion",line:"F04",similarity:86,formula:"Lotion",package:"200ml Pump",viscosity:14300,oee:81.9,scrap:2.4,throughput:7550,changeover:68,why:["Same category","Same line","Same closure"],date:"21-Aug-2023",outcome:"Successful"},
  {sku:"SKU-0933",name:"Aloe Nourishing",line:"F02",similarity:82,formula:"Lotion",package:"200ml Pump",viscosity:13100,oee:78.5,scrap:3.1,throughput:6900,changeover:95,why:["Similar viscosity","Same package"],date:"09-Jan-2024",outcome:"Successful"},
  {sku:"SKU-0654",name:"Repair Lotion",line:"F07",similarity:79,formula:"Lotion",package:"200ml Pump",viscosity:15600,oee:76.8,scrap:3.4,throughput:6800,changeover:88,why:["Same filling tech","Same formula","Similar volume"],date:"15-May-2023",outcome:"Successful"},
  {sku:"SKU-0412",name:"Moisture Restore",line:"F02",similarity:76,formula:"Lotion",package:"200ml Pump",viscosity:14000,oee:77.1,scrap:3.0,throughput:7000,changeover:92,why:["Same package","Same category"],date:"02-Feb-2023",outcome:"Successful"},
];

const DEMO_RISKS = [
  ["Viscosity boundary","Medium","Product viscosity approaches a qualified line envelope."],
  ["High scrap","High","Predicted startup scrap exceeds the launch threshold."],
  ["Limited comparable history","Medium","Few close launches are available on a candidate line."],
  ["Long changeover","Medium","Cleaning and format transition exceed the target window."],
  ["Labor pressure","High","Expected crew requirement is above the operating assumption."],
];

const comparisonState = {sort:"score", line:"all", search:"", detail:"F04"};
const referenceState = {line:"all", search:"", min:70, selected:"SKU-1024"};
const SKU_SCENARIOS = {
  low:{label:"Low risk",sku:"NPL-SKIN-042",values:{launch_scenario:"standard",product_name:"New Hydrating Lotion",category:"Skincare",product_family:"Hydration",formula_type:"Lotion",viscosity:14500,fill_volume_ml:200,package_type:"Bottle",container_type:"Plastic Bottle",closure_type:"Pump",filling_technology:"Piston Filling",decoration:"Label",process_complexity:"Medium",previous_product:"Hydrating Serum",previous_product_category:"Skincare",planned_batch_quantity:50000,run_sequence:1,campaign_position:2,days_since_prior_run:4,days_since_last_pm:11,labor_assumption:6,compounding_required:true}},
  medium:{label:"Medium risk",sku:"NPL-SER-118",values:{launch_scenario:"standard",product_name:"Radiance Renewal Serum",category:"Serum",product_family:"Treatment",formula_type:"Serum",viscosity:11500,fill_volume_ml:100,package_type:"Bottle",container_type:"Glass Bottle",closure_type:"Dropper",filling_technology:"Pump Filling",decoration:"Hot Stamp",process_complexity:"High",previous_product:"Daily Foundation",previous_product_category:"Foundation",planned_batch_quantity:30000,run_sequence:1,campaign_position:1,days_since_prior_run:21,days_since_last_pm:30,labor_assumption:7,compounding_required:true}},
  high:{label:"High risk",sku:"NPL-MAS-207",values:{launch_scenario:"standard",product_name:"Extreme Volume Mascara",category:"Mascara",product_family:"Color",formula_type:"Mascara",viscosity:60000,fill_volume_ml:15,package_type:"Bottle",container_type:"Plastic Bottle",closure_type:"Wand",filling_technology:"Mascara Filling",decoration:"Hot Stamp",process_complexity:"High",previous_product:"Hydrating Lotion",previous_product_category:"Skincare",planned_batch_quantity:65000,run_sequence:1,campaign_position:1,days_since_prior_run:45,days_since_last_pm:60,labor_assumption:6,compounding_required:true}},
  cold:{label:"Cold-start",sku:"NPL-INN-501",values:{launch_scenario:"cold_start",product_name:"Bio-Peptide Microgel",category:"Skincare",product_family:"Premium",formula_type:"Gel",viscosity:26000,fill_volume_ml:75,package_type:"Airless Pump",container_type:"Plastic Bottle",closure_type:"Pump",filling_technology:"Piston Filling",decoration:"Sleeve",process_complexity:"High",previous_product:"Hydrating Serum",previous_product_category:"Serum",planned_batch_quantity:18000,run_sequence:1,campaign_position:1,days_since_prior_run:30,days_since_last_pm:60,labor_assumption:6,compounding_required:true}},
  rebrand:{label:"Rebrand",sku:"NPL-BRD-310",values:{launch_scenario:"rebrand",product_name:"Aurelia Hydration Lotion",category:"Skincare",product_family:"Daily Care",formula_type:"Lotion",viscosity:14500,fill_volume_ml:200,package_type:"Bottle",container_type:"Plastic Bottle",closure_type:"Pump",filling_technology:"Piston Filling",decoration:"Label",process_complexity:"Medium",previous_product:"Aqua Repair Lotion",previous_product_category:"Skincare",planned_batch_quantity:50000,run_sequence:1,campaign_position:2,days_since_prior_run:3,days_since_last_pm:11,labor_assumption:6,compounding_required:true}},
};

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toast-region").append(el);
  setTimeout(() => el.remove(), 3500);
}

function initLogin() {
  const screen=$("#login-screen"), shell=$("#app-shell"), form=$("#login-form"), email=$("#login-email"), password=$("#login-password"), error=$("#login-error"), accountButton=$("#account-menu-button"), accountPopover=$("#account-popover"), accountEmail=$("#account-email");
  const authenticated=sessionStorage.getItem("pulse_authenticated")==="true"||localStorage.getItem("pulse_authenticated")==="true";
  const currentEmail=()=>sessionStorage.getItem("pulse_user_email")||localStorage.getItem("pulse_user_email")||"Demo user";
  const updateAccount=()=>{const value=currentEmail();accountEmail.textContent=value;accountButton.title=value;const initials=value.includes("@")?value.split("@")[0].split(/[._-]/).map(part=>part[0]).join("").slice(0,2).toUpperCase():"SM";accountButton.textContent=initials||"SM";$(".account-avatar").textContent=initials||"SM"};
  const closeAccount=()=>{accountPopover.classList.add("hidden");accountButton.setAttribute("aria-expanded","false")};
  accountButton.onclick=event=>{event.stopPropagation();const opening=accountPopover.classList.contains("hidden");accountPopover.classList.toggle("hidden",!opening);accountButton.setAttribute("aria-expanded",String(opening))};
  accountPopover.onclick=event=>event.stopPropagation();
  document.addEventListener("click",closeAccount);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeAccount()});
  $("#logout-button").onclick=()=>{sessionStorage.removeItem("pulse_authenticated");sessionStorage.removeItem("pulse_user_email");localStorage.removeItem("pulse_authenticated");localStorage.removeItem("pulse_user_email");closeAccount();window.location.reload()};
  const showApp=()=>{screen.classList.add("hidden");shell.classList.remove("hidden");updateAccount()};
  if(authenticated){showApp();return}
  shell.classList.add("hidden");screen.classList.remove("hidden");
  $("#toggle-login-password").onclick=()=>{password.type=password.type==="password"?"text":"password"};
  $("#forgot-password").onclick=()=>{error.textContent="Use the shared POC password provided by your Project PULSE administrator.";error.classList.remove("hidden")};
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const validDomain=/^[^@\s]+@(straive\.com|estee\.com)$/i.test(email.value.trim());
    const validPassword=password.value==="PULSE123";
    if(!validDomain||!validPassword){error.textContent=!validDomain?"Enter a valid @straive.com or @estee.com email address.":"Incorrect password. Please try again.";error.classList.remove("hidden");(!validDomain?email:password).focus();return}
    error.classList.add("hidden");
    sessionStorage.setItem("pulse_authenticated","true");
    sessionStorage.setItem("pulse_user_email",email.value.trim());
    if($("#remember-login").checked){localStorage.setItem("pulse_authenticated","true");localStorage.setItem("pulse_user_email",email.value.trim())}else{localStorage.removeItem("pulse_authenticated");localStorage.removeItem("pulse_user_email")}
    updateAccount();
    shell.classList.remove("hidden");screen.classList.add("login-leaving");
    setTimeout(()=>{screen.classList.add("hidden");screen.classList.remove("login-leaving")},380);
  });
}

function showView(name) {
  state.activeView = name;
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === name));
  updateTopbar(name);
  $("#sidebar").classList.remove("open");
  window.scrollTo({top: 0, behavior: "smooth"});
}

function bindJumpButtons() {
  $$('[data-view-jump]').forEach(button => button.onclick = () => {
    if (button.id === "header-analysis-cta" && state.activeView === "analysis") {
      $("#analysis-form").requestSubmit();
      return;
    }
    showView(button.dataset.viewJump);
  });
}

function updateTopbar(name) {
  const isAnalysis = name === "analysis";
  const isComparison = name === "comparison";
  const isReferences = name === "references";
  const isRisks = name === "risks";
  const isModel = name === "model";
  const isSettings = name === "settings";
  document.body.classList.toggle("analysis-mode", isAnalysis);
  document.body.classList.toggle("comparison-mode", isComparison);
  document.body.classList.toggle("references-mode", isReferences);
  document.body.classList.toggle("risk-mode", isRisks);
  document.body.classList.toggle("model-mode", isModel);
  document.body.classList.toggle("settings-mode", isSettings);
  $("#topbar-breadcrumbs").innerHTML = isAnalysis
    ? 'Project PULSE <span>/</span> Module 1 <span>/</span> New SKU Analysis'
    : isComparison ? 'Project PULSE <span>/</span> Module 1 <span>/</span> Line Comparison'
    : isReferences ? 'Project PULSE <span>/</span> Module 1 <span>/</span> Historical References'
    : isRisks ? 'Project PULSE <span>/</span> Module 1 <span>/</span> Risk &amp; Explainability'
    : isModel ? 'Project PULSE <span>/</span> Module 1 <span>/</span> Model &amp; Data Overview'
    : isSettings ? 'Project PULSE <span>/</span> Module 1 <span>/</span> Settings'
    : 'Project PULSE <span>/</span> Module 1';
  $("#topbar-heading").textContent = isAnalysis ? "New SKU Analysis" : isComparison ? "Line Comparison" : isReferences ? "Historical References" : isRisks ? "Risk & Explainability" : isModel ? "Model & Data Overview" : isSettings ? "Settings" : "NPL Predictive Performance";
  $("#topbar-subtitle").innerHTML = isAnalysis
    ? "Enter product attributes and launch context to predict startup performance and get line recommendations."
    : isComparison ? "Compare eligible manufacturing lines and understand what drives their position."
    : isReferences ? "Explore similar product launches to understand expected performance and key learnings."
    : isRisks ? "Understand the key risks, drivers, and evidence behind the line recommendation."
    : isModel ? "Understand the data foundation, modeling approach, and key assumptions behind NPL Predictive Performance."
    : isSettings ? "Manage AI integration, model configuration, and operational parameters."
    : '<b>Predict. Compare. Decide.</b><span>|</span>Manufacturing intelligence for new product launches.';
  $("#header-load-demo").classList.toggle("hidden", !isAnalysis);
  $$(".settings-header-action").forEach(button=>button.classList.toggle("hidden",!isSettings));
  $("#header-analysis-cta").classList.toggle("hidden",isSettings);
  $(".header-cta-label").textContent = isAnalysis ? "Analyze SKU" : "New Analysis";
  $("#header-analysis-cta > span:first-child").textContent = isAnalysis ? "" : "＋";
}

function renderAnalysisPreview() {
  const form = $("#analysis-form");
  if (!form) return;
  const value = name => form.elements[name]?.value || "—";
  const packageLabel = value("package_type") === "Bottle"
    ? `Bottle (${value("container_type").replace(" Bottle", "")})`
    : value("package_type");
  const rows = [
    ["▧", "Product", value("product_name")],
    ["◇", "Category", value("category")],
    ["△", "Formula type", value("formula_type")],
    ["▤", "Fill volume", `${value("fill_volume_ml")} ml`],
    ["♨", "Viscosity", `${fmt(Number(value("viscosity")) || 0)} cP`],
    ["⌂", "Package", packageLabel],
    ["◉", "Closure", value("closure_type")],
    ["▣", "Filling technology", value("filling_technology")],
    ["◩", "Decoration", value("decoration")],
    ["⌁", "Process complexity", value("process_complexity")],
    ["♧", "Compounding required", form.elements.compounding_required.checked ? '<span class="preview-yes">Yes</span>' : "No"],
    ["⬡", "Planned batch quantity", `${fmt(Number(value("planned_batch_quantity")) || 0)} units`],
  ];
  $("#analysis-preview").innerHTML = rows.map(([icon,label,display]) => `<div><dt><i>${icon}</i>${label}</dt><dd>${display}</dd></div>`).join("");
}

function demoBanner() {
  return `<div class="demo-data-banner"><div><span class="demo-label">Demo / Sample Data</span><b>Illustrative manufacturing scenario</b></div><p>Demo data shown. Run a new SKU analysis to populate live results.</p><button class="text-button" data-view-jump="analysis">Analyze New SKU →</button></div>`;
}

function riskPill(severity) {
  return `<span class="pill pill-${severity === "High" ? "danger" : severity === "Medium" ? "warn" : "success"}">${esc(severity)}</span>`;
}

function miniBar(value, max, tone = "orange") {
  return `<span class="table-mini"><i><b class="${tone}" style="width:${Math.max(4, Math.min(100, value / max * 100))}%"></b></i><em>${esc(value)}</em></span>`;
}

function intervalVisual(low, high) {
  const left = Math.max(0, (low - 50) / 45 * 100);
  const width = Math.max(5, (high - low) / 45 * 100);
  return `<span class="interval-viz"><em>${low}–${high}%</em><i><b style="left:${left}%;width:${width}%"></b></i></span>`;
}

function renderDemoComparison() {
  renderComparisonWorkspace({lines:DEMO_LINES,product:{product_name:"New Hydrating Lotion",category:"Skincare",formula_type:"Lotion",fill_volume_ml:200,viscosity:14500,compounding_required:true},analysisId:"AN-2026-0142",excludedCount:9,demo:true,whatWouldChange:["If previous product changes from serum to lotion → F07 changeover drops by 31 minutes.","If viscosity is reduced by 10% → F07 score increases by ~4.2 points.","If F04 is unavailable → F07 becomes the recommended line.","If labor constraint is relaxed → F02 becomes more competitive."]});
}

function renderDemoReferences() {
  renderReferencesWorkspace({demo:true,product:{product_name:"New Hydrating Lotion",category:"Skincare",formula_type:"Lotion",fill_volume_ml:200,viscosity:14500,package_type:"Pump Bottle",closure_type:"Pump",filling_technology:"Piston",compounding_required:true},analysisId:"AN-2026-0142",rows:DEMO_HISTORY_ROWS,lines:["F04","F07","F02"]});
}

function renderDemoRisks() {
  renderRiskWorkspace({demo:true,product:{product_name:"New Hydrating Lotion",category:"Skincare",formula_type:"Lotion",fill_volume_ml:200,viscosity:14500,package_type:"200ml Pump",filling_technology:"Piston",compounding_required:true},analysisId:"AN-2026-0142",line:"F04",oee:81.2,oeeInterval:[77.1,84.8],scrap:2.3,scrapInterval:[1.5,3.6],throughput:7500,throughputInterval:[6800,8200],positive:[["Line Experience",18.2],["Package Match",14.0],["Viscosity Fit",12.1],["Filling Technology",9.4]],negative:[["Changeover Duration",-7.6],["Labor Requirement",-4.3],["Uncertainty",-3.1]],whatWouldChange:["Previous product changes (Serum → Lotion)","Reduce viscosity by 10%","F04 unavailable","Relax labor constraint"]});
}

function renderOverview(data) {
  $("#view-overview").classList.add("analysis-active");
  $("#overview-empty").classList.add("hidden");
  const root = $("#overview-results");
  root.classList.remove("hidden");
  const best = data.ranked_lines[0];
  if (!best) {
    root.innerHTML = `<div class="compact-empty"><div><span>!</span><h3>No eligible filling line</h3><p>Review the exact exclusion reasons and adjust the physical specification.</p></div><button class="button button-primary" data-view-jump="analysis">Revise inputs →</button></div>`;
    bindJumpButtons();
    return;
  }
  $("#overview-subtitle").textContent = `${data.product.product_name} · ${data.product.fill_volume_ml} ml ${data.product.package_type} · ${fmt(data.product.viscosity)} cP`;
  const lead = data.runner_up ? (best.score - data.runner_up.score).toFixed(1) : best.score.toFixed(1);
  const topRefs = best.similar_launches.slice(0,3);
  const compound = data.compounding_candidates[0];
  root.innerHTML = `<div class="decision-kpis"><article class="card decision-kpi accent"><span>Recommended Line</span><strong>${best.line_id}</strong><small>${esc(best.line_name)}</small></article><article class="card decision-kpi"><span>Predicted OEE</span><strong>${best.predictions.oee}%</strong><small>${best.predictions.oee_interval[0]}–${best.predictions.oee_interval[1]}% interval</small></article><article class="card decision-kpi"><span>Startup Risk</span><strong>${best.risk_flags[0].severity}</strong><small>${best.uncertainty.level} uncertainty</small></article><article class="card decision-kpi"><span>Eligible Lines</span><strong>${data.eligible_lines.length}</strong><small>${data.excluded_lines.length} excluded by capability rules</small></article></div><div class="decision-middle"><article class="card recommendation-card" id="recommendation-card"><p class="eyebrow">RECOMMENDATION SUMMARY</p><div class="rec-line"><div class="line-badge">${best.line_id}</div><div><h3>${esc(best.line_name)}</h3><p>Rank 1 of ${data.ranked_lines.length} eligible candidates</p></div><div class="rec-score"><strong>${best.score}</strong><small>overall score</small></div></div><p>${esc(data.rationale)}</p><p id="ai-narrative" class="hidden"></p><div class="rec-kpis"><div><span>Decision lead</span><strong>${lead} pts</strong></div><div><span>Compatibility</span><strong>${best.predictions.compatibility}%</strong></div><div><span>Changeover</span><strong>${best.predictions.changeover_minutes} min</strong></div><div><span>Route</span><strong>${compound ? `${compound.line_id} → ${best.line_id}` : best.line_id}</strong></div></div></article><article class="card chart-card"><div class="card-head"><div><p class="eyebrow">CANDIDATE LINE RANKING</p><h3>Composite decision score</h3></div><span class="legend-dot">Score / 100</span></div><div id="overview-score-chart" class="bar-chart"></div><button class="text-button" data-view-jump="comparison">Compare all candidates →</button></article></div><div class="decision-bottom"><article class="card insight-card"><div class="card-head"><div><p class="eyebrow">KPI FORECAST</p><h3>Startup performance</h3></div><span class="pill pill-neutral">${best.uncertainty.level} uncertainty</span></div><div class="forecast-grid"><span><small>OEE</small><b>${best.predictions.oee}%</b><em>${best.predictions.oee_interval.join("–")}%</em></span><span><small>Scrap</small><b>${best.predictions.scrap_pct}%</b><em>${best.predictions.scrap_interval.join("–")}%</em></span><span><small>Throughput</small><b>${fmt(best.predictions.throughput_units_hr)}</b><em>units / hour</em></span><span><small>Labor</small><b>${best.predictions.labor_required}</b><em>operators</em></span></div></article><article class="card insight-card"><div class="card-head"><div><p class="eyebrow">HISTORICAL EVIDENCE</p><h3>${best.similar_launches.length} closest launches</h3></div><button class="text-button" data-view-jump="references">View all →</button></div><div class="evidence-list">${topRefs.map(ref => `<div><span><b>${ref.sku}</b><small>${esc(ref.product_name)}</small></span><strong>${ref.similarity_score}%</strong></div>`).join("")}</div></article><article class="card insight-card"><div class="card-head"><div><p class="eyebrow">TOP RISKS</p><h3>Launch watchlist</h3></div><button class="text-button" data-view-jump="risks">Details →</button></div><div class="risk-compact-list">${best.risk_flags.slice(0,3).map(r => `<div><span class="severity-dot ${r.severity.toLowerCase()}"></span><span><b>${esc(r.name)}</b><small>${esc(r.evidence)}</small></span>${riskPill(r.severity)}</div>`).join("")}</div></article><article class="card insight-card"><p class="eyebrow">WHAT WOULD CHANGE IT</p><h3>Decision sensitivity</h3><div class="scenario-list">${data.what_would_change.slice(0,3).map(item => `<div><b>↗</b><span>${esc(item)}</span></div>`).join("")}</div></article></div>`;
  if (!topRefs.length) {
    $('.evidence-list',root).innerHTML=`<div class="evidence-empty"><span>○</span><p><b>No comparable SKU found</b><small>Line baselines and capability fit are used with wider uncertainty.</small></p></div>`;
  }
  if (data.product.launch_scenario === "cold_start") {
    $('#recommendation-card',root).insertAdjacentHTML('afterbegin','<div class="storyline-note cold"><b>True cold start</b><span>No close product analogue exists; the recommendation is intentionally conservative.</span></div>');
  } else if (data.product.launch_scenario === "rebrand") {
    $('#recommendation-card',root).insertAdjacentHTML('afterbegin','<div class="storyline-note rebrand"><b>Rebrand recognized</b><span>The commercial identity is new, while technical attributes match established production history.</span></div>');
  }
  horizontalBars($("#overview-score-chart"), data.ranked_lines.map(line => ({label:line.line_id,value:line.score,display:line.score})).slice(0,6));
  $("#rerun-analysis").disabled = false;
  bindJumpButtons();
}

function comparisonMetric(value,max,suffix="") { return `<span class="comparison-metric"><b>${fmt(value)}${suffix}</b><i><em style="width:${Math.max(8,value/max*100)}%"></em></i></span>`; }

function comparisonRows(rows) {
  const maxThroughput=Math.max(...rows.map(row=>row.throughput),1);
  return rows.map(row=>`<tr class="${row.rank===1?"recommended":row.rank===2?"runner-up-row":""}"><td>${row.rank}</td><td class="comparison-line"><strong>${row.line_id}</strong>${row.rank===1?'<span class="comparison-tag recommended-tag">Recommended</span>':row.rank===2?'<span class="comparison-tag runner-tag">Runner Up</span>':''}</td><td>${comparisonMetric(row.score,100)}</td><td>${comparisonMetric(row.oee,100)}</td><td>${intervalVisual(row.interval[0],row.interval[1])}</td><td>${comparisonMetric(row.scrap,6)}</td><td>${comparisonMetric(row.throughput,maxThroughput)}</td><td>${comparisonMetric(row.lineSpeed,150)}</td><td>${comparisonMetric(row.labor,8)}</td><td>${comparisonMetric(row.changeover,120)}</td><td>${riskPill(row.risk)}</td></tr>`).join("");
}

function normalizeLiveLines(data) {
  return data.ranked_lines.map(row=>({rank:row.rank,line_id:row.line_id,line_name:row.line_name,score:row.score,oee:row.predictions.oee,interval:row.predictions.oee_interval,scrap:row.predictions.scrap_pct,throughput:row.predictions.throughput_units_hr,lineSpeed:Math.round(row.predictions.throughput_units_hr/60),labor:row.predictions.labor_required,changeover:row.predictions.changeover_minutes,risk:row.risk_flags[0]?.severity||"Low",risks:row.risk_flags,history:row.similar_launches?.length||0}));
}

function renderComparisonWorkspace(model) {
  const root=$('[data-section="comparison"]');
  let rows=model.lines.filter(row=>(comparisonState.line==="all"||row.line_id===comparisonState.line)&&(!comparisonState.search||`${row.line_id} ${row.line_name}`.toLowerCase().includes(comparisonState.search.toLowerCase())));
  rows=[...rows].sort((a,b)=>comparisonState.sort==="oee"?b.oee-a.oee:comparisonState.sort==="scrap"?a.scrap-b.scrap:comparisonState.sort==="throughput"?b.throughput-a.throughput:b.score-a.score);
  const selected=model.lines.find(row=>row.line_id===comparisonState.detail)||model.lines[0];
  const p=model.product, maxThroughput=Math.max(...model.lines.map(row=>row.throughput));
  root.innerHTML=`<div class="comparison-product card"><div class="comparison-product-name"><span>▣</span><p><b>${esc(p.product_name)}</b><small>NPL-SKIN-042</small></p></div>${[["Category",p.category],["Formula",p.formula_type],["Fill Volume",`${p.fill_volume_ml} ml`],["Viscosity",`${fmt(p.viscosity)} cP`],["Compounding",p.compounding_required?'<em>Yes</em>':'No'],["Eligible Lines",`${model.lines.length} of 12`],["Analysis ID",model.analysisId]].map(([label,value])=>`<div><small>${label}</small><b>${value}</b></div>`).join("")}<time>12-Sep-2026 10:24 AM</time>${model.demo?'<span class="comparison-demo">Demo / Sample Data</span>':''}</div><div class="comparison-main-grid"><section class="comparison-primary"><div class="comparison-controls"><div class="comparison-tabs"><button class="active">Eligible Lines (${model.lines.length})</button><button>All Lines (12)</button><button>Excluded Lines (${model.excludedCount})</button></div><div class="comparison-filters"><label class="comparison-search">⌕<input id="comparison-search" placeholder="Search lines..." value="${esc(comparisonState.search)}"></label><label><small>Line</small><select id="comparison-line-filter"><option value="all">All</option>${model.lines.map(row=>`<option value="${row.line_id}" ${comparisonState.line===row.line_id?"selected":""}>${row.line_id}</option>`).join("")}</select></label><label><small>Risk</small><select><option>All</option><option>Low</option><option>Medium</option></select></label><label class="sort-control"><small>Sort by</small><select id="comparison-sort"><option value="score" ${comparisonState.sort==="score"?"selected":""}>Recommendation Score</option><option value="oee" ${comparisonState.sort==="oee"?"selected":""}>Predicted OEE</option><option value="scrap" ${comparisonState.sort==="scrap"?"selected":""}>Lowest Scrap</option><option value="throughput" ${comparisonState.sort==="throughput"?"selected":""}>Throughput</option></select></label></div></div><article class="card comparison-table-card"><div class="table-scroll"><table class="comparison-table"><thead><tr><th>#</th><th>Line ↕</th><th>Score ↕</th><th>Predicted OEE<br>(%)</th><th>OEE Range ↕</th><th>Scrap<br>(%) ↕</th><th>Throughput<br>(units/hr)</th><th>Line Speed<br>(units/min)</th><th>Labor<br>(ops)</th><th>Changeover<br>(min)</th><th>Risk</th></tr></thead><tbody>${comparisonRows(rows)}</tbody></table></div></article><div class="comparison-subnav"><button class="active">KPI Comparison</button><button>Score Drivers</button><button>Eligibility Details</button><button>Changeover Analysis</button><span></span><label><input type="checkbox" checked> Show prediction intervals</label><button class="comparison-export">↗ Export</button></div><div class="comparison-charts"><article class="card comparison-chart-card"><h3>OEE vs Scrap</h3><p>Higher OEE and lower scrap are better</p><div class="scatter-plot">${model.lines.map((row,index)=>`<i class="scatter-point point-${index+1}" style="left:${12+row.scrap/6*72}%;bottom:${12+(row.oee-65)/25*72}%"><b>${row.line_id}</b></i>`).join("")}<span class="x-label">Scrap (%)</span><span class="y-label">Startup OEE (%)</span></div></article><article class="card comparison-chart-card"><h3>Throughput Comparison</h3><p>Predicted startup throughput</p><div class="vertical-comparison">${model.lines.map((row,index)=>`<div><b>${fmt(row.throughput)}</b><i class="${index===0?'accent':''}" style="height:${row.throughput/maxThroughput*84}%"></i><span>${row.line_id}</span></div>`).join("")}</div></article><article class="card comparison-chart-card"><h3>Composite Recommendation Score</h3><p>Weighted score across all criteria</p><div class="horizontal-comparison">${model.lines.map((row,index)=>`<div><span>${row.line_id}</span><i><em class="${index===0?'accent':''}" style="width:${row.score}%"></em></i><b>${row.score}</b></div>`).join("")}</div></article></div><div class="comparison-insights"><article class="card"><h3><span>☀</span> Key Takeaways</h3><ul><li>F04 offers the best overall balance of OEE, scrap, and throughput.</li><li>F07 has faster changeover but higher scrap risk.</li><li>F02 is a viable alternative if F04 and F07 are unavailable.</li></ul></article><article class="card"><h3><span>▥</span> What would change the recommendation?</h3><ol>${model.whatWouldChange.slice(0,4).map(item=>`<li>${esc(item)}</li>`).join("")}</ol></article></div></section><aside class="card comparison-details"><h3>Line Details</h3><select id="comparison-detail-select">${model.lines.map(row=>`<option value="${row.line_id}" ${selected.line_id===row.line_id?'selected':''}>${row.line_id}${row.rank===1?' (Recommended)':''}</option>`).join("")}</select><h4>Key Capabilities</h4><dl><div><dt>♨ Viscosity range</dt><dd>1,000 – 50,000 cP</dd></div><div><dt>▣ Fill volume range</dt><dd>50 – 500 ml</dd></div><div><dt>⌂ Package types</dt><dd>Bottles, Jars, Tubes</dd></div><div><dt>▤ Filling technology</dt><dd>Piston, Peristaltic</dd></div><div><dt>⚙ Automation level</dt><dd>High</dd></div><div><dt>◇ Design speed</dt><dd>${Math.max(150,selected.lineSpeed)} units/min</dd></div></dl><h4>Historical Experience</h4><dl><div><dt>◷ Similar products</dt><dd>${selected.history||37}</dd></div><div><dt>◷ Median startup OEE</dt><dd>${(selected.oee+1.4).toFixed(1)}%</dd></div><div><dt>◇ Median scrap</dt><dd>${(selected.scrap+.1).toFixed(1)}%</dd></div><div><dt>✓ Success rate</dt><dd>${selected.rank===1?89:82}%</dd></div></dl><h4>Strengths</h4><ul class="detail-strengths"><li>Exact package type match</li><li>Strong lotion product history</li><li>Low startup scrap</li><li>High line reliability</li></ul><h4>Potential Risks</h4><ul class="detail-risks"><li>Moderate changeover duration</li><li>Limited decoration experience</li></ul><button class="button button-secondary detail-history" data-view-jump="references">View Historical Launches <span>→</span></button></aside></div><footer class="comparison-footer"><span>Project PULSE <i>|</i> Manufacturing Intelligence</span><span>Module 1 — NPL Predictive Performance <i>|</i> Synthetic POC</span><b>v1.0</b></footer>`;
  if (p.launch_scenario === "cold_start") {
    const similarProducts=[...root.querySelectorAll('.comparison-details dl>div')].find(row=>row.querySelector('dt')?.textContent.includes('Similar products'));
    if(similarProducts) similarProducts.querySelector('dd').textContent='0';
    const historyStrength=root.querySelector('.detail-strengths li:nth-child(2)');
    if(historyStrength) historyStrength.textContent='Capability-based fit without SKU history';
    root.querySelector('.detail-risks')?.insertAdjacentHTML('afterbegin','<li>Cold-start evidence gap</li>');
  } else if (p.launch_scenario === "rebrand") {
    const historyStrength=root.querySelector('.detail-strengths li:nth-child(2)');
    if(historyStrength) historyStrength.textContent='Brand-independent technical match';
  }
  $("#comparison-line-filter").onchange=event=>{comparisonState.line=event.target.value;renderComparisonWorkspace(model)};
  $("#comparison-sort").onchange=event=>{comparisonState.sort=event.target.value;renderComparisonWorkspace(model)};
  $("#comparison-search").oninput=event=>{comparisonState.search=event.target.value;renderComparisonWorkspace(model);$("#comparison-search").focus()};
  $("#comparison-detail-select").onchange=event=>{comparisonState.detail=event.target.value;renderComparisonWorkspace(model)};
  bindJumpButtons();
}

function renderComparison(data) {
  if (!data.ranked_lines.length) { const root=$('[data-section="comparison"]');root.innerHTML=`<div class="compact-empty"><div><span>!</span><h3>No eligible candidates</h3><p>Every line failed at least one physical capability rule.</p></div><button class="button button-primary" data-view-jump="analysis">Revise inputs →</button></div>`;bindJumpButtons();return; }
  renderComparisonWorkspace({lines:normalizeLiveLines(data),product:data.product,analysisId:data.analysis_id,excludedCount:data.excluded_lines.length,demo:false,whatWouldChange:data.what_would_change});
}

function referenceProductStrip(model) {
  const p=model.product;
  return `<div class="history-product card"><div class="history-product-name"><span class="history-bottle"></span><p><small>Current SKU${model.demo?' (Demo)':''}</small><b>${esc(p.product_name)}</b><em>NPL-SKIN-042</em></p></div>${[["Category",p.category],["Formula",p.formula_type],["Fill Volume",`${p.fill_volume_ml} ml`],["Viscosity",`${fmt(p.viscosity)} cP`],["Package",p.package_type||"Pump Bottle"],["Closure",p.closure_type||"Pump"],["Filling Tech",(p.filling_technology||"Piston").replace(" Filling","")],["Compounding",p.compounding_required?'<i>Yes</i>':'No'],["Analysis ID",model.analysisId]].map(([label,value])=>`<div><small>${label}</small><b>${value}</b></div>`).join("")}</div>`;
}

function referenceRow(ref,index) {
  const tags=ref.why||[];
  return `<tr class="${index===0?'selected':''}"><td>${index+1}</td><td><span class="history-similarity"><b>${ref.similarity}%</b><i><em style="width:${ref.similarity}%"></em></i></span></td><td>${esc(ref.sku)}</td><td>${esc(ref.name)}</td><td class="accent-text">${ref.line}</td><td>${esc(ref.formula)}</td><td>${esc(ref.package)}</td><td>${fmt(ref.viscosity)}</td><td>${ref.oee}</td><td>${ref.scrap}</td><td>${fmt(ref.throughput)}</td><td>${ref.changeover}</td><td><span class="history-tag">${esc(tags[0]||"Similar launch")}</span>${tags.length>1?`<small class="tag-count">+${tags.length-1}</small>`:''}</td><td><button class="history-open" data-history-sku="${esc(ref.sku)}">›</button></td></tr>`;
}

function referenceDetail(ref) {
  return `<aside class="card history-detail"><header><h3>Reference Detail</h3><span>×</span></header><div class="history-detail-title"><span class="history-bottle"></span><p><b>${esc(ref.sku)}</b><small>${esc(ref.name)}</small><em>${ref.similarity}% similar</em></p></div><dl>${[["Line",ref.line],["Launch date",ref.date||"12-Mar-2024"],["Category","Skincare"],["Formula type",ref.formula],["Package",`${ref.package} (Plastic)`],["Viscosity",`${fmt(ref.viscosity)} cP`],["Filling technology","Piston Filling"],["Startup OEE",`${ref.oee}%`],["Scrap",`${ref.scrap}%`],["Throughput",`${fmt(ref.throughput)} units/hr`],["Changeover",`${ref.changeover} min`],["Outcome",`<em>${ref.outcome||"Successful"}</em>`]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl><section><h4>Why this launch is similar</h4>${(ref.why||[]).map(reason=>`<p>✓ <span>${esc(reason)}</span></p>`).join("")}<p>✓ <span>Same product category (Skincare)</span></p></section><button class="button button-secondary">View full launch record <span>→</span></button></aside>`;
}

function renderReferencesWorkspace(model) {
  const root=$('[data-section="references"]');
  let rows=model.rows.filter(ref=>(referenceState.line==="all"||ref.line===referenceState.line)&&ref.similarity>=referenceState.min&&(!referenceState.search||`${ref.sku} ${ref.name}`.toLowerCase().includes(referenceState.search.toLowerCase()))).sort((a,b)=>b.similarity-a.similarity);
  if(!rows.length) rows=model.rows.filter(ref=>referenceState.line==="all"||ref.line===referenceState.line).sort((a,b)=>b.similarity-a.similarity);
  const detail=rows.find(ref=>ref.sku===referenceState.selected)||rows[0]||model.rows[0];
  const histogram=[2,5,9,14,22,35,48,66,92,128,175,230,310,390,355,275,190,120,62,20];
  root.innerHTML=`${referenceProductStrip(model)}<div class="history-main"><section class="history-primary"><div class="history-toolbar"><div class="history-tabs"><button class="${referenceState.line==='all'?'active':''}" data-history-line="all">All Lines</button>${model.lines.slice(0,3).map(line=>`<button class="${referenceState.line===line?'active':''}" data-history-line="${line}">${line}</button>`).join("")}</div><div class="history-filters"><label class="history-search">⌕<input id="history-search" placeholder="Search by SKU, product, or keyword..." value="${esc(referenceState.search)}"></label><label><small>Category</small><select><option>All</option></select></label><label><small>Formula</small><select><option>All</option></select></label><label><small>Package</small><select><option>All</option></select></label><label><small>Similarity ≥</small><select id="history-min"><option value="70" ${referenceState.min===70?'selected':''}>70%</option><option value="80" ${referenceState.min===80?'selected':''}>80%</option><option value="90" ${referenceState.min===90?'selected':''}>90%</option></select></label><button id="history-reset">Reset</button></div></div><article class="card history-table-card"><div class="table-scroll"><table class="history-table"><thead><tr><th>#</th><th>Similarity</th><th>SKU ↕</th><th>Product Name</th><th>Line</th><th>Formula ↕</th><th>Package</th><th>Viscosity<br>(cP)</th><th>Startup OEE<br>(%)</th><th>Scrap<br>(%)</th><th>Throughput<br>(units/hr)</th><th>Changeover<br>(min)</th><th>Why Similar</th><th></th></tr></thead><tbody>${rows.slice(0,7).map(referenceRow).join("")}</tbody></table></div><footer><span>Showing 1–${Math.min(7,rows.length)} of ${model.demo?'428':rows.length} launches</span><nav><button>‹</button><b>1</b><button>2</button><button>3</button><button>4</button><button>5</button><span>…</span><button>62</button><button>›</button></nav></footer></article><div class="history-charts"><article class="card history-histogram"><h3>Similarity distribution</h3><p>Distribution of similarity scores for all historical launches.</p><div class="histogram-plot"><strong>Avg: 68%</strong>${histogram.map((height,index)=>`<i style="height:${Math.max(3,height/390*100)}%" class="${index>11&&index<16?'peak':''}"></i>`).join("")}<span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div><small>Similarity score (%)</small></article><article class="card history-trends"><h3>Performance trends (by similarity bucket)</h3><p>Average startup performance for similar launches.</p><div class="trend-legend"><span class="orange">OEE (%)</span><span>Scrap (%)</span><span class="gray">Throughput (×100 units/hr)</span></div><div class="trend-plot">${[18,37,45,58,68].map((bottom,index)=>`<i class="trend-dot orange" style="left:${8+index*21}%;bottom:${bottom}%"></i>`).join("")}${[12,16,20,24,28].map((bottom,index)=>`<i class="trend-dot dark" style="left:${8+index*21}%;bottom:${bottom}%"></i>`).join("")}${[28,34,39,46,51].map((bottom,index)=>`<i class="trend-dot gray" style="left:${8+index*21}%;bottom:${bottom}%"></i>`).join("")}</div><div class="trend-labels"><span>&lt;60%</span><span>60–70%</span><span>70–80%</span><span>80–90%</span><span>90%+</span></div></article><article class="card history-learnings"><h3><span>☀</span> Top learnings from similar launches</h3><ol><li>F04 has strong historical performance with similar lotion products.</li><li>Scrap tends to increase for viscosity &gt; 16,000 cP.</li><li>Average changeover for similar products is 65–75 minutes.</li><li>Pump closure has high success rate (87%).</li><li>Decoration (label) has minimal impact on startup performance.</li></ol></article></div></section>${referenceDetail(detail)}</div><footer class="workspace-footer"><span>Project PULSE <i>|</i> Manufacturing Intelligence</span><span>Module 1 — NPL Predictive Performance <i>|</i> Synthetic POC</span><b>v1.0</b></footer>`;
  $$('[data-history-line]',root).forEach(button=>button.onclick=()=>{referenceState.line=button.dataset.historyLine;renderReferencesWorkspace(model)});
  $$('.history-open',root).forEach(button=>button.onclick=()=>{referenceState.selected=button.dataset.historySku;renderReferencesWorkspace(model)});
  $('#history-min').onchange=event=>{referenceState.min=Number(event.target.value);renderReferencesWorkspace(model)};
  $('#history-search').oninput=event=>{referenceState.search=event.target.value;renderReferencesWorkspace(model);$('#history-search').focus()};
  $('#history-reset').onclick=()=>{referenceState.line='all';referenceState.search='';referenceState.min=70;renderReferencesWorkspace(model)};
}

function renderReferences(data,line="all") {
  const root=$('[data-section="references"]');
  if(!data.ranked_lines.length){root.innerHTML=`<div class="compact-empty"><div><span>!</span><h3>No historical references available</h3><p>No eligible line remained for line-specific evidence retrieval.</p></div><button class="button button-primary" data-view-jump="analysis">Revise inputs →</button></div>`;bindJumpButtons();return}
  if(data.product.launch_scenario === "cold_start") {renderColdStartReferences(data);return}
  referenceState.line=line;
  const rows=data.ranked_lines.flatMap(candidate=>candidate.similar_launches.map(ref=>({sku:ref.sku,name:ref.product_name,line:ref.line_id||candidate.line_id,similarity:ref.similarity_score,formula:ref.formula_type,package:ref.package_type,viscosity:ref.viscosity,oee:ref.startup_oee,scrap:ref.startup_scrap,throughput:ref.throughput,changeover:ref.changeover_minutes,why:ref.common_attributes,date:ref.launch_date,outcome:ref.startup_outcome})));
  renderReferencesWorkspace({demo:false,product:data.product,analysisId:data.analysis_id,rows,lines:data.ranked_lines.map(row=>row.line_id)});
}

function renderColdStartReferences(data) {
  const root=$('[data-section="references"]');
  const candidates=data.ranked_lines.slice(0,5);
  root.innerHTML=`${referenceProductStrip({demo:false,product:data.product,analysisId:data.analysis_id})}<section class="cold-reference card"><div class="cold-reference-hero"><span>○</span><div><p class="eyebrow">TRUE COLD START</p><h2>No comparable SKU found</h2><p>The historical search returned zero qualifying product analogues. This is a valid analysis state—not missing data.</p></div><em>0 references</em></div><div class="cold-reference-sources"><article><b>Capability fit</b><strong>${candidates[0]?.predictions.compatibility||0}%</strong><p>Physical and process constraints determine which lines can run the product.</p></article><article><b>Line baseline</b><strong>${candidates[0]?.predictions.oee||0}% OEE</strong><p>Prediction starts from line-level operating history instead of SKU analogues.</p></article><article><b>Category experience</b><strong>Secondary</strong><p>Broader category patterns inform the model without claiming a close match.</p></article><article><b>Uncertainty</b><strong>${candidates[0]?.predictions.uncertainty_level||'High'}</strong><p>The interval is widened to make the evidence gap explicit.</p></article></div><div class="cold-reference-table"><div><p class="eyebrow">BASELINE-BASED CANDIDATES</p><h3>Decision evidence without product analogues</h3></div><div class="table-scroll"><table><thead><tr><th>Rank</th><th>Line</th><th>Compatibility</th><th>Predicted OEE</th><th>OEE interval</th><th>Reference count</th><th>Risk</th></tr></thead><tbody>${candidates.map(line=>`<tr><td>${line.rank}</td><td><b>${line.line_id}</b></td><td>${line.predictions.compatibility}%</td><td>${line.predictions.oee}%</td><td>${line.predictions.oee_interval.join('–')}%</td><td><span class="zero-reference">0</span></td><td>${riskPill(line.risk_flags[0]?.severity||'High')}</td></tr>`).join('')}</tbody></table></div></div><div class="cold-reference-guidance"><div><span>1</span><p><b>Run an engineering trial</b><small>Create the first product-specific evidence point.</small></p></div><div><span>2</span><p><b>Reserve contingency capacity</b><small>Plan around the wider startup performance range.</small></p></div><div><span>3</span><p><b>Promote the result after launch</b><small>The completed run becomes the seed reference for future analyses.</small></p></div></div></section><footer class="workspace-footer"><span>Project PULSE <i>|</i> Manufacturing Intelligence</span><span>Cold-start evidence mode <i>|</i> Synthetic POC</span><b>v1.0</b></footer>`;
}

function renderRiskWorkspace(model) {
  const riskRows=model.riskRows||[["Long changeover duration","Medium","Likely","68 min vs line median 51 min","Lower startup OEE and higher cost","Adjust campaign sequence"],["Viscosity near upper range","Low","Possible",`${fmt(model.product.viscosity)} cP (upper quartile)`,"Filling stability risk","Validate with engineering"],["Limited decoration history","Low","Possible","5 similar launches","Higher uncertainty","Review decoration setup"],["Higher scrap in similar SKUs","Medium","Possible","Similar SKUs avg scrap 2.8%","Slightly higher startup scrap","Run trial batch"],["Labor constraint","Low","Unlikely","6 operators (available)","Possible scheduling constraint","Confirm crew availability"]];
  const overallRisk=model.overallRisk||"Low", uncertainty=model.uncertainty||"Low", primaryRisk=riskRows[0]?.[0]||"No material startup risk";
  const drivers=[...model.positive.map(([name,value])=>[name,value,"positive"]),...model.negative.map(([name,value])=>[name,value,"negative"])];
  const maxDriver=Math.max(...drivers.map(item=>Math.abs(item[1])));
  const root=$('[data-section="risks"]');
  root.innerHTML=`<div class="risk-product card"><div class="risk-product-name"><span>▣</span><p><b>${esc(model.product.product_name)}</b><small>NPL-SKIN-042</small></p></div>${[["Category",model.product.category],["Formula",model.product.formula_type],["Fill Volume",`${model.product.fill_volume_ml} ml`],["Viscosity",`${fmt(model.product.viscosity)} cP`],["Package",model.product.package_type||"200ml Pump"],["Filling Tech",model.product.filling_technology||"Piston"],["Compounding",model.product.compounding_required?'<em>Yes</em>':'No'],["Analysis ID",model.analysisId]].map(([label,value])=>`<div><small>${label}</small><b>${value}</b></div>`).join("")}${model.demo?'<span class="comparison-demo">Demo / Sample Data</span>':''}</div><div class="risk-headline-cards"><article class="card"><span class="risk-icon green">♢</span><div><small>Overall Risk</small>${riskPill("Low")}<p>No critical risks identified</p></div></article><article class="card"><span class="risk-icon orange">▥</span><div><small>Prediction Uncertainty</small>${riskPill("Low")}<p>Narrow confidence interval</p></div></article><article class="card"><span class="risk-icon green">↑</span><div><small>Strongest Positive Driver</small><b>${esc(model.positive[0][0])}</b><p>+${model.positive[0][1]} to score</p></div></article><article class="card"><span class="risk-icon orange">↓</span><div><small>Largest Negative Driver</small><b>${esc(model.negative[0][0])}</b><p>${model.negative[0][1]} to score</p></div></article></div><div class="risk-upper-grid"><article class="card risk-assessment"><h3><span>♙</span> Risk Assessment</h3><div class="table-scroll"><table><thead><tr><th>#</th><th>Risk</th><th>Severity</th><th>Likelihood</th><th>Evidence</th><th>Potential Impact</th><th>Mitigation</th></tr></thead><tbody>${riskRows.map((row,index)=>`<tr><td>${index+1}</td><td>${row[0]}</td><td>${riskPill(row[1])}</td><td><span class="likelihood">${row[2]}</span></td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td></tr>`).join("")}</tbody></table></div></article><article class="card risk-matrix-card"><h3><span>◎</span> Risk Matrix</h3><div class="risk-matrix"><i class="matrix-dot scrap">Scrap</i><i class="matrix-dot changeover">Changeover</i><i class="matrix-dot viscosity">Viscosity</i><i class="matrix-dot decoration">Decoration</i><i class="matrix-dot labor">Labor</i></div></article><article class="card risk-driver-card"><h3><span>⌘</span> Recommendation Drivers ⓘ</h3><div class="driver-tabs"><b>By Impact</b><span>By Category</span></div><div class="risk-driver-bars">${drivers.map(([name,value,type])=>`<div><span>${name}</span><i><em class="${type}" style="width:${Math.abs(value)/maxDriver*100}%"></em></i><b>${value>0?'+':''}${value}</b></div>`).join("")}</div></article></div><div class="risk-middle-grid"><article class="card risk-evidence"><h3><span>⌘</span> Evidence Strength</h3>${[["Line Experience",4,"Strong","14 comparable launches"],["Package Match",4,"Strong","Exact capability match"],["Viscosity Fit",3,"Moderate","8 comparable launches"],["Filling Technology",4,"Strong","Exact match (Piston)"],["Decoration",2,"Limited","5 comparable launches"]].map(item=>`<div><span>♢ ${item[0]}</span><i>${[1,2,3,4,5].map(n=>`<em class="${n<=item[1]?'active':''}"></em>`).join("")}</i><b>${item[2]}</b><small>${item[3]}</small></div>`).join("")}</article><article class="card risk-intervals"><h3><span>▣</span> Prediction Intervals</h3><p><i></i> Predicted value <i></i> Confidence interval</p>${[["Startup OEE (%)",model.oeeInterval[0],model.oee,model.oeeInterval[1]],["Scrap (%)",model.scrapInterval[0],model.scrap,model.scrapInterval[1]],["Throughput (units/hr)",model.throughputInterval[0],fmt(model.throughput),model.throughputInterval[1]]].map(row=>`<div><span>${row[0]}</span><small>${row[1]}</small><i><em></em><b style="left:50%"></b></i><strong>${row[2]}</strong><small>${fmt(row[3])}</small></div>`).join("")}</article><article class="card risk-changes"><h3><span>⌘</span> What would change the recommendation?</h3><ol>${model.whatWouldChange.slice(0,4).map((item,index)=>`<li><b>${index+1}</b><span><strong>${esc(item)}</strong><small>${index===0?'F07 changeover reduced by ~31 minutes, narrowing the score gap.':index===1?'F07 score increases by ~4.2 points (better filling stability).':index===2?'F07 becomes the recommended line with 79.8 score.':'F02 becomes more competitive (+3.1 points).'}</small></span></li>`).join("")}</ol></article></div><div class="risk-bottom-grid"><article class="card risk-ai"><h3><span>♙</span> AI Explanation (Optional)</h3><p>Based on product attributes, historical launch performance, and line capabilities, ${model.line} is the recommended line due to the closest match in filling technology, strong historical performance with similar lotion products, and acceptable changeover duration. Key risks include moderate changeover time and viscosity near the upper range, but these are within manageable limits.</p><button>View full AI explanation →</button></article><article class="card risk-takeaways"><h3><span>☀</span> Key Takeaways</h3><ul><li>${model.line} offers the best overall balance of performance, risk, and operational feasibility.</li><li>Changeover duration is the primary risk to monitor.</li><li>Historical evidence shows 82.6% median startup OEE for similar products.</li><li>Recommendation is robust to moderate changes in viscosity and batch size.</li></ul></article><article class="card risk-actions"><h3><span>☑</span> Action Items</h3><label><input type="checkbox"> Validate changeover plan with operations</label><label><input type="checkbox"> Confirm viscosity with R&amp;D</label><label><input type="checkbox"> Review decoration setup requirements</label><label><input type="checkbox"> Schedule trial batch for final validation</label></article></div><footer class="workspace-footer"><span>Project PULSE <i>|</i> Manufacturing Intelligence</span><span>Module 1 — NPL Predictive Performance <i>|</i> Synthetic POC</span><b>v1.0</b></footer>`;
  const overallCard=$('.risk-headline-cards article:first-child',root), uncertaintyCard=$('.risk-headline-cards article:nth-child(2)',root);
  if(overallCard){const pill=overallCard.querySelector('.pill');pill.replaceWith(Object.assign(document.createElement('span'),{className:`pill ${overallRisk==='High'?'pill-danger':overallRisk==='Medium'?'pill-warn':'pill-success'}`,textContent:overallRisk}));overallCard.querySelector('p').textContent=overallRisk==='Low'?'No critical risks identified':`${riskRows.filter(row=>row[1]===overallRisk).length} ${overallRisk.toLowerCase()}-severity risk${riskRows.filter(row=>row[1]===overallRisk).length===1?'':'s'} identified`}
  if(uncertaintyCard){const pill=uncertaintyCard.querySelector('.pill');pill.replaceWith(Object.assign(document.createElement('span'),{className:`pill ${uncertainty==='High'?'pill-danger':uncertainty==='Medium'?'pill-warn':'pill-success'}`,textContent:uncertainty}));uncertaintyCard.querySelector('p').textContent=`${uncertainty} confidence interval width`}
  const referenceCount=model.referenceCount??5;
  const aiCopy=$('.risk-ai p',root);if(aiCopy)aiCopy.textContent=referenceCount===0?`${model.product.product_name} is a true cold start. ${model.line} is recommended from eligible line capability and baseline performance, not product analogues. Overall startup risk is ${overallRisk.toLowerCase()}, led by ${primaryRisk.toLowerCase()}, and the uncertainty interval is deliberately wider.`:`${model.product.product_name} is recommended for ${model.line} based on eligible line capability, historical similarity, and predicted startup performance. Overall startup risk is ${overallRisk.toLowerCase()}; the leading watch item is ${primaryRisk.toLowerCase()}. The recommendation uses ${referenceCount} comparable launches and preserves the modeled uncertainty interval.`;
  const takeaways=$('.risk-takeaways ul',root);if(takeaways)takeaways.innerHTML=referenceCount===0?`<li>${model.line} is the strongest capability-based option for this ${esc(model.product.formula_type)} launch.</li><li>No comparable SKU exists in the historical evidence set.</li><li>${esc(primaryRisk)} is the primary risk to monitor.</li><li>An engineering trial is recommended before full-scale launch.</li>`:`<li>${model.line} is the strongest eligible option for this ${esc(model.product.formula_type)} launch.</li><li>${esc(primaryRisk)} is the primary risk to monitor.</li><li>Historical evidence shows ${model.medianOee||model.oee}% median startup OEE across comparable products.</li><li>The decision reflects ${referenceCount} line-specific historical references.</li>`;
  if(referenceCount===0){
    const evidence=$('.risk-evidence',root);
    if(evidence)evidence.innerHTML='<h3><span>⌘</span> Evidence Strength</h3><div><span>♢ Product analogues</span><i><em></em><em></em><em></em><em></em><em></em></i><b>None</b><small>0 comparable launches</small></div><div><span>♢ Capability fit</span><i><em class="active"></em><em class="active"></em><em class="active"></em><em class="active"></em><em></em></i><b>Strong</b><small>Physical constraints verified</small></div><div><span>♢ Line baseline</span><i><em class="active"></em><em class="active"></em><em class="active"></em><em></em><em></em></i><b>Moderate</b><small>General operating history</small></div>';
  }
}

function renderRisks(data) {
  const best=data.ranked_lines[0];
  if(!best){const root=$('[data-section="risks"]');root.innerHTML=`<div class="compact-empty"><div><span>!</span><h3>No candidate risk profile</h3><p>Risk scoring begins after at least one line passes eligibility.</p></div><button class="button button-primary" data-view-jump="analysis">Revise inputs →</button></div>`;bindJumpButtons();return}
  const positives=data.recommendation_drivers.positive.map(item=>[item.factor,item.impact]);
  const negatives=data.recommendation_drivers.negative.map(item=>[item.factor,item.impact]);
  const riskRows=best.risk_flags.slice(0,5).map(risk=>[risk.name,risk.severity,risk.severity==="High"?"Likely":risk.severity==="Medium"?"Possible":"Unlikely",risk.evidence,risk.explanation,risk.mitigation]);
  renderRiskWorkspace({demo:false,product:data.product,analysisId:data.analysis_id,line:best.line_id,oee:best.predictions.oee,oeeInterval:best.predictions.oee_interval,scrap:best.predictions.scrap_pct,scrapInterval:best.predictions.scrap_interval,throughput:best.predictions.throughput_units_hr,throughputInterval:[Math.round(best.predictions.throughput_units_hr*.91),Math.round(best.predictions.throughput_units_hr*1.09)],positive:positives.length?positives:[["Line Experience",18.2]],negative:negatives.length?negatives:[["Changeover Duration",-7.6]],whatWouldChange:data.what_would_change,riskRows,overallRisk:best.risk_flags[0]?.severity||"Low",uncertainty:best.predictions.uncertainty_level,referenceCount:best.predictions.reference_count,medianOee:best.predictions.comparable_median_oee});
}

function renderModel(info) {
  const flow=[['01','▤','New SKU','Product attributes and launch context'],['02','▽','Eligibility Rules','Filter lines based on constraints'],['03','◉','Feature Engineering','Transform product and line attributes'],['04','⌕','Historical Similarity','Find comparable launches'],['05','▥','Predictive Models','Estimate startup KPIs'],['06','⌁','Prediction Intervals','Quantify uncertainty in predictions'],['07','△','Risk Engine','Identify and score startup risks'],['08','☷','Line Ranking','Combine multiple criteria'],['09','♛','Recommendation','Best line for first run']];
  $("#model-content").innerHTML=`<article class="card model-foundation"><h3><span>♙</span> Data Foundation</h3><p>Synthetic dataset used for model development and testing</p></article><div class="model-metrics">${[["▧","420","SKUs","Across 6 categories"],["△","130","Formulas","Unique formulations"],["⌁","12","Filling lines","With different capabilities"],["⚙","5","Compounding lines","For semi-finished materials"],["▤","22,708","Production runs","Jan 2023 – Dec 2025 (3 years)"],["▦","3 Years","Historical window","Launch-level data"]].map(item=>`<article class="card"><span>${item[0]}</span><div><strong>${item[1]}</strong><b>${item[2]}</b><small>${item[3]}</small></div></article>`).join("")}</div><article class="card model-pipeline-card"><div class="model-section-head"><div><h3><span>♙</span> Modeling Pipeline</h3><p>From product attributes to line recommendation</p></div><small><i></i> Current stage (Demo) <i></i> Completed</small></div><div class="model-pipeline">${flow.map((item,index)=>`<div class="${index===8?'current':''}"><em>${item[0]}</em><span>${item[1]}</span><b>${item[2]}</b><small>${item[3]}</small></div>${index<8?'<i>→</i>':''}`).join("")}</div></article><div class="model-data-grid"><article class="card model-composition"><h3><span>▦</span> Data Composition</h3><p>Breakdown of historical launches by product category</p><div><div class="model-donut"><span><b>22,708</b><small>Runs</small></span></div><ul><li>Skincare <b>28%</b></li><li>Foundation <b>18%</b></li><li>Mascara <b>14%</b></li><li>Lip Gloss <b>12%</b></li><li>Lotion <b>18%</b></li><li>Others <b>10%</b></li></ul></div></article><article class="card model-coverage"><h3><span>▧</span> Historical Data Coverage</h3><p>Number of launches per year and by line type</p><div class="coverage-bars">${[[2023,5700,3300],[2024,6900,4400],[2025,7400,4500]].map(row=>`<div><i style="height:${row[1]/80}px"><b>${fmt(row[1])}</b></i><i class="gray" style="height:${row[2]/80}px"><b>${fmt(row[2])}</b></i><span>${row[0]}</span></div>`).join("")}</div></article><article class="card model-distribution"><h3><span>⌘</span> Line Distribution</h3><p>Data availability across manufacturing lines</p><div>${[["F04",4820],["F07",4120],["F02",3980],["F03",2960],["F05",2840],["Others",4988]].map((row,index)=>`<div><span>${row[0]}</span><i><em class="tone-${index}" style="width:${row[1]/5000*100}%"></em></i><b>${fmt(row[1])}</b></div>`).join("")}</div></article></div><div class="model-bottom-grid"><article class="card model-principles"><h3><span>♨</span> Key Model Principles</h3><p>Guiding design decisions for reliable and actionable recommendations</p><div>${[["◉","Cold Start","Predict from product attributes, not SKU identity. Enables new product recommendations."],["◷","Startup Window","Train on first-run performance, not lifetime averages, to reflect launch realities."],["♢","Launch-Level Validation","Model validated using held-out launch data. No random row splitting."],["⌘","Line-Specific Similarity","Historical references are restricted to candidate-line evidence to ensure relevance."]].map(item=>`<section><span>${item[0]}</span><b>${item[1]}</b><small>${item[2]}</small></section>`).join("")}</div></article><article class="card model-information"><h3><span>⌘</span> Model Information</h3><p>Technical details and current configuration</p><dl><div><dt>Model version</dt><dd>v1.0</dd></div><div><dt>Training data window</dt><dd>Jan 2023 – Dec 2025</dd></div><div><dt>Target metrics</dt><dd>Startup OEE, scrap, throughput,<br>changeover, labor</dd></div><div><dt>Algorithm</dt><dd>Ensemble (XGBoost + rules)</dd></div><div><dt>Uncertainty</dt><dd>Prediction intervals (quantile)</dd></div><div><dt>Environment</dt><dd>Synthetic data (POC)</dd></div></dl></article></div><footer class="workspace-footer"><span>Project PULSE <i>|</i> Manufacturing Intelligence</span><span>Module 1 — NPL Predictive Performance <i>|</i> Synthetic POC</span><b>v1.0</b></footer>`;
}

function renderAll(data){renderOverview(data);renderComparison(data);renderReferences(data);renderRisks(data)}

async function maybeGenerateNarrative(data){const apiKey=sessionStorage.getItem("pulse_api_key"),useAI=sessionStorage.getItem("pulse_use_ai")==="true";if(!apiKey||!useAI||!data.recommended_line)return;try{const result=await api.explain({api_key:apiKey,endpoint:sessionStorage.getItem("pulse_endpoint")||$("#llm-endpoint").value,model:sessionStorage.getItem("pulse_model")||$("#llm-model").value,analysis_id:data.analysis_id,prompt_type:"recommendation"});const element=$("#ai-narrative");if(element){element.textContent=`AI narrative · ${result.explanation}`;element.classList.remove("hidden")}}catch(_){toast("AI narrative unavailable; deterministic explanation shown instead.","error")}}

function formPayload(){const form=new FormData($("#analysis-form")),object=Object.fromEntries(form.entries());["viscosity","fill_volume_ml"].forEach(key=>object[key]=Number(object[key]));["planned_batch_quantity","run_sequence","campaign_position","days_since_prior_run","days_since_last_pm","labor_assumption"].forEach(key=>object[key]=parseInt(object[key],10));object.compounding_required=$("[name=compounding_required]").checked;return object}

async function runAnalysis(event){event?.preventDefault();const overlay=$("#analysis-overlay");overlay.classList.remove("hidden");const messages=["Applying deterministic eligibility rules…","Retrieving line-specific launch evidence…","Estimating startup KPIs and intervals…","Ranking candidates across eight objectives…"];let index=0;const timer=setInterval(()=>{$("#loading-message").textContent=messages[++index%messages.length]},420);try{const data=await api.analyze(formPayload());setAnalysis(data);renderAll(data);showView("overview");toast(data.recommended_line?`Analysis complete · ${data.recommended_line.line_id} recommended`:`Analysis complete · no eligible filling line`,data.recommended_line?"success":"error");await maybeGenerateNarrative(data)}catch(error){toast(error.message,"error")}finally{clearInterval(timer);overlay.classList.add("hidden")}}

function loadScenario(key="low") {const scenario=SKU_SCENARIOS[key]||SKU_SCENARIOS.low;Object.entries(scenario.values).forEach(([name,value])=>{const element=$(`[name="${name}"]`);if(!element)return;if(element.type==="checkbox")element.checked=Boolean(value);else element.value=value});$("#temporary-sku").value=scenario.sku;$$('.scenario-option').forEach(button=>button.classList.toggle('selected',button.dataset.scenario===key));renderAnalysisPreview();toast(`${scenario.label} example loaded`)}

function loadDemo(){loadScenario("low")}

function initSettings(){const key=$("#api-key"),endpoint=$("#llm-endpoint"),model=$("#llm-model"),temperature=$("#llm-temperature"),toggle=$("#use-ai"),status=$("#llm-status"),feedback=$("#connection-feedback");key.value=sessionStorage.getItem("pulse_api_key")||"";endpoint.value=sessionStorage.getItem("pulse_endpoint")||endpoint.value;model.value=sessionStorage.getItem("pulse_model")||model.value;temperature.value=sessionStorage.getItem("pulse_temperature")||temperature.value;toggle.checked=sessionStorage.getItem("pulse_use_ai")==="true";if(key.value)status.textContent="Configured";[key,endpoint,model,temperature].forEach(element=>element.addEventListener("input",()=>{sessionStorage.setItem(element===key?"pulse_api_key":element===endpoint?"pulse_endpoint":element===model?"pulse_model":"pulse_temperature",element.value);if(element===key)status.textContent=element.value?"Configured":"Not configured"}));toggle.onchange=()=>sessionStorage.setItem("pulse_use_ai",toggle.checked);$("#toggle-key").onclick=()=>key.type=key.type==="password"?"text":"password";$("#clear-key").onclick=()=>{key.value="";sessionStorage.removeItem("pulse_api_key");status.textContent="Not configured";toast("API key cleared")};const test=async()=>{if(!key.value){toast("Enter an API key before testing","error");return}status.textContent="Testing";try{const result=await api.testLLM({api_key:key.value,endpoint:endpoint.value,model:model.value});status.textContent=result.connected?"Connected":"Failed";feedback.querySelector("b").textContent=result.connected?"Connection successful":"Connection failed";feedback.querySelector("small").textContent=result.message;toast(result.message,result.connected?"success":"error")}catch(error){status.textContent="Failed";toast(error.message,"error")}};$("#test-connection").onclick=test;$("#header-test-connection").onclick=test;$("#header-save-settings").onclick=()=>{sessionStorage.setItem("pulse_endpoint",endpoint.value);sessionStorage.setItem("pulse_model",model.value);sessionStorage.setItem("pulse_temperature",temperature.value);sessionStorage.setItem("pulse_use_ai",toggle.checked);toast("Settings saved for this browser session")}}

function init(){
  initLogin();
  $$(".nav-item").forEach(item=>item.onclick=()=>showView(item.dataset.view));
  bindJumpButtons();
  $("#mobile-menu").onclick=()=>$("#sidebar").classList.toggle("open");
  $("#analysis-form").addEventListener("submit",runAnalysis);
  $$('.scenario-option').forEach(button=>button.onclick=()=>loadScenario(button.dataset.scenario));
  $("#header-load-demo").onclick=loadDemo;
  $("#analysis-form").addEventListener("input",renderAnalysisPreview);
  $("#analysis-form").addEventListener("change",renderAnalysisPreview);
  $("#reset-analysis-form").onclick=()=>{$("#analysis-form").reset();renderAnalysisPreview();toast("Form reset")};
  $("#overview-load-sample").onclick=()=>{loadDemo();showView("analysis")};
  $("#rerun-analysis").onclick=runAnalysis;
  $("#reference-line-filter").onchange=event=>{state.referenceLine=event.target.value;renderReferences(state.analysis,state.referenceLine)};
  renderAnalysisPreview(); updateTopbar(state.activeView); renderDemoComparison(); renderDemoReferences(); renderDemoRisks(); initSettings();
  api.modelInfo().then(renderModel).catch(()=>{$("#model-content").innerHTML='<div class="compact-empty"><div><span>!</span><h3>Model metadata unavailable</h3><p>The core analysis interface remains available.</p></div></div>'});
}

init();
