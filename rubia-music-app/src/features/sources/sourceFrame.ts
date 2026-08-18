import cryptoJsBundle from 'crypto-js/crypto-js.js?raw'
import forgeBundle from 'node-forge/dist/forge.min.js?raw'
import pakoBundle from '../../../node_modules/pako/dist/browser/pako.umd.min.js?raw'
import type { MusicSourceRecord } from './useSourceRuntime'

const safeScript = (script: string) => script.replace(/<\/script/gi, '<\\/script')

export const createSourceDocument = (source: MusicSourceRecord, debug = false) => {
  const encoded = btoa(unescape(encodeURIComponent(source.script)))
  const scriptInfo = JSON.stringify({ name: source.name, description: source.description, version: source.version, author: source.author, homepage: source.homepage, rawScript: source.script }).replace(/<\/script/gi, '<\\/script')
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'">
<script>${safeScript(cryptoJsBundle)}<\/script><script>${safeScript(forgeBundle)}<\/script><script>${safeScript(pakoBundle)}<\/script>
<script>(() => {
  const handlers = {}; const callbacks = new Map(); let sequence = 0;
  const post = (type, data) => parent.postMessage({ channel: 'rubia-source', type, data }, '*');
  const debug = ${JSON.stringify(debug)};
  const describe = value => { try { if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }; if (typeof value === 'string') return value; return JSON.parse(JSON.stringify(value)); } catch (_) { return String(value); } };
  if (debug) for (const level of ['debug', 'info', 'warn', 'error']) { const original = console[level].bind(console); console[level] = (...args) => { original(...args); post('source-log', { level, args: args.map(describe) }); }; }
  const toBytes = value => {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (Array.isArray(value)) return new Uint8Array(value);
    if (typeof value === 'string') return new TextEncoder().encode(value);
    if (value?.words) { const out = new Uint8Array(value.sigBytes); for (let i=0;i<value.sigBytes;i++) out[i]=(value.words[i>>>2] >>> (24-(i%4)*8))&255; return out; }
    return new Uint8Array(value || []);
  };
  const toWordArray = value => CryptoJS.lib.WordArray.create(toBytes(value));
  const bytesToBinary = value => Array.from(toBytes(value), byte => String.fromCharCode(byte)).join('');
  const buffer = value => { const bytes = toBytes(value); bytes.toString = format => {
    if (format === 'base64') return btoa(bytesToBinary(bytes));
    if (format === 'hex') return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
    if (format === 'binary' || format === 'latin1') return bytesToBinary(bytes);
    return new TextDecoder().decode(bytes);
  }; return bytes; };
  window.lx = {
    EVENT_NAMES: { request: 'request', inited: 'inited', updateAlert: 'updateAlert' }, version: '2.0.0', env: 'desktop', currentScriptInfo: ${scriptInfo},
    on(name, handler) { handlers[name] = handler; return Promise.resolve(); }, send(name, data) { post(name, data); return Promise.resolve(); },
    request(url, options = {}, callback) { const id = 'http_' + (++sequence); callbacks.set(id, callback); post('http-request', { id, url, options }); return () => { callbacks.delete(id); post('http-cancel', { id }); }; },
    utils: {
      buffer: { from(value, encoding) { if (typeof value === 'string' && encoding === 'base64') return buffer(Uint8Array.from(atob(value), c => c.charCodeAt(0))); if (typeof value === 'string' && encoding === 'hex') return buffer(new Uint8Array(value.match(/.{1,2}/g).map(v => parseInt(v,16)))); return buffer(value); }, bufToString(value, format) { return buffer(value).toString(format); } },
      crypto: {
        aesEncrypt(value, mode, key, iv) { const algorithm = String(mode).split('-').pop().toUpperCase(); const result = CryptoJS.AES.encrypt(toWordArray(value), toWordArray(key), { iv: toWordArray(iv), mode: CryptoJS.mode[algorithm] || CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }); return buffer(result.ciphertext); },
        rsaEncrypt(value, key) { const input = toBytes(value); const padded = new Uint8Array(128); padded.set(input, Math.max(0, 128-input.length)); const publicKey = forge.pki.publicKeyFromPem(key); return buffer(Uint8Array.from(publicKey.encrypt(bytesToBinary(padded), 'RAW'), c => c.charCodeAt(0))); },
        randomBytes(size) { const value = new Uint8Array(size); crypto.getRandomValues(value); return buffer(value); },
        md5(value) { return CryptoJS.MD5(typeof value === 'string' ? value : toWordArray(value)).toString(); }
      },
      zlib: { inflate(value) { return Promise.resolve(buffer(pako.inflate(toBytes(value)))); }, deflate(value) { return Promise.resolve(buffer(pako.deflate(toBytes(value)))); } }
    }
  };
  addEventListener('error', event => post('init-error', { message: event.message || '音源脚本执行失败', stack: event.error?.stack }));
  addEventListener('unhandledrejection', event => { const reason = event.reason; post('init-error', { message: reason?.message || String(reason || '音源初始化失败'), stack: reason?.stack }); });
  addEventListener('message', async ({ data }) => {
    if (data?.channel !== 'rubia-host') return;
    if (data.type === 'http-response') { const cb = callbacks.get(data.data.id); if (!cb) return; callbacks.delete(data.data.id); if (data.data.error) cb(new Error(data.data.error), null, null); else { const response = data.data.response; response.raw = buffer(response.raw); try { response.body = JSON.parse(response.body); } catch (_) {} cb(null, response, response.body); } }
    if (data.type === 'source-request') { const { id, request } = data.data; try { if (!handlers.request) throw new Error('Request event is not defined'); post('source-response', { id, result: await handlers.request(request) }); } catch (error) { post('source-response', { id, error: error?.message || String(error), stack: error?.stack }); } }
  });
  try { (0, eval)(decodeURIComponent(escape(atob('${encoded}')))); } catch (error) { post('init-error', { message: error?.message || String(error) }); }
})();<\/script>`
}
