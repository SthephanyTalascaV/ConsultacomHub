// Busca negócios do pipeline "Sucesso" chamando a API serverless do próprio
// dashboard (Vercel), que guarda o token do HubSpot em variável de ambiente.
// Nenhuma chave fica salva no navegador — só a URL do dashboard.

const API_BASE_PADRAO = 'https://hub-meta.vercel.app';

async function obterApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  return (apiBase || API_BASE_PADRAO).replace(/\/+$/, '');
}

/** Busca negócios no pipeline Sucesso cujo nome contenha o termo informado. */
async function buscarNoPipelineSucesso(nome) {
  const base = await obterApiBase();
  if (!base) throw new Error('SEM_API_BASE');

  const resposta = await fetch(base + '/api/hubspot-buscar?nome=' + encodeURIComponent(nome));
  const dados = await resposta.json().catch(function () { return {}; });

  if (!resposta.ok) {
    throw new Error(dados.erro || 'ERRO_HUB_' + resposta.status);
  }

  return dados.resultados || [];
}
