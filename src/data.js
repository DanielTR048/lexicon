// Biblioteca editorial do laboratório. A grafia original fica nas pistas;
// o motor remove acentos, espaços e sinais apenas ao montar o tabuleiro.
const theme = (id, title, category, icon, description, color, entries) => ({
  id,
  title,
  category,
  icon,
  description,
  color,
  words: entries
    .trim()
    .split("\n")
    .map((entry) => {
      const [word, clue] = entry.split("|");
      return { word: word.trim(), clue: clue.trim() };
    }),
});

export const CATEGORIES = [
  { id: "ficcao", label: "Ficção & universos" },
  { id: "historia", label: "História & épocas" },
  { id: "filosofia", label: "Filosofia & ideias" },
  { id: "ciencia", label: "Ciência & natureza" },
  { id: "politica", label: "Política & sociedade" },
  { id: "cultura", label: "Cultura & artes" },
];

export const THEMES = [
  theme(
    "mentes-brilhantes",
    "Mentes brilhantes",
    "ciencia",
    "Brain",
    "As ideias que fizeram o mundo sair da órbita.",
    "green",
    `
Einstein|Físico associado à teoria da relatividade.
Curie|Sobrenome da cientista pioneira nos estudos da radioatividade.
Tesla|Inventor associado ao desenvolvimento de sistemas de corrente alternada.
Darwin|Naturalista que formulou a evolução por seleção natural.
Newton|Físico que formulou leis do movimento e da gravitação.
Galileu|Astrônomo que observou luas de Júpiter com um telescópio.
Hawking|Físico que estudou buracos negros e cosmologia.
Turing|Matemático fundamental para a ciência da computação.
Lovelace|Autora de um algoritmo para a máquina analítica de Babbage.
Kepler|Astrônomo que descreveu leis do movimento planetário.
Faraday|Cientista que investigou a indução eletromagnética.
Pasteur|Pesquisador associado à pasteurização e ao estudo de microrganismos.
Lavoisier|Químico associado à lei de conservação da massa.
Noether|Matemática que relacionou simetrias e leis de conservação.
Franklin|Rosalind produziu dados de difração de raios X importantes para o DNA.
Bohr|Físico que propôs um modelo atômico com níveis de energia.
Planck|Físico que introduziu a quantização da energia em seus estudos.
Mendel|Monge cujos experimentos com ervilhas fundamentaram a genética.
`,
  ),
  theme(
    "universo-infinito",
    "Universo infinito",
    "ciencia",
    "Telescope",
    "Sintonize o rádio cósmico e procure entre as estrelas.",
    "blue",
    `
Estrela|Corpo celeste que produz energia por fusão nuclear.
Planeta|Corpo que orbita uma estrela e não realiza fusão como ela.
Galáxia|Grande conjunto de estrelas, gás e poeira ligado pela gravidade.
Nebulosa|Nuvem interestelar de gás e poeira.
Cometa|Corpo gelado que pode formar uma cauda perto do Sol.
Asteroide|Pequeno corpo rochoso que orbita o Sol.
Satélite|Corpo que orbita outro corpo maior.
Órbita|Trajetória de um corpo sob influência gravitacional.
Quasar|Núcleo galáctico extremamente luminoso.
Pulsar|Estrela de nêutrons observada por seus pulsos regulares.
Gravidade|Interação que atrai corpos com massa.
Eclipse|Ocultação total ou parcial de um astro por outro.
Solstício|Momento do ano associado aos extremos da duração do dia.
Equinócio|Momento em que o Sol cruza o equador celeste.
Cosmos|Nome usado para o universo como um todo.
Supernova|Explosão estelar que pode alcançar enorme luminosidade.
Via Láctea|Galáxia que abriga o Sistema Solar.
Buraco Negro|Região cujo horizonte impede a saída da própria luz.
`,
  ),
  theme(
    "laboratorio-atomico",
    "Laboratório atômico",
    "ciencia",
    "FlaskConical",
    "Vidros borbulhantes, jalecos e a matéria em transformação.",
    "coral",
    `
Átomo|Unidade de matéria com núcleo e elétrons.
Próton|Partícula de carga positiva presente no núcleo atômico.
Nêutron|Partícula eletricamente neutra presente em muitos núcleos.
Elétron|Partícula de carga negativa que participa das ligações químicas.
Molécula|Conjunto de átomos unidos por ligações químicas.
Íon|Átomo ou grupo de átomos com carga elétrica.
Isótopo|Variante de um elemento com diferente número de nêutrons.
Reação|Processo em que substâncias se transformam em outras.
Catalisador|Substância que acelera uma reação sem ser consumida globalmente.
Solução|Mistura homogênea de duas ou mais substâncias.
Solvente|Componente que dissolve um soluto.
Soluto|Substância dissolvida em uma solução.
Ácido|Substância que pode doar prótons segundo Brønsted e Lowry.
Base|Substância que pode receber prótons segundo Brønsted e Lowry.
Oxidação|Processo que envolve perda de elétrons.
Redução|Processo que envolve ganho de elétrons.
Entalpia|Grandeza termodinâmica relacionada à energia e à pressão.
Carbono|Elemento químico central nas moléculas orgânicas.
`,
  ),
  theme(
    "corpo-humano",
    "Máquina humana",
    "ciencia",
    "Microscope",
    "Uma expedição microscópica pela engenharia do corpo.",
    "purple",
    `
Coração|Órgão muscular que impulsiona o sangue.
Pulmão|Órgão em que ocorrem trocas gasosas com o sangue.
Cérebro|Órgão do sistema nervoso envolvido em percepção e pensamento.
Neurônio|Célula especializada na transmissão de sinais nervosos.
Sinapse|Região de comunicação entre um neurônio e outra célula.
Rim|Órgão que filtra o sangue e participa da formação da urina.
Fígado|Órgão que participa do metabolismo e produz bile.
Estômago|Órgão digestivo que mistura alimento e secreções.
Intestino|Trecho do sistema digestório importante para a absorção.
Artéria|Vaso que conduz sangue para fora do coração.
Veia|Vaso que conduz sangue em direção ao coração.
Capilar|Vaso microscópico que permite trocas com os tecidos.
Músculo|Tecido capaz de contrair e produzir movimento.
Tendão|Estrutura que conecta um músculo a um osso.
Cartilagem|Tecido de sustentação presente em articulações e outras estruturas.
Hemácia|Célula sanguínea que transporta oxigênio com hemoglobina.
Plaqueta|Fragmento celular que participa da coagulação.
Diafragma|Músculo importante para os movimentos respiratórios.
`,
  ),
  theme(
    "codigo-da-vida",
    "O código da vida",
    "ciencia",
    "Dna",
    "Decifre as instruções escondidas em cada célula.",
    "green",
    `
DNA|Molécula que armazena informações genéticas em muitos organismos.
RNA|Molécula que atua na expressão da informação genética.
Gene|Sequência de material genético associada a um produto funcional.
Genoma|Conjunto do material genético de um organismo.
Célula|Unidade estrutural e funcional básica dos seres vivos.
Núcleo|Compartimento que abriga a maior parte do DNA em células eucarióticas.
Ribossomo|Estrutura celular responsável pela síntese de proteínas.
Mitose|Divisão celular que normalmente mantém o número de cromossomos.
Meiose|Divisão celular que reduz o número de cromossomos pela metade.
Proteína|Molécula formada por uma ou mais cadeias de aminoácidos.
Enzima|Catalisador biológico que acelera reações químicas.
Mutação|Alteração na sequência do material genético.
Alelos|Diferentes versões de um mesmo gene.
Herança|Transmissão de características genéticas entre gerações.
Cromossomo|Estrutura que organiza o DNA associado a proteínas.
Membrana|Barreira seletiva que delimita a célula.
Citoplasma|Conteúdo celular interno à membrana, excluindo o núcleo quando ele existe.
Mitocôndria|Organela associada à produção de ATP na respiração celular.
`,
  ),
  theme(
    "planeta-vivo",
    "Planeta vivo",
    "ciencia",
    "Leaf",
    "Florestas, oceanos e as conexões invisíveis da natureza.",
    "green",
    `
Ecologia|Estudo das relações dos seres vivos entre si e com o ambiente.
Bioma|Grande conjunto de ecossistemas com características ambientais comuns.
Habitat|Ambiente em que uma espécie vive.
Nicho|Conjunto de condições e relações que caracteriza o modo de vida de uma espécie.
Fauna|Conjunto dos animais de uma região.
Flora|Conjunto das plantas de uma região.
Fungo|Organismo do reino que inclui cogumelos e leveduras.
Líquen|Associação entre um fungo e um parceiro fotossintetizante.
Coral|Animal que pode formar colônias e estruturas de recifes.
Manguezal|Ecossistema costeiro associado a águas salobras.
Savana|Vegetação com gramíneas e árvores espaçadas.
Tundra|Bioma frio com vegetação rasteira.
Taiga|Floresta boreal dominada por coníferas.
Predação|Relação em que um organismo captura outro para se alimentar.
Simbiose|Associação próxima e persistente entre organismos de espécies diferentes.
Polinização|Transporte de pólen até a estrutura reprodutiva receptora.
Fotossíntese|Processo que usa energia luminosa para produzir matéria orgânica.
Biosfera|Conjunto das regiões da Terra onde existe vida.
`,
  ),
  theme(
    "mundo-dos-numeros",
    "A lógica dos números",
    "ciencia",
    "Orbit",
    "Equações clandestinas no quadro-negro do laboratório.",
    "gold",
    `
Álgebra|Área da matemática que estuda estruturas e relações simbólicas.
Geometria|Estudo de formas, medidas e propriedades do espaço.
Teorema|Proposição demonstrada a partir de premissas e regras.
Axioma|Proposição adotada como ponto de partida de uma teoria.
Fração|Representação de uma razão entre dois números.
Primo|Número natural maior que um com exatamente dois divisores positivos.
Vetor|Objeto matemático que pode representar módulo, direção e sentido.
Matriz|Arranjo retangular de elementos matemáticos.
Limite|Valor de aproximação descrito no estudo de funções e sequências.
Derivada|Medida da taxa de variação instantânea de uma função.
Integral|Operação relacionada ao acúmulo e ao cálculo de áreas.
Tangente|Reta que representa uma direção local de uma curva.
Seno|Razão trigonométrica entre cateto oposto e hipotenusa.
Cosseno|Razão trigonométrica entre cateto adjacente e hipotenusa.
Logaritmo|Expoente necessário para obter um número a partir de uma base.
Parábola|Curva formada pelos pontos equidistantes de um foco e uma diretriz.
Elipse|Curva cuja soma das distâncias a dois focos é constante.
Infinito|Conceito que expressa ausência de limite finito.
`,
  ),
  theme(
    "herois-marvel",
    "Liga Marvel",
    "ficcao",
    "Shield",
    "Entre arranha-céus, armaduras e portais interdimensionais.",
    "coral",
    `
Thor|Herói asgardiano associado ao martelo Mjolnir.
Hulk|Alter ego de Bruce Banner conhecido por sua força.
Vespa|Heroína que pode reduzir o tamanho do corpo e voar.
Visão|Androide heroico integrante dos Vingadores.
Wolverine|Mutante conhecido pelas garras e pelo fator de cura.
Tempestade|Mutante dos X-Men que controla fenômenos atmosféricos.
Fera|Nome heroico do cientista e mutante Hank McCoy.
Ciclope|Líder dos X-Men que emite rajadas ópticas.
Vampira|Mutante capaz de absorver poderes por contato.
Gambit|Mutante que carrega objetos com energia cinética.
Elektra|Personagem da Marvel conhecida como assassina e artista marcial.
Demolidor|Herói de Hell's Kitchen cujo nome civil é Matt Murdock.
Homem-Aranha|Herói associado a Peter Parker e ao sentido de aranha.
Homem de Ferro|Identidade heroica de Tony Stark e suas armaduras.
Pantera Negra|Título heroico associado ao reino fictício de Wakanda.
Viúva Negra|Codinome de espionagem associado a Natasha Romanoff.
Kate Bishop|Arqueira da Marvel que também utiliza o nome Gaviã Arqueira.
Doutor Estranho|Mago da Marvel cujo nome civil é Stephen Strange.
`,
  ),
  theme(
    "herois-dc",
    "Arquivo DC",
    "ficcao",
    "Zap",
    "A frequência secreta dos vigilantes de Gotham e Metrópolis.",
    "blue",
    `
Superman|Herói kryptoniano criado na Terra como Clark Kent.
Batman|Identidade heroica de Bruce Wayne em Gotham City.
Flash|Nome heroico associado a velocistas como Barry Allen.
Aquaman|Herói da DC associado ao reino de Atlântida.
Ciborgue|Herói que combina seu corpo humano com tecnologia avançada.
Shazam|Palavra mágica e identidade heroica associadas a Billy Batson.
Zatanna|Maga da DC conhecida por encantamentos falados ao contrário.
Robin|Identidade usada por parceiros de Batman.
Batgirl|Identidade heroica associada a personagens como Barbara Gordon.
Supergirl|Heroína kryptoniana conhecida como Kara Zor-El.
Estelar|Heroína alienígena de Tamaran integrante dos Titãs.
Ravena|Heroína dos Titãs com poderes ligados à magia e às emoções.
Mutano|Integrante dos Titãs capaz de assumir formas animais.
Asa Noturna|Identidade heroica adotada por Dick Grayson após ser Robin.
Mulher-Maravilha|Heroína amazona conhecida como Diana.
Lanterna Verde|Título dos portadores dos anéis de uma tropa intergaláctica.
Arqueiro Verde|Identidade heroica do arqueiro Oliver Queen.
Canário Negro|Heroína conhecida por seu poderoso grito sônico.
`,
  ),
  theme(
    "galeria-viloes",
    "Galeria dos vilões",
    "ficcao",
    "Skull",
    "Planos impossíveis, gargalhadas sinistras e egos enormes.",
    "purple",
    `
Coringa|Vilão de Gotham conhecido por seu visual de palhaço.
Thanos|Titã da Marvel associado à busca pelas Joias do Infinito.
Loki|Personagem asgardiano da Marvel associado à trapaça.
Ultron|Inteligência artificial que se torna inimiga dos Vingadores.
Magneto|Mutante da Marvel capaz de manipular campos magnéticos.
Venom|Nome associado a um simbionte e a seus hospedeiros.
Darkseid|Governante de Apokolips e inimigo dos heróis da DC.
Charada|Vilão de Batman obcecado por enigmas.
Pinguim|Vilão de Gotham cujo nome civil é Oswald Cobblepot.
Brainiac|Vilão da DC associado à coleta de conhecimento e cidades.
Sauron|Senhor sombrio associado ao Um Anel na Terra-média.
Saruman|Mago de O Senhor dos Anéis que governa Isengard.
Voldemort|Bruxo das trevas adversário de Harry Potter.
Palpatine|Lorde Sith que assume o título de imperador em Star Wars.
Darth Vader|Identidade Sith assumida por Anakin Skywalker.
Lex Luthor|Intelectual e empresário conhecido como inimigo de Superman.
Duas-Caras|Vilão de Gotham que decide ações com uma moeda.
Doutor Destino|Vilão da Marvel que governa a fictícia Latvéria.
`,
  ),
  theme(
    "galaxia-distante",
    "Uma galáxia distante",
    "ficcao",
    "Rocket",
    "Uma transmissão rebelde acaba de chegar ao laboratório.",
    "gold",
    `
Luke|Skywalker que se torna um Jedi na trilogia original.
Leia|Princesa e líder rebelde da família Organa.
Yoda|Mestre Jedi conhecido por sua pequena estatura.
Obi-Wan|Mestre Jedi que treinou Anakin Skywalker.
Anakin|Jedi que assume a identidade de Darth Vader.
Padmé|Senadora de Naboo e antiga rainha do planeta.
Han Solo|Contrabandista que pilota a Millennium Falcon.
Chewbacca|Wookiee e parceiro de Han Solo.
Droide|Robô que pode cumprir funções de protocolo, combate ou manutenção.
Coruscant|Planeta coberto por uma grande cidade e sede da República Galáctica.
Rey|Protagonista que descobre sua conexão com a Força.
Finn|Ex-soldado da Primeira Ordem que se une à Resistência.
Ahsoka|Aprendiz de Anakin durante as Guerras Clônicas.
Grogu|Pequeno ser sensível à Força protegido por Din Djarin.
Tatooine|Planeta desértico com dois sóis.
Naboo|Planeta natal de Padmé Amidala.
Jedi|Ordem de usuários da Força associada ao lado luminoso.
Sith|Tradição de usuários da Força associada ao lado sombrio.
`,
  ),
  theme(
    "terra-media",
    "Cartas da Terra-média",
    "ficcao",
    "Compass",
    "Um mapa antigo, um anel e uma aventura muito longa.",
    "green",
    `
Frodo|Hobbit encarregado de levar o Um Anel a Mordor.
Samwise|Companheiro de Frodo na jornada para destruir o Anel.
Bilbo|Hobbit protagonista de O Hobbit.
Gandalf|Mago que orienta a Sociedade do Anel.
Aragorn|Herdeiro de Isildur conhecido inicialmente como Passolargo.
Legolas|Elfo arqueiro integrante da Sociedade do Anel.
Gimli|Anão guerreiro integrante da Sociedade do Anel.
Boromir|Filho de Denethor que integra a Sociedade do Anel.
Merry|Hobbit amigo de Frodo e Pippin.
Pippin|Hobbit da família Tûk que participa da aventura do Anel.
Arwen|Elfa filha de Elrond e companheira de Aragorn.
Elrond|Senhor de Valfenda e pai de Arwen.
Galadriel|Senhora élfica de Lothlórien.
Gollum|Antigo portador do Anel que o chama de precioso.
Mordor|Território governado por Sauron.
Condado|Região da Terra-média habitada pelos hobbits.
Rohan|Reino conhecido por seus cavaleiros.
Gondor|Reino humano cuja capital é Minas Tirith.
`,
  ),
  theme(
    "mundo-bruxo",
    "Gabinete de magia",
    "ficcao",
    "Sparkles",
    "Feitiços catalogados entre frascos e pergaminhos.",
    "purple",
    `
Harry Potter|Bruxo conhecido pela cicatriz em forma de raio.
Hermione|Amiga de Harry reconhecida por sua dedicação aos estudos.
Rony|Integrante da família Weasley e amigo de Harry.
Dumbledore|Diretor de Hogwarts durante grande parte da saga.
Hagrid|Guardião das chaves e das terras de Hogwarts.
Snape|Professor de Poções ligado à casa Sonserina.
Luna|Estudante da Corvinal cujo sobrenome é Lovegood.
Neville|Estudante da Grifinória que se destaca em Herbologia.
Draco|Estudante da família Malfoy e rival de Harry.
Sirius|Padrinho de Harry cujo sobrenome é Black.
Lupin|Professor de Defesa Contra as Artes das Trevas e lobisomem.
Dobby|Elfo doméstico que se torna amigo de Harry.
Hogwarts|Escola de magia e bruxaria frequentada por Harry.
Grifinória|Casa de Hogwarts simbolizada por um leão.
Sonserina|Casa de Hogwarts simbolizada por uma serpente.
Corvinal|Casa de Hogwarts associada à inteligência e ao aprendizado.
Lufa-Lufa|Casa de Hogwarts associada à lealdade e à dedicação.
Quadribol|Esporte mágico disputado em vassouras voadoras.
`,
  ),
  theme(
    "mundos-fantasticos",
    "Mundos fantásticos",
    "ficcao",
    "Globe",
    "Personagens atravessaram o portal. Identifique os visitantes.",
    "coral",
    `
Alice|Menina que segue um coelho até o País das Maravilhas.
Dorothy|Garota que chega à terra de Oz após um ciclone.
Aslan|Leão que ocupa papel central nas histórias de Nárnia.
Peter Pan|Menino que vive aventuras na Terra do Nunca.
Pinóquio|Boneco de madeira criado por Gepeto.
Sherlock|Detetive de sobrenome Holmes criado por Conan Doyle.
Watson|Médico e companheiro de Sherlock Holmes.
Drácula|Vampiro que dá nome ao romance de Bram Stoker.
Conan|Herói bárbaro criado por Robert E. Howard.
Tarzan|Personagem criado por Edgar Rice Burroughs e criado por grandes símios.
Duna|Romance de ficção científica ambientado em torno de Arrakis.
Arrakis|Planeta desértico ligado à produção da especiaria em Duna.
Spock|Oficial de origem humana e vulcana em Star Trek.
Kirk|Capitão da Enterprise na série original de Star Trek.
Godzilla|Monstro gigante japonês que estreou no cinema em 1954.
Goku|Protagonista de Dragon Ball criado por Akira Toriyama.
Totoro|Espírito da floresta de um filme de Hayao Miyazaki.
Pikachu|Pokémon elétrico associado ao protagonista Ash.
`,
  ),
  theme(
    "egito-antigo",
    "Segredos do Egito",
    "historia",
    "Crown",
    "Desenterre palavras sob a areia de civilizações milenares.",
    "gold",
    `
Nilo|Rio fundamental para a agricultura do Egito antigo.
Faraó|Título usado para os governantes do Egito antigo.
Pirâmide|Monumento de forma geométrica associado a tumbas reais.
Esfinge|Figura mitológica com corpo de leão e cabeça humana.
Papiro|Planta usada para produzir um antigo suporte de escrita.
Múmia|Corpo preservado por processos naturais ou artificiais.
Sarcófago|Recipiente funerário usado para abrigar um corpo.
Obelisco|Monumento alto de pedra com ponta piramidal.
Escriba|Profissional dedicado à escrita e aos registros.
Hieróglifo|Sinal de um sistema de escrita usado no Egito antigo.
Anúbis|Divindade egípcia associada à mumificação.
Ísis|Divindade egípcia associada à maternidade e à magia.
Osíris|Divindade egípcia associada ao mundo dos mortos.
Hórus|Divindade egípcia frequentemente representada como falcão.
Ramsés|Nome usado por vários faraós do Egito.
Tebas|Importante cidade do Egito antigo situada junto ao Nilo.
Mênfis|Antiga capital egípcia próxima ao início do delta do Nilo.
Roseta|Cidade que dá nome à pedra com inscrições em três escritas.
`,
  ),
  theme(
    "grecia-antiga",
    "A aurora grega",
    "historia",
    "Landmark",
    "Das praças de Atenas às histórias do mar Egeu.",
    "blue",
    `
Atenas|Pólis grega associada ao desenvolvimento da democracia antiga.
Esparta|Pólis grega conhecida por sua organização militar.
Pólis|Cidade-estado característica do mundo grego antigo.
Ágora|Espaço público de encontro e comércio nas cidades gregas.
Acrópole|Área elevada e fortificada de uma cidade grega.
Partenon|Templo ateniense dedicado à deusa Atena.
Hoplita|Soldado de infantaria pesada da Grécia antiga.
Falange|Formação militar compacta de combatentes.
Trirreme|Embarcação de guerra com três níveis de remadores.
Oráculo|Santuário ou resposta associada à consulta divina.
Delfos|Local do célebre oráculo dedicado a Apolo.
Olímpia|Local associado aos Jogos Olímpicos da Antiguidade.
Homero|Poeta tradicionalmente associado à Ilíada e à Odisseia.
Hesíodo|Poeta grego autor da Teogonia.
Heródoto|Autor de Histórias e importante nome da historiografia antiga.
Tucídides|Historiador que escreveu sobre a Guerra do Peloponeso.
Péricles|Líder político ateniense do século V antes de Cristo.
Helenismo|Período de difusão da cultura grega após Alexandre.
`,
  ),
  theme(
    "roma-antiga",
    "Todos os caminhos",
    "historia",
    "Landmark",
    "Reconstitua um império entre estradas, leis e aquedutos.",
    "coral",
    `
Roma|Cidade que se tornou o centro do Império Romano.
Senado|Conselho político importante nas instituições romanas.
Cônsul|Magistrado de alto cargo na República Romana.
Legião|Grande unidade militar do exército romano.
Centurião|Oficial que comandava uma centúria romana.
Fórum|Centro público de atividades políticas, religiosas e comerciais.
Aqueduto|Estrutura construída para conduzir água.
Coliseu|Anfiteatro monumental situado em Roma.
Patrício|Membro da aristocracia tradicional de Roma.
Plebeu|Integrante da população livre fora do patriciado.
Tribuno|Cargo romano que incluía representantes da plebe.
Augusto|Título assumido por Otaviano, primeiro imperador romano.
César|Nome do general e governante romano Júlio César.
Nero|Imperador romano da dinastia júlio-claudiana.
Trajano|Imperador sob o qual o território romano atingiu grande extensão.
Pompeia|Cidade romana soterrada pela erupção do Vesúvio.
Vesúvio|Vulcão associado à destruição de Pompeia em 79.
Latim|Língua da Roma antiga que originou as línguas românicas.
`,
  ),
  theme(
    "idade-media",
    "Crônicas medievais",
    "historia",
    "Scroll",
    "Castelos, manuscritos e cidades além das muralhas.",
    "purple",
    `
Feudo|Domínio ligado a relações de poder e obrigações medievais.
Vassalo|Pessoa ligada a um senhor por compromisso de fidelidade.
Suserano|Senhor a quem um vassalo devia fidelidade.
Servo|Camponês sujeito a obrigações e vínculos com um domínio.
Castelo|Construção fortificada usada como residência e defesa.
Muralha|Estrutura defensiva que cerca uma cidade ou fortificação.
Cavaleiro|Combatente montado associado à nobreza medieval.
Mosteiro|Comunidade e edifício dedicados à vida monástica.
Abadia|Mosteiro dirigido por um abade ou uma abadessa.
Manuscrito|Texto produzido à mão antes ou depois da imprensa.
Iluminura|Decoração ou ilustração feita em um manuscrito.
Trovador|Poeta e compositor associado à tradição lírica medieval.
Burgo|Núcleo urbano que se desenvolveu na Europa medieval.
Guilda|Associação de artesãos ou comerciantes.
Catedral|Igreja que abriga a sede de um bispo.
Gótico|Estilo arquitetônico associado a arcos ogivais e grandes vitrais.
Românico|Estilo medieval associado a arcos redondos e paredes espessas.
Cruzadas|Expedições militares e religiosas da cristandade medieval.
`,
  ),
  theme(
    "renascimento",
    "O mundo renasce",
    "historia",
    "Palette",
    "Arte, observação e novas ideias na oficina do tempo.",
    "gold",
    `
Leonardo|Artista e inventor italiano autor da Mona Lisa.
Rafael|Pintor renascentista autor de A Escola de Atenas.
Donatello|Escultor florentino autor de um célebre Davi em bronze.
Botticelli|Pintor italiano autor de O Nascimento de Vênus.
Michelangelo|Artista responsável pela pintura do teto da Capela Sistina.
Florença|Cidade italiana central na história do Renascimento.
Veneza|Cidade italiana associada a uma importante escola de pintura.
Mecenas|Pessoa que patrocina a produção artística ou intelectual.
Humanismo|Movimento intelectual que valorizou o estudo dos textos clássicos.
Perspectiva|Técnica de representação da profundidade em uma superfície.
Afresco|Pintura realizada sobre uma camada de argamassa ainda úmida.
Sfumato|Técnica de transições suaves entre tons na pintura.
Anatomia|Estudo da estrutura dos organismos, importante para artistas da época.
Imprensa|Tecnologia que ampliou a reprodução de textos na Europa.
Gutenberg|Nome associado à difusão dos tipos móveis na Europa.
Erasmo|Humanista autor de Elogio da Loucura.
Petrarca|Poeta e humanista italiano conhecido por seu Cancioneiro.
Medici|Família florentina associada ao patrocínio das artes.
`,
  ),
  theme(
    "grandes-navegacoes",
    "Além do horizonte",
    "historia",
    "Compass",
    "Cartas náuticas e encontros que transformaram continentes.",
    "blue",
    `
Caravela|Embarcação associada às navegações portuguesas.
Nau|Grande embarcação usada em viagens marítimas de longa distância.
Bússola|Instrumento que indica direções por uma agulha magnetizada.
Astrolábio|Instrumento usado para medir a altura de astros.
Sextante|Instrumento que mede ângulos em navegação astronômica.
Cartografia|Arte e ciência da produção de mapas.
Latitude|Distância angular em relação ao equador.
Longitude|Distância angular em relação a um meridiano de referência.
Meridiano|Linha imaginária que liga os polos terrestres.
Equador|Círculo imaginário que divide os hemisférios norte e sul.
Oceano|Grande extensão de água salgada do planeta.
Porto|Local preparado para receber embarcações.
Cabral|Navegador português cuja expedição chegou ao Brasil em 1500.
Colombo|Navegador que alcançou o Caribe em uma expedição de 1492.
Magalhães|Navegador que iniciou a primeira expedição a circundar o planeta.
Elcano|Navegador que completou a primeira circum-navegação.
Vasco da Gama|Navegador que chegou à Índia pela rota marítima do Cabo.
Especiarias|Produtos vegetais valiosos no comércio de longa distância.
`,
  ),
  theme(
    "brasil-historico",
    "Brasil em camadas",
    "historia",
    "Scroll",
    "Pessoas, processos e marcos para investigar a nossa história.",
    "green",
    `
Pau-brasil|Árvore explorada por seu pigmento no início da colonização.
Engenho|Unidade de produção de açúcar do período colonial.
Capitania|Divisão territorial adotada pela Coroa portuguesa na colonização.
Quilombo|Comunidade ligada à resistência de pessoas escravizadas.
Palmares|Grande conjunto de comunidades quilombolas do período colonial.
Zumbi|Liderança histórica associada ao Quilombo dos Palmares.
Mineração|Atividade econômica marcante no Brasil do século XVIII.
Tiradentes|Participante da Inconfidência Mineira executado em 1792.
Salvador|Cidade que foi a primeira capital do Brasil colonial.
Ouro Preto|Cidade mineira ligada ao ciclo do ouro.
Regência|Período entre a abdicação de Pedro I e a maioridade de Pedro II.
Canudos|Comunidade baiana destruída em conflito no fim do século XIX.
Abolição|Processo de extinção legal da escravidão.
República|Forma de governo adotada no Brasil em 1889.
Imigração|Entrada de pessoas vindas de outros países.
Industrialização|Expansão da produção por indústrias na economia.
Brasília|Cidade inaugurada como capital federal em 1960.
Constituição|Conjunto fundamental de normas de organização do Estado.
`,
  ),
  theme(
    "filosofos-classicos",
    "O clube dos filósofos",
    "filosofia",
    "Brain",
    "Pensadores antigos deixaram pistas para perguntas eternas.",
    "gold",
    `
Sócrates|Filósofo ateniense conhecido por interrogar conceitos em diálogo.
Platão|Filósofo grego autor de A República.
Aristóteles|Filósofo grego que escreveu sobre lógica, ética e natureza.
Tales|Pensador de Mileto tradicionalmente associado à água como princípio.
Anaximandro|Filósofo de Mileto associado ao conceito de ápeiron.
Anaxímenes|Pensador de Mileto que atribuiu papel fundamental ao ar.
Heráclito|Filósofo de Éfeso associado à mudança e ao logos.
Parmênides|Filósofo de Eleia que investigou o ser.
Pitágoras|Pensador associado a uma tradição que valorizava os números.
Demócrito|Filósofo associado ao atomismo antigo.
Epicuro|Filósofo que relacionou a vida boa à ausência de perturbação.
Diógenes|Filósofo cínico associado à crítica das convenções sociais.
Zenão|Nome do fundador da escola estoica de Cítio.
Epicteto|Filósofo estoico que distinguiu o que depende de nós.
Sêneca|Filósofo romano ligado à tradição estoica.
Plotino|Pensador associado ao neoplatonismo.
Hipátia|Filósofa e matemática que ensinou em Alexandria.
Confúcio|Pensador chinês que destacou a ética das relações humanas.
`,
  ),
  theme(
    "mentes-modernas",
    "Mentes inquietas",
    "filosofia",
    "BookOpen",
    "A razão encontrou a dúvida e nunca mais voltou igual.",
    "purple",
    `
Descartes|Filósofo francês associado à dúvida metódica e ao cogito.
Spinoza|Filósofo autor da Ética demonstrada em ordem geométrica.
Leibniz|Filósofo que desenvolveu uma teoria das mônadas.
Locke|Pensador associado ao empirismo e à teoria política liberal.
Hume|Filósofo escocês que investigou causalidade e experiência.
Kant|Filósofo prussiano autor da Crítica da Razão Pura.
Hegel|Filósofo alemão autor da Fenomenologia do Espírito.
Nietzsche|Filósofo alemão autor de Assim Falou Zaratustra.
Kierkegaard|Pensador dinamarquês associado à existência e à escolha.
Schopenhauer|Filósofo autor de O Mundo como Vontade e Representação.
Sartre|Filósofo francês associado ao existencialismo.
Beauvoir|Filósofa francesa autora de O Segundo Sexo.
Camus|Escritor e pensador associado ao absurdo.
Arendt|Pensadora que investigou ação política e totalitarismo.
Foucault|Filósofo que estudou relações entre poder e saber.
Russell|Filósofo britânico com contribuições para a lógica.
Wittgenstein|Filósofo austríaco que investigou linguagem e significado.
Merleau-Ponty|Filósofo da fenomenologia que destacou a percepção e o corpo.
`,
  ),
  theme(
    "ideias-filosoficas",
    "Ideias perigosamente boas",
    "filosofia",
    "Sparkles",
    "Gire os botões do pensamento e questione as certezas.",
    "coral",
    `
Ética|Investigação filosófica sobre ação, valores e vida boa.
Estética|Reflexão sobre arte, beleza e experiência sensível.
Lógica|Estudo das formas válidas de inferência.
Metafísica|Investigação sobre aspectos fundamentais da realidade.
Ontologia|Área filosófica que investiga o ser.
Razão|Capacidade de organizar pensamentos e formular argumentos.
Liberdade|Conceito ligado à possibilidade de agir e escolher.
Verdade|Conceito central na avaliação de crenças e afirmações.
Justiça|Conceito que envolve o que é devido a cada pessoa.
Virtude|Disposição considerada boa no caráter ou na ação.
Alteridade|Reconhecimento da condição e da diferença do outro.
Consciência|Noção ligada à experiência e à percepção de si e do mundo.
Dialética|Modo de investigação que trabalha relações e tensões entre ideias.
Niilismo|Posição ligada à negação ou crise de valores e sentidos.
Práxis|Ação humana refletida em sua relação com a teoria.
Utopia|Representação de uma sociedade imaginada como ideal.
Absurdo|Conceito ligado à tensão entre busca de sentido e mundo.
Autonomia|Capacidade de orientar a própria ação segundo princípios.
`,
  ),
  theme(
    "etica-virtudes",
    "A bússola moral",
    "filosofia",
    "Scale",
    "Experimentos mentais sobre como escolher e conviver.",
    "green",
    `
Coragem|Disposição de agir diante do medo e do risco.
Prudência|Capacidade de deliberar com cuidado sobre a ação.
Temperança|Virtude associada à moderação dos desejos.
Honestidade|Qualidade de agir com franqueza e integridade.
Empatia|Capacidade de compreender a perspectiva ou o sentimento alheio.
Respeito|Reconhecimento do valor e dos limites de outras pessoas.
Dever|Obrigação considerada moralmente exigível.
Intenção|Finalidade que orienta uma ação deliberada.
Escolha|Ato de selecionar uma possibilidade entre alternativas.
Dilema|Situação em que opções relevantes entram em conflito.
Caráter|Conjunto de disposições relativamente estáveis de uma pessoa.
Cuidado|Atenção às necessidades e à vulnerabilidade de alguém.
Equidade|Consideração de diferenças relevantes na busca de justiça.
Compaixão|Sensibilidade ao sofrimento de outra pessoa.
Altruísmo|Orientação da ação para o bem de outras pessoas.
Egoísmo|Prioridade atribuída aos próprios interesses.
Dignidade|Valor atribuído à pessoa como merecedora de respeito.
Reciprocidade|Relação de correspondência entre ações e obrigações mútuas.
`,
  ),
  theme(
    "logica-argumentos",
    "Máquina de argumentos",
    "filosofia",
    "Brain",
    "Nem toda frase convincente sobrevive a este teste.",
    "blue",
    `
Premissa|Afirmação usada como ponto de partida de um argumento.
Conclusão|Afirmação que um argumento procura sustentar.
Inferência|Passagem de uma ou mais afirmações a outra.
Dedução|Raciocínio em que a conclusão decorre necessariamente das premissas.
Indução|Raciocínio que amplia conclusões a partir de casos observados.
Abdução|Raciocínio que propõe uma explicação para uma observação.
Validade|Propriedade de um argumento cuja forma preserva a verdade.
Falácia|Erro de raciocínio que pode parecer persuasivo.
Sofisma|Argumento enganoso apresentado com aparência de correção.
Silogismo|Forma de argumento tradicionalmente composta por duas premissas.
Proposição|Conteúdo de uma afirmação que pode ser verdadeiro ou falso.
Negação|Operação lógica que inverte o valor de verdade.
Conjunção|Conectivo lógico correspondente a um e.
Disjunção|Conectivo lógico correspondente a um ou.
Contradição|Incompatibilidade entre uma afirmação e sua negação.
Tautologia|Fórmula verdadeira em todas as suas interpretações lógicas.
Analogia|Comparação de relações ou características entre casos.
Paradoxo|Resultado ou afirmação que desafia expectativas e intuições.
`,
  ),
  theme(
    "escolas-filosoficas",
    "Escolas do pensamento",
    "filosofia",
    "Landmark",
    "Um corredor inteiro de portas para enxergar o mundo.",
    "gold",
    `
Estoicismo|Escola antiga que valoriza a virtude e o exame dos juízos.
Cinismo|Escola antiga que questiona convenções e valoriza a simplicidade.
Ceticismo|Tradição que examina os limites das pretensões de conhecimento.
Epicurismo|Escola associada a Epicuro e à busca de tranquilidade.
Platonismo|Tradição filosófica inspirada no pensamento de Platão.
Atomismo|Concepção antiga que explica a realidade por átomos e vazio.
Empirismo|Posição que destaca a experiência na formação do conhecimento.
Racionalismo|Posição que atribui papel fundamental à razão no conhecimento.
Idealismo|Família de posições que atribui papel central ao ideal ou mental.
Realismo|Família de posições que afirma a realidade independente de algo.
Materialismo|Posição que atribui caráter fundamental à matéria.
Dualismo|Concepção que distingue dois princípios fundamentais.
Monismo|Concepção que admite um princípio fundamental.
Pragmatismo|Tradição que examina ideias por suas relações com práticas e efeitos.
Humanismo|Tradição que valoriza a formação e a reflexão sobre o humano.
Positivismo|Corrente associada a Auguste Comte e ao conhecimento científico.
Existencialismo|Corrente que destaca a existência, a liberdade e a escolha.
Fenomenologia|Tradição que investiga as estruturas da experiência vivida.
`,
  ),
  theme(
    "conhecimento-realidade",
    "O que podemos saber?",
    "filosofia",
    "BookOpen",
    "Desconfie do óbvio: o experimento agora acontece na mente.",
    "purple",
    `
Crença|Atitude de tomar uma afirmação como verdadeira.
Saber|Noção de conhecimento investigada pela epistemologia.
Dúvida|Suspensão ou questionamento de uma certeza.
Evidência|Elemento que oferece apoio a uma afirmação.
Percepção|Modo de acesso ao mundo por meio dos sentidos.
Memória|Capacidade de conservar e recuperar experiências e informações.
Experiência|Contato vivido com acontecimentos e fenômenos.
Intuição|Apreensão que parece ocorrer sem uma cadeia explícita de raciocínio.
Conceito|Representação geral usada para pensar e classificar.
Objeto|Aquilo a que um ato de conhecimento se dirige.
Sujeito|Polo que percebe, pensa ou conhece.
Fenômeno|Aquilo que aparece ou se apresenta à experiência.
Essência|Conjunto de características consideradas fundamentais de algo.
Aparência|Modo como algo se apresenta à percepção.
Causa|Condição ou fator ao qual se atribui a produção de um efeito.
Efeito|Resultado associado à ação de uma causa.
Necessidade|Qualidade do que não pode ser diferente sob certas condições.
Contingência|Qualidade do que poderia ser diferente ou não ocorrer.
`,
  ),
  theme(
    "engrenagens-democracia",
    "Engrenagens da democracia",
    "politica",
    "Landmark",
    "Conheça peças e processos da representação política.",
    "blue",
    `
Democracia|Forma de organização política baseada na participação do povo.
Parlamento|Órgão representativo que participa da elaboração de leis.
Constituição|Conjunto fundamental de normas que organiza um Estado.
Cidadania|Condição ligada a direitos e deveres na vida pública.
Eleição|Processo de escolha de representantes ou ocupantes de cargos.
República|Forma de governo cuja chefia de Estado não é, em princípio, hereditária.
Senado|Nome de uma câmara legislativa em diversos países.
Câmara|Nome usado por órgãos legislativos representativos.
Voto|Expressão formal de uma escolha em uma decisão coletiva.
Urna|Recipiente ou equipamento usado na coleta de votos.
Mandato|Período e atribuição de exercício de um cargo representativo.
Candidato|Pessoa que se apresenta para disputar uma eleição.
Partido|Organização que reúne pessoas em torno de propostas políticas.
Oposição|Forças políticas que não integram o apoio ao governo.
Coalizão|Aliança entre grupos ou partidos para uma finalidade política.
Debate|Discussão pública de argumentos e propostas.
Quórum|Número mínimo exigido para uma deliberação ou reunião.
Referendo|Consulta popular para aprovar ou rejeitar uma decisão normativa já tomada.
`,
  ),
  theme(
    "estado-poder",
    "A arquitetura do Estado",
    "politica",
    "Scale",
    "Entre instituições, regras e a divisão de responsabilidades.",
    "gold",
    `
Estado|Organização política que exerce autoridade sobre território e população.
Governo|Conjunto de autoridades responsáveis pela direção política do Estado.
Nação|Comunidade ligada por referências históricas, culturais ou políticas.
Soberania|Autoridade suprema de um Estado em sua ordem política.
Território|Espaço sobre o qual se exerce uma autoridade política.
Federação|Organização estatal que reparte competências entre entes federados.
Município|Unidade local de organização política e administrativa.
União|Ente que exerce as competências federais no Brasil.
Executivo|Poder associado à administração e à execução das políticas públicas.
Legislativo|Poder associado à elaboração de leis e à fiscalização.
Judiciário|Poder associado à solução institucional de conflitos jurídicos.
Tribunal|Órgão colegiado ou instituição de julgamento.
Ministério|Órgão da administração responsável por uma área de governo.
Autarquia|Entidade administrativa com personalidade jurídica de direito público.
Burocracia|Organização administrativa baseada em funções e procedimentos.
Orçamento|Planejamento de receitas e despesas para um período.
Tributo|Prestação compulsória instituída por lei para financiar o poder público.
Diplomacia|Condução de relações entre Estados e outros atores internacionais.
`,
  ),
  theme(
    "ideias-politicas",
    "O mapa das ideias",
    "politica",
    "BookOpen",
    "Vocabulário para entender debates sem desligar o pensamento.",
    "purple",
    `
Liberalismo|Família de ideias que atribui importância às liberdades individuais.
Socialismo|Família de ideias que propõe formas sociais de controle da produção.
Anarquismo|Tradição política crítica da autoridade estatal e de hierarquias coercivas.
Federalismo|Princípio de repartição do poder entre unidades de uma federação.
Pluralismo|Reconhecimento da diversidade de grupos e posições na sociedade.
Pacifismo|Posição que defende a paz e a oposição à guerra.
Feminismo|Conjunto de movimentos voltados à igualdade de direitos entre gêneros.
Ecologismo|Corrente política que coloca questões ambientais no centro do debate.
Nacionalismo|Família de ideias que atribui centralidade política à nação.
Reformismo|Estratégia de transformação por mudanças graduais nas instituições.
Laicidade|Princípio de autonomia do Estado em relação a instituições religiosas.
Autocracia|Forma de governo marcada pela concentração do poder decisório.
Oligarquia|Governo ou domínio político exercido por um grupo restrito.
Monarquia|Forma de governo em que a chefia do Estado cabe a um monarca.
Igualdade|Princípio que rejeita distinções injustificadas entre pessoas.
Liberdade|Condição ligada à possibilidade de agir sem coerção indevida.
Poder|Capacidade de influenciar condutas e decisões.
Consenso|Acordo amplamente compartilhado em um grupo.
`,
  ),
  theme(
    "liderancas-historicas",
    "Figuras da história política",
    "politica",
    "Crown",
    "Biografias que ajudam a ler épocas, escolhas e conflitos.",
    "coral",
    `
Mandela|Líder contra o apartheid que se tornou presidente da África do Sul.
Gandhi|Liderança do movimento de independência da Índia.
Lincoln|Presidente dos Estados Unidos durante a Guerra Civil.
Churchill|Primeiro-ministro britânico durante parte da Segunda Guerra Mundial.
Vargas|Político que governou o Brasil em diferentes períodos do século XX.
Dom Pedro|Nome de dois imperadores do Brasil.
Cleópatra|Rainha da dinastia ptolomaica do Egito.
César|General e governante romano morto em 44 antes de Cristo.
Péricles|Líder ateniense associado ao século V antes de Cristo.
Bolívar|Liderança das independências de países da América do Sul.
San Martín|Liderança militar das independências sul-americanas.
Bismarck|Estadista ligado à unificação alemã no século XIX.
Catarina|Nome da imperatriz russa conhecida como a Grande.
Elizabeth|Nome da rainha inglesa que governou entre 1558 e 1603.
Akbar|Imperador mogol que governou parte do sul da Ásia.
Atatürk|Fundador e primeiro presidente da República da Turquia.
Indira|Primeiro nome da primeira mulher a ocupar o cargo de primeira-ministra da Índia.
Nasser|Presidente egípcio associado ao nacionalismo árabe no século XX.
`,
  ),
  theme(
    "direitos-cidadania",
    "Vida em sociedade",
    "politica",
    "Scale",
    "Direitos, participação e o trabalho cotidiano de conviver.",
    "green",
    `
Direito|Faculdade ou garantia reconhecida por uma ordem normativa.
Dever|Obrigação ligada à vida em sociedade.
Dignidade|Valor da pessoa que fundamenta a proteção de direitos humanos.
Educação|Processo de formação e acesso ao conhecimento.
Saúde|Dimensão do bem-estar ligada às condições de vida e de cuidado.
Moradia|Lugar de habitação e tema de proteção social.
Trabalho|Atividade humana de produção e transformação.
Cultura|Conjunto de práticas, expressões e referências de grupos humanos.
Inclusão|Processo de ampliar acesso e participação na sociedade.
Acesso|Possibilidade de alcançar um serviço, espaço ou recurso.
Equidade|Consideração de necessidades diferentes na distribuição de recursos.
Proteção|Ação destinada a resguardar pessoas contra danos.
Pluralidade|Presença e convivência de diferenças em uma coletividade.
Associação|Organização formada pela reunião de pessoas para um objetivo.
Sindicato|Organização que representa interesses de uma categoria.
Petição|Pedido formal dirigido a uma autoridade.
Audiência|Reunião institucional que pode permitir escuta e participação pública.
Ouvidoria|Canal institucional para receber manifestações da população.
`,
  ),
  theme(
    "politica-internacional",
    "O mundo à mesa",
    "politica",
    "Globe",
    "Fronteiras, tratados e conversas que atravessam oceanos.",
    "blue",
    `
ONU|Organização internacional criada em 1945 com objetivos de cooperação.
UNESCO|Agência da ONU dedicada à educação, à ciência e à cultura.
UNICEF|Fundo das Nações Unidas dedicado à infância.
OMS|Organização internacional voltada à saúde pública.
OIT|Organização internacional especializada em questões do trabalho.
OMC|Organização que trata de regras do comércio internacional.
Mercosul|Processo de integração regional iniciado pelo Tratado de Assunção.
Embaixada|Representação diplomática de um Estado em outro.
Consulado|Repartição que presta funções consulares no exterior.
Tratado|Acordo internacional regido pelo direito internacional.
Acordo|Entendimento formal ou informal entre partes.
Fronteira|Limite entre territórios políticos.
Asilo|Proteção concedida a uma pessoa em circunstâncias previstas pelo direito.
Refúgio|Proteção internacional ligada a perseguição e outras situações reconhecidas.
Migração|Deslocamento de pessoas entre lugares.
Sanção|Medida restritiva aplicada como resposta a determinada conduta.
Mediação|Participação de um terceiro na busca de solução de um conflito.
Armistício|Acordo para suspender hostilidades militares.
`,
  ),
  theme(
    "economia-sociedade",
    "A economia do cotidiano",
    "politica",
    "Scale",
    "Investigue os mecanismos que conectam preços, trabalho e escolhas.",
    "gold",
    `
Mercado|Ambiente de interação entre compradores e vendedores.
Oferta|Quantidade de bens ou serviços que vendedores dispõem a oferecer.
Demanda|Quantidade de bens ou serviços que compradores desejam adquirir.
Preço|Valor expresso para uma troca.
Inflação|Elevação persistente do nível geral de preços.
Moeda|Instrumento usado como meio de troca e unidade de conta.
Juros|Remuneração ou custo pelo uso de recursos ao longo do tempo.
Crédito|Disponibilização de recursos com compromisso de pagamento futuro.
Renda|Fluxo de recursos recebido em determinado período.
Salário|Remuneração recebida por um trabalho contratado.
Consumo|Uso de bens e serviços para atender necessidades e desejos.
Poupança|Parcela da renda que não é consumida.
Capital|Recursos empregados na produção ou em atividades econômicas.
Imposto|Espécie de tributo que não depende de uma contraprestação específica.
Exportação|Venda de bens ou serviços para o exterior.
Importação|Compra de bens ou serviços do exterior.
Câmbio|Relação de troca entre moedas.
Cooperativa|Organização econômica de associados voltada a interesses comuns.
`,
  ),
  theme(
    "literatura-brasileira",
    "Estante brasileira",
    "cultura",
    "BookOpen",
    "Vozes e obras para uma viagem pela nossa literatura.",
    "coral",
    `
Machado|Sobrenome do autor de Dom Casmurro.
Clarice|Primeiro nome da autora de A Hora da Estrela.
Drummond|Sobrenome do poeta autor de A Rosa do Povo.
Cecília|Primeiro nome da autora de Romanceiro da Inconfidência.
Bandeira|Sobrenome do poeta autor de Libertinagem.
Graciliano|Primeiro nome do autor de Vidas Secas.
Guimarães Rosa|Autor de Grande Sertão: Veredas.
Jorge Amado|Autor de Capitães da Areia.
Carolina|Primeiro nome da autora de Quarto de Despejo.
Conceição|Primeiro nome da autora de Ponciá Vicêncio.
Lima Barreto|Autor de Triste Fim de Policarpo Quaresma.
Alencar|Sobrenome do autor de Iracema.
Aluísio|Primeiro nome do autor de O Cortiço.
Rachel|Primeiro nome da autora de O Quinze.
Hilda|Primeiro nome da escritora autora de A Obscena Senhora D.
Lygia|Primeiro nome da autora de As Meninas.
Capitu|Personagem central do romance Dom Casmurro.
Macunaíma|Herói que dá título a um romance de Mário de Andrade.
`,
  ),
  theme(
    "literatura-mundial",
    "Biblioteca sem fronteiras",
    "cultura",
    "BookOpen",
    "Uma coleção de autores que atravessou línguas e séculos.",
    "purple",
    `
Shakespeare|Dramaturgo inglês autor de Hamlet.
Cervantes|Escritor espanhol autor de Dom Quixote.
Dante|Poeta italiano autor da Divina Comédia.
Goethe|Escritor alemão autor de Fausto.
Austen|Sobrenome da autora de Orgulho e Preconceito.
Dickens|Escritor inglês autor de Oliver Twist.
Tolstói|Escritor russo autor de Guerra e Paz.
Dostoiévski|Escritor russo autor de Crime e Castigo.
Kafka|Escritor de língua alemã autor de A Metamorfose.
Woolf|Sobrenome da autora de Mrs. Dalloway.
Joyce|Escritor irlandês autor de Ulisses.
Borges|Escritor argentino autor de Ficções.
Cortázar|Escritor argentino autor de O Jogo da Amarelinha.
García Márquez|Escritor colombiano autor de Cem Anos de Solidão.
Saramago|Escritor português autor de Ensaio sobre a Cegueira.
Pessoa|Poeta português conhecido por seus heterônimos.
Morrison|Sobrenome da escritora estadunidense autora de Amada.
Shelley|Sobrenome de Mary, autora de Frankenstein.
`,
  ),
  theme(
    "arte-em-movimento",
    "Arte em movimento",
    "cultura",
    "Palette",
    "Tinta, ruptura e formas de reinventar o olhar.",
    "gold",
    `
Barroco|Estilo artístico associado a dramaticidade e contrastes.
Rococó|Estilo associado a ornamentação delicada e curvas.
Realismo|Movimento que valoriza a representação da vida social observável.
Cubismo|Movimento que explora a decomposição geométrica das formas.
Dadaísmo|Movimento que desafiou convenções da arte no século XX.
Surrealismo|Movimento que explorou sonhos e associações do inconsciente.
Futurismo|Movimento que exaltou temas como velocidade e máquinas.
Fauvismo|Movimento de pintura conhecido pelo uso intenso das cores.
Abstração|Produção visual que pode se afastar da representação reconhecível.
Pop Art|Movimento que incorporou imagens da cultura de massa.
Muralismo|Prática artística de produção de pinturas em grandes paredes.
Colagem|Técnica que reúne fragmentos de materiais em uma composição.
Gravura|Imagem produzida por impressão a partir de uma matriz.
Escultura|Arte de criar formas tridimensionais.
Aquarela|Pintura com pigmentos diluídos em água.
Retrato|Representação visual de uma pessoa.
Paisagem|Representação artística de um ambiente.
Ready-made|Objeto cotidiano apresentado como obra de arte.
`,
  ),
  theme(
    "musica-sonora",
    "Frequências musicais",
    "cultura",
    "Music",
    "O oscilador do laboratório está tocando a sua próxima pista.",
    "blue",
    `
Melodia|Sequência de sons percebida como uma linha musical.
Harmonia|Organização de sons simultâneos e suas relações.
Ritmo|Organização das durações e dos acentos musicais.
Timbre|Qualidade sonora que ajuda a distinguir fontes de som.
Compasso|Organização dos pulsos em grupos regulares.
Acorde|Conjunto de notas que soam juntas em uma estrutura harmônica.
Escala|Sequência ordenada de notas musicais.
Oitava|Intervalo entre frequências em proporção de dois para um.
Sonata|Composição instrumental geralmente organizada em vários movimentos.
Sinfonia|Composição de grande escala geralmente destinada à orquestra.
Ópera|Obra cênica em que a música e o canto têm papel central.
Fuga|Composição contrapontística construída a partir de um tema.
Jazz|Tradição musical associada à improvisação e a matrizes afro-americanas.
Blues|Tradição musical afro-americana que influenciou diversos gêneros.
Samba|Gênero musical brasileiro ligado a matrizes afro-brasileiras.
Choro|Gênero instrumental brasileiro associado a conjuntos de pequenos grupos.
Bossa Nova|Movimento musical brasileiro associado a João Gilberto.
Baião|Gênero nordestino difundido nacionalmente por Luiz Gonzaga.
`,
  ),
  theme(
    "cinema-classico",
    "Cinema de outra dimensão",
    "cultura",
    "Sparkles",
    "Luzes baixas, projetor ligado e histórias na tela grande.",
    "coral",
    `
Chaplin|Cineasta e ator conhecido pelo personagem Carlitos.
Keaton|Ator e cineasta do cinema mudo conhecido pela expressão impassível.
Hitchcock|Cineasta associado a filmes de suspense como Janela Indiscreta.
Kubrick|Diretor de 2001: Uma Odisseia no Espaço.
Kurosawa|Cineasta japonês diretor de Os Sete Samurais.
Fellini|Cineasta italiano diretor de A Doce Vida.
Bergman|Cineasta sueco diretor de O Sétimo Selo.
Varda|Sobrenome de Agnès, diretora de Cléo das 5 às 7.
Glauber|Primeiro nome do diretor de Deus e o Diabo na Terra do Sol.
Méliès|Cineasta pioneiro conhecido por Viagem à Lua.
Lumière|Sobrenome dos irmãos associados às primeiras exibições cinematográficas.
Roteiro|Texto que organiza cenas, ações e falas de uma obra audiovisual.
Montagem|Organização dos planos na construção de um filme.
Enquadramento|Escolha do que aparece dentro dos limites da imagem.
Plano|Trecho contínuo de imagem entre dois cortes.
Cena|Unidade de ação situada em determinado contexto narrativo.
Trilha|Conjunto musical associado a uma obra audiovisual.
Claquete|Instrumento de identificação de tomadas e sincronização de som.
`,
  ),
  theme(
    "mitologia-grega",
    "O arquivo do Olimpo",
    "cultura",
    "Crown",
    "Deuses, criaturas e jornadas guardados em velhos mitos.",
    "gold",
    `
Zeus|Deus grego associado ao céu e ao trovão.
Hera|Deusa grega associada ao casamento.
Atena|Deusa grega associada à sabedoria e à estratégia.
Apolo|Deus grego associado à música e à profecia.
Ártemis|Deusa grega associada à caça.
Afrodite|Deusa grega associada ao amor e à beleza.
Ares|Deus grego associado à guerra.
Hermes|Mensageiro dos deuses na mitologia grega.
Hefesto|Deus grego associado à forja e ao trabalho dos metais.
Deméter|Deusa grega associada à agricultura.
Poseidon|Deus grego associado aos mares.
Hades|Deus grego associado ao mundo dos mortos.
Perséfone|Filha de Deméter e rainha do mundo dos mortos.
Dioniso|Deus grego associado ao vinho e ao teatro.
Héracles|Herói grego conhecido por seus doze trabalhos.
Perseu|Herói grego associado à derrota de Medusa.
Teseu|Herói grego que enfrenta o Minotauro.
Ícaro|Personagem que voou com asas construídas por Dédalo.
`,
  ),
  theme(
    "linguas-e-escritas",
    "Códigos da palavra",
    "cultura",
    "Scroll",
    "Como transformamos pensamentos em símbolos e histórias.",
    "green",
    `
Alfabeto|Sistema de escrita que usa letras para representar sons.
Fonema|Unidade sonora capaz de distinguir palavras em uma língua.
Grafema|Unidade básica de um sistema de escrita.
Sílaba|Unidade de organização dos sons da fala.
Léxico|Conjunto de palavras de uma língua ou domínio.
Sintaxe|Estudo da organização das palavras em estruturas.
Semântica|Estudo do significado nas línguas.
Pragmática|Estudo do uso da linguagem em contexto.
Etimologia|Investigação da origem e da história das palavras.
Dialeto|Variedade linguística associada a uma comunidade.
Metáfora|Figura que aproxima sentidos por uma relação de semelhança.
Metonímia|Figura que relaciona termos por proximidade de sentidos.
Hipérbole|Figura de linguagem que utiliza exagero expressivo.
Ironia|Recurso em que o sentido pode contrariar a expressão literal.
Soneto|Poema de forma tradicional composto por quatorze versos.
Haicai|Forma poética breve de origem japonesa.
Crônica|Gênero de prosa frequentemente ligado a acontecimentos cotidianos.
Fábula|Narrativa breve frequentemente associada a um ensinamento.
`,
  ),
];
