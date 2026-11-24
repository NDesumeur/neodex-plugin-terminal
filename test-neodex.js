// lancé par le test « local » de NeoDex : le vrai terminal (pseudo-console + xterm.js) avec PowerShell, sa taille suivie par le shell,
// un 2e onglet avec l'invite de commandes (s'il est là), fermeture d'onglet ; rien ne déborde
module.exports = async ({ pj, sleep }) => {
  const T = `document.body.__tm`;
  for (let i = 0; i < 120 && !await pj(`!!${T}`); i++) await sleep(250);
  const mode = await pj(`${T}?.mode`);
  if (mode !== 'pty') throw new Error('mode ' + mode + ' au lieu du vrai terminal : ' + await pj(`document.getElementById('tmOut').textContent.slice(0, 300)`));
  const text = () => pj(`${T}.text()`);
  const until = async (re, what) => { for (let i = 0; i < 80; i++) { const t = await text(); const m = re.exec(t); if (m) return m; await sleep(250); } throw new Error(what + ' : ' + (await text()).trim().slice(-300)); };
  await until(/PS .*>/, 'pas d\'invite PowerShell');
  const [cols] = await pj(`${T}.size()`);
  await pj(`${T}.send('Write-Output ("ne" + "odex"); $Host.UI.RawUI.WindowSize.Width\\r'), 0`);
  const m = await until(/\nneodex\s*\n\s*(\d+)/, 'PowerShell ne répond pas');
  if (+m[1] !== cols) throw new Error('le shell voit ' + m[1] + ' colonnes, le terminal en a ' + cols);
  const res = ['PowerShell (' + cols + ' colonnes)'];
  const shells = await pj(`[...document.querySelectorAll('#tmShell option')].map(o => o.value)`);
  if (shells.includes('cmd')) {
    await pj(`${T}.add('cmd')`);
    if (await pj(`${T}.tabs()`) !== 2) throw new Error('2e onglet absent');
    await until(/>\s*$/m, 'pas d\'invite cmd');
    await pj(`${T}.send('echo %OS%\\r'), 0`);
    await until(/\nWindows_NT/, 'cmd ne répond pas');
    await pj(`${T}.close()`);
    if (await pj(`${T}.tabs()`) !== 1 || await pj(`${T}.shell()`) !== 'powershell') throw new Error('fermeture d\'onglet');
    res.push('cmd dans un 2e onglet, fermé');
  }
  const over = await pj(`[...document.querySelectorAll('.ptBar *, #tmPanes')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length`);
  if (over) throw new Error(over + ' élément(s) débordent à droite');
  await sleep(800);
  return res.join(', ');
};
