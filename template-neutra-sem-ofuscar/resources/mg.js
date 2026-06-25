// 0. INICIALIZAÇÃO DO NEUTRALINO
try {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.init();
        Neutralino.events.on("windowClose", () => { Neutralino.app.exit(); });
    }
} catch(e) { console.log("Neutralino off"); }

const nomeDoCurso = "Curso de Windows 10";
const nomeDoAluno = "Fernando Alves Cordeiro"; 

// AQUI ESTÁ A SUA ESTRUTURA ORGANIZADA E COM A PROPRIEDADE "pasta" DE VOLTA
const dadosMg = [
    { 
        id: 1, 
        titulo: "História do Windows", 
        testeUrl: "teste.html?id=A1",
        topicos: [
            { nome: "O Windows", url: "01-01.html", pasta: "A1/T1" }, 
            { nome: "O Teclado", url: "01-02.html", pasta: "A1/T2" }
        ]
    },
    { 
        id: 2, 
        titulo: "Área de trabalho", 
        testeUrl: "teste.html?id=A2",
        topicos: [
            { nome: "Barra de tarefas", url: "02-01.html", pasta: "A2/T1" }, 
            { nome: "Menu Iniciar",   url: "02-02.html", pasta: "A2/T2" }
        ]
    },
    { 
        id: 3, 
        titulo: "Arquivos e Pastas", 
        testeUrl: "teste.html?id=A3",
        topicos: [
            { nome: "Organizando com Pastas", url: "03-01.html", pasta: "A3/T1" }, 
            { nome: "O Explorador de Arquivos", url: "03-02.html", pasta: "A3/T2" }
        ]
    },
    { 
        id: 4, 
        titulo: "Aplicativos do Windows", 
        testeUrl: "teste.html?id=A4",
        topicos: [
            { nome: "Calculadora", url: "04-01.html", pasta: "A4/T1" }, 
            { nome: "Paint",       url: "04-02.html", pasta: "A4/T2" }
        ]
    },
    { 
        id: 5, 
        titulo: "Navegando na Internet", 
        testeUrl: "teste.html?id=A5",
        topicos: [
            { nome: "O Microsoft Edge",     url: "05-01.html", pasta: "A5/T1" }, 
            { nome: "Pesquisa e Favoritos", url: "05-02.html", pasta: "A5/T2" }
        ]
    }
];

window.addEventListener('load', () => {
    configurarInterface();
    carregarMenu();
    atualizarCardProgresso(false); // Defina como true para testar o modo verde
});

function configurarInterface() {
    const elNomeAluno = document.getElementById('nome-aluno');
    if (elNomeAluno) elNomeAluno.innerText = nomeDoAluno;
    const cName = document.getElementById('course-name');
    if (cName) cName.innerText = nomeDoCurso; 
    const btnSair = document.getElementById('btnSair');
    if (btnSair) btnSair.onclick = () => encerrarAplicativo();
}

function carregarMenu() {
    const container = document.getElementById('menu-aulas-container');
    if (!container) return;
    container.innerHTML = ''; 

    dadosMg.forEach(aula => {
        const idSubMenu = `aula-${aula.id}`;
        let htmlTopicos = '';
        aula.topicos.forEach(t => {
            const idDaAula = t.url.replace('.html', '');
            htmlTopicos += `<li class="topico-item" onclick="abrirTopico('${idDaAula}')">▶️ ${t.nome}</li>`;
        });
        if (aula.testeUrl) {
            htmlTopicos += `<li class="topico-item" onclick="abrirTeste('${aula.testeUrl}')" style="color: #0078d7; font-weight: bold;">📝 Teste da Aula ${aula.id}</li>`;
        }
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

    const divTF = document.createElement('div');
    divTF.className = 'aula-container';
    divTF.style.marginTop = "20px";
    divTF.innerHTML = `
        <div class="aula-item" onclick="abrirTeste('teste.html?id=TF')" style="background: rgba(40, 167, 69, 0.1); border-left: 4px solid #28a745;">
            <span style="color: #1e7e34; font-weight: bold;">🎓 TESTE FINAL</span>
        </div>`;
    container.appendChild(divTF);
}

function atualizarCardProgresso(concluido) {
    const btn = document.getElementById('btn-acao-principal');
    const btnTexto = document.getElementById('btn-texto-principal');
    const btnIcon = document.getElementById('btn-icon-container');
    const tituloAula = document.getElementById('aula-atual-titulo');
    const tituloTopico = document.getElementById('topico-atual-titulo');
    const card = document.getElementById('resume-card');

    if (!btn || !btnTexto) return;

    if (concluido) {
        tituloAula.innerText = "Parabéns! Aulas Concluídas.";
        tituloTopico.innerText = "Você está pronto para o Simulado Final.";
        tituloTopico.style.color = "#28a745";
        card.style.borderLeftColor = "#28a745";
        btn.style.background = "#28a745";
        btnTexto.innerText = "Iniciar Teste Final";
        if(btnIcon) btnIcon.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.86L12 5.84zM4 13h16v2H4v-2zm0 4h16v2H4v-2z"/></svg>`;
        btn.onclick = () => abrirTeste('teste.html?id=TF');
    } else {
        tituloAula.innerText = "Aula 2: Área de trabalho";
        tituloTopico.innerText = "Tópico: Barra de tarefas";
        btn.onclick = () => abrirTopico('02-01');
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

function abrirTopico(id) { window.location.href = `aula.html?id=${id}`; }
function abrirTeste(url) { window.location.href = url; }

function encerrarAplicativo() {
    if (typeof Neutralino !== 'undefined') {
        Neutralino.app.exit();
    } else { window.close(); }
}