#!/usr/bin/env python3
"""
TabMind v2.0 — Deterministic browser-tab organisation pipeline.

Pipeline Stages
───────────────
  Stage 1  preprocess_tabs           Title cleanup & tokenisation
  Stage 2  enrich_urls               Semantic URL-hint generation
  Stage 3  embed_tabs                Sentence embeddings (all-MiniLM-L6-v2)
  Stage 4  build_similarity_graph    Cosine-similarity graph
  Stage 5  cluster_leiden            Community detection (ModularityVertexPartition)
  Stage 6  build_hierarchy           Recursive sub-clustering
  Stage 7  name_folder               Deterministic folder naming
  Stage 8  clean_tree                Pass-through collapse + orphan absorption
  Stage 9  refine_names_with_gemini  Optional LLM name-polish (google-genai SDK)

Requirements
────────────
  pip install pydantic>=2.0 sentence-transformers igraph leidenalg numpy google-genai
"""
import threading
import json
import logging
import os
import re
import warnings
from dotenv import load_dotenv 
from .embedding_cache import (
    init_db,
    make_cache_key,
    get_embedding,
    save_embedding,
)
from collections import Counter
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, unquote_plus
import numpy as np
from data.dataset import TABS
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer


warnings.filterwarnings("ignore")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("tabmind")


# ═══════════════════════════════════════════════════════════════════════════════
# Safe API-Key Loader
# ═══════════════════════════════════════════════════════════════════════════════

load_dotenv()  # Load .env file if present


# ═══════════════════════════════════════════════════════════════════════════════
# Domain Contracts  (Pydantic v2)
# ═══════════════════════════════════════════════════════════════════════════════


class RawTab(BaseModel):
    id: int
    title: str
    url: str
    hostname: str
    pathname: str
    search: str


class ProcessedTab(RawTab):
    cleanTitle: str = ""
    tokens: List[str] = Field(default_factory=list)
    urlHints: List[str] = Field(default_factory=list)
    embeddingText: str = ""
    embedding: Optional[List[float]] = None


class FolderNode(BaseModel):
    id: str
    name: str
    tabs: List[ProcessedTab] = Field(default_factory=list)
    children: List["FolderNode"] = Field(default_factory=list)


# Required for recursive Pydantic v2 model with a self-referential field.
FolderNode.model_rebuild()


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1 — preprocess_tabs
# ═══════════════════════════════════════════════════════════════════════════════

_STOPWORDS: frozenset = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "its", "as", "be", "was",
    "are", "were", "been", "has", "have", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "not", "this", "that", "these", "those", "my", "your", "his", "her",
    "our", "their", "we", "you", "he", "she", "they", "i", "me", "him",
    "us", "them", "what", "which", "who", "how", "when", "where", "why",
    "if", "then", "than", "so", "yet", "both", "either", "each", "all",
    "any", "more", "most", "other", "into", "through", "about", "up",
    "out", "over", "after", "under", "while", "between", "such", "no",
    "only", "same", "also", "just", "like", "new", "get", "use", "using",
    "used", "make", "made", "go", "going", "one", "two", "now", "full",
})

# Applied in order; first match wins per title.
_SUFFIX_RE: List[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\s*[-–|]\s*YouTube\s*$",
        r"\s*[-–|•]\s*LinkedIn\s*$",
        r"\s*[-–|]\s*Google\s+Docs\s*$",
        r"\s*[-–|]\s*Google\s+Drive\s*$",
        r"\s*[-–|]\s*Google\s+Sheets\s*$",
        r"\s*[-–|]\s*GitHub\s*$",
        r"\s*[-–|]\s*Stack\s+Overflow\s*$",
        r"\s*[-–|]\s*Medium\s*$",
        r"\s*[-–|]\s*Reddit\s*$",
        r"\s*[-–|]\s*Twitter\s*$",
        r"\s*[-–|]\s*LeetCode\s*$",
        r"\s*[-–|]\s*GeeksforGeeks\s*$",
        r"\s*[-–|]\s*Hacker\s*News\s*$",
        r"\s*[-–|]\s*Gmail\s*$",
        r"\s*[-–|:]\s*Udemy\s*$",
        r"\s*[-–|]\s*Coursera\s*$",
        r"\s*[-–|]\s*Dev\.to\s*$",
        r"\s*[-–|]\s*Notion\s*$",
        r"\s*[-–|]\s*Wikipedia\s*$",
    ]
]


def strip_suffixes(title: str) -> str:
    """Strip common website suffixes from a browser title."""
    for pattern in _SUFFIX_RE:
        cleaned = pattern.sub("", title).strip()
        if cleaned != title.strip():
            return cleaned
    return title.strip()


def tokenize(text: str) -> List[str]:
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return [w for w in words if len(w) >= 2 and w not in _STOPWORDS]


def preprocess_tabs(tabs: List[RawTab]) -> List[ProcessedTab]:
    """Stage 1: Strip site-name suffixes from titles and tokenize them."""
    result: List[ProcessedTab] = []
    for tab in tabs:
        clean = strip_suffixes(tab.title)
        data = tab.model_dump()
        data["cleanTitle"] = clean
        data["tokens"] = tokenize(clean)
        result.append(ProcessedTab(**data))
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2 — enrich_urls
# ═══════════════════════════════════════════════════════════════════════════════

# (hostname_contains, pathname_contains, query_contains, hints)
# Rules are evaluated in order; the first full match wins.
_URL_RULES: List[Tuple[str, str, str, List[str]]] = [
    # ── YouTube ───────────────────────────────────────────────────────────────
    ("youtube.com", "/watch",    "list=",  ["video_tutorial", "course_playlist"]),
    ("youtube.com", "/watch",    "",       ["video_tutorial"]),
    ("youtube.com", "/playlist", "",       ["course_playlist"]),
    ("youtube.com", "/channel",  "",       ["youtube_channel"]),
    ("youtu.be",    "",          "",       ["video_tutorial"]),
    # ── GitHub (specific paths; generic repo handled via _github_hints) ───────
    ("github.com",  "/issues",      "", ["github_issues",      "bug_tracking"]),
    ("github.com",  "/pull",        "", ["github_pr",          "code_review"]),
    ("github.com",  "/blob",        "", ["source_code",        "file_view"]),
    ("github.com",  "/tree",        "", ["source_code",        "repo_browse"]),
    ("github.com",  "/discussions", "", ["github_discussions", "community"]),
    # ── LeetCode ──────────────────────────────────────────────────────────────
    ("leetcode.com", "/problems/", "", ["dsa_problem",         "coding_interview"]),
    ("leetcode.com", "/contest/",  "", ["coding_contest",      "competitive_programming"]),
    ("leetcode.com", "/explore/",  "", ["dsa_learning",        "coding_interview"]),
    # ── Documentation ─────────────────────────────────────────────────────────
    ("docs.python.org",       "", "", ["python_docs",      "reference"]),
    ("developer.mozilla.org", "", "", ["web_docs",         "mdn_reference"]),
    ("docs.oracle.com",       "", "", ["java_docs",        "reference"]),
    ("react.dev",             "", "", ["react_docs",       "frontend"]),
    ("reactjs.org",           "", "", ["react_docs",       "frontend"]),
    ("docs.spring.io",        "", "", ["spring_docs",      "backend_java"]),
    ("vuejs.org",             "", "", ["vue_docs",         "frontend"]),
    ("angular.io",            "", "", ["angular_docs",     "frontend"]),
    # ── Stack Overflow ────────────────────────────────────────────────────────
    ("stackoverflow.com", "/questions/", "", ["debugging", "stackoverflow"]),
    # ── Blogs & Reading ───────────────────────────────────────────────────────
    ("medium.com",              "", "", ["blog_article",         "tech_reading"]),
    ("towardsdatascience.com",  "", "", ["data_science_article", "ml_reading"]),
    ("dev.to",                  "", "", ["dev_article",          "tech_reading"]),
    ("news.ycombinator.com",    "", "", ["hackernews",           "tech_news"]),
    # ── Reddit ────────────────────────────────────────────────────────────────
    ("reddit.com", "/r/", "", ["reddit_community", "discussion"]),
    # ── Google Workspace ──────────────────────────────────────────────────────
    ("mail.google.com",         "",              "", ["email",          "gmail"]),
    ("calendar.google.com",     "",              "", ["calendar",       "scheduling"]),
    ("docs.google.com",         "/document",     "", ["google_docs",    "document_editing"]),
    ("docs.google.com",         "/spreadsheets", "", ["google_sheets",  "spreadsheet"]),
    ("docs.google.com",         "/presentation", "", ["google_slides",  "presentation"]),
    ("drive.google.com",        "",              "", ["google_drive",   "cloud_storage"]),
    # ── Package Registries ────────────────────────────────────────────────────
    ("npmjs.com",  "/package/", "", ["npm_package",   "javascript_library"]),
    ("pypi.org",   "/project/", "", ["pypi_package",  "python_library"]),
    # ── E-Learning ────────────────────────────────────────────────────────────
    ("udemy.com",    "/course/", "", ["online_course", "e_learning"]),
    ("coursera.org", "/learn/",  "", ["online_course", "e_learning"]),
    # ── Cloud Consoles ────────────────────────────────────────────────────────
    ("console.aws.amazon.com", "", "", ["aws_console",   "cloud_infra"]),
    ("aws.amazon.com",         "", "", ["cloud_aws",     "cloud_infra"]),
    ("cloud.google.com",       "", "", ["cloud_gcp",     "cloud_infra"]),
    ("portal.azure.com",       "", "", ["cloud_azure",   "cloud_infra"]),
    # ── Notes & Productivity ──────────────────────────────────────────────────
    ("notion.so", "", "", ["notion_page", "notes"]),
    # ── Research ──────────────────────────────────────────────────────────────
    ("arxiv.org", "/abs/", "", ["research_paper", "ml_research"]),
    ("arxiv.org", "/pdf/", "", ["research_paper", "ml_research"]),
    # ── ML Platforms ──────────────────────────────────────────────────────────
    ("kaggle.com",      "/competitions/", "", ["ml_competition", "data_science"]),
    ("kaggle.com",      "/notebooks/",    "", ["ml_notebook",    "data_science"]),
    ("huggingface.co",  "/models/",       "", ["ml_model",       "ai_hub"]),
    ("huggingface.co",  "/datasets/",     "", ["ml_dataset",     "ai_hub"]),
    # ── Reference ─────────────────────────────────────────────────────────────
    ("wikipedia.org", "", "", ["wikipedia", "reference"]),
]


def github_hints(pathname: str) -> List[str]:
    """Extract org/repo tokens from a GitHub pathname."""
    parts = [p for p in pathname.split("/") if p]
    hints: List[str] = []
    if len(parts) >= 1:
        hints.append(f"repo_{parts[0]}")
    if len(parts) >= 2:
        hints.append(parts[1])
    if len(parts) < 3:          # plain /org/repo — no sub-path like /blob
        hints.append("source_code")
    return hints


def url_rule_hints(
    tab: ProcessedTab,
    url_rules: List[Tuple[str, str, str, List[str]]] = _URL_RULES,
) -> List[str]:
    """Return semantic hints from configurable URL rules."""
    hints: List[str] = []
    for host_pat, path_pat, query_pat, rule_hints in url_rules:
        if host_pat not in tab.hostname:
            continue
        if path_pat and path_pat not in tab.pathname:
            continue
        if query_pat and query_pat not in tab.search:
            continue
        hints.extend(rule_hints)
        break

    if "github.com" in tab.hostname:
        hints.extend(github_hints(tab.pathname))

    return hints


def normalized_url_text(tab: ProcessedTab) -> str:
    """Convert useful path/query tokens into embedding-friendly text."""
    path = unquote_plus(tab.pathname)
    path = re.sub(r"[/_\-.]+", " ", path)
    query_values = parse_qs(tab.search.lstrip("?"))
    query = " ".join(" ".join(values) for values in query_values.values())
    query = unquote_plus(query)
    return " ".join(filter(None, [path, query]))


def enrich_urls(
    tabs: List[ProcessedTab],
    url_rules: List[Tuple[str, str, str, List[str]]] = _URL_RULES,
) -> List[ProcessedTab]:
    """Stage 2: Generate semantic URL hints and embedding text for each tab."""
    result: List[ProcessedTab] = []
    for tab in tabs:
        hints = url_rule_hints(tab, url_rules)
        embedding_text = " ".join(
            filter(
                None,
                [tab.cleanTitle, normalized_url_text(tab), *hints, tab.hostname],
            )
        )

        data = tab.model_dump()
        data["urlHints"] = hints
        data["embeddingText"] = embedding_text
        result.append(ProcessedTab(**data))
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 3 — embed_tabs
# ═══════════════════════════════════════════════════════════════════════════════


DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


@lru_cache(maxsize=2)
def load_embedding_model(model_name: str = DEFAULT_EMBEDDING_MODEL) -> SentenceTransformer:
    logger.info("Loading SentenceTransformer: %s", model_name)
    return SentenceTransformer(model_name)


def embed_tabs(
    tabs: List[ProcessedTab],
    model_name: str = DEFAULT_EMBEDDING_MODEL,
) -> List[ProcessedTab]:
    """Stage 3: Encode embeddingText strings."""
    hits=0
    miss=0
    cached_vectors = {}
    missing_texts = []
    missing_tabs = []
    missing_indices = []
    
    # -----------------------------
    # Check SQLite Cache
    # -----------------------------
    for idx, tab in enumerate(tabs):

        key = make_cache_key(
            tab.embeddingText,
            model_name,
        )

        embedding = get_embedding(key)

        if embedding is not None:
            hits+=1
            cached_vectors[idx] = embedding
        else:
            miss+=1
            missing_indices.append(idx)
            missing_tabs.append(tab)
            missing_texts.append(tab.embeddingText)

    logger.info(
        "Embedding Cache → Hits: %d | Misses: %d",
        hits,
        miss,
    )
    # -----------------------------
    # Encode only missing tabs
    # -----------------------------
    if missing_texts:

        logger.info("Encoding %d new tabs...", len(missing_texts))

        new_vectors = load_embedding_model(model_name).encode(
            missing_texts,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        for idx, tab, vector in zip(
            missing_indices,
            missing_tabs,
            new_vectors,
        ):

            key = make_cache_key(
                tab.embeddingText,
                model_name,
            )

            save_embedding(key, vector)

            cached_vectors[idx] = vector

    # -----------------------------
    # Build final result
    # -----------------------------
    result = []

    for idx, tab in enumerate(tabs):

        data = tab.model_dump()
        data["embedding"] = cached_vectors[idx].tolist()

        result.append(
            ProcessedTab(**data)
        )

    return result



# ═══════════════════════════════════════════════════════════════════════════════
# Stage 4 — build_similarity_graph
# ══════════════════════════════════════════════════════════════════════════════════
DEFAULT_ORPHAN_MIN_SIM = 0.42


def similarity_threshold(
    sim: np.ndarray,
    minimum: float = 0.45,
    percentile: float = 85.0,
) -> float:
    scores = sim[np.triu_indices(sim.shape[0], k=1)]
    if scores.size == 0:
        return minimum
    return max(minimum, float(np.percentile(scores, percentile)))


def build_similarity_graph(
    tabs: List[ProcessedTab],
    threshold: Optional[float] = None,
    orphan_min_sim: float = DEFAULT_ORPHAN_MIN_SIM,
) -> Tuple[List[Tuple[int, int, float]], np.ndarray]:
    """
    Stage 4: Build a cosine-similarity graph.

    If threshold is None, an adaptive threshold is selected from this batch.
    Weak orphan nodes are left as singletons instead of being forced into bad edges.
    """
    n = len(tabs)
    if n <= 1:
        return [], np.zeros((n, n), dtype=np.float32)

    emb = np.array([t.embedding for t in tabs], dtype=np.float32)
    norms = np.linalg.norm(emb, axis=1, keepdims=True)
    norms = np.where(norms == 0.0, 1e-9, norms)
    normed = emb / norms
    sim: np.ndarray = normed @ normed.T
    np.fill_diagonal(sim, 0.0)

    cutoff = threshold if threshold is not None else similarity_threshold(sim)
    edges: List[Tuple[int, int, float]] = []
    has_edge = [False] * n

    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= cutoff:
                edges.append((i, j, float(sim[i, j])))
                has_edge[i] = True
                has_edge[j] = True

    for i in range(n):
        if has_edge[i]:
            continue
        best_j = int(np.argmax(sim[i]))
        if best_j == i:
            best_j = 0 if i != 0 else 1
        if float(sim[i, best_j]) >= orphan_min_sim:
            edges.append((i, best_j, float(sim[i, best_j])))
            has_edge[i] = True
            has_edge[best_j] = True

    return edges, sim


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 5 — cluster_leiden
# ═══════════════════════════════════════════════════════════════════════════════


def cluster_leiden(
    n_nodes: int,
    edges: List[Tuple[int, int, float]],
) -> List[List[int]]:
    """Stage 5: Detect communities via leidenalg.ModularityVertexPartition."""
    import igraph      # noqa: PLC0415  (lazy import — keeps startup lean)
    import leidenalg   # noqa: PLC0415

    if n_nodes <= 1:
        return [[i] for i in range(n_nodes)]

    if not edges:
        return [[i] for i in range(n_nodes)]

    g = igraph.Graph(n=n_nodes, directed=False)
    g.add_edges([(e[0], e[1]) for e in edges])
    g.es["weight"] = [e[2] for e in edges]

    try:
        partition = leidenalg.find_partition(
            g,
            leidenalg.ModularityVertexPartition,
            weights="weight",
        )
        return [list(community) for community in partition]
    except Exception as exc:
        logger.warning(
            "leidenalg raised %s — falling back to singleton clusters.", exc
        )
        return [[i] for i in range(n_nodes)]


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 7 — name_folder
# ═══════════════════════════════════════════════════════════════════════════════


FALLBACK_FOLDER_NAME = "General Workspace"
GENERIC_NAME_TOKENS = {
    "problem", "problems", "google", "github", "chatgpt", "gemini",
    "com", "www", "search", "home", "main", "description",
}


def name_folder(tabs: List[ProcessedTab]) -> str:
    """Stage 7: Name a folder from title tokens and semantic URL hints."""
    all_tokens: List[str] = []
    for tab in tabs:
        all_tokens.extend(tab.tokens)
        for hint in tab.urlHints:
            all_tokens.extend(tokenize(hint.replace("_", " ")))

    useful_tokens = [t for t in all_tokens if t not in GENERIC_NAME_TOKENS]
    if not useful_tokens:
        return FALLBACK_FOLDER_NAME

    top_two = [word for word, _ in Counter(useful_tokens).most_common(2)]
    if not top_two:
        return FALLBACK_FOLDER_NAME
    return " ".join(w.title() for w in top_two)


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 6 — build_hierarchy
# ═══════════════════════════════════════════════════════════════════════════════


MAX_LEAF_SIZE = 4
MAX_TREE_DEPTH = 3


def next_folder_id(counter: List[int]) -> str:
    counter[0] += 1
    return f"folder_{counter[0]:04d}"


def build_folder_node(
    tabs: List[ProcessedTab],
    depth: int,
    counter: List[int],
    max_leaf_size: int = MAX_LEAF_SIZE,
    max_depth: int = MAX_TREE_DEPTH,
) -> FolderNode:
    """
    Stage 6: Recursively sub-cluster large communities into nested FolderNodes.

    Stopping conditions:
    - community size <= max_leaf_size
    - recursion depth >= max_depth
    - Leiden returns <= 1 sub-community
    """
    node_id = next_folder_id(counter)
    name = name_folder(tabs)

    if len(tabs) <= max_leaf_size or depth >= max_depth:
        return FolderNode(id=node_id, name=name, tabs=tabs, children=[])

    edges, _ = build_similarity_graph(tabs)
    sub_communities = cluster_leiden(len(tabs), edges)

    if len(sub_communities) <= 1:
        return FolderNode(id=node_id, name=name, tabs=tabs, children=[])

    children = [
        build_folder_node(
            [tabs[i] for i in comm],
            depth + 1,
            counter,
            max_leaf_size=max_leaf_size,
            max_depth=max_depth,
        )
        for comm in sub_communities
    ]
    return FolderNode(id=node_id, name=name, tabs=[], children=children)


def build_hierarchy(
    tabs: List[ProcessedTab],
    top_communities: List[List[int]],
    max_leaf_size: int = MAX_LEAF_SIZE,
    max_depth: int = MAX_TREE_DEPTH,
) -> List[FolderNode]:
    counter = [0]
    return [
        build_folder_node(
            [tabs[i] for i in comm],
            depth=1,
            counter=counter,
            max_leaf_size=max_leaf_size,
            max_depth=max_depth,
        )
        for comm in top_communities
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 8 — clean_tree
# ═══════════════════════════════════════════════════════════════════════════════


CATCHALL_ID = "folder_misc"
CATCHALL_NAME = "Miscellaneous / Quick Tasks"


def collapse_passthrough_node(node: FolderNode) -> FolderNode:
    """Collapse nodes that only wrap a single child."""
    cleaned_children = [collapse_passthrough_node(c) for c in node.children]
    node = FolderNode(
        id=node.id, name=node.name,
        tabs=node.tabs, children=cleaned_children,
    )
    if len(node.tabs) == 0 and len(node.children) == 1:
        child = node.children[0]
        return FolderNode(
            id=node.id,
            name=f"{node.name} / {child.name}",
            tabs=child.tabs,
            children=child.children,
        )
    return node


def clean_tree(folders: List[FolderNode]) -> List[FolderNode]:
    """Stage 8: Collapse pass-through folders and absorb root-level singletons."""
    collapsed = [collapse_passthrough_node(f) for f in folders]

    normal: List[FolderNode] = []
    orphan_tabs: List[ProcessedTab] = []

    for folder in collapsed:
        if len(folder.tabs) == 1 and len(folder.children) == 0:
            orphan_tabs.append(folder.tabs[0])
        else:
            normal.append(folder)

    if orphan_tabs:
        normal.append(FolderNode(
            id=CATCHALL_ID,
            name=CATCHALL_NAME,
            tabs=orphan_tabs,
            children=[],
        ))

    return normal


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 9 — refine_names_with_gemini
# ═══════════════════════════════════════════════════════════════════════════════

_GEMINI_PROMPT_HEADER = """
You are an expert software developer and workspace organization assistant.

You will receive a JSON array representing a hierarchical browser-tab folder tree.

Your task is to improve ONLY the value of every "name" field.

Objective:
Rename every folder and subfolder into concise, natural, developer-friendly workspace categories.

Guidelines:
- Preserve the original hierarchy.
- Preserve every object and array exactly.
- DO NOT add, remove, reorder, or modify any field except "name".
- Rename every folder, including nested folders.
- Names should sound like categories a professional developer would create.
- Use clear, intuitive English.
- Use Title Case.
- Use 2–4 words whenever possible.
- Avoid punctuation unless necessary.
- Avoid vague names like "Misc", "Other", "Stuff", "Random", "New Folder", or "Untitled".
- Avoid repeating parent folder names.
- Infer the best category from the folder contents whenever possible.
- Prefer semantic categories over literal folder names.

Examples:
"leetcode" → "Coding Practice"
"react_docs" → "React Development"
"aws" → "Cloud Infrastructure"
"openai" → "AI Development"
"system_design" → "System Design"
"github" → "Version Control"
"college" → "Coursework"
"placements" → "Interview Prep"

Output Requirements:
- Return valid JSON only.
- The output must be the same JSON array.
- Every object must remain identical except for updated "name" values.
- Do NOT wrap the JSON in markdown.
- Do NOT include explanations.
- Do NOT include comments.
- Do NOT include any text before or after the JSON.

Folder tree:
"""


def _strip_embeddings(node: FolderNode) -> Dict[str, Any]:
    """Return a lightweight dict suitable for LLM context (no embedding vectors)."""
    return {
        "id": node.id,
        "name": node.name,
        "tabs": [
            {k: v for k, v in tab.model_dump().items() if k != "embedding"}
            for tab in node.tabs
        ],
        "children": [_strip_embeddings(c) for c in node.children],
    }


def _patch_names(original: FolderNode, renamed: Dict[str, Any]) -> FolderNode:
    """Recursively overlay Gemini-proposed names onto the original tree structure."""
    new_name = renamed.get("name", original.name)
    renamed_children = renamed.get("children", [])
    new_children = [
        _patch_names(child, renamed_children[i] if i < len(renamed_children) else {})
        for i, child in enumerate(original.children)
    ]
    return FolderNode(
        id=original.id, name=new_name,
        tabs=original.tabs, children=new_children,
    )


DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def refine_names_with_gemini(
    folders: List[FolderNode],
    api_key: str = "",
    model: str = DEFAULT_GEMINI_MODEL,
) -> List[FolderNode]:
    """
    Stage 9: Optional name enhancement via Gemini.

    If this stage fails for any reason, the Stage 8 tree is returned unchanged.
    """
    if not api_key:
        logger.warning("GEMINI_KEY not set — skipping Stage 9.")
        return folders

    try:
        from google import genai  # type: ignore[import]  # google-genai SDK

        client = genai.Client(api_key=api_key)

        payload_json = json.dumps(
            [_strip_embeddings(f) for f in folders], indent=2
        )
        prompt = _GEMINI_PROMPT_HEADER + payload_json

        logger.info("Calling %s for semantic name polish…", model)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )

        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        renamed_list: Any = json.loads(raw)
        if not isinstance(renamed_list, list):
            raise ValueError(
                f"Expected a JSON array from Gemini; got {type(renamed_list).__name__}."
            )

        refined = [
            _patch_names(folder, renamed_list[i] if i < len(renamed_list) else {})
            for i, folder in enumerate(folders)
        ]
        logger.info("Stage 9 — Gemini refinement successful.")
        return refined

    except Exception as exc:
        logger.warning(
            "Stage 9 (Gemini name refinement) failed: %s — returning Stage 8 tree.",
            exc,
        )
        return folders


# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════


def run_tabmind_pipeline(
    raw_tabs: List[Dict[str, Any]],
    # gemini_api_key: str = "",
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
    url_rules: List[Tuple[str, str, str, List[str]]] = _URL_RULES,
    max_leaf_size: int = MAX_LEAF_SIZE,
    max_depth: int = MAX_TREE_DEPTH,
    similarity_cutoff: Optional[float] = None,
) -> Tuple[List[FolderNode], List[FolderNode]]:
    """
    Execute the full pipeline.

    Returns:
    stage8_tree: deterministic folder hierarchy
    stage9_tree: Gemini-polished hierarchy, equal to stage8_tree on failure
    """
    logger.info("╔══ TabMind v2.0  — %d input tab(s) ══╗", len(raw_tabs))

    raw: List[RawTab] = [RawTab(**t) for t in raw_tabs]

    logger.info("│  Stage 1 → preprocess_tabs")
    s1 = preprocess_tabs(raw)

    logger.info("│  Stage 2 → enrich_urls")
    s2 = enrich_urls(s1, url_rules=url_rules)

    logger.info("│  Stage 3 → embed_tabs")
    s3 = embed_tabs(s2, model_name=embedding_model)

    logger.info("│  Stage 4 → build_similarity_graph")
    edges, _ = build_similarity_graph(s3, threshold=similarity_cutoff)
    logger.info("│            %d nodes · %d edges", len(s3), len(edges))

    logger.info("│  Stage 5 → cluster_leiden")
    communities = cluster_leiden(len(s3), edges)
    logger.info("│            %d top-level communities", len(communities))

    logger.info("│  Stage 6/7 → build_hierarchy + name_folder")
    hierarchy = build_hierarchy(
        s3,
        communities,
        max_leaf_size=max_leaf_size,
        max_depth=max_depth,
    )

    logger.info("│  Stage 8 → clean_tree")
    stage8_tree = clean_tree(hierarchy)

    return stage8_tree

def stage_9_refine_names(stage8_tree,api_key):
  logger.info("│  Stage 9 → refine_names_with_gemini  (optional)")
  stage9_tree = refine_names_with_gemini(stage8_tree, api_key=api_key)
  logger.info("╚══ Pipeline complete ══╝")
  return stage9_tree



# ═══════════════════════════════════════════════════════════════════════════════
# Pretty-Printer
# ═══════════════════════════════════════════════════════════════════════════════



def _tab_count(node: FolderNode) -> int:
    return len(node.tabs) + sum(_tab_count(c) for c in node.children)


def print_tree(folders: List[FolderNode], indent: int = 0) -> None:
    pad = "    " * indent
    for folder in folders:
        n = _tab_count(folder)
        suffix = "tabs" if n != 1 else "tab"
        print(f"{pad}📁  {folder.name}  ({n} {suffix})")
        for tab in folder.tabs:
            label = tab.cleanTitle or tab.title
            print(f"{pad}    🔗  [{tab.id:02d}] {label}")
        if folder.children:
            print_tree(folder.children, indent + 1)

def serialize_tree(folders: List[FolderNode]) -> List[Dict[str, Any]]:
    result = []

    for folder in folders:
        result.append({
            "id": folder.id,
            "name": folder.name,
            "tabs": [
                {
                    "id": tab.id,
                    "title": tab.cleanTitle or tab.title,
                    "url": tab.url,
                    "hostname": tab.hostname,
                }
                for tab in folder.tabs
            ],
            "children": serialize_tree(folder.children),
        })

    return result

# ═══════════════════════════════════════════════════════════════════════════════
# Entry Point — mock payload of 8 realistic browser tabs
# ═══════════════════════════════════════════════════════════════════════════════

# if __name__ == "__main__":
#     SAMPLE_TABS: List[Dict[str, Any]] =TABS
#     _SEP = "═" * 66

#     api_key = os.getenv("GEMINI_API_KEY")
#     if api_key is None:
#       raise ValueError("GEMINI_API_KEY not found in .env")
#     stage8_tree= run_tabmind_pipeline(
#         SAMPLE_TABS,
#         gemini_api_key=api_key,
#     )
#     print(f"\n{_SEP}")
#     print("  STAGE 8 — Deterministic Hierarchy  (LocalNamer)")
#     print(_SEP)
#     print_tree(stage8_tree)
#     stage9_tree = stage_9_refine_names(stage8_tree, api_key)


#     print(f"\n{_SEP}")
#     print("  STAGE 9 — Gemini-Polished Hierarchy")
#     print(_SEP)
#     print_tree(stage9_tree)
