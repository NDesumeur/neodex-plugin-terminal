// Terminal : un vrai terminal dans un onglet de NeoDex. Chaque terminal tourne dans une pseudo-console (NeoDex 3.4.2 et plus) et
// s'affiche avec xterm.js (vendor/, MIT) : couleurs, vim, htop, ssh et PSReadLine marchent. Plusieurs terminaux en onglets.
// Si la pseudo-console n'est pas là (NeoDex plus ancien, PC sans ConPTY), l'ancien terminal ligne par ligne prend le relais (plus bas, inchangé).
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"ptBar\"><span class=\"ptName\" id=\"tmName\">Terminal</span><div id=\"tmTabs\" hidden></div><button class=\"btn px\" id=\"tmAdd\" title=\"Nouveau terminal (Ctrl+Maj+T)\" hidden>+</button><select class=\"f\" id=\"tmShell\" title=\"Le shell de ce terminal\" hidden></select><button class=\"btn px\" id=\"tmClear\">Effacer</button><button class=\"btn px\" id=\"tmRestart\" title=\"Arrête aussi une commande qui ne finit pas\">Redémarrer</button></div>\n      <pre id=\"tmOut\"></pre>\n      <div id=\"tmPanes\" translate=\"no\" hidden></div>\n      <div class=\"tmLine\"><span id=\"tmPrompt\">PS&gt;</span><input id=\"tmIn\" spellcheck=\"false\" autocomplete=\"off\"></div>";
/*CSS-MOVED*/ const CSS = `#tmOut{flex:1;margin:0;padding:clamp(12px,1vw,20px) clamp(14px,1.3vw,26px);overflow:auto;background:#05010b;color:#d9c6ff;font:clamp(13px,.85vw,17px)/1.45 Consolas,'Cascadia Mono',monospace;white-space:pre-wrap;word-break:break-word;user-select:text}
#tmOut .err{color:#ff7a90}
#tmOut .cmd{color:#8ee8a0}
#tmOut .hint{color:var(--muted)}
#tmOut .tab{color:#ffd84a}
.tmLine{display:flex;gap:8px;align-items:center;padding:clamp(8px,.7vw,12px) clamp(14px,1.3vw,26px);background:#0b031c;border-top:3px solid var(--line);font:clamp(13px,.85vw,17px) Consolas,monospace}
#tmPrompt{color:#8ee8a0;white-space:nowrap;max-width:45%;overflow:hidden;text-overflow:ellipsis}
#tmIn{all:unset;flex:1;min-width:0;color:#fff;font:inherit}
.ptName{color:#fff;font-size:clamp(14px,.9vw,17px);max-width:clamp(160px,18vw,320px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px}
.ptBar select.f#tmShell{width:clamp(150px,12vw,220px);margin-right:4px}
#tmPanes{flex:1;position:relative;min-height:0;background:#05010b}
.tmPane{position:absolute;inset:clamp(6px,.6vw,12px) clamp(4px,.4vw,8px) clamp(4px,.4vw,8px) clamp(8px,.8vw,16px)}
#tmTabs{display:flex;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.tmTab{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;white-space:nowrap;color:var(--muted);border:2px solid transparent;font-size:clamp(12px,.8vw,15px)}
.tmTab.on{color:#fff;border-color:var(--line);background:#0b031c}
.tmTab b{font-weight:normal;opacity:.6}
.tmTab b:hover{opacity:1;color:#ff7a90}
.ptView [hidden]{display:none!important}
@media (max-width:640px){.ptName{display:none}.ptBar select.f#tmShell{width:110px}}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
// les couleurs du terminal : celles de l'ancien Terminal (fond violet nuit), les 16 couleurs ANSI accordées
const THEME = { background: '#05010b', foreground: '#d9c6ff', cursor: '#8ee8a0', cursorAccent: '#05010b', selectionBackground: '#5b3c99',
  black: '#1b1030', red: '#ff7a90', green: '#8ee8a0', yellow: '#ffd84a', blue: '#7aa2ff', magenta: '#d58bff', cyan: '#6ee7f0', white: '#d9c6ff',
  brightBlack: '#6b5a8e', brightRed: '#ff9fb0', brightGreen: '#b4f5c2', brightYellow: '#ffe78a', brightBlue: '#a8c2ff', brightMagenta: '#e6b3ff', brightCyan: '#a5f3f8', brightWhite: '#ffffff' };
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el } = host;
  const folder = ctx.folder;
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  view.classList.add("ptView");
  const $ = id => view.querySelector('#' + id) || document.getElementById(id);
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  // le vrai terminal si NeoDex sait le faire (la première fois, NeoDex prépare son relais : quelques secondes)
  let why = '', ready = true;
  $('tmOut').textContent = 'Préparation du terminal…';
  try { await neo.ptyPrepare(); } catch (e) { ready = false; why = /est pas disponible/.test(e.message) ? '' : e.message; }  // NeoDex plus ancien que 3.4.2 : rien à signaler
  $('tmOut').textContent = '';
  const open = ready && await pty().catch(e => { why = e.message; return null; }) || await legacy(why);
  ctx.onOpen(open);

  // ---------- le vrai terminal : xterm.js, une pseudo-console par onglet ----------
  async function pty() {
    const shells = await neo.ptyShells();
    const file = async rel => Uint8Array.from(atob(await neo.pluginFileRead(ctx.id, rel)), c => c.charCodeAt(0));  // un fichier livré avec le plugin
    const css = new TextDecoder().decode(await file('vendor/xterm.css'));
    await import(URL.createObjectURL(new Blob([await file('vendor/xterm.js')], { type: 'text/javascript' })));  // xterm.js se range dans globalThis.Terminal
    const Terminal = globalThis.Terminal;
    host.addStyle(css + CSS);
    $('tmOut').hidden = true; view.querySelector('.tmLine').hidden = true; $('tmPanes').hidden = false; $('tmTabs').hidden = false; $('tmAdd').hidden = false;
    let pref = (await doc('prefs'))?.shell;
    if (!shells.some(s => s.id === pref)) pref = shells[0]?.id;
    const T = [], early = new Map();  // early : ce qu'un shell écrit avant que son onglet connaisse son numéro
    let cur = null;
    const fit = t => {
      const c = t.term._core._renderService.dimensions.css.cell;  // shortcut: la mesure interne d'une case (celle du module « fit » d'xterm), à revoir si on change de version d'xterm
      if (!c.width || !t.box.clientWidth) return;
      const cols = Math.max(2, Math.floor((t.box.clientWidth - 14) / c.width)), rows = Math.max(1, Math.floor(t.box.clientHeight / c.height));  // 14 : la barre de défilement
      if (cols !== t.term.cols || rows !== t.term.rows) t.term.resize(cols, rows);
    };
    const show = t => { cur = t; for (const x of T) x.box.hidden = x !== t; drawTabs(); fit(t); t.term.focus(); };
    function drawTabs() {
      $('tmTabs').replaceChildren(...T.map((t, i) => {
        const b = el('button', 'tmTab' + (t === cur ? ' on' : ''), (i + 1) + ' · ' + (t.name || '…')), x = el('b', '', '×');
        x.title = 'Fermer ce terminal (Ctrl+Maj+W)'; x.onclick = e => { e.stopPropagation(); close(t); };
        b.append(x); b.onclick = () => show(t); return b;
      }));
      $('tmShell').value = cur?.shell || pref;
    }
    async function start(t) {
      t.dead = false; t.id = null;
      try {
        const r = await neo.ptyStart({ shell: t.shell, cols: t.term.cols, rows: t.term.rows });
        Object.assign(t, { id: r.id, name: r.name, shell: r.shell });
        for (const d of early.get(r.id) || []) t.term.write(d);
        early.delete(r.id);
      } catch (e) { t.dead = true; t.term.write('\x1b[31m' + e.message + '\x1b[0m\r\n'); }
      drawTabs();
    }
    async function add(shell) {
      const box = el('div', 'tmPane'); $('tmPanes').append(box);
      const term = new Terminal({ fontFamily: "Consolas, 'Cascadia Mono', monospace", fontSize: innerWidth < 700 ? 12 : 14, theme: THEME, cursorBlink: true, scrollback: 5000 });
      const t = { term, box, shell, id: null, name: '', dead: false };
      term.open(box); T.push(t); show(t);
      term.attachCustomKeyEventHandler(e => keys(t, e));
      term.onData(d => { if (t.dead) { if (d === '\r') { term.reset(); start(t); } return; } if (t.id) neo.ptyWrite(t.id, d).catch(() => {}); });
      term.onResize(({ cols, rows }) => { if (t.id) neo.ptyResize(t.id, cols, rows).catch(() => {}); });
      await start(t);
      return t;
    }
    function close(t) {
      if (t.id) neo.ptyStop(t.id).catch(() => {});
      t.term.dispose(); t.box.remove(); T.splice(T.indexOf(t), 1);
      if (T.length) show(T[Math.min(T.length - 1, T.indexOf(cur) < 0 ? 0 : T.indexOf(cur))] || T[0]); else add(pref);
    }
    // Ctrl+C copie quand du texte est choisi (sinon il arrête la commande), Ctrl+V colle : laissés au navigateur, qui passe par le presse-papiers
    function keys(t, e) {
      if (e.type !== 'keydown' || !e.ctrlKey) return true;
      const k = e.key.toLowerCase();
      if (e.shiftKey && (k === 't' || k === 'w')) { e.preventDefault(); if (k === 't') add(cur?.shell || pref); else close(t); return false; }
      if (k === 'v' || (k === 'c' && (e.shiftKey || t.term.hasSelection()))) { if (k === 'c') setTimeout(() => t.term.clearSelection()); return false; }
      return true;
    }
    neo.onPtyData(({ id, data }) => { const t = T.find(x => x.id === id); if (t) t.term.write(data); else if (id) (early.get(id) || early.set(id, []).get(id)).push(data); });
    neo.onPtyExit(({ id, error }) => {
      const t = T.find(x => x.id === id); if (!t) return;
      t.dead = true; t.id = null;
      t.term.write('\r\n\x1b[90m' + host.t('[{name} s\'est arrêté. Appuie sur Entrée pour le relancer.]', { name: t.name }) + (error ? ' ' + error : '') + '\x1b[0m\r\n');
    });
    if (shells.length > 1) {
      const s = $('tmShell'); s.hidden = false; s.title = 'Le shell du prochain terminal (+)';
      s.replaceChildren(...shells.map(x => { const o = el('option', '', x.name); o.value = x.id; return o; })); s.value = pref;
      s.onchange = async () => { pref = s.value; await folder.write('prefs', { shell: pref }).catch(() => {}); add(pref); };
    }
    $('tmAdd').onclick = () => add(cur?.shell || pref);
    $('tmClear').onclick = () => { cur?.term.clear(); cur?.term.focus(); };
    $('tmRestart').onclick = async () => { const t = cur; if (!t) return; if (t.id) await neo.ptyStop(t.id).catch(() => {}); t.dead = true; t.term.reset(); await start(t); t.term.focus(); };
    new ResizeObserver(() => cur && fit(cur)).observe($('tmPanes'));
    // pour l'auto-test
    view.__tm = { mode: 'pty', tabs: () => T.length, shell: () => cur?.shell, size: () => [cur.term.cols, cur.term.rows], add: sh => add(sh).then(() => true), close: () => (close(cur), true),
      send: s => neo.ptyWrite(cur.id, s), text: () => { const b = cur.term.buffer.active, L = []; for (let i = 0; i < b.length; i++) L.push(b.getLine(i).translateToString(true)); return L.join('\n'); } };
    return () => { if (!T.length) add(pref); else show(cur); };
  }

  // ---------- l'ancien terminal, ligne par ligne (le relais n'a pas pu démarrer) ----------
  async function legacy(why) {
    $('tmShell').title = 'Le shell de ce terminal';
    $('tmOut').hidden = false; view.querySelector('.tmLine').hidden = false; $('tmPanes').hidden = true; $('tmTabs').hidden = true; $('tmAdd').hidden = true;
/* ---------- Terminal app: a shell line by line (PowerShell, cmd or Git Bash); the "<<<NEO:dir>>>" marker after each command gives the prompt's folder ---------- */
let tmCwd = '', tmHist = [], tmHi = -1, tmStarted = false, tmBusy = true, tmTab = null;
let tmShells = null; try { tmShells = await neo.termShells(); } catch {}  // NeoDex d'avant 3.1.17 : seulement PowerShell
let tmSh = (await doc('prefs'))?.shell;
if (!tmShells?.some(s => s.id === tmSh)) tmSh = tmShells?.[0]?.id || 'powershell';
const tmShName = () => tmShells?.find(s => s.id === tmSh)?.name || 'PowerShell';
const tmPrint = (text, cls = '') => { const o = $('tmOut'); o.append(el('span', cls, text)); if (o.childNodes.length > 4000) o.firstChild.remove(); o.scrollTop = o.scrollHeight; };
const tmPromptText = () => tmSh === 'cmd' ? (tmCwd || '') + '>' : tmSh === 'powershell' ? 'PS ' + (tmCwd || '') + '>' : (tmCwd || '') + ' $';
function tmData({kind, data}) {
  if (kind === 'exit') { tmPrint('\n[' + tmShName() + ' s\'est arrêté. Clique sur « Redémarrer ».]\n', 'err'); tmStarted = false; tmTab = null; return; }
  let clean = data.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/<<<NEO:(.*?)>>>\r?\n?/g, (_, d) => { tmCwd = d; tmBusy = false; return ''; });
  if (tmTab && kind !== 'err') {  // la réponse d'une complétion : gardée jusqu'à son marqueur de fin, jamais affichée
    tmTab.buf += clean; const m = /<<<NEOTAB>>>\r?\n?([\s\S]*?)<<<NEOEND>>>\r?\n?/.exec(tmTab.buf);
    if (!m) { $('tmPrompt').textContent = tmPromptText(); return; }
    const t = tmTab; tmTab = null; clean = t.buf.slice(0, m.index) + t.buf.slice(m.index + m[0].length);
    tmComplete(t, m[1].split(/\r?\n/).map(s => s.trim()).filter(Boolean));
  }
  if (clean) tmPrint(clean, kind === 'err' ? 'err' : '');
  $('tmPrompt').textContent = tmPromptText();
}
// Tab : le shell lui-même propose la suite du dernier mot (TabExpansion2 pour PowerShell, les fichiers pour cmd, compgen pour Git Bash)
const tmQ = s => "'" + s.replace(/'/g, "''") + "'", tmQb = s => "'" + s.replace(/'/g, "'\\''") + "'";
function tmTabCmd(line, word) {
  if (tmSh === 'powershell') return "'<<<NEOTAB>>>'; (TabExpansion2 -inputScript " + tmQ(line) + " -cursorColumn " + line.length + ").CompletionMatches | Select-Object -First 60 | ForEach-Object { $_.CompletionText }; '<<<NEOEND>>>'";
  if (tmSh === 'cmd') return 'echo ^<^<^<NEOTAB^>^>^>& dir /b /a "' + word.replace(/"/g, '') + '*" 2>nul& echo ^<^<^<NEOEND^>^>^>';
  return "echo '<<<NEOTAB>>>'; compgen " + (line.trim() === word ? '-c -f' : '-f') + " -- " + tmQb(word) + " | sort -u | head -60; echo '<<<NEOEND>>>'";
}
function tmComplete({line, word}, list) {
  const inp = $('tmIn'); if (inp.value !== line) return;  // tu as continué à taper : la réponse arrive trop tard
  if (tmSh === 'cmd') { const dir = word.replace(/"/g, '').replace(/[^\\/]*$/, ''); list = list.map(s => (/\s/.test(dir + s) ? '"' + dir + s + '"' : dir + s)); }
  if (!list.length) return;
  let pre = list[0]; for (const s of list) while (pre && s.slice(0, pre.length).toLowerCase() !== pre.toLowerCase()) pre = pre.slice(0, -1);
  const put = list.length === 1 ? list[0] : pre.length > word.length ? pre : word;
  inp.value = line.slice(0, line.length - word.length) + put;
  if (list.length > 1) tmPrint(list.join('   ') + '\n', 'tab');
}
async function tmOpen() {
  if (!tmStarted) { tmStarted = true; tmBusy = true; tmTab = null; tmCwd = ''; $('tmOut').replaceChildren(); $('tmName').textContent = 'Terminal · ' + tmShName();
    if (why) tmPrint(host.t('Le vrai terminal n\'a pas pu démarrer ({why}) : voici le terminal ligne par ligne.', { why }) + '\n', 'err');
    tmPrint(tmShName() + ' dans NeoDex · tape une commande puis Entrée (↑ ↓ : historique, Tab : compléter). Les programmes plein écran (vim, ssh interactif…) ne marchent pas ici.\n', 'hint'); await neo.termStart(tmSh); }
  setTimeout(() => $('tmIn').focus());
}
$('tmIn').onkeydown = e => {
  if (e.key === 'Enter') {
    const line = $('tmIn').value; $('tmIn').value = ''; tmHi = -1;
    tmPrint(tmPromptText() + ' ' + line + '\n', 'cmd');
    if (line.trim()) { tmHist.unshift(line); tmHist = tmHist.slice(0, 100); }
    if (/^\s*(cls|clear)\s*$/i.test(line)) { $('tmOut').replaceChildren(); return; }
    tmBusy = true; neo.termRun(line).catch(err => tmPrint(err.message + '\n', 'err'));
  } else if (e.key === 'Tab') {
    e.preventDefault(); const line = $('tmIn').value, word = line.match(/\S*$/)[0];
    if (tmBusy || tmTab || !tmStarted || !line.trim()) return;  // une commande tourne encore : sa sortie ne doit pas se mêler à la complétion
    tmTab = { line, word, buf: '' }; tmBusy = true; neo.termRun(tmTabCmd(line, word)).catch(() => { tmTab = null; });
  } else if (e.key === 'ArrowUp' && tmHist.length) { e.preventDefault(); tmHi = Math.min(tmHist.length - 1, tmHi + 1); $('tmIn').value = tmHist[tmHi]; }
  else if (e.key === 'ArrowDown') { e.preventDefault(); tmHi = Math.max(-1, tmHi - 1); $('tmIn').value = tmHi < 0 ? '' : tmHist[tmHi]; }
};
if (tmShells?.length > 1) {
  const s = $('tmShell'); s.hidden = false;
  s.replaceChildren(...tmShells.map(x => { const o = el('option', '', x.name); o.value = x.id; return o; })); s.value = tmSh;
  s.onchange = async () => { tmSh = s.value; await folder.write('prefs', { shell: tmSh }).catch(() => {}); tmStarted = false; await neo.termStop(); tmOpen(); };
}
$('tmClear').onclick = () => $('tmOut').replaceChildren();
$('tmRestart').onclick = async () => { tmStarted = false; await neo.termStop(); tmOpen(); };
$('tmOut').onclick = () => { if (!getSelection().toString()) $('tmIn').focus(); };
if (window.neo) neo.onTermData(tmData);  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
view.__tm = { mode: 'ligne', shell: () => tmSh, busy: () => tmBusy };  // pour l'auto-test
    return () => { tmOpen(); };
  }
}
