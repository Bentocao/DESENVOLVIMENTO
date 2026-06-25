const express = require('express');
const router = express.Router();

// Rota de Login: GET http://localhost:3000/api/login/aluno/:usuario
router.get('/aluno/:usuario', (req, res) => {
    const usuario = req.params.usuario;
    const db = req.app.get('db');

    const sql = `
        SELECT 
            a.id AS aluno_id, a.nome AS aluno_nome, a.senha, a.ativo AS aluno_ativo, a.status AS aluno_status,
            u.ativo AS unidade_ativo, u.status AS unidade_status,
            p.nome AS pacote_nome, p.cod_pacote AS id_pacote,
            c.cod_curso AS cod_curso, c.nome AS curso_nome, c.pasta AS curso_pasta,
            c.versao AS curso_versao, c.perfil AS curso_perfil,
            m.status, m.data_inicio, m.data_fim,
            t.id AS id_tela_aula, t.aula, t.topico, t.frame
        FROM aluno a
        INNER JOIN unidade u ON a.id_unidade = u.id
        INNER JOIN matricula_curso m ON a.id = m.id_aluno
        INNER JOIN pacote p ON m.cod_pacote = p.cod_pacote
        INNER JOIN curso c ON m.cod_curso = c.cod_curso
        INNER JOIN pacote_curso pc ON (p.cod_pacote = pc.cod_pacote AND c.cod_curso = pc.cod_curso)
        LEFT JOIN tela_aula t ON (a.id = t.id_aluno AND c.cod_curso = t.cod_curso)
        WHERE a.usuario = ? AND m.ativo = 1
        ORDER BY pc.ordem ASC
    `;

    db.query(sql, [usuario], (err, results) => {
        if (err) {
            console.error("Erro no banco (Login):", err);
            return res.status(500).json({ sucesso: false, mensagem: "Erro interno" });
        }

        if (results.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: "Aluno: Não encontrado" });
        }

        const info = results[0];

        if (info.unidade_ativo === 0 || info.unidade_status !== 'Ativo') {
            return res.status(403).json({ sucesso: false, mensagem: `Unidade: ${info.unidade_status} - Chame seu instrutor` });
        }

        if (info.aluno_ativo === 0 || info.aluno_status !== 'Ativo') {
            return res.status(403).json({ sucesso: false, mensagem: `Aluno: ${info.aluno_status} - Chame seu instrutor` });
        }

        const cursosOriginais = results.map(linha => ({
            cod_curso: linha.cod_curso,
            nome: linha.curso_nome,
            pasta: linha.curso_pasta,
            versao: linha.curso_versao,
            perfil: linha.curso_perfil,
            status: linha.status,
            inicio: linha.data_inicio,
            fim: linha.data_fim,
            id_auth: linha.id_tela_aula || 0,
            id_progresso: linha.id_tela_aula || 0,
            navegacao: {
                aula: linha.aula || 1,
                topico: linha.topico || 1,
                frame: linha.frame || 1
            }
        }));

        const dadosAluno = {
            nome: results[0].aluno_nome,
            senha: results[0].senha,
            pacote: results[0].pacote_nome,
            id_pacote: results[0].id_pacote,
            cursos: cursosOriginais
        };

        res.json({ sucesso: true, dados: dadosAluno });
    });
});

module.exports = router;