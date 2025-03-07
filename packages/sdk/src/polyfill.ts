let undiciFetch, UndiciHeaders, UndiciRequest, UndiciResponse;

if (typeof process !== 'undefined' && process.versions?.node) {
  // Only import undici in Node.js environment
  const undici = require('undici');
  undiciFetch = undici.fetch;
  UndiciHeaders = undici.Headers;
  UndiciRequest = undici.Request;
  UndiciResponse = undici.Response;

  if (!globalThis.fetch) {
    globalThis.fetch = undiciFetch as unknown as typeof globalThis.fetch;
    globalThis.Headers = UndiciHeaders as unknown as typeof globalThis.Headers;
    globalThis.Request = UndiciRequest as unknown as typeof globalThis.Request;
    globalThis.Response = UndiciResponse as unknown as typeof globalThis.Response;
  }
}

export {
  undiciFetch as fetch,
  UndiciHeaders as Headers,
  UndiciRequest as Request,
  UndiciResponse as Response
};
