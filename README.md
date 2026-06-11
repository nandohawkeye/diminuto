# Diminuto 🔗

Encurtador de links pessoal construído com NestJS + Fastify. Projeto desenvolvido com foco em aprendizado do ecossistema NestJS e boas práticas de arquitetura backend.

---

## Stack

| Camada         | Tecnologia                               |
| -------------- | ---------------------------------------- |
| Framework      | NestJS com adapter Fastify               |
| Banco de dados | PostgreSQL via [Neon](https://neon.tech) |
| ORM            | Prisma 7                                 |
| Cache / IDs    | Redis via [Upstash](https://upstash.com) |
| Autenticação   | JWT + Passport                           |
| Short code     | HashIDs + Redis INCR                     |
| Eventos        | EventEmitter2                            |
| Documentação   | Swagger / OpenAPI                        |
| Testes         | Jest                                     |
| Deploy         | Render                                   |

---

## Arquitetura de módulos

```
src/
├── shared/
│   ├── prisma/       → PrismaService global (adapter pg)
│   ├── redis/        → RedisService global (ioredis)
│   └── shortcode/    → ShortcodeService (HashIDs + Redis INCR)
├── auth/             → JWT, guards, register/login
├── users/            → UsersService
├── links/            → CRUD de links
├── redirect/         → GET /:code → redirect 302
└── analytics/        → listener de cliques + stats
```

### Fluxo principal

```
POST /links
  → ShortcodeService.generate()
      → Redis INCR (contador atômico)
      → HashIDs.encode(counter + offset)
  → Prisma.link.create()
  → Redis.set(link:code, url, TTL)

GET /:code
  → Redis.get(link:code)
      → cache hit  → EventEmitter.emit('click.created')  → redirect 302
      → cache miss → Prisma.link.findUnique()
                   → Redis.set(link:code, url, TTL)
                   → EventEmitter.emit('click.created')
                   → redirect 302

@OnEvent('click.created')  [async, não bloqueia o redirect]
  → Prisma.click.create()
```

---

## Decisões de arquitetura

**302 em vez de 301**
O status 301 (Moved Permanently) faz o browser cachear o redirect localmente — as visitas seguintes nunca chegam ao servidor, o que inviabiliza o analytics. O 302 (Found) força o browser a sempre passar pelo servidor, permitindo registrar cada clique.

**Redis INCR para geração de IDs**
Em ambiente distribuído com múltiplas instâncias, um contador local causaria colisões. O comando `INCR` do Redis é atômico — garante IDs únicos mesmo com vários servidores rodando em paralelo.

**HashIDs + secret**
A conversão direta de inteiro para Base62 seria sequencial e previsível (`1 → 1`, `2 → 2`). O HashIDs embaralha o resultado usando uma chave secreta, tornando impossível adivinhar o próximo código ou reverter a sequência sem a secret.

**Offset de 14.776.336 (62⁴)**
Garante que o menor código gerado sempre tenha no mínimo 4 caracteres. Sem o offset, o primeiro link geraria um código de 1 caractere.

**EventEmitter2 desacoplado do redirect**
Se o registro do clique fosse feito de forma síncrona no caminho do redirect, uma lentidão no banco atrasaria o usuário. Com o EventEmitter2, o redirect retorna imediatamente e a persistência acontece em background.

**PrismaPg adapter (Prisma 7)**
O Prisma 7 removeu o suporte a `url` no `schema.prisma` e exige um adapter explícito no construtor do client. A configuração de conexão migrou para `prisma.config.ts`.

**Neon em vez do Postgres do Render**
O Postgres gratuito do Render expira após 90 dias e apaga os dados. O Neon é serverless, persistente e tem free tier sem expiração.

---

## Schema do banco

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  links     Link[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Link {
  id        String    @id @default(cuid())
  code      String    @unique
  url       String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  clicks    Click[]
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Click {
  id        String   @id @default(cuid())
  linkId    String
  link      Link     @relation(fields: [linkId], references: [id], onDelete: Cascade)
  ip        String?
  country   String?
  referrer  String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

---

## Endpoints

| Método | Rota               | Auth | Descrição                                 |
| ------ | ------------------ | ---- | ----------------------------------------- |
| POST   | /auth/register     | ❌   | Criar conta, retorna JWT                  |
| POST   | /auth/login        | ❌   | Login, retorna JWT                        |
| POST   | /links             | ✅   | Criar link curto                          |
| GET    | /links             | ✅   | Listar meus links com contagem de cliques |
| DELETE | /links/:code       | ✅   | Deletar link                              |
| GET    | /:code             | ❌   | Redirect 302 para URL original            |
| GET    | /links/:code/stats | ✅   | Estatísticas do link                      |

Documentação interativa disponível em `/docs` (Swagger UI).

---

## Variáveis de ambiente

```env
PORT=3000

# Neon Postgres
DATABASE_URL="postgresql://user:password@host/diminuto?sslmode=require"

# Upstash Redis
REDIS_URL="rediss://default:password@host:port"

# JWT
JWT_SECRET="string-longa-e-aleatoria"

# HashIDs — não alterar após primeiro deploy (invalidaria todos os códigos)
HASHIDS_SECRET="string-longa-e-aleatoria"
```

Para gerar secrets seguros:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# preencher .env com as credenciais

# 3. Gerar Prisma client
npx prisma generate

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. Rodar em desenvolvimento
npm run start:dev
```

---

## Testes

```bash
# Rodar todos os testes
npm test

# Watch mode
npm run test:watch

# Cobertura
npm run test:cov
```

Os testes são unitários — cada service é testado de forma isolada com mocks. Sem dependência de banco ou Redis.

Suites cobertas: `ShortcodeService`, `UsersService`, `AuthService`, `LinksService`, `RedirectService`, `AnalyticsService`.

---

## Deploy (Render + Neon + Upstash)

**Build command:**

```bash
npm install && npx prisma generate && npm run build
```

**Start command:**

```bash
node dist/main
```

**Antes do primeiro deploy**, rodar a migration apontando para o Neon:

```bash
npx prisma migrate deploy
```

O `migrate deploy` aplica as migrations existentes sem criar novas — comando correto para produção.

---

## Lições aprendidas (Prisma 7)

O Prisma 7 introduziu mudanças breaking em relação às versões anteriores:

- `url` no `datasource` do `schema.prisma` foi removido — a conexão agora é configurada em `prisma.config.ts`
- `PrismaClient` exige um `adapter` explícito no construtor — usar `@prisma/adapter-pg`
- `PrismaClient` não é mais exportado diretamente de `@prisma/client` da mesma forma — verificar o caminho após `prisma generate`

```ts
// prisma.service.ts com Prisma 7
import { PrismaPg } from '@prisma/adapter-pg';

constructor(config: ConfigService) {
  const adapter = new PrismaPg({
    connectionString: config.getOrThrow<string>('DATABASE_URL'),
  });
  super({ adapter });
}
```
