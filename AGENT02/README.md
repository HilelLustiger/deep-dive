# MCP Server (TypeScript)

Based on the [Model Context Protocol](https://modelcontextprotocol.io) documentation and [specification](https://modelcontextprotocol.io/specification/latest/server/tools), and the official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

The tools from AGENT01 served over MCP: a server that answers `tools/list` and `tools/call`, validates input against each tool's JSON Schema, and reports tool failures as error results; a stdio entry point tried in the MCP Inspector and in Claude Code; and an adapter that turns a server's tools into AGENT01 tools, so the hand-written agent runs unchanged on tools from another process.

The full task is in [ASSIGNMENT.md](ASSIGNMENT.md).
