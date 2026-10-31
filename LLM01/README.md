# How a Model Produces Text (Python)

Based on chapters 2 ("Words and Tokens"), 3 ("N-gram Language Models") and 7 ("Transformers and Pretraining") of Jurafsky and Martin's [*Speech and Language Processing*](https://web.stanford.edu/~jurafsky/slp3/) (3rd edition draft), and on Andrej Karpathy's lectures "Let's build the GPT Tokenizer" and "The spelled-out intro to language modeling: building makemore" from [Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html). Top-p sampling follows Holtzman et al., [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751).

A byte-pair encoding tokenizer built from scratch and compared with GPT-2's, a bigram language model built by counting and measured with perplexity, and the decoding step that every LLM shares (softmax, temperature, greedy, top-k and top-p), run unchanged on the counting model and on GPT-2 running locally. No API and no provider.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
