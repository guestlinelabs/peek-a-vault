import { KeyVaultClient } from 'azure-keyvault';
import msRestAzure, { MSIAppServiceTokenCredentials } from 'ms-rest-azure';
import { URL } from 'url';

type SecretValue = string;
type GetSecret<T extends string, S extends string> = (
  namespace: T,
  key: S,
  usingCache?: boolean
) => Promise<SecretValue>;
type KeyVaultUrls<T extends string> = { [K in T]: string };

interface IClientOptions<T extends string> {
  useCache?: boolean;
  client?: () => Promise<KeyVaultClient>;
  urls: KeyVaultUrls<T>;
  useVault?: boolean;
}

function getCacheClient() {
  const cache: Record<string, string | undefined> = {};
  const makeKey = (ns: string, key: string) => `${ns}_${key}`;

  return {
    get(ns: string, key: string) {
      return cache[makeKey(ns, key)];
    },
    set(ns: string, key: string, value: string) {
      cache[makeKey(ns, key)] = value;
    },
  };
}

function validateKeyVaultUrl(url: string) {
  // The KeyVaultClient has a bug where it will crash if you pass an url with a trailing slash
  // https://github.com/Azure/azure-sdk-for-node/issues/2380
  try {
    return new URL(url).href.replace(/\/$/, '');
  } catch (err) {
    throw new TypeError(`The url ${url} is not valid.`);
  }
}

function validateOptions<T extends string>(options: IClientOptions<T>) {
  if (!options || typeof options !== 'object') {
    throw new Error('You must pass an options object to the constructor.');
  }

  const {
    urls,
    client = getVaultClient,
    useVault = Boolean(process.env.APPSETTING_WEBSITE_SITE_NAME),
    useCache = false,
  } = options;

  if (typeof client !== 'function') {
    throw new Error(
      'The client option must be a function that returns the Key Vault client'
    );
  }

  if (!urls || typeof urls !== 'object' || Object.keys(urls).length === 0) {
    throw new Error(
      'urls parameter must be defined and be an object with at least one entry'
    );
  }

  const validatedUrls = Object.entries<string>(urls)
    .map(([ns, url]) => [ns, validateKeyVaultUrl(url)])
    .reduce(
      (acc, [ns, url]) => Object.assign(acc, { [ns]: url }),
      {} as KeyVaultUrls<T>
    );

  return {
    client,
    useCache,
    useVault,
    urls: validatedUrls,
  };
}

const getVaultClient = () => {
  // We shouldn't need to cast to any this, but the typings thinks msiEndpoint is a required
  // object parameter, even though the intellisense documentation says it can be an ENV variable.
  // Fixed it on https://github.com/Azure/azure-sdk-for-node/commit/1183bfeba508de81e4435b540609ad4deeefe007
  // Waiting to be published on a next version, so we can remove this cast
  return msRestAzure
    .loginWithAppServiceMSI({
      resource: 'https://vault.azure.net',
    })
    .then((credentials) => new KeyVaultClient(credentials));
};

const envRetreiver = <T extends string, S extends string>(
  keyVaultUrls: KeyVaultUrls<T>,
  isClientCached: boolean
): GetSecret<T, S> => {
  const cache = getCacheClient();

  return async (namespace, key, useCache = isClientCached) => {
    const cached = cache.get(namespace, key);
    if (useCache && cached) {
      return cached;
    }

    const fullKey = `${namespace.toUpperCase()}_${key}`;
    const secret = process.env[fullKey];

    if (typeof secret === 'undefined') {
      throw new Error(
        `${fullKey} is not defined. Please provide it on your .env file`
      );
    }

    cache.set(namespace, key, secret);

    return secret;
  };
};

const keyVaultRetreiver = <T extends string, S extends string>(
  vaultClient: () => Promise<KeyVaultClient>,
  keyVaultUrls: KeyVaultUrls<T>,
  isClientCached: boolean
): GetSecret<T, S> => {
  const cache = getCacheClient();
  const client = vaultClient();

  return async (namespace, key, useCache = isClientCached) => {
    if (!Object.prototype.hasOwnProperty.call(keyVaultUrls, namespace)) {
      throw new Error(
        `The namespace ${namespace} is not defined on the client.`
      );
    }

    const cached = cache.get(namespace, key);

    if (useCache && cached) {
      return cached;
    }

    // KeyVault only supports  alphanumeric characters and dashes, so we have to convert the
    // underscores to make it work for both ENV variables and this.
    const formattedKey = key.replace(/_/g, '-');
    const keyVaultUrl = keyVaultUrls[namespace];
    const { value } = await (
      await client
    ).getSecret(keyVaultUrl, formattedKey, '');

    if (!value) {
      throw new Error(
        `${formattedKey} does not exist in keyvault with url ${keyVaultUrl}`
      );
    }

    cache.set(namespace, key, value);

    return value;
  };
};

export const createClient = <T extends string, S extends string>(
  options: IClientOptions<T>
) => {
  const { client, urls, useCache, useVault } = validateOptions(options);

  return useVault
    ? keyVaultRetreiver<T, S>(client, urls, useCache)
    : envRetreiver<T, S>(urls, useCache);
};
