// Funções de acesso à API do HubSpot. Usadas pelo popup.
// Depende de um token de Private App salvo em chrome.storage.local (chave "hubspotToken").

const HUB_API = 'https://api.hubapi.com';
const NOME_PIPELINE_ALVO = 'sucesso';
const CACHE_PIPELINE_MS = 60 * 60 * 1000; // 1h

async function obterToken() {
  const { hubspotToken } = await chrome.storage.local.get('hubspotToken');
  return hubspotToken || '';
}

async function chamarHub(caminho, opcoes = {}) {
  const token = await obterToken();
  if (!token) {
    throw new Error('SEM_TOKEN');
  }

  const resposta = await fetch(HUB_API + caminho, {
    ...opcoes,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });

  if (resposta.status === 401) throw new Error('TOKEN_INVALIDO');
  if (resposta.status === 403) throw new Error('SEM_PERMISSAO');
  if (!resposta.ok) throw new Error('ERRO_HUB_' + resposta.status);

  return resposta.json();
}

/** Descobre o pipeline "Sucesso" e o mapa id->rótulo dos estágios. Cacheado por 1h. */
async function obterPipelineSucesso() {
  const cache = await chrome.storage.local.get('cachePipelineSucesso');
  const agora = Date.now();
  if (cache.cachePipelineSucesso && (agora - cache.cachePipelineSucesso.criadoEm) < CACHE_PIPELINE_MS) {
    return cache.cachePipelineSucesso.dados;
  }

  const dados = await chamarHub('/crm/v3/pipelines/deals');
  const pipeline = (dados.results || []).find(function (p) {
    return (p.label || '').trim().toLowerCase() === NOME_PIPELINE_ALVO;
  });

  if (!pipeline) {
    throw new Error('PIPELINE_NAO_ENCONTRADO');
  }

  const estagios = {};
  (pipeline.stages || []).forEach(function (s) { estagios[s.id] = s.label; });

  const info = { id: pipeline.id, label: pipeline.label, estagios: estagios };
  await chrome.storage.local.set({ cachePipelineSucesso: { dados: info, criadoEm: agora } });
  return info;
}

/** Busca negócios no pipeline Sucesso cujo nome contenha o termo informado. */
async function buscarNoPipelineSucesso(nome) {
  const pipeline = await obterPipelineSucesso();

  const corpo = {
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline', operator: 'EQ', value: pipeline.id },
        { propertyName: 'dealname', operator: 'CONTAINS_TOKEN', value: nome },
      ],
    }],
    properties: ['dealname', 'dealstage', 'hs_lastmodifieddate'],
    limit: 10,
  };

  const dados = await chamarHub('/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });

  return (dados.results || []).map(function (d) {
    return {
      id: d.id,
      nome: d.properties.dealname,
      estagio: pipeline.estagios[d.properties.dealstage] || d.properties.dealstage,
      atualizadoEm: d.properties.hs_lastmodifieddate,
      url: 'https://app.hubspot.com/object/0-3/' + d.id,
    };
  });
}
