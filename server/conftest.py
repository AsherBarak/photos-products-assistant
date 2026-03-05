import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent))

from main import embedding_store

@pytest.fixture(autouse=True)
def clear_embedding_store():
    embedding_store.clear()
    yield
    embedding_store.clear()
