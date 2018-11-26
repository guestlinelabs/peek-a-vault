import test from 'ava';
import { KeyVaultClient } from 'azure-keyvault';
import { createClient } from '../src';

const mockSecretBundle = (value: string) => ({ value });

const mockSecrets: Record<string, Record<string, { value: string }>> = {
  NS1: {
    'KEY-ONE': mockSecretBundle('KV-NS1-VALUE1'),
    'KEY-TWO': mockSecretBundle('KV-NS1-VALUE2'),
  },
  NS2: {
    'KEY-ONE': mockSecretBundle('KV-NS2-VALUE1'),
    'KEY-THREE': mockSecretBundle('KV-NS2-VALUE3'),
  },
};

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
const keyClient = createClient({
  client: async () => mockKeyVaultClient as KeyVaultClient,
  useVault: true,
  urls: {
    NS1: 'http://www.ns1-vault.com',
    NS2: 'http://www.ns2-vault.com',
  },
});

test('gets the key from first namespace', async t => {
  const bar = Promise.resolve('bar');
  t.is(await keyClient('NS1', 'KEY_ONE'), 'KV-NS1-VALUE1');
});

test('gets the key from second namespace', async t => {
  const bar = Promise.resolve('bar');
  t.is(await keyClient('NS2', 'KEY_THREE'), 'KV-NS2-VALUE3');
});

test('throws when the namespace does not exist', async t => {
  await t.throwsAsync(async () => {
    await keyClient('NOT_EXISTING_NS' as any, 'NOT_EXISTING');
  });
});

test('throws when the key does not exist', async t => {
  await t.throwsAsync(async () => {
    await keyClient('NS1', 'NOT_EXISTING');
  });
});
