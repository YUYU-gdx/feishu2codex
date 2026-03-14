import json
import time


# Keywords to match in journal/article titles (case-insensitive)
KEYWORDS = [
    "supply chain",
    "logistics",
    "inventory",
    "procurement",
    "operations",
    "manufacturing",
    "digital",
    "digitalization",
    "digitalisation",
    "transformation",
    "platform",
    "data",
    "ai",
    "artificial intelligence",
    "machine learning",
    "analytics",
    "blockchain",
    "cloud",
    "automation",
]


def js_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


# Ensure we're on Search by Article and set year range.
browser.eval("document.querySelector('#nav4')?.click()")
browser.wait(0.6)
browser.eval(
    "document.querySelector('#fromDate').value='2025';"
    "document.querySelector('#fromDate').dispatchEvent(new Event('change',{bubbles:true}));"
    "document.querySelector('#toDate').value='2026';"
    "document.querySelector('#toDate').dispatchEvent(new Event('change',{bubbles:true}));"
)

# Collect journals.
journal_json = browser.eval(
    "JSON.stringify(Array.from(document.querySelectorAll('#searchArea div[title]'))"
    ".map(n=>n.getAttribute('title')))"
)
journals = json.loads(journal_json)

all_rows = []
kw_json = json.dumps(KEYWORDS)

for j in journals:
    # Unselect all journals.
    browser.eval(
        "const u=[...document.querySelectorAll('#searchArea a')]"
        ".find(a=>a.textContent.trim()==='Unselect All');"
        "if(u){u.click();}"
    )
    # Click journal by title.
    browser.eval(
        "(() => {"
        f"const t='{js_escape(j)}';"
        "const el = Array.from(document.querySelectorAll('#searchArea div[title]'))"
        ".find(n => n.getAttribute('title') === t);"
        "if(el){el.scrollIntoView({block:'center'}); el.click(); return true;} return false;"
        "})()"
    )
    # Click Search.
    browser.eval(
        "const btn=[...document.querySelectorAll('#searchArea div')]"
        ".find(d=>d.textContent.trim()==='Search');"
        "if(btn){btn.scrollIntoView({block:'center'}); btn.click();}"
    )
    time.sleep(0.8)

    # Extract matched rows for 2025-2026 with keyword hits.
    rows_json = browser.eval(
        "(() => {"
        f"const kw = {kw_json}.map(k=>k.toLowerCase());"
        "const rows = Array.from(document.querySelectorAll('#searchResults tr')).slice(1);"
        "const out = [];"
        "for (const r of rows) {"
        "  const tds = r.querySelectorAll('td');"
        "  if (tds.length < 4) continue;"
        "  const journal = tds[0].innerText.trim();"
        "  const article = tds[1].innerText.trim();"
        "  const year = tds[3].innerText.trim();"
        "  if (!year) continue;"
        "  const y = parseInt(year, 10);"
        "  if (!(y === 2025 || y === 2026)) continue;"
        "  const text = (article + ' ' + journal).toLowerCase();"
        "  const hits = kw.filter(k => text.includes(k));"
        "  if (hits.length) out.push({journal, article, year: y, keywords: [...new Set(hits)]});"
        "}"
        "return JSON.stringify(out);"
        "})()"
    )
    if rows_json:
        items = json.loads(rows_json)
        all_rows.extend(items)

# Deduplicate.
uniq = {}
for r in all_rows:
    key = (r["journal"], r["article"], r["year"])
    if key not in uniq:
        uniq[key] = r

print("| Journal | Article | Year | Keywords |")
print("|---|---|---|---|")
for r in sorted(uniq.values(), key=lambda x: (x["journal"], x["year"], x["article"])):
    kws = ", ".join(r["keywords"])
    print(f"| {r['journal']} | {r['article']} | {r['year']} | {kws} |")
