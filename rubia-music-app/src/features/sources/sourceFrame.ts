export const createSourceDocument = (sourceScript: string) => {
  const encoded = btoa(unescape(encodeURIComponent(sourceScript)))
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'">
<script>(() => {
  const handlers = {}; const callbacks = new Map(); let sequence = 0;
  const post = (type, data) => parent.postMessage({ channel: 'rubia-source', type, data }, '*');
  window.lx = {
    EVENT_NAMES: { request: 'request', inited: 'inited', updateAlert: 'updateAlert' }, version: '2.0.0', env: 'desktop', currentScriptInfo: {},
    on(name, handler) { handlers[name] = handler; return Promise.resolve(); }, send(name, data) { post(name, data); return Promise.resolve(); },
    request(url, options = {}, callback) { const id = 'http_' + (++sequence); callbacks.set(id, callback); post('http-request', { id, url, options }); return () => callbacks.delete(id); },
    utils: { buffer: { from(value) { return typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value); }, bufToString(value) { return new TextDecoder().decode(value); } }, crypto: {}, zlib: {} }
  };
  addEventListener('message', async ({ data }) => {
    if (data?.channel !== 'rubia-host') return;
    if (data.type === 'http-response') { const cb = callbacks.get(data.data.id); if (!cb) return; callbacks.delete(data.data.id); if (data.data.error) cb(new Error(data.data.error), null, null); else { const response = data.data.response; try { response.body = JSON.parse(response.body); } catch (_) {} cb(null, response, response.body); } }
    if (data.type === 'source-request') { const { id, request } = data.data; try { if (!handlers.request) throw new Error('Request event is not defined'); post('source-response', { id, result: await handlers.request(request) }); } catch (error) { post('source-response', { id, error: error?.message || String(error) }); } }
  });
  try { (0, eval)(decodeURIComponent(escape(atob('${encoded}')))); } catch (error) { post('init-error', { message: error?.message || String(error) }); }
})();<\/script>`
}
