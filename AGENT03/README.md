# Agentic RAG (TypeScript)

Based on the RAG primer in Anthropic's [Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval), the [Semantic Search](https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html) guide of Sentence Transformers, and the [RAG paper](https://arxiv.org/abs/2005.11401) by Lewis et al.

Retrieval over a small handbook, built from scratch: paragraph-based chunking, cosine similarity, a brute-force vector store over a local embedding model, and two ways to use it, classic RAG that retrieves once and puts the context in the prompt, and agentic RAG where the AGENT01 agent searches through a tool. Answers cite chunk ids, and citations that no search returned are flagged.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
