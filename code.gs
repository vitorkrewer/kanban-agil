/**
 * Arquivo principal do Google Apps Script para o Quadro Kanban Ágil
 */

// ID da planilha - deve ser configurado nas propriedades do script
let SPREADSHEET_ID = '';


// =================== CONFIGURAÇÃO DO WEB APP ===================
/**
 * Função para configurar o web app
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Quadro Kanban Ágil')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Função para incluir arquivos HTML/CSS/JS no template HTML principal
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =================== FUNÇÕES DE SERVIÇO ===================
/**
 * Obtém todos os dados iniciais (tarefas, usuários, avisos, dailies) em uma única chamada de servidor.
 * @param {string} token - O token de sessão para validação.
 * @returns {object} Um objeto contendo todos os dados necessários para a aplicação.
 */
function obterDadosIniciais(token) {
  if (!isTokenValid(token)) {
    throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  }

  try {
    // Busca todos os dados em sequência. A otimização aqui é evitar múltiplas viagens do cliente para o servidor.
    const tarefas = obterTarefas(token);
    const avisos = obterAvisos(token);
    const usuarios = obterUsuarios(token);
    
    // Filtro para os Dailies de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera o horário para pegar o dia todo
    const filtrosDaily = { Data: hoje.toISOString().split('T')[0] }; // Formato YYYY-MM-DD
    const dailies = obterDailies(token, filtrosDaily);

    Logger.log("Dados iniciais agrupados e prontos para serem enviados.");

    // Retorna um único objeto com todos os dados
    return {
      tarefas: tarefas,
      avisos: avisos,
      usuarios: usuarios,
      dailies: dailies
    };

  } catch (e) {
    Logger.log("Erro ao obter dados iniciais agrupados: " + e.toString());
    // Propaga o erro para ser tratado no frontend
    throw new Error("Falha ao carregar dados da aplicação: " + e.message);
  }
}

// =================== LÓGICA DE AUTENTICAÇÃO ===================
/**
 * @description Verifica o usuário e a chave e, se corretos, gera um token de sessão.
 * @param {string} username - O nome de usuário inserido.
 * @param {string} clientKey - A chave inserida.
 * @returns {object} Um objeto com o status do sucesso e o token, se aplicável.
 */
function authenticate(username, clientKey) {
  const usersJSON = PropertiesService.getScriptProperties().getProperty('USER_KEYS');
  
  if (!usersJSON) {
    throw new Error("As chaves de usuário ainda não foram configuradas. Rode a função 'setupUserKeys' no editor.");
  }

  const users = JSON.parse(usersJSON);
  const foundUser = users.find(u => u.user === username);

  if (foundUser && foundUser.key === clientKey) {
    const token = Utilities.getUuid();
    // Armazena o token em cache por 6 horas, associado ao nome de usuário.
    CacheService.getScriptCache().put(token, username, 21600); 
    Logger.log(`Autenticação bem-sucedida para o usuário '${username}'. Token gerado.`);
    return { success: true, token: token };
  } else {
    Logger.log(`Tentativa de autenticação falhou para o usuário '${username}'.`);
    return { success: false };
  }
}

/**
 * @description Função auxiliar para validar um token de sessão.
 * @param {string} token - O token de sessão a ser validado.
 * @returns {boolean} Verdadeiro se o token for válido.
 */
function isTokenValid(token) {
  if (!token) return false;
  const isValid = CacheService.getScriptCache().get(token) !== null;
  if (!isValid) {
    Logger.log('Token inválido ou expirado: ' + token);
  }
  return isValid;
}


/**
 * Função para inicializar as propriedades do script
 */
function inicializarPropriedades(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');
    
    if (!SPREADSHEET_ID) {
      Logger.log('AVISO: ID da planilha não configurado nas propriedades do script.');
      return false;
    }
    return true;
  } catch (e) {
    Logger.log('Erro ao inicializar propriedades: ' + e.toString());
    return false;
  }
}

/**
 * Função para obter a planilha
 */
function obterPlanilha(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    if (!inicializarPropriedades(token)) {
      throw new Error('ID da planilha não configurado. Configure o ID da planilha nas propriedades do script.');
    }
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    Logger.log('Erro ao obter planilha: ' + e.toString());
    throw e;
  }
}

/**
 * Função para testar a conexão com o backend
 */
function testarConexao(token) {
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      return {
        status: "aviso",
        mensagem: "ID da planilha não configurado nas propriedades do script."
      };
    }
    
    // Tentar abrir a planilha
    var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    return {
      status: "sucesso",
      mensagem: "Conexão estabelecida com sucesso.",
      nome_planilha: planilha.getName(),
      id_planilha: SPREADSHEET_ID
    };
  } catch (e) {
    Logger.log("Erro no teste de conexão: " + e.toString());
    return {
      status: "erro",
      mensagem: "Erro ao conectar com a planilha: " + e.message
    };
  }
}

/**
 * Função auxiliar para converter objetos Date para strings ISO
 * Isso é necessário para garantir a serialização correta ao retornar para o frontend
 */
function converterDatasParaString(token, obj) { // <-- Adicionado token aqui
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => converterDatasParaString(token, item)); // <-- CORRIGIDO
  }
  
  if (typeof obj === 'object') {
    const newObj = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[key] = converterDatasParaString(token, obj[key]); // <-- CORRIGIDO
      }
    }
    return newObj;
  }
  
  return obj;
}

/**
 * Função para verificar e corrigir problemas na estrutura da planilha
 */
function verificarECorrigirProblemas(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      return {
        status: "erro",
        mensagem: "ID da planilha não configurado nas propriedades do script."
      };
    }
    
    var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    var problemas = [];
    var correcoes = [];
    
    // Verificar e criar abas necessárias
    var abasNecessarias = ['Tarefas', 'Avisos', 'Usuários', 'Configurações', 'Daily'];
    var abasExistentes = [];
    
    // Listar abas existentes
    var todasAbas = planilha.getSheets();
    for (var i = 0; i < todasAbas.length; i++) {
      abasExistentes.push(todasAbas[i].getName());
    }
    
    // Verificar abas faltantes
    for (var i = 0; i < abasNecessarias.length; i++) {
      var aba = abasNecessarias[i];
      if (abasExistentes.indexOf(aba) === -1) {
        problemas.push("Aba '" + aba + "' não encontrada.");
        
        // Criar aba faltante
        switch (aba) {
          case 'Tarefas':
            criarAbaTarefas(planilha);
            break;
          case 'Avisos':
            criarAbaAvisos(planilha);
            break;
          case 'Usuários':
            criarAbaUsuarios(planilha);
            break;
          case 'Configurações':
            criarAbaConfiguracoes(planilha);
            break;
          case 'Daily':
            criarAbaDaily(planilha);
            break;
        }
        
        correcoes.push("Aba '" + aba + "' criada com sucesso.");
      }
    }
    
    // Verificar colunas em cada aba
    var abaTarefas = planilha.getSheetByName('Tarefas');
    if (abaTarefas) {
      var cabecalhoTarefas = abaTarefas.getRange(1, 1, 1, abaTarefas.getLastColumn()).getValues()[0];
      var colunasTarefas = ['ID', 'Título', 'Descrição', 'Responsável', 'Email', 'Estágio', 
                           'Prioridade', 'Data Criação', 'Data Atualização', 'Data Limite', 
                           'Etiquetas', 'Cor', 'Histórico', 'Projeto', 'Feedback'];
      
      for (var i = 0; i < colunasTarefas.length; i++) {
        if (cabecalhoTarefas.indexOf(colunasTarefas[i]) === -1) {
          problemas.push("Coluna '" + colunasTarefas[i] + "' não encontrada na aba Tarefas.");
          
          // Adicionar coluna faltante
          var novosCabecalhos = cabecalhoTarefas.slice();
          novosCabecalhos.push(colunasTarefas[i]);
          abaTarefas.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
          
          correcoes.push("Coluna '" + colunasTarefas[i] + "' adicionada à aba Tarefas.");
          
          // Atualizar cabecalho para próximas verificações
          cabecalhoTarefas = novosCabecalhos;
        }
      }
    }
    
    // Verificar colunas na aba Usuários
    var abaUsuarios = planilha.getSheetByName('Usuários');
    if (abaUsuarios) {
      var cabecalhoUsuarios = abaUsuarios.getRange(1, 1, 1, abaUsuarios.getLastColumn()).getValues()[0];
      var colunasUsuarios = ['ID', 'Nome Completo', 'Email', 'Situação', 
                            'Data de Admissão', 'Data de Encerramento', 'Equipe'];
      
      for (var i = 0; i < colunasUsuarios.length; i++) {
        if (cabecalhoUsuarios.indexOf(colunasUsuarios[i]) === -1) {
          problemas.push("Coluna '" + colunasUsuarios[i] + "' não encontrada na aba Usuários.");
          
          // Adicionar coluna faltante
          var novosCabecalhos = cabecalhoUsuarios.slice();
          novosCabecalhos.push(colunasUsuarios[i]);
          abaUsuarios.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
          
          correcoes.push("Coluna '" + colunasUsuarios[i] + "' adicionada à aba Usuários.");
          
          // Atualizar cabecalho para próximas verificações
          cabecalhoUsuarios = novosCabecalhos;
        }
      }
    }
    
    // Verificar colunas na aba Daily
    var abaDaily = planilha.getSheetByName('Daily');
    if (abaDaily) {
      var cabecalhoDaily = abaDaily.getRange(1, 1, 1, abaDaily.getLastColumn()).getValues()[0];
      var colunasDaily = ['ID', 'ID do Usuário', 'Nome do Usuário', 'Data', 'Conteúdo', 'Data Criação'];
      
      for (var i = 0; i < colunasDaily.length; i++) {
        if (cabecalhoDaily.indexOf(colunasDaily[i]) === -1) {
          problemas.push("Coluna '" + colunasDaily[i] + "' não encontrada na aba Daily.");
          
          // Adicionar coluna faltante
          var novosCabecalhos = cabecalhoDaily.slice();
          novosCabecalhos.push(colunasDaily[i]);
          abaDaily.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
          
          correcoes.push("Coluna '" + colunasDaily[i] + "' adicionada à aba Daily.");
          
          // Atualizar cabecalho para próximas verificações
          cabecalhoDaily = novosCabecalhos;
        }
      }
    }
    
    return {
      status: problemas.length > 0 ? "corrigido" : "ok",
      problemas: problemas,
      correcoes: correcoes,
      mensagem: problemas.length > 0 ? 
        "Foram encontrados e corrigidos " + problemas.length + " problemas." : 
        "Nenhum problema encontrado na estrutura da planilha."
    };
  } catch (e) {
    Logger.log("Erro ao verificar e corrigir problemas: " + e.toString());
    return {
      status: "erro",
      mensagem: "Erro ao verificar e corrigir problemas: " + e.message
    };
  }
}


/**
 * Função para obter as configurações do aplicativo da aba 'Configurações'
 */
function obterConfiguracoes(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaConfig = planilha.getSheetByName('Configurações');
    
    if (!abaConfig) {
      // Criar aba de configurações se não existir
      abaConfig = criarAbaConfiguracoes(planilha);
    }
    
    var dados = abaConfig.getDataRange().getValues();
    var config = {};
    
    // Pular a linha de cabeçalho
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][0]) { // Ignorar linhas sem chave
        config[dados[i][0]] = dados[i][1];
      }
    }
    
    Logger.log("Configurações obtidas com sucesso: " + JSON.stringify(config));
    return config;
  } catch (e) {
    Logger.log("Erro ao obter configurações: " + e.toString());
    // Retornar configurações padrão em caso de erro
    return {
      estagios: 'Backlog,A Fazer,Em Andamento,Em Revisão,Concluído',
      cores_prioridade: '#ff4d4d,#ffcc00,#4da6ff',
      limite_avisos: '10',
      versao: '1.0 (Padrão)'
    };
  }
}

/**
 * Função para criar a aba de configurações com valores padrão
 */
function criarAbaConfiguracoes(token, planilha) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var abaConfig = planilha.insertSheet('Configurações');
  
  // Definir cabeçalhos
  abaConfig.getRange('A1:C1').setValues([['Chave', 'Valor', 'Descrição']]);
  
  // Definir configurações padrão
  var configPadrao = [
    ['estagios', 'Backlog,A Fazer,Em Andamento,Em Revisão,Concluído', 'Lista de estágios do quadro Kanban, separados por vírgula'],
    ['cores_prioridade', '#ff4d4d,#ffcc00,#4da6ff', 'Cores para prioridades Alta, Média e Baixa, separadas por vírgula'],
    ['limite_avisos', '5', 'Número máximo de avisos exibidos no mural'],
    ['versao', '1.0', 'Versão atual do sistema']
  ];
  
  abaConfig.getRange(2, 1, configPadrao.length, 3).setValues(configPadrao);
  
  // Formatar cabeçalho
  abaConfig.getRange('A1:C1').setFontWeight('bold');
  abaConfig.setFrozenRows(1);
  
  // Ajustar largura das colunas
  abaConfig.setColumnWidth(1, 150);
  abaConfig.setColumnWidth(2, 300);
  abaConfig.setColumnWidth(3, 400);
  
  Logger.log("Aba 'Configurações' criada com sucesso.");
  return abaConfig;
}

/**
 * Função para obter todas as tarefas da aba 'Tarefas'
 */
function obterTarefas(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      Logger.log("ID da planilha não configurado, retornando array vazio para tarefas");
      return []; // Retornar array vazio, nunca null
    }
    
    var planilha;
    try {
      planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Erro ao abrir planilha para obter tarefas: " + e.toString());
      return []; // Retornar array vazio, nunca null
    }
    
    var abaTarefas = planilha.getSheetByName('Tarefas');
    
    if (!abaTarefas) {
      // Criar aba de tarefas se não existir
      Logger.log("Aba 'Tarefas' não encontrada, criando nova aba.");
      abaTarefas = criarAbaTarefas(planilha);
      return []; // Retornar array vazio pois não há tarefas ainda
    }
    
    var dados = abaTarefas.getDataRange().getValues();
    
    // Verificar se há dados além do cabeçalho
    if (dados.length <= 1) {
      Logger.log("Nenhuma tarefa encontrada na aba 'Tarefas', retornando array vazio.");
      return [];
    }
    
    var tarefas = [];
    
    // Obter índices das colunas pelo cabeçalho
    var cabecalho = dados[0];
    var indices = {};
    for (var i = 0; i < cabecalho.length; i++) {
      indices[cabecalho[i]] = i;
    }
    
    // Pular a linha de cabeçalho
    for (var i = 1; i < dados.length; i++) {
      var tarefa = {};
      
      // Mapear cada coluna para a propriedade correspondente
      for (var coluna in indices) {
        if (indices.hasOwnProperty(coluna)) {
          var valor = dados[i][indices[coluna]];
          tarefa[coluna] = valor; // Manter o tipo original por enquanto
        }
      }
      
      // Adicionar apenas se a tarefa tiver um ID (evitar linhas vazias)
      if (tarefa.ID) {
          tarefas.push(tarefa);
      }
    }
    
    Logger.log("Tarefas obtidas com sucesso: " + tarefas.length + " tarefas encontradas.");
    
    // Verificar se há dados nas tarefas
    if (tarefas.length > 0) {
      Logger.log("Exemplo da primeira tarefa (antes da serialização): " + JSON.stringify(tarefas[0]));
    }
    
    // Converter todos os objetos Date para strings antes de retornar
    var tarefasSerializaveis = converterDatasParaString(token, tarefas);
    
    return tarefasSerializaveis;
  } catch (e) {
    Logger.log("Erro ao obter tarefas: " + e.toString() + "\nStack: " + e.stack);
    return []; // Retornar array vazio em caso de erro, nunca null
  }
}

/**
 * Função para criar a aba de tarefas com as colunas corretas
 */
function criarAbaTarefas(token, planilha) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var abaTarefas = planilha.insertSheet('Tarefas');
  
  // Definir cabeçalhos
  var cabecalhos = [
    'ID', 'Título', 'Descrição', 'Responsável', 'Email', 'Estágio', 
    'Prioridade', 'Data Criação', 'Data Atualização', 'Data Limite', 
    'Etiquetas', 'Cor', 'Histórico', 'Projeto', 'Feedback'
  ];
  
  abaTarefas.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  
  // Formatar cabeçalho
  abaTarefas.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  abaTarefas.setFrozenRows(1);
  
  // Ajustar largura das colunas
  abaTarefas.setColumnWidth(1, 250); // ID
  abaTarefas.setColumnWidth(2, 200); // Título
  abaTarefas.setColumnWidth(3, 300); // Descrição
  abaTarefas.setColumnWidth(4, 150); // Responsável (ID do usuário)
  abaTarefas.setColumnWidth(5, 200); // Email (do responsável)
  abaTarefas.setColumnWidth(6, 150); // Estágio
  abaTarefas.setColumnWidth(7, 100); // Prioridade
  abaTarefas.setColumnWidth(8, 150); // Data Criação
  abaTarefas.setColumnWidth(9, 150); // Data Atualização
  abaTarefas.setColumnWidth(10, 150); // Data Limite
  abaTarefas.setColumnWidth(11, 200); // Etiquetas
  abaTarefas.setColumnWidth(12, 100); // Cor (opcional)
  abaTarefas.setColumnWidth(13, 400); // Histórico (JSON)
  abaTarefas.setColumnWidth(14, 200); // Projeto
  abaTarefas.setColumnWidth(15, 400); // Feedback
  
  Logger.log("Aba 'Tarefas' criada com sucesso.");
  return abaTarefas;
}

/**
 * Função para criar uma nova tarefa
 */
function criarTarefa(token, tarefa) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaTarefas = planilha.getSheetByName('Tarefas');
    
    if (!abaTarefas) {
      abaTarefas = criarAbaTarefas(planilha);
    }
    
    // Gerar ID único
    tarefa.ID = Utilities.getUuid();
    
    // Definir datas
    var agora = new Date();
    tarefa['Data Criação'] = agora;
    tarefa['Data Atualização'] = agora;
    
    // Inicializar histórico
    tarefa.Histórico = JSON.stringify([{
      data: agora.toISOString(),
      acao: 'Criação',
      estagio: tarefa.Estágio
    }]);
    
    // Obter índices das colunas
    var cabecalho = abaTarefas.getRange(1, 1, 1, abaTarefas.getLastColumn()).getValues()[0];
    
    // Criar array com os valores na ordem correta do cabeçalho
    var valores = cabecalho.map(function(coluna) {
      // Tratar Data Limite que pode ser null ou string vazia
      if (coluna === 'Data Limite' && !tarefa[coluna]) {
        return null; // Usar null para datas vazias na planilha
      }
      return tarefa[coluna] !== undefined ? tarefa[coluna] : ''; // Usar valor da tarefa ou string vazia
    });
    
    // Adicionar nova linha
    abaTarefas.appendRow(valores);
    
    Logger.log("Tarefa criada com sucesso: " + tarefa.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var tarefaSerializavel = converterDatasParaString(token, tarefa);
    
    // Retornar a tarefa criada para atualizar o frontend
    return tarefaSerializavel;
  } catch (e) {
    Logger.log("Erro ao criar tarefa: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao criar tarefa: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para atualizar uma tarefa existente
 */
function atualizarTarefa(token,tarefa) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaTarefas = planilha.getSheetByName('Tarefas');
    
    if (!abaTarefas) {
      throw new Error('Aba de tarefas não encontrada');
    }
    
    // Verificar se todas as colunas necessárias existem
    var colunasNecessarias = ['Título', 'Descrição', 'Responsável', 'Email', 'Estágio', 
                             'Prioridade', 'Data Criação', 'Data Atualização', 'Data Limite', 
                             'Etiquetas', 'Cor', 'Histórico', 'Projeto', 'Feedback'];
    
    // Obter todas as tarefas
    var dados = abaTarefas.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Tarefas");

    // Verificar e adicionar colunas faltantes
    for (var i = 0; i < colunasNecessarias.length; i++) {
      var coluna = colunasNecessarias[i];
      if (cabecalho.indexOf(coluna) === -1) {
        // Adicionar coluna faltante
        var novosCabecalhos = cabecalho.slice();
        novosCabecalhos.push(coluna);
        abaTarefas.getRange(1, 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
        
        // Atualizar cabecalho para próximas verificações
        cabecalho = novosCabecalhos;
        
        Logger.log("Coluna '" + coluna + "' adicionada à aba Tarefas.");
      }
    }
    
    // Encontrar índice da tarefa pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === tarefa.ID) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Tarefa com ID ' + tarefa.ID + ' não encontrada para atualização');
    }
    
    // Obter histórico atual
    var historicoIndex = cabecalho.indexOf('Histórico');
    var historicoAtual = '';
    
    if (historicoIndex !== -1 && linhaIndex < dados.length && dados[linhaIndex].length > historicoIndex) {
      historicoAtual = dados[linhaIndex][historicoIndex] || '[]';
    } else {
      historicoAtual = '[]';
    }
    
    var historico = [];
    
    try {
      historico = JSON.parse(historicoAtual) || [];
      if (!Array.isArray(historico)) historico = []; // Garantir que é um array
    } catch (e) {
      Logger.log("Erro ao parsear histórico da tarefa " + tarefa.ID + ": " + e.toString());
      historico = [];
    }
    
    // Verificar se houve mudança de estágio
    var estagioIndex = cabecalho.indexOf('Estágio');
    var estagioAntigo = '';
    
    if (estagioIndex !== -1 && linhaIndex < dados.length && dados[linhaIndex].length > estagioIndex) {
      estagioAntigo = dados[linhaIndex][estagioIndex] || '';
    }
    
    if (estagioAntigo && tarefa.Estágio && tarefa.Estágio !== estagioAntigo) {
      // Adicionar entrada ao histórico
      historico.push({
        data: new Date().toISOString(),
        acao: 'Mudança de Estágio',
        de: estagioAntigo,
        para: tarefa.Estágio
      });
      tarefa.Histórico = JSON.stringify(historico);
    } else {
      // Manter histórico como string se não houve mudança
      tarefa.Histórico = historicoAtual;
    }
    
    // Atualizar data de atualização
    tarefa['Data Atualização'] = new Date();
    
    // Criar array com os valores atualizados na ordem correta do cabeçalho
    var valores = [];
    
    for (var i = 0; i < cabecalho.length; i++) {
      var coluna = cabecalho[i];
      
      // Tratar Data Limite que pode ser null ou string vazia
      if (coluna === 'Data Limite' && !tarefa[coluna]) {
        valores.push(null); // Usar null para datas vazias na planilha
        continue;
      }
      
      // Usar valor atualizado da tarefa se existir
      if (tarefa[coluna] !== undefined) {
        valores.push(tarefa[coluna]);
        continue;
      }
      
      // Manter o valor antigo se existir
      if (linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
      } else {
        valores.push(''); // Valor padrão se não existir
      }
    }
    
    // Atualizar linha (linhaIndex + 1 porque dados[0] é o cabeçalho)
    abaTarefas.getRange(linhaIndex + 1, 1, 1, valores.length).setValues([valores]);
    
    Logger.log("Tarefa atualizada com sucesso: " + tarefa.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var tarefaSerializavel = converterDatasParaString(token, tarefa);
    
    // Retornar a tarefa atualizada para atualizar o frontend
    return tarefaSerializavel;
  } catch (e) {
    Logger.log("Erro ao atualizar tarefa: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao atualizar tarefa: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para atualizar apenas o estágio de uma tarefa (usado pelo drag-and-drop)
 */
function atualizarEstagioTarefa(token,tarefaId, novoEstagio) {
 if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaTarefas = planilha.getSheetByName('Tarefas');
    
    if (!abaTarefas) {
      throw new Error('Aba de tarefas não encontrada');
    }
    
    // Obter todas as tarefas
    var dados = abaTarefas.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Tarefas");

    // Encontrar índice da tarefa pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === tarefaId) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Tarefa com ID ' + tarefaId + ' não encontrada para atualização de estágio');
    }
    
    // Obter índices das colunas relevantes
    var estagioIndex = cabecalho.indexOf('Estágio');
    var dataAtualizacaoIndex = cabecalho.indexOf('Data Atualização');
    var historicoIndex = cabecalho.indexOf('Histórico');
    
    if (estagioIndex === -1 || dataAtualizacaoIndex === -1 || historicoIndex === -1) {
        throw new Error("Colunas 'Estágio', 'Data Atualização' ou 'Histórico' não encontradas.");
    }
    
    // Obter estágio atual
    var estagioAtual = '';
    if (linhaIndex < dados.length && estagioIndex < dados[linhaIndex].length) {
      estagioAtual = dados[linhaIndex][estagioIndex] || '';
    }
    
    // Obter histórico atual
    var historicoAtual = '';
    if (linhaIndex < dados.length && historicoIndex < dados[linhaIndex].length) {
      historicoAtual = dados[linhaIndex][historicoIndex] || '[]';
    } else {
      historicoAtual = '[]';
    }
    
    var historico = [];
    
    try {
      historico = JSON.parse(historicoAtual) || [];
      if (!Array.isArray(historico)) historico = []; // Garantir que é um array
    } catch (e) {
      Logger.log("Erro ao parsear histórico da tarefa " + tarefaId + ": " + e.toString());
      historico = [];
    }
    
    // Adicionar entrada ao histórico
    historico.push({
      data: new Date().toISOString(),
      acao: 'Mudança de Estágio',
      de: estagioAtual,
      para: novoEstagio
    });
    
    // Atualizar células específicas
    var linhaPlanilha = linhaIndex + 1; // +1 porque getRange é 1-based
    abaTarefas.getRange(linhaPlanilha, estagioIndex + 1).setValue(novoEstagio);
    abaTarefas.getRange(linhaPlanilha, dataAtualizacaoIndex + 1).setValue(new Date());
    abaTarefas.getRange(linhaPlanilha, historicoIndex + 1).setValue(JSON.stringify(historico));
    
    Logger.log("Estágio da tarefa atualizado com sucesso via drag-and-drop: " + tarefaId + " -> " + novoEstagio);
    
    return true;
  } catch (e) {
    Logger.log("Erro ao atualizar estágio da tarefa: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao atualizar estágio da tarefa: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para obter todos os avisos da aba 'Avisos'
 */
function obterAvisos(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      Logger.log("ID da planilha não configurado, retornando array vazio para avisos");
      return []; // Retornar array vazio, nunca null
    }
    
    var planilha;
    try {
      planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Erro ao abrir planilha para obter avisos: " + e.toString());
      return []; // Retornar array vazio, nunca null
    }
    
    var abaAvisos = planilha.getSheetByName('Avisos');
    
    if (!abaAvisos) {
      // Criar aba de avisos se não existir
      abaAvisos = criarAbaAvisos(planilha);
      Logger.log("Aba 'Avisos' criada, retornando array vazio.");
      return []; // Retornar array vazio pois não há avisos ainda
    }
    
    var dados = abaAvisos.getDataRange().getValues();
    
    // Verificar se há dados além do cabeçalho
    if (dados.length <= 1) {
      Logger.log("Nenhum aviso encontrado na aba 'Avisos', retornando array vazio.");
      return [];
    }
    
    var avisos = [];
    
    // Obter índices das colunas
    var cabecalho = dados[0];
    var indices = {};
    for (var i = 0; i < cabecalho.length; i++) {
      indices[cabecalho[i]] = i;
    }
    
    // Pular a linha de cabeçalho
    for (var i = 1; i < dados.length; i++) {
      var aviso = {};
      
      // Mapear cada coluna para a propriedade correspondente
      for (var coluna in indices) {
        if (indices.hasOwnProperty(coluna)) {
          var valor = dados[i][indices[coluna]];
          aviso[coluna] = valor;
        }
      }
      
      // Verificar se o aviso expirou (se houver data de expiração)
      if (aviso['Data Expiração'] && aviso['Data Expiração'] instanceof Date) {
        if (aviso['Data Expiração'] < new Date()) {
          continue; // Pular avisos expirados
        }
      }
      
      // Adicionar apenas se tiver ID
      if (aviso.ID) {
          avisos.push(aviso);
      }
    }
    
    Logger.log("Avisos obtidos com sucesso: " + avisos.length + " avisos encontrados.");
    
    // Verificar se há dados nos avisos
    if (avisos.length > 0) {
      Logger.log("Exemplo do primeiro aviso (antes da serialização): " + JSON.stringify(avisos[0]));
    }
    
    // Converter todos os objetos Date para strings antes de retornar
    var avisosSerializaveis = converterDatasParaString(token, avisos);
    
    return avisosSerializaveis;
  } catch (e) {
    Logger.log("Erro ao obter avisos: " + e.toString() + "\nStack: " + e.stack);
    return []; // Retornar array vazio em caso de erro, nunca null
  }
}

/**
 * Função para criar a aba de avisos
 */
function criarAbaAvisos(token,planilha) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var abaAvisos = planilha.insertSheet('Avisos');
  
  // Definir cabeçalhos
  var cabecalhos = [
    'ID', 'Título', 'Conteúdo', 'Autor', 'Data Criação', 
    'Data Expiração', 'Cor', 'Fixado'
  ];
  
  abaAvisos.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  
  // Formatar cabeçalho
  abaAvisos.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  abaAvisos.setFrozenRows(1);
  
  // Ajustar largura das colunas
  abaAvisos.setColumnWidth(1, 250); // ID
  abaAvisos.setColumnWidth(2, 200); // Título
  abaAvisos.setColumnWidth(3, 400); // Conteúdo
  abaAvisos.setColumnWidth(4, 150); // Autor
  abaAvisos.setColumnWidth(5, 150); // Data Criação
  abaAvisos.setColumnWidth(6, 150); // Data Expiração
  abaAvisos.setColumnWidth(7, 100); // Cor
  abaAvisos.setColumnWidth(8, 100); // Fixado (TRUE/FALSE)
  
  Logger.log("Aba 'Avisos' criada com sucesso.");
  return abaAvisos;
}

/**
 * Função para criar um novo aviso
 */
function criarAviso(token, aviso) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaAvisos = planilha.getSheetByName('Avisos');
    
    if (!abaAvisos) {
      abaAvisos = criarAbaAvisos(planilha);
    }
    
    // Gerar ID único
    aviso.ID = Utilities.getUuid();
    
    // Definir data de criação
    aviso['Data Criação'] = new Date();
    
    // Converter checkbox para booleano (TRUE/FALSE)
    aviso.Fixado = !!aviso.Fixado;
    
    // Obter índices das colunas
    var cabecalho = abaAvisos.getRange(1, 1, 1, abaAvisos.getLastColumn()).getValues()[0];
    
    // Criar array com os valores na ordem correta
    var valores = cabecalho.map(function(coluna) {
      // Tratar Data Expiração que pode ser null ou string vazia
      if (coluna === 'Data Expiração' && !aviso[coluna]) {
        return null; // Usar null para datas vazias na planilha
      }
      return aviso[coluna] !== undefined ? aviso[coluna] : '';
    });
    
    // Adicionar nova linha
    abaAvisos.appendRow(valores);
    
    Logger.log("Aviso criado com sucesso: " + aviso.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var avisoSerializavel = converterDatasParaString(aviso);
    
    // Retornar o aviso criado para atualizar o frontend
    return avisoSerializavel;
  } catch (e) {
    Logger.log("Erro ao criar aviso: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao criar aviso: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para atualizar um aviso existente
 */
function atualizarAviso(token, aviso) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaAvisos = planilha.getSheetByName('Avisos');
    
    if (!abaAvisos) {
      throw new Error('Aba de avisos não encontrada');
    }
    
    // Obter todos os avisos
    var dados = abaAvisos.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Avisos");

    // Encontrar índice do aviso pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === aviso.ID) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Aviso com ID ' + aviso.ID + ' não encontrado para atualização');
    }
    
    // Converter checkbox para booleano
    aviso.Fixado = !!aviso.Fixado;
    
    // Criar array com os valores atualizados na ordem correta
    var valores = [];
    
    for (var i = 0; i < cabecalho.length; i++) {
      var coluna = cabecalho[i];
      
      // Manter a data de criação original
      if (coluna === 'Data Criação' && linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
        continue;
      }
      
      // Tratar Data Expiração que pode ser null ou string vazia
      if (coluna === 'Data Expiração' && !aviso[coluna]) {
        valores.push(null); // Usar null para datas vazias na planilha
        continue;
      }
      
      // Usar valor atualizado do aviso se existir
      if (aviso[coluna] !== undefined) {
        valores.push(aviso[coluna]);
        continue;
      }
      
      // Manter o valor antigo se existir
      if (linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
      } else {
        valores.push(''); // Valor padrão se não existir
      }
    }
    
    // Atualizar linha (linhaIndex + 1 porque dados[0] é o cabeçalho)
    abaAvisos.getRange(linhaIndex + 1, 1, 1, valores.length).setValues([valores]);
    
    Logger.log("Aviso atualizado com sucesso: " + aviso.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var avisoSerializavel = converterDatasParaString(aviso);
    
    // Retornar o aviso atualizado para atualizar o frontend
    return avisoSerializavel;
  } catch (e) {
    Logger.log("Erro ao atualizar aviso: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao atualizar aviso: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para remover um aviso
 */
function removerAviso(token, avisoId) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaAvisos = planilha.getSheetByName('Avisos');
    
    if (!abaAvisos) {
      throw new Error('Aba de avisos não encontrada');
    }
    
    // Obter todos os avisos
    var dados = abaAvisos.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Avisos");

    // Encontrar índice do aviso pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === avisoId) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Aviso com ID ' + avisoId + ' não encontrado para remoção');
    }
    
    // Remover linha (linhaIndex + 1 porque deleteRow é 1-based e dados[0] é cabeçalho)
    abaAvisos.deleteRow(linhaIndex + 1);
    
    Logger.log("Aviso removido com sucesso: " + avisoId);
    
    return true;
  } catch (e) {
    Logger.log("Erro ao remover aviso: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao remover aviso: " + e.message); // Propagar erro para o frontend
  }
}

// --- Funções para Usuários ---

/**
 * Função para criar a aba de usuários
 */
function criarAbaUsuarios(token, planilha) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var abaUsuarios = planilha.insertSheet('Usuários');
  
  // Definir cabeçalhos
  var cabecalhos = [
    'ID', 'Nome Completo', 'Email', 'Situação', 
    'Data de Admissão', 'Data de Encerramento', 'Equipe'
  ];
  
  abaUsuarios.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  
  // Formatar cabeçalho
  abaUsuarios.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  abaUsuarios.setFrozenRows(1);
  
  // Ajustar largura das colunas
  abaUsuarios.setColumnWidth(1, 250); // ID
  abaUsuarios.setColumnWidth(2, 250); // Nome Completo
  abaUsuarios.setColumnWidth(3, 250); // Email
  abaUsuarios.setColumnWidth(4, 100); // Situação (Ativo/Inativo)
  abaUsuarios.setColumnWidth(5, 150); // Data de Admissão
  abaUsuarios.setColumnWidth(6, 150); // Data de Encerramento
  abaUsuarios.setColumnWidth(7, 150); // Equipe
  
  Logger.log("Aba 'Usuários' criada com sucesso.");
  return abaUsuarios;
}

/**
 * Função para obter todos os usuários da aba 'Usuários'
 */
function obterUsuarios(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      Logger.log("ID da planilha não configurado, retornando array vazio para usuários");
      return []; // Retornar array vazio, nunca null
    }
    
    var planilha;
    try {
      planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Erro ao abrir planilha para obter usuários: " + e.toString());
      return []; // Retornar array vazio, nunca null
    }
    
    var abaUsuarios = planilha.getSheetByName('Usuários');
    
    if (!abaUsuarios) {
      // Criar aba de usuários se não existir
      abaUsuarios = criarAbaUsuarios(planilha);
      Logger.log("Aba 'Usuários' criada, retornando array vazio.");
      return []; // Retornar array vazio pois não há usuários ainda
    }
    
    var dados = abaUsuarios.getDataRange().getValues();
    
    // Verificar se há dados além do cabeçalho
    if (dados.length <= 1) {
      Logger.log("Nenhum usuário encontrado na aba 'Usuários', retornando array vazio.");
      return [];
    }
    
    var usuarios = [];
    
    // Obter índices das colunas
    var cabecalho = dados[0];
    var indices = {};
    for (var i = 0; i < cabecalho.length; i++) {
      indices[cabecalho[i]] = i;
    }
    
    // Pular a linha de cabeçalho
    for (var i = 1; i < dados.length; i++) {
      var usuario = {};
      
      // Mapear cada coluna para a propriedade correspondente
      for (var coluna in indices) {
        if (indices.hasOwnProperty(coluna)) {
          var valor = dados[i][indices[coluna]];
          usuario[coluna] = valor;
        }
      }
      
      // Adicionar apenas se tiver ID
      if (usuario.ID) {
          usuarios.push(usuario);
      }
    }
    
    Logger.log("Usuários obtidos com sucesso: " + usuarios.length + " usuários encontrados.");
    
    // Converter todos os objetos Date para strings antes de retornar
    var usuariosSerializaveis = converterDatasParaString(token, usuarios);
    
    return usuariosSerializaveis;
  } catch (e) {
    Logger.log("Erro ao obter usuários: " + e.toString() + "\nStack: " + e.stack);
    return []; // Retornar array vazio em caso de erro, nunca null
  }
}

/**
 * Função para obter apenas usuários ativos
 */
function obterUsuariosAtivos(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var usuarios = obterUsuarios();
  return usuarios.filter(function(usuario) {
    // Retorna true se o usuário existir e a Situação for 'Ativo'
    return usuario && usuario.Situação === 'Ativo';
  });
}

/**
 * Função para criar um novo usuário
 */
function criarUsuario(token, usuario) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaUsuarios = planilha.getSheetByName('Usuários');
    
    if (!abaUsuarios) {
      abaUsuarios = criarAbaUsuarios(planilha);
    }
    
    // Inicializar o objeto usuário se não existir
    if (!usuario) {
      usuario = {};
    }
    
    // Gerar ID único
    usuario.ID = Utilities.getUuid();
    
    // Garantir que a situação seja Ativo ou Inativo
    if (usuario.Situação !== 'Ativo' && usuario.Situação !== 'Inativo') {
      usuario.Situação = 'Ativo'; // Padrão para Ativo se inválido
    }
    
    // Limpar data de encerramento se estiver ativo
    if (usuario.Situação === 'Ativo') {
      usuario['Data de Encerramento'] = null;
    }
    
    // Obter índices das colunas
    var cabecalho = abaUsuarios.getRange(1, 1, 1, abaUsuarios.getLastColumn()).getValues()[0];
    
    // Criar array com os valores na ordem correta
    var valores = cabecalho.map(function(coluna) {
      // Tratar datas que podem ser null ou string vazia
      if ((coluna === 'Data de Admissão' || coluna === 'Data de Encerramento') && !usuario[coluna]) {
        return null; // Usar null para datas vazias na planilha
      }
      return usuario[coluna] !== undefined ? usuario[coluna] : '';
    });
    
    // Adicionar nova linha
    abaUsuarios.appendRow(valores);
    
    Logger.log("Usuário criado com sucesso: " + usuario.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var usuarioSerializavel = converterDatasParaString(usuario);
    
    // Retornar o usuário criado para atualizar o frontend
    return usuarioSerializavel;
  } catch (e) {
    Logger.log("Erro ao criar usuário: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao criar usuário: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para atualizar um usuário existente
 */
function atualizarUsuario(token, usuario) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaUsuarios = planilha.getSheetByName('Usuários');
    
    if (!abaUsuarios) {
      throw new Error('Aba de usuários não encontrada');
    }
    
    // Obter todos os usuários
    var dados = abaUsuarios.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Usuários");

    // Encontrar índice do usuário pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === usuario.ID) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Usuário com ID ' + usuario.ID + ' não encontrado para atualização');
    }
    
    // Garantir que a situação seja Ativo ou Inativo
    if (usuario.Situação !== 'Ativo' && usuario.Situação !== 'Inativo') {
      usuario.Situação = 'Ativo'; // Padrão para Ativo se inválido
    }
    
    // Limpar data de encerramento se estiver ativo
    if (usuario.Situação === 'Ativo') {
      usuario['Data de Encerramento'] = null;
    }
    
    // Criar array com os valores atualizados na ordem correta
    var valores = [];
    
    for (var i = 0; i < cabecalho.length; i++) {
      var coluna = cabecalho[i];
      
      // Tratar datas que podem ser null ou string vazia
      if ((coluna === 'Data de Admissão' || coluna === 'Data de Encerramento') && !usuario[coluna]) {
        valores.push(null); // Usar null para datas vazias na planilha
        continue;
      }
      
      // Usar valor atualizado do usuário se existir
      if (usuario[coluna] !== undefined) {
        valores.push(usuario[coluna]);
        continue;
      }
      
      // Manter o valor antigo se existir
      if (linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
      } else {
        valores.push(''); // Valor padrão se não existir
      }
    }
    
    // Atualizar linha (linhaIndex + 1 porque dados[0] é o cabeçalho)
    abaUsuarios.getRange(linhaIndex + 1, 1, 1, valores.length).setValues([valores]);
    
    Logger.log("Usuário atualizado com sucesso: " + usuario.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var usuarioSerializavel = converterDatasParaString(usuario);
    
    // Retornar o usuário atualizado para atualizar o frontend
    return usuarioSerializavel;
  } catch (e) {
    Logger.log("Erro ao atualizar usuário: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao atualizar usuário: " + e.message); // Propagar erro para o frontend
  }
}

// --- Funções para Daily ---

/**
 * Função para criar a aba de Daily
 */
function criarAbaDaily(token, planilha) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  var abaDaily = planilha.insertSheet('Daily');
  
  // Definir cabeçalhos
  var cabecalhos = [
    'ID', 'ID do Usuário', 'Nome do Usuário', 'Data', 'Conteúdo', 'Data Criação'
  ];
  
  abaDaily.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  
  // Formatar cabeçalho
  abaDaily.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  abaDaily.setFrozenRows(1);
  
  // Ajustar largura das colunas
  abaDaily.setColumnWidth(1, 250); // ID
  abaDaily.setColumnWidth(2, 250); // ID do Usuário
  abaDaily.setColumnWidth(3, 200); // Nome do Usuário
  abaDaily.setColumnWidth(4, 150); // Data
  abaDaily.setColumnWidth(5, 400); // Conteúdo
  abaDaily.setColumnWidth(6, 150); // Data Criação
  
  Logger.log("Aba 'Daily' criada com sucesso.");
  return abaDaily;
}

/**
 * Função para obter todos os registros de Daily
 */
function obterDailies(token, filtros) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    // Verificar se o ID da planilha está configurado
    if (!inicializarPropriedades(token)) {
      Logger.log("ID da planilha não configurado, retornando array vazio para dailies");
      return []; // Retornar array vazio, nunca null
    }
    
    var planilha;
    try {
      planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Erro ao abrir planilha para obter dailies: " + e.toString());
      return []; // Retornar array vazio, nunca null
    }
    
    var abaDaily = planilha.getSheetByName('Daily');
    
    if (!abaDaily) {
      // Criar aba de Daily se não existir
      abaDaily = criarAbaDaily(planilha);
      Logger.log("Aba 'Daily' criada, retornando array vazio.");
      return []; // Retornar array vazio pois não há dailies ainda
    }
    
    var dados = abaDaily.getDataRange().getValues();
    
    // Verificar se há dados além do cabeçalho
    if (dados.length <= 1) {
      Logger.log("Nenhum registro de Daily encontrado, retornando array vazio.");
      return [];
    }
    
    var dailies = [];
    
    // Obter índices das colunas
    var cabecalho = dados[0];
    var indices = {};
    for (var i = 0; i < cabecalho.length; i++) {
      indices[cabecalho[i]] = i;
    }
    
    // Pular a linha de cabeçalho
    for (var i = 1; i < dados.length; i++) {
      var daily = {};
      
      // Mapear cada coluna para a propriedade correspondente
      for (var coluna in indices) {
        if (indices.hasOwnProperty(coluna)) {
          var valor = dados[i][indices[coluna]];
          daily[coluna] = valor;
        }
      }
      
      // Aplicar filtros se existirem
      if (filtros) {
        // Filtrar por ID do Usuário
        if (filtros['ID do Usuário'] && daily['ID do Usuário'] !== filtros['ID do Usuário']) {
          continue;
        }
        
        // Filtrar por Data
        if (filtros.Data && daily.Data instanceof Date) {
          var dataFiltro = new Date(filtros.Data);
          if (daily.Data.getFullYear() !== dataFiltro.getFullYear() ||
              daily.Data.getMonth() !== dataFiltro.getMonth() ||
              daily.Data.getDate() !== dataFiltro.getDate()) {
            continue;
          }
        }
      }
      
      // Adicionar apenas se tiver ID
      if (daily.ID) {
          dailies.push(daily);
      }
    }
    
    Logger.log("Dailies obtidos com sucesso: " + dailies.length + " registros encontrados.");
    
    // Converter todos os objetos Date para strings antes de retornar
    var dailiesSerializaveis = converterDatasParaString(token, dailies);
    
    return dailiesSerializaveis;
  } catch (e) {
    Logger.log("Erro ao obter dailies: " + e.toString() + "\nStack: " + e.stack);
    return []; // Retornar array vazio em caso de erro, nunca null
  }
}

/**
 * Função para criar um novo registro de Daily
 */
function criarDaily(token, daily) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaDaily = planilha.getSheetByName('Daily');
    
    if (!abaDaily) {
      abaDaily = criarAbaDaily(planilha);
    }
    
    // Inicializar o objeto daily se não existir
    if (!daily) {
      daily = {};
    }
    
    // Gerar ID único
    daily.ID = Utilities.getUuid();
    
    // Definir data de criação
    daily['Data Criação'] = new Date();
    
    // Obter nome do usuário se tiver ID do Usuário
    if (daily['ID do Usuário']) {
      var abaUsuarios = planilha.getSheetByName('Usuários');
      if (abaUsuarios) {
        var dadosUsuarios = abaUsuarios.getDataRange().getValues();
        var cabecalhoUsuarios = dadosUsuarios[0];
        var idIndex = cabecalhoUsuarios.indexOf('ID');
        var nomeIndex = cabecalhoUsuarios.indexOf('Nome Completo');
        
        if (idIndex !== -1 && nomeIndex !== -1) {
          for (var i = 1; i < dadosUsuarios.length; i++) {
            if (dadosUsuarios[i][idIndex] === daily['ID do Usuário']) {
              daily['Nome do Usuário'] = dadosUsuarios[i][nomeIndex];
              break;
            }
          }
        }
      }
    }
    
    // Obter índices das colunas
    var cabecalho = abaDaily.getRange(1, 1, 1, abaDaily.getLastColumn()).getValues()[0];
    
    // Criar array com os valores na ordem correta
    var valores = cabecalho.map(function(coluna) {
      // Tratar Data que pode ser null ou string vazia
      if (coluna === 'Data' && !daily[coluna]) {
        return null; // Usar null para datas vazias na planilha
      }
      return daily[coluna] !== undefined ? daily[coluna] : '';
    });
    
    // Adicionar nova linha
    abaDaily.appendRow(valores);
    
    Logger.log("Daily criado com sucesso: " + daily.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var dailySerializavel = converterDatasParaString(daily);
    
    // Retornar o daily criado para atualizar o frontend
    return dailySerializavel;
  } catch (e) {
    Logger.log("Erro ao criar daily: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao criar daily: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para atualizar um registro de Daily existente
 */
function atualizarDaily(token, daily) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var planilha = obterPlanilha(token);
    var abaDaily = planilha.getSheetByName('Daily');
    
    if (!abaDaily) {
      throw new Error('Aba de Daily não encontrada');
    }
    
    // Obter todos os registros
    var dados = abaDaily.getDataRange().getValues();
    var cabecalho = dados[0];
    var idIndex = cabecalho.indexOf('ID');
    if (idIndex === -1) throw new Error("Coluna 'ID' não encontrada na aba Daily");

    // Encontrar índice do registro pelo ID
    var linhaIndex = -1;
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][idIndex] === daily.ID) {
        linhaIndex = i; // Índice baseado em 0 dos dados (sem cabeçalho)
        break;
      }
    }
    
    if (linhaIndex === -1) {
      throw new Error('Registro de Daily com ID ' + daily.ID + ' não encontrado para atualização');
    }
    
    // Obter nome do usuário se tiver ID do Usuário
    if (daily['ID do Usuário']) {
      var abaUsuarios = planilha.getSheetByName('Usuários');
      if (abaUsuarios) {
        var dadosUsuarios = abaUsuarios.getDataRange().getValues();
        var cabecalhoUsuarios = dadosUsuarios[0];
        var idIndex = cabecalhoUsuarios.indexOf('ID');
        var nomeIndex = cabecalhoUsuarios.indexOf('Nome Completo');
        
        if (idIndex !== -1 && nomeIndex !== -1) {
          for (var i = 1; i < dadosUsuarios.length; i++) {
            if (dadosUsuarios[i][idIndex] === daily['ID do Usuário']) {
              daily['Nome do Usuário'] = dadosUsuarios[i][nomeIndex];
              break;
            }
          }
        }
      }
    }
    
    // Criar array com os valores atualizados na ordem correta
    var valores = [];
    
    for (var i = 0; i < cabecalho.length; i++) {
      var coluna = cabecalho[i];
      
      // Manter a data de criação original
      if (coluna === 'Data Criação' && linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
        continue;
      }
      
      // Tratar Data que pode ser null ou string vazia
      if (coluna === 'Data' && !daily[coluna]) {
        valores.push(null); // Usar null para datas vazias na planilha
        continue;
      }
      
      // Usar valor atualizado do daily se existir
      if (daily[coluna] !== undefined) {
        valores.push(daily[coluna]);
        continue;
      }
      
      // Manter o valor antigo se existir
      if (linhaIndex < dados.length && i < dados[linhaIndex].length) {
        valores.push(dados[linhaIndex][i]);
      } else {
        valores.push(''); // Valor padrão se não existir
      }
    }
    
    // Atualizar linha (linhaIndex + 1 porque dados[0] é o cabeçalho)
    abaDaily.getRange(linhaIndex + 1, 1, 1, valores.length).setValues([valores]);
    
    Logger.log("Daily atualizado com sucesso: " + daily.ID);
    
    // Converter todos os objetos Date para strings antes de retornar
    var dailySerializavel = converterDatasParaString(daily);
    
    // Retornar o daily atualizado para atualizar o frontend
    return dailySerializavel;
  } catch (e) {
    Logger.log("Erro ao atualizar daily: " + e.toString() + "\nStack: " + e.stack);
    throw new Error("Erro ao atualizar daily: " + e.message); // Propagar erro para o frontend
  }
}

/**
 * Função para depurar a obtenção de tarefas
 */
function depurarObterTarefas(token) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
  try {
    var tarefas = obterTarefas();
    Logger.log("Tarefas obtidas: " + JSON.stringify(tarefas));
    return {
      status: "sucesso",
      mensagem: "Tarefas obtidas com sucesso.",
      quantidade: tarefas.length,
      tarefas: tarefas
    };
  } catch (e) {
    Logger.log("Erro ao depurar obtenção de tarefas: " + e.toString());
    return {
      status: "erro",
      mensagem: "Erro ao obter tarefas: " + e.message
    };
  }
}