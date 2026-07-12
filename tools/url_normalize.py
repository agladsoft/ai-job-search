"""Canonical job-URL normalization for scrape/rank dedup and applied-matching.

Robust-LinkedIn scope. Kept in sync with cv-agents ``lib/url_normalize.py`` (same spec):

- All URLs: trim, lowercase, drop scheme, drop fragment, strip a leading ``www.``,
  strip a trailing slash.
- LinkedIn (``linkedin.com`` / ``*.linkedin.com``): collapse any country subdomain to
  bare ``linkedin.com``, drop the query, and for job URLs reduce to the trailing numeric
  job id -> ``linkedin.com/jobs/view/<id>``. Subdomain/slug/``?refId=`` variants collapse.
- Non-LinkedIn: KEEP the query string - often the job identity (Greenhouse ``?gh_jid=``).

CLI: ``python3 tools/url_normalize.py <url> [<url> ...]`` prints one canonical form per line
(useful for building an applied-exclusion set deterministically in /rank and /scrape).
"""
import re
import sys
from urllib.parse import urlsplit

_DIGIT_RUN = re.compile(r"\d{5,}")


def normalize_url(url):
    """Return a canonical string for matching, or "" for empty/invalid input."""
    if not url or not isinstance(url, str):
        return ""
    u = url.strip().lower()
    if not u:
        return ""
    if "://" not in u:
        u = "http://" + u

    parts = urlsplit(u)
    host = parts.netloc
    if "@" in host:
        host = host.rsplit("@", 1)[-1]
    if ":" in host:
        host = host.split(":", 1)[0]
    if host.startswith("www."):
        host = host[4:]

    path = parts.path.rstrip("/")

    if host == "linkedin.com" or host.endswith(".linkedin.com"):
        host = "linkedin.com"
        if "/jobs/view" in path:
            ids = _DIGIT_RUN.findall(path)
            if ids:
                return "linkedin.com/jobs/view/" + ids[-1]
        return host + path

    canon = host + path
    if parts.query:
        canon += "?" + parts.query
    return canon


def same_job(a, b):
    """True when two URLs canonicalize to the same non-empty job identity."""
    na = normalize_url(a)
    return bool(na) and na == normalize_url(b)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(normalize_url(arg))
