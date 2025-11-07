import { schema } from "../db/client.js";
import { createCrudRouter } from "../lib/crud.js";
import { parseJson } from "../lib/json.js";

export default createCrudRouter({
    table: schema.chapters,
    name: "Chapter",
    parentKey: "storyId",
    transforms: {
        afterRead: ch => ({
            ...ch,
            outline: parseJson(ch.outline),
            notes: parseJson(ch.notes)
        })
    }
});
