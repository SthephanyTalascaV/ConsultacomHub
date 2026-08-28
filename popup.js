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
