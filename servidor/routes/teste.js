const express = require('express');
const router = express.Router();

// Rota real para finalizar o teste: POST http://localhost:3000/api/teste/concluir
router.post('/concluir', (req, res) => {
    const db = req.app.get('db');
    
    console.log("[BACKEND-TESTE] Objeto bruto recebido:", req.body);

    const { 
        id_aluno, 
        cod_curso, 
        id_tela_aula, 
        aula, 
        porcentagem, 
        acertos, 
        erros,
        aprovado 
    } = req.body;

    const percentualAcerto = parseInt(porcentagem, 10) || 0;
    const aulaPayload = parseInt(aula, 10);

    if (!id_tela_aula) {
        return res.status(400).json({ sucesso: false, erro: 'ID da tela de aula inválido.' });
    }

    // 🕵️‍♂️ STEP 1: Puxa os dados reais do progresso para garantir a segurança
    const sqlTela = `SELECT id_aluno, cod_curso, aula FROM tela_aula WHERE id = ?`;

    db.query(sqlTela, [id_tela_aula], (errTela, rowsTela) => {
        if (errTela || !rowsTela || rowsTela.length === 0) {
            console.error("Erro ao validar tela_aula:", errTela);
            return res.status(400).json({ sucesso: false, erro: "Progresso não encontrado." });
        }

        const idAlunoReal = rowsTela[0].id_aluno;
        const codCursoReal = rowsTela[0].cod_curso;
        const aulaAtual = Number.isInteger(aulaPayload) ? aulaPayload : (parseInt(rowsTela[0].aula, 10) || 1);

        // 🕵️‍♂️ STEP 2: Procura se JÁ EXISTE um registro desse aluno para ESSA aula na teste_concluido
        const sqlVerificaExistente = `
            SELECT id, tentativas FROM teste_concluido 
            WHERE id_aluno = ? AND cod_curso = ? AND aula = ?
        `;

        db.query(sqlVerificaExistente, [idAlunoReal, codCursoReal, aulaAtual], (errCheck, rowsCheck) => {
            if (errCheck) {
                console.error("Erro ao checar histórico:", errCheck);
                return res.status(500).json({ sucesso: false, erro: "Erro de banco." });
            }

            if (rowsCheck && rowsCheck.length > 0) {
                // 🔄 CENÁRIO A: JÁ EXISTE UMA LINHA! VAMOS DAR UPDATE (SOMAR TENTATIVA)
                const idTesteExistente = rowsCheck[0].id;
                const novaTentativa = (parseInt(rowsCheck[0].tentativas, 10) || 1) + 1;

                console.log(`[BACKEND-TESTE] Registro existente encontrado. Atualizando para tentativa nº ${novaTentativa}`);

                const sqlUpdateTeste = `
                    UPDATE teste_concluido 
                    SET porcentagem = ?, acertos = ?, erros = ?, tentativas = ?, data_teste = NOW()
                    WHERE id = ?
                `;

                db.query(sqlUpdateTeste, [percentualAcerto, acertos, erros, novaTentativa, idTesteExistente], (errUp) => {
                    if (errUp) return res.status(500).json({ sucesso: false, erro: "Erro ao atualizar teste." });

                    // Se passou, avança o aluno na tela_aula
                    if (aprovado) {
                        avancarAluno(db, id_tela_aula, aulaAtual, novaTentativa, res);
                    } else {
                        return res.json({ sucesso: true, aprovado: false, mensagem: `Reprovado. Tentativa ${novaTentativa} salva.` });
                    }
                });

            } else {
                // 🆕 CENÁRIO B: PRIMEIRA TENTATIVA DA HISTÓRIA! VAMOS DAR INSERT
                console.log(`[BACKEND-TESTE] Primeiro registro do aluno nesta prova. Dando INSERT.`);

                const sqlInsert = `
                    INSERT INTO teste_concluido 
                    (id_aluno, cod_curso, id_tela_aula, aula, porcentagem, acertos, erros, tentativas, data_teste) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
                `;

                db.query(sqlInsert, [idAlunoReal, codCursoReal, id_tela_aula, aulaAtual, percentualAcerto, acertos, erros], (errIn) => {
                    if (errIn) return res.status(500).json({ sucesso: false, erro: "Erro ao inserir teste." });

                    // Se passou de primeira, avança o aluno na tela_aula
                    if (aprovado) {
                        avancarAluno(db, id_tela_aula, aulaAtual, 1, res);
                    } else {
                        return res.json({ sucesso: true, aprovado: false, mensagem: "Reprovado de primeira. Registro criado com tentativa 1." });
                    }
                });
            }
        });
    });
});

// Função auxiliar para atualizar a tela_aula e avançar o aluno
function avancarAluno(db, id_tela_aula, aulaAtual, tentativas, res) {
    const aulaDestino = aulaAtual + 1;
    console.log(`[BACKEND-TESTE] Aprovado! Avançando tela_aula para a Aula ${aulaDestino}`);

    const sqlUpdateProgresso = `
        UPDATE tela_aula 
        SET aula = ?, topico = 1, frame = 1, praticar = 0, teste = 0 
        WHERE id = ?
    `;

    db.query(sqlUpdateProgresso, [aulaDestino, id_tela_aula], (errUpdate) => {
        if (errUpdate) return res.status(500).json({ sucesso: false, erro: "Erro ao avançar progresso." });
        
        res.json({ 
            sucesso: true, 
            aprovado: true, 
            mensagem: `Aprovado na tentativa ${tentativas}! Avançado para Aula ${aulaDestino}!` 
        });
    });
}

module.exports = router;