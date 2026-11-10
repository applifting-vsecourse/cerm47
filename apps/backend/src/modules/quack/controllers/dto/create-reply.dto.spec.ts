import { ValidationPipe } from '@nestjs/common';
import { CreateReplyDto } from './create-reply.dto';

describe('CreateReplyDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (body: unknown): Promise<unknown> =>
    pipe.transform(body, { type: 'body', metatype: CreateReplyDto });

  it('accepts text and a mood', async () => {
    await expect(run({ text: 'Agreed', mood: 'happy' })).resolves.toEqual({
      text: 'Agreed',
      mood: 'happy',
    });
  });

  it('accepts text without a mood', async () => {
    await expect(run({ text: 'Agreed' })).resolves.toEqual({ text: 'Agreed' });
  });

  it('trims the text', async () => {
    await expect(run({ text: '  Agreed \n' })).resolves.toMatchObject({
      text: 'Agreed',
    });
  });

  it.each(['', '   ', '\n\t'])('rejects blank text %j', async (text) => {
    await expect(run({ text })).rejects.toThrow();
  });

  it('accepts 280 characters and rejects 281', async () => {
    await expect(run({ text: 'a'.repeat(280) })).resolves.toBeDefined();
    await expect(run({ text: 'a'.repeat(281) })).rejects.toThrow();
  });

  it('rejects an unknown mood', async () => {
    await expect(run({ text: 'Agreed', mood: 'furious' })).rejects.toThrow();
  });

  it.each([
    ['poll', { options: ['Pizza', 'Sushi'] }],
    ['quackId', 'someone-elses-quack'],
    ['userId', 'someone-else'],
  ])('rejects the extra field %s', async (field, value) => {
    await expect(run({ text: 'Agreed', [field]: value })).rejects.toThrow();
  });
});
