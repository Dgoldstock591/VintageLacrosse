const fs = require("fs");
const https = require("https");

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function run() {
  console.log("Running scraper...");

  const listings = [];

  // 🔎 eBay RSS (most reliable + no blocking)
  const searchTerms = [
    "gait ice shaft",
    "db803 shaft",
    "krypto pro shaft",
    "warrior titan shaft",
    "titan levitation shaft"
  ];

  for (let term of searchTerms) {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}&_rss=1`;

    try {
      const xml = await fetchURL(url);

      const matches = [...xml.matchAll(/<item>(.*?)<\/item>/gs)];

      for (let m of matches) {
        const item = m[1];

        const title = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const price = item.match(/\$(\d+(\.\d+)?)/)?.[1] || "";

        listings.push({
          title,
          link,
          price: price ? parseFloat(price) : null,
          source: "eBay"
        });
      }

    } catch (e) {
      console.log("Error fetching:", term);
    }
  }

  // save data
  fs.writeFileSync("data/listings.json", JSON.stringify(listings, null, 2));

  fs.writeFileSync("data/status.json", JSON.stringify({
    updated: new Date().toISOString(),
    count: listings.length
  }, null, 2));

  console.log("Done. Listings:", listings.length);
}

run();
