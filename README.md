# Poupaí

Finanças pessoais sem complicação: quanto entrou, quanto saiu, quanto sobrou e quanto ainda pode gastar no mês.
PWA em React + Vite + TypeScript + Tailwind, com Firebase (Auth, Firestore com cache offline, Hosting).

## Desenvolvimento local

Tudo roda contra os emuladores do Firebase, sem precisar de um projeto real (requer Java para o emulador do Firestore).

```bash
npm install
npm run emulators       # Auth + Firestore + UI em http://127.0.0.1:4000
npm run dev:emulators   # app em http://localhost:5173
```

No login, o emulador mostra uma página para criar uma conta Google de teste.

## Verificações

```bash
npm run typecheck
npm run lint
npm test             # regras de domínio (dinheiro, datas, recorrências, resumo do mês)
npm run test:rules   # regras de segurança do Firestore, no emulador
```

## Como está organizado

- `src/domain`: regras puras e testadas, sem Firebase.
  - Valores sempre em **cêntimos inteiros** com o código da moeda (`EUR`, `BRL`).
  - Datas como texto `AAAA-MM-DD`, sem hora nem fuso.
  - `summary.ts` calcula entrou, saiu, sobrou e o "ainda pode gastar", que desconta contas previstas e a contribuição mensal das metas.
  - `recurrence.ts` gera um lançamento previsto por mês e por recorrente, com id fixo (`<recorrente>_<AAAA-MM>`) para nunca duplicar.
- `src/data/repository.ts`: leitura e escrita no Firestore, tudo debaixo de `users/{uid}`.
- `src/features/*`: telas (início, lançamentos, metas, ajustes, onboarding).
- `firestore.rules`: só o dono acessa os seus dados, e cada escrita é validada.

## Publicar

1. Crie um projeto Firebase numa **região europeia** e ative Authentication (Google) e Firestore.
2. Copie `.env.example` para `.env.local` e preencha com a configuração da app web.
3. Troque `demo-poupai` em `.firebaserc` pelo id do projeto e rode `npm run deploy`.
