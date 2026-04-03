// Import the Pinecone library
const{ Pinecone } = require('@pinecone-database/pinecone');

// Initialize a Pinecone client with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Create a dense index with integrated embedding

const cohortChatGptIndex = pc.index({name:'cohort-chat-gpt'})
const DELETE_BATCH_SIZE = 100;

async function createMemory({vectors,metadata,messageId}){


    await cohortChatGptIndex.upsert({
        records: [{
            id: String(messageId),
            values: vectors,
            metadata
        }]
    })
}

async function queryMemory({ queryVector,limit=5, metadata})
{
    const data = await cohortChatGptIndex.query({
        vector:queryVector,
        topK:limit,
        filter: metadata? metadata :undefined,
        includeMetadata: true
    })
    return data.matches;
}

async function deleteMemoryByMessageIds(messageIds = []) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return;
    }

    const normalizedIds = messageIds
        .map((id) => String(id || '').trim())
        .filter(Boolean);

    if (normalizedIds.length === 0) {
        return;
    }

    for (let index = 0; index < normalizedIds.length; index += DELETE_BATCH_SIZE) {
        const batch = normalizedIds.slice(index, index + DELETE_BATCH_SIZE);
        await cohortChatGptIndex.deleteMany(batch);
    }
}

module.exports ={createMemory,queryMemory,deleteMemoryByMessageIds}; 