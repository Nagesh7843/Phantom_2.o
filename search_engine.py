import urllib.parse
import requests
import re
import html

def perform_live_web_search(query: str, max_results: int = 5) -> dict:
    """
    Perform a real-time live web search using DuckDuckGo Lite & HTML endpoints.
    Filters out ads and returns structured organic results with formatted context for high-precision LLM reasoning.
    """
    if not query or not query.strip():
        return {"query": "", "results": [], "context_text": "", "source_count": 0}

    clean_query = query.strip()
    results = []

    # 1. Primary: DuckDuckGo Lite
    try:
        url = "https://lite.duckduckgo.com/lite/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"q": clean_query}
        resp = requests.post(url, data=data, headers=headers, timeout=6)

        if resp.status_code == 200:
            html_text = resp.text
            
            # Find links and snippets
            link_pattern = re.compile(r'<a\s+[^>]*href="([^"]+)"\s+class=[\'"]result-link[\'"][^>]*>(.*?)</a>', re.DOTALL)
            snippet_pattern = re.compile(r'<td\s+class=[\'"]result-snippet[\'"][^>]*>(.*?)</td>', re.DOTALL)

            links = link_pattern.findall(html_text)
            snippets = snippet_pattern.findall(html_text)

            for i in range(min(len(links), len(snippets))):
                if len(results) >= max_results:
                    break

                raw_href, raw_title = links[i]
                raw_snippet = snippets[i]

                # Skip ads
                if 'duckduckgo.com/y.js' in raw_href or 'bing.com/aclick' in raw_href:
                    continue

                clean_title = re.sub(r'<[^>]+>', '', html.unescape(raw_title)).strip()
                clean_snippet = re.sub(r'<[^>]+>', '', html.unescape(raw_snippet)).strip()

                # Clean redirect href if needed
                actual_url = raw_href
                if 'uddg=' in raw_href:
                    try:
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                        if 'uddg' in parsed and parsed['uddg']:
                            actual_url = parsed['uddg'][0]
                    except Exception:
                        pass

                if clean_title and clean_snippet:
                    results.append({
                        "title": clean_title,
                        "snippet": clean_snippet,
                        "url": actual_url
                    })
    except Exception as e:
        print(f"[Search Engine] DDG Lite query error: {e}")

    # 2. Fallback: Instant Answer API if results are empty
    if not results:
        try:
            ia_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(clean_query)}&format=json&no_html=1&skip_disambig=1"
            ia_resp = requests.get(ia_url, headers={"User-Agent": "PhantomAI/2.0"}, timeout=5)
            if ia_resp.status_code == 200:
                ia_data = ia_resp.json()
                abstract = ia_data.get("AbstractText")
                abstract_url = ia_data.get("AbstractURL")
                heading = ia_data.get("Heading")
                if abstract:
                    results.append({
                        "title": heading or clean_query,
                        "snippet": abstract,
                        "url": abstract_url or "https://duckduckgo.com"
                    })
                for topic in ia_data.get("RelatedTopics", [])[:max_results - len(results)]:
                    if isinstance(topic, dict) and "Text" in topic:
                        results.append({
                            "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " ") or clean_query,
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", "")
                        })
        except Exception as e:
            print(f"[Search Engine] Instant Answer API fallback error: {e}")

    # Build formatted context string for model reasoning
    if results:
        context_parts = [
            f"### [REAL-TIME WEB SEARCH CITATIONS FOR: '{clean_query}']",
            "The user enabled the Real-Time Web Search Engine Plugin. The following verified live search citations were retrieved in real-time. Use them to provide an up-to-date, highly factual, accurate, and precise response. Reference key facts, URLs, and data points:\n"
        ]
        for idx, r in enumerate(results, 1):
            context_parts.append(f"[{idx}] Title: {r['title']}")
            context_parts.append(f"    Source URL: {r['url']}")
            context_parts.append(f"    Key Snippet: {r['snippet']}\n")
        context_parts.append("--- End of Real-Time Web Search Context ---\n")
        context_text = "\n".join(context_parts)
    else:
        context_text = ""

    return {
        "query": clean_query,
        "results": results,
        "context_text": context_text,
        "source_count": len(results)
    }

if __name__ == "__main__":
    res = perform_live_web_search("Python 3.13 features")
    print(f"Total results found: {res['source_count']}")
    for r in res['results']:
        print(r['title'], '->', r['url'])
