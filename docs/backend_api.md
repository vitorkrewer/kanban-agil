# Referência da API Backend

Esta seção documenta as funções do lado do servidor (`code.gs`) que são expostas e chamadas pelo frontend (`google.script.run`).

---

### `authenticate(username, clientKey)`
- **Descrição:** Verifica as credenciais do usuário e, se corretas, gera e retorna um token de sessão.
- **Parâmetros:**
    - `username` (String): O nome de usuário.
    - `clientKey` (String): A chave de acesso.
- **Retorna:** `Object` - `{ success: boolean, token: string | null }`.

---

### `obterDadosIniciais(token)`
- **Descrição:** Ponto de entrada otimizado para carregar todos os dados necessários para a inicialização da aplicação em uma única chamada.
- **Parâmetros:**
    - `token` (String): O token de sessão válido.
- **Retorna:** `Object` - Contendo os arrays: `{ tarefas: [], avisos: [], usuarios: [], dailies: [] }`.

---

### `testarConexao(token)`
- **Descrição:** Verifica se a conexão com a planilha configurada está funcionando.
- **Parâmetros:**
    - `token` (String): O token de sessão válido.
- **Retorna:** `Object` - `{ status: "sucesso" | "erro" | "aviso", mensagem: string }`.

---

### `obterConfiguracoes(token)`
- **Descrição:** Lê e retorna as configurações da aba "Configurações" da planilha.
- **Parâmetros:**
    - `token` (String): O token de sessão válido.
- **Retorna:** `Object` - Um objeto chave-valor com as configurações (ex: `{ estagios: "...", cores_prioridade: "..." }`).

---

### CRUD de Tarefas
- `criarTarefa(token, tarefaObject)`
- `atualizarTarefa(token, tarefaObject)`
- `atualizarEstagioTarefa(token, tarefaId, novoEstagio)`

---

### CRUD de Avisos
- `criarAviso(token, avisoObject)`
- `atualizarAviso(token, avisoObject)`
- `removerAviso(token, avisoId)`

---

### CRUD de Usuários
- `criarUsuario(token, usuarioObject)`
- `atualizarUsuario(token, usuarioObject)`

---

### CRUD de Dailies
- `criarDaily(token, dailyObject)`
- `atualizarDaily(token, dailyObject)`