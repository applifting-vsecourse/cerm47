import { ValidationPipe } from '@nestjs/common';
import { CastVoteDto } from './cast-vote.dto';

describe('CastVoteDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (body: unknown): Promise<unknown> =>
    pipe.transform(body, { type: 'body', metatype: CastVoteDto });

  it('accepts an option id', async () => {
    await expect(run({ optionId: 'o1' })).resolves.toEqual({ optionId: 'o1' });
  });

  it.each([
    {},
    { optionId: '' },
    { optionId: 7 },
    { optionId: 'o1', userId: 'u2' },
  ])('rejects %j', async (body) => {
    await expect(run(body)).rejects.toThrow();
  });
});
