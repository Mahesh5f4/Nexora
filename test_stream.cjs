const fs = require('fs');
const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYWhlc2gyMDEwNEBnbWFpbC5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4Njc4NzU4MiwiZXhwIjoxNzg2ODczOTgyfQ.lzhq4-O9RxCLIXOyUpOsKCfEQchYoNxt7dyZWfZPZVM";

async function testStream() {
  console.log("Starting stream at", new Date().toISOString());
  try {
    const res = await fetch("http://localhost:8081/api/ai/conversations/235/messages/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ content: "Analyze: Please tell me a very long story about a brave knight. Output exactly 200 words.", useWebSearch: false })
    });
    
    if (!res.ok) {
      console.log("Error:", res.status, res.statusText);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("Stream ended at", new Date().toISOString());
        break;
      }
      console.log(`[${new Date().toISOString()}] Chunk received (${value.length} bytes):`, decoder.decode(value));
    }
  } catch(e) {
    console.error(e);
  }
}
testStream();
