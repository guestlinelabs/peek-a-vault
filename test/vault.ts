import test from 'ava';
import { KeyVaultClient } from 'azure-keyvault';
import { createClient } from '../src';

const mockSecretBundle = (value: string) => ({ value });

let mockSecrets: Record<string, Record<string, { value: string }>>;

test.beforeEach(t => {
  mockSecrets = {
    NS1: {
      'KEY-ONE': mockSecretBundle('KV-NS1-VALUE1'),
      'KEY-TWO': mockSecretBundle('KV-NS1-VALUE2'),
    },
    NS2: {
      'KEY-ONE': mockSecretBundle('KV-NS2-VALUE1'),
      'KEY-THREE': mockSecretBundle('KV-NS2-VALUE3'),
    },
  };
});

const mockKeyVaultClient: Partial<KeyVaultClient> = {
  async getSecret(
    vaultBaseUrl: string,
    secretName: string,
    secretVersion: string
  ) {
    if (vaultBaseUrl.includes('ns1')) {
      return mockSecrets.NS1[secretName];
    } else {
      return mockSecrets.NS2[secretName];
    }
  },
};
const getMockClient = (useCache: boolean) =>
  createClient({
    client: async () => mockKeyVaultClient as KeyVaultClient,
    useCache,
    useVault: true,
    urls: {
      NS1: 'http://www.ns1-vault.com',
      NS2: 'http://www.ns2-vault.com',
    },
  });

const normalClient = getMockClient(false);
const cachedClient = getMockClient(true);

test('gets the key from first namespace', async t => {
  t.is(await normalClient('NS1', 'KEY_ONE'), 'KV-NS1-VALUE1');
  mockSecrets.NS1['KEY-ONE'] = mockSecretBundle('KV-NS1-NEWVALUE1');
  t.is(await normalClient('NS1', 'KEY_ONE'), 'KV-NS1-NEWVALUE1');
});

test('gets same key even if it changes when the client is cached', async t => {
  t.is(await cachedClient('NS1', 'KEY_ONE'), 'KV-NS1-VALUE1');
  mockSecrets.NS1['KEY-ONE'] = mockSecretBundle('KV-NS1-NEWVALUE1');
  t.is(await cachedClient('NS1', 'KEY_ONE'), 'KV-NS1-VALUE1');
});

test('bypasses the cache rule on an individual level', async t => {
  t.is(await cachedClient('NS1', 'KEY_ONE'), 'KV-NS1-VALUE1');
  mockSecrets.NS1['KEY-ONE'] = mockSecretBundle('KV-NS1-NEWVALUE1');
  t.is(await cachedClient('NS1', 'KEY_ONE', false), 'KV-NS1-NEWVALUE1');
});

test('gets the key from second namespace', async t => {
  t.is(await normalClient('NS2', 'KEY_THREE'), 'KV-NS2-VALUE3');
});

test('throws when the namespace does not exist', async t => {
  await t.throwsAsync(async () => {
    await normalClient('NOT_EXISTING_NS' as any, 'NOT_EXISTING');
  });
});

test('throws when the key does not exist', async t => {
  await t.throwsAsync(async () => {
    await normalClient('NS1', 'NOT_EXISTING');
  });
});
