# Assignment NET01 — Key-Value Server (Python)

**Topics:** TCP sockets, clients and servers, TCP as a byte stream, message framing, designing a protocol, serving many clients with threads and with asyncio, network errors and timeouts, HTTP as text over TCP

## Introduction

In this assignment you will build a small networked database: a **key-value server**. Clients connect to it over TCP and send commands like "set `color` to `blue`" or "get `color`". The server keeps the data in memory and answers each command.

Almost everything you'll use at work, like HTTP APIs, databases and message queues, is a program like this one: a server that listens on a port, clients that connect to it, and an agreed format for the messages they exchange. Libraries usually hide the details. Here you'll write them yourself, directly on top of sockets, so you understand what those libraries do for you.

You will start with a simple echo server, find out why it breaks as soon as messages get bigger, design a real protocol, then make the server handle many clients at once, first with threads and then with asyncio. At the end you'll speak HTTP to your server from a browser, and see that HTTP is just text over the same kind of connection.

The assignment has eight parts. Do them in order, and write the tests for each part before moving to the next one.

Names given in **bold code** are required. Everything else is up to you.

### Ports in tests

A server listens on a **port**. If tests use a fixed port, like 5000, they fail when something else is using it, or when a previous test's server hasn't released it yet. Instead, bind to port **0**: the operating system picks a free port. Read the actual port with `server_socket.getsockname()[1]` and connect the client to it. Every server in this assignment takes a port argument, and exposes the port it actually got.

Servers in tests run in a background thread (or an asyncio task in Part 5), and must be stopped at the end of each test. A pytest fixture that starts the server, yields it, and stops it afterwards keeps this in one place.

---

## Reading

### Before you start

The goal here is to know the vocabulary and the shape of each problem before you write code, not to know the solution.

1. **[Real Python — Socket Programming in Python (Guide)](https://realpython.com/python-sockets/)**, sections "Background", "Socket API Overview" and "TCP Sockets".
   What a socket is, and the sequence of calls on each side of a TCP connection: `socket`, `bind`, `listen`, `accept` on the server, and `connect` on the client, then `send`/`recv` and `close`. The article's later "Echo Client and Server" section is essentially Part 1, so read it after you've written yours.
   *Parts 1 and 3.*
2. **[Python docs — Socket Programming HOWTO](https://docs.python.org/3/howto/sockets.html)**
   The concepts behind the calls. "Creating a Socket" explains the difference between the listening socket and the client socket that `accept` returns. "Using a Socket" explains why `recv` can return less than you asked for, and the three ways to mark where a message ends. "Binary Data" covers network byte order, and "Disconnecting" and "When Sockets Die" cover closing.
   *Parts 1, 2 and 6.*
3. **Python docs — `struct`**: [Byte Order, Size, and Alignment](https://docs.python.org/3/library/struct.html#byte-order-size-and-alignment) and [Format Characters](https://docs.python.org/3/library/struct.html#format-characters)
   What `"!I"` means: network byte order and a 4-byte unsigned integer.
   *Part 2.*
4. **Python docs — `socket`**: [`socketpair`](https://docs.python.org/3/library/socket.html#socket.socketpair) and [Notes on socket timeouts](https://docs.python.org/3/library/socket.html#notes-on-socket-timeouts)
   Two connected sockets without a server, and the three modes a socket can be in: blocking, non-blocking and timeout.
   *Parts 2 and 6.*
5. **[Python docs — OS exceptions](https://docs.python.org/3/library/exceptions.html#os-exceptions)**
   `ConnectionError` and its subclasses (`ConnectionRefusedError`, `ConnectionResetError`, `BrokenPipeError`), and `TimeoutError`: what each one means on a network.
   *Part 6.*
6. **Assignment CONC01's reading on locks**, for the shared dictionary.
   *Part 4.*
7. **[Python docs — asyncio Streams](https://docs.python.org/3/library/asyncio-stream.html)**
   [`start_server`](https://docs.python.org/3/library/asyncio-stream.html#asyncio.start_server), [`StreamReader`](https://docs.python.org/3/library/asyncio-stream.html#streamreader) and [`StreamWriter`](https://docs.python.org/3/library/asyncio-stream.html#streamwriter): the asyncio version of the same socket calls.
   *Part 5.*
8. **[MDN — An overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)** and **[MDN — HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages)**
   HTTP as a client–server protocol over TCP, and the exact structure of a request and a response: start line, headers, empty line, body. Use **[MDN — HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)** as a reference for 200, 204, 400, 404 and 405.
   *Part 7.*

### Going deeper

The sources this assignment is based on:

- ***Foundations of Python Network Programming*, 3rd ed.** by Brandon Rhodes and John Goerzen, ch. 3 "TCP", ch. 5 "Network Data and Network Errors" and ch. 7 "Server Architecture" (not free).
- ***Computer Networking: A Top-Down Approach*** by James Kurose and Keith Ross ([companion site](https://gaia.cs.umass.edu/kurose_ross/index.php)), ch. 2 "Application Layer" (HTTP and socket programming) and ch. 3 "Transport Layer" (how TCP makes an unreliable network reliable).

How TCP works:

- **[Ilya Grigorik — High Performance Browser Networking, ch. 2 "Building Blocks of TCP"](https://hpbn.co/building-blocks-of-tcp/)** (free online). The three-way handshake, flow control, slow start and head-of-line blocking: what happens under your `connect` and `sendall`.
- **[Beej's Guide to Network Programming](https://beej.us/guide/bgnet/html/)**. The C socket API that Python's `socket` module wraps. A preview of project NET02.

Serving many clients:

- **[Dan Kegel — The C10K problem](http://www.kegel.com/c10k.html)**. The classic article on why one thread per client stops scaling, and the event-based designs that followed.
- **[OSTEP, ch. 33 — Event-based Concurrency](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-events.pdf)**. How a single thread serves many connections with `select`/`poll`, which is what asyncio does inside.
- **[Python docs — `selectors`](https://docs.python.org/3/library/selectors.html)**. Write a multi-client server in one thread without asyncio. The Real Python sockets guide above has a section doing exactly that.

Protocols:

- **[Redis serialization protocol (RESP) specification](https://redis.io/docs/latest/develop/reference/protocol-spec/)**. The protocol of a real key-value server. Compare its framing, which mixes delimiters and length prefixes, with your design.
- **[RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)**. The actual specification of HTTP messages, including every way the length of a body can be determined.
- **[MDN — Connection management in HTTP/1.x](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x)**. Why real HTTP keeps connections open, and what that does to framing.

---

## Part 0 — Project setup

Set up the project in this folder:

- `requirements-dev.txt` with `pytest` and `pytest-asyncio`.
- A `kv/` package for the code, and a `tests/` folder.
- A `pytest.ini` with `asyncio_mode = auto`.

Everything else uses the standard library: `socket`, `struct`, `json`, `threading` and `asyncio`.

---

## Part 1 — An echo server

**File:** `kv/echo.py`

An echo server sends back whatever it receives. It's the "hello world" of networking, and it goes through every step of a TCP connection.

**The server:**

1. Creates a socket with `socket.socket(socket.AF_INET, socket.SOCK_STREAM)`: IPv4, TCP.
2. Sets `SO_REUSEADDR`, so that restarting the server doesn't fail with "address already in use".
3. `bind`s to an address and port, then `listen`s.
4. `accept`s a connection. `accept` blocks until a client connects, then returns a **new** socket for that one client. The listening socket keeps listening.
5. `recv`s data and `sendall`s it back, until `recv` returns `b""`. An empty result means the client closed its side of the connection.
6. Closes the client socket.

**The client** `connect`s to the server, sends data, reads the reply, and closes.

Write:

- **`EchoServer(host, port)`** with **`serve_forever()`**, **`shutdown()`** and a **`port`** property. It handles one client at a time.
- **`echo(host, port, data: bytes) -> bytes`**: connects, sends `data`, reads the reply, closes, and returns the reply.

Use `with` for sockets. Sockets are context managers, and `with` guarantees they are closed.

### Test that:

- `echo(..., b"hello")` returns `b"hello"`.
- Several `echo` calls in a row, each with a new connection, all work.
- The server shuts down cleanly at the end of the test.

---

## Part 2 — TCP is a stream, not messages

**File:** `kv/framing.py`

Your echo client probably calls `recv(1024)` once and treats the result as the whole reply. That works for `b"hello"`, and it's wrong.

TCP delivers a **stream of bytes**, not separate messages. The sender's `sendall(1000 bytes)` may arrive as one `recv` of 1000 bytes, or as ten of 100, or merged with the next message. `recv(n)` returns *up to* `n` bytes: whatever has arrived so far. Nothing in TCP marks where one message ends and the next begins. The application has to do that itself. This is called **framing**.

There are two common ways to frame messages:

- **A delimiter**: end each message with a special byte, such as `\n`. Simple, but the message must never contain that byte.
- **A length prefix**: send the length of the message first, in a fixed number of bytes, then the message itself. The receiver reads the length, then reads exactly that many bytes.

You'll use a length prefix. `struct.pack("!I", n)` encodes an integer as exactly 4 bytes in network byte order, and `struct.unpack("!I", data)` decodes it.

Write:

- **`recv_exactly(sock, n) -> bytes`**: calls `recv` in a loop until it has exactly `n` bytes. If the connection closes before that, raises `ConnectionError`.
- **`send_message(sock, payload: bytes)`**: sends the 4-byte length, then the payload.
- **`recv_message(sock) -> bytes`**: reads the 4-byte length, then exactly that many bytes.

### Test that:

Use `socket.socketpair()` for these tests. It gives two connected sockets with no server needed.

- A message sent with `send_message` comes back identical from `recv_message`.
- Three messages sent one after another come back as three separate messages, in order.
- A 5 MB message comes back complete. With a single `recv`, it wouldn't.
- `recv_exactly` raises `ConnectionError` when the other side closes in the middle of a message.
- **Show the bug:** send two messages with plain `sendall` and no framing, then do one `recv(1024)`. Check that you got both messages merged together. This test documents why framing exists.

---

## Part 3 — The key-value protocol

**Files:** `kv/protocol.py`, `kv/server.py`, `kv/client.py`

Now design the protocol: what a request and a response look like.

Each request and each response is one framed message (Part 2) whose payload is a JSON object encoded as UTF-8:

| Request | Successful response |
|---------|---------------------|
| `{"op": "set", "key": "color", "value": "blue"}` | `{"ok": true}` |
| `{"op": "get", "key": "color"}` | `{"ok": true, "value": "blue"}` |
| `{"op": "delete", "key": "color"}` | `{"ok": true}` |
| `{"op": "keys"}` | `{"ok": true, "keys": ["color", ...]}` |

When something goes wrong, the response is `{"ok": false, "error": "<description>"}`. For example, when getting a key that doesn't exist, using an unknown `op`, or sending a payload that isn't valid JSON.

A client may send many requests over one connection. The server answers each request before reading the next one.

Write:

- In `protocol.py`: **`encode(obj) -> bytes`** and **`decode(data: bytes) -> dict`**.
- In `server.py`: **`KVServer(host, port)`** with **`serve_forever()`**, **`shutdown()`** and **`port`**. Like the echo server, it handles one client at a time. A bad request gets an error response and the connection stays open: one mistake by a client must not crash the server or close the connection.
- In `client.py`: **`KVClient(host, port)`**, a context manager that opens the connection on enter and closes it on exit, with methods **`set(key, value)`**, **`get(key)`**, **`delete(key)`** and **`keys()`**. `get` of a missing key raises `KeyError`. Any other error response raises `RuntimeError` with the server's description.

### Test that:

- `set` followed by `get` returns the value.
- `get` of a missing key raises `KeyError`.
- `delete` removes a key, and `keys` lists the current keys.
- Many requests over one connection all work.
- A raw socket that sends a framed payload that isn't valid JSON gets an error response, and can send a valid request on the same connection afterwards.
- Data set by one client is visible to the next client.

---

## Part 4 — Many clients with threads

**File:** `kv/server.py`

Your server handles one client at a time. While it waits for one client to send its next request, every other client waits too, even for a simple `get`. A client that connects and then does nothing blocks everyone.

The classic fix is a **thread per client**. The main thread only `accept`s connections. For each new connection it starts a thread that handles that client until it disconnects.

All the client threads share one dictionary. As you saw in the concurrency project, shared state across threads needs a lock.

Write **`ThreadedKVServer(host, port)`**, with the same interface as `KVServer`, that serves each client in its own thread.

### Test that:

- A client that connects and sends nothing doesn't block a second client, which can `set` and `get` normally. The same test against `KVServer` would hang, so try it once by hand to see it, and don't include that version.
- 20 clients running in parallel, each doing 50 `set`s of its own keys, end with all 1,000 keys present.
- `shutdown()` stops the server even while clients are connected.

---

## Part 5 — Many clients with asyncio

**File:** `kv/async_server.py`

A thread per client works, but threads are expensive: each one costs memory and time to switch. A server with 10,000 mostly idle connections would need 10,000 threads. asyncio handles all of them in a single thread, switching only when there is data to process.

asyncio has its own high-level networking API, **streams**:

- **`asyncio.start_server(handler, host, port)`** calls `handler(reader, writer)` as a new task for each connection.
- **`await reader.readexactly(n)`** is `recv_exactly` built in. It raises `asyncio.IncompleteReadError` if the connection closes early.
- **`writer.write(data)`** followed by **`await writer.drain()`** sends data. `drain` waits if the send buffer is full.

Since everything runs in one thread and the handler never awaits in the middle of reading and writing the dictionary, the dictionary needs no lock.

Write **`async def serve(host, port)`** that starts the server with the same protocol as Part 3, and returns the `asyncio.Server` object. Reuse `encode` and `decode` from `protocol.py`. The framing has to be rewritten for streams, since `recv_exactly` works on blocking sockets.

Your blocking `KVClient` from Part 3 must work against this server unchanged: the protocol is the same, only the server's implementation is different. In tests, run `KVClient` calls with `asyncio.to_thread` so they don't block the event loop that is running the server.

### Test that:

- The Part 3 client tests pass against the asyncio server.
- An idle client doesn't block another client.
- 20 concurrent clients each doing 50 `set`s end with all 1,000 keys.

In `README.md`, compare the threaded and asyncio servers: what was easier or harder to write, and when you'd choose each.

---

## Part 6 — When the network fails

**File:** `kv/client.py`, `kv/server.py`

On a real network, servers are down, connections drop, and replies never arrive. Code that only handles the happy path will hang or crash at the worst moment.

Extend the client and the threaded server:

- **Connection refused.** Connecting to a port where nothing is listening raises `ConnectionRefusedError`. `KVClient` lets it propagate: the caller has to know.
- **Timeouts.** `KVClient(host, port, timeout=...)` sets a timeout on the socket with `settimeout`. Any operation that takes longer raises `TimeoutError` (in Python 3.10+, `socket.timeout` is an alias of it), instead of waiting forever.
- **A client that disappears.** If a client closes the connection in the middle of a message, the server thread must notice, clean up, and end, without affecting other clients or crashing the server.

### Test that:

- Connecting to a closed port raises `ConnectionRefusedError`. To get one, start a server, note its port, and shut it down.
- Against a fake server that `accept`s but never replies, `KVClient` with `timeout=0.5` raises `TimeoutError` after about 0.5 seconds.
- A raw socket that sends only 2 bytes of a length prefix and then closes doesn't break the server: other clients keep working.

---

## Part 7 — Speaking HTTP

**File:** `kv/http_server.py`

HTTP, the protocol of the web, works the same way as your protocol: a client opens a TCP connection and sends a request, and the server sends back a response. The difference is the format. HTTP messages are **text**, and they're framed with line breaks and a length header:

```
GET /keys/color HTTP/1.1\r\n
Host: localhost:8080\r\n
\r\n
```

```
HTTP/1.1 200 OK\r\n
Content-Type: text/plain\r\n
Content-Length: 4\r\n
\r\n
blue
```

The request is a **request line** (method, path, version), then **headers**, one per line, then an empty line. The response is a **status line**, headers, an empty line, and the body. Every line ends with `\r\n`. `Content-Length` tells the receiver how many bytes of body follow: the same idea as your length prefix.

Write **`HTTPKVServer(host, port, store)`** on raw sockets, without `http.server`. `store` is the dictionary it serves. It handles:

- **`GET /keys/<key>`** → `200 OK` with the value as the body, or `404 Not Found`.
- **`PUT /keys/<key>`** with the value as the request body → `204 No Content`. Read the body using the request's `Content-Length` header.
- Anything else → `405 Method Not Allowed` or `400 Bad Request`.

Handle one request per connection, then close it. Real HTTP/1.1 keeps connections open, but closing makes framing simpler here.

### Test that:

Use the standard library's HTTP client, `urllib.request`, in the tests. If it can talk to your server, your server speaks real HTTP.

- A `PUT` followed by a `GET` returns the value.
- A `GET` of a missing key returns 404.
- A `POST` returns 405.

Then run the server and open `http://localhost:<port>/keys/<key>` in your browser.

---

## Wrap up

Complete `README.md` in this folder with short sections:

- **What I learned**: a few sentences.
- **Why TCP needs framing**: in your own words.
- **Threads vs. asyncio**: your comparison from Part 5.
- **A design decision**: one choice you made that the assignment didn't dictate, and why.

## Running the tests

From this folder, with the virtual environment active:

```
python -m pytest
```

## Done when

- [ ] Parts 0–7 are complete
- [ ] Every "Test that" item has a passing test
- [ ] The tests pass on several runs in a row, and no test hangs
- [ ] `README.md` is completed
