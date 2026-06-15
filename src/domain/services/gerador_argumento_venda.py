"""Domain Service: GeradorArgumentoVenda — gera argumentos SPIN para recomendações."""

from __future__ import annotations

from src.domain.entities.cliente import Cliente
from src.domain.entities.recomendacao import Recomendacao, TipoRecomendacao
from src.domain.value_objects.argumento_venda import ArgumentoVenda
from src.domain.value_objects.perfil_investidor import PerfilInvestidor


class GeradorArgumentoVenda:
    """Gera ArgumentoVenda estruturado via SPIN Selling para cada Recomendacao.

    Encapsula a metodologia SPIN (Rackham, 1988) + Challenger Sale (Dixon & Adamson, 2011)
    + princípios de Behavioral Finance (Kahneman & Tversky) aplicados ao contexto de
    assessoria de investimentos.

    Stateless — não tem estado interno. Recebe os dados necessários em cada chamada.
    """

    def gerar(
        self,
        recomendacao: Recomendacao,
        cliente: Cliente,
        percentual_rv: float,
        percentual_rf: float,
        cvar_mensal_reais: float | None = None,
        pl_total: float | None = None,
    ) -> ArgumentoVenda:
        """Gera ArgumentoVenda para uma Recomendacao específica.

        Args:
            recomendacao: A recomendação para a qual gerar o argumento.
            cliente: Cliente assessorado (perfil, objetivos, horizonte).
            percentual_rv: Percentual atual em Renda Variável.
            percentual_rf: Percentual atual em Renda Fixa.
            cvar_mensal_reais: CVaR 95% mensal em reais (opcional, enriquece perguntas).
            pl_total: Patrimônio Líquido total da carteira (opcional, quantifica impactos).

        Returns:
            ArgumentoVenda com perguntas SPIN, script e objeções estruturadas.
        """
        tipo = recomendacao.tipo
        ticker = recomendacao.ticker

        if tipo == TipoRecomendacao.REDUZIR and ticker in ("RENDA_VARIAVEL",):
            return self._argumento_reducao_rv(recomendacao, cliente, percentual_rv, cvar_mensal_reais, pl_total)

        if tipo == TipoRecomendacao.AUMENTAR and ticker in ("RENDA_FIXA",):
            return self._argumento_aumento_rf(recomendacao, cliente, percentual_rf, pl_total)

        if tipo == TipoRecomendacao.REDUZIR:
            return self._argumento_reducao_concentracao(recomendacao, cliente, pl_total)

        if tipo == TipoRecomendacao.INCLUIR:
            return self._argumento_inclusao_ativo(recomendacao, cliente)

        if tipo == TipoRecomendacao.REMOVER:
            return self._argumento_remocao_ativo(recomendacao, cliente, pl_total)

        return self._argumento_generico(recomendacao, cliente)

    # -------------------------------------------------------------------------
    # Cenários específicos
    # -------------------------------------------------------------------------

    def _argumento_reducao_rv(
        self,
        rec: Recomendacao,
        cliente: Cliente,
        percentual_rv: float,
        cvar_mensal_reais: float | None,
        pl_total: float | None,
    ) -> ArgumentoVenda:
        excesso = percentual_rv - cliente.percentual_rv_maximo
        perfil_str = cliente.perfil.value

        cvar_str = f"R${cvar_mensal_reais:,.0f}" if cvar_mensal_reais else "valor significativo"
        pl_str = f"R${pl_total:,.0f}" if pl_total else "seu patrimônio"

        implicacao_pl = ""
        if pl_total:
            queda_cenario = pl_total * (percentual_rv / 100) * 0.35
            implicacao_pl = (
                f"Com {percentual_rv:.0f}% em RV, uma correção de 35% do mercado "
                f"(como ocorreu em 2020) representaria uma queda de "
                f"R${queda_cenario:,.0f} no seu patrimônio total de {pl_str}."
            )

        dados = {
            "percentual_rv_atual": f"{percentual_rv:.1f}%",
            "percentual_rv_maximo_perfil": f"{cliente.percentual_rv_maximo:.0f}%",
            "excesso_rv": f"{excesso:.1f}%",
            "cvar_mensal": cvar_str,
            "perfil": perfil_str,
        }

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                "Há quanto tempo sua carteira está com essa proporção em renda variável?",
                "Você passou por alguma queda relevante de mercado com essa exposição?",
            ),
            perguntas_problem=(
                f"Quando o mercado oscila forte, você se sente confortável sabendo "
                f"que {percentual_rv:.0f}% do seu patrimônio está em renda variável?",
                "Você tem clareza do retorno real (acima do CDI) que sua RV está entregando?",
                f"Se você precisasse resgatar parte do patrimônio agora, a exposição "
                f"em RV te limita de alguma forma?",
            ),
            perguntas_implication=(
                f"Com {percentual_rv:.0f}% em RV e CVaR mensal de {cvar_str}, em 1 de "
                f"cada 20 meses você pode perder mais do que isso. Dado seu objetivo de "
                f"{cliente.objetivo.value}, como avalia esse risco?",
                implicacao_pl or (
                    f"Uma correção de 35% do mercado — o que é historicamente recorrente — "
                    f"impacta diretamente {percentual_rv:.0f}% do seu PL. Quanto tempo "
                    f"você estaria disposto a aguardar pela recuperação?"
                ),
                f"Seu perfil declarado é {perfil_str}, que recomenda no máximo "
                f"{cliente.percentual_rv_maximo:.0f}% em RV. Caso você precise de liquidez "
                f"em um momento de baixa de mercado, o que acontece com seu plano?",
            ),
            perguntas_need_payoff=(
                f"Se conseguíssemos reduzir a RV para {cliente.percentual_rv_maximo:.0f}% "
                f"— compatível com seu perfil — mantendo perspectiva de retorno acima do CDI, "
                f"isso melhoraria seu conforto com a carteira?",
                "Uma carteira calibrada exatamente para o risco que você declarou tolerar "
                "mudaria algo na sua tranquilidade do dia a dia?",
            ),
            challenger_reframe=(
                f"A maioria dos investidores {perfil_str.lower()}s com {percentual_rv:.0f}% "
                f"em RV não percebe que está assumindo um risco incompatível com seu horizonte. "
                f"O problema não é a renda variável em si — é o descasamento com o perfil "
                f"declarado, que em momentos de stress força decisões no pior momento possível."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Após revisar sua carteira, identificamos um ponto importante.\n\n"
                f"📊 Situação atual: {percentual_rv:.0f}% em Renda Variável\n"
                f"🎯 Recomendado para seu perfil ({perfil_str}): até {cliente.percentual_rv_maximo:.0f}%\n\n"
                f"A diferença de {excesso:.0f}% representa uma exposição ao risco que, "
                f"em cenários de stress de mercado, pode gerar um impacto considerável no seu PL.\n\n"
                f"Sugiro conversarmos 15 minutos para revisar a melhor forma de ajustar isso "
                f"de forma gradual e com atenção ao IR.\n\nQual o melhor horário para você?"
            ),
            objecoes_previstas=(
                (
                    "O mercado está bem, prefiro esperar.",
                    "Exatamente — quando o mercado está bem é o melhor momento para "
                    "rebalancear, porque você vende com lucro e ainda pode aproveitar a "
                    "isenção de IR de R$20k/mês. Quando o mercado cair, a decisão se torna "
                    "muito mais difícil emocionalmente.",
                ),
                (
                    "Já passei por quedas antes e não me incomodou.",
                    "Entendo. Mas quero te perguntar: quando caiu antes, você tinha o mesmo "
                    "objetivo que tem hoje? À medida que nos aproximamos do prazo do objetivo, "
                    "a tolerância real a uma queda muda — mesmo que a tolerância declarada não mude.",
                ),
                (
                    "Não quero pagar IR agora.",
                    "Podemos planejar vendas dentro do limite de isenção de R$20k/mês para "
                    "ações. Em [prazo] meses, zeraríamos o excesso sem pagar um real de IR.",
                ),
            ),
            dados_quantitativos=dados,
        )

    def _argumento_aumento_rf(
        self,
        rec: Recomendacao,
        cliente: Cliente,
        percentual_rf: float,
        pl_total: float | None,
    ) -> ArgumentoVenda:
        deficit = cliente.percentual_rf_minimo - percentual_rf
        perfil_str = cliente.perfil.value

        dados = {
            "percentual_rf_atual": f"{percentual_rf:.1f}%",
            "percentual_rf_minimo_perfil": f"{cliente.percentual_rf_minimo:.0f}%",
            "deficit_rf": f"{deficit:.1f}%",
            "perfil": perfil_str,
        }

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                "Qual é o vencimento médio dos seus títulos de renda fixa atuais?",
                "Você tem algum compromisso financeiro programado para os próximos 24 meses?",
            ),
            perguntas_problem=(
                f"Com {percentual_rf:.0f}% em Renda Fixa — abaixo do recomendado para seu "
                f"perfil {perfil_str} — você sente que a carteira tem o colchão de segurança "
                f"que você esperava?",
                "Se o mercado de ações corrigir fortemente, a parcela de RF atual seria "
                "suficiente para cobrir suas necessidades de liquidez?",
            ),
            perguntas_implication=(
                f"Com déficit de {deficit:.1f}% em RF, em um cenário de queda de mercado "
                f"você seria forçado a vender RV no pior momento para ter liquidez. "
                f"Isso já aconteceu com você antes?",
                "Dado que sua RF está abaixo do mínimo, a volatilidade da carteira é maior "
                "do que a compatível com seu perfil declarado. Você calculou o impacto disso "
                "no seu planejamento de médio prazo?",
                f"Se você precisar de caixa em {cliente.horizonte.value.lower()} e o mercado "
                f"estiver em baixa, qual é o plano B com apenas {percentual_rf:.0f}% em RF?",
            ),
            perguntas_need_payoff=(
                f"Se aumentarmos a RF para {cliente.percentual_rf_minimo:.0f}% com títulos "
                f"que remuneram acima do CDI, a carteira ficaria mais alinhada ao seu objetivo "
                f"de {cliente.objetivo.value.lower()}. Isso faz sentido para você?",
                "Um colchão de RF adequado ao seu perfil mudaria seu conforto com a exposição "
                "em renda variável que você manteria?",
            ),
            challenger_reframe=(
                "A maioria dos investidores vê renda fixa como 'conservadora demais'. "
                "Mas no contexto atual — com juros reais acima de 6% ao ano — a RF de qualidade "
                "não é defensiva: ela é a alocação com o melhor retorno ajustado ao risco do mercado. "
                "Não aumentar RF agora é uma decisão ativa de abrir mão desse carrego."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Analisando sua carteira, notei que a Renda Fixa está em "
                f"{percentual_rf:.0f}% — abaixo dos {cliente.percentual_rf_minimo:.0f}% "
                f"recomendados para o seu perfil {perfil_str}.\n\n"
                f"Com juros reais acima de 6% ao ano, a RF hoje oferece o melhor retorno "
                f"ajustado ao risco do mercado. Perder esse carrego é uma decisão custosa.\n\n"
                f"Tenho algumas opções de títulos interessantes para você analisar. "
                f"Podemos conversar rapidamente?"
            ),
            objecoes_previstas=(
                (
                    "RF rende pouco.",
                    "Com IPCA+ 6,5% ao ano (atual em alguns títulos), a RF está entregando "
                    "retorno real de 6,5% acima da inflação. É historicamente alto. "
                    "A RV precisaria superar isso com consistência para compensar o risco extra.",
                ),
                (
                    "Prefiro manter em bolsa enquanto está subindo.",
                    "Entendo. Mas lembro que rebalancear em alta é a estratégia correta — "
                    "você vende caro (RV) e compra barato (RF que está pagando bem). "
                    "Quando a bolsa cair, a janela se fecha.",
                ),
            ),
            dados_quantitativos=dados,
        )

    def _argumento_reducao_concentracao(
        self,
        rec: Recomendacao,
        cliente: Cliente,
        pl_total: float | None,
    ) -> ArgumentoVenda:
        ticker = rec.ticker
        percentual_sugerido = rec.percentual_sugerido or 20.0

        pl_str = f"R${pl_total:,.0f}" if pl_total else "seu PL"

        dados = {
            "ticker": ticker,
            "percentual_limite": f"{percentual_sugerido:.0f}%",
        }

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                f"Você lembra quando e por que {ticker} chegou a essa proporção na carteira?",
                "Você acompanha os resultados trimestrais dessa empresa?",
            ),
            perguntas_problem=(
                f"Com {ticker} nessa proporção do seu PL, você sente que está bem "
                f"diversificado ou existe uma dependência grande de uma única empresa?",
                f"Se {ticker} cair por um evento específico da empresa — não do mercado — "
                f"você se sentiria confortável com o impacto?",
            ),
            perguntas_implication=(
                f"Eventos idiossincrásicos — escândalos contábeis, mudanças regulatórias, "
                f"troca de gestão, CPI — podem derrubar uma ação 50-70% independente do "
                f"mercado. Com a concentração atual em {ticker}, qual seria o impacto em "
                f"reais sobre {pl_str}?",
                f"Há empresas comparáveis que passaram por eventos assim nos últimos 10 anos "
                f"(Americanas, IRB, Petrobras em 2015). O risco idiossincrático não é "
                f"teórico — ele se materializa. Você já calculou o cenário para {ticker}?",
            ),
            perguntas_need_payoff=(
                f"Se redistribuirmos o excedente de {ticker} em 3-4 ativos de setores "
                f"diferentes, mantendo a exposição total em RV, você teria a mesma "
                f"perspectiva de retorno com uma fração do risco concentrado. Faz sentido?",
                "Uma diversificação que reduz o risco específico sem reduzir o retorno "
                "esperado seria uma melhoria relevante para você?",
            ),
            challenger_reframe=(
                f"Intuitivamente parece que {ticker} está 'funcionando' e não precisa mudar. "
                f"Mas o ponto não é se está funcionando hoje — é que a concentração cria um "
                f"risco não recompensado: você toma risco específico da empresa sem receber "
                f"retorno adicional por isso. Diversificação elimina esse risco de graça."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Identifiquei na análise da carteira uma concentração elevada "
                f"em {ticker} que merece atenção.\n\n"
                f"📌 Posição atual em {ticker}: acima de 20% do PL\n"
                f"⚠️ Limite recomendado por ativo: {percentual_sugerido:.0f}%\n\n"
                f"Concentração acima desse nível expõe o patrimônio a risco específico da "
                f"empresa — que não é compensado por retorno extra. Uma distribuição "
                f"gradual (respeitando IR) resolveria isso.\n\n"
                f"Posso mandar uma proposta de como fazer isso de forma otimizada?"
            ),
            objecoes_previstas=(
                (
                    f"Mas {ticker} está indo bem, não vejo motivo para vender.",
                    "Justamente por estar em lucro é o melhor momento. Quando está bem, "
                    "você vende com ganho, controla o IR e realoca em condições favoráveis. "
                    "Quando algo negativo acontece, a decisão fica muito mais difícil.",
                ),
                (
                    "Não quero pagar IR sobre o lucro.",
                    f"Podemos planejar vendas graduais de até R$20k/mês (isenção para ações PF). "
                    f"Em [N] meses resolvemos a concentração sem pagar um real de IR.",
                ),
                (
                    f"Acredito muito em {ticker}, conheço bem a empresa.",
                    "Seu conhecimento da empresa é uma vantagem informacional, não uma proteção "
                    "contra eventos externos. A Enron tinha analistas que a conheciam muito bem. "
                    "A pergunta não é 'confio na empresa' — é 'quanto do meu PL quero em risco de 1 empresa'.",
                ),
            ),
            dados_quantitativos=dados,
        )

    def _argumento_inclusao_ativo(
        self,
        rec: Recomendacao,
        cliente: Cliente,
    ) -> ArgumentoVenda:
        ticker = rec.ticker
        justificativa = rec.justificativa

        dados = {
            "ticker": ticker,
            "perfil": cliente.perfil.value,
        }

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                "Você tem alguma experiência anterior com esse tipo de ativo?",
                "Qual é o percentual da carteira que você normalmente destina a ativos novos?",
            ),
            perguntas_problem=(
                "Você sente que a carteira atual tem alguma lacuna de diversificação "
                "por classe de ativo ou setor?",
                "Se o mercado de ações cair, sua carteira tem alguma proteção natural ou "
                "cai junto com o índice?",
            ),
            perguntas_implication=(
                "Sem exposição a [classe de ativo], você fica dependente de um único driver "
                "de retorno. Se esse driver underperformar, o portfólio inteiro sofre. "
                "Quanto isso te preocupa para o seu horizonte?",
                "A diversificação por classe de ativo reduz a correlação da carteira — "
                "matematicamente, você pode ter o mesmo retorno com menos risco. "
                "Você calculou o quanto está 'pagando' por não ter essa diversificação?",
            ),
            perguntas_need_payoff=(
                f"Se {ticker} reduzir a correlação da sua carteira com o Ibovespa, "
                f"mantendo o retorno esperado, isso seria uma melhoria para você?",
                "Uma posição pequena para testar e acompanhar a dinâmica faria sentido "
                "como primeiro passo?",
            ),
            challenger_reframe=(
                f"A maioria dos assessores apresenta {ticker} como 'oportunidade de retorno'. "
                f"A perspectiva mais relevante é outra: {ticker} muda o perfil de risco da "
                f"carteira inteira — reduz correlação, adiciona diversificação real. "
                f"O retorno é consequência; a melhoria do risco/retorno do portfólio é o objetivo."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Tenho uma oportunidade para analisar junto com você.\n\n"
                f"📌 Ativo: {ticker}\n"
                f"🎯 Contexto: {justificativa[:200]}...\n\n"
                f"Do ponto de vista do portfólio, a inclusão de {ticker} melhora a "
                f"diversificação da carteira e reduz a dependência de um único cenário "
                f"de mercado.\n\nPosso te mandar um resumo mais detalhado?"
            ),
            objecoes_previstas=(
                (
                    "Não conheço esse ativo.",
                    "Ótimo ponto — posso te mandar um resumo de 1 página com tudo que "
                    "você precisa saber: emissor, estrutura, riscos, retorno esperado. "
                    "Você decide com informação completa.",
                ),
                (
                    "Minha carteira já está bem diversificada.",
                    "Vamos olhar juntos o índice de diversificação efetiva da carteira "
                    "(HHI e correlação média). Na maioria dos casos, o que parece diversificado "
                    "tem correlação alta em momentos de stress.",
                ),
            ),
            dados_quantitativos=dados,
        )

    def _argumento_remocao_ativo(
        self,
        rec: Recomendacao,
        cliente: Cliente,
        pl_total: float | None,
    ) -> ArgumentoVenda:
        ticker = rec.ticker

        dados = {
            "ticker": ticker,
            "perfil": cliente.perfil.value,
        }

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                f"Você lembra qual foi a tese de investimento original em {ticker}?",
                "Essa tese ainda está válida com o que você sabe hoje?",
            ),
            perguntas_problem=(
                f"Se você não tivesse {ticker} hoje — com tudo que sabe agora — "
                f"você compraria ele novamente?",
                f"Há algo em {ticker} hoje que te preocupa ou que não estava no plano original?",
            ),
            perguntas_implication=(
                f"Manter {ticker} tem um custo de oportunidade: o capital alocado lá poderia "
                f"estar em [alternativa]. Em quanto tempo você espera que {ticker} recupere "
                f"e supere essa alternativa?",
                f"Se {ticker} precisar de mais 2-3 anos para se recuperar, quanto você "
                f"deixa de ganhar no melhor uso alternativo desse capital?",
            ),
            perguntas_need_payoff=(
                f"Se realocar o capital de {ticker} para [alternativa mais adequada] "
                f"acelera seu objetivo em [prazo], isso mudaria sua decisão?",
                "O que te faria mais sentido: esperar a recuperação indefinidamente "
                "ou usar esse capital onde ele trabalha melhor para você agora?",
            ),
            challenger_reframe=(
                f"Há uma falácia cognitiva muito comum em situações assim: o chamado 'sunk cost'. "
                f"O preço que você pagou por {ticker} não existe mais — ele é história. "
                f"A decisão de hoje é só sobre o futuro: dado o que você sabe, {ticker} é "
                f"o melhor uso possível desse capital? Se a resposta for não, a lógica é clara."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Quero conversar sobre {ticker} na sua carteira.\n\n"
                f"Ao revisar a análise, a tese original de investimento parece ter mudado. "
                f"Isso não significa que foi um erro — o mercado muda e as teses evoluem.\n\n"
                f"Antes de decidir o que fazer, queria te fazer uma pergunta: se você "
                f"não tivesse {ticker} hoje, você compraria ele agora?\n\n"
                f"A resposta a isso guia o próximo passo. Podemos conversar?"
            ),
            objecoes_previstas=(
                (
                    "Não quero realizar prejuízo.",
                    "Entendo que seja difícil. Mas a pergunta não é sobre o passado — "
                    "é sobre o futuro. O prejuízo já aconteceu, independente de você "
                    "vender ou não. A decisão agora é: esse capital trabalha melhor aqui "
                    "ou em outro lugar? Esse é o único cálculo relevante.",
                ),
                (
                    "Vai recuperar, tenho certeza.",
                    "Pode ser. Mas qual é o prazo esperado? E durante esse prazo, "
                    "quanto o capital alternativo renderia? Vamos calcular juntos os "
                    "dois cenários numericamente para você decidir com dados.",
                ),
            ),
            dados_quantitativos=dados,
        )

    def _argumento_generico(
        self,
        rec: Recomendacao,
        cliente: Cliente,
    ) -> ArgumentoVenda:
        ticker = rec.ticker or "a carteira"

        return ArgumentoVenda(
            recomendacao_id=rec.id,
            perguntas_situation=(
                "Como você avalia a situação atual da carteira em relação aos seus objetivos?",
            ),
            perguntas_problem=(
                "Existe alguma parte da carteira que não está performando como você esperava?",
                "Você sente que a carteira está alinhada ao seu perfil e momento de vida?",
            ),
            perguntas_implication=(
                "Se a carteira ficar como está por mais 12 meses, o que acontece com "
                "o progresso em direção ao seu objetivo principal?",
                "Quais são os riscos de não fazer essa revisão agora?",
            ),
            perguntas_need_payoff=(
                "Se essa mudança aproximasse sua carteira do objetivo mais rapidamente, "
                "faria sentido discutirmos os detalhes?",
            ),
            challenger_reframe=(
                f"A recomendação sobre {ticker} não é sobre otimizar o ativo em si — "
                f"é sobre garantir que o portfólio como um todo esteja estruturado para "
                f"o seu objetivo específico. O detalhe importa menos que a direção."
            ),
            script_whatsapp=(
                f"Olá, [Nome]! Após revisar a análise completa da carteira, tenho uma "
                f"recomendação sobre {ticker} que quero discutir com você.\n\n"
                f"{rec.justificativa}\n\n"
                f"Podemos conversar para eu te explicar os detalhes e o raciocínio?"
            ),
            objecoes_previstas=(
                (
                    "Preciso pensar.",
                    "Claro. Para te ajudar a pensar: qual é a sua principal dúvida ou "
                    "preocupação? Posso trazer dados adicionais para essa dúvida específica.",
                ),
            ),
            dados_quantitativos={},
        )
