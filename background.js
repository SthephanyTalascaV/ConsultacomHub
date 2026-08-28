// Recebe o pedido de consulta vindo do dashboard (Ativação da Carteira) via
// chrome.runtime.sendMessage(EXTENSION_ID, {type:'consultar', nome}) e abre
// o popup da extensão já com o nome preenchido.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'consultar' || typeof message.nome !== 'string' || !message.nome.trim()) {
    sendResponse({ ok: false, erro: 'Mensagem inválida.' });
    return;
  }

  const nome = message.nome.trim().slice(0, 200);

  chrome.storage.local.set({ consultaPendente: { nome, criadoEm: Date.now() } }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?origem=externa'),
      type: 'popup',
      width: 420,
      height: 580
    });
    sendResponse({ ok: true });
  });

  return true;
});
