# LoteFinder Itaipuaçu

Web app instalável para usar em manutenção de fibra.

## Como usar

1. Digite o nome atual da rua, do jeito que aparece no Google Maps.
2. Digite a quadra.
3. Toque em `Abrir no Google Maps`.
4. Quando chegar no ponto correto da quadra, volte no app e toque em `Salvar GPS atual`.

Depois que o GPS estiver salvo para uma rua + quadra, o app passa a abrir o Maps direto no ponto confirmado.

## Como instalar no telefone

Para aparecer a opção de instalar no Android/iPhone, o app precisa estar em um endereço HTTPS.

Opções simples:

- GitHub Pages
- Netlify Drop
- Vercel

Depois de publicar:

1. Abra o link no Chrome do telefone.
2. Toque no menu do navegador.
3. Escolha `Adicionar à tela inicial` ou `Instalar app`.

## Arquivos importantes

- `index.html`: tela do app.
- `app.js`: busca, Maps, Waze e GPS salvo.
- `manifest.json`: dados de instalação.
- `sw.js`: cache offline.
- `ruas_itaipuacu_extraidas.csv`: ruas extraídas do mapa.
- `quadras_itaipuacu_extraidas.json`: quadras extraídas do mapa.

## Observação

O mapa original não tem lote e muitos nomes de rua são antigos ou numéricos. Por isso, o campo de rua é livre e consulta o Maps com o nome atual. Para ficar cada vez mais exato, salve o GPS real das quadras durante o trabalho de campo.
