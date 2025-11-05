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
