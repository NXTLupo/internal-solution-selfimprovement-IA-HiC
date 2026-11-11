/**
 * Network guard: no test may reach the Miro API or any other host. Any HTTP(S) request opened from the
 * test process throws, so a test that forgets to mock the Miro client fails instead of calling out.
 * (The CLI integration tests run the CLI as a subprocess; those get a token-less environment instead.)
 */

import http = require('http');
import https = require('https');

const refuse = (what: string) => (): never => {
  throw new Error(`Network access is disabled in tests (${what}). Mock the Miro API client instead.`);
};

jest.spyOn(http, 'request').mockImplementation(refuse('http.request'));
jest.spyOn(http, 'get').mockImplementation(refuse('http.get'));
jest.spyOn(https, 'request').mockImplementation(refuse('https.request'));
jest.spyOn(https, 'get').mockImplementation(refuse('https.get'));
