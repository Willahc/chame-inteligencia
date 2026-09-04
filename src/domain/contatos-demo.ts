export interface ContatoDemonstracao {
  id: string;
  instituicaoSlug: string;
  grupoDemoId?: string;
  nome: string;
  cargo: string;
  area: string;
  papelComercial: string;
  senioridade: string;
  emailCorporativo: string;
  telefoneProfissional: string;
  indiceQualidade: number;
  justificativaQualidade: string;
}

const nomes = [
  ["Marina Campos", "Rede Saúde Exemplo", "marina.campos@rede-saude-exemplo.example", "(00) 0000-0001"],
  ["Rafael Nogueira", "Rede Saúde Exemplo", "rafael.nogueira@rede-saude-exemplo.example", "(00) 0000-0002"],
  ["Bianca Torres", "Rede Saúde Exemplo", "bianca.torres@rede-saude-exemplo.example", "(00) 0000-0003"],
  ["Eduardo Lima", "Hospital Modelo Sul", "eduardo.lima@hospital-modelo.example", "(00) 0000-0011"],
  ["Camila Rocha", "Hospital Modelo Sul", "camila.rocha@hospital-modelo.example", "(00) 0000-0012"],
  ["João Prado", "Hospital Modelo Sul", "joao.prado@hospital-modelo.example", "(00) 0000-0013"],
  ["Lívia Martins", "Hospital Demonstração Alfa", "livia.martins@hospital-alfa.example", "(00) 0000-0021"],
  ["Gustavo Reis", "Hospital Demonstração Alfa", "gustavo.reis@hospital-alfa.example", "(00) 0000-0022"],
  ["Paula Mendes", "Hospital Demonstração Alfa", "paula.mendes@hospital-alfa.example", "(00) 0000-0023"],
  ["Renata Alves", "Centro Diagnóstico Modelo", "renata.alves@centro-diagnostico.example", "(00) 0000-0031"],
  ["Diego Freitas", "Centro Diagnóstico Modelo", "diego.freitas@centro-diagnostico.example", "(00) 0000-0032"],
  ["Nina Duarte", "Instituto Clínico Demonstração", "nina.duarte@instituto-clinico.example", "(00) 0000-0041"],
  ["Otávio Pires", "Instituto Clínico Demonstração", "otavio.pires@instituto-clinico.example", "(00) 0000-0042"],
  ["Sara Monteiro", "Instituto Clínico Demonstração", "sara.monteiro@instituto-clinico.example", "(00) 0000-0043"],
] as const;

const perfis: Array<Omit<ContatoDemonstracao, "id" | "instituicaoSlug" | "grupoDemoId" | "nome" | "emailCorporativo" | "telefoneProfissional">> = [
  { cargo: "Gerente de Compras", area: "Compras", papelComercial: "COMPRAS", senioridade: "Gerência", indiceQualidade: 88, justificativaQualidade: "Cargo aderente e área explícita; contato e empresa são simulados." },
  { cargo: "Head de Facilities", area: "Facilities", papelComercial: "FACILITIES", senioridade: "Liderança", indiceQualidade: 92, justificativaQualidade: "Área diretamente relacionada à mobilidade; senioridade simulada alta." },
  { cargo: "Coordenadora de Mobilidade", area: "Serviços Corporativos", papelComercial: "MOBILIDADE", senioridade: "Coordenação", indiceQualidade: 84, justificativaQualidade: "Aderência funcional alta; dados de contato são demonstração." },
  { cargo: "Coordenador de Suprimentos", area: "Suprimentos", papelComercial: "COMPRAS", senioridade: "Coordenação", indiceQualidade: 81, justificativaQualidade: "Área de compras confirmada apenas no cenário fictício." },
  { cargo: "Gerente Administrativo", area: "Administração", papelComercial: "ADMINISTRACAO", senioridade: "Gerência", indiceQualidade: 79, justificativaQualidade: "Cargo aderente ao fluxo administrativo simulado." },
  { cargo: "Gerente de Operações", area: "Operações", papelComercial: "OPERACOES", senioridade: "Gerência", indiceQualidade: 86, justificativaQualidade: "Responsabilidade operacional simulada e aderente ao caso." },
  { cargo: "Gerente de RH e Benefícios", area: "RH / Benefícios", papelComercial: "RH", senioridade: "Gerência", indiceQualidade: 76, justificativaQualidade: "Área relacionada ao benefício corporativo; cenário fictício." },
  { cargo: "Coordenador de Serviços Corporativos", area: "Serviços Corporativos", papelComercial: "INFLUENCIADOR", senioridade: "Coordenação", indiceQualidade: 82, justificativaQualidade: "Aderência ao serviço simulada, sem afirmar poder de decisão." },
  { cargo: "Analista Sênior de Compras", area: "Compras", papelComercial: "DECISOR_PROVAVEL", senioridade: "Sênior", indiceQualidade: 73, justificativaQualidade: "Cargo aderente, mas influência decisória permanece provável." },
  { cargo: "Coordenadora Administrativa", area: "Administração", papelComercial: "ADMINISTRACAO", senioridade: "Coordenação", indiceQualidade: 68, justificativaQualidade: "Aderência moderada e dados integralmente simulados." },
  { cargo: "Gerente de Operações Clínicas", area: "Operações", papelComercial: "OPERACOES", senioridade: "Gerência", indiceQualidade: 71, justificativaQualidade: "Área coerente com a operação fictícia da instituição." },
  { cargo: "Coordenador de Suprimentos", area: "Suprimentos", papelComercial: "COMPRAS", senioridade: "Coordenação", indiceQualidade: 65, justificativaQualidade: "Aderência de compras simulada, com cobertura moderada." },
  { cargo: "Gerente Administrativo", area: "Administração", papelComercial: "ADMINISTRACAO", senioridade: "Gerência", indiceQualidade: 62, justificativaQualidade: "Cargo coerente, mas baixa prioridade da conta é demonstrativa." },
  { cargo: "Analista de Benefícios", area: "RH / Benefícios", papelComercial: "RH", senioridade: "Pleno", indiceQualidade: 58, justificativaQualidade: "Área relacionada, com senioridade e qualidade simuladas." },
] as const;

export const CONTATOS_DEMONSTRACAO: ContatoDemonstracao[] = nomes.map(([nome, empresa, emailCorporativo, telefoneProfissional], i) => {
  const perfil = perfis[i];
  const slugs: Record<string, string> = {
    "Rede Saúde Exemplo": "rede-saude-exemplo",
    "Hospital Modelo Sul": "hospital-modelo-sul",
    "Hospital Demonstração Alfa": "hospital-demonstracao-alfa",
    "Centro Diagnóstico Modelo": "centro-diagnostico-modelo",
    "Instituto Clínico Demonstração": "instituto-clinico-demonstracao",
  };
  return { id: `contato-demo-${i + 1}`, instituicaoSlug: slugs[empresa], ...perfil, nome, emailCorporativo, telefoneProfissional, grupoDemoId: empresa === "Rede Saúde Exemplo" || empresa === "Hospital Modelo Sul" ? "grupo-horizonte-demo" : undefined };
});
