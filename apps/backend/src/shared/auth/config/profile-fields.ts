// Server-side validation for the profile fields BetterAuth stores on the user.
// BetterAuth accepts any Standard Schema; the backend has no schema library of
// its own, so these are the smallest hand-written ones that satisfy the spec.
type Issue = { message: string };
type Result<T> = { value: T } | { issues: Issue[] };
type StandardSchema<T> = {
  '~standard': {
    version: 1;
    vendor: string;
    validate: (value: unknown) => Result<T>;
  };
};

export const BIO_MAX_LENGTH = 160;
export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

const fail = (message: string): { issues: Issue[] } => ({
  issues: [{ message }],
});

const schema = <T>(
  validate: (value: unknown) => Result<T>,
): StandardSchema<T> => ({
  '~standard': { version: 1, vendor: 'quacker', validate },
});

/** Optional free text. Blank (or null) means "no bio" and is stored as null. */
export const bioSchema = schema<string | null>((value) => {
  if (value === null) return { value: null };
  if (typeof value !== 'string') return fail('Bio must be text');
  const bio = value.trim();
  if (bio.length > BIO_MAX_LENGTH) {
    return fail(`Bio can be at most ${BIO_MAX_LENGTH} characters`);
  }
  return { value: bio === '' ? null : bio };
});

/** `null` (or blank) means "no default mood". */
export const defaultMoodSchema = schema<string | null>((value) => {
  if (value === null || value === '') return { value: null };
  if (!(QUACK_MOODS as readonly unknown[]).includes(value)) {
    return fail(`Mood must be one of: ${QUACK_MOODS.join(', ')}`);
  }
  return { value: value as string };
});
