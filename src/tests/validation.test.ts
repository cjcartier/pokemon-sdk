import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { maybeValidate } from '../core/validation';
import { ValidationError } from '../core/errors';

describe('maybeValidate', () => {
  it('throws ValidationError when schema validation fails (covers lines 43-44)', () => {
    const schema = z.object({ id: z.number() }),
      invalid = { id: 'not-a-number' };

    expect(() => maybeValidate(schema, invalid, true)).toThrow(ValidationError);
  });

  it('returns parsed data when valid and enabled', () => {
    const schema = z.object({ id: z.number() }),
      valid = { id: 123 },
      result = maybeValidate(schema, valid, true);
    expect(result.id).toBe(123);
  });

  it('returns raw data when validation is disabled', () => {
    const schema = z.object({ id: z.number() }),
      invalid = { id: 'not-a-number' },
      result = maybeValidate(schema, invalid, false);
    expect(result).toEqual(invalid);
  });
});
