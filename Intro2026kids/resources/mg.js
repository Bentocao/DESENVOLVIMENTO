// =========================================================
// 0. INICIALIZAÇÃO DO NEUTRALINO
// =========================================================
try {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.init(); // Liga o motor
        
        // Rede de segurança para o Alt+F4 (Evita zumbis no Gerenciador de Tarefas)
        Neutralino.events.on("windowClose", () => { Neutralino.app.exit(); });
    }
} catch(e) { console.log("Neutralino off"); }

// =========================================================
// 1. DADOS DINÂMICOS (ARGUMENTOS)
// =========================================================
let nomeDoAluno = "Estudante";
let nomeDoCurso = "Curso CPW";
let auth_id = 0;        // ID real da linha de progresso na tabela tela_aula
let cod_curso = 0;      // Código do curso (matriz) usado na validação de segurança
let id_controle = 0;    // ID real da linha de progresso na tabela tela_aula
let v_minima_exigida = 1.0;
let perfil_minimo_exigido = "";

let aulaAtual = 1;
let topicoAtual = 1;

let modoPraticarAtivo = false;
let modoSenhaInstrutor = false;
let modoTesteLiberado = false;

// =========================================================
// 1.1 IDENTIDADE DO PACOTE (lida do config.js)
// =========================================================
let ID_CURSO_ESTE_ARQUIVO = 0;
let VERSAO_DESTE_ARQUIVO = 0;
let PERFIL_DESTE_ARQUIVO = "";

async function carregarManifesto() {
    // Carrega os valores do config.js (definido inline na página)
    if (typeof CONFIG_CURSO !== 'undefined') {
        ID_CURSO_ESTE_ARQUIVO = Number(CONFIG_CURSO.cod_curso ?? 0);
        VERSAO_DESTE_ARQUIVO  = Number(CONFIG_CURSO.versao ?? 0);
        PERFIL_DESTE_ARQUIVO = CONFIG_CURSO.perfil ?? "";
        console.log(`[MANIFESTO] ✓ Carregado de config.js - cod_curso=${ID_CURSO_ESTE_ARQUIVO} versao=${VERSAO_DESTE_ARQUIVO} perfil=${PERFIL_DESTE_ARQUIVO}`);

        if (!ID_CURSO_ESTE_ARQUIVO || !VERSAO_DESTE_ARQUIVO) {
            console.error(`[MANIFESTO] config.js incompleto ou invalido - cod_curso=${ID_CURSO_ESTE_ARQUIVO} versao=${VERSAO_DESTE_ARQUIVO} perfil=${PERFIL_DESTE_ARQUIVO}`);
            if (typeof gravarLogSuporte === 'function') {
                gravarLogSuporte('CONFIG', `config.js incompleto ou invalido. cod_curso=${ID_CURSO_ESTE_ARQUIVO} versao=${VERSAO_DESTE_ARQUIVO} perfil=${PERFIL_DESTE_ARQUIVO}`);
            }
        }
    } else {
        console.error('[MANIFESTO] config.js ausente ou nao carregado - CONFIG_CURSO nao esta definido.');
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('CONFIG', 'config.js ausente ou nao carregado - CONFIG_CURSO nao esta definido.');
        }
    }
}

function normalizarPerfil(valor) {
    return String(valor || "").trim().toLowerCase();
}

function validarPacoteDoCurso() {
    // Trava 1: abertura direta do .exe (sem passar pelo logcpw)
    if (cod_curso === 0 && id_controle === 0 && auth_id === 0) {
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('ACESSO NEGADO', `Abertura direta sem login detectada. cod_recebido=${cod_curso} id_controle=${id_controle} auth_id=${auth_id}`);
        }
        bloquearTelaComErro(
            'Acesso Negado',
            'Este curso não pode ser aberto diretamente.<br><br>Por favor, feche esta janela, faça o login no <b>Portal do Aluno</b> e inicie o curso por lá.'
        );
        return false;
    }

    console.log(
        `[VALIDACAO-PACOTE] cod_recebido=${cod_curso} cod_arquivo=${ID_CURSO_ESTE_ARQUIVO} versao_min_recebida=${v_minima_exigida} versao_arquivo=${VERSAO_DESTE_ARQUIVO} perfil_min_recebido=${perfil_minimo_exigido} perfil_arquivo=${PERFIL_DESTE_ARQUIVO}`
    );

    if (!ID_CURSO_ESTE_ARQUIVO || !VERSAO_DESTE_ARQUIVO) {
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('ACESSO NEGADO', `Falha de configuracao interna do curso. cod_arquivo=${ID_CURSO_ESTE_ARQUIVO} versao_arquivo=${VERSAO_DESTE_ARQUIVO}`);
        }
        bloquearTelaComErro(
            'Acesso Negado',
            'Este curso nao pode ser iniciado corretamente.<br><br>Por favor, chame o seu instrutor.'
        );
        return false;
    }

    if (Number(VERSAO_DESTE_ARQUIVO) !== Number(v_minima_exigida)) {
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('ACESSO NEGADO', `Versao divergente. versao_recebida=${v_minima_exigida} versao_arquivo=${VERSAO_DESTE_ARQUIVO} cod_recebido=${cod_curso} cod_arquivo=${ID_CURSO_ESTE_ARQUIVO}`);
        }
        bloquearTelaComErro(
            'Acesso Negado',
            'O curso está com a versão desatualizada.<br><br>Por favor, chame o seu instrutor.'
        );
        return false;
    }

    if (Number(cod_curso) !== Number(ID_CURSO_ESTE_ARQUIVO)) {
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('ACESSO NEGADO', `Codigo do curso divergente. cod_recebido=${cod_curso} cod_arquivo=${ID_CURSO_ESTE_ARQUIVO} versao_recebida=${v_minima_exigida} versao_arquivo=${VERSAO_DESTE_ARQUIVO}`);
        }
        bloquearTelaComErro(
            'Acesso Negado',
            'O curso está com o código errado.<br><br>Por favor, chame o seu instrutor.'
        );
        return false;
    }

    if (perfil_minimo_exigido && normalizarPerfil(PERFIL_DESTE_ARQUIVO) !== normalizarPerfil(perfil_minimo_exigido)) {
        if (typeof gravarLogSuporte === 'function') {
            gravarLogSuporte('ACESSO NEGADO', `Perfil divergente. perfil_recebido=${normalizarPerfil(perfil_minimo_exigido)} perfil_arquivo=${normalizarPerfil(PERFIL_DESTE_ARQUIVO)} cod_recebido=${cod_curso} cod_arquivo=${ID_CURSO_ESTE_ARQUIVO}`);
        }
        bloquearTelaComErro(
            'Acesso Negado',
            `O curso aberto e do perfil <b>${normalizarPerfil(PERFIL_DESTE_ARQUIVO) || 'nao definido'}</b>, mas sua matricula ativa e do perfil <b>${normalizarPerfil(perfil_minimo_exigido)}</b>.<br><br>Feche esta janela e inicie o curso correto pelo <b>Portal do Aluno</b>.`
        );
        return false;
    }

    return true;
}

if (typeof NL_ARGS !== 'undefined') {
    NL_ARGS.forEach(arg => {
        const partes = arg.split('=');
        if (partes.length < 2) return;
        const valor = partes[1].replace(/"/g, '');

        if (arg.startsWith('--aluno='))   nomeDoAluno = valor;
        if (arg.startsWith('--curso='))   nomeDoCurso = valor;
        if (arg.startsWith('--id_auth='))      auth_id = parseInt(valor) || 0;
        if (arg.startsWith('--id_progresso=')) id_controle = parseInt(valor) || 0;
        if (arg.startsWith('--cod_curso='))    cod_curso = parseInt(valor) || 0;
        if (arg.startsWith('--v_min='))   v_minima_exigida = parseFloat(valor);
        if (arg.startsWith('--perfil='))  perfil_minimo_exigido = valor;
        if (arg.startsWith('--aula='))    aulaAtual = parseInt(valor);
        if (arg.startsWith('--topico='))  topicoAtual = parseInt(valor);
    });
}

// =========================================================
// 2. VALIDAÇÃO E INTERFACE (DISPARADO NO LOAD)
// =========================================================

function bloquearTelaComErro(titulo, message) {
    document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100vh;width:100vw;justify-content:center;align-items:center;background-color:#f8f9fa;color:#333;font-family:'Segoe UI',sans-serif;text-align:center;padding:20px;box-sizing:border-box;">
            <div style="background:white;padding:40px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.1);width:560px;max-width:100%;min-height:280px;border-top:5px solid #d93025;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
                <h1 style="color:#d93025;margin-top:0;font-size:1.8em;">⚠️ ${titulo}</h1>
                <p style="font-size:1.1em;color:#555;line-height:1.5;margin-bottom:30px;">${message}</p>
                <button onclick="encerrarAplicativo()" style="background:#d93025;color:white;border:none;padding:12px 25px;border-radius:5px;font-size:1em;font-weight:bold;cursor:pointer;">Fechar Aplicativo</button>
            </div>
        </div>
    `;
}

window.addEventListener('load', async () => {
    await carregarManifesto();

    if (typeof NL_ARGS !== 'undefined') {
        console.log("ARGUMENTOS REAIS QUE CHEGARAM:\n", NL_ARGS.join("\n"));
    }

    if (!validarPacoteDoCurso()) {
        return;
    }

    if (id_controle === 0) {
        id_controle = auth_id;
    }

    if (id_controle > 0) {
        try {
            console.log(`[MENU-REFRESH] Consultando progresso real no banco para id=${id_controle}`);
            const resposta = await fetch(`http://localhost:3000/api/aula/progresso/${id_controle}`);
            if (resposta.ok) {
                const dados = await resposta.json();
                if (dados) {
                    aulaAtual   = typeof dados.aula   === 'number' ? dados.aula   : aulaAtual;
                    topicoAtual = typeof dados.topico === 'number' ? dados.topico : topicoAtual;
                    const statusPraticarDoBanco = parseInt(dados.praticar) || 0;
                    const statusTesteDoBanco    = parseInt(dados.teste)    || 0;
                    modoPraticarAtivo  = (statusPraticarDoBanco === 1);
                    modoSenhaInstrutor = (statusPraticarDoBanco === 2);
                    modoTesteLiberado  = (statusTesteDoBanco === 1);
                    console.log(`[MENU-REFRESH] Banco respondeu -> Praticar: ${statusPraticarDoBanco} | Teste: ${statusTesteDoBanco}`);
                }
            }
        } catch (e) {
            console.error('[MENU-REFRESH] Falha ao buscar o progresso real no banco:', e);
        }
    }

    configurarInterface();
    carregarMenu();
    atualizarCardProgresso(false);
});

function configurarInterface() {
    const elNomeAluno = document.getElementById('nome-aluno');
    if (elNomeAluno) elNomeAluno.innerText = nomeDoAluno;

    const cName = document.getElementById('course-name');
    if (cName) cName.innerText = nomeDoCurso;

    const btnSair = document.getElementById('btnSair');
    if (btnSair) btnSair.onclick = () => encerrarAplicativo();

    const btnMenuContinuar = document.getElementById('btnMenuContinuar');
    if (btnMenuContinuar) {
        if (modoPraticarAtivo || modoSenhaInstrutor || modoTesteLiberado) {
            btnMenuContinuar.disabled = true;
            btnMenuContinuar.title = "Teoria concluida!";
            btnMenuContinuar.classList.add('btn-bloqueado');
            btnMenuContinuar.onclick = null;
        } else {
            btnMenuContinuar.disabled = false;
            btnMenuContinuar.classList.remove('btn-bloqueado');
            btnMenuContinuar.onclick = () => {
                const aulaObj = dadosMg.find(a => a.id === aulaAtual);
                if (aulaObj && aulaObj.topicos[topicoAtual - 1]) {
                    const topicoObj = aulaObj.topicos[topicoAtual - 1];
                    const idParaAbrir = topicoObj.url.replace('.html', '');
                    abrirTopico(idParaAbrir);
                }
            };
        }
    }

    const btnMenuPraticar = document.getElementById('btnMenuPraticar');
    if (btnMenuPraticar) {
        if (modoPraticarAtivo) {
            btnMenuPraticar.disabled = false;
            btnMenuPraticar.classList.remove('btn-bloqueado');
            btnMenuPraticar.onclick = async () => {
                try {
                    await fetch('http://localhost:3000/api/aula/salvar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: id_controle, aula: aulaAtual, topico: topicoAtual, frame: 7, praticar: 2 })
                    });
                } catch (err) {
                    console.error("[ERRO] Erro ao salvar status de prática concluída:", err);
                }
                encerrarAplicativo();
            };
        } else {
            btnMenuPraticar.disabled = true;
            btnMenuPraticar.classList.add('btn-bloqueado');
            btnMenuPraticar.onclick = null;
        }
    }

    const btnMenuTestes = document.getElementById('btnMenuTestes');
    if (btnMenuTestes) {
        if (modoTesteLiberado) {
            btnMenuTestes.disabled = false;
            btnMenuTestes.classList.remove('btn-bloqueado');
            btnMenuTestes.onclick = () => {
                const aulaObj = dadosMg.find(a => a.id === aulaAtual);
                if (aulaObj && aulaObj.testeUrl) {
                    abrirTeste(aulaObj.testeUrl);
                } else {
                    alert("Avaliação não localizada para este módulo.");
                }
            };
        } else {
            btnMenuTestes.disabled = true;
            btnMenuTestes.classList.add('btn-bloqueado');
            btnMenuTestes.onclick = () => {
                alert("Este teste está bloqueado. Peça liberação ao instrutor digitando a senha.");
            };
        }
    }
}

function carregarMenu() {
    const container = document.getElementById('menu-aulas-container');
    if (!container) return;
    container.innerHTML = '';

    dadosMg.forEach(aula => {
        const idSubMenu = `aula-${aula.id}`;
        let htmlTopicos = '';

        aula.topicos.forEach((t, index) => {
            const numeroTopico = index + 1;
            const idDaAula = t.url.replace('.html', '');
            let corClasse = "";
            let icone = "▶️";
            let clique = "";

            let pesoAtual     = (aulaAtual * 100) + topicoAtual;
            let pesoIteracao  = (aula.id * 100) + numeroTopico;

            if (pesoIteracao < pesoAtual) {
                corClasse = "color: #dc3545; font-weight: normal;";
                icone = "✅";
                clique = `onclick="abrirTopico('${idDaAula}', true)"`;
            } else if (pesoIteracao === pesoAtual) {
                corClasse = "color: #28a745; font-weight: bold;";
                icone = "🟢";
                clique = `onclick="abrirTopico('${idDaAula}', false)"`;
            } else {
                corClasse = "color: #6c757d; font-style: italic;";
                icone = "🔒";
                clique = `onclick="alert('Tópico bloqueado!')"`;
            }

            htmlTopicos += `<li class="topico-item" ${clique} style="${corClasse}">${icone} ${t.nome}</li>`;
        });

        const divAula = document.createElement('div');
        divAula.className = 'aula-container';
        divAula.innerHTML = `
            <div class="aula-item" onclick="toggleAula('${idSubMenu}')">
                <span>${aula.id}. ${aula.titulo}</span>
                <span class="seta" id="seta-${idSubMenu}">▼</span>
            </div>
            <ul id="${idSubMenu}" class="sub-menu">${htmlTopicos}</ul>`;
        container.appendChild(divAula);
    });
}

function atualizarCardProgresso(concluido) {
    const tituloAula   = document.getElementById('aula-atual-titulo');
    const tituloTopico = document.getElementById('topico-atual-titulo');

    if (modoSenhaInstrutor && !modoTesteLiberado) {
        if (tituloAula) tituloAula.innerText = `Praticar Concluído! 📖`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `
                <span style="color:#666;font-size:0.95em;display:block;margin-bottom:15px;">
                    Peça ao seu instrutor que digite a senha de liberação para os testes.
                </span>
                <div style="display:flex;gap:10px;margin-top:10px;">
                    <input type="password" id="inputSenhaInstrutor" placeholder="Senha do Instrutor"
                           style="padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;width:180px;box-sizing:border-box;">
                    <button onclick="validarSenhaDoInstrutor()"
                            style="background:#0078d7;color:white;border:none;padding:8px 15px;border-radius:4px;font-weight:bold;cursor:pointer;font-size:14px;">
                        Liberar Avaliação
                    </button>
                </div>
            `;
        }
        return;
    }

    if (modoTesteLiberado) {
        if (tituloAula) tituloAula.innerText = `Avaliação da Aula ${aulaAtual} Disponível! 📝`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `<span style="color:#28a745;font-weight:bold;">➔ Clique no botão de Avaliações na barra inferior para iniciar.</span>`;
        }
        return;
    }

    if (modoPraticarAtivo) {
        if (tituloAula) tituloAula.innerText = `Aula ${aulaAtual} Concluída! 🎉`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `<span style="color:#28a745;font-weight:bold;">➔ Faça os exercícios da sua apostila.</span>`;
        }
        return;
    }

    const aulaObj = dadosMg.find(a => a.id === aulaAtual);
    if (aulaObj && aulaObj.topicos[topicoAtual - 1]) {
        const topicoObj = aulaObj.topicos[topicoAtual - 1];
        if (tituloAula)   tituloAula.innerText   = `Aula ${aulaAtual}: ${aulaObj.titulo}`;
        if (tituloTopico) tituloTopico.innerText = `Tópico: ${topicoObj.nome}`;
    }
}

async function validarSenhaDoInstrutor() {
    const inputSenha = document.getElementById('inputSenhaInstrutor');
    if (!inputSenha) return;

    const hoje = new Date();
    const dia  = hoje.getDate();
    const mes  = hoje.getMonth() + 1;
    const senhaCorretaDoDia = `avanti${dia}-${mes}`;

    if (inputSenha.value.trim() === senhaCorretaDoDia) {
        console.log("[INSTRUTOR] Senha correta! Gravando liberação do teste no banco...");
        try {
            await fetch('http://localhost:3000/api/aula/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id_controle,
                    aula: aulaAtual,
                    topico: topicoAtual,
                    frame: 7,
                    praticar: 0,
                    teste: 1
                })
            });
            modoSenhaInstrutor = false;
            modoTesteLiberado  = true;
            configurarInterface();
            atualizarCardProgresso();
        } catch (err) {
            console.error("Falha ao salvar liberação de testes:", err);
            alert("Erro de comunicação com o servidor.");
        }
    } else {
        alert("Senha de liberação incorreta! Verifique com o seu instrutor.");
        inputSenha.value = "";
        inputSenha.focus();
    }
}

function toggleAula(idMenu) {
    const menuClicado = document.getElementById(idMenu);
    const setaClicada = document.getElementById(`seta-${idMenu}`);
    if (!menuClicado) return;
    const isAberto = menuClicado.classList.contains('show');
    document.querySelectorAll('.sub-menu').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.seta').forEach(el => el.innerText = '▼');
    if (!isAberto) {
        menuClicado.classList.add('show');
        if (setaClicada) setaClicada.innerText = '▲';
    }
}

function abrirTopico(id, isRevisao = false) {
    let urlDestino = `aula.html?id=${id}&id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&slide=0`;
    if (isRevisao) {
        urlDestino += `&modo=revisao`;
        console.log(`[NAVEGAÇÃO] Abrindo aula antiga no MODO REVISÃO: ${id}`);
    } else {
        console.log(`[NAVEGAÇÃO] Abrindo aula atual no MODO PROGRESSO: ${id}`);
    }
    window.location.href = urlDestino;
}

function abrirTeste(url) {
    const urlFormatada = `${url}&id_aluno=${id_controle}&cod_curso=${cod_curso}&id_progresso=${id_controle}&aula_num=${aulaAtual}`;
    console.log("[MENU] Abrindo teste com a URL formatada:", urlFormatada);
    window.location.href = urlFormatada;
}

async function encerrarAplicativo() {
    try {
        if (typeof Neutralino !== 'undefined') {
            await Neutralino.app.exit();
        } else {
            window.close();
        }
    } catch(e) {
        console.error("Erro ao encerrar o aplicativo:", e);
    }
}
