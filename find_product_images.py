#!/usr/bin/env python3
"""
CJ's Liquors — Product Image Finder  (v4 — DuckDuckGo, no API key)
Searches DuckDuckGo Images for "{product name} bottle" for each product.
Returns real bottle shots (Walmart, Amazon, brand sites, etc.)
Outputs: product_images.json
"""

import csv, json, re, time, urllib.request, urllib.parse, os

CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vToDgWVzefEfIypyl2AtUdAGksHtSuD0LRp8NLE6pZ_KjGXHDhiyUI02PGcXbZhqKtEPuYRUfaBUK1m"
    "/pub?gid=0&single=true&output=csv"
)
OUTPUT_JSON = os.path.join(os.path.dirname(__file__), "product_images.json")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

SIZE_RX = re.compile(
    r'\s+\d+(\.\d+)?\s*(ml|l|liter|litre|oz|fl\.?\s*oz|gallon|gal)\b'
    r'|\s+\d+\s*(-?\s*)?(pk|pack|ct|can|cans|bottle|bottles|lbs?)\b'
    r'|\s*\(\d{4}\)\s*'
    r'|\s+\d+(\.\d+)?\s*(year|yr)s?\s*(old\b)?'
    r'|\s+\d+(\.\d+)?\s*proof\b'
    r'|\s+\d+(x|×)\d+\s*(oz|ml)?\b',
    re.IGNORECASE
)

def clean(name):
    s = SIZE_RX.sub('', name)
    s = re.sub(r'\s{2,}', ' ', s).strip()
    return s

def build_query(name, category):
    """Build a good search query for a bottle image."""
    brand = clean(name)
    cat = (category or '').lower()

    if 'beer' in cat or 'ipa' in cat or 'ale' in cat or 'lager' in cat or 'stout' in cat:
        suffix = 'beer bottle'
    elif 'wine' in cat or 'champagne' in cat or 'rosé' in cat or 'sparkling' in cat:
        suffix = 'wine bottle'
    elif 'bourbon' in cat or 'whiskey' in cat or 'whisky' in cat or 'scotch' in cat or 'rye' in cat:
        suffix = 'whiskey bottle'
    elif 'vodka' in cat:
        suffix = 'vodka bottle'
    elif 'tequila' in cat or 'mezcal' in cat:
        suffix = 'tequila bottle'
    elif 'rum' in cat:
        suffix = 'rum bottle'
    elif 'cognac' in cat or 'brandy' in cat:
        suffix = 'cognac bottle'
    elif 'gin' in cat:
        suffix = 'gin bottle'
    else:
        suffix = 'bottle'

    return f"{brand} {suffix}"

# Domains to skip (low quality, irrelevant, or likely broken)
SKIP_DOMAINS = {
    'pinterest', 'instagram', 'facebook', 'twitter', 'reddit',
    'tumblr', 'blogspot', 'wordpress.com', 'shutterstock',
    'gettyimages', 'istockphoto', 'dreamstime', 'alamy',
    'clipart', 'wikimedia', 'wikipedia', 'tripadvisor',
    'yelp', 'youtube', 'tiktok',
}

def is_good_url(url):
    """Filter out stock photo sites and social media."""
    if not url or not url.startswith('http'):
        return False
    domain = urllib.parse.urlparse(url).netloc.lower()
    return not any(skip in domain for skip in SKIP_DOMAINS)

def ddg_image(query, retries=3):
    """Search DuckDuckGo Images and return the best bottle image URL."""
    for attempt in range(retries):
        try:
            # Step 1: Get vqd token
            url1 = 'https://duckduckgo.com/?q=' + urllib.parse.quote(query) + '&ia=images'
            req1 = urllib.request.Request(url1, headers={'User-Agent': UA})
            with urllib.request.urlopen(req1, timeout=12) as r:
                html = r.read().decode('utf-8')

            match = re.search(r'vqd=["\']?([\d-]+)["\']?', html)
            if not match:
                time.sleep(2)
                continue
            token = match.group(1)

            # Step 2: Fetch image results
            url2 = ('https://duckduckgo.com/i.js?q=' + urllib.parse.quote(query)
                    + '&vqd=' + token + '&type=photo&o=json')
            req2 = urllib.request.Request(url2, headers={
                'User-Agent': UA,
                'Referer': 'https://duckduckgo.com/',
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req2, timeout=12) as r:
                data = json.loads(r.read())

            results = data.get('results', [])
            for result in results[:8]:
                img = result.get('image', '')
                if is_good_url(img):
                    return img

        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
            continue

    return None


def main():
    # Load existing results
    existing = {}
    if os.path.exists(OUTPUT_JSON):
        with open(OUTPUT_JSON) as f:
            existing = json.load(f)
    found_before = sum(1 for v in existing.values() if v)
    print(f"Loaded {len(existing)} saved ({found_before} with images).")

    # Fetch product list
    print("Fetching CSV …", flush=True)
    req = urllib.request.Request(CSV_URL, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read().decode('utf-8')
    reader = csv.DictReader(raw.splitlines())
    products = [p for p in reader if p.get('Name', '').strip()]
    print(f"{len(products)} products.\n")

    # Only process products not yet found
    todo = [p for p in products if not existing.get(p['Name'].strip())]
    print(f"To search: {len(todo)}  |  Already done: {len(products)-len(todo)}\n")
    print("─" * 64)

    results = dict(existing)
    found_this_run = 0

    for i, p in enumerate(todo):
        name = p['Name'].strip()
        category = p.get('Category', '').strip()
        query = build_query(name, category)
        label = (name[:48] + '…') if len(name) > 48 else name

        print(f"[{i+1:3}/{len(todo)}] {label:<51}", end='', flush=True)

        img = ddg_image(query)
        results[name] = img or ''

        if img:
            found_this_run += 1
            print(f"✓")
        else:
            print(f"–")

        # Save progress every 20 products
        if (i + 1) % 20 == 0:
            with open(OUTPUT_JSON, 'w') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

        # Polite delay — DDG is rate-sensitive
        time.sleep(1.8)

    # Final save
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    total_found = sum(1 for v in results.values() if v)
    total = len(products)
    print(f"\n{'='*64}")
    print(f"Done!  {total_found}/{total} products have images ({total_found*100//total}%)")
    print(f"This run found: {found_this_run} new images")
    print(f"Saved → {OUTPUT_JSON}")


if __name__ == '__main__':
    main()
