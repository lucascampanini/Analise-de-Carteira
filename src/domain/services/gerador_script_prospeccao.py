"""Domain Service: GeradorScriptProspeccao — roteiro SPIN para prospecção de novos clientes."""

from __future__ import annotations

from src.domain.value_objects.script_prospeccao import CenarioProspeccao, ScriptProspeccao


_CTA_PADRAO = (
    "Que tal fazermos um diagnóstico gratuito da sua carteira? "
    "São 30 minutos — sem compromisso — e você sai com um raio-X completo: "
    "retorno real, risco, tributação e o que pode melhorar. Quando você teria disponibilidade?"
)

_OBJECOES_UNIVERSAIS: tuple[tuple[str, str], ...] = (
    (
        "Já tenho assessor.",
        "Ótimo — e eu não estou pedindo para você trocar. Estou propondo um segundo olhar "
        "independente sobre a carteira. Se o que você tem hoje for excelente, o diagnóstico "
        "só vai confirmar. Se tiver algum ponto de melhoria, você vai saber. Em 30 minutos "
        "você tem essa clareza. Faz sentido?",
    ),
    (
        "Não tenho tempo agora.",
        "Sem problema — não precisa ser agora. Posso mandar um resumo de 1 página com "
        "os 3 pontos que qualquer carteira deve ter para você avaliar no seu tempo. "
        "Se despertar curiosidade, a gente marca. Posso enviar?",
    ),
    (
        "Não estou interessado.",
        "Entendo. Só me permite fazer uma pergunta antes de encerrar: você sabe exatamente "
        "quanto sua carteira rendeu acima do CDI no último ano? "
        "[Pausa] Se a resposta for 'não tenho certeza', é exatamente isso que o diagnóstico resolve.",
    ),
    (
        "Como você conseguiu meu contato?",
        "Fui indicado por [nome do indicador] / Vi sua participação em [evento] / "
        "Vi seu perfil no LinkedIn e identifiquei que trabalhamos com perfis similares. "
        "Entro em contato apenas com pessoas que acredito que posso gerar valor real.",
    ),
)


class GeradorScriptProspeccao:
    """Gera ScriptProspeccao adaptado ao cenário de abordagem.

    Stateless. O output varia pelo cenário e pelo contexto adicional informado
    (ex: nome do indicador, evento de vida específico).
    """

    def gerar(
        self,
        cenario: CenarioProspeccao,
        nome_prospect: str = "[Nome]",
        nome_indicador: str | None = None,
        evento_de_vida: str | None = None,
        perfil_estimado: str | None = None,
    ) -> ScriptProspeccao:
        """Gera o roteiro SPIN para o cenário de prospecção informado.

        Args:
            cenario: Tipo de abordagem.
            nome_prospect: Nome do prospect para personalização.
            nome_indicador: Nome de quem indicou (obrigatório para INDICACAO).
            evento_de_vida: Descrição do evento (herança, venda de empresa etc.) para EVENTO_DE_VIDA.
            perfil_estimado: Perfil estimado do prospect (CONSERVADOR/MODERADO/ARROJADO).

        Returns:
            ScriptProspeccao com roteiro completo.
        """
        dispatch = {
            CenarioProspeccao.ABORDAGEM_FRIA: self._abordagem_fria,
            CenarioProspeccao.INDICACAO: self._indicacao,
            CenarioProspeccao.EVENTO: self._evento,
            CenarioProspeccao.INSATISFEITO: self._insatisfeito,
            CenarioProspeccao.EVENTO_DE_VIDA: self._evento_de_vida,
        }
        return dispatch[cenario](
            nome_prospect=nome_prospect,
            nome_indicador=nome_indicador,
            evento_de_vida=evento_de_vida,
            perfil_estimado=perfil_estimado,
        )

    # -------------------------------------------------------------------------
    # Cenários
    # -------------------------------------------------------------------------

    def _abordagem_fria(self, nome_prospect: str, **_) -> ScriptProspeccao:
        return ScriptProspeccao(
            cenario=CenarioProspeccao.ABORDAGEM_FRIA,
            mensagem_abertura=(
                f"Olá, {nome_prospect}! Sou [seu nome], assessor de investimentos na XP.\n\n"
                f"Trabalho com análise de carteiras para profissionais e empresários da região "
                f"e gostaria de compartilhar uma perspectiva rápida que pode ser relevante para você.\n\n"
                f"Teria 2 minutos para uma pergunta?"
            ),
            perguntas_situation=(
                "Você já tem uma carteira de investimentos estruturada ou ainda está começando a organizar?",
                "Você acompanha o desempenho dos seus investimentos com alguma regularidade?",
            ),
            perguntas_problem=(
                "Você tem clareza do que sua carteira rendeu — em termos reais, acima da inflação — "
                "nos últimos 12 meses?",
                "Existe alguma parte dos seus investimentos que você sente que poderia estar trabalhando melhor?",
                "Você já teve a sensação de que está pagando mais IR do que deveria sobre seus ganhos?",
            ),
            perguntas_implication=(
                "Se você não tiver esse número de retorno real com precisão, fica difícil saber "
                "se a estratégia atual está realmente funcionando para você ou apenas acompanhando o mercado. "
                "Isso já passou pela sua cabeça?",
                "Estudos mostram que carteiras sem revisão periódica perdem em média 1,5 a 2% ao ano "
                "em retorno ajustado ao risco — só por desalinhamento de alocação. Em 10 anos com "
                "juros compostos, isso representa uma diferença enorme. Você calcula esse impacto?",
                "A tributação mal planejada em renda variável pode consumir 15-20% do lucro bruto. "
                "Você tem clareza de quanto pagou de IR sobre investimentos no último ano?",
            ),
            perguntas_need_payoff=(
                "Se eu conseguisse te mostrar em 30 minutos onde estão os principais pontos de melhoria "
                "da sua carteira — retorno, risco e tributação — isso seria útil para você?",
                "Um diagnóstico independente e gratuito te daria mais clareza para tomar decisões "
                "sobre seus investimentos com mais segurança. Faz sentido explorar isso?",
            ),
            call_to_action=_CTA_PADRAO,
            challenger_hook=(
                "A maioria das pessoas acha que o maior risco dos investimentos é o mercado cair. "
                "Mas os dados mostram que o maior destruidor de patrimônio em carteiras de longo prazo "
                "não é a volatilidade — é o desalinhamento silencioso entre a estratégia e o objetivo. "
                "Uma carteira pode ter retorno positivo e ainda assim estar destruindo valor para quem a tem."
            ),
            followup_mensagem=(
                f"Olá, {nome_prospect}! Só passando para retomar nossa conversa.\n\n"
                f"Deixo uma reflexão rápida: você sabe quanto sua carteira rendeu acima do CDI "
                f"nos últimos 12 meses?\n\n"
                f"Se a resposta for 'não tenho certeza', o diagnóstico gratuito que mencionei "
                f"resolve exatamente isso — em 30 minutos.\n\nAinda faz sentido conversarmos?"
            ),
            objecoes_previstas=_OBJECOES_UNIVERSAIS,
        )

    def _indicacao(
        self, nome_prospect: str, nome_indicador: str | None, **_
    ) -> ScriptProspeccao:
        indicador = nome_indicador or "[nome do indicador]"
        return ScriptProspeccao(
            cenario=CenarioProspeccao.INDICACAO,
            mensagem_abertura=(
                f"Olá, {nome_prospect}! Sou [seu nome], assessor de investimentos na XP.\n\n"
                f"{indicador} me passou seu contato e falou muito bem de você. "
                f"Trabalho com ele(a) há algum tempo e pensei que poderia fazer sentido "
                f"conversarmos também.\n\n"
                f"Não quero tomar seu tempo à toa — teria 2 minutos para uma pergunta rápida?"
            ),
            perguntas_situation=(
                f"O {indicador} me contou um pouco do seu perfil, mas queria entender melhor: "
                f"você está em um momento de acumulação ou já pensa em viver de renda?",
                "Você tem toda a carteira em uma única instituição ou distribui entre diferentes?",
            ),
            perguntas_problem=(
                "Com tudo que você tem investido hoje, você sente que tem uma visão consolidada "
                "de tudo — retorno, risco, tributação — ou cada parte fica numa conta separada?",
                "Existe algum ponto da sua carteira que você gostaria de entender melhor ou "
                "que te gera alguma dúvida?",
                f"O {indicador} mencionou que uma das coisas que mais valorizou foi ter clareza "
                f"do retorno real. Você tem esse número hoje?",
            ),
            perguntas_implication=(
                "Carteiras distribuídas em várias instituições sem uma visão consolidada "
                "frequentemente têm sobreposição de risco sem o investidor perceber. "
                "Você já fez alguma análise consolidada de tudo que tem?",
                "Sem esse número de retorno real, fica difícil saber se a estratégia atual "
                "está te levando para o objetivo ou apenas se movendo com o mercado. "
                "Isso já gerou alguma incerteza para você?",
            ),
            perguntas_need_payoff=(
                f"Se eu fizer para você o mesmo diagnóstico que fiz para o {indicador} — "
                f"consolidando tudo, calculando retorno real, risco e tributação — "
                f"isso te daria mais clareza sobre onde você está?",
                "Uma visão independente da sua carteira, sem conflito de interesse, "
                "valeria 30 minutos do seu tempo?",
            ),
            call_to_action=(
                f"Posso fazer o mesmo diagnóstico que fiz para o {indicador}: "
                f"30 minutos, gratuito, sem compromisso. "
                f"Você sai com um raio-X completo da sua situação. "
                f"Quando teria disponibilidade esta semana?"
            ),
            challenger_hook=(
                f"O {indicador} me disse uma coisa que ouço com frequência: "
                f"'Eu achava que estava bem diversificado — mas quando vi a análise, "
                f"percebi que tinha 3 CDBs do mesmo banco em contas diferentes.' "
                f"Diversificação de instituição não é diversificação de risco. "
                f"É um dos pontos que o diagnóstico deixa muito claro."
            ),
            followup_mensagem=(
                f"Olá, {nome_prospect}! Retomando nossa conversa.\n\n"
                f"O {indicador} me perguntou se já tínhamos nos falado — quis garantir "
                f"que você tivesse a oportunidade de conhecer o trabalho.\n\n"
                f"Se quiser, posso mandar um resumo de 1 página com os 3 pontos que "
                f"qualquer carteira deve ter. Sem compromisso. Mando?"
            ),
            objecoes_previstas=_OBJECOES_UNIVERSAIS,
        )

    def _evento(self, nome_prospect: str, **_) -> ScriptProspeccao:
        return ScriptProspeccao(
            cenario=CenarioProspeccao.EVENTO,
            mensagem_abertura=(
                f"Olá, {nome_prospect}! Sou [seu nome] — nos conhecemos em [nome do evento].\n\n"
                f"Fiquei pensando na nossa conversa sobre [tema mencionado]. "
                f"Trabalho com análise de carteiras de investimento e me ocorreu que "
                f"poderia ser relevante para você.\n\n"
                f"Posso compartilhar uma perspectiva rápida sobre isso?"
            ),
            perguntas_situation=(
                "No evento você mencionou [contexto] — isso reflete a sua situação atual "
                "com investimentos também?",
                "Você já tem uma estratégia de investimento estruturada ou está em momento "
                "de revisão?",
            ),
            perguntas_problem=(
                "Com o cenário atual — Selic em [X]%, Ibovespa com volatilidade — você "
                "está confortável com a alocação que tem hoje?",
                "Existe algum aspecto da sua carteira que você gostaria de ter mais clareza?",
                "Você já calculou o retorno real (acima de inflação) que sua carteira "
                "entregou nos últimos 12 meses?",
            ),
            perguntas_implication=(
                "Se não tiver esse número, fica difícil comparar o que você tem com "
                "alternativas — e você pode estar deixando retorno na mesa sem saber. "
                "Isso já passou pela sua cabeça?",
                "Com Selic em queda no horizonte do Focus, quem está muito concentrado "
                "em CDI curto vai reinvestir a juros menores e pode perder retorno real. "
                "Sua carteira está preparada para esse ciclo?",
            ),
            perguntas_need_payoff=(
                "Se eu conseguisse mostrar em 30 minutos como sua carteira está posicionada "
                "para o ciclo de juros atual — e onde há oportunidades de melhoria — "
                "isso seria útil?",
            ),
            call_to_action=_CTA_PADRAO,
            challenger_hook=(
                "Uma coisa que aprendi analisando centenas de carteiras: "
                "o maior inimigo do investidor de longo prazo não é o mercado ruim — "
                "é a carteira que parece adequada mas está desalinhada com o ciclo econômico. "
                "Com Selic em [X]% e projeção de queda, a alocação certa hoje é diferente "
                "da certa em 2022. Quem não revisar agora paga o preço no próximo ciclo."
            ),
            followup_mensagem=(
                f"Olá, {nome_prospect}! Retomando após o [evento].\n\n"
                f"Deixo um dado rápido que pode ser relevante: carteiras não revisadas "
                f"em ciclos de mudança de juros perdem em média 1,5-2% ao ano só por "
                f"desalinhamento de duration. Em 5 anos, isso é significativo.\n\n"
                f"Vale 30 minutos para garantir que sua carteira está posicionada certo?"
            ),
            objecoes_previstas=_OBJECOES_UNIVERSAIS,
        )

    def _insatisfeito(self, nome_prospect: str, **_) -> ScriptProspeccao:
        return ScriptProspeccao(
            cenario=CenarioProspeccao.INSATISFEITO,
            mensagem_abertura=(
                f"Olá, {nome_prospect}! Soube que você está avaliando opções de assessoria "
                f"de investimentos.\n\n"
                f"Antes de qualquer conversa sobre trabalhar juntos, gostaria de entender "
                f"melhor o que não está funcionando para você hoje. "
                f"Seria possível conversar rapidamente?"
            ),
            perguntas_situation=(
                "Há quanto tempo você está com a assessoria atual?",
                "Qual é o tamanho aproximado da sua carteira hoje?",
            ),
            perguntas_problem=(
                "O que especificamente está te incomodando na situação atual? "
                "Retorno, comunicação, transparência, produtos?",
                "Você tem acesso fácil ao histórico de retorno da sua carteira "
                "comparado com benchmarks?",
                "Você sente que as recomendações que recebe são para o seu perfil "
                "ou parecem genéricas?",
            ),
            perguntas_implication=(
                "Sem transparência no retorno real, é impossível saber se a assessoria "
                "está agregando valor ou apenas cobindo o CDI. Você tem esse número hoje?",
                "Se o problema for a qualidade das recomendações, cada mês que passa "
                "sem resolver isso tem um custo — não só financeiro, mas de oportunidade. "
                "Você calculou quanto tempo está nessa situação?",
                "Uma assessoria que não comunica bem e não mostra resultados claros "
                "frequentemente tem outros problemas estruturais. "
                "Você revisou os produtos que tem na carteira hoje?",
            ),
            perguntas_need_payoff=(
                "Se eu fizer um diagnóstico independente da sua carteira — sem nenhum "
                "compromisso de migrar — você teria clareza do que tem, o que está bom "
                "e o que pode melhorar. Isso seria um bom ponto de partida?",
                "Um segundo olhar independente, antes de qualquer decisão de mudança, "
                "te daria mais segurança para decidir o próximo passo?",
            ),
            call_to_action=(
                "Sugiro começarmos com um diagnóstico completo — 30 minutos, gratuito, "
                "sem compromisso de migrar nada. Você entende exatamente o que tem hoje "
                "e daí decide com clareza o que faz sentido. "
                "Quando podemos marcar?"
            ),
            challenger_hook=(
                "A maioria dos assessores em situação de troca entra direto no pitch: "
                "'venha para nós, somos melhores.' Eu faço diferente. "
                "Primeiro quero entender o que não está funcionando — porque às vezes "
                "o problema não é o assessor, é o produto ou a estratégia. "
                "E se for assim, eu te digo isso mesmo que a solução não seja trabalhar comigo."
            ),
            followup_mensagem=(
                f"Olá, {nome_prospect}! Retomando nossa conversa.\n\n"
                f"Pensando mais no que você mencionou: o diagnóstico que proponho "
                f"não é um pitch — é um raio-X independente da sua situação atual. "
                f"Se o que você tem hoje for bom, fico feliz em confirmar isso. "
                f"Se houver algo a melhorar, você vai saber exatamente o quê.\n\n"
                f"Vale 30 minutos para ter essa clareza?"
            ),
            objecoes_previstas=(
                (
                    "Já estou migrando para outro lugar.",
                    "Ótimo — antes de migrar, um diagnóstico independente garante que "
                    "você não está levando problemas da carteira atual para o novo lugar. "
                    "Produtos de crédito privado, por exemplo, não migram automaticamente. "
                    "Posso te ajudar a entender o que tem antes de qualquer movimento?",
                ),
                (
                    "Quero só comparar taxas.",
                    "Entendo. Mas taxa é só uma parte da equação. A carteira com a menor "
                    "taxa pode ter o pior retorno líquido se a alocação estiver errada. "
                    "O diagnóstico mostra o retorno real — que é o que importa. "
                    "Com esse número na mão, a comparação faz sentido de verdade.",
                ),
            ) + _OBJECOES_UNIVERSAIS,
        )

    def _evento_de_vida(
        self, nome_prospect: str, evento_de_vida: str | None, **_
    ) -> ScriptProspeccao:
        evento = evento_de_vida or "mudança patrimonial recente"
        return ScriptProspeccao(
            cenario=CenarioProspeccao.EVENTO_DE_VIDA,
            mensagem_abertura=(
                f"Olá, {nome_prospect}! Sou [seu nome], assessor de investimentos na XP.\n\n"
                f"Fui informado que você está passando por um momento importante — "
                f"{evento}. Esse tipo de evento geralmente levanta questões sobre como "
                f"estruturar o patrimônio da melhor forma.\n\n"
                f"Posso compartilhar algumas perspectivas que podem ser úteis nesse momento?"
            ),
            perguntas_situation=(
                f"Em relação ao {evento}, você já tem uma ideia de como pretende "
                f"estruturar esse patrimônio ou ainda está avaliando opções?",
                "Você já tem uma carteira de investimentos estruturada ou vai começar "
                "a organizar agora?",
            ),
            perguntas_problem=(
                f"Eventos como {evento} geralmente trazem decisões com prazo — tributação, "
                f"liquidez, alocação. Você já tem clareza de quais são essas decisões e "
                f"o tempo que tem para tomá-las?",
                "Alguém já te orientou sobre a estrutura fiscal mais eficiente para "
                "esse momento específico?",
                "Você tem preocupação com preservação do patrimônio ou o foco agora "
                "é em crescimento?",
            ),
            perguntas_implication=(
                f"Decisões tomadas sem planejamento logo após {evento} costumam gerar "
                f"ineficiências tributárias que são difíceis de reverter depois. "
                f"Você tem alguém de confiança para te orientar nesse processo?",
                "A alocação ideal para um patrimônio recém-constituído é diferente "
                "da de um patrimônio em fase de acumulação. Sem essa diferenciação, "
                "o risco é usar a estratégia errada para o momento certo.",
                "Patrimônios acima de R$500k têm instrumentos específicos — fundos "
                "exclusivos, previdência com PGBL/VGBL estruturado, offshores — "
                "que a maioria das plataformas de varejo não oferece. "
                "Você já tem acesso a esses instrumentos?",
            ),
            perguntas_need_payoff=(
                f"Se eu pudesse te apresentar as principais estruturas para {evento} "
                f"— incluindo tributação, instrumentos disponíveis e como cada um "
                f"se aplica ao seu caso — isso seria útil nesse momento de decisão?",
                "Um diagnóstico de como estruturar esse patrimônio da forma mais "
                "eficiente possível, antes de qualquer alocação, faria sentido?",
            ),
            call_to_action=(
                f"Proponho uma reunião de 45 minutos — gratuita e sem compromisso — "
                f"onde eu te apresento as principais estruturas para {evento} e "
                f"como cada uma se encaixa no seu perfil e objetivos. "
                f"Decisões tomadas com clareza agora poupam correções custosas depois. "
                f"Quando você teria disponibilidade?"
            ),
            challenger_hook=(
                f"A decisão mais cara que vejo após {evento} não é onde alocar — "
                f"é não estruturar antes de alocar. Uma vez que o dinheiro está "
                f"em produtos, reverter tem custo: IR sobre ganho realizado, "
                f"carência, liquidez. A ordem certa é: estrutura → produto. "
                f"Quem inverte essa ordem frequentemente paga caro para corrigir."
            ),
            followup_mensagem=(
                f"Olá, {nome_prospect}! Retomando nossa conversa sobre {evento}.\n\n"
                f"Um dado que pode ser relevante: a janela para otimizar a estrutura "
                f"fiscal logo após esse tipo de evento é limitada. Algumas decisões "
                f"ficam mais caras ou impossíveis de fazer depois.\n\n"
                f"Posso te enviar um resumo de 1 página com os pontos críticos a "
                f"resolver agora? Sem compromisso — só para você ter o mapa."
            ),
            objecoes_previstas=(
                (
                    "Vou esperar a situação estabilizar para pensar em investimentos.",
                    "Entendo — e para a maioria das decisões, faz sentido. "
                    "Mas algumas decisões estruturais têm prazo: declaração de IR, "
                    "prazo para optar por regime tributário, janelas de produtos. "
                    "O diagnóstico que proponho é exatamente para identificar "
                    "o que tem prazo e o que pode esperar. Em 30 minutos você "
                    "sabe o que é urgente e o que não é.",
                ),
                (
                    "Já tenho contador/advogado cuidando disso.",
                    "Ótimo — e não estou propondo substituir. Contador e advogado "
                    "cuidam da estrutura jurídica e fiscal. Eu cuido de onde o "
                    "dinheiro trabalha depois que a estrutura está definida. "
                    "Os dois são complementares. Posso conversar com eles também "
                    "se fizer sentido.",
                ),
            ) + _OBJECOES_UNIVERSAIS,
        )
