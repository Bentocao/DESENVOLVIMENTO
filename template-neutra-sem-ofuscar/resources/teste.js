let atual = 0;
let acertos = 0;
let isMuted = false;
let questaoAtualProcessada = null; 

// CONFIGURAÇÃO: IDs das aulas que entrarão no sorteio do Teste Final
const aulasParaSorteio = ['A1', 'A2', 'A3', 'A4', 'A5']; 

const textoEl = document.getElementById('texto-pergunta');
const feedbackEl = document.getElementById('feedback');
const containerOpcoes = document.getElementById('container-opcoes');
const btnContinuar = document.getElementById('btn-avancar');
const audioEl = document.getElementById('main-audio');
const imgEl = document.getElementById('img-pergunta');
const progressText = document.getElementById('progress-text');

// 1. INICIALIZAÇÃO E DETECÇÃO DE MODO (AULA VS TESTE FINAL)
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id === 'TF') {
        // MODO TESTE FINAL: Monta o banco sorteando questões
        await montarTesteFinal();
    } else {
        // MODO AULA NORMAL: Aguarda carregar o script da aula específica
        let tentativas = 0;
        const checkDados = setInterval(() => {
            if (typeof dadosTeste !== 'undefined') {
                clearInterval(checkDados);
                
                // ✨ MÁGICA 1: Embaralha a ordem das perguntas da Aula Normal
                dadosTeste.sort(() => 0.5 - Math.random());
                
                carregarPergunta();
            }
            if (tentativas++ > 50) { // Timeout de 5 segundos
                clearInterval(checkDados);
                console.error("Erro: dadosTeste não carregados.");
            }
        }, 100);
    }
});

// 2. FUNÇÃO MÁGICA: Monta o simulado final extraindo questões de outros arquivos
async function montarTesteFinal() {
    progressText.innerText = "Sorteando questões para o exame final...";
    let bancoSorteado = [];

    for (const aulaId of aulasParaSorteio) {
        try {
            // No Neutralino, usamos fetch para ler o conteúdo dos arquivos JS
            const resposta = await fetch(`testes/teste${aulaId}.js`);
            const scriptTexto = await resposta.text();
            
            // Extrai o array 'dadosTeste' do texto sem poluir o escopo global
            const extrair = new Function(scriptTexto + " return dadosTeste;");
            const dadosDaAula = extrair();

            // Sorteia 2 questões aleatórias desta aula
            const sorteadas = dadosDaAula.sort(() => 0.5 - Math.random()).slice(0, 2);
            bancoSorteado.push(...sorteadas);
        } catch (e) {
            console.error(`Erro ao buscar aula ${aulaId}:`, e);
        }
    }

    // ✨ MÁGICA 2: Embaralha o banco final inteiro (mistura as aulas)
    bancoSorteado.sort(() => 0.5 - Math.random());

    // Define o banco global com as questões misturadas
    window.dadosTeste = bancoSorteado;
    atual = 0;
    acertos = 0;
    carregarPergunta();
}

// 3. PREPARAÇÃO DA QUESTÃO (RANDOM DE OPÇÕES)
function prepararQuestao(questaoOriginal) {
    let questao = JSON.parse(JSON.stringify(questaoOriginal));
    const textoCorreto = questao.opcoes[0];

    // Embaralha as opções
    for (let i = questao.opcoes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questao.opcoes[i], questao.opcoes[j]] = [questao.opcoes[j], questao.opcoes[i]];
    }

    questao.correta = questao.opcoes.indexOf(textoCorreto);
    return questao;
}

// 4. MOTOR DE EXIBIÇÃO
function carregarPergunta() {
    containerOpcoes.innerHTML = '';
    feedbackEl.style.display = 'none';
    btnContinuar.style.display = 'none';

    if (typeof dadosTeste === 'undefined' || !dadosTeste[atual]) return;

    const dadosBrutos = dadosTeste[atual];
    questaoAtualProcessada = prepararQuestao(dadosBrutos);

    textoEl.innerText = questaoAtualProcessada.pergunta;
    progressText.innerText = `Questão ${atual + 1}/${dadosTeste.length}`;

    const urlParams = new URLSearchParams(window.location.search);
    const idDaAula = urlParams.get('id'); 
    
    // Caminho da imagem (Ajuste para TF se necessário no futuro)
    if (questaoAtualProcessada.img) {
        imgEl.src = `testes/imgs/${idDaAula}/${questaoAtualProcessada.img}`;
        imgEl.style.display = "block";
    } else {
        imgEl.style.display = "none";
    }

    if (questaoAtualProcessada.audio) {
        audioEl.src = `testes/audios/${idDaAula}/${questaoAtualProcessada.audio}`;
        audioEl.muted = isMuted;
        audioEl.play().catch(e => console.log("Áudio bloqueado."));
    }

    const letras = ["A", "B", "C", "D", "E"];
    questaoAtualProcessada.opcoes.forEach((opcaoTexto, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-opcao';
		
        btn.innerHTML = `<span>${letras[index]})</span> <span>${opcaoTexto}</span>`;
        btn.onclick = () => verificarResposta(index, btn);
        containerOpcoes.appendChild(btn);
    });
}

function verificarResposta(indiceEscolhido, botaoClicado) {
    const dados = questaoAtualProcessada;
    const botoes = document.querySelectorAll('.btn-opcao');
    
    botoes.forEach(b => b.disabled = true); 
    feedbackEl.style.display = 'block';

    if (indiceEscolhido === dados.correta) {
        botaoClicado.classList.add('correta');
        feedbackEl.innerText = "✔️ Resposta correta!";
        feedbackEl.style.color = "#28a745"; 
        acertos++;
    } else {
        botaoClicado.classList.add('errada');
        feedbackEl.innerText = "❌ Resposta incorreta.";
        feedbackEl.style.color = "#dc3545"; 
    }
    btnContinuar.style.display = 'flex';
}

function proximaAcao() {
    if (atual < dadosTeste.length - 1) {
        atual++;
        carregarPergunta();
    } else {
        finalizarTeste();
    }
}

function finalizarTeste() {
    containerOpcoes.innerHTML = '';
    imgEl.style.display = 'none';
    feedbackEl.style.display = 'none';
    progressText.innerText = 'Concluído';
    
    const percentualAcerto = (acertos / dadosTeste.length) * 100;
    let mensagemFinal = (percentualAcerto >= 70) ? "Muito bem!" : "Infelizmente você não foi bem...";
    let subMensagem = (percentualAcerto >= 70) 
        ? `Você passou neste teste com ${acertos} de ${dadosTeste.length} acertos.`
        : `Você acertou apenas ${acertos} de ${dadosTeste.length}. Tente novamente.`;

    textoEl.style.color = (percentualAcerto >= 70) ? "#28a745" : "#dc3545";
    textoEl.innerHTML = `<div style="text-align: center; margin-top: 50px;">
                            <span style="font-size: 48px; font-weight: bold;">${mensagemFinal}</span><br><br>
                            <span style="font-size: 24px;">${subMensagem}</span>
                         </div>`;
    
    btnContinuar.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    btnContinuar.onclick = () => window.location.href = "mg.html";
    btnContinuar.style.display = 'flex';
}

function alternarAudio() {
    isMuted = !isMuted;
    audioEl.muted = isMuted;
}