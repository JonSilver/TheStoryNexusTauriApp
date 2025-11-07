import { schema } from "../db/client.js";
import { createCrudRouter } from "../lib/crud.js";
import { parseJson } from "../lib/json.js";

export default createCrudRouter({
    table: schema.sceneBeats,
    name: "Scene beat",
    parentKey: "chapterId",
    transforms: {
        afterRead: sb => ({
            ...sb,
            metadata: parseJson(sb.metadata)
        })
    }
});
