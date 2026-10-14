import { ValidationPipe } from '@nestjs/common';
import { CreateQuackDto } from './create-quack.dto';

describe('CreateQuackDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const run = (body: unknown): Promise<unknown> =>
    pipe.transform(body, { type: 'body', metatype: CreateQuackDto });
  const withOptions = (options: unknown): object => ({
    text: 'Lunch?',
    poll: { options },
  });

  it('accepts a quack without a poll', async () => {
    await expect(run({ text: 'Lunch?' })).resolves.toEqual({ text: 'Lunch?' });
  });

  it('accepts a poll with 2 to 6 options', async () => {
    await expect(run(withOptions(['Pizza', 'Sushi']))).resolves.toMatchObject({
      poll: { options: ['Pizza', 'Sushi'] },
    });
    await expect(
      run(withOptions(['1', '2', '3', '4', '5', '6'])),
    ).resolves.toBeDefined();
  });

  it('trims the options', async () => {
    await expect(
      run(withOptions(['  Pizza ', 'Sushi'])),
    ).resolves.toMatchObject({
      poll: { options: ['Pizza', 'Sushi'] },
    });
  });

  it('rejects a poll with fewer than 2 options', async () => {
    await expect(run(withOptions(['Pizza']))).rejects.toThrow();
    await expect(run(withOptions([]))).rejects.toThrow();
  });

  it('rejects a poll with more than 6 options', async () => {
    await expect(
      run(withOptions(['1', '2', '3', '4', '5', '6', '7'])),
    ).rejects.toThrow();
  });

  it('rejects a blank option', async () => {
    await expect(run(withOptions(['Pizza', '   ']))).rejects.toThrow();
    await expect(run(withOptions(['Pizza', '']))).rejects.toThrow();
  });

  it('rejects an option longer than 80 characters', async () => {
    await expect(run(withOptions(['Pizza', 'x'.repeat(81)]))).rejects.toThrow();
    await expect(
      run(withOptions(['Pizza', 'x'.repeat(80)])),
    ).resolves.toBeDefined();
  });

  it('rejects duplicate options ignoring case and surrounding spaces', async () => {
    await expect(run(withOptions(['Pizza', ' pizza ']))).rejects.toThrow();
  });

  it('rejects options that are not strings', async () => {
    await expect(run(withOptions(['Pizza', 42]))).rejects.toThrow();
    await expect(run(withOptions('Pizza'))).rejects.toThrow();
  });

  it('rejects unknown fields on the poll', async () => {
    await expect(
      run({ text: 'Lunch?', poll: { options: ['a', 'b'], closed: true } }),
    ).rejects.toThrow();
  });
});
