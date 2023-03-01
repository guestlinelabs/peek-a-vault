import test from 'ava';
import { KeyVaultClient } from 'azure-keyvault';
import { createClient } from '../src';

const mockKeyVaultClient: Partial<KeyVaultClient> = {
  async getSecret(
    vaultBaseUrl: string,
    secretName: string,
    secretVersion: string
  ) {
    return { value: 'secretValue' };
  },
};
const getMockClient = (useCache: boolean) =>
  createClient({
    client: async () => mockKeyVaultClient as KeyVaultClient,
    useCache,
    useVault: false,
    urls: {
      NS1: 'http://www.vault.com',
    },
  });

const normalClient = getMockClient(false);
const cachedClient = getMockClient(true);

test.beforeEach((t) => {
  process.env.NS1_TEST = 'ENV-NS1-VALUE';
});

test('gets the key from env', async (t) => {
  t.is(await normalClient('NS1', 'TEST'), 'ENV-NS1-VALUE');
  process.env.NS1_TEST = 'ENV-NS1-NEWVALUE';
  t.is(await normalClient('NS1', 'TEST'), 'ENV-NS1-NEWVALUE');
});

test('gets same key even if it changes when the client is cached', async (t) => {
  t.is(await cachedClient('NS1', 'TEST'), 'ENV-NS1-VALUE');
  process.env.NS1_TEST = 'ENV-NS1-NEWVALUE';
  t.is(await cachedClient('NS1', 'TEST'), 'ENV-NS1-VALUE');
});

test('bypasses the cache rule on an individual level', async (t) => {
  t.is(await cachedClient('NS1', 'TEST'), 'ENV-NS1-VALUE');
  process.env.NS1_TEST = 'ENV-NS1-NEWVALUE';
  t.is(await cachedClient('NS1', 'TEST', false), 'ENV-NS1-NEWVALUE');
});

test('throws when the key does not exist', async (t) => {
  await t.throwsAsync(async () => {
    await normalClient('NS1', 'NOT_EXISTING');
  });
});
