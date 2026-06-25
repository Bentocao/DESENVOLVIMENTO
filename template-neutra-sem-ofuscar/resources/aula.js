// 1. Inicializa o motor do Neutralino na tela de aula
if (typeof Neutralino !== 'undefined') {
    Neutralino.init();

    // Força o encerramento do processo quando a janela for fechada diretamente
    Neutralino.events.on("windowClose", () => {
        Neutralino.app.exit();
    });
}

// 1. Variáveis de Estado
const urlParams = new URLSearchParams(window.location.search);
let slideAtual = parseInt(urlParams.get('slide')) || 0;
let isMuted = false;
let nomeTopicoAtual = "";

// 👇 AS DUAS VARIÁVEIS DA NOSSA TRAVA INVISÍVEL 👇
window.podeAvancar = false; 
window.timerTravaSlide = null;

window.addEventListener('load', () => {
    const idAula = urlParams.get('id'); 
    let info = null;

    if (typeof dadosMg !== 'undefined') {
        dadosMg.forEach(mod => {
            mod.topicos.forEach(top => {
                if (top.url.includes(idAula)) {
                    info = top;
                    nomeTopicoAtual = top.nome;
                }
            });
        });
    }

    if (info) {
        window.pathImgs = `imgs/${info.pasta}/`;
        window.pathAudios = `audios/${info.pasta}/`;
        window.pathIntera = `interacao/${info.pasta}/`;

        document.title = info.nome;
        
        const s = document.createElement('script');
        s.src = `conteudo/${idAula}.js`; 
        s.onload = () => mostrarSlide(); 
        document.head.appendChild(s);
    }
});

function mostrarSlide() {
    if (typeof dadosAula === 'undefined' || !dadosAula[slideAtual]) return;

    const slide = dadosAula[slideAtual];

    // 👇 1. TRAVA DE SEGURANÇA IMEDIATA 👇
    window.podeAvancar = false; 
    clearTimeout(window.timerTravaSlide); 
    
    const btnNext = document.getElementById('btnNext');
    if (btnNext) {
        btnNext.style.opacity = '0.4'; 
        btnNext.style.cursor = 'not-allowed'; 
    }
    // 👆 -------------------------------- 👆

    const imgEl = document.getElementById('main-img');
    const iframeEl = document.getElementById('main-iframe');
    const textoTela = document.getElementById('main-text');
    const divisor = document.getElementById('divisor');
    const player = document.getElementById('player-audio');

    // --- GERENCIAMENTO VISUAL DE INTERAÇÃO/TEXTO ---
    if (slide.interacao) {
        document.body.classList.add('modo-interacao');
        if(imgEl) imgEl.style.display = 'none';
        if(textoTela) textoTela.style.display = 'none';
        if(divisor) divisor.style.display = 'none';
        if(iframeEl) {
            iframeEl.style.display = 'block';
            iframeEl.src = window.pathIntera + slide.interacao + "?slide=" + slideAtual;
        }
    } else {
        document.body.classList.remove('modo-interacao');
        if(iframeEl) {
            iframeEl.style.display = 'none';
            iframeEl.src = ''; 
        }
        if(imgEl) {
            imgEl.style.display = 'block';
            imgEl.src = window.pathImgs + slide.img;
        }
        if(textoTela) {
            textoTela.style.display = 'block';
            textoTela.innerHTML = slide.text || "";
        }
        if(divisor) divisor.style.display = 'block';
    }

    // --- A NOVA MÁGICA DE ÁUDIO E TEMPO (À Prova de Falhas) ---
    if (player) {
        player.onended = null; // Limpa eventos antigos
        player.onerror = null; // Limpa erros antigos
    }

    if (slide.interacao) {
        // 1. É Interação? Você pediu para não aplicar a trava. Libera na hora!
        liberarBotaoAvancar();

    } else if (slide.audio && slide.audio.trim() !== "") {
        // 2. Tem áudio real? Toca e espera acabar.
        if (player) {
            player.src = window.pathAudios + slide.audio;
            player.muted = isMuted;
            
            // O .catch salva a pátria se o arquivo .m4a não for encontrado na pasta!
            player.play().catch(e => {
                console.warn("Erro ao carregar o áudio. Liberando botão por segurança.");
                liberarBotaoAvancar();
            });

            // Quando o áudio acabar perfeitamente
            player.onended = () => {
                liberarBotaoAvancar();
            };

            // Se o áudio começar a tocar e der erro no meio
            player.onerror = () => {
                liberarBotaoAvancar();
            };
        }
    } else {
        // 3. Sem áudio e sem interação? Cronômetro de leitura puro.
        // O parseInt garante que o JavaScript não vai se confundir com textos no JSON
        let segundos = slide.tempo ? parseInt(slide.tempo) : 10;
        let tempoEspera = segundos * 1000;
        
        window.timerTravaSlide = setTimeout(() => {
            liberarBotaoAvancar();
        }, tempoEspera);
    }

    // --- ATUALIZAÇÃO DA BARRA INFERIOR ---
    const courseLabel = document.getElementById('course-name');
    const progressLabel = document.getElementById('progress-text');
    if (courseLabel) courseLabel.innerText = nomeTopicoAtual.toUpperCase();
    if (progressLabel) progressLabel.innerText = `SLIDE ${slideAtual + 1}/${dadosAula.length}`;

    // --- LÓGICA DO BOTÃO AVANÇAR/FINALIZAR (Visual dos ícones) ---
    const btnV = document.getElementById('btnPrev');
    const nextIcon = document.getElementById('next-icon');
    const nextText = document.getElementById('next-text');

    if (btnV) btnV.disabled = (slideAtual === 0);

    if (slideAtual === dadosAula.length - 1) {
        const temProximo = verificarSeTemProximo();
        if (temProximo) {
            if(nextIcon) nextIcon.style.display = 'inline-flex';
            if(nextText) nextText.style.display = 'none';
        } else {
            if(nextIcon) nextIcon.style.display = 'none';
            if(nextText) nextText.style.display = 'inline-flex';
        }
    } else {
        if(nextIcon) nextIcon.style.display = 'inline-flex';
        if(nextText) nextText.style.display = 'none';
    }
}

// 👇 FUNÇÃO NOVA: ACENDE O BOTÃO DE NOVO 👇
function liberarBotaoAvancar() {
    window.podeAvancar = true; // Avisa o sistema que o aluno já pode clicar
    
    const btnNext = document.getElementById('btnNext');
    if (btnNext) {
        btnNext.style.opacity = '1'; // Acende a cor de novo
        btnNext.style.cursor = 'pointer'; // Volta a mãozinha de clique
    }
}

function verificarSeTemProximo() {
    const idAtual = urlParams.get('id');
    let tem = false;
    if (typeof dadosMg !== 'undefined') {
        dadosMg.forEach(aula => {
            for (let i = 0; i < aula.topicos.length; i++) {
                if (aula.topicos[i].url.includes(idAtual)) {
                    if (aula.topicos[i + 1]) tem = true;
                }
            }
        });
    }
    return tem;
}

// FUNÇÕES DE CONTROLE
function fecharAula() {
    window.location.href = "mg.html";
}

function irParaInicio() {
    slideAtual = 0;
    mostrarSlide();
}

function alternarAudio() {
    const player = document.getElementById('player-audio');
    const iconOn = document.getElementById('icon-audio-on');
    const iconOff = document.getElementById('icon-audio-off');
    isMuted = !isMuted;
    if (player) player.muted = isMuted;
    if (isMuted) {
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
    } else {
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
    }
}

// NAVEGAÇÃO PRINCIPAL
function proximo() {
    // 🛑 A VERDADEIRA BLINDAGEM: Se estiver travado, ignora o clique e sai fora! 🛑
    if (!window.podeAvancar) return;

    if (slideAtual < dadosAula.length - 1) {
        slideAtual++;
        mostrarSlide();
    } else {
        const temProximo = verificarSeTemProximo();
        if (temProximo) {
            const idAtual = urlParams.get('id');
            let proximoUrl = "";
            dadosMg.forEach(aula => {
                for (let i = 0; i < aula.topicos.length; i++) {
                    if (aula.topicos[i].url.includes(idAtual)) {
                        proximoUrl = aula.topicos[i + 1].url.replace('.html', '');
                    }
                }
            });
            window.location.href = `aula.html?id=${proximoUrl}`;
        } else {
            fecharAula();
        }
    }
}

function voltar() {
    if (slideAtual > 0) {
        let novoIdx = slideAtual - 1;
        if (dadosAula[novoIdx] && dadosAula[novoIdx].interacao) {
            if (novoIdx > 0) novoIdx--;
            else novoIdx = 0;
        }
        slideAtual = novoIdx;
        mostrarSlide();
    }
}

// --- FUNÇÃO ÚNICA DE SAÍDA (Sem perguntas) ---
function encerrarAplicativo() {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.window.exit();
        setTimeout(() => {
            Neutralino.app.exit();
        }, 100);
    } else {
        window.close();
    }
}