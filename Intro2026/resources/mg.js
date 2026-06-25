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
let auth_id = 0;        // 🆔 ID real da linha de progresso na tabela tela_aula
let cod_curso = 0;      // 🧭 Código do curso (matriz) usado na validação de segurança
let id_controle = 0;    // 🎯 ID real da linha de progresso na tabela tela_aula
let v_minima_exigida = 1.0;

let aulaAtual = 1;
let topicoAtual = 1;

// 🎯 VARIÁVEIS GLOBAIS PARA CONTROLE DOS TRÊS ESTADOS VISUAIS DO CARD
let modoPraticarAtivo = false;   // Status 1 (Fazendo apostila)
let modoSenhaInstrutor = false;  // Status 2 (Apostila pronta, esperando senha)
let modoTesteLiberado = false;   // Coluna teste = 1 (Liberado para avaliar)

// =========================================================
// 1.1 IDENTIDADE FIXA DESTE PACOTE DE CURSO (Hardcoded)
// =========================================================
const ID_CURSO_ESTE_ARQUIVO = 1; 
const VERSAO_DESTE_ARQUIVO = 1.0;

if (typeof NL_ARGS !== 'undefined') {
    NL_ARGS.forEach(arg => {
        const partes = arg.split('=');
        if (partes.length < 2) return;
        const valor = partes[1].replace(/"/g, '');

        if (arg.startsWith('--aluno='))   nomeDoAluno = valor;
        if (arg.startsWith('--curso='))   nomeDoCurso = valor;
        
        if (arg.startsWith('--id_auth=')) {
            auth_id = parseInt(valor) || 0;
        }
        if (arg.startsWith('--id_progresso=')) {
            id_controle = parseInt(valor) || 0;
        }
        if (arg.startsWith('--cod_curso=')) {
            cod_curso = parseInt(valor) || 0;
        }
        
        if (arg.startsWith('--v_min='))   v_minima_exigida = parseFloat(valor);
        if (arg.startsWith('--aula='))    aulaAtual = parseInt(valor);
        if (arg.startsWith('--topico='))  topicoAtual = parseInt(valor);
    });
}

// =========================================================
// 2. VALIDAÇÃO E INTERFACE (DISPARADO NO LOAD)
// =========================================================

function bloquearTelaComErro(titulo, message) {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100vh; width: 100vw; justify-content: center; align-items: center; background-color: #f8f9fa; color: #333; font-family: 'Segoe UI', sans-serif; text-align: center; padding: 20px; box-sizing: border-box;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; border-top: 5px solid #d93025;">
                <h1 style="color: #d93025; margin-top: 0; font-size: 1.8em;">⚠️ ${titulo}</h1>
                <p style="font-size: 1.1em; color: #555; line-height: 1.5; margin-bottom: 30px;">${message}</p>
                <button onclick="encerrarAplicativo()" style="background: #d93025; color: white; border: none; padding: 12px 25px; border-radius: 5px; font-size: 1em; font-weight: bold; cursor: pointer;">Fechar Aplicativo</button>
            </div>
        </div>
    `;
}

window.addEventListener('load', async () => {
    if (typeof NL_ARGS !== 'undefined') {
        console.log("ARGUMENTOS REAIS QUE CHEGARAM:\n", NL_ARGS.join("\n"));
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
                    aulaAtual = typeof dados.aula === 'number' ? dados.aula : aulaAtual;
                    topicoAtual = typeof dados.topico === 'number' ? dados.topico : topicoAtual;
                    
                    const statusPraticarDoBanco = parseInt(dados.praticar) || 0;
                    const statusTesteDoBanco = parseInt(dados.teste) || 0;

                    // 🎛️ Processa os dados recebidos do banco e liga os modos lógicos
                    modoPraticarAtivo = (statusPraticarDoBanco === 1);
                    modoSenhaInstrutor = (statusPraticarDoBanco === 2); 
                    modoTesteLiberado = (statusTesteDoBanco === 1);
                    
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

    // 🔗 VINCULAÇÃO E TRAVA DO BOTÃO CONTINUAR
    const btnMenuContinuar = document.getElementById('btnMenuContinuar');
    if (btnMenuContinuar) {
        // Se concluiu a teoria (1) ou está na trava da senha (2), bloqueia o botão de Teoria
        if (modoPraticarAtivo || modoSenhaInstrutor || modoTesteLiberado) {
            btnMenuContinuar.disabled = true;
            btnMenuContinuar.title = "Teoria concluída!";
            btnMenuContinuar.classList.add('btn-bloqueado'); // Opaco via CSS
            btnMenuContinuar.onclick = null;
        } else {
            btnMenuContinuar.disabled = false;
            btnMenuContinuar.classList.remove('btn-bloqueado'); // Normal via CSS
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

    // 🔗 VINCULAÇÃO E LIBERAÇÃO DO BOTÃO PRATICAR
    const btnMenuPraticar = document.getElementById('btnMenuPraticar');
    if (btnMenuPraticar) {
        if (modoPraticarAtivo) {
            btnMenuPraticar.disabled = false;
            btnMenuPraticar.classList.remove('btn-bloqueado'); // Brilhante/Ativo via CSS
            
            btnMenuPraticar.onclick = async () => {
                console.log("[MENU] Botão Praticar clicado. Gravando status 2 e encerrando...");
                try {
                    await fetch('http://localhost:3000/api/aula/salvar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: id_controle,
                            aula: aulaAtual,
                            topico: topicoAtual,
                            frame: 7, 
                            praticar: 2 // Prática concluída, entra em compasso de espera pela senha
                        })
                    });
                } catch (err) {
                    console.error("[ERRO] Erro ao salvar status de prática concluída:", err);
                }
                encerrarAplicativo();
            };
        } else {
            // Bloqueado na teoria ou se já concluiu a prática (status 2)
            btnMenuPraticar.disabled = true;
            btnMenuPraticar.classList.add('btn-bloqueado');
            btnMenuPraticar.onclick = null;
        }
    }

    // 🔗 VINCULAÇÃO E LIBERAÇÃO DO BOTÃO TESTES / AVALIAÇÕES
    const btnMenuTestes = document.getElementById('btnMenuTestes');
    if (btnMenuTestes) {
        if (modoTesteLiberado) {
            btnMenuTestes.disabled = false;
            btnMenuTestes.classList.remove('btn-bloqueado'); // Brilhante/Ativo via CSS
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
            let clique = ""; // 🎯 Será montado dinamicamente abaixo

            let pesoAtual = (aulaAtual * 100) + topicoAtual;
            let pesoIteracao = (aula.id * 100) + numeroTopico;

            if (pesoIteracao < pesoAtual) {
                // 🔄 TÓPICO ANTIGO (REVISÃO)
                corClasse = "color: #dc3545; font-weight: normal;"; 
                icone = "✅"; 
                clique = `onclick="abrirTopico('${idDaAula}', true)"`; // 🎯 Passa 'true' para o modo revisão
            } else if (pesoIteracao === pesoAtual) {
                // 🟢 TÓPICO ATUAL (PROGRESSO)
                corClasse = "color: #28a745; font-weight: bold;"; 
                icone = "🟢";
                clique = `onclick="abrirTopico('${idDaAula}', false)"`; // 🎯 Passa 'false' para progresso normal
            } else {
                // 🔒 TÓPICO BLOQUEADO
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
    const tituloAula = document.getElementById('aula-atual-titulo');
    const tituloTopico = document.getElementById('topico-atual-titulo');

    // 🎯 CASO A: Praticar Concluído! Exibe campo de entrada para o Instrutor
    if (modoSenhaInstrutor && !modoTesteLiberado) {
        if (tituloAula) tituloAula.innerText = `Praticar Concluído! 📖`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `
                <span style="color: #666; font-size: 0.95em; display:block; margin-bottom: 15px;">
                    Peça ao seu instrutor que digite a senha de liberação para os testes.
                </span>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="password" id="inputSenhaInstrutor" placeholder="Senha do Instrutor" 
                           style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 180px; box-sizing: border-box;">
                    <button onclick="validarSenhaDoInstrutor()" 
                            style="background: #0078d7; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px;">
                        Liberar Avaliação
                    </button>
                </div>
            `;
        }
        return; 
    }

    // 🎯 CASO B: Teste Liberado! Pronto para começar a prova
    if (modoTesteLiberado) {
        if (tituloAula) tituloAula.innerText = `Avaliação Disponível! 📝`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `<span style="color: #28a745; font-weight: bold;">➔ Clique no botão de Avaliações na barra inferior para iniciar.</span>`;
        }
        return;
    }

    // CASO C: Fim da Teoria (Status 1) -> Mandando praticar na apostila
    if (modoPraticarAtivo) {
        if (tituloAula) tituloAula.innerText = `Aula ${aulaAtual} Concluída! 🎉`;
        if (tituloTopico) {
            tituloTopico.innerHTML = `<span style="color: #28a745; font-weight: bold;">➔ Faça os exercícios da sua apostila.</span>`;
        }
        return; 
    }

    // Fluxo teórico comum
    const aulaObj = dadosMg.find(a => a.id === aulaAtual);
    if (aulaObj && aulaObj.topicos[topicoAtual - 1]) {
        const topicoObj = aulaObj.topicos[topicoAtual - 1];
        if (tituloAula) tituloAula.innerText = `Aula ${aulaAtual}: ${aulaObj.titulo}`;
        if (tituloTopico) tituloTopico.innerText = `Tópico: ${topicoObj.nome}`;
    }
}

// 🎯 FUNÇÃO QUE GERA E VALIDA A SENHA DO DIA COM HÍFEN (avantiD-M) - SEM POP-UP DE SUCESSO
async function validarSenhaDoInstrutor() {
    const inputSenha = document.getElementById('inputSenhaInstrutor');
    if (!inputSenha) return;

    const hoje = new Date();
    const dia = hoje.getDate();       
    const mes = hoje.getMonth() + 1;   

    // 🔑 Mágica: Cria o texto exato "avanti17-6"
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
                    praticar: 0, // Zera a apostila para fechar o ciclo
                    teste: 1     // 🎯 Ativa a coluna teste como 1!
                })
            });

            // Força a mutação do estado visual sem precisar dar F5 na página
            modoSenhaInstrutor = false;
            modoTesteLiberado = true;
            
            configurarInterface();   // Acende o livrinho de provas seguindo o CSS (Instântaneo!)
            atualizarCardProgresso(); // Transforma o card com a frase de sucesso (Instântaneo!)
            
            // ❌ REMOVIDO: O alert() chato de sucesso foi banido daqui!

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
    if(!menuClicado) return;
    const isAberto = menuClicado.classList.contains('show');
    document.querySelectorAll('.sub-menu').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.seta').forEach(el => el.innerText = '▼');
    if (!isAberto) {
        menuClicado.classList.add('show');
        if(setaClicada) setaClicada.innerText = '▲';
    }
}

function abrirTopico(id, isRevisao = false) { 
    let urlDestino = `aula.html?id=${id}&id_progresso=${id_controle}&aula=${aulaAtual}&topico=${topicoAtual}&slide=0`;
    
    // 🎯 Se for um tópico antigo, carimba a URL para avisar a tela de aula
    if (isRevisao) {
        urlDestino += `&modo=revisao`;
        console.log(`[NAVEGAÇÃO] Abrindo aula antiga no MODO REVISÃO: ${id}`);
    } else {
        console.log(`[NAVEGAÇÃO] Abrindo aula atual no MODO PROGRESSO: ${id}`);
    }

    window.location.href = urlDestino; 
}

// Ajuste isso no final do seu mg.js para passar as credenciais para a prova:
function abrirTeste(url) { 
    // Garante que os dados reais do aluno e do curso entrem na URL da prova
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