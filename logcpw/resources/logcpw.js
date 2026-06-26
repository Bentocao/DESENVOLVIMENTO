// =================================================================
// 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÃO
// =================================================================
let configCPW = { ip: '', unidade: '', erro: '' }; 
let todosOsCursos = [];
let paginaAtual = 1;
const cursosPorPagina = 8;

// =================================================================
// FUNÇÃO NUCLEAR DE FECHAMENTO (À PROVA DE FALHAS)
// =================================================================
async function fecharAppDeVez() {
    try {
        await Neutralino.app.exit();
        setTimeout(() => {
            if (typeof NL_PID !== 'undefined') {
                Neutralino.os.execCommand(`taskkill /F /PID ${NL_PID}`, { background: true });
            } else {
                window.close();
            }
        }, 500);
    } catch (e) {
        if (typeof NL_PID !== 'undefined') {
            Neutralino.os.execCommand(`taskkill /F /PID ${NL_PID}`, { background: true });
        }
    }
}

// =================================================================
// 2. INICIALIZAÇÃO E LEITURA DO CPW.DAT
// =================================================================
try {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.init();
        Neutralino.events.on("ready", async () => {
            await carregarConfiguracoes(); 
            if (configCPW.erro !== '') {
                const msg = document.getElementById('mensagem-erro');
                if (msg) msg.innerText = configCPW.erro;
                const inputUser = document.getElementById('usuario');
                const inputPass = document.getElementById('senha');
                if (inputUser) inputUser.disabled = true;
                if (inputPass) inputPass.disabled = true;
            }
        });
        Neutralino.events.on("windowClose", async () => { await fecharAppDeVez(); });
    }
} catch(e) { console.log("Neutralino off"); }

async function carregarConfiguracoes() {
    try {
        const caminho = "C:\\cursoscpw\\cpw.dat";
        let conteudo = await Neutralino.filesystem.readFile(caminho);
        let linhas = conteudo.split('\n');
        linhas.forEach(linha => {
            let l = linha.trim();
            if (l.startsWith('#') || l === '') return;
            if (l.includes('ip_serv=')) configCPW.ip = l.split('=')[1].trim();
            if (l.includes('host_serv=')) configCPW.unidade = l.split('=')[1].trim();
        });

        let caminhoValidacao = configCPW.unidade.toUpperCase();
        
        if (caminhoValidacao !== '' && !caminhoValidacao.startsWith('\\\\') && !caminhoValidacao.startsWith('C:\\') && !caminhoValidacao.startsWith('C:/')) {
            if (typeof gravarLogSuporte === 'function') {
                await gravarLogSuporte("SISTEMA", `Mapeamento inválido detectado: ${configCPW.unidade}`);
            }
            configCPW.erro = "Mapeamento de rede inválido. Chame seu instrutor.";
            configCPW.ip = '';
            configCPW.unidade = '';
            return; 
        }

        if (!configCPW.unidade.endsWith('\\')) configCPW.unidade += '\\';

    } catch (err) {
        configCPW.erro = "Caminho de rede não encontrado. Chame o instrutor.";
        if (typeof gravarLogSuporte === 'function') {
            await gravarLogSuporte("SISTEMA", "Arquivo cpw.dat não encontrado.");
        }
    }
}

// =================================================================
// 3. FUNÇÃO QUE DISPARA O CURSO (DINÂMICA COM AULA E TÓPICO)
// =================================================================
async function abrirCurso(pastaCurso) {
    const msgAcesso = document.getElementById('msg-erro-acesso');
    
    if (msgAcesso) {
        msgAcesso.innerText = "Iniciando curso... aguarde carregamento.";
        msgAcesso.style.display = 'block';
        msgAcesso.style.color = 'red';
        msgAcesso.style.fontWeight = 'bold';
    }

    if (typeof gravarLogSuporte === 'function') {
        await gravarLogSuporte("ERRO DE ACESSO", "Veja no cpw.dat se o host_serv está " +
       "apontando para o IP correto e se o nome deste curso está correto: " + pastaCurso);
    }

    try {
        const cursoEncontrado = todosOsCursos.find(c => c.pasta === pastaCurso);
        console.log('[PERFIL-DEBUG] Curso selecionado para abrir:', cursoEncontrado);
        const nomeAluno = localStorage.getItem('cpw_nome_aluno') || "Estudante";
        const nomeCurso = cursoEncontrado ? cursoEncontrado.nome : "Curso CPW";
        const idCurso = cursoEncontrado ? cursoEncontrado.cod_curso : 0;
        const idProgresso = cursoEncontrado
            ? (cursoEncontrado.id_progresso || cursoEncontrado.navegacao?.id_progresso || 0)
            : 0;
        const idAuth = idProgresso || idCurso;
        const vMin = cursoEncontrado ? (cursoEncontrado.versao || 1.0) : 1.0;
        const perfilCurso = cursoEncontrado ? (cursoEncontrado.perfil || "") : "";
        console.log(`[PERFIL-DEBUG] Dados de envio -> cod_curso=${idCurso} versao=${vMin} perfil='${perfilCurso}'`);
        
        // 🎯 CAPTURA O PROGRESSO REAL DO BANCO (Tratando caso não exista)
        const numAula = cursoEncontrado && cursoEncontrado.navegacao ? cursoEncontrado.navegacao.aula : 1;
        const numTopico = cursoEncontrado && cursoEncontrado.navegacao ? cursoEncontrado.navegacao.topico : 1;

        let caminhoBase = configCPW.unidade.trim();
        const arquivo = `${caminhoBase}${pastaCurso}\\${pastaCurso}.exe`;

        // 🚀 Agora o launcher envia o código do curso para validação e o id real de progresso para o menu.
        const comando = `cmd /c start "" "${arquivo}" --aluno="${nomeAluno}" --curso="${nomeCurso}" --cod_curso=${idCurso} --id_auth=${idAuth} --id_progresso=${idProgresso} --v_min=${vMin} --perfil="${perfilCurso}" --aula=${numAula} --topico=${numTopico}`;
        console.log('[PERFIL-DEBUG] Comando de abertura:', comando);
        
        Neutralino.os.execCommand(comando, { background: true });

        setTimeout(async () => {
            await fecharAppDeVez(); 
        }, 5000);

    } catch (err) {
        if (msgAcesso) {
            msgAcesso.innerText = "Falha ao disparar comando. Verifique servidor.";
        }
        if (typeof gravarLogSuporte === 'function') {
            await gravarLogSuporte("ERRO", `Falha técnica ao executar comando para ${pastaCurso}`);
        }
    }
}

// =================================================================
// 4. FUNÇÃO DE LOGIN REVISADA (COM PREFIXO /API/LOGIN)
// =================================================================
async function fazerLogin() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('senha').value;
    const msg = document.getElementById('mensagem-erro');
    
    const loginContainer = document.getElementById('login-container');
    const dashboard = document.getElementById('dashboard-aluno');
    const painelLogin = document.getElementById('painel-login');

    if (!user || !pass) {
        msg.innerText = "Preencha usuário e senha.";
        return;
    }

    if (configCPW.ip === '') {
        msg.innerText = configCPW.erro || "Configuração do sistema ausente.";
        return; 
    }

    try {
        // 🛠️ URL AJUSTADA PARA A NOVA ARQUITETURA MODULAR DO SERVIDOR
        const resposta = await fetch(`http://${configCPW.ip}:3000/api/login/aluno/${user}`);
        const resultado = await resposta.json();

        if (!resposta.ok) {
            msg.innerText = resultado.mensagem || "Erro no acesso.";
            if (typeof gravarLogSuporte === 'function') {
                await gravarLogSuporte("LOGIN", `Acesso negado para: ${user}`);
            }
            return;
        }

        if (resultado.sucesso && resultado.dados) {
            if (resultado.dados.senha === pass) {
                localStorage.setItem('cpw_nome_aluno', resultado.dados.nome);
                localStorage.setItem('cpw_pacote_aluno', resultado.dados.pacote);
                todosOsCursos = resultado.dados.cursos;
                console.log('[PERFIL-DEBUG] Cursos recebidos do login:', todosOsCursos.map(c => ({
                    pasta: c.pasta,
                    cod_curso: c.cod_curso,
                    versao: c.versao,
                    perfil: c.perfil,
                    status: c.status
                })));
                
                loginContainer.style.display = 'none'; 
                dashboard.classList.remove('dashboard-oculto');
                dashboard.classList.add('dashboard-visivel');

                renderizarPagina(1);
                montarPainelLateral(resultado.dados, painelLogin);
            } else {
                msg.innerText = "Usuário ou senha incorretos!";
            }
        }
    } catch (erro) {
        msg.innerText = "Falha na autenticação. Banco de dados indisponível";
        if (typeof gravarLogSuporte === 'function') {
            await gravarLogSuporte("CONEXÃO", `Falha ao conectar no IP ${configCPW.ip}. Detalhe: ${erro.message || erro}`);
        }
    }
}

// =================================================================
// 5. RENDERIZAÇÃO E PAINEL LATERAL
// =================================================================
function renderizarPagina(pagina) {
    paginaAtual = pagina;
    const gridCursos = document.getElementById('grid-cursos');
    if (!gridCursos) return;
    gridCursos.innerHTML = ""; 
    const inicio = (pagina - 1) * cursosPorPagina;
    const fim = inicio + cursosPorPagina;
    const cursosDaPagina = todosOsCursos.slice(inicio, fim);
    cursosDaPagina.forEach(curso => {
        const card = document.createElement('div');
        card.className = `card-curso status-${(curso.status || 'pendente').toLowerCase()}`;
        card.innerHTML = `
            <div class="card-imagem" style="background-image: url('img/cursos/${curso.pasta}.png'); background-size: cover;">
                ${curso.status === 'Concluido' ? '<span class="selo-ok">✅</span>' : ''}
            </div>
            <div class="card-info">
                <p class="curso-titulo">${curso.nome}</p>
                <div class="info-detalhes">
                    <span class="curso-versao">Ver: ${curso.versao || '-'}</span>
                    <span class="status-texto">${curso.status || 'Pendente'}</span>
                </div>
            </div>`;
        card.onclick = () => { abrirCurso(curso.pasta); }; 
        gridCursos.appendChild(card);
    });
    renderizarControlesPaginacao();
}

function renderizarControlesPaginacao() {
    const container = document.getElementById('controles-paginacao');
    if (!container) return;
    container.innerHTML = "";
    const totalPaginas = Math.ceil(todosOsCursos.length / cursosPorPagina);
    if (totalPaginas > 1) {
        for (let i = 1; i <= totalPaginas; i++) {
            const botao = document.createElement('div');
            botao.className = `pag-item ${i === paginaAtual ? 'active' : ''}`;
            botao.innerText = i;
            botao.onclick = () => renderizarPagina(i);
            container.appendChild(botao);
        }
    }
}

function montarPainelLateral(dados, container) {
    if (!container) return;
    let cursoDestaque = dados.cursos.find(c => c.status === 'Ativo') || dados.cursos[0];
    if (!cursoDestaque) return;
    const concluidos = dados.cursos.filter(c => c.status === 'Concluido').length;
    const porcentagem = dados.cursos.length > 0 ? Math.round((concluidos / dados.cursos.length) * 100) : 0;
    const painelDestaque = document.createElement('div');
    painelDestaque.className = 'destaque-lateral'; 
    painelDestaque.innerHTML = `
        <div class="destaque-cabecalho">
            <h3>Olá, ${dados.nome}! 👋</h3>
            <p>Pacote: <b>${dados.pacote}</b></p>
        </div>
        <p class="destaque-subtitulo">Você está no curso de:</p>
        <h2 class="destaque-curso-titulo">${cursoDestaque.nome}</h2>
        <div class="destaque-progresso-container">
            <div class="destaque-progresso-texto">
                <span>Progresso</span>
                <span class="destaque-porcentagem">${porcentagem}%</span>
            </div>
            <div class="destaque-barra-fundo">
                <div class="destaque-barra-preenchimento" style="width: ${porcentagem}%;"></div>
            </div>
        </div>
        <button class="btn-login btn-acessar-curso" onclick="abrirCurso('${cursoDestaque.pasta}')">Acessar Curso</button>
        <div id="msg-erro-acesso" class="msg-erro-acesso"></div>`;
    container.appendChild(painelDestaque);
}

// =========================================================
// 6. ENCERRAR APLICATIVO
// =========================================================
async function encerrarAplicativo() {
    await fecharAppDeVez();
}