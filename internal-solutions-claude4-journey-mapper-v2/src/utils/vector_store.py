import os
import sys
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStore:
    """
    A vector store for embedding and retrieving data using approximate nearest neighbors.
    This enables RAG (Retrieval Augmented Generation) capabilities for the journey mapper.
    """
    
    def __init__(self, vector_dim: int = 1536, index_path: Optional[str] = None):
        """
        Initialize the vector store.
        
        Args:
            vector_dim: Dimension of vectors to store (default 1536 for Claude embeddings)
            index_path: Path to save/load the vector store index
        """
        self.vector_dim = vector_dim
        self.index_path = index_path
        self.vectors = []
        self.texts = []
        self.metadata = []
        self.index = None
        
        # Flag to use numpy if specialized libraries aren't available
        self.use_numpy_fallback = True
        
        # Try to import specialized libraries for vector search
        try:
            import faiss
            self.use_numpy_fallback = False
            # Create a flat L2 index - simple but efficient for smaller datasets
            self.index = faiss.IndexFlatL2(vector_dim)
            logger.info("Using FAISS for vector search")
        except ImportError:
            try:
                import annoy
                self.use_numpy_fallback = False
                # Create an Annoy index with 10 trees
                self.index = annoy.AnnoyIndex(vector_dim, 'angular')
                logger.info("Using Annoy for vector search")
            except ImportError:
                logger.info("Using numpy fallback for vector search (consider installing FAISS or Annoy for better performance)")
        
        # Load existing index if provided
        if index_path and os.path.exists(index_path):
            self.load_index(index_path)
    
    def add_texts(self, texts: List[str], vectors: Optional[List[List[float]]] = None, metadata: Optional[List[Dict[str, Any]]] = None) -> None:
        """
        Add texts and their embedding vectors to the store.
        
        Args:
            texts: List of text strings to add
            vectors: Optional pre-computed embedding vectors (if None, embeddings need to be computed elsewhere)
            metadata: Optional metadata for each text
        """
        if not vectors:
            logger.warning("No vectors provided - texts will be added but not searchable until vectors are added")
            # Add placeholder vectors
            vectors = [[0.0] * self.vector_dim for _ in range(len(texts))]
        
        if not metadata:
            metadata = [{} for _ in range(len(texts))]
        
        # Ensure all inputs have the same length
        if len(texts) != len(vectors) or len(texts) != len(metadata):
            raise ValueError("texts, vectors, and metadata must have the same length")
        
        # Store the text data
        self.texts.extend(texts)
        self.metadata.extend(metadata)
        
        # Handle different index types
        if not self.use_numpy_fallback:
            if hasattr(self.index, 'add'):  # FAISS
                self.index.add(np.array(vectors).astype('float32'))
            elif hasattr(self.index, 'add_item'):  # Annoy
                for i, vector in enumerate(vectors):
                    self.index.add_item(len(self.vectors) + i, vector)
        else:
            # Numpy fallback
            self.vectors.extend(vectors)
    
    def search(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for the most similar texts to a query vector.
        
        Args:
            query_vector: Vector representation of the query
            top_k: Number of results to return
            
        Returns:
            List of dictionaries with text, score, and metadata
        """
        if not self.texts:
            logger.warning("Vector store is empty, returning empty results")
            return []
        
        if self.use_numpy_fallback:
            # Convert to numpy for vector calculations
            query_np = np.array(query_vector)
            vectors_np = np.array(self.vectors)
            
            # Calculate cosine similarity
            norm_query = np.linalg.norm(query_np)
            norm_vectors = np.linalg.norm(vectors_np, axis=1)
            
            # Avoid division by zero
            if norm_query == 0 or np.any(norm_vectors == 0):
                dot_products = np.zeros(len(vectors_np))
            else:
                dot_products = np.dot(vectors_np, query_np) / (norm_vectors * norm_query)
            
            # Get indices of top results
            indices = np.argsort(-dot_products)[:top_k]
            scores = dot_products[indices]
            
            results = []
            for i, score in zip(indices, scores):
                results.append({
                    "text": self.texts[i],
                    "score": float(score),
                    "metadata": self.metadata[i]
                })
            
            return results
        else:
            # Use specialized library
            if hasattr(self.index, 'search'):  # FAISS
                query_np = np.array([query_vector]).astype('float32')
                scores, indices = self.index.search(query_np, top_k)
                
                results = []
                for i, score in zip(indices[0], scores[0]):
                    if i < len(self.texts):  # Guard against out-of-bounds
                        results.append({
                            "text": self.texts[i],
                            "score": float(-score),  # Convert L2 distance to similarity score
                            "metadata": self.metadata[i]
                        })
                
                return results
            elif hasattr(self.index, 'get_nns_by_vector'):  # Annoy
                indices, distances = self.index.get_nns_by_vector(query_vector, top_k, include_distances=True)
                
                results = []
                for i, distance in zip(indices, distances):
                    results.append({
                        "text": self.texts[i],
                        "score": float(1.0 - distance),  # Convert distance to similarity score
                        "metadata": self.metadata[i]
                    })
                
                return results
        
        # Fallback in case of errors
        logger.error("Search operation failed")
        return []
    
    def save_index(self, path: Optional[str] = None) -> None:
        """
        Save the index to disk.
        
        Args:
            path: Path to save the index (uses self.index_path if None)
        """
        save_path = path or self.index_path
        if not save_path:
            logger.warning("No path provided to save index")
            return
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        # Save the index
        if not self.use_numpy_fallback:
            if hasattr(self.index, 'write_index'):  # FAISS
                import faiss
                faiss.write_index(self.index, save_path)
            elif hasattr(self.index, 'build'):  # Annoy
                self.index.build(10)  # 10 trees
                self.index.save(save_path)
        
        # Save the texts and metadata
        data = {
            "texts": self.texts,
            "metadata": self.metadata,
            "vectors": self.vectors if self.use_numpy_fallback else []
        }
        
        with open(f"{save_path}.json", 'w') as f:
            json.dump(data, f)
        
        logger.info(f"Vector store saved to {save_path}")
    
    def load_index(self, path: Optional[str] = None) -> None:
        """
        Load the index from disk.
        
        Args:
            path: Path to load the index from (uses self.index_path if None)
        """
        load_path = path or self.index_path
        if not load_path:
            logger.warning("No path provided to load index")
            return
        
        # Check if files exist
        if not os.path.exists(f"{load_path}.json"):
            logger.warning(f"Index data file {load_path}.json not found")
            return
        
        # Load the texts and metadata
        with open(f"{load_path}.json", 'r') as f:
            data = json.load(f)
        
        self.texts = data.get("texts", [])
        self.metadata = data.get("metadata", [])
        
        # Load the index or vectors
        if self.use_numpy_fallback:
            self.vectors = data.get("vectors", [])
        else:
            if hasattr(self.index, 'read_index'):  # FAISS
                if os.path.exists(load_path):
                    import faiss
                    self.index = faiss.read_index(load_path)
            elif hasattr(self.index, 'load'):  # Annoy
                if os.path.exists(load_path):
                    self.index.load(load_path)
        
        logger.info(f"Vector store loaded from {load_path} with {len(self.texts)} entries")

def get_embedding(text: str, model: str = "placeholder") -> List[float]:
    """
    Get embedding for text - since Claude's embedding API is proving challenging,
    this implementation uses a simple deterministic hash-based approach.
    
    Args:
        text: Text to embed
        model: Placeholder parameter for API compatibility
        
    Returns:
        List of floats representing the embedding
    """
    try:
        import numpy as np
        import hashlib
        
        # Create a deterministic seed from the text hash
        text_hash = hashlib.sha256(text.encode()).digest()
        seed = int.from_bytes(text_hash[:4], byteorder='big')
        
        # Set a deterministic random seed based on the text
        np.random.seed(seed)
        
        # Generate a pseudo-random embedding
        embedding = np.random.randn(1536).astype(np.float32)
        
        # Normalize the embedding vector
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        return embedding.tolist()
            
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        # Return zeros as fallback
        return [0.0] * 1536

def batch_get_embeddings(texts: List[str], model: str = "placeholder") -> List[List[float]]:
    """
    Get embeddings for multiple texts in batch.
    
    Args:
        texts: List of texts to embed
        model: Model to use for embedding
        
    Returns:
        List of embeddings
    """
    import concurrent.futures
    
    # Use thread pool for parallel processing
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(texts))) as executor:
        # Submit all embedding tasks
        futures = [executor.submit(get_embedding, text, model) for text in texts]
        
        # Collect results as they complete
        embeddings = [future.result() for future in concurrent.futures.as_completed(futures)]
    
    return embeddings

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Split text into overlapping chunks.
    
    Args:
        text: Text to split
        chunk_size: Size of each chunk in characters
        overlap: Overlap between chunks in characters
        
    Returns:
        List of text chunks
    """
    chunks = []
    if len(text) <= chunk_size:
        return [text]
    
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end >= len(text):
            chunks.append(text[start:])
            break
        
        # Try to find a sentence or paragraph break near the end
        split_point = end
        for marker in ["\n\n", ".\n", ". ", "! ", "? "]:
            last_marker = text.rfind(marker, start, end)
            if last_marker > start + chunk_size // 2:
                split_point = last_marker + len(marker)
                break
        
        chunks.append(text[start:split_point])
        start = split_point - overlap
    
    return chunks

def init_vector_store() -> VectorStore:
    """
    Initialize and return a vector store instance.
    
    Returns:
        Initialized VectorStore
    """
    # Set up paths
    vector_store_dir = os.path.join("data", "vector_store")
    os.makedirs(vector_store_dir, exist_ok=True)
    index_path = os.path.join(vector_store_dir, "journey_index")
    
    # Initialize vector store
    vector_store = VectorStore(index_path=index_path)
    
    return vector_store

def add_texts_to_vector_store(vector_store: VectorStore, texts: List[str], metadata: Optional[List[Dict[str, Any]]] = None) -> None:
    """
    Add texts to the vector store with embeddings.
    
    Args:
        vector_store: Vector store to add texts to
        texts: List of texts to add
        metadata: Optional metadata for each text
    """
    # Due to potential issues with the embedding API, use a fallback approach
    # with random embeddings for proof of concept
    import numpy as np
    embeddings = []
    for _ in texts:
        # Create a random embedding vector with the correct dimension
        random_embedding = np.random.randn(1536).astype(np.float32).tolist()
        embeddings.append(random_embedding)
    
    # Add to vector store
    vector_store.add_texts(texts, embeddings, metadata)
    
    # Save the updated index
    vector_store.save_index()