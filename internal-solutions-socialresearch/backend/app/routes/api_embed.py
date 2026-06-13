"""Local sentence-transformer embedding endpoint (quota-free provider).

The HiC research-proxy's default EMBED_PROVIDER is "local", which posts
{"texts": [...]} to http://social-research-backend:8081/api/embed and expects
{"embeddings": [[float, ...], ...], "model": ..., "dim": ...}. This module was
referenced by app/routes/api.py but the file never landed, so the backend
failed to boot and every HiC embedding call returned HTTP 500
("Name or service not known") - semantic retrieval starved silently
(observed 2026-06-11). Recreated to honor the proxy contract exactly.

Model: all-mpnet-base-v2 (768-dim, symmetric - no query/document distinction).
Lazy-loaded on first request so worker boot stays fast.
"""

import threading

from flask import Blueprint, jsonify, request

embed_bp = Blueprint('embed', __name__)

_MODEL_NAME = 'all-mpnet-base-v2'
_MAX_TEXTS = 256
_MAX_CHARS = 8000

_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer(_MODEL_NAME)
    return _model


@embed_bp.route('/embed', methods=['POST'])
def embed():
    payload = request.get_json(silent=True) or {}
    texts = payload.get('texts') or []
    if not isinstance(texts, list):
        return jsonify({'error': 'texts must be a list of strings'}), 400
    if len(texts) > _MAX_TEXTS:
        return jsonify({'error': f'too many texts ({len(texts)}), max {_MAX_TEXTS}'}), 400
    if not texts:
        return jsonify({'embeddings': [], 'model': _MODEL_NAME, 'dim': 768})
    trimmed = [(t if isinstance(t, str) else str(t or ''))[:_MAX_CHARS] or ' ' for t in texts]
    try:
        model = _get_model()
        vectors = model.encode(trimmed, normalize_embeddings=True, show_progress_bar=False)
        embeddings = [v.tolist() for v in vectors]
        return jsonify({
            'embeddings': embeddings,
            'model': _MODEL_NAME,
            'dim': len(embeddings[0]) if embeddings else 768,
        })
    except Exception as e:  # noqa: BLE001 - surface as JSON, never a stack page
        return jsonify({'error': str(e)[:300]}), 500
