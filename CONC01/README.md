# Concurrent Bank (Python)

Based on chapters 1–4 of *The Little Book of Semaphores* by Allen B. Downey, and chapters 19–20 ("Concurrency Models in Python", "Concurrent Executors") of *Fluent Python*, 2nd edition, by Luciano Ramalho.

A small bank that processes withdrawals, deposits and transfers from many threads at once. It covers race conditions, locks, deadlock and lock ordering, a producer–consumer queue, semaphores, and when to use threads vs. processes under the GIL.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
