# Arquitetura do Projeto

O Kanban Ágil foi projetado com uma arquitetura cliente-servidor clara, utilizando os serviços do Google como plataforma. A estrutura foi pensada para ser modular, segura e eficiente.

## Visão Geral dos Componentes

1.  **Frontend (Lado do Cliente):** Construído com HTML, CSS e JavaScript, é a interface com a qual o usuário interage. Reside inteiramente no navegador e é responsável por toda a renderização visual e a captura de eventos.
2.  **Backend (Lado do Servidor):** O cérebro da aplicação, escrito em Google Apps Script (`Code.js`). Ele é executado nos servidores do Google e é responsável pela lógica de negócios, segurança e comunicação com o banco de dados.
3.  **Banco de Dados:** Uma Planilha Google (`Google Sheets`) atua como um banco de dados NoSQL-like, onde cada aba representa uma "coleção" de documentos.

## Frontend em Detalhes

O frontend foi dividido em múltiplos arquivos `.html` para aplicar o princípio da **Separação de Interesses**:

- **`index.html`**: O esqueleto principal da aplicação. Carrega todas as bibliotecas e os outros módulos de script.
- **`style.css.html`**: Contém todos os estilos CSS personalizados da aplicação.
- **`app.js.html`**: O ponto de entrada da aplicação cliente. Gerencia o estado global (variáveis), o fluxo de inicialização e a lógica de login.
- **`ui.js.html`**: Responsável por toda a manipulação do DOM. Contém as funções que renderizam o quadro, os cartões, os avisos e outras partes da interface (`renderTarefas`, `criarCartaoAviso`, etc.).
- **`services.js.html`**: A camada de comunicação. Todas as chamadas `google.script.run` para o backend estão centralizadas aqui. Isso isola a lógica de comunicação da lógica de UI.
- **`events.js.html`**: Centraliza a configuração de todos os `event listeners` dos botões e outros elementos interativos.
- **`modals.js.html`**: Contém todas as funções que gerenciam a abertura, o preenchimento e a lógica dos modais (ex: `abrirModalTarefa`).

## Backend em Detalhes (`code.gs`)

O backend é um único arquivo (`code.gs`) com responsabilidades bem definidas:

- **Autenticação:** As funções `authenticate` e `isTokenValid` formam a barreira de segurança. `authenticate` verifica as credenciais e gera um token de sessão usando o `CacheService`. `isTokenValid` valida esse token em cada requisição subsequente.
- **Serviço de Dados:** A função otimizada `obterDadosIniciais` atua como um único endpoint para o carregamento inicial, buscando todos os dados necessários (tarefas, usuários, etc.) de uma só vez para minimizar a latência.
- **Operações CRUD:** Funções como `criarTarefa`, `atualizarUsuario` e `removerAviso` implementam a lógica de Create, Read, Update e Delete, interagindo diretamente com a Planilha Google.
- **Manipulação de Dados:** A função `converterDatasParaString` garante que os dados de data sejam serializados corretamente antes de serem enviados como JSON para o frontend.