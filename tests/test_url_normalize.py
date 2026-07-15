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


def test_wellfound_slug_and_query_variants_match():
    assert same_job(
        "https://wellfound.com/jobs/4470052-software-engineer",
        "https://wellfound.com/jobs/4470052-senior-software-engineer?utm=x",
    )


def test_different_wellfound_ids_differ():
    assert not same_job(
        "https://wellfound.com/jobs/4470052-software-engineer",
        "https://wellfound.com/jobs/4470053-software-engineer",
    )


def test_remoteok_slug_variants_match_and_lowercase_host():
    assert same_job(
        "https://remoteOK.com/remote-jobs/remote-underwriter-coralisle-1134826",
        "https://remoteok.com/remote-jobs/underwriter-1134826",
    )
    assert not same_job(
        "https://remoteok.com/remote-jobs/remote-underwriter-1134826",
        "https://remoteok.com/remote-jobs/remote-underwriter-1134827",
    )


def test_aijobs_slug_and_trailing_slash_variants_match():
    assert same_job(
        "https://ai-jobs.net/job/principal-knowledge-data-architect-219682/",
        "https://ai-jobs.net/job/principal-data-architect-219682",
    )
    assert not same_job(
        "https://ai-jobs.net/job/ml-engineer-200475/",
        "https://ai-jobs.net/job/ml-engineer-200476/",
    )


def test_crunchboard_slug_variants_match():
    assert same_job(
        "https://www.crunchboard.com/jobs/545478873-software-engineer-ai-ml-specialist-at-credential-engine",
        "https://crunchboard.com/jobs/545478873-software-engineer",
    )
    assert not same_job(
        "https://crunchboard.com/jobs/545478873-x",
        "https://crunchboard.com/jobs/545478874-x",
    )


def test_datajobs_company_slug_variants_match():
    assert same_job(
        "https://datajobs.com/IAC-Applications/Chief-Data-Architect-Cloud-Job~9105",
        "https://datajobs.com/Some-Other-Co/Data-Architect-Job~9105",
    )
    assert not same_job(
        "https://datajobs.com/X/Y-Job~9105",
        "https://datajobs.com/X/Y-Job~9106",
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
