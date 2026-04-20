# Vintage Lacrosse Shaft Deal Tracker

A GitHub Pages-friendly tracker focused on **rare, high-resale vintage lacrosse shafts**.

## What this version does
- Searches multiple public sources:
  - eBay
  - eBay RSS
  - Craigslist
  - SidelineSwap
  - Play It Again Sports
- Tries to verify the actual listing page and drop results that look sold or sold out
- Matches listings against target collectible shafts such as:
  - Warrior Krypto Pro
  - Gait Ice
  - Gait dB803
  - Warrior Titan
  - Warrior Titan Levitation
- Scores deals using:
  - rarity
  - expected resale range
  - target buy price
  - estimated profit spread
  - positive and negative condition language
- Publishes a static dashboard that shows:
  - best deals leaderboard
  - model detection
  - target buy price
  - estimated resale range
  - estimated profit
  - new listing indicator
  - collectible filter

## Important limitation
This project uses lightweight HTML scraping of public search and listing pages. Some sites can change markup or block requests. That means:
- some sources may intermittently fail
- selectors may need maintenance
- sold detection is phrase-based, so it is strong but not perfect
- GitHub Pages updates on a schedule through GitHub Actions, not true real-time streaming

## Quick start
1. Create a new GitHub repo.
2. Copy these files into the repo.
3. In GitHub:
   - enable **Actions**
   - enable **Pages** from the `main` branch root
4. Commit and push.
5. Run the workflow once manually.
6. The workflow will generate `/data/listings.json` and `/data/status.json`.

## Tune the deal logic
Edit `config.js`.

Main controls:
- `SEARCH_TERMS`
- `TARGET_MODELS`
- `MAX_PRICE`
- `MIN_RESALE_MARGIN`
- `EXCLUDE_KEYWORDS`
- `CONDITION_POSITIVE`
- `CONDITION_NEGATIVE`

For each target model you can set:
- aliases
- preferred buy price
- max buy price
- estimated resale low/high
- rarity
- priority

## Local dev
```bash
npm install
npm run scrape
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Notes
- The strongest part of this build is the **deal ranking layer**, not the selectors.
- If you discover better resale bands for a certain shaft, update `TARGET_MODELS` and the whole app will reprioritize around those numbers.
- If a site starts blocking too aggressively, add a dedicated API source or a different ingestion method instead of relying on brittle scraping.
