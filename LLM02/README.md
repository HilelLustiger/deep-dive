# LLM Calls in Production (TypeScript)

Based on Marc Brooker's [Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) (Amazon Builders' Library), on chapter 4, [Service Level Objectives](https://sre.google/sre-book/service-level-objectives/), and the "Retries" and "Latency and Deadlines" sections of chapter 22, [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/), of Google's *Site Reliability Engineering*, and on Hamel Husain's [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/).

A support-ticket sorter built from layers around the provider-neutral model interface from AGENT01: tracing with token cost and latency percentiles, retries with backoff, jitter and timeouts, structured output checked against a schema with a repair attempt, and an eval with a release gate that compares two prompts on quality, cost and latency. It works the same with Claude and with a local model through Ollama.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
