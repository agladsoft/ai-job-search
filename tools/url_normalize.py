"""Canonical job-URL normalization for scrape/rank dedup and applied-matching.

Robust-LinkedIn scope. Kept in sync with cv-agents ``lib/url_normalize.py`` (same spec):

- All URLs: trim, lowercase, drop scheme, drop fragment, strip a leading ``www.``,
  strip a trailing slash.
- LinkedIn (``linkedin.com`` / ``*.linkedin.com``): collapse any country subdomain to
  bare ``linkedin.com``, drop the query, and for job URLs reduce to the trailing numeric
  job id -> ``linkedin.com/jobs/view/<id>``. Subdomain/slug/``?refId=`` variants collapse.
- Wellfound (``wellfound.com``): reduce ``/jobs/<id>-<slug>`` to ``/jobs/<id>`` so slug
  and query variants collapse to the numeric id (the browser-assisted wellfound-search
  source).
- RemoteOK (``remoteok.com``): reduce ``/remote-jobs/<slug>-<id>`` to the trailing id.
- ai-jobs.net: reduce ``/job/<slug>-<id>/`` to the trailing id.
- CrunchBoard (``crunchboard.com``): reduce ``/jobs/<id>-<slug>`` to the leading id.
- datajobs.com: reduce ``/<company>/<role>-job~<id>`` to the trailing id.
- Other hosts: KEEP the query string - often the job identity (Greenhouse ``?gh_jid=``).

CLI: ``python3 tools/url_normalize.py <url> [<url> ...]`` prints one canonical form per line
(useful for building an applied-exclusion set deterministically in /rank and /scrape).
"""
import re
import sys
from urllib.parse import urlsplit

_DIGIT_RUN = re.compile(r"\d{5,}")
_WELLFOUND_JOB = re.compile(r"/jobs/(\d+)")
_REMOTEOK_JOB = re.compile(r"(\d{4,})$")
_AIJOBS_JOB = re.compile(r"-(\d{3,})$")
_CRUNCHBOARD_JOB = re.compile(r"/jobs/(\d+)")
_DATAJOBS_JOB = re.compile(r"-job~(\d+)")


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

    # Wellfound job URLs are /jobs/<id>-<slug>; the leading numeric id is the identity,
    # so slug/query variants collapse to it (mirrors the LinkedIn rule). Job listings
    # come from the browser-assisted wellfound-search skill.
    if host == "wellfound.com" or host.endswith(".wellfound.com"):
        host = "wellfound.com"
        m = _WELLFOUND_JOB.search(path)
        if m:
            return "wellfound.com/jobs/" + m.group(1)
        return host + path

    # RemoteOK job URLs are /remote-jobs/<slug>-<id>; the trailing numeric id is the
    # identity (the host is served as mixed-case remoteOK.com, already lowercased above).
    if host == "remoteok.com" or host.endswith(".remoteok.com"):
        host = "remoteok.com"
        if "/remote-jobs/" in path:
            m = _REMOTEOK_JOB.search(path)
            if m:
                return "remoteok.com/remote-jobs/" + m.group(1)
        return host + path

    # ai-jobs.net job URLs are /job/<slug>-<id>/; the trailing numeric id is the identity.
    if host == "ai-jobs.net" or host.endswith(".ai-jobs.net"):
        host = "ai-jobs.net"
        m = _AIJOBS_JOB.search(path)
        if m:
            return "ai-jobs.net/job/" + m.group(1)
        return host + path

    # CrunchBoard job URLs are /jobs/<id>-<slug>; the leading numeric id is the identity.
    if host == "crunchboard.com" or host.endswith(".crunchboard.com"):
        host = "crunchboard.com"
        m = _CRUNCHBOARD_JOB.search(path)
        if m:
            return "crunchboard.com/jobs/" + m.group(1)
        return host + path

    # datajobs.com job URLs are /<company>/<role>-job~<id>; the trailing id is the identity.
    if host == "datajobs.com" or host.endswith(".datajobs.com"):
        host = "datajobs.com"
        m = _DATAJOBS_JOB.search(path)
        if m:
            return "datajobs.com/job/" + m.group(1)
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
