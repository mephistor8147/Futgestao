# FutGestão - Sistema de Gerenciamento Financeiro para Futebol

Este é um sistema completo para gerenciamento de grupos de futebol, incluindo controle de mensalidades, despesas, notificações e área administrativa.

## Como Hospedar em Servidores de Terceiros

### Opção 1: Hospedagem Node.js (Heroku, Render, Railway, VPS)

1.  **Clone o repositório** ou baixe os arquivos.
2.  **Instale as dependências**:
    ```bash
    npm install
    ```
3.  **Gere o build do frontend**:
    ```bash
    npm run build
    ```
4.  **Inicie o servidor**:
    ```bash
    npm start
    ```
    O servidor rodará na porta 3000 por padrão. Certifique-se de configurar a variável de ambiente `PORT` se o seu provedor exigir uma porta diferente (embora o código atual esteja fixo em 3000, você pode alterar no `server.ts`).

### Opção 2: Docker (Recomendado para VPS)

1.  **Construa a imagem**:
    ```bash
    docker build -t futgestao .
    ```
2.  **Rode o container**:
    ```bash
    docker run -p 3000:3000 -v $(pwd)/data:/app/data futgestao
    ```
    *Nota: Recomenda-se mapear o volume para persistir o banco de dados SQLite.*

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
GEMINI_API_KEY="sua_chave_aqui"
NODE_ENV="production"
```

## Estrutura do Projeto

- `server.ts`: Servidor Express com API e persistência SQLite.
- `src/`: Código fonte do frontend React.
- `football.db`: Banco de dados SQLite (gerado automaticamente).
- `dist/`: Arquivos estáticos do frontend (gerados após `npm run build`).

## Requisitos

- Node.js 18+
- NPM ou Yarn
