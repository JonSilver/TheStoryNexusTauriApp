import { schema } from '../db/client';
import { createCrudRouter } from '../lib/crud';

export default createCrudRouter({
  table: schema.notes,
  name: 'Note',
  parentKey: 'storyId',
});
