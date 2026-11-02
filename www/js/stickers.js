/**
 * 奶蛙 / 大肥鱼表情贴纸。回复末尾可用 [[emo:id]] 挂一张。
 */
const Stickers = (() => {
  const PACKS = {
    fish: [
      { id: 'hug', label: '摸鱼', file: 'assets/stickers/fish/hug.png' },
      { id: 'pout', label: '傲娇', file: 'assets/stickers/fish/pout.png' },
      { id: 'eat', label: '吃饭', file: 'assets/stickers/fish/eat.png' },
      { id: 'comfort', label: '歇会儿', file: 'assets/stickers/fish/comfort.png' },
    ],
    naiwa: [
      { id: 'think', label: '想想', file: 'assets/stickers/naiwa/think.png' },
      { id: 'happy', label: '开心', file: 'assets/stickers/naiwa/happy.png' },
      { id: 'shy', label: '害羞', file: 'assets/stickers/naiwa/shy.png' },
      { id: 'sleepy', label: '困了', file: 'assets/stickers/naiwa/sleepy.png' },
    ],
  };

  function list(pack) { return PACKS[pack] || []; }

  function byId(pack, id) {
    return list(pack).find((s) => s.id === id) || null;
  }

  function guess(pack, text) {
    const t = String(text || '');
    if (!t) return '';
    if (pack === 'fish') {
      if (/吃|饭|鱼干|蛋糕|饿|投喂|白饭/.test(t)) return 'eat';
      if (/才不是|哼|烦|讨厌|生气|大肥鱼/.test(t)) return 'pout';
      if (/累|歇|辛苦|没事|抱抱|加油|陪/.test(t)) return 'comfort';
      if (/摸鱼|哈哈|开心|好耶|在吗/.test(t)) return 'hug';
    }
    if (pack === 'naiwa') {
      if (/困|睡|晚安/.test(t)) return 'sleepy';
      if (/害羞|夸|喜欢|嘿嘿/.test(t)) return 'shy';
      if (/哈哈|开心|好耶|笑/.test(t)) return 'happy';
      if (/想|嗯\?|为什么|怎么/.test(t)) return 'think';
    }
    return '';
  }

  function take(pack, text) {
    const raw = String(text || '');
    const m = raw.match(/\[\[emo:([a-z]+)\]\]/i);
    const content = raw.replace(/\s*\[\[emo:[a-z]+\]\]\s*/ig, ' ').replace(/\s+/g, ' ').trim();
    let id = m ? m[1].toLowerCase() : '';
    if (!byId(pack, id)) id = guess(pack, content);
    const item = byId(pack, id);
    return { content, sticker: item ? item.file : '' };
  }

  const PROMPT = {
    fish: '情绪明显时，在回复最后单独一行加一个表情标记，只能一个：[[emo:hug]] 摸鱼抱抱、[[emo:pout]] 傲娇、[[emo:eat]] 吃饭、[[emo:comfort]] 安慰。平淡就不要加，不要解释标记。',
    naiwa: '情绪明显时，在回复最后单独一行加一个表情标记，只能一个：[[emo:think]] 思考、[[emo:happy]] 开心、[[emo:shy]] 害羞、[[emo:sleepy]] 困。平淡就不要加，不要解释标记。',
  };

  return { list, byId, take, guess, PROMPT };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stickers;
if (typeof window !== 'undefined') window.Stickers = Stickers;
