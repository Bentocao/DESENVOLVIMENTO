-- 1. UNIDADE E ALUNOS (Mantidos, pois dependem do ID do Aluno)
CREATE TABLE unidade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  documento VARCHAR(20) NOT NULL UNIQUE,
  nomefantasia VARCHAR(60) NOT NULL,
  cidade VARCHAR(50),
  estado VARCHAR(2),
  status ENUM('Pendente', 'Ativo', 'Bloqueado') DEFAULT 'Pendente' COMMENT 'Pendente: Instalacao nova | Ativo: Liberada | Bloqueado: Inadimplencia matriz',
  ativo TINYINT(1) DEFAULT 1
);

CREATE TABLE aluno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_unidade INT NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  nome VARCHAR(40) NOT NULL,
  sobrenome VARCHAR(40) NOT NULL,
  matricula VARCHAR(20) NOT NULL COMMENT 'Regra: 5 ultimos digitos do CPF + Dia atual (Ex: 1482811)',
  usuario VARCHAR(20) NOT NULL COMMENT 'Regra: Iniciais do nome/sobrenome + 5 ultimos do CPF (Ex: fc14828)',
  senha VARCHAR(20) NOT NULL COMMENT 'Padrao inicial: 5 ultimos digitos do CPF (Ex: 14828)',
  data_matricula DATE NOT NULL,
  status ENUM('Pendente', 'Ativo', 'Bloqueado') DEFAULT 'Pendente' COMMENT 'Pendente: Cadastro incompleto | Ativo: Liberado para estudar | Bloqueado: Inadimplencia escola',
  ativo TINYINT(1) DEFAULT 1, 
  FOREIGN KEY (id_unidade) REFERENCES unidade(id)
) COMMENT = 'Tabela de alunos com geração automatizada de acessos baseada no CPF';

-- 9. TABELA DE FUNCIONÁRIOS (O acesso ao Gerenciador)
CREATE TABLE funcionario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_unidade INT NOT NULL,
  nome VARCHAR(60) NOT NULL,
  login VARCHAR(20) NOT NULL UNIQUE,
  senha VARCHAR(20) NOT NULL,
  nivel ENUM('Admin', 'Coordenador', 'instrutor') DEFAULT 'Admin',
  ativo TINYINT(1) DEFAULT 1,
  -- Amarra com a Unidade
  CONSTRAINT fk_unidade_func FOREIGN KEY (id_unidade) REFERENCES unidade(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 2. CURSO (Agora com Perfil de Layout e Versionamento)
CREATE TABLE curso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cod_curso INT NOT NULL UNIQUE COMMENT 'Código do curso criado pela matriz',
  nome VARCHAR(60) NOT NULL,
  
  -- Nova coluna para definir o CSS do Kids ou Adulto:
  perfil ENUM('Adulto', 'Kids') DEFAULT 'Adulto' 
         COMMENT 'Define o CSS/Layout: Adulto (Padrão) ou Kids (Colorido)',
  
  -- Campo para controle de atualizações de conteúdo:
  versao VARCHAR(20) NOT NULL DEFAULT '1.0' 
         COMMENT 'Versão do conteúdo (ex: 1.0, 1.1). Ajuda a identificar correções de áudio/vídeo',
  
  carga_horaria INT NOT NULL,
  pasta VARCHAR(50) NOT NULL 
        COMMENT 'Nome da pasta que deve ser criado fisicamente, não pode ser um nome diferente', 
  
  ativo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. PACOTE (Agora com cod_pacote)
CREATE TABLE pacote (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cod_pacote INT NOT NULL UNIQUE COMMENT 'Código do pacote criado pela matriz',
  nome VARCHAR(60) NOT NULL,
  ativo TINYINT(1) DEFAULT 1
);

-- 4. PACOTE_CURSO (Relacionamento via Códigos Fixos)
CREATE TABLE pacote_curso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cod_pacote INT NOT NULL,
  cod_curso INT NOT NULL,
  ordem INT NOT NULL,
  -- Blindagem: Não repete o mesmo curso no mesmo pacote
  UNIQUE KEY (cod_pacote, cod_curso),
  FOREIGN KEY (cod_pacote) REFERENCES pacote(cod_pacote),
  FOREIGN KEY (cod_curso) REFERENCES curso(cod_curso)
);

-- 5. MATRICULA_CURSO (O Coração do Portal do Aluno)
CREATE TABLE matricula_curso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_aluno INT NOT NULL,
  cod_curso INT NOT NULL,   -- Referência fixa (Cód Matriz)
  cod_pacote INT NOT NULL,  -- Referência fixa (Cód Matriz)
  id_funcionario INT NULL,
  
  -- As datas nascem vazias (NULL) e o seu sistema preenche quando a ação acontece:
  data_inicio DATE COMMENT 'Preenchido só quando o aluno dá o primeiro play',
  data_fim DATE COMMENT 'Preenchido quando o curso é finalizado',
    
  -- ENUM garante que o banco só aceite esses 4 estados exatos:
  status ENUM('Pendente', 'Ativo', 'Concluido', 'Trancado') DEFAULT 'Pendente' 
         COMMENT 'Pendente: Nunca abriu | Ativo: Em curso | Concluido: Finalizou | Trancado: Pausado',
  
  -- Para esconder da tela caso dê algum problema ou cancelamento:
  ativo TINYINT(1) DEFAULT 1,
  
  FOREIGN KEY (id_aluno) REFERENCES aluno(id),
  FOREIGN KEY (cod_curso) REFERENCES curso(cod_curso), 
  FOREIGN KEY (cod_pacote) REFERENCES pacote(cod_pacote),
  FOREIGN KEY (id_funcionario) REFERENCES funcionario(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
  COMMENT = 'Gerencia em quais cursos o aluno está matriculado e o progresso temporal.';


-- 6. TELA_AULA (Memory Card do Progresso)
CREATE TABLE tela_aula (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_aluno INT NOT NULL,
  cod_curso INT NOT NULL, -- Referência fixa (Cód Matriz)
  
  -- Navegação (Onde o aluno está):
  aula INT NOT NULL COMMENT 'Em que aula o aluno se encontra',
  topico INT NOT NULL COMMENT 'Em que topico da aula o aluno se encontra',
  frame INT DEFAULT 1 COMMENT 'Em que slide do tópico o aluno se encontra',
  
  -- Controle de Relógio / Tempo em laboratório:
  data_entrada DATETIME NULL COMMENT 'Controla o horário de entrada atual do aluno na aula',
  data_saida DATETIME NULL COMMENT 'Controla o horário de saída que o aluno finalizou a aula',
  
  -- O Funil de Aprendizado (Travas do sistema):
  -- 0=Pendente (Bloqueado), 1=Apostila (Em leitura), 2=Validado (Pelo Instrutor/Gerenciador)
  praticar TINYINT DEFAULT 0 COMMENT '0=Pendente, 1=Apostila, 2=Validado pelo Instrutor',
  
  -- 0=Bloqueado (Não fez a prática), 1=Liberado (Prática validada), 2=Feito (Teste concluído)
  teste TINYINT DEFAULT 0 COMMENT '0=Bloqueado, 1=Liberado, 2=Feito',
  
  FOREIGN KEY (id_aluno) REFERENCES aluno(id),
  FOREIGN KEY (cod_curso) REFERENCES curso(cod_curso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
  COMMENT = 'Controle de navegação, travas e tempo de aula do aluno.';


-- 7. TESTE_CONCLUIDO (Boletim Final)
CREATE TABLE teste_concluido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_aluno INT NOT NULL,
  cod_curso INT NOT NULL, -- Referência fixa
  id_tela_aula INT NOT NULL COMMENT 'A ponte direta com o Memory Card da aula',
  aula INT NOT NULL,
  
  -- As novas métricas de performance que vão brilhar no certificado:
  porcentagem INT NOT NULL DEFAULT 0 COMMENT 'Ex: 85 para 85%',
  acertos INT NOT NULL DEFAULT 0,
  erros INT NOT NULL DEFAULT 0,
  tentativas INT NOT NULL DEFAULT 0 COMMENT 'Soma +1 toda vez que o aluno refaz',
  data_teste DATETIME,
  FOREIGN KEY (id_aluno) REFERENCES aluno(id),
  FOREIGN KEY (cod_curso) REFERENCES curso(cod_curso),
  FOREIGN KEY (id_tela_aula) REFERENCES tela_aula(id)
  ) COMMENT = 'O boletim final da aula, com histórico de esforço e acertos.';


-- 8. CONFIGURAÇÕES GLOBAIS
CREATE TABLE config (
  chave VARCHAR(50) PRIMARY KEY COMMENT 'Ex: caminho_servidor, chave_bloqueio',
  valor VARCHAR(255) NOT NULL COMMENT 'Ex: Z:\cursoscpw'
  ) COMMENT = 'Configurações globais do sistema.';
