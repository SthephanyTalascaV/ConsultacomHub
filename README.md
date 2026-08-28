# Consulta com Hub

Extensão do Chrome que consulta o pipeline **Sucesso** do HubSpot por nome de
cliente, uma consulta por vez. Feita pra ser acionada pelo botão "Consultar
no Hub" do dashboard [Ativação da Carteira](https://github.com/SthephanyTalascaV/hubMeta),
mas também funciona sozinha pelo ícone da extensão na barra do Chrome.

## Onde fica o token do HubSpot

O token **não** fica salvo na extensão. Ele mora no próprio dashboard, como
variável de ambiente `HUBSPOT_TOKEN` no projeto da Vercel — a extensão só
chama a API do dashboard (`/api/hubspot-buscar`), que é quem de fato conversa
com o HubSpot. Ver o repositório
[hubMeta](https://github.com/SthephanyTalascaV/hubMeta) (`api/hubspot-buscar.js`)
para configurar essa variável.

## Instalar (modo desenvolvedor)

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta deste repositório.
4. Copie o **ID** que o Chrome atribuiu à extensão (aparece no card dela) —
   você vai precisar dele no dashboard.

## Configurar a URL do dashboard

1. Clique no ícone da extensão → **Configurar token**.
2. Cole a URL onde o dashboard está publicado na Vercel (ex.:
   `https://hub-meta.vercel.app`) e salve.
3. Se o dashboard usar outro domínio (não `*.vercel.app`, ex. um domínio
   próprio), adicione-o também em `host_permissions` no `manifest.json`.

## Conectar com o dashboard Ativação da Carteira

No arquivo do dashboard, defina o ID copiado no passo 4 acima na constante
`EXTENSAO_CONSULTA_HUB_ID` (procure por esse nome no `<script>`). Depois de
salvo, o botão **"Consultar no Hub"** de cada linha da tabela abre esta
extensão já com o nome do cliente preenchido e a busca disparada.

## Como funciona

- `background.js` recebe a mensagem externa do dashboard
  (`chrome.runtime.sendMessage(ID, {type:'consultar', nome})`) e abre o
  popup com o nome já preenchido.
- `popup.js`/`hubspot.js` chamam `GET {URL do dashboard}/api/hubspot-buscar?nome=...`,
  que roda no servidor (Vercel) com o token do HubSpot, resolve o pipeline
  "Sucesso" e devolve os negócios cujo nome contém o termo buscado.
- Só é permitida uma consulta por vez — o botão de busca fica desabilitado
  enquanto uma requisição está em andamento.

## Sincronizar Ativação (Metabase → HubSpot)

Além da busca, a extensão lê a pergunta **9619** ("Sucesso | Controle Todos
os produtos") do Metabase e usa isso pra atualizar a propriedade `ativacao`
dos deals correspondentes no HubSpot.

1. Abra `https://metabase.nibo.com.br/question/9619-...` com os filtros que
   quiser (Cs, Limitdate etc.).
2. Com essa aba em foco, clique no ícone da extensão e depois em
   **"Ver prévia"**.
3. A extensão chama a própria API do Metabase (com a sua sessão já logada —
   nenhuma senha é lida ou guardada) pra pegar as linhas da pergunta, manda
   pro dashboard cruzar cada uma com o deal correto no HubSpot pelo par
   (id_nibo, produto), e mostra o que vai mudar.
4. Clique em **"Aplicar"** pra gravar as mudanças de fato no HubSpot.

Isso exige que o `manifest.json` libere `host_permissions` para
`https://metabase.nibo.com.br/*` (já incluso por padrão).

## Limitações conhecidas

- Só funciona quando o dashboard é aberto por `http://` ou `https://`
  (ex.: o link publicado na Vercel). Abrir o arquivo `.html` direto do
  disco (`file://`) não permite a comunicação com a extensão — é uma
  restrição do próprio Chrome para `externally_connectable`.
- Por padrão o `manifest.json` libera mensagens de `*.vercel.app` e
  `localhost`, e permite que a extensão chame `*.vercel.app` sem CORS. Se o
  dashboard for publicado em outro domínio, adicione-o em
  `externally_connectable.matches` e `host_permissions`.
