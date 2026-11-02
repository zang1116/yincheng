/**
 * 界面主题：暖纸 / 奶龙 / 奶蛙。
 * 角色素材见 www/assets/themes/ 与 NOTICE.md。
 */
const Theme = (() => {
  const LIST = [
    {
      id: 'paper',
      name: '暖纸',
      desc: '默认青绿纸感',
      avatar: '',
      vars: {
        '--bg': '#edf3ef',
        '--paper': '#fffefb',
        '--ink': '#17251f',
        '--muted': '#647169',
        '--line': '#dbe5df',
        '--green': '#12664f',
        '--green-2': '#e2f1ea',
        '--user': '#dcebe4',
        '--accent': '#12664f',
        '--accent-soft': '#e2f1ea',
        '--stage': '#cbd8d1',
        '--theme-color': '#edf3ef',
      },
    },
    {
      id: 'nailong',
      name: '奶龙',
      desc: '软乎乎奶黄主题',
      avatar: 'assets/themes/nailong/avatar.png',
      vars: {
        '--bg': '#fff6d8',
        '--paper': '#fffced',
        '--ink': '#4a3b18',
        '--muted': '#8a7544',
        '--line': '#f0e2a8',
        '--green': '#d4a017',
        '--green-2': '#fff0b8',
        '--user': '#ffe9a0',
        '--accent': '#e8b923',
        '--accent-soft': '#fff3c4',
        '--stage': '#f0e2a0',
        '--theme-color': '#fff6d8',
      },
    },
    {
      id: 'naiwa',
      name: '奶蛙',
      desc: '黄肚圆蛙',
      avatar: 'assets/themes/naiwa/avatar.png',
      vars: {
        '--bg': '#fff4c8',
        '--paper': '#fffdf6',
        '--ink': '#3a3114',
        '--muted': '#8a7438',
        '--line': '#f0e0a0',
        '--green': '#6fbe4a',
        '--green-2': '#fff3bf',
        '--user': '#ffe9a4',
        '--accent': '#e2b423',
        '--accent-soft': '#fff6d4',
        '--stage': '#f3e4a4',
        '--theme-color': '#fff4c8',
      },
    },
  ];

  function byId(id) {
    return LIST.find((t) => t.id === id) || LIST[0];
  }

  function apply(id) {
    const theme = byId(id);
    const root = document.documentElement;
    Object.keys(theme.vars).forEach((k) => root.style.setProperty(k, theme.vars[k]));
    root.setAttribute('data-theme', theme.id);
    if (document.body) document.body.style.background = theme.vars['--stage'];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.vars['--theme-color'] || theme.vars['--bg']);
    return theme;
  }

  function mascotHtml(id, size) {
    const theme = byId(id);
    const s = size || 96;
    if (!theme.avatar) return '';
    return `<img class="mascot-img" src="${theme.avatar}" width="${s}" height="${s}" alt="${theme.name}" draggable="false" />`;
  }

  function companion(id) {
    // 桌宠改由 Pet 浮层负责拖动与点击，页内不再重复贴图
    return '';
  }

  return { LIST, byId, apply, mascotHtml, companion };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Theme;
if (typeof window !== 'undefined') window.Theme = Theme;
