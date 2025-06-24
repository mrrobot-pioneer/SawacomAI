from bs4 import BeautifulSoup

def add_target_blank(html: str) -> str:
    """Ensure every <a> gets target=_blank rel=noopener."""
    if not html:
        return html

    soup = BeautifulSoup(html, "html.parser")

    for a in soup.find_all("a", href=True):
        # skip anchors or mailto links
        if a["href"].startswith("#") or a["href"].startswith("mailto:"):
            continue

        a.attrs["target"] = "_blank"
        # merge with any existing rel attribute
        rel_vals = set(a.get("rel", []))
        rel_vals.add("noopener")
        a.attrs["rel"] = " ".join(sorted(rel_vals))

    return str(soup)
