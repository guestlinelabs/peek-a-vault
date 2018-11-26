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
const envClient = createClient({
  client: async () => mockKeyVaultClient as KeyVaultClient,
  useVault: false,
  urls: {
    NS1: 'http://www.vault.com',
  },
});

process.env.NS1_TEST = 'ENV-NS1-VALUE';

test('gets the key from env', async t => {
  const bar = Promise.resolve('bar');
  t.is(await envClient('NS1', 'TEST'), 'ENV-NS1-VALUE');
});

test('throws when the key does not exist', async t => {
  await t.throwsAsync(async () => {
    await envClient('NS1', 'NOT_EXISTING');
  });
});
