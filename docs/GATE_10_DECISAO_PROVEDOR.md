# Decisão Técnica de Provedor para Homologação — Gate 10

> **Status:** DECISÃO ARQUITETURAL HOMOLOGADA  
> **Data:** 07 de setembro de 2026  
> **Repositório:** `chame-inteligencia`  
> **Categoria Selecionada:** E-mail Corporativo B2B (Provedor Transacional com Sandbox Dedicado)  
> **Provedor Escolhido:** **Mailtrap Email Sandbox API** (Ambiente Estrito de Teste em *Virtual Sink*)

---

## 1. Avaliação Técnica das Quatro Categorias

Em conformidade com as diretrizes do **Gate 10**, realizou-se uma avaliação técnica criteriosa entre as quatro categorias de conectores desacoplados projetadas no Gate 9:

| Critério Técnico | CRM Comercial B2B | E-mail Corporativo B2B | WhatsApp Corporativo B2B | Discador / PABX B2B |
| :--- | :--- | :--- | :--- | :--- |
| **Ambiente Sandbox Oficial** | Parcial (Exige conta de desenvolvedor multi-tenant). | **Excelente** (Caixa postal virtual isolada / *Sink* garantido). | Complexo (Exige WABA de teste e números autorizados na Meta). | Simulado (Credenciais de teste sem áudio real). |
| **Risco de Envio Acidental Externo** | Médio (Pode disparar webhooks ou notificações a terceiros). | **Nulo** (*Mail trap* retém 100% das mensagens em sandbox). | Alto (Risco de disparo para números reais se mal configurado). | Médio (Tentativa de conexão com tronco SIP). |
| **Aderência aos Dados Canônicos** | Média (Demanda schemas complexos de *Deal* e *Pipeline*). | **Máxima** (Contatos demo possuem e-mails `.example` válidos). | Média (Apenas telefones fictícios `(00)` nos contatos demo). | Média (Telefonia restrita a fluxo humano de SDR). |
| **Autenticação Segura** | OAuth 2.0 / API Key. | **Token Bearer com escopo exclusivo de Sandbox**. | Meta Graph API Token (vida curta, complexa renovação). | API Key / SIP Secret. |
| **Conformidade LGPD & Minimização** | Exige enriquecimento de empresa e contatos. | **Dados estritamente mínimos** (nome corporativo, e-mail demo, mensagem). | Exige metadados telefônicos e opt-in documentado. | Exige consentimento e regulação Anatel. |
| **Circuit Breaker & Rate Limiting** | Suportado. | **Suportado com limites precisos por minuto/dia**. | Suportado pela API da Meta. | Dependente de infraestrutura de telefonia. |
| **Rollback & Kill-Switch** | Imediato. | **Imediato** (reversão em tempo zero para simulador local). | Imediato. | Imediato. |

---

## 2. Provedor Escolhido: Mailtrap Email Sandbox API

O provedor homologado para o Gate 10 é o **Mailtrap Email Sandbox API**, pelas seguintes razões técnicas e normativas:

1. **Garantia Física de Não Envio (*Virtual Sink*):**
   O Mailtrap opera como uma "armadilha de e-mail". As mensagens enviadas para a API de Sandbox são capturadas e inspecionadas em uma caixa de entrada virtual privada, sendo **tecnicamente impossível** qualquer mensagem escapar para provedores reais (Gmail, Outlook, servidores corporativos).
2. **Documentação Oficial e API REST Estável:**
   Possui endpoint oficial documentado (`https://sandbox.api.mailtrap.io/api/send/{inbox_id}`) compatível com requisições HTTP REST padronizadas em formato JSON.
3. **Autenticação Segura por Token com Escopo de Sandbox:**
   Autenticação via header `Api-Token: <token_sandbox>`, permitindo chaves com escopo estritamente restrito a uma única caixa de teste, sem permissões de envio em produção.
4. **Isolamento de Dados:**
   Cada teste é indexado por um `inbox_id` dedicado, sem compartilhamento com nenhuma base de clientes ou servidores externos.
5. **Auditoria e Logs Transparentes:**
   A API retorna identificadores únicos de transação, código de entrega, status de retenção e métricas de tempo de resposta.
6. **Limites de Uso e Proteção contra Sobrecarga:**
   Possui limites nativos de taxa por minuto e cota mensal de mensagens de teste.
7. **Cancelamento e Idempotência:**
   Permite controle total do ciclo de vida da requisição pelo cliente, facilitando o acionamento de *Circuit Breaker* e cancelamentos manuais pelo operador.
8. **Compatibilidade Plena com os Dados Canônicos:**
   Nenhum dado pessoal sensível (como CPF, endereços particulares ou dados de saúde) é transmitido. O payload trafega exclusivamente o endereço institucional fictício de demonstração (ex: `marina.campos@rede-saude-exemplo.example`).
9. **Possibilidade de Rollback e Kill-Switch Imediatos:**
   A qualquer momento, o operador ou sistema pode ativar a chave mestra `INTEGRACOES_KILL_SWITCH=true`, revertendo todo o fluxo para a simulação local in-memory sem causar indisponibilidade ou falhas na aplicação.

---

## 3. Justificativa de Exclusão dos Demais Provedores no Gate 10

- **CRM Comercial:** O mapeamento completo de pipelines e estágios comerciais depende de alinhamento com a diretoria comercial sobre qual CRM será adotado oficialmente pela Chame Táxi. Homologar um CRM específico agora geraria retrabalho caso a escolha corporativa seja diferente.
- **WhatsApp Oficial:** A WhatsApp Cloud API da Meta exige aprovação de conta de negócios (*Meta Business Manager*), registro de linha telefônica e pré-aprovação de *templates* pela Meta. O processo burocrático e o risco inerente tornam essa categoria inadequada para o primeiro ciclo de homologação técnica.
- **Discador Telefônico:** A telefonia corporativa depende de infraestrutura de telecomunicações (SIP Trunking / E1 / WebRTC) e operadores de SDR ativos, extrapolando o escopo de homologação controlada automatizada.

---

## 4. Diretriz Operacional de Execução

- **Condição de Rede Real:** Caso o usuário forneça a credencial de sandbox (`MAILTRAP_SANDBOX_API_TOKEN` e `MAILTRAP_SANDBOX_INBOX_ID`), a chamada poderá ser efetuada ao endpoint de teste do Mailtrap, comprovando o isolamento do *sink*.
- **Condição sem Credencial de Rede (Padrão Atual):** Na ausência de chave de sandbox ativa informada pelo operador, o conector opera em modo **Mock Local de Homologação**, validando 100% da arquitetura, contratos, travas de segurança, circuit breaker e kill-switch, sem efetuar chamadas de rede externas e sem contornar qualquer mecanismo de proteção.

---

## 5. Declaração Formal

A categoria **E-mail Corporativo B2B (Mailtrap Email Sandbox API)** é a única homologada para o Gate 10. As demais categorias (CRM, WhatsApp e Discador) permanecem estritamente no modo `SIMULACAO` local estabelecido no Gate 9.
