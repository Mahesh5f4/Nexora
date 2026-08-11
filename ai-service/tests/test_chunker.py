import pytest
from app.services.chunker import CharacterChunker

def test_chunker_empty_input():
    chunker = CharacterChunker()
    assert chunker.split_text("") == []
    assert chunker.split_text("   ") == []
    assert chunker.split_text(None) == []

def test_chunker_short_text():
    chunker = CharacterChunker(chunk_size=100, chunk_overlap=0)
    text = "This is a short text."
    chunks = chunker.split_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text

def test_chunker_exact_size():
    chunker = CharacterChunker(chunk_size=10, chunk_overlap=2)
    text = "0123456789"
    chunks = chunker.split_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text

def test_chunker_long_text_no_spaces():
    chunker = CharacterChunker(chunk_size=10, chunk_overlap=2)
    text = "0123456789ABCDEFGH"
    chunks = chunker.split_text(text)
    assert len(chunks) == 2
    assert chunks[0] == "0123456789"
    assert chunks[1] == "89ABCDEFGH" # overlap of 2 -> starts at index 8

def test_chunker_with_spaces():
    chunker = CharacterChunker(chunk_size=10, chunk_overlap=2)
    text = "word1 word2 word3"
    # "word1 word" is 10 chars, space at index 5. overlap 2 -> 10-2=8.
    # The chunker prefers finding a space to break cleanly if possible.
    # Within index 0 to 10 ("word1 word"), rightmost space is at index 5.
    # But chunker logic: boundary > start + overlap. start=0, overlap=2, start+overlap=2.
    # So boundary=5 is valid. First chunk = text[0:5] = "word1"
    # Next start: end - overlap = 5 - 2 = 3.
    # next chunk from 3 to 13: "d1 word2 w". 
    # Let's just assert length and content loosely, or test the exact logic.
    chunks = chunker.split_text(text)
    assert len(chunks) > 1
    assert "word1" in chunks[0]
    # Verify all text is present across chunks
    reconstructed = "".join(chunks)
    for word in ["word1", "word2", "word3"]:
        assert word in reconstructed

def test_chunker_invalid_args():
    with pytest.raises(ValueError):
        CharacterChunker(chunk_size=0)
    with pytest.raises(ValueError):
        CharacterChunker(chunk_size=10, chunk_overlap=15)
