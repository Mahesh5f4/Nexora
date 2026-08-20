import pytest
import os
from app.core.config import settings
from app.agent.search_provider import TavilyWebSearchProvider

# To run this live test, you must explicitly opt in by setting RUN_LIVE_TESTS=true
# AND having a valid TAVILY_API_KEY in the environment.
should_run = os.environ.get("RUN_LIVE_TESTS", "false").lower() == "true" and settings.tavily_api_key

@pytest.mark.skipif(not should_run, reason="Live tests are disabled. Set RUN_LIVE_TESTS=true to run.")
def test_tavily_live_search():
    provider = TavilyWebSearchProvider(api_key=settings.tavily_api_key)
    results = provider.search("Who won the most recent super bowl?", max_results=3)
    
    assert len(results) > 0
    assert len(results) <= 3
    
    first_result = results[0]
    assert first_result.title
    assert first_result.url
    assert first_result.snippet
    assert first_result.source
