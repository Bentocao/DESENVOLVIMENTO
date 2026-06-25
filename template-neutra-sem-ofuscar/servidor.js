const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com o banco cpw2026
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

app.get('/aluno/:usuario', (req, res) => {
    const usuario = req.params.usuario;

    const sql = `
        SELECT 
            a.nome AS aluno_nome, 
            a.senha, 
            p.nome AS pacote_nome,
            p.id AS id_pacote,
            c.nome AS curso_nome,
            c.pasta AS curso_pasta,
            c.versao AS curso_versao,
            m.status,
            m.data_inicio,
            m.data_fim
        FROM aluno a
        INNER JOIN matricula_curso m ON a.id = m.id_aluno
        INNER JOIN pacote p ON m.id_pacote = p.id
        INNER JOIN curso c ON m.id_curso = c.id
        INNER JOIN pacote_curso pc ON (p.id = pc.id_pacote AND c.id = pc.id_curso)
        WHERE a.usuario = ? AND m.ativo = 1
        ORDER BY pc.ordem ASC
    `;

    db.query(sql, [usuario], (err, results) => {
        if (err) {
            console.error("Erro no banco:", err);
            return res.status(500).json({ sucesso: false, mensagem: "Erro interno" });
        }

        if (results.length > 0) {
            // Mapeia os cursos originais vindos do banco
            const cursosOriginais = results.map(linha => ({
                nome: linha.curso_nome,
                pasta: linha.curso_pasta,
                versao: linha.curso_versao,
                status: linha.status,
                inicio: linha.data_inicio,
                fim: linha.data_fim
            }));

            // --- SIMULAÇÃO DE PACOTE GRANDE (DUPLICANDO OS CURSOS) ---
            // Isso vai pegar seus 8 cursos e repetir eles 2 vezes (total de 16)
            const cursosFake = [...cursosOriginais, ...cursosOriginais];

            const dadosAluno = {
                nome: results[0].aluno_nome,
                senha: results[0].senha,
                pacote: results[0].pacote_nome,
                id_pacote: results[0].id_pacote,
                cursos: cursosFake // Enviando a lista duplicada
            };

            res.json({ sucesso: true, dados: dadosAluno });
        } else {
            res.status(404).json({ sucesso: false, mensagem: "Aluno sem matrículas ativas." });
        }
    });
});

app.listen(3000, () => {
    console.log('🚀 Servidor rodando na porta 3000');
});