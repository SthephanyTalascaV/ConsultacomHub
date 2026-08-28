const campoApiBase = document.getElementById('apiBase');
const botaoSalvar = document.getElementById('salvar');
const status = document.getElementById('status');

(async function preencher() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  if (apiBase) campoApiBase.value = apiBase;
})();

botaoSalvar.addEventListener('click', async function () {
  const apiBase = campoApiBase.value.trim().replace(/\/+$/, '');
  await chrome.storage.local.set({ apiBase: apiBase });
  status.classList.add('ok');
  setTimeout(function () { status.classList.remove('ok'); }, 2000);
});
