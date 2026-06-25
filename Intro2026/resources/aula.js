// =========================================================
// 0. INICIALIZAÇÃO DO NEUTRALINO E TRATAMENTO DO "X"
// =========================================================
try {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.init(); 
        
        // 🔑 O SEGREDO: Avisa o Neutralino para não fechar a janela direto ao clicar no X cinza
        Neutralino.window.setRemoteControlled();

        // 🛡️ INTERCEPCAO: Quando clicar no X cinza ou der Alt+F4, executa nossa gravação com calma
        Neutralino.events.on("windowClose", () => { 
            encerrarAplicativo(); 
        });
    }
} catch(e) { console.log("Neutralino off"); }

// =========================================================
// 1. VARIÁVEIS DE ESTADO E CAPTURA DE ARGUMENTOS DO BANCO
// =========================================================
const urlParams = new URLSearchParams(window.location.search);

// 🎯 [ATUALIZADO]: Captura o ID único (Chave Primária) da tabela tela_aula vindo da URL
let id_controle = parseInt(urlParams.get('id_progresso')) || 0; 

let aulaAtual = parseInt(urlParams.get('aula')) || 1;
let topicoAtual = parseInt(urlParams.get('topico')) || 1;

// ⚡ [NOVO] TRAVA DO MODO REVISÃO: Captura se viemos de um tópico antigo do menu
const isModoRevisao = urlParams.get('modo') === 'revisao';

// Gerenciamento dos slides em memória RAM (Inicia no slide recebido ou do zero)
let slideAtual = parseInt(urlParams.get('slide')) || 0;
let isMuted = false;
let nomeTopicoAtual = "";

// 👇 AS DUAS VARIÁVEIS DA NOSSA TRAVA INVISÍVEL 👇
window.podeAvancar = false; 
window.timerTravaSlide = null;

// =========================================================
// 2. CARREGAMENTO E BUSCA DE PROGRESSO NO BANCO (ENTRADA)
// =========================================================
window.addEventListener('load', async () => {
    const idAula = urlParams.get('id'); 
    let info = null;

    // 1. Busca os metadados do menu geral
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
        
        // 2. Só busca o progresso se NÃO estivermos no modo revisão
        if (id_controle > 0 && !isModoRevisao) {
            try {
                console.log(`[BANCO LOCAL] Consultando último frame salvo para progresso normal...`);
                const resposta = await fetch(`http://localhost:3000/api/aula/progresso/${id_controle}`);
                if (resposta.ok) {
                    const dados = await resposta.json();
                    if (dados && dados.frame > 0) {
                        slideAtual = dados.frame - 1; 
                        console.log(`%c[BANCO LOCAL] Progresso recuperado! Iniciando no Frame: ${dados.frame}`, "color: #28a745; font-weight: bold;");
                    }
                }
            } catch (e) {
                console.error("[BANCO LOCAL] Erro ao buscar progresso na inicialização, usando padrão da URL:", e);
            }
        } else if (isModoRevisao) {
            console.log("%c[NAVEGAÇÃO] Iniciando em Modo Revisão. Iniciando slide do zero.", "color: #dc3545; font-weight: bold;");
            slideAtual = 0; // Sempre começa o conteúdo antigo do início
        }

        // 3. Carrega o script de conteúdo e renderiza a tela já no slide correto!
        const s = document.createElement('script');
        s.src = `conteudo/${idAula}.js`; 
        s.onload = () => {
            if (typeof dadosAula !== 'undefined' && !dadosAula[slideAtual]) {
                slideAtual = 0;
            }
            mostrarSlide(); 
        };
        document.head.appendChild(s);
    }
});

function mostrarSlide() {
    if (typeof dadosAula === 'undefined' || !dadosAula[slideAtual]) return;
    
    console.log(`[RAM] Slide Atual: ${slideAtual} | Frame para o Banco: ${slideAtual + 1} | Modo Revisão: ${isModoRevisao}`);

    const slide = dadosAula[slideAtual];

    // 🎯 GATILHO DE SEGURANÇA ANTIFUGA (PROTEGIDO)
    if (slideAtual === (dadosAula.length - 1)) {
        console.log("[SEGURANÇA] Último slide alcançado! Verificando gravação preventiva...");
        
        // ⚡ TRAVA DE REVISÃO: Se for apenas revisão, pula a gravação automática do fim da aula
        if (isModoRevisao) {
            console.log("[SEGURANÇA] Modo revisão ativo. Pulando gravação preventiva para proteger o banco.");
        } else {
            let aulaParaSalvar = aulaAtual;
            let topicoParaSalvar = topicoAtual;
            let frameParaSalvar = 1;
            let praticarParaSalvar = 0;
            
            const temProximoTopico = verificarSeTemProximo();
            
            if (temProximoTopico) {
                topicoParaSalvar = topicoAtual + 1;
                frameParaSalvar = 1;
                praticarParaSalvar = 0;
                console.log(`[SEGURANÇA] Avanço preventivo para o próximo tópico: Aula ${aulaParaSalvar}, Tópico ${topicoParaSalvar}`);
            } else {
                aulaParaSalvar = aulaAtual;
                topicoParaSalvar = topicoAtual;
                frameParaSalvar = slideAtual + 1; 
                praticarParaSalvar = 1; 
                console.log(`[SEGURANÇA] Fim da teoria alcançado. Gravando posição final estável e ativando o Praticar: 1`);
            }
            
            fetch('http://localhost:3000/api/aula/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id_controle,
                    aula: aulaParaSalvar,
                    topico: topicoParaSalvar,
                    frame: frameParaSalvar,
                    praticar: praticarParaSalvar
                })
            }).then(() => {
                console.log(`[BANCO] Sucesso! Registro preventivo consolidado.`);
            }).catch(err => {
                console.error("[ERRO] Falha na gravação preventiva do progresso:", err);
            });
        }
    }

    // 👇 1. TRAVA DE SEGURANÇA IMEDIATA 👇
    window.podeAvancar = false; 
    clearTimeout(window.timerTravaSlide); 
    
    const btnNext = document.getElementById('btnNext');
    if (btnNext) {
        btnNext.style.opacity = '0.4'; 
        btnNext.style.cursor = 'pointer'; 
    }

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

    // --- GERENCIAMENTO DE ÁUDIO E TEMPO ---
    if (player) {
        player.onended = null; 
        player.onerror = null; 
    }

    if (slide.interacao) {
        liberarBotaoAvancar();
    } else if (slide.audio && slide.audio.trim() !== "") {
        if (player) {
            player.src = window.pathAudios + slide.audio;
            player.muted = isMuted;
            
            player.play().catch(e => {
                console.warn("Erro ao carregar o áudio. Liberando botão por segurança.");
                liberarBotaoAvancar();
            });

            player.onended = () => { liberarBotaoAvancar(); };
            player.onerror = () => { liberarBotaoAvancar(); };
        }
    } else {
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

function liberarBotaoAvancar() {
    window.podeAvancar = true; 
    const btnNext = document.getElementById('btnNext');
    if (btnNext) {
        btnNext.style.opacity = '1'; 
        btnNext.style.cursor = 'pointer'; 
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

// =========================================================================
// 🎯 FUNÇÃO COMPLETA: Redireciona mantendo o modo revisão se necessário
// =========================================================================
async function fecharAula() {
    console.log("[FRONTEND] Botão 'Voltar ao Menu Geral' clicado.");

    // Só chama a função de gravar se NÃO for revisão
    if (!isModoRevisao) {
        await salvarProgressoNoBanco();
        console.log("[FRONTEND] Aguardando consolidação do banco...");
        await new Promise(resolve => setTimeout(resolve, 400));
    } else {
        console.log("[FRONTEND] Modo revisão ativo. Ignorando salvamento ao fechar.");
    }

    let frameReal = slideAtual + 1; 
    console.log(`[FRONTEND] Redirecionando para o Menu Geral. Tópico: ${topicoAtual} | Frame: ${frameReal}`);
    
    // Devolve o aluno para o menu passando os parâmetros que ele já tinha
    window.location.href = `mg.html?id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&frame=${frameReal}`;
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

// NAVEGAÇÃO PRINCIPAL (REVISÃO BLINDADA)
async function proximo() {
    if (!window.podeAvancar) return;

    if (slideAtual < dadosAula.length - 1) {
        slideAtual++;
        mostrarSlide();
    } else {
        const temProximo = verificarSeTemProximo();
        
        if (temProximo) {
            const idAtual = urlParams.get('id');
            let proximoUrl = "";
            let novaAula = aulaAtual;
            let novoTopico = topicoAtual + 1; 

            dadosMg.forEach(aula => {
                for (let i = 0; i < aula.topicos.length; i++) {
                    if (aula.topicos[i].url.includes(idAtual)) {
                        proximoUrl = aula.topicos[i + 1].url.replace('.html', '');
                        novaAula = aula.id; 
                        // Se estiver revisando, o progresso real "topicoAtual" não muda na URL de navegação da revisão
                        novoTopico = isModoRevisao ? topicoAtual : (topicoAtual + 1);
                    }
                }
            });

            // ⚡ Passa a tag &modo=revisao para a próxima tela se o aluno estiver revisando
            let stringUrlProximo = `aula.html?id=${proximoUrl}&id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&slide=0`;
            if (isModoRevisao) stringUrlProximo += `&modo=revisao`;

            window.location.href = stringUrlProximo;
        } else {
            console.log("[PLAYER] Fim do conteúdo alcançado.");
            const frameReal = slideAtual + 1;
            
            // Se for revisão, volta ao menu sem injetar a trava de praticar=1
            if (isModoRevisao) {
                window.location.href = `mg.html?id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&frame=${frameReal}`;
            } else {
                window.location.href = `mg.html?id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&frame=${frameReal}&praticar=1`;
            }
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

// =========================================================
// GESTÃO DE PERSISTÊNCIA E ENCERRAMENTO (PROTEGIDA)
// =========================================================
async function salvarProgressoNoBanco() {
    // ⚡ SE FOR MODO REVISÃO, O FILTRO PARA AQUI E NÃO ENVIA NADA PRO NODE!
    if (isModoRevisao) {
        console.log("[BANCO] Modo revisão detectado. Abortando persistência para proteger o progresso real.");
        return;
    }

    try {
        const frameParaSalvar = slideAtual + 1;
        console.log(`[BANCO] Gravando -> Linha ID: ${id_controle}, Aula: ${aulaAtual}, Tópico: ${topicoAtual}, Frame: ${frameParaSalvar}`);

        await fetch('http://localhost:3000/api/aula/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id_controle,       
                aula: aulaAtual,        
                topico: topicoAtual,    
                frame: frameParaSalvar  
            })
        });
        console.log(`[BANCO] Sucesso! Frame ${frameParaSalvar} persistido.`);

    } catch (e) {
        console.error("Falha ao persistir dados no banco local:", e);
    }
}

async function encerrarAplicativo() {
    const frameParaSalvar = slideAtual + 1;

    console.log(
        `%c[DIAGNÓSTICO X ENCERRAMENTO]\n` +
        `• ID Controle (Linha Banco): ${id_controle}\n` +
        `• Aula Atual: ${aulaAtual}\n` +
        `• Tópico Atual: ${topicoAtual}\n` +
        `• Frame Calculated: ${frameParaSalvar}\n` +
        `• Modo Revisão: ${isModoRevisao}`, 
        "color: #007bff; font-weight: bold; font-size: 12px;"
    );

    try {
        // Se for revisão, ele fecha sem gravar nada ao clicar no X cinza
        if (!isModoRevisao) {
            await salvarProgressoNoBanco();
        }

        if (typeof Neutralino !== 'undefined') {
            await Neutralino.app.exit();
        } else {
            window.close();
        }
    } catch(e) {
        console.error("Erro ao encerrar o aplicativo:", e);
        if (typeof Neutralino !== 'undefined') Neutralino.app.exit();
    }
}

// =========================================================================
// 🚪 PONTE DE COMUNICAÇÃO LIMPA PARA AS INTERAÇÕES (IFRAMES)
// =========================================================================
window.avancarSlidePelaInteracao = function(novoIndex) {
    console.log(`[PONTE] Interacao concluída. Forçando avanço para o index: ${novoIndex}`);
    
    const iframeEl = document.getElementById('main-iframe');
    if (iframeEl) {
        iframeEl.style.display = 'none';
        iframeEl.src = ''; 
    }
    document.body.classList.remove('modo-interacao');

    slideAtual = novoIndex; 
    mostrarSlide();        
};