import { ValidationPipe } from '@nestjs/common';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

describe('ListQuacksQueryDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const runQuery = (query: Record<string, string>): Promise<unknown> =>
    pipe.transform(query, { type: 'query', metatype: ListQuacksQueryDto });
  const run = (q: string): Promise<unknown> => runQuery({ q });

  it.each(['', '   '])('treats blank %j as no search', async (q) => {
    await expect(run(q)).resolves.toEqual({ q: undefined });
  });

  it('trims the term', async () => {
    await expect(run('  duck ')).resolves.toEqual({ q: 'duck' });
  });

  it('rejects a term shorter than 3 characters', async () => {
    await expect(run('du')).rejects.toThrow();
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses mine=%s', async (mine, expected) => {
    await expect(runQuery({ mine })).resolves.toEqual({ mine: expected });
  });

  it('leaves mine unset when absent', async () => {
    await expect(runQuery({})).resolves.toEqual({});
  });

  it('rejects a non-boolean mine', async () => {
    await expect(runQuery({ mine: 'yes' })).rejects.toThrow();
  });
});
