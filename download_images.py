#!/usr/bin/env python3
"""
CJ's Liquors — Image Downloader
Downloads all product images from product_images.json into images/
Updates product_images.json with local paths.
"""

import json, os, re, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE     = os.path.dirname(__file__)
JSON_IN  = os.path.join(BASE, "product_images.json")
IMG_DIR  = os.path.join(BASE, "images")
UA       = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

os.makedirs(IMG_DIR, exist_ok=True)

def safe_filename(name, idx):
    """Turn a product name into a safe filename."""
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = s.strip('_')[:60]
    return f"{idx:04d}_{s}"

def ext_from_url(url):
    path = urllib.parse.urlparse(url).path.lower()
    for e in ('.png', '.jpg', '.jpeg', '.webp', '.gif'):
        if path.endswith(e):
            return e
    return '.jpg'   # default

def download_one(args):
    idx, name, url = args
    base_name = safe_filename(name, idx)
    ext       = ext_from_url(url)
    filename  = base_name + ext
    local_path = os.path.join(IMG_DIR, filename)

    # Skip if already downloaded
    if os.path.exists(local_path) and os.path.getsize(local_path) > 500:
        return name, f"images/{filename}", "skipped"

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': UA,
            'Referer': 'https://www.google.com/',
        })
        with urllib.request.urlopen(req, timeout=15) as r:
            # Check content type
            ct = r.headers.get('Content-Type', '')
            if 'html' in ct or 'text' in ct:
                return name, None, "wrong-type"
            data = r.read()

        if len(data) < 500:   # too small = probably an error page
            return name, None, "too-small"

        # Detect real extension from content-type
        if 'png' in ct:  ext = '.png'
        elif 'webp' in ct: ext = '.webp'
        elif 'gif' in ct:  ext = '.gif'
        else:              ext = '.jpg'
        filename   = base_name + ext
        local_path = os.path.join(IMG_DIR, filename)

        with open(local_path, 'wb') as f:
            f.write(data)

        return name, f"images/{filename}", "ok"

    except Exception as e:
        return name, None, f"error: {str(e)[:40]}"


def main():
    with open(JSON_IN) as f:
        image_map = json.load(f)

    todo = [(i, name, url) for i, (name, url) in enumerate(image_map.items()) if url]
    print(f"{len(todo)} images to download  ({len(image_map)-len(todo)} products have no image)\n")

    results = dict(image_map)  # start with existing map
    ok = skipped = failed = 0

    # Download with 8 parallel workers
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download_one, args): args for args in todo}
        for i, future in enumerate(as_completed(futures), 1):
            name, local, status = future.result()
            if local:
                results[name] = local
                if status == 'skipped':
                    skipped += 1
                else:
                    ok += 1
            else:
                failed += 1
                print(f"  FAIL [{status}] {name[:55]}")

            if i % 50 == 0:
                pct = i * 100 // len(todo)
                print(f"  [{i}/{len(todo)}] {pct}% done — {ok} saved, {failed} failed")
                # Save progress
                with open(JSON_IN, 'w') as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)

    # Final save
    with open(JSON_IN, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Report total size
    total_bytes = sum(
        os.path.getsize(os.path.join(IMG_DIR, f))
        for f in os.listdir(IMG_DIR)
        if os.path.isfile(os.path.join(IMG_DIR, f))
    )
    print(f"\n{'='*60}")
    print(f"Done!  {ok} downloaded, {skipped} skipped, {failed} failed")
    print(f"Total images folder size: {total_bytes/1024/1024:.1f} MB")
    print(f"JSON updated with local paths → {JSON_IN}")


if __name__ == '__main__':
    main()
