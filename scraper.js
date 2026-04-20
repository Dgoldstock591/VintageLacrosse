import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import {
  SEARCH_TERMS,
  MAX_PRICE,
  MIN_RESALE_MARGIN,
  MAX_RESULTS_PER_SOURCE_TERM,
  TARGET_MODELS,
  MUST_INCLUDE_ANY,
  EXCLUDE_KEYWORDS,
  CONDITION_POSITIVE,
  CONDITION_NEGATIVE,
  SOLD_PHRASES,
  USER_AGENT
} from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const parser = new Parser();

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizePrice(value) {
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function average(low, high) {
  if (low == null && high == null) return null;
  if (low == null) return high;
  if (high == null) return low;
  return Number(((low + high) / 2).toFixed(2));
}

function detectModel(text) {
  const hay = normalizeText(text).toLowerCase();
  let best = null;

  for (const model of TARGET_MODELS) {
    let hits = 0;
    for (const alias of model.aliases) {
      if (hay.includes(alias.toLowerCase())) hits += 1;
    }
    if (!hits) continue;

    const score = hits * 20 + model.priority * 5 + model.rarity * 3;
    if (!best || score > best.matchScore) {
      best = {
        ...model,
        matchScore: score,
        matchedAliases: model.aliases.filter((alias) => hay.includes(alias.toLowerCase()))
      };
    }
  }

  return best;
}

function hasAnyTerm(text, terms) {
  const hay = normalizeText(text).toLowerCase();
  return terms.some((term) => hay.includes(term.toLowerCase()));
}

function collectConditionSignals(text) {
  const hay = normalizeText(text).toLowerCase();
  const positives = CONDITION_POSITIVE.filter((term) => hay.includes(term));
  const negatives = CONDITION_NEGATIVE.filter((term) => hay.includes(term));
  return {
    positives,
    negatives,
    score: positives.length * 8 - negatives.length * 10
  };
}

function getEstimatedResale(model) {
  if (!model) return { low: null, high: null, midpoint: null };
  return {
    low: model.estimatedResaleLow,
    high: model.estimatedResaleHigh,
    midpoint: average(model.estimatedResaleLow, model.estimatedResaleHigh)
  };
}

function enrichListing(raw) {
  const title = normalizeText(raw.title);
  const description = normalizeText(raw.description || "");
  const searchable = `${title} ${description} ${raw.condition || ""} ${raw.searchTerm || ""}`;
  const model = detectModel(searchable);
  const conditionSignals = collectConditionSignals(searchable);
  const estimatedResale = getEstimatedResale(model);
  const price = raw.price ?? normalizePrice(raw.priceText);
  const potentialProfit =
    price != null && estimatedResale.midpoint != null
      ? Number((estimatedResale.midpoint - price).toFixed(2))
      : null;
  const valueRatio =
    price != null && estimatedResale.midpoint != null && price > 0
      ? Number((estimatedResale.midpoint / price).toFixed(2))
      : null;

  return {
    ...raw,
    title,
    description,
    price,
    modelId: model?.id || null,
    modelLabel: model?.label || null,
    matchedAliases: model?.matchedAliases || [],
    rarity: model?.rarity || 0,
    estimatedResaleLow: estimatedResale.low,
    estimatedResaleHigh: estimatedResale.high,
    estimatedResaleMid: estimatedResale.midpoint,
    targetBuyPrice: model?.preferredPrice ?? null,
    maxBuyPrice: model?.maxBuyPrice ?? null,
    potentialProfit,
    valueRatio,
    conditionSignals,
    collectible: (model?.rarity || 0) >= 4
  };
}

function likelyRelevant(item) {
  const hay = `${item.title} ${item.description || ""} ${item.condition || ""}`.toLowerCase();
  const hasTargetModel = Boolean(item.modelId);
  const hasShaftContext = hasAnyTerm(hay, MUST_INCLUDE_ANY);
  const excluded = EXCLUDE_KEYWORDS.some((term) => hay.includes(term.toLowerCase()));
  const withinPrice = item.price == null || item.price <= MAX_PRICE;

  if (excluded || !withinPrice) return false;
  if (!hasTargetModel) return false;
  return hasShaftContext;
}

function scoreListing(item) {
  let score = 0;
  score += (item.rarity || 0) * 12;
  score += item.conditionSignals?.score || 0;

  if (item.price != null) {
    if (item.targetBuyPrice != null && item.price <= item.targetBuyPrice) score += 40;
    else if (item.maxBuyPrice != null && item.price <= item.maxBuyPrice) score += 18;
    else if (item.price <= MAX_PRICE) score += 4;
    else score -= 50;
  }

  if (item.potentialProfit != null) {
    if (item.potentialProfit >= 80) score += 35;
    else if (item.potentialProfit >= 50) score += 24;
    else if (item.potentialProfit >= MIN_RESALE_MARGIN) score += 14;
    else score -= 12;
  }

  if (item.valueRatio != null) {
    if (item.valueRatio >= 2) score += 18;
    else if (item.valueRatio >= 1.6) score += 10;
    else if (item.valueRatio < 1.15) score -= 10;
  }

  if ((item.source || "").toLowerCase().includes("ebay")) score += 2;
  if ((item.source || "").toLowerCase().includes("craigslist")) score += 3;
  if (item.collectible) score += 8;

  return Math.round(score);
}

function assignDealTier(item) {
  if (item.score >= 110) return "Elite";
  if (item.score >= 85) return "Strong";
  if (item.score >= 60) return "Watch";
  return "Speculative";
}

function dedupe(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.source}|${item.url}`.toLowerCase();
    const existing = seen.get(key);
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) seen.set(key, item);
  }
  return [...seen.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function trimResults(items) {
  return items.slice(0, MAX_RESULTS_PER_SOURCE_TERM);
}

async function scrapeEbay(term) {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}&_sop=10&LH_BIN=1`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const out = [];

  $(".s-item").each((_, el) => {
    const title = $(el).find(".s-item__title").first().text().trim();
    const priceText = $(el).find(".s-item__price").first().text().trim();
    const itemUrl = $(el).find(".s-item__link").attr("href");
    const condition =
      $(el).find(".SECONDARY_INFO").first().text().trim() ||
      $(el).find(".s-item__subtitle").first().text().trim();
    const shipping = $(el).find(".s-item__shipping, .s-item__logisticsCost").first().text().trim();
    const subtitle = $(el).find(".s-item__dynamic.s-item__subtitle").text().trim();
    if (!title || !itemUrl || /shop on ebay/i.test(title)) return;

    out.push({
      source: "eBay",
      title,
      price: normalizePrice(priceText),
      priceText,
      condition: condition || "",
      shipping: shipping || "",
      description: subtitle || "",
      url: itemUrl.split("?")[0],
      searchTerm: term
    });
  });

  return trimResults(out);
}

async function scrapeEbayRss(term) {
  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}&_rss=1&LH_BIN=1`;
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).map((item) => ({
      source: "eBay RSS",
      title: item.title || "",
      price: normalizePrice(item.contentSnippet || item.content || ""),
      priceText: "",
      condition: "",
      shipping: "",
      description: item.contentSnippet || "",
      url: item.link,
      searchTerm: term
    }));
    return trimResults(items);
  } catch {
    return [];
  }
}

async function scrapeCraigslist(term) {
  const url = `https://www.craigslist.org/search/sss?query=${encodeURIComponent(term)}&sort=rel`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const out = [];

  $(".cl-search-result, .result-row").each((_, el) => {
    const title = $(el).find(".cl-app-anchor, .result-title").first().text().trim();
    const itemUrl = $(el).find(".cl-app-anchor, .result-title").attr("href");
    const priceText = $(el).find(".priceinfo, .result-price").first().text().trim();
    const location = $(el).find(".location, .result-hood").first().text().trim();
    if (!title || !itemUrl) return;
    out.push({
      source: "Craigslist",
      title,
      price: normalizePrice(priceText),
      priceText,
      condition: "",
      shipping: "",
      description: location || "",
      url: itemUrl,
      searchTerm: term
    });
  });

  return trimResults(out);
}

async function scrapeSidelineSwap(term) {
  const url = `https://sidelineswap.com/search?query=${encodeURIComponent(term)}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const out = [];

  $("a[href*='/gear/']").each((_, el) => {
    const href = $(el).attr("href");
    const card = $(el).closest("article, div");
    const title = normalizeText($(el).text());
    const nearbyText = normalizeText(card.text());
    const priceMatch = nearbyText.match(/\$ ?(\d+(?:\.\d{1,2})?)/);
    if (!href || !title || title.length < 8) return;

    out.push({
      source: "SidelineSwap",
      title,
      price: priceMatch ? Number(priceMatch[1]) : null,
      priceText: priceMatch ? `$${priceMatch[1]}` : "",
      condition: "",
      shipping: "",
      description: nearbyText.slice(0, 300),
      url: href.startsWith("http") ? href : `https://sidelineswap.com${href}`,
      searchTerm: term
    });
  });

  return trimResults(out);
}

async function scrapePlayItAgain(term) {
  const url = `https://playitagainsports.com/search?q=${encodeURIComponent(term)}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const out = [];

  $("a[href*='/product/']").each((_, el) => {
    const href = $(el).attr("href");
    const cardText = normalizeText($(el).text());
    const title = cardText.slice(0, 180);
    const priceMatch = cardText.match(/\$ ?(\d+(?:\.\d{1,2})?)/);
    if (!href || !title) return;

    out.push({
      source: "Play It Again",
      title,
      price: priceMatch ? Number(priceMatch[1]) : null,
      priceText: priceMatch ? `$${priceMatch[1]}` : "",
      condition: "",
      shipping: "",
      description: cardText,
      url: href.startsWith("http") ? href : `https://playitagainsports.com${href}`,
      searchTerm: term
    });
  });

  return trimResults(out);
}

async function verifyListing(item) {
  try {
    await sleep(300);
    const html = await fetchText(item.url);
    const text = normalizeText(html).toLowerCase();
    const sold = SOLD_PHRASES.some((phrase) => text.includes(phrase));

    const verifiedCondition = collectConditionSignals(text);
    const titleMatch = /<title>(.*?)<\/title>/i.exec(html)?.[1] || "";
    const priceMatch = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
    const verifiedPrice = priceMatch ? Number(priceMatch[1]) : item.price;

    return {
      ...item,
      verifiedAt: new Date().toISOString(),
      sold,
      conditionSignals: {
        positives: [...new Set([...(item.conditionSignals?.positives || []), ...verifiedCondition.positives])],
        negatives: [...new Set([...(item.conditionSignals?.negatives || []), ...verifiedCondition.negatives])],
        score: (item.conditionSignals?.score || 0) + verifiedCondition.score
      },
      pageTitle: normalizeText(titleMatch),
      verifiedPrice,
      pageSnippet: text.slice(0, 400)
    };
  } catch (error) {
    return {
      ...item,
      verifiedAt: new Date().toISOString(),
      sold: false,
      verifyError: error.message
    };
  }
}

async function readPreviousListings() {
  try {
    const json = await fs.readFile(path.join(dataDir, "listings.json"), "utf8");
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function markNewItems(items, previousItems) {
  const oldUrls = new Set(previousItems.map((item) => String(item.url).toLowerCase()));
  return items.map((item) => ({
    ...item,
    isNew: !oldUrls.has(String(item.url).toLowerCase())
  }));
}

function summarize(items, errors, totalRaw, totalRelevant, totalVerified) {
  const bySource = Object.fromEntries(
    [...new Map(items.map((item) => [item.source, 0])).keys()].sort().map((source) => [
      source,
      items.filter((item) => item.source === source).length
    ])
  );

  const byModel = Object.fromEntries(
    TARGET_MODELS.map((model) => [
      model.label,
      items.filter((item) => item.modelId === model.id).length
    ]).filter(([, count]) => count > 0)
  );

  const bestDeals = items.slice(0, 10).map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    score: item.score,
    dealTier: item.dealTier,
    price: item.price,
    potentialProfit: item.potentialProfit,
    modelLabel: item.modelLabel
  }));

  return {
    updatedAt: new Date().toISOString(),
    totalRaw,
    totalRelevant,
    totalVerified,
    totalLive: items.length,
    sourceCounts: bySource,
    modelCounts: byModel,
    topDeals: bestDeals,
    errors
  };
}

async function run() {
  await fs.mkdir(dataDir, { recursive: true });
  const errors = [];
  const previousItems = await readPreviousListings();
  const raw = [];

  for (const term of SEARCH_TERMS) {
    const jobs = [
      ["eBay", () => scrapeEbay(term)],
      ["eBay RSS", () => scrapeEbayRss(term)],
      ["Craigslist", () => scrapeCraigslist(term)],
      ["SidelineSwap", () => scrapeSidelineSwap(term)],
      ["Play It Again", () => scrapePlayItAgain(term)]
    ];

    for (const [name, fn] of jobs) {
      try {
        const results = await fn();
        raw.push(...results);
      } catch (error) {
        errors.push(`${name} | ${term} | ${error.message}`);
      }
    }
  }

  const enriched = raw.map(enrichListing);
  const relevant = enriched.filter(likelyRelevant);
  const deduped = dedupe(relevant);

  const verifiedResults = [];
  for (const item of deduped) {
    const verified = await verifyListing(item);
    if (verified.sold) continue;
    const rescored = enrichListing({ ...verified, price: verified.verifiedPrice ?? verified.price });
    rescored.score = scoreListing(rescored);
    rescored.dealTier = assignDealTier(rescored);
    if (rescored.potentialProfit != null && rescored.potentialProfit < 0) continue;
    verifiedResults.push(rescored);
  }

  const finalItems = markNewItems(
    dedupe(verifiedResults)
      .filter((item) => item.price == null || item.price <= MAX_PRICE)
      .filter((item) => item.potentialProfit == null || item.potentialProfit >= MIN_RESALE_MARGIN)
      .map((item) => ({
        ...item,
        discoveredAt: item.discoveredAt || new Date().toISOString()
      })),
    previousItems
  );

  const status = summarize(finalItems, errors, raw.length, relevant.length, verifiedResults.length);

  await fs.writeFile(path.join(dataDir, "listings.json"), JSON.stringify(finalItems, null, 2));
  await fs.writeFile(path.join(dataDir, "status.json"), JSON.stringify(status, null, 2));

  console.log(`Saved ${finalItems.length} live listings.`);
}

run().catch(async (error) => {
  console.error(error);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, "status.json"),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        totalRaw: 0,
        totalRelevant: 0,
        totalVerified: 0,
        totalLive: 0,
        sourceCounts: {},
        modelCounts: {},
        topDeals: [],
        errors: [error.message]
      },
      null,
      2
    )
  );
  process.exit(1);
});
