# Talking to an LLM (TypeScript)

Based on section 2, "Accessing Claude with the API", of Anthropic Academy's [Building with the Claude API](https://anthropic.skilljar.com/claude-with-the-anthropic-api) course (making a request, multi-turn conversations, system prompts, temperature, response streaming, structured data), and on the "Sampling" section of chapter 2 of *AI Engineering* by Chip Huyen (sampling, structured outputs, the probabilistic nature of AI). The parts on failure handling follow Marc Brooker's [Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) (Amazon Builders' Library) and the "Retries" and "Latency and Deadlines" sections of [chapter 22, "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/), of Google's *Site Reliability Engineering*. The stream parser follows [§9.2 "Server-sent events"](https://html.spec.whatwg.org/multipage/server-sent-events.html) of the WHATWG HTML Standard.

A terminal chat on top of the Claude Messages API, written first with plain `fetch` and then with the official SDK. It covers the request and response format, tokens and cost, sampling and effort, conversation history and context limits, streaming, retries and timeouts, and structured output.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
