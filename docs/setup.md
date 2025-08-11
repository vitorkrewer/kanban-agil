# Instalação e Configuração

Siga os passos abaixo para configurar e implantar sua própria instância do Kanban Ágil.

## Pré-requisitos

- Uma Conta Google.
- Conhecimento básico de como navegar pelo Google Drive e Google Sheets.

## Passo 1: Obter os Arquivos do Projeto

- Clone ou faça o download deste repositório para ter todos os arquivos (`.gs` e `.html`) em sua máquina local.
- Acesse [script.google.com](https://script.google.com) e crie um novo projeto.
- Recrie a estrutura de arquivos do repositório no seu novo projeto do Apps Script, copiando e colando o conteúdo de cada arquivo.

## Passo 2: Criar e Configurar o Banco de Dados (Google Sheets)

1.  Crie uma nova **Planilha Google** na sua conta. Ela servirá como banco de dados.
2.  Copie o **ID da Planilha**. Você pode encontrá-lo na URL: `.../spreadsheets/d/`**`[AQUI_ESTA_O_ID]`**`/edit`.
3.  No arquivo `code.js` do seu projeto Apps Script, cole o ID na variável `SPREADSHEET_ID`:
    ```javascript
    let SPREADSHEET_ID = 'SEU_ID_DA_PLANILHA_AQUI';
    ```

## Passo 3: Configurar os Usuários de Acesso

1.  Abra o arquivo `setupUserKeys.js`.
2.  Edite a lista `users` para definir os nomes de usuário e as chaves de acesso que você deseja.
    ```javascript
    const users = [
      { user: "seu_usuario", key: "sua_senha_segura" },
      { user: "outro_usuario", key: "outra_senha" },
    ];
    ```
3.  Salve o arquivo.
4.  Com a função `setupUserKeys` selecionada no editor, clique em **Executar**. Isso irá salvar suas credenciais de forma segura nas propriedades do script. Você só precisa fazer isso uma vez ou sempre que alterar os usuários.

## Passo 4: Implantar a Aplicação Web

1.  No editor do Apps Script, clique no botão **Implantar** e selecione **Nova implantação**.
2.  Clique no ícone de engrenagem (⚙️) ao lado de "Selecione o tipo" e escolha **App da Web**.
3.  Preencha as informações da implantação:
    - **Descrição:** `Versão inicial do Kanban Ágil`
    - **Executar como:** `Eu` (Sua conta do Google)
    - **Quem pode acessar:** `Qualquer pessoa`
4.  Clique em **Implantar**.
5.  O Google pedirá autorização para que o script acesse seus dados (como a Planilha). Clique em **Autorizar acesso** e siga as instruções para permitir.
6.  Após a conclusão, uma URL do App da Web será exibida. Copie essa URL.

**Pronto!** Sua aplicação Kanban Ágil está no ar. Acesse a URL e utilize as credenciais que você configurou.