const tablist = document.querySelector('.mode-tabs');
const tabs = [...tablist.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const loading = document.getElementById('colors-loading');

function selectTab(selectedTab) {
  tabs.forEach((tab, index) => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[index].hidden = !selected;
  });
}

async function mountPicker(panel, loadMount) {
  try {
    const mount = await loadMount;
    mount(panel);
  } catch (error) {
    const message = document.createElement('p');
    message.textContent = 'Dieses Farbwerkzeug konnte nicht geladen werden. Lade die Seite erneut.';
    panel.replaceChildren(message);
    console.error(error);
  }
}

selectTab(tabs[0]);
await Promise.all([
  mountPicker(panels[0], import('./harmony.mjs').then(module => module.mountHarmonyPicker)),
  mountPicker(panels[1], import('./free.mjs').then(module => module.mountFreePicker)),
]);

tabs.forEach(tab => tab.addEventListener('click', () => selectTab(tab)));
tablist.addEventListener('keydown', event => {
  const current = tabs.indexOf(event.target);
  if (current === -1) return;
  const last = tabs.length - 1;
  const next = {
    ArrowLeft: current === 0 ? last : current - 1,
    ArrowRight: current === last ? 0 : current + 1,
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  selectTab(tabs[next]);
  tabs[next].focus();
});

tablist.hidden = false;
loading.remove();
