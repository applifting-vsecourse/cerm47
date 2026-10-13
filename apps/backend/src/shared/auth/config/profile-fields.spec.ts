import { BIO_MAX_LENGTH, bioSchema, defaultMoodSchema } from './profile-fields';

const run = (
  schema: typeof bioSchema,
  value: unknown,
): { value: unknown } | { issues: { message: string }[] } =>
  schema['~standard'].validate(value);

describe('bioSchema', () => {
  it('accepts a bio at the limit', () => {
    const bio = 'a'.repeat(BIO_MAX_LENGTH);
    expect(run(bioSchema, bio)).toEqual({ value: bio });
  });

  it('rejects a bio over the limit', () => {
    expect(run(bioSchema, 'a'.repeat(BIO_MAX_LENGTH + 1))).toHaveProperty(
      'issues',
    );
  });

  it('stores a blank bio as null', () => {
    expect(run(bioSchema, '   ')).toEqual({ value: null });
    expect(run(bioSchema, null)).toEqual({ value: null });
  });

  it('rejects non-text', () => {
    expect(run(bioSchema, 42)).toHaveProperty('issues');
  });
});

describe('defaultMoodSchema', () => {
  it.each(['happy', 'sad', 'angry', 'silly'])('accepts %s', (mood) => {
    expect(run(defaultMoodSchema, mood)).toEqual({ value: mood });
  });

  it('treats null and blank as no mood', () => {
    expect(run(defaultMoodSchema, null)).toEqual({ value: null });
    expect(run(defaultMoodSchema, '')).toEqual({ value: null });
  });

  it('rejects an unknown mood', () => {
    expect(run(defaultMoodSchema, 'furious')).toHaveProperty('issues');
  });
});
