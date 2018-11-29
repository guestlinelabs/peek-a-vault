import test from 'ava';
import { createClient } from '../src';

test('throws if you do not pass the options object', async t => {
  await t.throwsAsync(async () => {
    await (createClient as any)();
  });
});

test('throws if you do not pass the urls parameter', async t => {
  await t.throwsAsync(async () => {
    await createClient({} as any);
  });
});

test('throws if the urls parameter is empty', async t => {
  await t.throwsAsync(async () => {
    await createClient({ urls: {} });
  });
});

test('throws if a url passed is not a valid uri specifying the url passed', async t => {
  await t.throwsAsync(
    async () => {
      await createClient({
        urls: {
          NS1: 'http://www.ns1-vault.com',
          NS2: 'notvaliduri',
        },
      });
    },
    { instanceOf: TypeError, message: 'The url notvaliduri is not valid.' }
  );
});

test('throws if the client parameter is not a function', async t => {
  await t.throwsAsync(async () => {
    await createClient({
      urls: {
        client: {} as any,
        NS1: 'http://www.ns1-vault.com',
      },
    });
  });
});
