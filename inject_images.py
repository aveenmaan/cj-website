#!/usr/bin/env python3
"""
CJ's Liquors — Image Map Injector
Reads product_images.json and patches index.html to use the image map.
Run AFTER find_product_images.py has completed.
"""

import json, os, re

BASE = os.path.dirname(__file__)
JSON_FILE  = os.path.join(BASE, "product_images.json")
HTML_FILE  = os.path.join(BASE, "index.html")

def main():
    if not os.path.exists(JSON_FILE):
        print(f"ERROR: {JSON_FILE} not found — run find_product_images.py first.")
        return

    with open(JSON_FILE) as f:
        image_map = json.load(f)

    # Keep only products that have an image
    filled = {k: v for k, v in image_map.items() if v}
    total  = len(image_map)
    print(f"Image map: {len(filled)}/{total} products have images ({len(filled)*100//total}% coverage)")

    # Build JS const — compact but readable
    lines = ["const PRODUCT_IMAGES = {"]
    for name, url in filled.items():
        safe_name = name.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{safe_name}": "{url}",')
    lines.append("};")
    js_block = "\n".join(lines)

    with open(HTML_FILE) as f:
        html = f.read()

    # ── 1. Remove any previously injected block ──────────────────────────────
    html = re.sub(
        r"\n?// ──── PRODUCT_IMAGES START ─+\n.*?// ──── PRODUCT_IMAGES END ─+\n?",
        "",
        html,
        flags=re.DOTALL
    )

    # ── 2. Inject the new block just before the first <script> in the JS area ─
    inject_marker = "// ═══════════════════════════════════════════════════════════════════\n    //  CJ'S LIQUORS"
    if inject_marker not in html:
        print("ERROR: Could not find injection point in index.html. Check the script.")
        return

    insert = (
        "// ──── PRODUCT_IMAGES START ─────────────────────────────────────────\n"
        "    // Auto-generated image map (CC-licensed via Wikipedia).\n"
        "    // Re-run find_product_images.py + inject_images.py to update.\n"
        "    " + js_block.replace("\n", "\n    ") + "\n"
        "    // ──── PRODUCT_IMAGES END ───────────────────────────────────────────\n\n"
        "    " + inject_marker
    )
    html = html.replace("    " + inject_marker, insert, 1)

    # ── 3. Patch renderProducts to prefer PRODUCT_IMAGES over emoji ──────────
    old_img_line = (
        "${p.image ? `<img src=\"${esc(p.image)}\" alt=\"${esc(p.name)}\" loading=\"lazy\">` : `<span class=\"prod-art\">${esc(p.emoji || '🍾')}</span>`}"
    )
    new_img_line = (
        "${(p.image || PRODUCT_IMAGES[p.name]) ? `<img src=\"${esc(p.image || PRODUCT_IMAGES[p.name])}\" alt=\"${esc(p.name)}\" loading=\"lazy\">` : `<span class=\"prod-art\">${esc(p.emoji || '🍾')}</span>`}"
    )
    if old_img_line in html:
        html = html.replace(old_img_line, new_img_line, 1)
        print("✓ Patched product card image rendering")
    else:
        print("⚠ Could not patch product card rendering — may already be patched or HTML changed.")

    # ── 4. Patch modal image rendering as well ────────────────────────────────
    old_modal_line = (
        "${p.image\n"
        "                    ? `<img src=\"${esc(p.image)}\" alt=\"${esc(p.name)}\" loading=\"lazy\">`\n"
        "                    : `<span class=\"modal-art\">${esc(p.emoji || '🍾')}</span>`}"
    )
    new_modal_line = (
        "${(p.image || PRODUCT_IMAGES[p.name])\n"
        "                    ? `<img src=\"${esc(p.image || PRODUCT_IMAGES[p.name])}\" alt=\"${esc(p.name)}\" loading=\"lazy\">`\n"
        "                    : `<span class=\"modal-art\">${esc(p.emoji || '🍾')}</span>`}"
    )
    if old_modal_line in html:
        html = html.replace(old_modal_line, new_modal_line, 1)
        print("✓ Patched modal image rendering")
    else:
        print("⚠ Could not patch modal rendering — may already be patched or HTML changed.")

    with open(HTML_FILE, "w") as f:
        f.write(html)

    print(f"\n✓ {HTML_FILE} updated with {len(filled)} product images.")
    print("Open index.html in a browser to verify.")

if __name__ == "__main__":
    main()
