import OpenAI from "openai";
import {Agent, run, setDefaultModelProvider, setTracingDisabled} from "@openai/agents";
import {OpenAIProvider, setOpenAIAPI} from "@openai/agents-openai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY?.trim()

if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in the environment variables.");
}

const openRouterClient = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
});

setOpenAIAPI("chat_completions");
setTracingDisabled(true);
setDefaultModelProvider(new OpenAIProvider({
    openAIClient: openRouterClient,
    useResponses: false,
}));

const customerSupportAgent = new Agent({
    name: "Customer Support Agent",
    instructions: "You are a friendly customer support agent. Help customers with order inquiries, shipping and returns questions. Keep replies short, clear and helpful. ",
    model: "nvidia/nemotron-3.5-lightning:free",
})

async function main() {
    const result = await run(customerSupportAgent, "Hello! I have a question about my recent order. Can you help me?")
    console.log("Agent Response:", result.finalOutput);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to run the customer support agent:", message);
    process.exitCode = 1;
});