import type { z } from 'zod';

/**
 * Creates a new entity with common fields (id, createdAt) and validates it with Zod.
 * This is the most common pattern across all CRUD stores - eliminating repetitive
 * entity creation and validation boilerplate.
 *
 * @param entityData - Partial entity data without id/createdAt
 * @param schema - Zod schema for validation
 * @param additionalFields - Additional fields to merge (e.g., { updatedAt: new Date() })
 * @returns Complete validated entity
 * @throws Error with validation message if schema validation fails
 *
 * @example
 * ```ts
 * const note = createValidatedEntity(
 *   { storyId, title, content, type },
 *   noteSchema,
 *   { updatedAt: new Date() }
 * );
 * await notesApi.create(note);
 * ```
 */
export const createValidatedEntity = <T extends z.ZodTypeAny>(
  entityData: Record<string, unknown>,
  schema: T,
  additionalFields?: Record<string, unknown>
): z.infer<T> => {
  const entityWithDefaults = {
    ...entityData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    ...additionalFields,
  };

  const result = schema.safeParse(entityWithDefaults);

  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  return result.data;
};

/**
 * Validates a partial entity update with Zod.
 * Common pattern for update operations across stores.
 *
 * @param data - Partial update data
 * @param schema - Zod object schema (will be made partial automatically)
 * @returns Validated data
 * @throws Error with validation message if schema validation fails
 *
 * @example
 * ```ts
 * const validatedUpdate = validatePartialUpdate(
 *   { title: 'New Title' },
 *   noteSchema
 * );
 * await notesApi.update(noteId, validatedUpdate);
 * ```
 */
export const validatePartialUpdate = <T extends z.ZodObject<any>>(
  data: Record<string, unknown>,
  schema: T
): Partial<z.infer<T>> => {
  const result = schema.partial().safeParse(data);

  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  return result.data;
};
