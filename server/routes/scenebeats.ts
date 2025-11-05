import { schema } from '../db/client';
import { createCrudRouter } from '../lib/crud';

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

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
