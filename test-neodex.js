// lancé par le test « local » de NeoDex : PowerShell (commande, Tab sur Get-ChildIt), puis l'invite de commandes et Git Bash s'ils sont là ; rien ne déborde
module.exports = async ({ pj, sleep }) => {
  const T = `document.querySelector('#tmOut').parentElement.__tm`;
  const idle = async () => { for (let i = 0; i < 60; i++) { await sleep(250); if (!await pj(`${T}.busy()`)) return; } throw new Error('le shell ne répond pas : ' + await pj(`document.getElementById('tmOut').textContent.slice(-300)`)); };
  const run = async line => { await pj(`(() => { const i = document.getElementById('tmIn'); i.value = ${JSON.stringify(line)}; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); })(), 0`); await idle(); };
  const tab = async line => { await pj(`(() => { const i = document.getElementById('tmIn'); i.value = ${JSON.stringify(line)}; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); })(), 0`); await idle(); await sleep(150); return pj(`document.getElementById('tmIn').value`); };
  const out = () => pj(`document.getElementById('tmOut').textContent`);
  const use = async id => { await pj(`(() => { const s = document.getElementById('tmShell'); s.value = ${JSON.stringify(id)}; s.dispatchEvent(new Event('change')); })(), 0`); await sleep(300); await idle(); };
  const shells = await pj(`[...document.querySelectorAll('#tmShell option')].map(o => o.value)`);
  if (!shells.includes('powershell')) throw new Error('liste des shells : ' + shells);
  const res = [];
  await use('powershell'); await run('Write-Output ("ne" + "odex")');
  if (!/\nneodex/.test(await out())) throw new Error('PowerShell : ' + (await out()).slice(-200));
  const ps = await tab('Get-ChildIt'); if (ps !== 'Get-ChildItem') throw new Error('Tab PowerShell : ' + ps);
  if (/NEOTAB|NEOEND/.test(await out())) throw new Error('marqueur de complétion affiché');
  res.push('PowerShell (Tab ' + ps + ')');
  if (shells.includes('cmd')) {
    await use('cmd'); await run('echo %OS%');
    const o = await out(); if (!/Windows_NT/.test(o) || /<<<P>>>|echo %OS%\s*\n.*echo %OS%/.test(o)) throw new Error('cmd : ' + o.slice(-200));
    const c = await tab('cd Deskto'); res.push('cmd (Tab ' + c + ')');
  }
  if (shells.includes('bash')) {
    await use('bash'); await run('echo $((6*7))');
    if (!/\n42/.test(await out())) throw new Error('Git Bash : ' + (await out()).slice(-200));
    const b = await tab('ech'); if (!/^echo/.test(b)) throw new Error('Tab Git Bash : ' + b); res.push('Git Bash (Tab ' + b + ')');
  }
  await use('powershell'); await run('Get-Date -Format yyyy');
  const over = await pj(`[...document.querySelectorAll('.ptView *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length`);
  if (over) throw new Error(over + ' élément(s) débordent à droite');
  await sleep(1500);
  return res.join(', ');
};
