# InfraSantAlert

Sistema informativo de vias em manutenção na cidade de Santarém.

## Estrutura

InfraSantAlert/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── models/
│   └── Via.js
├── server.js
├── package.json
└── README.md

## Dependências

Instale as dependências com:

```bash
npm install
```

ou instalar as listadas explicitamente:

```bash
npm install express mongoose cors
```

## Variáveis de ambiente

Defina `MONGODB_URI` com a connection string do MongoDB Atlas. Se não definida, o app usará um MongoDB local em `mongodb://localhost:27017/infrasantalert`.

## Como rodar

```bash
npm start
```

Em desenvolvimento (recomendado instalar `nodemon` globalmente):

```bash
npm run dev
```

Abra no navegador:

http://localhost:3000
