# InfraSantAlert

InfraSantAlert e uma plataforma web para monitoramento urbano de vias em Santarem, com foco em ocorrencias reportadas por cidadaos, confirmacoes comunitarias e gestao administrativa de interdicoes.

## Objetivo

Centralizar informacoes sobre problemas em vias urbanas, permitindo que usuarios comuniquem ocorrencias georreferenciadas e que administradores priorizem, validem e convertam ocorrencias confirmadas em interdicoes oficiais.

## Tecnologias

- Node.js
- Express
- MongoDB com Mongoose
- JWT para autenticacao
- bcryptjs para senhas
- Leaflet com OpenStreetMap
- HTML, CSS e JavaScript puro no frontend

## Funcionalidades

- Cadastro e login de usuarios.
- Perfis `usuario` e `admin`.
- Visualizacao de mapa com Leaflet/OpenStreetMap.
- Cadastro administrativo de vias/interdicoes.
- Reporte de ocorrencias georreferenciadas por usuarios comuns.
- Confirmacao comunitaria de ocorrencias.
- Painel administrativo de ocorrencias.
- Alteracao administrativa de status: `pendente`, `confirmada`, `resolvida`, `rejeitada`.
- Transformacao de ocorrencia confirmada em pre-cadastro de interdicao.
- Ranking de top ocorrencias mais confirmadas.
- Alertas, notificacoes, comentarios e logs via API.

## Perfis

### Visitante

- Visualiza mapa.
- Visualiza vias/interdicoes.
- Nao reporta ocorrencias.
- Nao acessa paineis administrativos.

### Usuario

- Reporta ocorrencias no mapa.
- Confirma ocorrencias de outros usuarios.
- Visualiza mapa, vias e alertas.
- Nao cadastra vias.

### Admin

- Cadastra, edita, libera e remove vias.
- Gerencia ocorrencias.
- Confirma, resolve ou rejeita ocorrencias.
- Visualiza ranking e indicadores administrativos.
- Transforma ocorrencias confirmadas em interdicoes oficiais.

## Fluxo Principal

1. Usuario cria conta e faz login.
2. Usuario clica no mapa e reporta uma ocorrencia.
3. Outros usuarios podem confirmar a ocorrencia.
4. Admin visualiza ocorrencias reportadas e ranking de prioridade.
5. Admin confirma, rejeita ou resolve a ocorrencia.
6. Admin pode transformar ocorrencia confirmada em interdicao.
7. A interdicao passa a aparecer no mapa como via monitorada.

## Instalacao

```bash
npm install
```

## Configuracao do `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
MONGODB_URI=mongodb://localhost:27017/infrasantalert
JWT_SECRET=troque-este-segredo
PORT=3000
```

Para MongoDB Atlas, use a connection string fornecida pelo Atlas em `MONGODB_URI`.

## Como Rodar

```bash
npm start
```

Em desenvolvimento:

```bash
npm run dev
```

Abra no navegador:

```text
http://localhost:3000
```

Se a porta estiver ocupada, o servidor tenta as proximas portas automaticamente.

## Criar Administrador

O cadastro publico cria usuarios comuns. Para promover um usuario existente para admin:

```bash
node scripts/createAdmin.js email@exemplo.com
```

O script usa `MONGODB_URI` do `.env`.

## Endpoints Principais

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Vias

- `GET /vias`
- `POST /vias` admin
- `PUT /vias/:id` admin
- `PATCH /vias/:id` admin
- `DELETE /vias/:id` admin

### Ocorrencias

- `GET /api/ocorrencias`
- `GET /api/ocorrencias/:id`
- `POST /api/ocorrencias` usuario autenticado
- `PUT /api/ocorrencias/:id` autor ou admin; status apenas admin
- `DELETE /api/ocorrencias/:id` admin

### Confirmacoes

- `GET /api/confirmacoes?ocorrenciaId=<id>`
- `POST /api/confirmacoes`
- `DELETE /api/confirmacoes/:id`

### Dashboard

- `GET /api/dashboard/admin` admin
- `GET /api/dashboard/top-ocorrencias` admin

### Outros

- `GET /api/health`
- `/api/alertas`
- `/api/notificacoes`
- `/api/logs`
- `/api/comentarios`
- `/api/mapa`

## Telas Sugeridas Para Apresentacao

- Tela inicial com mapa e vias monitoradas.
- Login e cadastro.
- Reporte de ocorrencia por usuario comum.
- Popup da ocorrencia com confirmacoes.
- Painel admin de ocorrencias reportadas.
- Ranking "Top Ocorrencias Mais Confirmadas".
- Transformacao de ocorrencia confirmada em interdicao.
- Mapa exibindo interdicoes oficiais.

## Validacao Manual Recomendada

- Visitante visualiza mapa, mas nao ve formularios.
- Usuario comum reporta ocorrencia.
- Usuario comum confirma ocorrencia de outro usuario.
- Usuario comum nao confirma a propria ocorrencia.
- Admin ve painel administrativo.
- Admin altera status da ocorrencia.
- Admin transforma ocorrencia confirmada em interdicao.
- Interdicao aparece no mapa.
- Ranking atualiza apos novas confirmacoes.
