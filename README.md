# Customer Support Agent (OpenAI Agents SDK + OpenRouter)

A small TypeScript demo of a customer support agent built with
[`@openai/agents`](https://github.com/openai/openai-agents-js) and pointed at
[OpenRouter](https://openrouter.ai) instead of the OpenAI API directly.

The agent answers order questions, looks up order status through a tool, and
returns a validated, structured response.

## What it does

- Configures the Agents SDK to use an OpenRouter client (`https://openrouter.ai/api/v1`)
  with the `chat_completions` API and tracing disabled.
- Defines a `get_Order_Status` tool backed by an in-memory order map.
- Gives the agent strict instructions: always call the tool when an order ID is
  mentioned, treat tool output as the source of truth, and never invent order details.
- Returns a structured result typed with Zod:

  ```ts
  {
    message: string;          // reply shown to the customer
    needsHumanSupport: boolean; // true when a human should take over
  }
  ```

- Runs the agent against a list of demo questions and prints each answer.

### Demo orders

| Order ID   | Status                                                            |
| ---------- | ----------------------------------------------------------------- |
| `ORDER123` | Shipped, arriving in 3-5 business days                            |
| `ORDER456` | Processing, shipping soon                                         |
| `ORDER789` | Delivered                                                         |
| anything else | Not found — the agent asks the customer to verify the ID       |

## Requirements

- Node.js 22+ (the `openai` package requires it; developed on Node 24)
- An [OpenRouter](https://openrouter.ai/keys) API key

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

   The app throws at startup if this variable is missing. `.env` is git-ignored.

## Usage

```bash
npm run dev
```

`npm run dev` runs `src/index.ts` with `tsx watch`, so edits re-run automatically.

To compile and run the output:

```bash
npm run build
node dist/index.js
```

### Scripts

| Script  | Command                | Description                              |
| ------- | ---------------------- | ---------------------------------------- |
| `dev`   | `tsx watch src/index.ts` | Run in watch mode                      |
| `build` | `tsc`                  | Type-check and emit JavaScript to `dist/` |

## Project structure

```
.
├── src/
│   └── index.ts   # Client setup, tool, agent, and demo runner
├── dist/          # Compiled output (generated, git-ignored)
├── .env           # OPENROUTER_API_KEY (git-ignored)
├── package.json
└── tsconfig.json
```

## How it works

1. **Provider setup** — an `OpenAI` client is created with the OpenRouter base URL
   and API key, then registered as the default model provider via
   `setDefaultModelProvider(new OpenAIProvider({ openAIClient, useResponses: false }))`.
   This lets the Agents SDK talk to OpenRouter without changing agent code.
2. **Tool** — `getOrderStatusTool` resolves an order ID against the `orders` map
   and returns a status string, or a not-found message.
3. **Agent** — `customerSupportAgent` combines `instructions`, the tool, the
   `openai/gpt-4o-mini` model, and `outputType: SupportResponse` so the final
   output is parsed into the Zod schema.
4. **Run loop** — `main()` calls `run()` for each question in the `question`
   array and logs the question and the agent's final output.

## Customizing

- **Ask something else:** edit the `question` array near the bottom of `src/index.ts`.
- **Change the model:** update `model` on the agent (any OpenRouter model ID).
- **Add orders:** extend the `orders` record, or replace the tool's `execute`
  body with a real API/database call.
- **Add tools:** define another `tool({ name, description, parameters, execute })`
  and add it to the agent's `tools` array.

## Notes

- Order data is hard-coded in memory; there is no persistence or external lookup.
- Tracing is disabled and the Responses API is not used, since OpenRouter exposes
  a chat-completions-compatible endpoint.
- The agent's structured output is validated by Zod before use.

## License

ISC
