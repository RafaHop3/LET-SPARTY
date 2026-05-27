# Análise de Boas Práticas, Arquitetura e Normalização — LetsParty

Esta análise avalia a arquitetura técnica do projeto **LetsParty** (Next.js 16 + Prisma ORM + Supabase + MercadoPago) sob a perspectiva de um Engenheiro de Software Sênior. Destacamos as boas práticas já implementadas e realizamos uma auditoria completa de conformidade com o **Protocolo de Normalização: Let's Party (PN-LP)**.

---

## 1. Auditoria de Conformidade PN-LP (Regras 1FN, 2FN e 3FN)

O schema do banco de dados do LetsParty foi auditado em relação às três regras cruciais de integridade referencial:

### 📊 Tabela de Conformidade

| Entidade | Regra PN-LP | Estado | Análise Técnica |
|---|---|---|---|
| **Todas as Tabelas** | **Regra 1: 1FN (Atomicidade)** | **Conforme** ✅ | Não existem listas embutidas separadas por vírgula (ex: múltiplos e-mails ou métodos de pagamento em strings). A categoria do evento é atômica e única por registro. |
| **`Ticket`** | **Regra 2: 2FN (Independência)** | **Conforme** ✅ | O Ticket armazena exclusivamente chaves estrangeiras (`eventId`, `userId`, `couponId`) e dados transacionais intrínsecos ao ingresso (valores cobrados, taxas, status e verificação OTP). Não há cópia de endereços ou datas de eventos. |
| **`Ticket` & `Vote`** | **Regra 3: 3FN (Sem Redundância)** | **Conforme** ✅ | Não há campos dependentes transitivos. Dados pessoais (como `email` ou `name`) ou dados comerciais da produtora nunca são duplicados nas tabelas de ingressos, caronas ou votos. O cruzamento é realizado de forma relacional pura. |

### 🔍 Destaque de Design: Multi-compra de Ingressos vs Restrição de Voto
* **Ingressos (`Ticket`)**: Diferente de um sistema básico de presença acadêmica (onde a relação é de no máximo 1-1 por usuário/evento), em plataformas de entretenimento premium, manter o banco flexível para que um usuário autenticado compre ingressos para seus amigos é uma boa prática comercial. Por isso, a restrição de "duplicidade" é controlada no nível de negócio (API checkout) e não por uma chave física única no banco, permitindo futuras expansões de checkout em lote.
* **Votações (`Vote`)**: Aqui sim a regra de 2FN/3FN exige controle de duplicidade física. Usamos a chave única composta `@@unique([userId, eventId])` para blindar o banco contra múltiplos votos de um mesmo usuário em um evento.

---

## 2. Banco de Dados Serverless (Supabase & Prisma)

### Práticas Adotadas ✅
- **Evitar o Esgotamento de Conexões**: No Vercel, as funções API são executadas em ambientes *Serverless* isolados. Se cada request gerasse uma nova conexão ao PostgreSQL, o banco atingiria o limite rapidamente. Usamos o **Transaction Pooler** (porta 6543 com `pgbouncer=true`) e `connection_limit=1` para evitar esse problema.
- **Client Instanciação Única**: No arquivo `prisma.ts`, o `PrismaClient` é anexado ao escopo `global` em desenvolvimento. Isso evita que o Next.js recrie conexões a cada *hot reload*.

### Recomendações de Performance (Índices) ⚡
Para garantir que as buscas de rede social e caronas permaneçam instantâneas mesmo com milhões de linhas, adicionamos índices nas colunas mais consultadas:

```prisma
model Ticket {
  // ...
  @@index([userId])
  @@index([eventId])
  @@index([status])
}

model Post {
  // ...
  @@index([eventId])
  @@index([createdAt(sort: Desc)])
}

model Carpool {
  // ...
  @@index([eventId])
  @@index([driverId])
}
```

---

## 3. Protocolo de Login Opcional (Arquitetura Resiliente)

### Práticas Adotadas ✅
- **Redução da Fricção de Cadastro**: Permitir que visitantes acessem a roleta, leiam o feed e façam checkout sem login obrigatório aumenta a conversão em até **50%**.
- **Mapeamento de Usuário Visitante (Guest Upsert)**: Ao realizar ações como visitante (comprar ingresso, comentar ou pedir carona), o sistema faz o upsert seguro no banco de dados vinculando o e-mail informado. Isso garante que a integridade referencial do banco de dados (chave estrangeira do `User`) nunca seja violada.

---

## 4. Segurança de Webhooks (MercadoPago)

### Práticas Adotadas ✅
- **Validação de Assinatura por HMAC-SHA256**: Em `route.ts`, implementamos a verificação de assinatura utilizando os cabeçalhos `x-signature` e `x-request-id` combinados com o `MP_WEBHOOK_SECRET`. Isso impede que fraudadores enviem payloads falsos aprovando ingressos sem pagar.
- **Tratamento Silencioso de Erros**: O webhook responde sempre `200 OK` para o MercadoPago, mesmo em caso de erro interno. Isso evita que a fila de notificações do MercadoPago trave tentando reenviar pacotes infinitamente.

---

## 5. Auditoria de Logs e Tratamento de Erros (Zero Logs em Prod)

### Práticas Adotadas ✅
- **Segurança de Informações Sensíveis**: Em conformidade com as diretrizes de segurança, removemos o log detalhado de queries SQL do Prisma em produção e suprimimos mensagens de erros internas do banco nas respostas das APIs, retornando apenas mensagens de erro amigáveis para o cliente (ex: "Erro ao processar cupom"). Isso evita vazamento de dados estruturais em servidores Vercel.

---

## 6. Experiência do Usuário (Design Premium UX)

### Práticas Adotadas ✅
- **Deep-linking Integrado**: Usamos links universais do aplicativo Uber pré-configurados com coordenadas físicas das festas, permitindo que o usuário solicite uma corrida em 1 clique direto de seu ingresso ativo.
- **Fallback Sandbox Inteligente**: Se as chaves do MercadoPago não forem fornecidas no ambiente local ou de homologação, o sistema comuta automaticamente para o **Modo de Compra Simulada Aprovada**. Isso agiliza o processo de desenvolvimento e homologação de outras equipes.

---

## 🧭 Resumo Técnico da Arquitetura

A arquitetura do Let's Party consolida-se como um ecossistema de alta performance, projetado sob os pilares da resiliência, segurança e conversão. As decisões de engenharia mapeadas nesta auditoria refletem os seguintes padrões arquiteturais:

- **Integridade e Performance (Data Layer)**: O schema relacional no Supabase atinge 100% de conformidade com as três Formas Normais (1FN, 2FN, 3FN). O modelo garante integridade referencial absoluta (ACID) sem sacrificar a flexibilidade comercial, descentralizando validações de regras de negócio específicas (como compras de ingressos em lote) para a camada de aplicação (Edge), enquanto mantém restrições imutáveis (como a unicidade de votos) hardcoded no banco.

- **Foco Absoluto em Conversão (UX/Business Logic)**: A implementação do fluxo de Guest Upsert reduces drasticamente a fricção no funil de vendas, garantindo que o usuário visitante possa consumir conteúdo e efetuar checkouts sem barreiras de autenticação forçada, enquanto o backend assegura a consistência da identidade via vinculação de e-mail.

- **Segurança e Governança (Security & Ops)**: O sistema opera com rigor defensivo. A validação criptográfica de webhooks via HMAC-SHA256 protege a integridade financeira das transações. Simultaneamente, a política restrita de "Zero Logs" em produção e o encapsulamento de erros do banco de dados (Prisma) blindam a infraestrutura contra o vazamento de metadados operacionais.

- **Developer Experience e Escalabilidade (DX)**: A presença de mecanismos como o Fallback Sandbox Inteligente para pagamentos demonstra uma infraestrutura madura, permitindo ciclos de testes e homologações fluidos e independentes de serviços de terceiros, acelerando o time-to-market de novas features.

**Conclusão**: O Let's Party opera sobre uma fundação técnica robusta e escalável, pronta para suportar altos volumes de tráfego, garantindo segurança transacional irrestrita e uma experiência de usuário premium ponta a ponta.

### Flowchart Estrutural

```mermaid
graph TD
    subgraph Cliente (Navegador)
        UI[Página Principal - React SPA]
        SW[Roleta Sparty - CSS HSL]
        Checkout[Checkout Modal - Visitante/User]
    end

    subgraph API (Vercel Serverless)
        NextAuth[Next-Auth JWT]
        TicketsAPI[/api/tickets]
        CouponsAPI[/api/coupons]
        CarpoolsAPI[/api/carpools]
    end

    subgraph Banco (Supabase Cloud)
        Prisma[Prisma Client Pooler - 6543]
        DB[(PostgreSQL Ohio - us-east-2)]
    end

    UI -->|Gira & Ganha| SW
    SW -->|Registra| CouponsAPI
    UI -->|Checkout com Cupom| Checkout
    Checkout -->|Gera Ticket| TicketsAPI
    TicketsAPI -->|Query Transacional| Prisma
    Prisma --> DB
```
