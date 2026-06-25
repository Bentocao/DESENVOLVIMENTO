async function gravarLogSuporte(modulo, detalhe) {
    if (typeof Neutralino === 'undefined') return;
    try {
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR');
        const linhaLog = `[${data} ${hora}] ${modulo.toUpperCase()}: ${detalhe}\n`;
        
        // A MÁGICA: O GPS do Neutralino achando a pasta sozinho!
        const caminhoLog = NL_PATH + "/suporte.log";
        
        await Neutralino.filesystem.appendFile(caminhoLog, linhaLog);
        
        // O console agora vai te mostrar exatamente a pasta onde ele gravou
        console.log(`%c LOG SALVO FISICAMENTE EM: ${caminhoLog}`, "color: lime;");
    } catch (err) {
        // Se der erro, ele vai cuspir o código exato do Neutralino (ex: NE_FS_FILRDERR)
        console.error("Falha ao gravar log:", err);
    }
}