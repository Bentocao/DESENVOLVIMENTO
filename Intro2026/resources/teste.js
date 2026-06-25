let atual = 0;
let acertos = 0;
let isMuted = false;
let questaoAtualProcessada = null; 

// CONFIGURAÇÃO: IDs das aulas que entrarão no sorteio do Teste Final
const aulasParaSorteio = ['A1', 'A2', 'A3', 'A4', 'A5']; 

// 🎯 Captura os dados de controle enviados pelo Menu Geral via URL
const urlParamsGlobal = new URLSearchParams(window.location.search);
const idAlunoURL = parseInt(urlParamsGlobal.get('id_aluno')) || 0;
const codCursoURL = parseInt(urlParamsGlobal.get('cod_curso')) || 0;
const idProgressoURL = parseInt(urlParamsGlobal.get('id_progresso')) || 0;
const aulaNumURL = parseInt(urlParamsGlobal.get('aula_num')) || 1;

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
        await montarTesteFinal();
    } else {
        let tentativas = 0;
        const checkDados = setInterval(() => {
            if (typeof dadosTeste !== 'undefined') {
                clearInterval(checkDados);
                dadosTeste.sort(() => 0.5 - Math.random());
                carregarPergunta();
            }
            if (tentativas++ > 50) {
                clearInterval(checkDados);
                console.error("Erro: dadosTeste não carregados.");
            }
        }, 100);
    }
});

// 2. MONTAGEM DO TESTE FINAL
async function montarTesteFinal() {
    progressText.innerText = "Sorteando questões para o exame final...";
    let bancoSorteado = [];

    for (const aulaId of aulasParaSorteio) {
        try {
            const resposta = await fetch(`testes/teste${aulaId}.js`);
            const scriptTexto = await resposta.text();
            
            const extrair = new Function(scriptTexto + " return dadosTeste;");
            const dadosDaAula = extrair();

            const sorteadas = dadosDaAula.sort(() => 0.5 - Math.random()).slice(0, 2);
            bancoSorteado.push(...sorteadas);
        } catch (e) {
            console.error(`Erro ao buscar aula ${aulaId}:`, e);
        }
    }

    bancoSorteado.sort(() => 0.5 - Math.random());
    window.dadosTeste = bancoSorteado;
    atual = 0;
    acertos = 0;
    carregarPergunta();
}

// 3. PREPARAÇÃO DA QUESTÃO
function prepararQuestao(questaoOriginal) {
    let questao = JSON.parse(JSON.stringify(questaoOriginal));
    const textoCorreto = questao.opcoes[0];

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

// 5. FINALIZAÇÃO DO TESTE (ENVIO CORRETO COM ROTA RELATIVA)
function finalizarTeste() {
    containerOpcoes.innerHTML = '';
    imgEl.style.display = 'none';
    feedbackEl.style.display = 'none';
    progressText.innerText = 'Concluído';
    
    const percentualAcerto = Math.round((acertos / dadosTeste.length) * 100);
    const erros = dadosTeste.length - acertos;
    const aprovado = (percentualAcerto >= 75);

    let mensagemFinal = aprovado ? "Muito bem! 🎉" : "Infelizmente você não foi bem... ❌";
    let subMensagem = aprovado 
        ? `Você passou neste teste com ${percentualAcerto}% de acerto (${acertos} de ${dadosTeste.length}).`
        : `Você fez apenas ${percentualAcerto}% (${acertos} de ${dadosTeste.length}). O mínimo exigido é 75%.`;

    textoEl.style.color = aprovado ? "#28a745" : "#dc3545";
    textoEl.innerHTML = `
        <div style="text-align: center; margin-top: 50px;">
            <span style="font-size: 48px; font-weight: bold;">${mensagemFinal}</span><br><br>
            <span style="font-size: 24px;">${subMensagem}</span>
        </div>
    `;
    
    btnContinuar.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    
    btnContinuar.onclick = async () => {
        console.log("[TESTE] Enviando resultado do teste para o servidor...");
        try {
            const resposta = await fetch('http://localhost:3000/api/teste/concluir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_aluno: idAlunoURL,
                    cod_curso: codCursoURL,
                    id_tela_aula: idProgressoURL,
                    aula: aulaNumURL,
                    porcentagem: percentualAcerto,
                    acertos: acertos,
                    erros: erros,
                    tentativas: 1,
                    aprovado: aprovado
                })
            });

            if (!resposta.ok) {
                console.error("[ERRO] Servidor recusou a gravação.");
            } else {
                const dados = await resposta.json();
                console.log('[TESTE] Resposta do servidor:', dados);
            }
        } catch (err) {
            console.error("[ERRO] Falha de rede ao enviar:", err);
        }

        window.location.href = "mg.html";
    };
    
    btnContinuar.style.display = 'flex';
}

function alternarAudio() {
    isMuted = !isMuted;
    audioEl.muted = isMuted;
}

function sairDoTeste() {
    window.location.href = "mg.html";
}