# Consulta com Hub

Extensão do Chrome que consulta o pipeline **Sucesso** do HubSpot por nome de
cliente, uma consulta por vez. Feita pra ser acionada pelo botão "Consultar
no Hub" do dashboard [Ativação da Carteira](https://github.com/SthephanyTalascaV/hubMeta),
mas também funciona sozinha pelo ícone da extensão na barra do Chrome.

## Instalar (modo desenvolvedor)

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta deste repositório.
4. Copie o **ID** que o Chrome atribuiu à extensão (aparece no card dela) —
   você vai precisar dele no dashboard.

## Configurar o token do HubSpot

1. Clique no ícone da extensão → **Configurar token**.
2. No HubSpot: **Configurações → Integrações → Apps privados** → crie (ou
   abra) um app com o escopo `crm.objects.deals.read`.
3. Cole o token na página de configuração e salve. Ele fica só no seu
   navegador (`chrome.storage.local`), nunca sai daqui.

## Conectar com o dashboard Ativação da Carteira

No arquivo do dashboard, defina o ID copiado no passo 4 acima na constante
`EXTENSAO_CONSULTA_HUB_ID` (procure por esse nome no `<script>`). Depois de
salvo, o botão **"Consultar no Hub"** de cada linha da tabela abre esta
extensão já com o nome do cliente preenchido e a busca disparada.

## Como funciona

- `background.js` recebe a mensagem externa do dashboard
  (`chrome.runtime.sendMessage(ID, {type:'consultar', nome})`) e abre o
  popup com o nome já preenchido.
- `popup.js` busca o pipeline "Sucesso" na API do HubSpot (`GET
  /crm/v3/pipelines/deals`, cacheado por 1h) e depois busca negócios nesse
  pipeline cujo nome contenha o termo digitado (`POST
  /crm/v3/objects/deals/search`).
- Só é permitida uma consulta por vez — o botão de busca fica desabilitado
  enquanto uma requisição está em andamento.

## Limitações conhecidas

- Só funciona quando o dashboard é aberto por `http://` ou `https://`
  (ex.: o link publicado na Vercel). Abrir o arquivo `.html` direto do
  disco (`file://`) não permite a comunicação com a extensão — é uma
  restrição do próprio Chrome para `externally_connectable`.
- Por padrão o `manifest.json` libera mensagens de `*.vercel.app` e
  `localhost`. Se o dashboard for publicado em outro domínio, adicione-o
  em `externally_connectable.matches`.
