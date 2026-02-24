# Guia Completo e Definitivo do Claude Code (CLI da Anthropic)

> Documento de referencia abrangente cobrindo todas as funcionalidades, configuracoes e melhores praticas do Claude Code. Compilado a partir da documentacao oficial, repositorios GitHub, blogs e comunidade.

---

## Sumario

1. [Introducao e Instalacao](#1-introducao-e-instalacao)
2. [CLAUDE.md - O Arquivo de Instrucoes do Projeto](#2-claudemd---o-arquivo-de-instrucoes-do-projeto)
3. [Pasta .claude/ - Estrutura Completa](#3-pasta-claude---estrutura-completa)
4. [Skills e Custom Commands](#4-skills-e-custom-commands)
5. [Agents e Subagents](#5-agents-e-subagents)
6. [MCP Servers (Model Context Protocol)](#6-mcp-servers-model-context-protocol)
7. [Hooks - Automacao de Workflows](#7-hooks---automacao-de-workflows)
8. [Settings - Configuracoes Completas](#8-settings---configuracoes-completas)
9. [Workflow Optimization e Best Practices](#9-workflow-optimization-e-best-practices)
10. [Sistema de Memoria](#10-sistema-de-memoria)
11. [IDE Integration (VSCode e JetBrains)](#11-ide-integration-vscode-e-jetbrains)
12. [Keyboard Shortcuts e Slash Commands](#12-keyboard-shortcuts-e-slash-commands)
13. [Fontes e Referencias](#13-fontes-e-referencias)

---

## 1. Introducao e Instalacao

O Claude Code e uma ferramenta de codificacao agentiva que vive no seu terminal, entende sua codebase e ajuda a codificar mais rapido executando tarefas rotineiras, explicando codigo complexo e gerenciando workflows de git -- tudo por meio de comandos em linguagem natural.

### Instalacao

```bash
# Instalacao global via npm
npm install -g @anthropic-ai/claude-code

# Verificar versao
claude --version

# Atualizar
claude update
```

### Requisitos

- Node.js 18+
- Uma assinatura Claude Pro ou Max (ou chave de API para pay-as-you-go)

### Comandos Basicos de Inicio

```bash
# Iniciar sessao interativa
claude

# Iniciar com prompt inicial
claude "Explique como funciona o sistema de autenticacao"

# Executar uma vez e sair (headless)
claude -p "Liste todos os endpoints da API"

# Continuar conversa mais recente
claude -c
claude --continue

# Retomar sessao especifica por ID
claude --resume
claude -r "session-id" "novo prompt"
```

---

## 2. CLAUDE.md - O Arquivo de Instrucoes do Projeto

O CLAUDE.md e o arquivo mais importante para personalizar o comportamento do Claude Code. Ele e lido automaticamente no inicio de cada sessao e fornece contexto persistente sobre o projeto.

### 2.1 Hierarquia de Locais do CLAUDE.md

| Tipo de Memoria | Local | Proposito | Compartilhado com |
|---|---|---|---|
| **Managed Policy** | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md` / Linux: `/etc/claude-code/CLAUDE.md` / Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | Instrucoes da organizacao (IT/DevOps) | Todos na org |
| **Project Memory** | `./CLAUDE.md` ou `./.claude/CLAUDE.md` | Instrucoes compartilhadas do projeto | Time (via controle de versao) |
| **Project Rules** | `./.claude/rules/*.md` | Instrucoes modulares por topico | Time (via controle de versao) |
| **User Memory** | `~/.claude/CLAUDE.md` | Preferencias pessoais globais | So voce (todos projetos) |
| **Project Local** | `./CLAUDE.local.md` | Preferencias pessoais por projeto | So voce (projeto atual) |
| **Auto Memory** | `~/.claude/projects/<project>/memory/` | Notas automaticas do Claude | So voce (por projeto) |

**Regras de carregamento:**
- Arquivos CLAUDE.md no diretorio hierarquico acima do working directory sao carregados integralmente no inicio
- Arquivos em diretorios filhos sao carregados sob demanda quando Claude le arquivos nesses diretorios
- Instrucoes mais especificas tem precedencia sobre mais gerais
- `CLAUDE.local.md` e automaticamente adicionado ao `.gitignore`

### 2.2 Inicializacao com /init

```
> /init
```

O comando `/init` analisa sua codebase para detectar build systems, frameworks de teste e padroes de codigo, gerando um CLAUDE.md inicial que voce pode refinar.

### 2.3 O Que Incluir no CLAUDE.md

**INCLUA:**
- Comandos bash que Claude nao consegue adivinhar
- Regras de estilo de codigo que diferem dos defaults
- Instrucoes de testes e test runners preferidos
- Etiqueta do repositorio (naming de branches, convencoes de PR)
- Decisoes arquiteturais especificas do projeto
- Peculiaridades do ambiente de desenvolvimento (env vars necessarias)
- Gotchas comuns ou comportamentos nao obvios

**NAO INCLUA:**
- O que Claude consegue descobrir lendo o codigo
- Convencoes padrao de linguagem que Claude ja conhece
- Documentacao detalhada de API (linke para docs em vez disso)
- Informacoes que mudam frequentemente
- Explicacoes longas ou tutoriais
- Descricoes arquivo por arquivo da codebase
- Praticas auto-evidentes como "escreva codigo limpo"

### 2.4 Exemplo Completo de CLAUDE.md

```markdown
# Projeto: API de Gestao de Pedidos

## Stack Tecnico
- Backend: Node.js com TypeScript
- Framework: Express.js
- ORM: Prisma
- Banco: PostgreSQL
- Testes: Jest + Supertest
- Linting: ESLint + Prettier

## Comandos Essenciais
- Build: `npm run build`
- Dev: `npm run dev`
- Testes: `npm run test` (todos) ou `npm run test -- --testPathPattern=<pattern>` (unico)
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Migrations: `npx prisma migrate dev`
- Seed: `npx prisma db seed`

## Estilo de Codigo
- Use ES modules (import/export), NAO CommonJS (require)
- Desestruture imports quando possivel: `import { foo } from 'bar'`
- Use 2-space indentation
- Prefira `const` sobre `let`, nunca `var`
- Nomes de arquivos: kebab-case (ex: `order-service.ts`)
- Nomes de classes: PascalCase
- Nomes de funcoes/variaveis: camelCase
- Interfaces comecam com I (ex: `IOrderRepository`)

## Workflow de Desenvolvimento
- SEMPRE rode typecheck apos fazer mudancas no codigo
- Prefira rodar testes individuais durante desenvolvimento, nao a suite toda
- Commits seguem Conventional Commits: `feat:`, `fix:`, `refactor:`, etc.
- Branches: `feature/`, `fix/`, `refactor/`

## Padroes Arquiteturais
- Repository Pattern para acesso a dados
- Service Layer para logica de negocios
- Controller Layer para tratamento de requisicoes HTTP
- DTOs para validacao de input (usando Zod)
- Middleware customizado para autenticacao JWT
- Error handling centralizado em `src/middleware/error-handler.ts`

## Imports e Referencias
- Referencia de estilo de API: @docs/api-conventions.md
- Workflow de git: @docs/git-workflow.md
```

### 2.5 Sintaxe de Import (@)

CLAUDE.md suporta importacao de outros arquivos com a sintaxe `@path/to/import`:

```markdown
Veja @README.md para visao geral e @package.json para comandos npm.

# Instrucoes Adicionais
- Git workflow @docs/git-instructions.md
- Preferencias pessoais @~/.claude/my-project-instructions.md
```

**Regras de import:**
- Caminhos relativos sao resolvidos em relacao ao arquivo que contem o import
- Caminhos absolutos e `~` sao suportados
- Imports recursivos sao suportados (max 5 niveis de profundidade)
- A primeira vez que Claude Code encontra imports externos, ele mostra um dialogo de aprovacao
- Imports dentro de code blocks e code spans NAO sao avaliados

### 2.6 Regras Modulares com .claude/rules/

Para projetos maiores, organize instrucoes em multiplos arquivos:

```
your-project/
  .claude/
    CLAUDE.md           # Instrucoes principais
    rules/
      code-style.md     # Guidelines de estilo
      testing.md        # Convencoes de teste
      security.md       # Requisitos de seguranca
      frontend/
        react.md        # Regras especificas de React
        styles.md       # Padroes de CSS
      backend/
        api.md          # Padroes de API
        database.md     # Convencoes de banco
```

Todos os `.md` em `.claude/rules/` sao carregados automaticamente como project memory.

#### Regras Condicionais por Caminho

Regras podem ser limitadas a arquivos especificos usando frontmatter YAML com o campo `paths`:

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "lib/**/*.ts"
---

# Regras de Desenvolvimento de API

- Todos os endpoints devem incluir validacao de input
- Use o formato padrao de resposta de erro
- Inclua comentarios de documentacao OpenAPI
```

**Padroes glob suportados:**

| Padrao | Correspondencia |
|---|---|
| `**/*.ts` | Todos os arquivos TypeScript em qualquer diretorio |
| `src/**/*` | Todos os arquivos sob `src/` |
| `*.md` | Markdown files na raiz |
| `src/**/*.{ts,tsx}` | Arquivos .ts e .tsx sob src/ |
| `{src,lib}/**/*.ts` | TypeScript em src/ ou lib/ |

#### Regras de Nivel de Usuario

Crie regras pessoais em `~/.claude/rules/`:

```
~/.claude/rules/
  preferences.md    # Preferencias pessoais de codigo
  workflows.md      # Workflows preferidos
```

---

## 3. Pasta .claude/ - Estrutura Completa

A pasta `.claude/` e o diretorio central de configuracao do Claude Code no projeto.

### 3.1 Estrutura Completa

```
.claude/
  CLAUDE.md              # Instrucoes principais do projeto (compartilhado via git)
  settings.json          # Hooks, environment, permissoes (compartilhado via git)
  settings.local.json    # Overrides pessoais (gitignored)
  settings.md            # Documentacao legivel dos hooks
  .gitignore             # Ignora arquivos locais/pessoais
  rules/                 # Regras modulares por topico
    code-style.md
    testing.md
    security.md
  skills/                # Skills (slash commands aprimorados)
    review/
      SKILL.md
    deploy/
      SKILL.md
      scripts/
        deploy.sh
  commands/              # Slash commands legados (compativel)
    review.md
    deploy.md
  agents/                # Subagentes customizados
    code-reviewer.md
    debugger.md
    security-reviewer.md
  agent-memory/          # Memoria persistente de subagentes (por projeto)
    code-reviewer/
      MEMORY.md
  agent-memory-local/    # Memoria de subagentes local (gitignored)
```

### 3.2 Configuracao Global (~/.claude/)

```
~/.claude/
  CLAUDE.md              # Preferencias pessoais globais
  settings.json          # Configuracoes pessoais para todos projetos
  rules/                 # Regras pessoais globais
    preferences.md
    workflows.md
  skills/                # Skills pessoais (todos projetos)
    fix-issue/
      SKILL.md
  commands/              # Commands pessoais legados
    commit.md
  agents/                # Subagentes pessoais (todos projetos)
    code-reviewer.md
  projects/              # Auto memory por projeto
    <project>/
      memory/
        MEMORY.md
        debugging.md
        api-conventions.md
  tasks/                 # Tarefas persistentes entre sessoes
```

### 3.3 settings.json

O arquivo `.claude/settings.json` define configuracoes compartilhadas com o time:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "deny": [
      "Bash(curl *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  },
  "env": {
    "NODE_ENV": "development"
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_PROJECT_DIR\"/{file}"
          }
        ]
      }
    ]
  }
}
```

### 3.4 settings.local.json

O `.claude/settings.local.json` e para overrides pessoais (automaticamente gitignored):

```json
{
  "permissions": {
    "allow": [
      "Bash(docker compose *)",
      "Bash(kubectl *)"
    ]
  },
  "env": {
    "DATABASE_URL": "postgresql://localhost:5432/dev"
  }
}
```

---

## 4. Skills e Custom Commands

Skills sao a evolucao dos custom slash commands. Elas estendem as capacidades do Claude com instrucoes e workflows especificos.

### 4.1 Conceito

Skills sao arquivos Markdown com frontmatter YAML que definem instrucoes para o Claude. Custom slash commands em `.claude/commands/` continuam funcionando, mas skills adicionam features opcionais como diretorio para arquivos de suporte, frontmatter para controle de invocacao e carregamento automatico.

### 4.2 Estrutura de uma Skill

```
.claude/skills/
  my-skill/
    SKILL.md           # Instrucoes principais (obrigatorio)
    template.md        # Template para Claude preencher
    examples/
      sample.md        # Exemplos de output esperado
    scripts/
      validate.sh      # Script que Claude pode executar
```

### 4.3 Formato do SKILL.md

```yaml
---
name: review-code
description: Revisa codigo para qualidade, seguranca e boas praticas. Use quando revisar PRs ou apos mudancas significativas.
argument-hint: [file-or-directory]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
context: fork
agent: Explore
---

Quando revisar codigo, sempre inclua:

1. **Analise de qualidade**: Clareza, legibilidade, naming
2. **Seguranca**: Vulnerabilidades, secrets expostos, validacao de input
3. **Performance**: Loops desnecessarios, queries N+1, memory leaks
4. **Testes**: Cobertura de edge cases, mocks excessivos

Formate o feedback por prioridade:
- Critico (deve corrigir)
- Aviso (deveria corrigir)
- Sugestao (considerar melhorar)

Inclua exemplos especificos de como corrigir cada issue.
```

### 4.4 Campos do Frontmatter

| Campo | Obrigatorio | Descricao |
|---|---|---|
| `name` | Nao | Nome do skill. Se omitido, usa o nome do diretorio |
| `description` | Recomendado | O que o skill faz e quando usar. Claude usa para decidir quando aplicar |
| `argument-hint` | Nao | Hint para autocomplete: `[issue-number]`, `[filename] [format]` |
| `disable-model-invocation` | Nao | `true` impede Claude de carregar automaticamente. Defaut: `false` |
| `user-invocable` | Nao | `false` esconde do menu `/`. Default: `true` |
| `allowed-tools` | Nao | Ferramentas que Claude pode usar sem pedir permissao |
| `model` | Nao | Modelo a usar quando o skill esta ativo |
| `context` | Nao | `fork` para rodar em subagente isolado |
| `agent` | Nao | Tipo de subagente quando `context: fork` (`Explore`, `Plan`, `general-purpose` ou nome customizado) |
| `hooks` | Nao | Hooks limitados ao lifecycle do skill |

### 4.5 Substituicoes de String

| Variavel | Descricao |
|---|---|
| `$ARGUMENTS` | Todos os argumentos passados ao invocar |
| `$ARGUMENTS[N]` | Argumento especifico por indice (0-based) |
| `$N` | Abreviacao para `$ARGUMENTS[N]` |
| `${CLAUDE_SESSION_ID}` | ID da sessao atual |

### 4.6 Controle de Invocacao

| Frontmatter | Voce invoca | Claude invoca | Quando carregado no contexto |
|---|---|---|---|
| (default) | Sim | Sim | Descricao sempre no contexto; conteudo completo ao invocar |
| `disable-model-invocation: true` | Sim | Nao | Descricao NAO no contexto; conteudo ao invocar manualmente |
| `user-invocable: false` | Nao | Sim | Descricao sempre no contexto; conteudo ao invocar |

### 4.7 Contexto Dinamico (!`command`)

A sintaxe `!`command`` executa comandos shell ANTES do conteudo ser enviado ao Claude:

```yaml
---
name: pr-summary
description: Resume mudancas em um pull request
context: fork
agent: Explore
---

## Contexto do PR
- Diff do PR: !`gh pr diff`
- Comentarios: !`gh pr view --comments`
- Arquivos alterados: !`gh pr diff --name-only`

## Sua tarefa
Resuma este pull request...
```

### 4.8 Locais de Armazenamento

| Local | Caminho | Escopo |
|---|---|---|
| Enterprise | Managed settings | Toda a organizacao |
| Pessoal | `~/.claude/skills/<nome>/SKILL.md` | Todos seus projetos |
| Projeto | `.claude/skills/<nome>/SKILL.md` | Somente este projeto |
| Plugin | `<plugin>/skills/<nome>/SKILL.md` | Onde o plugin esta habilitado |

### 4.9 Exemplos Praticos de Skills

#### Skill: Fix GitHub Issue

```yaml
---
name: fix-issue
description: Corrige um issue do GitHub
disable-model-invocation: true
---

Analise e corrija o issue do GitHub: $ARGUMENTS.

1. Use `gh issue view $0` para obter os detalhes
2. Entenda o problema descrito
3. Busque na codebase arquivos relevantes
4. Implemente as mudancas necessarias
5. Escreva e rode testes para verificar
6. Garanta que o codigo passa lint e typecheck
7. Crie um commit descritivo
8. Push e crie um PR
```

Uso: `/fix-issue 1234`

#### Skill: Commit Convencional

```yaml
---
name: commit
description: Cria um commit seguindo Conventional Commits
disable-model-invocation: true
---

Crie um commit para as mudancas atuais:

1. Rode `git diff --staged` para ver mudancas staged
2. Se nada staged, rode `git add -A`
3. Analise as mudancas e determine o tipo: feat, fix, refactor, docs, test, chore
4. Escreva mensagem seguindo Conventional Commits:
   - Linha 1: `type(scope): descricao curta` (max 72 chars)
   - Linha 3+: Corpo detalhado se necessario
5. Execute `git commit -m "mensagem"`

Se $ARGUMENTS fornecido, use como contexto adicional.
```

#### Skill: Deploy

```yaml
---
name: deploy
description: Deploy da aplicacao para producao
context: fork
disable-model-invocation: true
---

Deploy $ARGUMENTS para producao:

1. Rode a suite de testes: `npm run test`
2. Verifique typecheck: `npm run typecheck`
3. Build: `npm run build`
4. Push para o deployment target
5. Verifique que o deploy foi bem-sucedido
```

---

## 5. Agents e Subagents

Subagents sao assistentes de IA especializados que executam tipos especificos de tarefas, cada um em sua propria janela de contexto.

### 5.1 Subagentes Built-in

| Agente | Modelo | Ferramentas | Proposito |
|---|---|---|---|
| **Explore** | Haiku (rapido) | Read-only (sem Write/Edit) | Busca e analise de codebase |
| **Plan** | Herda do principal | Read-only (sem Write/Edit) | Pesquisa para planejamento |
| **General-purpose** | Herda do principal | Todas | Tarefas complexas multi-step |
| **Bash** | Herda | Terminal | Comandos em contexto separado |
| **Claude Code Guide** | Haiku | - | Perguntas sobre Claude Code |

### 5.2 Criando Subagentes Customizados

Subagentes sao definidos como arquivos Markdown com frontmatter YAML.

#### Via comando interativo:

```
/agents
```

#### Manualmente:

Crie um arquivo em `.claude/agents/` (projeto) ou `~/.claude/agents/` (pessoal):

```markdown
---
name: code-reviewer
description: Especialista em revisao de codigo. Use proativamente apos mudancas de codigo.
tools: Read, Grep, Glob, Bash
model: sonnet
maxTurns: 50
permissionMode: default
memory: user
---

Voce e um revisor de codigo senior garantindo altos padroes de qualidade e seguranca.

Quando invocado:
1. Rode `git diff` para ver mudancas recentes
2. Foque nos arquivos modificados
3. Inicie a revisao imediatamente

Checklist de revisao:
- Codigo claro e legivel
- Funcoes e variaveis bem nomeadas
- Sem codigo duplicado
- Tratamento adequado de erros
- Sem secrets ou API keys expostos
- Validacao de input implementada
- Boa cobertura de testes
- Consideracoes de performance

Fornecer feedback organizado por prioridade:
- Issues criticos (deve corrigir)
- Avisos (deveria corrigir)
- Sugestoes (considerar melhorar)
```

### 5.3 Campos do Frontmatter de Subagentes

| Campo | Obrigatorio | Descricao |
|---|---|---|
| `name` | Sim | Identificador unico (letras minusculas e hifens) |
| `description` | Sim | Quando Claude deve delegar para este subagente |
| `tools` | Nao | Ferramentas disponiveis. Herda todas se omitido |
| `disallowedTools` | Nao | Ferramentas negadas |
| `model` | Nao | `sonnet`, `opus`, `haiku` ou `inherit` |
| `permissionMode` | Nao | `default`, `acceptEdits`, `delegate`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | Nao | Maximo de turnos agenticos |
| `skills` | Nao | Skills para carregar no contexto na inicializacao |
| `mcpServers` | Nao | Servidores MCP disponiveis |
| `hooks` | Nao | Hooks limitados ao lifecycle do subagente |
| `memory` | Nao | Escopo de memoria persistente: `user`, `project` ou `local` |

### 5.4 Via CLI Flag (Sessao Unica)

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### 5.5 Execucao em Foreground vs Background

- **Foreground**: Bloqueia a conversa principal ate completar. Permissoes e perguntas sao passadas para voce.
- **Background**: Roda concorrentemente enquanto voce continua. Claude Code solicita permissoes antecipadamente. `Ctrl+B` para colocar uma tarefa em background.

```
# Pedir ao Claude para rodar em background
Use um subagente em background para rodar a suite de testes

# Atalho para background
Ctrl+B
```

### 5.6 Padroes Uteis com Subagentes

#### Isolar operacoes de alto volume
```
Use um subagente para rodar a suite de testes e reportar apenas os testes falhando com suas mensagens de erro
```

#### Pesquisa em paralelo
```
Pesquise os modulos de autenticacao, banco de dados e API em paralelo usando subagentes separados
```

#### Encadear subagentes
```
Use o subagente code-reviewer para encontrar problemas de performance, depois use o subagente optimizer para corrigi-los
```

### 5.7 Restringir Subagentes por Tipo (Task)

```yaml
---
name: coordinator
description: Coordena trabalho entre agentes especializados
tools: Task(worker, researcher), Read, Bash
---
```

### 5.8 Desabilitar Subagentes Especificos

```json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

---

## 6. MCP Servers (Model Context Protocol)

O Model Context Protocol (MCP) e um padrao open source para integracoes de ferramentas de IA. MCP servers dao ao Claude Code acesso a ferramentas, bancos de dados e APIs externas.

### 6.1 Tipos de Transporte

| Tipo | Descricao | Uso |
|---|---|---|
| **HTTP** | Servidores remotos (recomendado) | Cloud services |
| **SSE** | Server-Sent Events (deprecated) | Legacy services |
| **stdio** | Processos locais | Ferramentas locais, scripts |

### 6.2 Adicionando Servidores MCP

#### HTTP (recomendado para remoto):
```bash
# Basico
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Com autenticacao Bearer
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

#### SSE (deprecated):
```bash
claude mcp add --transport sse asana https://mcp.asana.com/sse
```

#### stdio (local):
```bash
# Com variaveis de ambiente
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server

# WINDOWS: Requer wrapper cmd /c
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

### 6.3 Gerenciando Servidores

```bash
# Listar todos os servidores
claude mcp list

# Detalhes de um servidor
claude mcp get github

# Remover um servidor
claude mcp remove github

# Dentro do Claude Code
/mcp

# Importar do Claude Desktop
claude mcp add-from-claude-desktop

# Adicionar via JSON
claude mcp add-json weather-api '{"type":"http","url":"https://api.weather.com/mcp"}'
```

### 6.4 Escopos de Configuracao

| Escopo | Armazenamento | Quem ve | Flag |
|---|---|---|---|
| **Local** (default) | `~/.claude.json` | So voce, projeto atual | `--scope local` |
| **Project** | `.mcp.json` (raiz do projeto) | Time todo (git) | `--scope project` |
| **User** | `~/.claude.json` | So voce, todos projetos | `--scope user` |

### 6.5 .mcp.json (Compartilhado com Time)

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "db": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DATABASE_URL}"],
      "env": {}
    }
  }
}
```

**Suporte a variaveis de ambiente:**
- `${VAR}` - Expande para o valor da variavel
- `${VAR:-default}` - Expande para VAR se definido, senao usa default

### 6.6 Exemplos Praticos

#### GitHub para Code Reviews:
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
# Depois: /mcp para autenticar

> "Revise o PR #456 e sugira melhorias"
> "Crie um novo issue para o bug que encontramos"
```

#### PostgreSQL para Consultas:
```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@prod.db.com:5432/analytics"

> "Qual nossa receita total este mes?"
> "Mostre o schema da tabela orders"
```

#### Sentry para Monitoramento:
```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

> "Quais os erros mais comuns nas ultimas 24 horas?"
```

### 6.7 MCP Tool Search

Quando muitos servidores MCP estao configurados, o Tool Search carrega ferramentas sob demanda em vez de pre-carregar todas:

```bash
# Ativar com threshold customizado (5%)
ENABLE_TOOL_SEARCH=auto:5 claude

# Sempre ativo
ENABLE_TOOL_SEARCH=true claude

# Desabilitado
ENABLE_TOOL_SEARCH=false claude
```

### 6.8 Recursos MCP (@ Mentions)

```
> Analise @github:issue://123 e sugira uma correcao
> Compare @postgres:schema://users com @docs:file://database/user-model
```

### 6.9 Prompts MCP como Comandos

```
> /mcp__github__list_prs
> /mcp__github__pr_review 456
> /mcp__jira__create_issue "Bug no login" high
```

### 6.10 Claude Code como Servidor MCP

```bash
# Iniciar Claude como servidor MCP stdio
claude mcp serve
```

Configuracao para Claude Desktop:
```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

---

## 7. Hooks - Automacao de Workflows

Hooks sao comandos shell, prompts LLM ou agentes definidos pelo usuario que executam automaticamente em pontos especificos do lifecycle do Claude Code.

### 7.1 Tipos de Hooks

| Tipo | Descricao |
|---|---|
| `command` | Executa um comando shell |
| `prompt` | Envia prompt para modelo LLM para avaliacao sim/nao |
| `agent` | Spawna subagente com acesso a ferramentas para verificacao |

### 7.2 Eventos de Hook

| Evento | Quando dispara | Pode bloquear? |
|---|---|---|
| `SessionStart` | Inicio ou retomada de sessao | Nao |
| `UserPromptSubmit` | Quando voce submete um prompt | Sim |
| `PreToolUse` | Antes de executar uma ferramenta | Sim |
| `PermissionRequest` | Quando um dialogo de permissao aparece | Sim |
| `PostToolUse` | Apos ferramenta executar com sucesso | Nao |
| `PostToolUseFailure` | Apos ferramenta falhar | Nao |
| `Notification` | Quando Claude envia notificacao | Nao |
| `SubagentStart` | Quando subagente e criado | Nao |
| `SubagentStop` | Quando subagente termina | Sim |
| `Stop` | Quando Claude termina de responder | Sim |
| `TeammateIdle` | Quando teammate de equipe vai ficar idle | Sim |
| `TaskCompleted` | Quando tarefa e marcada como completada | Sim |
| `PreCompact` | Antes da compactacao de contexto | Nao |
| `SessionEnd` | Quando sessao termina | Nao |

### 7.3 Locais de Configuracao

| Local | Escopo | Compartilhavel |
|---|---|---|
| `~/.claude/settings.json` | Todos projetos | Nao |
| `.claude/settings.json` | Projeto unico | Sim (git) |
| `.claude/settings.local.json` | Projeto unico | Nao (gitignored) |
| Plugin `hooks/hooks.json` | Quando plugin habilitado | Sim |
| Skill/Agent frontmatter | Enquanto componente ativo | Sim |

### 7.4 Formato de Configuracao

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh",
            "timeout": 600
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write",
            "async": true,
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### 7.5 Matchers (Filtros)

| Evento | O que o matcher filtra | Exemplos |
|---|---|---|
| `PreToolUse`, `PostToolUse`, `PermissionRequest` | Nome da ferramenta | `Bash`, `Edit\|Write`, `mcp__.*` |
| `SessionStart` | Como a sessao iniciou | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | Por que a sessao terminou | `clear`, `logout`, `prompt_input_exit` |
| `Notification` | Tipo de notificacao | `permission_prompt`, `idle_prompt` |
| `SubagentStart`/`SubagentStop` | Tipo de agente | `Bash`, `Explore`, `Plan`, nomes custom |
| `PreCompact` | O que acionou | `manual`, `auto` |

Matchers sao regex: `Edit|Write` casa com ambas ferramentas, `mcp__memory__.*` casa com todas as ferramentas do servidor memory.

### 7.6 Codigos de Saida

| Exit Code | Significado |
|---|---|
| **0** | Sucesso. stdout e processado para JSON |
| **2** | Erro de bloqueio. stderr e mostrado como mensagem de erro. Acao bloqueada |
| **Outro** | Erro nao-bloqueante. stderr mostrado em modo verbose |

### 7.7 Campos de Output JSON

| Campo | Default | Descricao |
|---|---|---|
| `continue` | `true` | Se `false`, Claude para de processar completamente |
| `stopReason` | nenhum | Mensagem mostrada ao usuario quando `continue` e `false` |
| `suppressOutput` | `false` | Se `true`, esconde stdout do verbose mode |
| `systemMessage` | nenhum | Mensagem de aviso mostrada ao usuario |

### 7.8 Decisao de PreToolUse

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Comando destrutivo bloqueado por hook",
    "updatedInput": {
      "command": "npm run lint --fix"
    },
    "additionalContext": "Ambiente atual: producao. Proceda com cautela."
  }
}
```

Valores de `permissionDecision`: `"allow"` (bypassa sistema de permissao), `"deny"` (bloqueia), `"ask"` (pergunta ao usuario).

### 7.9 Hooks Assincronos

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/run-tests-async.sh",
            "async": true,
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

Hooks assincronos rodam em background sem bloquear Claude. NAO podem bloquear ou retornar decisoes.

### 7.10 Hooks Baseados em Prompt

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Avalie se Claude deve parar: $ARGUMENTS. Verifique se todas as tarefas estao completas.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Resposta esperada: `{"ok": true}` ou `{"ok": false, "reason": "Explicacao"}`

### 7.11 Hooks Baseados em Agente

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verifique que todos os testes unitarios passam. Rode a suite de testes e verifique os resultados. $ARGUMENTS",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### 7.12 Exemplos Praticos de Hooks

#### Bloquear comandos rm -rf:
```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Comando destrutivo bloqueado por hook"
    }
  }'
else
  exit 0
fi
```

#### Auto-formatar apos editar:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $(jq -r '.tool_input.file_path // .tool_response.filePath')"
          }
        ]
      }
    ]
  }
}
```

#### Rodar testes apos mudancas:
```bash
#!/bin/bash
# .claude/hooks/run-tests-async.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.js ]]; then
  exit 0
fi

RESULT=$(npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "{\"systemMessage\": \"Testes passaram apos editar $FILE_PATH\"}"
else
  echo "{\"systemMessage\": \"Testes falharam apos editar $FILE_PATH: $RESULT\"}"
fi
```

#### Variaveis de ambiente em SessionStart:
```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export DEBUG_LOG=true' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

### 7.13 Gerenciamento Interativo

```
/hooks
```

O comando `/hooks` abre o gerenciador interativo onde voce pode visualizar, adicionar e deletar hooks.

---

## 8. Settings - Configuracoes Completas

### 8.1 Hierarquia de Precedencia

1. **Managed** (maior prioridade) - Nao pode ser sobrescrito
2. **Command line arguments**
3. **Local project settings** (`.claude/settings.local.json`)
4. **Shared project settings** (`.claude/settings.json`)
5. **User settings** (`~/.claude/settings.json`) - menor prioridade

### 8.2 Locais dos Arquivos

| Tipo | Local | Compartilhado |
|---|---|---|
| User | `~/.claude/settings.json` | Nao |
| Project (shared) | `.claude/settings.json` | Sim (git) |
| Project (local) | `.claude/settings.local.json` | Nao |
| Managed (macOS) | `/Library/Application Support/ClaudeCode/managed-settings.json` | Sim (IT) |
| Managed (Linux) | `/etc/claude-code/managed-settings.json` | Sim (IT) |
| Managed (Windows) | `C:\Program Files\ClaudeCode\managed-settings.json` | Sim (IT) |

### 8.3 Configuracoes Core

| Setting | Tipo | Descricao | Exemplo |
|---|---|---|---|
| `model` | string | Override modelo default | `"claude-sonnet-4-5-20250929"` |
| `language` | string | Idioma de resposta preferido | `"portuguese"` |
| `outputStyle` | string | Ajuste do system prompt | `"Explanatory"` |
| `alwaysThinkingEnabled` | boolean | Thinking estendido por default | `true` |

### 8.4 Permissoes

#### Sintaxe de Regras

```
Tool                          # Todas instancias
Tool(specifier)               # Padrao especifico
Tool(npm run *)               # Padroes com wildcard
Read(./.env)                  # Operacoes de arquivo
WebFetch(domain:example.com)  # Filtragem por dominio
```

#### Exemplo Completo

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git commit *)",
      "Read(~/.zshrc)"
    ],
    "deny": [
      "Bash(curl *)",
      "Bash(rm -rf *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "WebFetch"
    ],
    "additionalDirectories": ["/path/to/shared-libs"],
    "defaultMode": "acceptEdits"
  }
}
```

### 8.5 Ferramentas Disponiveis para Claude

| Ferramenta | Requer Permissao | Descricao |
|---|---|---|
| **AskUserQuestion** | Nao | Perguntas de multipla escolha |
| **Bash** | Sim | Executar comandos shell |
| **TaskOutput** | Nao | Obter output de tarefa background |
| **Edit** | Sim | Edicoes direcionadas em arquivos |
| **ExitPlanMode** | Sim | Sair do plan mode |
| **Glob** | Nao | Encontrar arquivos por padrao |
| **Grep** | Nao | Buscar padroes em arquivos |
| **Read** | Sim | Ler conteudo de arquivos |
| **Write** | Sim | Escrever/criar arquivos |
| **WebFetch** | Sim | Buscar conteudo web |
| **WebSearch** | Sim | Pesquisar na web |
| **Task** | Sim | Spawnar subagentes |
| **TodoWrite** | Nao | Gerenciar tarefas/todo list |
| **Skill** | Nao | Invocar skills |

### 8.6 Variaveis de Ambiente Principais

#### API e Autenticacao
| Variavel | Proposito |
|---|---|
| `ANTHROPIC_API_KEY` | Chave de API |
| `ANTHROPIC_MODEL` | Modelo a usar |
| `CLAUDE_CODE_EFFORT_LEVEL` | Nivel de esforco: `low`, `medium`, `high` |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens (default: 32000, max: 64000) |

#### Bash e Comandos
| Variavel | Proposito |
|---|---|
| `BASH_DEFAULT_TIMEOUT_MS` | Timeout padrao para bash |
| `BASH_MAX_TIMEOUT_MS` | Timeout maximo |
| `CLAUDE_CODE_SHELL` | Override deteccao de shell |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Retornar ao dir original |

#### Features e Comportamento
| Variavel | Proposito |
|---|---|
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `1` desabilita, `0` forca ativar |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | `1` desabilita tarefas background |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | % para trigger auto-compactacao (ex: `50`) |
| `MAX_THINKING_TOKENS` | Budget de thinking estendido |
| `MAX_MCP_OUTPUT_TOKENS` | Max tokens em respostas MCP (default: 25000) |
| `MCP_TIMEOUT` | Timeout de startup do MCP server (ms) |
| `ENABLE_TOOL_SEARCH` | `auto`, `auto:5`, `true`, `false` |

### 8.7 Selecao de Modelo

```bash
# Via flag de linha de comando
claude --model claude-sonnet-4-5-20250929
claude --model claude-opus-4-6
claude --model claude-opus-4-5-20251101

# Via variavel de ambiente
ANTHROPIC_MODEL=claude-opus-4-6 claude

# Via settings.json
{
  "model": "claude-sonnet-4-5-20250929"
}

# Trocar durante sessao
/model claude-opus-4-6
```

### 8.8 Sandbox Configuration

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker", "git"],
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowLocalBinding": true
    }
  }
}
```

### 8.9 Configuracao Enterprise Completa

```json
{
  "forceLoginMethod": "console",
  "forceLoginOrgUUID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "allowManagedHooksOnly": true,
  "allowManagedPermissionRulesOnly": true,
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "acme-corp/approved-plugins" }
  ],
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": "Generated with AI"
  },
  "companyAnnouncements": [
    "Bem-vindo! Revise nossas guidelines em docs.empresa.com",
    "Lembrete: Code reviews obrigatorios para todos os PRs"
  ]
}
```

---

## 9. Workflow Optimization e Best Practices

### 9.1 A Regra de Ouro: Gerenciamento de Contexto

A janela de contexto do Claude preenche rapidamente e a performance degrada conforme ela enche. Esta e a restricao mais importante a gerenciar.

**Estrategias-chave:**
- Use `/clear` frequentemente entre tarefas nao relacionadas
- Monitore uso de contexto com status line customizada
- Use `/compact` para comprimir contexto quando necessario
- Use `/compact <instrucoes>` para controlar o que preservar
- Nunca exceda 60% do contexto -- divida trabalho em fases
- Use subagentes para investigacoes que leiam muitos arquivos

### 9.2 Workflow em 4 Fases

```
Explorar -> Planejar -> Implementar -> Validar
```

#### 1. Explorar (Plan Mode):
```
# Entre no Plan Mode (Shift+Tab para alternar)
Leia /src/auth e entenda como lidamos com sessoes e login.
Tambem olhe como gerenciamos variaveis de ambiente.
```

#### 2. Planejar (Plan Mode):
```
Quero adicionar Google OAuth. Quais arquivos precisam mudar?
Qual o fluxo de sessao? Crie um plano.
```

`Ctrl+G` abre o plano no editor para edicao direta.

#### 3. Implementar (Normal Mode):
```
Implemente o fluxo OAuth do seu plano. Escreva testes para
o callback handler, rode a suite de testes e corrija falhas.
```

#### 4. Commit:
```
Commit com mensagem descritiva e abra um PR
```

### 9.3 Dicas de Prompt Efetivo

| Estrategia | Antes | Depois |
|---|---|---|
| **Escopo claro** | "adicione testes para foo.py" | "escreva teste para foo.py cobrindo edge case de usuario deslogado. sem mocks" |
| **Apontar fontes** | "por que a API e estranha?" | "olhe o historico git de ExecutionFactory e resuma como a API evoluiu" |
| **Referenciar padroes** | "adicione widget de calendario" | "olhe como widgets existentes sao implementados. HotDogWidget.php e bom exemplo. Siga o padrao" |
| **Descrever sintoma** | "corrija o bug de login" | "usuarios reportam que login falha apos timeout. verifique auth flow em src/auth/, especialmente token refresh" |

### 9.4 Fornecendo Contexto Rico

- **Reference arquivos com @**: `@src/auth/login.ts`
- **Cole imagens**: Copy/paste ou drag-and-drop direto no prompt
- **De URLs**: Para documentacao e APIs
- **Pipe dados**: `cat error.log | claude`
- **Deixe Claude buscar**: Diga ao Claude para puxar contexto com Bash, MCP ou leitura de arquivos

### 9.5 Gerenciamento Agressivo de Contexto

```
/clear                           # Reset total entre tarefas
/compact                         # Comprimir contexto mantendo o importante
/compact Focus on the API changes # Comprimir focando em mudancas de API
Esc + Esc                        # Abrir menu de rewind
/rewind                          # Restaurar checkpoint anterior
```

### 9.6 Correcao de Curso

- **`Esc`**: Para Claude no meio da acao (contexto preservado)
- **`Esc + Esc`** ou `/rewind`: Menu de rewind para restaurar estado anterior
- **"Desfaca isso"**: Claude reverte mudancas
- **`/clear`**: Reset contexto entre tarefas nao relacionadas

**Regra dos 2 erros:** Se corrigiu Claude mais de 2 vezes no mesmo issue, faca `/clear` e comece fresh com prompt mais especifico.

### 9.7 Execucao Headless e Paralela

```bash
# Query unica
claude -p "Explique o que este projeto faz"

# Output estruturado para scripts
claude -p "Liste todos os endpoints da API" --output-format json

# Streaming para processamento em tempo real
claude -p "Analise este log" --output-format stream-json

# Fan-out em multiplos arquivos
for file in $(cat files.txt); do
  claude -p "Migre $file de React para Vue. Retorne OK ou FAIL." \
    --allowedTools "Edit,Bash(git commit *)"
done
```

### 9.8 Padrao Writer/Reviewer

| Sessao A (Writer) | Sessao B (Reviewer) |
|---|---|
| `Implemente um rate limiter para nossos endpoints de API` | |
| | `Revise a implementacao do rate limiter em @src/middleware/rateLimiter.ts. Procure edge cases, race conditions` |
| `Aqui esta o feedback: [output da Sessao B]. Corrija esses issues.` | |

### 9.9 Erros Comuns a Evitar

| Erro | Correcao |
|---|---|
| **Sessao "pia de cozinha"** | `/clear` entre tarefas nao relacionadas |
| **Corrigir repetidamente** | Apos 2 correcoes, `/clear` + prompt melhor |
| **CLAUDE.md inchado** | Pode implacavelmente. Se Claude ja faz correto sem a instrucao, delete |
| **Gap de confianca-verificacao** | Sempre forneca verificacao (testes, scripts) |
| **Exploracao infinita** | Limite investigacoes ou use subagentes |

---

## 10. Sistema de Memoria

### 10.1 Auto Memory

Auto memory e um diretorio persistente onde Claude registra aprendizados, padroes e insights durante as sessoes.

**O que Claude lembra:**
- Padroes do projeto: comandos de build, convencoes de teste, preferencias de estilo
- Insights de debugging: solucoes para problemas dificeis, causas comuns de erros
- Notas de arquitetura: arquivos-chave, relacoes entre modulos
- Suas preferencias: estilo de comunicacao, habitos de workflow

**Onde e armazenado:**

```
~/.claude/projects/<project>/memory/
  MEMORY.md          # Indice conciso, carregado em cada sessao (primeiras 200 linhas)
  debugging.md       # Notas detalhadas de debugging
  api-conventions.md # Decisoes de design de API
  ...                # Outros arquivos topicos
```

**Funcionamento:**
- As primeiras 200 linhas de `MEMORY.md` sao carregadas no system prompt no inicio
- Conteudo alem de 200 linhas NAO e carregado automaticamente
- Arquivos topicos NAO sao carregados no inicio; Claude os le sob demanda
- Claude le e escreve arquivos de memoria durante a sessao

### 10.2 Gerenciando a Memoria

```
# Abrir seletor de arquivos de memoria
/memory

# Pedir ao Claude para salvar algo especifico
"lembre que usamos pnpm, nao npm"
"salve na memoria que os testes de API requerem Redis local"
```

### 10.3 Variaveis de Controle

```bash
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1  # Forcar desligado
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=0  # Forcar ligado
```

### 10.4 Memoria Persistente de Subagentes

| Escopo | Local | Quando usar |
|---|---|---|
| `user` | `~/.claude/agent-memory/<nome>/` | Lembrar aprendizados em todos projetos |
| `project` | `.claude/agent-memory/<nome>/` | Conhecimento especifico do projeto (git) |
| `local` | `.claude/agent-memory-local/<nome>/` | Conhecimento local (gitignored) |

### 10.5 Workflow de Sessao Recomendado

1. **Inicio**: Recall contexto se necessario
2. **Defina a tarefa** do dia
3. **Trabalhe**
4. **Em intervalos**: cheque `/cost` (se > 50k tokens -> `/compact`)
5. **Antes de mudar de topico**: use `/clear`
6. **Fim da sessao**: adicione aprendizados ao CLAUDE.md

---

## 11. IDE Integration (VSCode e JetBrains)

### 11.1 VS Code

A extensao do VS Code fornece uma interface grafica nativa para Claude Code integrada ao IDE.

**Instalacao:**
1. Abra VS Code
2. Va ao Extensions Marketplace
3. Busque "Claude Code"
4. Instale

**Recursos:**
- Interface grafica nativa
- Compartilhamento automatico de contexto (arquivo atual, codigo selecionado, mensagens de erro)
- Visualizador de diff integrado para revisao de codigo
- Comandos via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

**Atalhos VS Code:**
| Atalho | Acao |
|---|---|
| `Cmd+Esc` / `Ctrl+Esc` | Alternar entre editor e prompt do Claude |
| `Shift+Tab` | Alternar entre modos |
| `Cmd+N` / `Ctrl+N` | Nova conversa |

### 11.2 JetBrains

Suporta toda a familia JetBrains: IntelliJ, PyCharm, WebStorm.

**Instalacao:**
1. Abra Settings/Preferences
2. Va ao Plugins Marketplace
3. Busque "Claude Code"
4. Instale

**Recursos:**
- Mesma integracao que VS Code
- Diff viewer integrado
- Contexto automatico de arquivo/selecao

### 11.3 Ativando Integracao IDE

```
# Dentro do Claude Code
/ide
```

---

## 12. Keyboard Shortcuts e Slash Commands

### 12.1 Atalhos de Teclado

| Atalho | Acao |
|---|---|
| `Esc` | Parar Claude no meio da acao |
| `Esc + Esc` | Abrir menu de rewind |
| `Ctrl+C` | Sair do Claude Code |
| `Ctrl+O` | Alternar modo verbose (ver raciocinio) |
| `Ctrl+B` | Colocar tarefa em background |
| `Ctrl+G` | Abrir plano no editor de texto |
| `Shift+Tab` | Alternar entre modos (Normal/Plan) |
| `Option+T` (macOS) / `Alt+T` (Win/Linux) | Alternar extended thinking |
| `Shift+Enter` | Nova linha no prompt (apos `/terminal-setup`) |
| `Cmd+Esc` / `Ctrl+Esc` | Alternar editor/prompt (VS Code) |

### 12.2 Slash Commands Built-in

| Comando | Descricao |
|---|---|
| `/help` | Mostrar todos os comandos disponiveis |
| `/init` | Gerar CLAUDE.md inicial baseado no projeto |
| `/config` | Configurar settings interativamente |
| `/permissions` | Gerenciar permissoes de ferramentas |
| `/allowed-tools` | Configurar permissoes de ferramentas |
| `/model` | Trocar modelo de IA |
| `/hooks` | Configurar hooks de automacao |
| `/mcp` | Gerenciar servidores MCP |
| `/agents` | Criar, editar e gerenciar subagentes |
| `/memory` | Abrir seletor de arquivos de memoria |
| `/compact` | Comprimir contexto da conversa |
| `/compact <instrucoes>` | Comprimir com foco especifico |
| `/clear` | Reset total do contexto |
| `/rewind` | Restaurar checkpoint anterior |
| `/cost` | Ver custo/tokens da sessao atual |
| `/context` | Ver informacoes de contexto |
| `/review` | Revisao de codigo completa |
| `/vim` | Habilitar modo de edicao vim |
| `/terminal-setup` | Instalar atalhos de terminal |
| `/ide` | Conectar ao VS Code/JetBrains |
| `/install-github-app` | Setup GitHub Actions |
| `/rename` | Renomear sessao |
| `/resume` | Retomar sessao anterior |
| `/bug` | Reportar bug |
| `/sandbox` | Configurar sandbox |
| `/statusline` | Configurar status line |
| `/plugin` | Navegar marketplace de plugins |

### 12.3 CLI Flags

| Flag | Funcao |
|---|---|
| `--model` | Especificar modelo |
| `--max-turns` | Limitar iteracoes |
| `--add-dir` | Incluir diretorios adicionais |
| `--allowedTools` | Permitir ferramentas especificas |
| `--disallowedTools` | Bloquear ferramentas |
| `--output-format` | Formato de saida (text/json/stream-json) |
| `--input-format` | Formato de entrada |
| `--verbose` | Logging detalhado |
| `--continue` / `-c` | Retomar conversa mais recente |
| `--resume` / `-r` | Restaurar sessao por ID |
| `--agents` | Definir subagentes via JSON |
| `--dangerously-skip-permissions` | Bypass de permissoes (CUIDADO) |
| `--debug` | Ver detalhes de execucao de hooks |
| `-p` | Modo headless (executar e sair) |

---

## 13. Fontes e Referencias

### Documentacao Oficial

| # | Titulo | URL | Tipo |
|---|---|---|---|
| 1 | Claude Code Memory Docs | https://code.claude.com/docs/en/memory | Documentacao oficial |
| 2 | Claude Code Hooks Reference | https://code.claude.com/docs/en/hooks | Documentacao oficial |
| 3 | Claude Code Subagents | https://code.claude.com/docs/en/sub-agents | Documentacao oficial |
| 4 | Claude Code Settings | https://code.claude.com/docs/en/settings | Documentacao oficial |
| 5 | Claude Code MCP | https://code.claude.com/docs/en/mcp | Documentacao oficial |
| 6 | Claude Code Skills | https://code.claude.com/docs/en/skills | Documentacao oficial |
| 7 | Claude Code Best Practices | https://code.claude.com/docs/en/best-practices | Documentacao oficial |
| 8 | Claude Code CLI Reference | https://code.claude.com/docs/en/cli-reference | Documentacao oficial |
| 9 | Using CLAUDE.MD Files Blog | https://claude.com/blog/using-claude-md-files | Blog oficial Anthropic |
| 10 | How to Configure Hooks Blog | https://claude.com/blog/how-to-configure-hooks | Blog oficial Anthropic |

### Repositorios GitHub

| # | Titulo | URL | Tipo |
|---|---|---|---|
| 11 | Claude Code (Repositorio Oficial) | https://github.com/anthropics/claude-code | Repositorio oficial |
| 12 | Everything Claude Code (Hackathon Winner) | https://github.com/affaan-m/everything-claude-code | Comunidade/Config |
| 13 | Claude Code Showcase | https://github.com/ChrisWiles/claude-code-showcase | Comunidade/Exemplos |
| 14 | Awesome Claude Code | https://github.com/hesreallyhim/awesome-claude-code | Curadoria/Lista |
| 15 | Claude Code Settings | https://github.com/feiskyer/claude-code-settings | Comunidade/Config |
| 16 | Claude Code Hooks Mastery | https://github.com/disler/claude-code-hooks-mastery | Comunidade/Tutorial |

### Blogs e Tutoriais

| # | Titulo | URL | Tipo |
|---|---|---|---|
| 17 | Claude Code CLI Cheatsheet (Shipyard) | https://shipyard.build/blog/claude-code-cheat-sheet/ | Cheat sheet |
| 18 | Complete Guide to CLAUDE.md (Builder.io) | https://www.builder.io/blog/claude-md-guide | Tutorial |
| 19 | How I Use Claude Code (Builder.io) | https://www.builder.io/blog/claude-code | Blog post |
| 20 | Claude Code Best Practices Memory Management | https://cuong.io/blog/2025/06/15-claude-code-best-practices-memory-management | Tutorial |
| 21 | Writing a Good CLAUDE.md (HumanLayer) | https://www.humanlayer.dev/blog/writing-a-good-claude-md | Tutorial |
| 22 | Claude Code Hooks Guide (DataCamp) | https://www.datacamp.com/tutorial/claude-code-hooks | Tutorial |
| 23 | Cooking with Claude Code Complete Guide | https://www.siddharthbharath.com/claude-code-the-complete-guide/ | Guia completo |
| 24 | Claude Code Configuration Guide (eesel.ai) | https://www.eesel.ai/blog/claude-code-configuration | Guia pratico |
| 25 | IDE Integration Guide (letanure.dev) | https://www.letanure.dev/blog/2025-08-05--claude-code-part-7-ide-integration-vscode-jetbrains | Tutorial |
| 26 | ClaudeLog - Docs, Guides, Tutorials | https://claudelog.com/ | Comunidade |
| 27 | Claude Code Context and Memory Management | https://angelo-lima.fr/en/claude-code-context-memory-management/ | Tutorial |
| 28 | MCP Setup Guide (mcpcat.io) | https://mcpcat.io/guides/adding-an-mcp-server-to-claude-code/ | Tutorial |
| 29 | Claude Code Subagent Deep Dive | https://cuong.io/blog/2025/06/24-claude-code-subagent-deep-dive | Deep dive |
| 30 | The Task Tool Agent Orchestration (DEV.to) | https://dev.to/bhaidar/the-task-tool-claude-codes-agent-orchestration-system-4bf2 | Tutorial |

---

## Apendice A: Template Inicial Completo para Novo Projeto

### Estrutura de Pastas

```
meu-projeto/
  CLAUDE.md                    # Instrucoes do projeto
  CLAUDE.local.md              # Preferencias locais (gitignored)
  .mcp.json                    # Servidores MCP compartilhados
  .claude/
    settings.json              # Settings compartilhadas
    settings.local.json        # Settings locais (gitignored)
    rules/
      code-style.md            # Padroes de estilo
      testing.md               # Convencoes de teste
      api-design.md            # Padroes de API
    skills/
      fix-issue/
        SKILL.md               # Corrigir GitHub issues
      commit/
        SKILL.md               # Commits convencionais
      review/
        SKILL.md               # Code review
      deploy/
        SKILL.md               # Deploy
    agents/
      code-reviewer.md         # Agente revisor
      debugger.md              # Agente debugger
    hooks/
      block-rm.sh              # Bloquear rm -rf
      run-tests-async.sh       # Rodar testes async
```

### .claude/settings.json Template

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(npm run build)",
      "Bash(npm run dev)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git status)",
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(npx prisma *)",
      "Bash(gh *)"
    ],
    "deny": [
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(rm -rf *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./**/credentials*)"
    ]
  },
  "env": {
    "NODE_ENV": "development"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-rm.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $(cat | jq -r '.tool_input.file_path // .tool_response.filePath // empty')",
            "async": true,
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### CLAUDE.md Template

```markdown
# [Nome do Projeto]

## Stack Tecnico
- [Listar tecnologias, frameworks, linguagens]

## Comandos Essenciais
- Build: `[comando]`
- Dev: `[comando]`
- Teste (todos): `[comando]`
- Teste (unico): `[comando com pattern]`
- Lint: `[comando]`
- Typecheck: `[comando]`

## Estilo de Codigo
- [Regras especificas que diferem dos defaults]
- [Naming conventions]
- [Import conventions]

## Workflow
- SEMPRE rode typecheck apos mudancas
- Prefira testes individuais durante desenvolvimento
- Commits seguem Conventional Commits

## Padroes Arquiteturais
- [Design patterns usados]
- [Estrutura de pastas]
- [Convencoes importantes]

## Referencias
- @docs/api-conventions.md
- @docs/git-workflow.md
```

---

## Apendice B: Configuracao Global Pessoal

### ~/.claude/CLAUDE.md

```markdown
# Preferencias Pessoais

## Estilo de Comunicacao
- Responda em portugues quando perguntado em portugues
- Seja direto e conciso
- Use exemplos praticos

## Preferencias de Codigo
- Use 2-space indentation
- Prefira const sobre let
- Use TypeScript quando possivel
- Escreva testes para codigo novo

## Workflow
- Sempre faca git diff antes de commit
- Use Conventional Commits
- Nunca force push em main/master
```

### ~/.claude/settings.json

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(docker compose *)"
    ]
  },
  "env": {
    "EDITOR": "code"
  },
  "showTurnDuration": true,
  "alwaysThinkingEnabled": true
}
```

---

> **Documento compilado em Fevereiro de 2026** a partir de 30+ fontes oficiais e da comunidade. Para informacoes mais atualizadas, consulte sempre a documentacao oficial em https://code.claude.com/docs/en/ e o repositorio GitHub em https://github.com/anthropics/claude-code.
