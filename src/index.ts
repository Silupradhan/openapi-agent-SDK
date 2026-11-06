import OpenAI from "openai";
import {Agent, run, setDefaultModelProvider, setTracingDisabled, tool} from "@openai/agents";
import {OpenAIProvider, setOpenAIAPI} from "@openai/agents-openai";
import * as dotenv from "dotenv";
import { z } from "zod";
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

const SupportResponse = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    needsHumanSupport : z.boolean(),
})

const orders : Record<string, string> ={
    ORDER123: "Your order has been shipped and is expected to arrive in 3-5 business days.",
    ORDER456: "Your order is being processed and will be shipped soon.",
    ORDER789: "Your order has been delivered. Please check your mailbox.",
}

const getOrderStatusTool = tool({
    name : "get_Order_Status",
    description : "Get the status of a customer's order based on the order ID provided.",
    parameters : z.object({
        orderId : z.string()
    }),
    execute({orderId}){
        console.log(`Fetching status for order ID: ${orderId}`);
        const status = orders[orderId];
        if (status) {
            return `Status for order ${orderId}: ${status}`;
        } else {
            return `Order ID ${orderId} not found. Please check the order ID and try again.`;
        }
        
    }
})

const customerSupportAgent = new Agent({
    name: "Customer Support Agent",
    instructions: `You are a friendly customer support agent.
Help customers with order inquiries, shipping, and returns questions.
When a customer mentions an order ID, always call get_Order_Status with the exact order ID before answering.
Use the tool result as the source of truth. Do not invent order details.
For an unknown order ID, clearly tell the customer that the order was not found and ask them to verify the ID.
Set needsHumanSupport to true only when the customer asks for a human or the request cannot be resolved with the available information.
Keep the message short, clear, and helpful.`,
    model: "openai/gpt-4o-mini",
    tools : [getOrderStatusTool],
    outputType: SupportResponse,

})

const question = [
    'where is my order ORDER123?',
    'can you check order ORDER999?',
]

async function main() {
    // const result = await run(customerSupportAgent, "Hello! I have a question about my recent order. Can you help me?")
    // console.log("Agent Response:", result.finalOutput);
    for (const q of question) {
        const result = await run(customerSupportAgent, q);
        console.log(`Question: ${q}`);
        console.log("Agent Response:", result.finalOutput);
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to run the customer support agent:", message);
    process.exitCode = 1;
});