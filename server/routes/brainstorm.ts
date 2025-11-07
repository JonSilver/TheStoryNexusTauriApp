import { schema } from "../db/client.js";
import { createCrudRouter } from "../lib/crud.js";
import { parseJson } from "../lib/json.js";

export default createCrudRouter({
    table: schema.aiChats,
    name: "AI chat",
    parentKey: "storyId",
    transforms: {
        afterRead: chat => ({
            ...chat,
            messages: parseJson(chat.messages)
        })
    }
});
