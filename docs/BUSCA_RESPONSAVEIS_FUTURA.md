# Especificação de Preparação Futura — Busca de Responsáveis

Data: 06/09/2026  
Status: Planejado para Gate Futuro (Desativado no MVP Comercial)

---

## 1. Objetivo do Recurso Futuro

Permitir que a equipe comercial da Chame Táxi solicite pesquisa supervisionada de contatos profissionais públicos (área de Facilities, Compras, Suprimentos e Operações) para contas qualificadas que ainda não possuem interlocutores mapeados no radar.

No MVP atual, a interface exibe o botão **"Buscar responsáveis (Planejado — Gate Futuro)"** em estado explicitamente desativado, acompanhado de sua especificação de fluxo e salvaguardas de governança.

---

## 2. Fluxo Arquitetural Planejado (Human-in-the-Loop)

```text
[SOLICITADO]
     ↓
[PESQUISANDO] (consulta somente fontes públicas corporativas)
     ↓
[CANDIDATOS_ENCONTRADOS] (em quarentena)
     ↓
[REVISAO_HUMANA] (analista comercial valida cargo, empresa e URL)
     ↓
[PERSISTIDO] (armazenamento na base oficial como FATO_PUBLICO)
```

1. **`SOLICITADO`**: Operador clica em solicitar prospecção de decisores para uma conta específica.
2. **`PESQUISANDO`**: Agente especializado consulta fontes públicas profissionais (LinkedIn corporativo público, páginas institucionais de governança, diários oficiais ou editais de compras).
3. **`CANDIDATOS_ENCONTRADOS`**: Dados ficam retidos em estrutura transitória (quarentena), sem exibição no radar principal.
4. **`REVISAO_HUMANA`**: O analista revisa individualmente cada registro:
   - Valida se o cargo é corporativo e compatível com a contratação de transporte;
   - Valida a URL de evidência pública;
   - Aprova ou descarta o candidato.
5. **`PERSISTIDO`**: Apenas os registros aprovados tornam-se ativos, recebendo `tipoDado = FATO_PUBLICO` e `tipoPapelComercial = INFERENCIA`.

---

## 3. Salvaguardas Éticas, Legais e Técnicas Inegociáveis

O futuro agente estará estritamente proibido de:
- **Disparo de mensagens**: Não poderá enviar e-mails, SMS, mensagens de WhatsApp ou qualquer forma de abordagem direta ao interlocutor;
- **WhatsApp e discadores**: Proibida qualquer integração com ferramentas ativas de discagem ou mensageria;
- **Campanhas automatizadas**: Proibida a inclusão automática em fluxos de nutrição sem autorização humana expressa;
- **Dados pessoais**: Proibido tratar, registrar ou buscar CPF, telefone celular pessoal, endereço residencial ou e-mails privados (ex.: @gmail, @hotmail);
- **Fontes clandestinas**: Proibido recorrer a vazamentos de dados, bases ilícitas, scraping autenticado ou quebra de CAPTCHA;
- **Descarte de revisão**: Nenhum contato poderá ser promovido a `FATO_PUBLICO` sem assinatura/aprovação de um operador humano identificado.
