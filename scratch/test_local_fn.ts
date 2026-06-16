import { getFoodItems } from "../src/lib/db.functions";

async function test() {
  try {
    console.log("Calling getFoodItems server function with 'all'...");
    // In TanStack Start, server functions can be executed directly as functions
    // We pass the argument wrapped in { data } to simulate client call if executed in client context,
    // or call the handler directly. Let's inspect getFoodItems.
    console.log("getFoodItems type:", typeof getFoodItems);
    
    // Server functions can be executed by invoking them directly
    const result = await getFoodItems("all");
    console.log("Result for 'all':", result ? `${result.length} items` : "null");
    
    const resultUndefined = await getFoodItems();
    console.log("Result for undefined:", resultUndefined ? `${resultUndefined.length} items` : "null");
  } catch (err) {
    console.error("Error running test:", err);
  }
}

test();
