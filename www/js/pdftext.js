/** 从文字型 PDF 里抽出可读文本。扫描件抽不出来，应改发照片。 */
const PdfText = (() => {
  function latin1(bytes) {
    let s = '';
    const n = bytes.length;
    for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') return null;
    try {
      const ds = new DecompressionStream('deflate');
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) {
      return null;
    }
  }

  function unescapePdf(s) {
    return s.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '', t: ' ', b: '', f: '', '(': '(', ')': ')', '\\': '\\' }[c] || c))
      .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  }

  function pull(text) {
    const bits = [];
    const tj = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
    let m;
    while ((m = tj.exec(text))) bits.push(unescapePdf(m[1]));
    const TJ = /\[([\s\S]*?)\]\s*TJ/g;
    while ((m = TJ.exec(text))) {
      const inner = m[1];
      const parts = inner.match(/\(((?:\\.|[^\\)])*)\)/g) || [];
      bits.push(parts.map((p) => unescapePdf(p.slice(1, -1))).join(''));
    }
    return bits.join(' ').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  }

  async function extract(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const raw = latin1(bytes);
    const parts = [];
    const re = /stream\r?\n/g;
    let m;
    while ((m = re.exec(raw)) && parts.join('\n').length < 16000) {
      const start = m.index + m[0].length;
      const end = raw.indexOf('endstream', start);
      if (end < 0) break;
      const slice = bytes.subarray(start, end);
      const inflated = await inflate(slice);
      const text = pull(latin1(inflated || slice));
      if (text) parts.push(text);
    }
    const joined = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000);
    const cjk = (joined.match(/[\u4e00-\u9fff]/g) || []).length;
    const readable = cjk > 8 || /[A-Za-z]{4,}/.test(joined);
    return { text: readable ? joined : '', rawLength: joined.length };
  }

  return { extract };
})();
