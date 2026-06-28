async function gravarLogSuporte(modulo, detalhe) {
    if (typeof Neutralino === 'undefined') return;
    try {
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR');
        const linhaLog = `[${data} ${hora}] ${modulo.toUpperCase()}: ${detalhe}\n`;
        const caminhoLog = NL_PATH + "/suporte.log";

        await Neutralino.filesystem.appendFile(caminhoLog, linhaLog);
        console.log(`%c LOG SALVO FISICAMENTE EM: ${caminhoLog}`, "color: lime;");
    } catch (err) {
        console.error("Falha ao gravar log:", err);
    }
}
