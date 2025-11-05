import { schema } from '../db/client';
import { createCrudRouter } from '../lib/crud';
import { parseJson } from '../lib/json';

export default createCrudRouter({
  table: schema.aiChats,
  name: 'AI chat',
  parentKey: 'storyId',
  transforms: {
    afterRead: (chat) => ({
      ...chat,
      messages: parseJson(chat.messages),
    }),
  },
});
