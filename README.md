# Poupaí

Finanças pessoais sem complicação: quanto entrou, quanto saiu, quanto sobrou e quanto ainda pode gastar no mês.
PWA em React + Vite + TypeScript + Tailwind, com Firebase (Auth, Firestore com cache offline, Hosting).

## Desenvolvimento local

Tudo roda contra os emuladores do Firebase, sem precisar de um projeto real (requer Java para o emulador do Firestore).

```bash
npm install
npm run dev    # app em http://localhost:5173, emuladores em http://127.0.0.1:4000
```

No login, o emulador mostra uma página para criar uma conta Google de teste. Os dados somem ao parar o comando.

`npm run prod` roda o código local contra o **Firebase real** (`poupai-eu`, configurado em `.env.local`). Use só quando quiser mexer nos dados de verdade.

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

O projeto de produção é `poupai-eu` (Firestore em `eur3`), já definido em `.firebaserc`.

1. Gere a configuração da app web em `.env.local` (fora do Git):
   `npx firebase apps:sdkconfig WEB --project poupai-eu` e copie os valores para as variáveis de `.env.example`.
2. `npm run deploy` publica o app no Hosting e as regras e índices do Firestore.
