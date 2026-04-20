const listingsEl = document.getElementById("listings");
const metaEl = document.getElementById("meta");
const summaryEl = document.getElementById("summary");
const leaderboardEl = document.getElementById("leaderboard");
const searchBox = document.getElementById("searchBox");
const sourceFilter = document.getElementById("sourceFilter");
const priceFilter = document.getElementById("priceFilter");
const modelFilter = document.getElementById("modelFilter");
const newOnly = document.getElementById("newOnly");
const collectibleOnly = document.getElementById("collectibleOnly");
const profitableOnly = document.getElementById("profitableOnly");

let listings = [];
let status = {};

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || "";
  }
}

function fmtMoney(value) {
  return value == null || Number.isNaN(value) ? "—" : `$${Number(value).toFixed(0)}`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function getFiltered() {
  const q = searchBox.value.trim().toLowerCase();
  const source = sourceFilter.value;
  const model = modelFilter.value;
  const max = priceFilter.value ? Number(priceFilter.value) : null;

  return listings.filter((item) => {
    const hay = `${item.title} ${item.description || ""} ${item.searchTerm || ""} ${item.modelLabel || ""}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (source && item.source !== source) return false;
    if (model && item.modelLabel !== model) return false;
    if (max != null && item.price != null && item.price > max) return false;
    if (newOnly.checked && !item.isNew) return false;
    if (collectibleOnly.checked && !item.collectible) return false;
    if (profitableOnly.checked && !(item.potentialProfit >= 20)) return false;
    return true;
  });
}

function renderLeaderboard() {
  const deals = status.topDeals || [];
  if (!deals.length) {
    leaderboardEl.innerHTML = `<div class="empty">No top deals yet.</div>`;
    return;
  }

  leaderboardEl.innerHTML = deals.slice(0, 5).map((deal, index) => `
    <article class="miniCard">
      <div class="miniRank">#${index + 1}</div>
      <div class="miniBody">
        <div class="miniTitle">${escapeHtml(deal.title)}</div>
        <div class="miniMeta">${escapeHtml(deal.modelLabel || "Unknown model")} · ${escapeHtml(deal.source || "Unknown source")}</div>
        <div class="miniMeta">Score ${escapeHtml(deal.score)} · ${escapeHtml(deal.dealTier || "")}</div>
        <div class="miniMeta">Price ${escapeHtml(fmtMoney(deal.price))} · Profit ${escapeHtml(fmtMoney(deal.potentialProfit))}</div>
      </div>
    </article>
  `).join("");
}

function render() {
  const items = getFiltered();

  summaryEl.innerHTML = `
    Showing <strong>${items.length}</strong> listing${items.length === 1 ? "" : "s"}
    out of <strong>${listings.length}</strong> live, profitable matches.
  `;

  if (!items.length) {
    listingsEl.innerHTML = `<div class="empty">No listings match your current filters.</div>`;
    return;
  }

  listingsEl.innerHTML = items.map((item) => {
    const conditionGood = item.conditionSignals?.positives?.length
      ? `Good: ${item.conditionSignals.positives.join(", ")}`
      : "";
    const conditionBad = item.conditionSignals?.negatives?.length
      ? `Watch: ${item.conditionSignals.negatives.join(", ")}`
      : "";

    return `
      <article class="card ${item.dealTier?.toLowerCase() || ""}">
        <div class="tagRow">
          <span class="tag">${escapeHtml(item.source || "Unknown")}</span>
          ${item.isNew ? `<span class="tag new">New</span>` : ""}
          ${item.collectible ? `<span class="tag collectible">Collectible</span>` : ""}
          ${item.dealTier ? `<span class="tag tier">${escapeHtml(item.dealTier)}</span>` : ""}
          ${item.score != null ? `<span class="tag">Score ${item.score}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="line price">${escapeHtml(item.priceText || fmtMoney(item.price))}</div>
        <div class="grid2">
          <div class="stat"><span>Model</span><strong>${escapeHtml(item.modelLabel || "Unknown")}</strong></div>
          <div class="stat"><span>Rarity</span><strong>${escapeHtml(String(item.rarity || 0))}/5</strong></div>
          <div class="stat"><span>Target buy</span><strong>${escapeHtml(fmtMoney(item.targetBuyPrice))}</strong></div>
          <div class="stat"><span>Resale est.</span><strong>${escapeHtml(fmtMoney(item.estimatedResaleLow))}–${escapeHtml(fmtMoney(item.estimatedResaleHigh))}</strong></div>
          <div class="stat"><span>Profit est.</span><strong>${escapeHtml(fmtMoney(item.potentialProfit))}</strong></div>
          <div class="stat"><span>Value ratio</span><strong>${escapeHtml(item.valueRatio ? `${item.valueRatio}x` : "—")}</strong></div>
        </div>
        ${item.condition ? `<div class="line"><strong>Condition:</strong> ${escapeHtml(item.condition)}</div>` : ""}
        ${conditionGood ? `<div class="line good">${escapeHtml(conditionGood)}</div>` : ""}
        ${conditionBad ? `<div class="line bad">${escapeHtml(conditionBad)}</div>` : ""}
        ${item.matchedAliases?.length ? `<div class="line"><strong>Matched:</strong> ${escapeHtml(item.matchedAliases.join(", "))}</div>` : ""}
        ${item.shipping ? `<div class="line"><strong>Shipping:</strong> ${escapeHtml(item.shipping)}</div>` : ""}
        ${item.description ? `<div class="line dim">${escapeHtml(item.description.slice(0, 220))}</div>` : ""}
        <div class="line"><strong>Seen:</strong> ${escapeHtml(fmtDate(item.discoveredAt))}</div>
        <div class="line"><strong>Verified:</strong> ${escapeHtml(fmtDate(item.verifiedAt))}</div>
        <a class="button" href="${item.url}" target="_blank" rel="noopener noreferrer">Open listing</a>
      </article>
    `;
  }).join("");
}

async function boot() {
  const [listingsRes, statusRes] = await Promise.all([
    fetch("./data/listings.json"),
    fetch("./data/status.json")
  ]);

  listings = await listingsRes.json();
  status = await statusRes.json();

  metaEl.innerHTML = `
    <div><strong>Last update:</strong> ${fmtDate(status.updatedAt)}</div>
    <div><strong>Live deals:</strong> ${status.totalLive ?? listings.length}</div>
    <div><strong>Raw results scanned:</strong> ${status.totalRaw ?? 0}</div>
    <div><strong>Relevant matches:</strong> ${status.totalRelevant ?? 0}</div>
    <div><strong>Verified pages:</strong> ${status.totalVerified ?? 0}</div>
    <div><strong>Errors:</strong> ${(status.errors || []).length}</div>
  `;

  fillSelect(sourceFilter, [...new Set(listings.map((item) => item.source).filter(Boolean))].sort());
  fillSelect(modelFilter, [...new Set(listings.map((item) => item.modelLabel).filter(Boolean))].sort());
  renderLeaderboard();
  render();
}

for (const el of [searchBox, sourceFilter, priceFilter, modelFilter, newOnly, collectibleOnly, profitableOnly]) {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
}

boot().catch((err) => {
  metaEl.textContent = `Failed to load data: ${err.message}`;
});
