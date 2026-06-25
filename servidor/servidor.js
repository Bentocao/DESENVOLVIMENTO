const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

// 🔒 CAMINHO FIXO: Diz ao PKG para embutir e esconder esses arquivos dentro do .exe
const rotaLogin = require('./routes/login');
const rotaAula = require('./routes/aula');
const rotaTeste = require('./routes/teste');

const app = express();

app.use(cors());
app.use(express.json());

// =========================================================
// 1. CONEXÃO CENTRAL COM O MARIADB
// =========================================================
const db = mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'cpw',          
    password: 'gws141331@',
    database: 'cpw2026'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar no banco:', err);
        return;
    }
    console.log('✅ Conectado ao MariaDB com sucesso!');
});

// Compartilha o pool de conexão do banco com os arquivos da pasta /routes
app.set('db', db);

// =========================================================
// 2. VINCULAÇÃO DAS ROTAS (Prefixadas para organização)
// =========================================================
app.use('/api/login', rotaLogin);
app.use('/api/aula', rotaAula);
app.use('/api/teste', rotaTeste);

// =========================================================
// 3. INICIALIZAÇÃO DO SERVIÇO
// =========================================================
app.listen(3000, () => {
    console.log('🚀 Servidor CPW 2026 rodando modularizado na porta 3000');
});