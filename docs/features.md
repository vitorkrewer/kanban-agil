# Funcionalidades

O Kanban Ágil é uma aplicação rica em funcionalidades, projetada para uma experiência de usuário fluida e completa.

### 1. Sistema de Autenticação
- **Tela de Login Segura:** Acesso à aplicação protegido por usuário e chave de acesso.
- **Sessões baseadas em Token:** Após o login, um token de sessão é gerado e armazenado em cache no servidor, com validade de 6 horas, garantindo a segurança em todas as requisições subsequentes.

### 2. Quadro Kanban Dinâmico
- **Colunas Personalizáveis:** Os estágios do fluxo de trabalho (colunas) são lidos diretamente da aba "Configurações" da planilha, permitindo total personalização.
- **Arrastar e Soltar (Drag-and-Drop):** As tarefas podem ser movidas entre as colunas de forma intuitiva. A alteração de estágio é salva automaticamente no banco de dados.
- **Contadores de Tarefas:** Cada coluna exibe um contador com o número de tarefas atuais.

### 3. Gerenciamento de Tarefas
- **Criação e Edição via Modal:** Um modal completo permite a criação e edição de tarefas, com campos para título, descrição, projeto, responsável, prioridade, data limite e etiquetas.
- **Detalhes da Tarefa:** Clicar em um cartão abre um modal com uma visão detalhada, incluindo um histórico completo de todas as alterações de estágio.
- **Identificação Visual:** Os cartões possuem uma borda colorida para indicar a prioridade (Alta, Média, Baixa) e exibem as iniciais do responsável.

### 4. Comunicação e Colaboração
- **Mural de Avisos:** Um espaço para publicar comunicados para a equipe. Os avisos podem ter cores personalizadas, data de expiração e podem ser "fixados" para aparecerem com destaque.
- **Registro de Daily:** Uma seção dedicada para que os membros da equipe registrem suas atividades diárias, promovendo a transparência e a sincronia.

### 5. Gerenciamento de Usuários
- **Painel de Administração:** Uma seção dedicada permite criar, editar e visualizar todos os usuários do sistema.
- **Controle de Status:** É possível ativar ou desativar usuários. Usuários inativos não podem ser selecionados como responsáveis por novas tarefas.

### 6. Interface de Usuário (UI/UX)
- **Design Responsivo:** A aplicação se adapta a diferentes tamanhos de tela.
- **Tema Escuro e Claro:** O usuário pode alternar entre os temas, e sua preferência é salva localmente no navegador.
- **Feedback Visual:** A interface fornece feedback constante ao usuário, com indicadores de carregamento e notificações (toasts) para ações bem-sucedidas ou erros.