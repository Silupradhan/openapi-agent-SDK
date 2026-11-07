import OpenAI from "openai";
import {Agent, run, setDefaultModelProvider, setTracingDisabled, tool, MemorySession} from "@openai/agents";
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

// const getReturnPolicyTool = tool({
//     name : "get_Return_Policy",
//     description : "Get the return policy for a specific product based on the product ID provided.",
//     parameters : z.object({
//         productId : z.string()
//     }),
//     execute({productId}){
//         console.log(`Fetching return policy for product ID: ${productId}`);
//         // For demonstration, we will return a static return policy.
//         // In a real application, you would fetch this information from a database or API.
//         return `Return policy for product ${productId}: You can return the product within 30 days of purchase with a valid receipt.`;
//     }
// })

const orderAgents = new Agent({
    name: "Order Agent",
    instructions : "Help with order status. Call get_Order_Status when the customer gives an order ID. Use earlier message in the conversation when they refer to 'my order' or 'that order'.Do not invent status.",
    model : "openai/gpt-4o-mini",
    tools : [getOrderStatusTool],
})

const orderAgent = new Agent({
    name: "Order Agent",
    handoffDescription : "order tracking and status inquiries",
    instructions : "Help with order status. call get_Order_Status when the coustomer give an order ID. Do not invent status.",
    model: "openai/gpt-4o-mini",
    tools : [getOrderStatusTool],
})

// const returnAgent = new Agent({
//     name: "Return Agent",
//     handoffDescription : "return, refaund and returns policy inquiries",
//     instructions : "Help with return policy. call get_Return_Policy when the coustomer give a product ID. Do not invent return policy details.",
//     model: "openai/gpt-4o-mini",
//     tools : [getReturnPolicyTool],
// })

// const triageAgent = Agent.create({
//     name: "Triage Agent",
//     instructions: "You receive customer inquiries and hand off to the right specialized agent. Order or shipping inquiries go to the Order Agent. Return and refund inquiries go to the Return Agent. Do not answer those topics yourself-hand off to the right agent. If the inquiry is not related to order or return, respond with 'I'm sorry, I can only assist with order and return inquiries. Please contact our support team for further assistance.'",
//     model: "openai/gpt-4o-mini",
//     handoffs : [orderAgent, returnAgent],
// })

// const customerSupportAgent = new Agent({
//     name: "Customer Support Agent",
//     instructions: `You are a friendly customer support agent.
// Help customers with order inquiries, shipping, and returns questions.
// When a customer mentions an order ID, always call get_Order_Status with the exact order ID before answering.
// Use the tool result as the source of truth. Do not invent order details.
// For an unknown order ID, clearly tell the customer that the order was not found and ask them to verify the ID.
// Set needsHumanSupport to true only when the customer asks for a human or the request cannot be resolved with the available information.
// Keep the message short, clear, and helpful.`,
//     model: "openai/gpt-4o-mini",
//     tools : [getOrderStatusTool],
//     outputType: SupportResponse,

// })

// triageAgent.on("agent_handoff",(_ctx, nextAgent)=>{
//    console.log(`Handoff to agent: ${nextAgent.name}`); 
// });

// const question = [
//     'where is my order ORDER123?',
//     'what is your return policy?',
// ]

// async function main() {
//     // const result = await run(customerSupportAgent, "Hello! I have a question about my recent order. Can you help me?")
//     // console.log("Agent Response:", result.finalOutput);
//     for (const q of question) {
//         const result = await run(triageAgent, q);
//         console.log(`Question: ${q}`);
//         console.log("Agent Response:", result.finalOutput);
//     }
// }

// main().catch((error: unknown) => {
//     const message = error instanceof Error ? error.message : JSON.stringify(error);
//     console.error("Failed to run the customer support agent:", message);
//     process.exitCode = 1;
// });

const turns = [
    "where is my order ORDER123?",
    "what order id did i just ask?"
]

async function main() {
    const session = new MemorySession();

    for (const turn of turns) {
        const result = await run(orderAgents, turn, {session});
        console.log(`Turn: ${turn}`);
        console.log("Agent Response:", result.finalOutput);
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to run the order agent:", message);
    process.exitCode = 1;
});