# Roadmap do Projeto Kanban Ágil

Este documento descreve a direção futura e as prioridades de desenvolvimento para o projeto Kanban Ágil. O objetivo é fornecer uma visão clara das próximas funcionalidades e melhorias, alinhando o esforço de desenvolvimento com o valor agregado para o usuário final.

Este é um documento vivo e será atualizado conforme o projeto evolui e novas ideias surgem.

---

### Legenda

- ✨ **Nova Funcionalidade:** Um recurso completamente novo.
- 🚀 **Melhoria:** Aprimoramento de uma funcionalidade existente.
- 🎨 **UI/UX:** Melhorias na interface ou experiência do usuário.
- 🛠️ **Arquitetura:** Mudanças na estrutura do código, refatoração ou otimizações de performance.

---

## ✅ Concluído (Base Atual)

- ✨ **Sistema de Autenticação:** Login seguro com tokens de sessão.
- ✨ **Quadro Kanban Dinâmico:** Interface de arrastar e soltar (drag-and-drop).
- ✨ **CRUD Completo de Tarefas:** Criação, edição, visualização de detalhes e histórico.
- ✨ **Mural de Avisos:** Sistema de comunicação com suporte a cores e avisos fixados.
- ✨ **Gerenciamento de Usuários:** Adição, edição e desativação de usuários.
- ✨ **Registro de Daily:** Funcionalidade para acompanhamento diário da equipe.
- 🎨 **Suporte a Tema Escuro/Claro:** Com persistência da preferência do usuário.
- 🛠️ **Arquitetura Modular:** Código frontend dividido para melhor manutenibilidade.
- 🚀 **Otimização de Carregamento:** Requisição inicial de dados unificada.

---

## 🗺️ Roadmap Futuro

### 3º Trimestre de 2025: Foco em Qualidade de Vida e Expansão do Core

* **✨ Filtros e Pesquisa no Quadro:**
    * Implementar uma barra de pesquisa para encontrar tarefas por título, descrição ou ID.
    * Adicionar filtros para visualizar apenas tarefas de um responsável específico, por prioridade ou por etiquetas.

* **🚀 Notificações por E-mail:**
    * Utilizar o `MailApp` do Google para enviar notificações automáticas quando uma nova tarefa é atribuída a um usuário ou quando uma data de entrega está próxima.

* **✨ Anexos nas Tarefas (Google Drive):**
    * Permitir que os usuários anexem arquivos do Google Drive diretamente nos cartões de tarefas, salvando os links na planilha.
    ![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge)

* **🎨 Melhorias na UI da Seção de Daily:**
    * Criar uma visualização de calendário ou uma lista paginada para consultar os registros de dailies de dias anteriores facilmente.

### 4º Trimestre de 2025: Inteligência de Dados e Colaboração

* **✨ Implementação da Seção de Relatórios:**
    * Desenvolver a seção de "Relatórios" com gráficos dinâmicos (ex: usando a API Google Charts).
    * **Métricas Sugeridas:** Gráfico de tarefas concluídas por usuário, tempo médio por estágio (Lead Time), e um gráfico de Burndown para projetos.

* **✨ Sistema de Comentários nas Tarefas:**
    * Adicionar uma aba de comentários dentro do modal de detalhes da tarefa, permitindo que a equipe discuta o andamento e tire dúvidas de forma contextual.

* **🚀 Integração com Google Agenda:**
    * Oferecer a opção de criar um evento no Google Agenda do usuário responsável quando uma tarefa com data de entrega for criada ou atribuída.

* **🛠️ Logs de Atividade Globais:**
    * Expandir o histórico individual das tarefas para um log de atividades geral, onde seja possível ver todas as ações importantes que aconteceram no quadro (quem moveu, quem criou, quem concluiu, etc.).

### 2026 e Além: Escalabilidade e Ecossistema

* **🛠️ Suporte a Múltiplos Quadros (Projetos):**
    * Refatorar a arquitetura para permitir que o usuário crie e alterne entre múltiplos quadros Kanban, cada um associado a um projeto diferente. Esta é uma evolução majoritária que transforma a ferramenta em um sistema de gerenciamento multi-projeto.

* **✨ Automações (Triggers):**
    * Criar uma interface onde o usuário possa definir regras de automação simples. **Exemplo:** "Quando um cartão for movido para a coluna 'Concluído', envie um e-mail para o gestor e arquive o cartão após 7 dias".

* **🚀 Empacotar como um Add-on do Google Workspace:**
    * Transformar o projeto em um Add-on que possa ser facilmente instalado por outros usuários diretamente na barra lateral do Gmail ou Google Drive, aumentando drasticamente o alcance e a usabilidade.