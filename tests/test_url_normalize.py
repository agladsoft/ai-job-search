"""Smoke test for tools/url_normalize.py (kept in sync with cv-agents lib/url_normalize.py)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from url_normalize import normalize_url, same_job


def test_linkedin_country_subdomain_matches_bare():
    assert same_job(
        "https://ae.linkedin.com/jobs/view/chief-ai-transformation-officer-at-confidential-company-4438593740",
        "https://linkedin.com/jobs/view/chief-ai-transformation-officer-at-confidential-company-4438593740",
    )


def test_linkedin_tracking_and_slug_variants_match():
    assert same_job(
        "https://www.linkedin.com/jobs/view/some-slug-4435660901/?refId=x",
        "https://uk.linkedin.com/jobs/view/other-slug-4435660901",
    )


def test_different_linkedin_ids_differ():
    assert not same_job(
        "https://linkedin.com/jobs/view/a-4435660901",
        "https://linkedin.com/jobs/view/b-4435660902",
    )


def test_non_linkedin_query_preserved():
    assert same_job(
        "https://www.trolley.com/careers/?gh_jid=5286996008",
        "https://trolley.com/careers/?gh_jid=5286996008",
    )
    assert not same_job(
        "https://trolley.com/careers/?gh_jid=5286996008",
        "https://trolley.com/careers/?gh_jid=9999999999",
    )


def test_empty_inputs_safe():
    assert normalize_url("") == ""
    assert not same_job("", "")
