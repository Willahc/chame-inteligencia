# Gate 11 — Homologação Real do Mailtrap Sandbox

**Status:** `GATE 11 — AGUARDANDO CREDENCIAL/AUTORIZAÇÃO`  
**Data da Implementação:** 07 de Setembro de 2026  
**Provedor Homologado:** Mailtrap Email Sandbox API (Virtual Sink)  
**Canal:** E-mail Corporativo B2B (`EMAIL`)  
**Ambiente:** `HOMOLOGACAO` (Sandbox Estrito)  
**Limiar Operacional Gate 11:** Máximo de 3 mensagens enviadas  

---

## 1. Contexto e Declaração de Estado

O **Gate 10** homologou formalmente a arquitetura e a seleção de provedor único para testes de integração: a API de Sandbox de E-mail do Mailtrap. A seleção baseou-se no isolamento intrínseco oferecido pelo Mailtrap Sandbox, que atua como um sumidouro virtual (*virtual sink*), retendo as mensagens em uma caixa de entrada de laboratório sem jamais dispará-las para os servidores MX ou caixas postais reais da Internet.

No presente **Gate 11**, o conector foi preparado para a homologação com chamadas de rede reais contra a API do Mailtrap Sandbox, sob rigorosas salvaguardas de isolamento, segurança cibernética e privacidade (LGPD).

### Diagnóstico Inicial de Credenciais
Na auditoria prévia deste Gate, constatou-se que as variáveis de ambiente necessárias para a conexão de rede:
- `MAILTRAP_SANDBOX_API_TOKEN`: **Não configurada** (ausente)
- `MAILTRAP_SANDBOX_INBOX_ID`: **Não configurada** (ausente)

Conforme a regra fundamental de segurança do projeto:
> *"Se qualquer requisito estiver ausente (autorização explícita, token de sandbox, ID do inbox), implemente apenas diagnóstico e validação local. Não tente adivinhar credenciais, não use chaves mocadas para forçar chamada de rede, não crie contas externas e não armazene segredos no repositório. Declare: `GATE 11 — AGUARDANDO CREDENCIAL/AUTORIZAÇÃO`."*

O sistema operou e permanece operando no modo de **diagnóstico e simulação mock local de homologação**, validando 100% dos contratos, travas, limites e fluxos de auditoria, sem quebrar nenhuma dependência e garantindo que **zero e-mails reais foram disparados**.

---

## 2. Critérios de Segurança e Travas Implementadas

Para assegurar que nenhuma comunicação externa indevida ocorra e que nenhum dado real seja exposto, foram estabelecidas 10 camadas de defesa ativas:

1. **Isolamento Canônico de Dados:**
   - Apenas contas marcadas como `DEMONSTRACAO` são autorizadas no conector de homologação.
   - Qualquer tentativa de utilizar uma instituição `FATO_OFICIAL` ou contato `FATO_PUBLICO` é interceptada e bloqueada antes de qualquer processamento.

2. **Restrição Estrita de Domínio de Destinatário (`.example`):**
   - Destinatários devem pertencer obrigatoriamente ao domínio reservado `.example` (RFC 2606 / RFC 6761).
   - E-mails pessoais (`@gmail.com`, `@hotmail.com`, `@outlook.com`, etc.) são expressamente rejeitados.
   - E-mails corporativos reais com TLDs públicos (`.com.br`, `.org`, `.gov.br`, etc.) são bloqueados.

3. **Cota Estrita do Gate 11 (Máximo 3 Disparos):**
   - Para fins de homologação controlada, o limite máximo é de **3 mensagens**.
   - Ao atingir o 3º envio bem-sucedido (seja via sandbox real ou mock local), qualquer requisição subsequente é bloqueada com status `BLOQUEADO`.

4. **Endpoint Fixo e Hardcoded:**
   - O conector utiliza exclusivamente a URL base oficial `https://sandbox.api.mailtrap.io/api/send/${inboxId}`.
   - Nenhuma URL arbitrária do usuário é aceita, prevenindo vulnerabilidades de SSRF (*Server-Side Request Forgery*).

5. **Rate Limiting (Limite de Taxa):**
   - Máximo de 5 requisições por minuto em janela deslizante de 60 segundos.

6. **Disjuntor (Circuit Breaker):**
   - Abre automaticamente após 3 falhas consecutivas (ex: HTTP 401, 403, 500 ou timeouts de rede), bloqueando requisições em cascata.

7. **Timeout Rigoroso de 3.000 ms:**
   - Todas as chamadas usam `AbortController` com timeout de 3 segundos, impedindo travamento de processos em caso de lentidão externa.

8. **Kill-Switch de Emergência:**
   - Bloqueio imediato a nível de processo de qualquer chamada externa via variável de ambiente (`INTEGRACOES_KILL_SWITCH=true`) ou controle manual na interface.

9. **Cancelamento pelo Operador:**
   - Suporte a cancelamento humano preventivo antes do disparo físico da requisição (`status: "CANCELADO"`).

10. **Sanitização Absoluta de Payloads e Logs:**
    - O token de acesso à API e cabeçalhos `Authorization: Bearer` nunca são gravados no banco de dados (`EventoIntegracao`), nunca são retornados na API e nunca são exibidos no frontend.
    - O identificador do inbox é mascarado (ex: `12***34`) tanto no painel quanto nos eventos persistidos.

---

## 3. Diagnóstico e Visualização no Painel Operacional

A interface em `src/components/integracoes-client.tsx` foi aprimorada com a seção dedicada ao **Gate 10 & 11**, exibindo:

- **Banner Permanente de Segurança:**
  > *"Homologação restrita a ambiente sandbox. Nenhum destinatário real será contatado. Destinatários permitidos estritamente sob o domínio reservado `.example` (RFC 2606)."*
- **Status de Conectividade:**
  - `MOCK LOCAL (AGUARDANDO CREDENCIAL)` quando as variáveis de ambiente não estão configuradas;
  - `SANDBOX CONECTADO` quando as variáveis estão devidamente presentes.
- **Diagnóstico Seguro de Credenciais:**
  - Token de Sandbox: *Sim (Configurado)* / *Não (Ausente)* — sem revelar o valor do token.
  - Inbox ID: *Sim (Mascarado: 12\*\*\*34)* / *Não (Ausente)*.
- **Contador de Cota do Gate 11:**
  - Disparos efetuados: `X / 3`.
  - Disparos restantes: `Y disparos permitidos`.
- **Status do Circuit Breaker:** Fechado (Operacional) / Aberto (Bloqueio) com contador de falhas consecutivas.
- **Status do Kill-Switch:** Pronto (Desativado) / Ativo (Bloqueio Total).
- **Taxa Atual:** Requisições no último minuto em relação ao limite de 5 req/min.

---

## 4. Rastreabilidade, Governança e Conformidade com LGPD

1. **Princípio da Minimização e Finalidade:**
   - O Gate 11 trata estritamente dados sintéticos das 5 contas de demonstração e dos 14 contatos de teste.
   - Nenhum CPF, dado pessoal sensível ou contato real é aceito no payload.
2. **Registro Imutável em `EventoIntegracao`:**
   - Todo disparo (ou bloqueio) gera um registro de auditoria completo no banco SQLite canônico, com usuário solicitante, justificativa de negócio, data/hora e resumo técnico sanitizado.
3. **Impossibilidade de Envio Real:**
   - A tabela `AcaoComercialPlanejada` mantém as ações em `APROVADA_PARA_SIMULACAO` ou `SIMULADA`.
   - O schema do banco sequer possui estados `ENVIADA` ou `REALIZADA`, assegurando matematicamente e a nível de banco que nenhum disparo de produção é suportado.

---

## 5. Instruções para Ativação Futura do Sandbox Real

Para habilitar a conexão real ao Mailtrap Sandbox no ambiente local do operador quando autorizado:

1. Obtenha uma conta gratuita no [Mailtrap](https://mailtrap.io/) e acesse o menu **Email Testing > Inboxes**.
2. Copie o **Inbox ID** numérico e o **API Token** da conta.
3. Configure as variáveis em arquivo `.env.local` (nunca versionado no Git):
   ```env
   MAILTRAP_SANDBOX_API_TOKEN="seu_token_aqui"
   MAILTRAP_SANDBOX_INBOX_ID="seu_inbox_id_aqui"
   ```
4. Reinicie o servidor de desenvolvimento (`npm run dev`). O painel transitará automaticamente para `SANDBOX CONECTADO`.
5. Execute até 3 disparos para contas de demonstração com destinatários `.example`. As mensagens serão recebidas exclusivamente na caixa virtual do Mailtrap, sem alcançar qualquer destinatário externo.

---

## 6. Cobertura de Testes Automatizados

A suíte `src/domain/integracoes/mailtrap-sandbox.test.ts` implementa 23 testes automatizados cobrindo exaustivamente todos os requisitos:

| # | Cenário de Teste | Resultado |
|---|-------------------|-----------|
| 1 | Tratamento gracioso de ausência de credenciais (opera em mock) | Aprovado |
| 2 | Não exposição de tokens, segredos ou cabeçalho Authorization | Aprovado |
| 3 | Bloqueio de conexões fora do ambiente HOMOLOGACAO | Aprovado |
| 4 | Imposição de endpoint fixo e hardcoded | Aprovado |
| 5 | Bloqueio de transição para o ambiente PRODUCAO | Aprovado |
| 6 | Bloqueio estrito de contas reais (`FATO_OFICIAL`) | Aprovado |
| 7 | Bloqueio estrito de contatos reais (`FATO_PUBLICO`) | Aprovado |
| 8 | Bloqueio de e-mails com domínios corporativos reais (`.com.br`) | Aprovado |
| 9 | Bloqueio de e-mails pessoais (`@gmail.com`, `@hotmail.com`) | Aprovado |
| 10 | Aceite de e-mails terminados em `.example` para contas DEMO | Aprovado |
| 11 | Bloqueio de qualquer domínio não terminado em `.example` | Aprovado |
| 12 | Bloqueio na 4ª mensagem por estouro da cota do Gate 11 (limite: 3) | Aprovado |
| 13 | Timeout controlado em 3.000 ms com AbortSignal | Aprovado |
| 14 | Tratamento de erro HTTP 401 simulado | Aprovado |
| 15 | Tratamento de erro HTTP 403 simulado | Aprovado |
| 16 | Tratamento de erro HTTP 500 simulado | Aprovado |
| 17 | Abertura de Circuit Breaker após 3 falhas consecutivas | Aprovado |
| 18 | Ativação do Kill-Switch bloqueia operações emergencialmente | Aprovado |
| 19 | Cancelamento prévio pelo operador registra status CANCELADO | Aprovado |
| 20 | Sanitização de payload preserva aviso de sandbox e endpoint | Aprovado |
| 21 | Registro imutável de auditoria em `EventoIntegracao` | Aprovado |
| 22 | Garantia de ausência de status `ENVIADA` ou `REALIZADA` no banco | Aprovado |
| 23 | Diagnóstico completo de sandbox e métricas operacionais | Aprovado |

---

## 7. Declaração Formal de Conclusão

O Gate 11 está tecnicamente implementado, auditado e protegido contra qualquer vazamento ou envio indevido. O status formal declarado é:

```
GATE 11 — AGUARDANDO CREDENCIAL/AUTORIZAÇÃO
```
