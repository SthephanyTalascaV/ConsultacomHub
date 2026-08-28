// Lê a pergunta 9619 ("Sucesso | Controle Todos os produtos") direto da API
// do Metabase, usando a sessão do navegador (a pessoa já está logada no
// Metabase — nenhuma senha passa por aqui). A extensão precisa estar sendo
// aberta com a aba dessa pergunta em foco.

const METABASE_BASE = 'https://metabase.nibo.com.br';
const CARTAO_ID = 9619;

/** Tira acento e deixa minúsculo, pra comparar nomes de coluna/valores sem
 *  depender de grafia idêntica. */
function normalizarTexto(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

/** Confere se a aba passada é a pergunta 9619 do Metabase. */
function ehAbaDaPergunta(url) {
  return typeof url === 'string' && url.includes('metabase.nibo.com.br') && url.includes('/question/' + CARTAO_ID);
}

/** Pega a aba ativa da janela atual (precisa ser a da pergunta 9619). */
async function obterAbaDaPergunta() {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!aba || !ehAbaDaPergunta(aba.url)) {
    throw new Error('ABA_ERRADA');
  }
  return aba;
}

/** Filtros que a pessoa deixou marcados na tela (aparecem na URL da pergunta). */
function extrairFiltrosDaUrl(url) {
  const filtros = {};
  const params = new URL(url).searchParams;
  for (const [chave, valor] of params.entries()) {
    filtros[chave] = valor;
  }
  return filtros;
}

async function chamarMetabase(caminho, opcoes) {
  const resposta = await fetch(METABASE_BASE + caminho, {
    credentials: 'include',
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes && opcoes.headers) },
  });

  if (resposta.status === 401 || resposta.status === 403) {
    throw new Error('SEM_SESSAO_METABASE');
  }
  if (!resposta.ok) {
    throw new Error('ERRO_METABASE_' + resposta.status);
  }
  return resposta.json();
}

/** Monta os parâmetros da consulta a partir da definição da pergunta + dos
 *  filtros que estão marcados na tela, sem precisar adivinhar o formato —
 *  o próprio Metabase diz (em `parameters`) o tipo e o alvo de cada filtro. */
function montarParametros(definicaoCartao, filtrosUrl) {
  const definicoes = definicaoCartao.parameters || [];
  const parametros = [];

  definicoes.forEach(function (def) {
    const valor = filtrosUrl[def.slug];
    if (valor === undefined || valor === '') return;
    parametros.push({ id: def.id, type: def.type, target: def.target, value: valor });
  });

  return parametros;
}

/** Roda a pergunta com os filtros atuais e devolve as linhas já como objetos
 *  {NomeDaColuna: valor}. */
async function buscarLinhasDaPergunta(definicaoCartao, filtrosUrl) {
  const parametros = montarParametros(definicaoCartao, filtrosUrl);
  return chamarMetabase('/api/card/' + CARTAO_ID + '/query/json', {
    method: 'POST',
    body: JSON.stringify({ parameters: parametros }),
  });
}

/** Acha o valor de uma linha procurando por qualquer um dos nomes de coluna
 *  possíveis (o Metabase pode devolver "AccountantId", "Account Id" etc). */
function pegarCampo(linha, candidatos) {
  const chaves = Object.keys(linha);
  for (const candidato of candidatos) {
    const alvo = normalizarTexto(candidato);
    const chave = chaves.find(function (k) { return normalizarTexto(k) === alvo; });
    if (chave !== undefined) return linha[chave];
  }
  return undefined;
}

/** Converte as linhas cruas do Metabase pro formato que o backend espera:
 *  { idNibo, produto, ativo }. */
function mapearLinhas(linhasBrutas) {
  return linhasBrutas
    .map(function (linha) {
      const idNibo = pegarCampo(linha, ['AccountantId', 'Id Nibo', 'IdNibo']);
      const produto = pegarCampo(linha, ['Product', 'Produto']);
      const status = pegarCampo(linha, ['Status']);
      return {
        idNibo: idNibo == null ? '' : String(idNibo).trim(),
        produto: produto == null ? '' : String(produto).trim(),
        ativo: normalizarTexto(status) === 'ativado',
      };
    })
    .filter(function (linha) { return linha.idNibo && linha.produto; });
}

/** Ponto de entrada: lê a pergunta 9619 na aba ativa e devolve as linhas já
 *  no formato do backend. */
async function lerPergunta9619() {
  const aba = await obterAbaDaPergunta();
  const filtrosUrl = extrairFiltrosDaUrl(aba.url);
  const definicaoCartao = await chamarMetabase('/api/card/' + CARTAO_ID, { method: 'GET' });
  const linhasBrutas = await buscarLinhasDaPergunta(definicaoCartao, filtrosUrl);
  return mapearLinhas(linhasBrutas);
}
