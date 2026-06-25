const express = require('express');
const router = express.Router();

// Rota real para salvar progresso: POST http://localhost:3000/api/aula/salvar
router.post('/salvar', (req, res) => {
    const db = req.app.get('db');
    
    // 🎯 Captura os dados vindos do front-end (Agora incluindo o praticar e o teste)
    const { id, aula, topico, frame, praticar, teste } = req.body;

    // Se o praticar não vier na requisição (no meio da aula), ele salva 0 por padrão
    const valorPraticar = (praticar !== undefined) ? praticar : 0;
    
    // 🎯 Se o teste não vier na requisição, ele salva 0 por padrão
    const valorTeste = (teste !== undefined) ? teste : 0;

    console.log(`[BACKEND] Gravando -> Linha ID: ${id} | Aula: ${aula}, Tópico: ${topico}, Frame: ${frame} | Praticar: ${valorPraticar} | Teste: ${valorTeste}`);

    // 🎯 SQL ATUALIZADO: Incluídas as colunas praticar e teste no SET
    const sql = `
        UPDATE tela_aula 
        SET aula = ?, topico = ?, frame = ?, praticar = ?, teste = ? 
        WHERE id = ?
    `;

    // 🎯 Parâmetros alinhados na ordem exata das interrogações do SQL
    db.query(sql, [aula, topico, frame, valorPraticar, valorTeste, id], (err, result) => {
        if (err) {
            console.error("Erro ao atualizar a tabela tela_aula:", err);
            return res.status(500).json({ sucesso: false, erro: "Erro interno no banco" });
        }

        res.json({ 
            sucesso: true, 
            mensagem: "Progresso e status de Prática salvos com sucesso no MariaDB!" 
        });
    });
});

// =========================================================================
// 🎯 ROTA AJUSTADA: Buscar progresso ao iniciar a aula (LEITURA)
// Rota real: GET http://localhost:3000/api/aula/progresso/:id_progresso
// =========================================================================
router.get('/progresso/:id_progresso', (req, res) => {
    const db = req.app.get('db');
    const idControle = req.params.id_progresso; 

    console.log(`[BACKEND] Buscando progresso -> Linha ID: ${idControle}`);

    // 🎯 SQL ATUALIZADO: Busca também as colunas praticar e teste para o Menu Geral saber o status
    const sql = `
        SELECT aula, topico, frame, praticar, teste
        FROM tela_aula
        WHERE id = ?
    `;

    db.query(sql, [idControle], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar na tabela tela_aula:", err);
            return res.status(500).json({ erro: "Erro interno no banco ao buscar progresso" });
        }

        if (rows.length > 0) {
            console.log(`[BACKEND] Sucesso! Linha ID: ${idControle} -> Aula: ${rows[0].aula}, Tópico: ${rows[0].topico}, Frame: ${rows[0].frame} | Praticar: ${rows[0].praticar || 0} | Teste: ${rows[0].teste || 0}`);
            return res.json({
                aula: rows[0].aula || 1,
                topico: rows[0].topico || 1,
                frame: rows[0].frame || 0,
                praticar: rows[0].praticar || 0,
                teste: rows[0].teste || 0 // 🎯 Devolve o valor real do teste (0 ou 1) para o front-end
            });
        } else {
            console.log(`[BACKEND] Nenhuma linha encontrada para o ID: ${idControle}. Iniciando do zero.`);
            return res.json({ aula: 1, topico: 1, frame: 0, praticar: 0, teste: 0 });
        }
    });
});

module.exports = router;