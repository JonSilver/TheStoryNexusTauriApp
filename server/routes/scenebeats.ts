import { schema } from '../db/client';
import { createCrudRouter } from '../lib/crud';
import { parseJson } from '../lib/json';

export default createCrudRouter({
  table: schema.sceneBeats,
  name: 'Scene beat',
  parentKey: 'chapterId',
  transforms: {
    afterRead: (sb) => ({
      ...sb,
      metadata: parseJson(sb.metadata),
    }),
  },
});
