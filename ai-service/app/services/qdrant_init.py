from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
import logging

logger = logging.getLogger(__name__)

def initialize_qdrant_collection(client: QdrantClient, collection_name: str, dimension: int = 384):
    """
    Ensures that the required Qdrant collection exists.
    Will create the collection if it doesn't exist, but will NOT destroy existing collections.
    """
    try:
        exists = client.collection_exists(collection_name)
        if not exists:
            logger.info(f"Collection '{collection_name}' does not exist. Creating it with dimension {dimension}.")
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=dimension, distance=Distance.COSINE),
            )
            logger.info(f"Collection '{collection_name}' created successfully.")
        else:
            logger.info(f"Collection '{collection_name}' already exists. Skipping creation.")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection '{collection_name}': {e}")
        raise
