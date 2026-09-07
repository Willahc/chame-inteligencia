import { z } from "zod";
import type { CandidatoResponsavel } from "./tipos";

// Cargos e áreas estritamente clínicas que NÃO representam compradores corporativos
const TERMOS_CLINICOS_PROIBIDOS = [
  "médico",
  "médica",
  "enfermeiro",
  "enfermeira",
  "cirurgião",
  "cirurgiã",
  "fisioterapeuta",
  "psicólogo",
  "psicóloga",
  "nutricionista",
  "anestesista",
  "terapeuta",
  "fonoaudiólogo",
  "fonoaudióloga",
  "biomédico",
  "biomédica",
  "farmacêutico clínico",
];

// Termos aceitáveis de compras, facilities, mobilidade e administração corporativa
const TERMOS_COMPRAS_ADMIN = [
  "compra",
  "suprimento",
  "licita",
  "contrato",
  "facili",
  "operaç",
  "operac",
  "logística",
  "logistica",
  "transporte",
  "mobilidade",
  "frota",
  "administra",
  "financeir",
  "diretor",
  "gerente",
  "coordenador",
  "supervisor",
  "pregoeiro",
  "sourcing",
  "procurement",
];

// Nomes genéricos que indicam fabricação ou ausência de indivíduo
const NOMES_GENERICOS = [
  "responsável",
  "compras",
  "departamento",
  "contato comercial",
  "diretoria",
  "administração",
  "hospital",
  "clínica",
  "setor de compras",
  "suprimentos",
];

const regexCPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const regexEmailPessoal = /@(gmail|hotmail|outlook|yahoo|uol|bol|terra|icloud|live)\./i;

export const candidatoResponsavelSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome profissional é obrigatório"),
    cargo: z.string().trim().min(2, "Cargo com evidência é obrigatório"),
    area: z.string().trim().optional(),
    empresa: z.string().trim().min(2, "Empresa é obrigatória"),
    urlPublica: z.string().url("URL pública verificável é obrigatória"),
    emailCorporativo: z.string().email("Formato de e-mail inválido").optional(),
    telefoneProfissional: z.string().trim().min(3).optional(),
    telefoneDepartamental: z.string().trim().min(3).optional(),
    ramal: z.string().trim().optional(),
    fonteNome: z.string().trim().min(2, "Nome da fonte é obrigatório"),
    fonteUrl: z.string().url("URL da fonte é obrigatória"),
    dataEvidencia: z.string().min(10, "Data da evidência é obrigatória"),
    confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]),
    papelComercial: z.string().trim().min(2, "Papel comercial é obrigatório"),
    tipoPapelComercial: z.enum([
      "FATO_OFICIAL",
      "FATO_PUBLICO",
      "INFERENCIA",
      "HIPOTESE",
      "DEMONSTRACAO",
      "DADO_TERCEIRO_NAO_CANONICO",
    ]),
    tipoDado: z.enum([
      "FATO_OFICIAL",
      "FATO_PUBLICO",
      "INFERENCIA",
      "HIPOTESE",
      "DEMONSTRACAO",
      "DADO_TERCEIRO_NAO_CANONICO",
    ]),
    escopoContato: z.enum(["ORGANIZACAO", "INSTITUICAO"]),
    statusRevisao: z.enum(["APROVADA", "PENDENTE", "REJEITADA"]),
    justificativa: z.string().trim().min(5, "Justificativa é obrigatória"),
    ativo: z.boolean(),
    linkedinSimulado: z.boolean(),
  })
  .superRefine((dados, ctx) => {
    // 1. Proibição de CPF
    if (
      regexCPF.test(dados.nome) ||
      (dados.cargo && regexCPF.test(dados.cargo)) ||
      (dados.justificativa && regexCPF.test(dados.justificativa))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nome"],
        message: "Violação de privacidade: CPF detectado no registro.",
      });
    }

    // 2. Proibição de e-mail pessoal / provedor genérico
    if (dados.emailCorporativo && regexEmailPessoal.test(dados.emailCorporativo)) {
      ctx.addIssue({
        code: "custom",
        path: ["emailCorporativo"],
        message: "E-mail pessoal não permitido; apenas e-mail corporativo publicado é aceito.",
      });
    }

    // 3. Proibição de nomes genéricos / fabricação
    const nomeNorm = dados.nome.toLowerCase();
    if (NOMES_GENERICOS.some((gen) => nomeNorm === gen || nomeNorm.startsWith(gen))) {
      ctx.addIssue({
        code: "custom",
        path: ["nome"],
        message: "Nome genérico ou departamental não representa um profissional individual.",
      });
    }

    // 4. Proibição de transformação de área clínica pura em decisor de compras
    const cargoNorm = dados.cargo.toLowerCase();
    const areaNorm = (dados.area ?? "").toLowerCase();
    const ehClinico = TERMOS_CLINICOS_PROIBIDOS.some(
      (term) => cargoNorm.includes(term) || areaNorm.includes(term)
    );
    const temAtribuicaoCompras = TERMOS_COMPRAS_ADMIN.some(
      (term) => cargoNorm.includes(term) || areaNorm.includes(term)
    );

    if (ehClinico && !temAtribuicaoCompras) {
      ctx.addIssue({
        code: "custom",
        path: ["cargo"],
        message:
          "Regra de não-fabricação: profissionais estritamente clínicos não podem ser inferidos como responsáveis por compras corporativas.",
      });
    }

    // 5. O papel comercial deve ser INFERENCIA_COMERCIAL, salvo em fontes oficiais diretas
    if (
      dados.tipoDado !== "DEMONSTRACAO" &&
      dados.tipoPapelComercial !== "INFERENCIA" &&
      dados.tipoPapelComercial !== "FATO_OFICIAL"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tipoPapelComercial"],
        message: "O papel comercial deve ser classificado como INFERENCIA_COMERCIAL.",
      });
    }
  });

export function validarConfirmacaoUsuario(confirmacao: boolean): void {
  if (!confirmacao) {
    throw new Error(
      "Operação recusada: a busca supervisionada de responsáveis exige confirmação explícita do usuário."
    );
  }
}

export function validarCandidatoNaoFabricado(candidato: unknown) {
  return candidatoResponsavelSchema.safeParse(candidato);
}

export function gerarChaveDeduplicacao(
  candidato: Pick<CandidatoResponsavel, "nome" | "empresa" | "urlPublica">
): string {
  const nomeNorm = candidato.nome.trim().toLowerCase();
  const empresaNorm = candidato.empresa.trim().toLowerCase();
  const urlNorm = candidato.urlPublica.trim().toLowerCase();
  return `${nomeNorm}|${empresaNorm}|${urlNorm}`;
}
