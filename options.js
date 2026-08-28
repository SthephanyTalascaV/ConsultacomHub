const campoToken = document.getElementById('token');
const botaoSalvar = document.getElementById('salvar');
const status = document.getElementById('status');

(async function preencher() {
  const { hubspotToken } = await chrome.storage.local.get('hubspotToken');
  if (hubspotToken) campoToken.value = hubspotToken;
})();

botaoSalvar.addEventListener('click', async function () {
  const token = campoToken.value.trim();
  await chrome.storage.local.set({ hubspotToken: token });
  await chrome.storage.local.remove('cachePipelineSucesso');
  status.classList.add('ok');
  setTimeout(function () { status.classList.remove('ok'); }, 2000);
});
