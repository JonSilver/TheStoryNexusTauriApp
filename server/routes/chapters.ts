import { schema } from '../db/client';
import { createCrudRouter } from '../lib/crud';
import { parseJson } from '../lib/json';

export default createCrudRouter({
  table: schema.chapters,
  name: 'Chapter',
  parentKey: 'storyId',
  transforms: {
    afterRead: (ch) => ({
      ...ch,
      outline: parseJson(ch.outline),
      notes: parseJson(ch.notes),
    }),
  },
});
