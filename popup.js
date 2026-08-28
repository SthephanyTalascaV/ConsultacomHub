const campoNome = document.getElementById('nome');
const botaoBuscar = document.getElementById('botaoBuscar');
const areaResultado = document.getElementById('area-resultado');

let consultaEmAndamento = false;

function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

function mostrarMensagem(html) {
  areaResultado.innerHTML = html;
}

function mostrarErro(erro) {
  const mapa = {
    'SEM_API_BASE': 'Nenhuma URL do dashboard configurada. <a href="options.html" target="_blank">Configure aqui</a>.',
    'SEM_TOKEN_NO_SERVIDOR': 'O dashboard ainda não tem o token do HubSpot configurado (variável HUBSPOT_TOKEN na Vercel).',
    'TOKEN_INVALIDO': 'O token do HubSpot configurado na Vercel está inválido ou expirado.',
    'SEM_PERMISSAO': 'Esse token não tem permissão para ler negócios (deals) no HubSpot.',
    'PIPELINE_NAO_ENCONTRADO': 'Não encontrei um pipeline chamado "Sucesso" nesta conta do HubSpot.',
  };
  const texto = mapa[erro.message] ||
    'Não foi possível consultar o HubSpot agora. Verifique a URL do dashboard nas ' +
    '<a href="options.html" target="_blank">configurações</a> e tente novamente.';
  mostrarMensagem('<div class="aviso">' + texto + '</div>');
}

async function buscar() {
  if (consultaEmAndamento) return; // só uma consulta por vez

  const nome = campoNome.value.trim();
  if (!nome) {
    mostrarMensagem('<div class="vazio">Digite um nome pra buscar.</div>');
    return;
  }

  consultaEmAndamento = true;
  botaoBuscar.disabled = true;
  mostrarMensagem('<div class="carregando">Consultando o pipeline Sucesso…</div>');

  try {
    const resultados = await buscarNoPipelineSucesso(nome);

    if (!resultados.length) {
      mostrarMensagem('<div class="vazio">Nenhum negócio encontrado no pipeline Sucesso para "' + nome + '".</div>');
    } else {
      mostrarMensagem(resultados.map(function (r) {
        return '<div class="resultado">' +
          '<div class="nome">' + r.nome + '</div>' +
          '<div class="estagio">Sucesso | ' + r.estagio + '</div><br>' +
          '<a href="' + r.url + '" target="_blank">Abrir no HubSpot ' +
          (r.atualizadoEm ? ' · atualizado em ' + formatarData(r.atualizadoEm) : '') + '</a>' +
          '</div>';
      }).join(''));
    }
  } catch (erro) {
    mostrarErro(erro);
  } finally {
    consultaEmAndamento = false;
    botaoBuscar.disabled = false;
  }
}

botaoBuscar.addEventListener('click', buscar);
campoNome.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') buscar();
});

// --- Sincronizar Ativação (Metabase → HubSpot) ---------------------------

const botaoSincronizar = document.getElementById('botaoSincronizar');
const areaSincronizacao = document.getElementById('area-sincronizacao');

let sincronizacaoEmAndamento = false;
let ultimasLinhasLidas = null; // guarda as linhas da última prévia, pra "Aplicar" não precisar reler o Metabase

function mostrarSincronizacao(html) {
  areaSincronizacao.innerHTML = html;
}

function mostrarErroSincronizacao(erro) {
  const mapa = {
    'ABA_ERRADA': 'Abra a pergunta 9619 no Metabase e clique no ícone da extensão com essa aba em foco.',
    'SEM_SESSAO_METABASE': 'Sua sessão do Metabase expirou. Abra metabase.nibo.com.br, faça login de novo e tente outra vez.',
    'SEM_API_BASE': 'Nenhuma URL do dashboard configurada. <a href="options.html" target="_blank">Configure aqui</a>.',
    'SEM_TOKEN_NO_SERVIDOR': 'O dashboard ainda não tem o token do HubSpot configurado (variável HUBSPOT_TOKEN na Vercel).',
    'SEM_LINHAS': 'A pergunta não devolveu nenhuma linha com os filtros atuais.',
  };
  const texto = mapa[erro.message] ||
    'Não foi possível ler a pergunta 9619 ou falar com o dashboard agora (' + erro.message + ').';
  mostrarSincronizacao('<div class="aviso">' + texto + '</div>');
}

function contagem(resumo, chave) {
  return resumo && typeof resumo[chave] === 'number' ? resumo[chave] : 0;
}

function rotuloLinha(linha) {
  const alvo = linha.dealname || (linha.produto + ' — ' + linha.idNibo);
  switch (linha.situacao) {
    case 'SERIA_ATUALIZADO':
      return { classe: '', principal: (linha.statusNovo === 'ativado' ? 'Vai ativar: ' : 'Vai desativar: ') + alvo, detalhe: '' };
    case 'ATUALIZADO':
      return { classe: '', principal: (linha.statusNovo === 'ativado' ? 'Ativado: ' : 'Desativado: ') + alvo, detalhe: '' };
    case 'JA_ATUALIZADO':
      return { classe: '', principal: 'Já estava certo: ' + alvo, detalhe: '' };
    case 'NAO_ENCONTRADO':
      return { classe: 'problema', principal: 'Não encontrado no HubSpot', detalhe: linha.produto + ' — id_nibo ' + linha.idNibo };
    case 'AMBIGUO':
      return { classe: 'problema', principal: 'Vários negócios encontrados', detalhe: linha.produto + ' — id_nibo ' + linha.idNibo };
    case 'LINHA_INVALIDA':
      return { classe: 'problema', principal: 'Linha sem id_nibo ou produto', detalhe: '' };
    default:
      return { classe: 'problema', principal: 'Erro: ' + (linha.erro || linha.situacao), detalhe: linha.produto + ' — id_nibo ' + linha.idNibo };
  }
}

function renderizarResultadoSincronizacao(resultado, permitirAplicar) {
  const r = resultado.resumo || {};
  const partesResumo = [
    '<span class="destaque">' + contagem(r, 'seriamAtualizados') + (permitirAplicar ? ' vão mudar' : ' atualizados') + '</span>',
    '<span>' + contagem(r, 'jaAtualizados') + ' já certos</span>',
  ];
  const problemas = contagem(r, 'naoEncontrados') + contagem(r, 'ambiguos') + contagem(r, 'erros');
  if (problemas > 0) {
    partesResumo.push('<span class="problema">' + problemas + ' com problema</span>');
  }

  const linhasProblematicas = (resultado.linhas || []).filter(function (l) {
    return l.situacao !== 'JA_ATUALIZADO' && l.situacao !== 'ATUALIZADO';
  });
  const linhasParaMostrar = permitirAplicar
    ? (resultado.linhas || []).filter(function (l) { return l.situacao === 'SERIA_ATUALIZADO'; }).concat(linhasProblematicas.filter(function (l) { return l.situacao !== 'SERIA_ATUALIZADO'; }))
    : linhasProblematicas;

  const html = linhasParaMostrar.map(function (linha) {
    const r = rotuloLinha(linha);
    return '<div class="linha-sync ' + r.classe + '">' +
      '<div class="principal">' + r.principal + '</div>' +
      (r.detalhe ? '<div class="detalhe">' + r.detalhe + '</div>' : '') +
      '</div>';
  }).join('');

  const botaoAplicar = permitirAplicar && contagem(r, 'seriamAtualizados') > 0
    ? '<button id="botaoAplicarSincronizacao" class="botao-largo verde">Aplicar ' + contagem(r, 'seriamAtualizados') + ' atualização(ões) no HubSpot</button>'
    : '';

  mostrarSincronizacao(
    '<div class="resumo">' + partesResumo.join('') + '</div>' +
    botaoAplicar +
    (html || '<div class="vazio">Nada para mostrar.</div>')
  );

  if (botaoAplicar) {
    document.getElementById('botaoAplicarSincronizacao').addEventListener('click', aplicarSincronizacao);
  }
}

async function chamarBackendSincronizacao(linhas, aplicar) {
  const base = await obterApiBase();
  if (!base) throw new Error('SEM_API_BASE');

  const resposta = await fetch(base + '/api/metabase-sincronizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aplicar: aplicar, linhas: linhas }),
  });
  const dados = await resposta.json().catch(function () { return {}; });

  if (!resposta.ok) {
    throw new Error(dados.erro || 'ERRO_BACKEND_' + resposta.status);
  }
  return dados;
}

async function verPreviaSincronizacao() {
  if (sincronizacaoEmAndamento) return;
  sincronizacaoEmAndamento = true;
  botaoSincronizar.disabled = true;
  mostrarSincronizacao('<div class="carregando">Lendo a pergunta 9619 no Metabase…</div>');

  try {
    const linhas = await lerPergunta9619();
    if (!linhas.length) throw new Error('SEM_LINHAS');

    mostrarSincronizacao('<div class="carregando">Cruzando ' + linhas.length + ' linha(s) com o HubSpot…</div>');
    const resultado = await chamarBackendSincronizacao(linhas, false);
    ultimasLinhasLidas = linhas;
    renderizarResultadoSincronizacao(resultado, true);
  } catch (erro) {
    mostrarErroSincronizacao(erro);
  } finally {
    sincronizacaoEmAndamento = false;
    botaoSincronizar.disabled = false;
  }
}

async function aplicarSincronizacao() {
  if (sincronizacaoEmAndamento || !ultimasLinhasLidas) return;
  sincronizacaoEmAndamento = true;
  mostrarSincronizacao('<div class="carregando">Atualizando o HubSpot…</div>');

  try {
    const resultado = await chamarBackendSincronizacao(ultimasLinhasLidas, true);
    ultimasLinhasLidas = null;
    renderizarResultadoSincronizacao(resultado, false);
  } catch (erro) {
    mostrarErroSincronizacao(erro);
  } finally {
    sincronizacaoEmAndamento = false;
  }
}

botaoSincronizar.addEventListener('click', verPreviaSincronizacao);

// Se o popup foi aberto pelo dashboard (Ativação da Carteira), preenche e busca sozinho.
(async function iniciar() {
  const params = new URLSearchParams(location.search);
  if (params.get('origem') !== 'externa') return;

  const { consultaPendente } = await chrome.storage.local.get('consultaPendente');
  if (!consultaPendente || !consultaPendente.nome) return;

  campoNome.value = consultaPendente.nome;
  await chrome.storage.local.remove('consultaPendente');
  buscar();
})();
