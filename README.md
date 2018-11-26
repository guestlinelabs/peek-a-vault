# peek-a-vault

[![npm version](https://img.shields.io/npm/v/@guestlinelabs/peek-a-vault.svg?style=flat-square)](https://www.npmjs.org/package/@guestlinelabs/peek-a-vault)

[![npm downloads](https://img.shields.io/npm/dm/@guestlinelabs/peek-a-vault.svg?style=flat-square)](http://npm-stat.com/charts.html?package=@guestlinelabs/peek-a-vault)

A small library to retreive secrets from different [Key Vaults](https://azure.microsoft.com/en-gb/services/key-vault/) on App Services using [MSI](https://docs.microsoft.com/en-gb/azure/app-service/app-service-managed-service-identity) authentication.

It will provide a fallback to read secrets from environment variables when working on local.

## Installation

```
npm install @guestlinelabs/peek-a-vault
```

## Support

Only Node 8+.

## Example

The library will return a function that you use to initialise the client, given a set of Key Vault namespaces.

```typescript
import { createClient } from '@guestlinelabs/peek-a-vault';

// or const getSecret = createClient<'NS1' | 'NS2', 'STORAGE_KEY' | 'SENDGRID_KEY'>({
const getSecret = createClient({
  // [OPTIONAL] A function that will return a promise with your own Key Vault client. By default it will use a KV client authenticating with MSI.
  client: async () => keyVaultClient;
  // [OPTIONAL] To use key vault client or read from process.env.
  useVault: Boolean(process.env.APPSETTING_WEBSITE_SITE_NAME),
  // List of namespaces with the KeyVault url associated.
  urls: {
    NS1: 'https://ns1.vault.azure.net',
    NS2: 'https://ns1.vault.azure.net',
  },
});

async function main() {
  // In local environment it will retrieve NS1_STORAGE_KEY from process.env variables
  // Inside a WebApp it will retrieve STORAGE-KEY from the NS1 keyvault
  const storageClient = new StorageClient(
    await getSecret('NS1', 'STORAGE_KEY')
  );
  // In local environment it will retrieve NS2_SENDGRID_KEY from process.env variables
  // Inside a WebApp it will retrieve SENDGRID-KEY from the NS1 keyvault
  const emailClient = new EmailClient(await getSecret('NS2', 'SENDGRID_KEY'));
}
```
