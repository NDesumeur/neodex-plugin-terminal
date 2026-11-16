// Terminal : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"ptBar\"><span class=\"ptName\" id=\"tmName\">Terminal</span><select class=\"f\" id=\"tmShell\" title=\"Le shell de ce terminal\" hidden></select><button class=\"btn px\" id=\"tmClear\">Effacer</button><button class=\"btn px\" id=\"tmRestart\" title=\"Arrête aussi une commande qui ne finit pas\">Redémarrer</button></div>\n      <pre id=\"tmOut\"></pre>\n      <div class=\"tmLine\"><span id=\"tmPrompt\">PS&gt;</span><input id=\"tmIn\" spellcheck=\"false\" autocomplete=\"off\"></div>";
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
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  view.classList.add("ptView");
  const $ = id => id === "termApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  // ---- ton code d'origine ----
/* ---------- Terminal app: a shell line by line (PowerShell, cmd or Git Bash); the "<<<NEO:dir>>>" marker after each command gives the prompt's folder ---------- */
let tmCwd = '', tmHist = [], tmHi = -1, tmStarted = false, tmBusy = true, tmTab = null;
let tmShells = null; try { tmShells = await neo.termShells(); } catch {}  // NeoDex d'avant 3.1.16 : seulement PowerShell
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
view.__tm = { shell: () => tmSh, busy: () => tmBusy };  // pour l'auto-test
  // ---- fin ----
  ctx.onOpen(() => { tmOpen(); });
}
