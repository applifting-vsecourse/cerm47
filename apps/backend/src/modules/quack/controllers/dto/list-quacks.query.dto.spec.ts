import { ValidationPipe } from '@nestjs/common';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

describe('ListQuacksQueryDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (q: string): Promise<unknown> =>
    pipe.transform({ q }, { type: 'query', metatype: ListQuacksQueryDto });

  it.each(['', '   '])('treats blank %j as no search', async (q) => {
    await expect(run(q)).resolves.toEqual({ q: undefined });
  });

  it('trims the term', async () => {
    await expect(run('  duck ')).resolves.toEqual({ q: 'duck' });
  });

  it('rejects a term shorter than 3 characters', async () => {
    await expect(run('du')).rejects.toThrow();
  });
});
