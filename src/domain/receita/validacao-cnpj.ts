export function desformatarCNPJ(cnpj: string): string {
  if (!cnpj) return "";
  return cnpj.replace(/\D/g, "");
}

export function formatarCNPJ(cnpj: string): string {
  const limpo = desformatarCNPJ(cnpj);
  if (limpo.length !== 14) return cnpj;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
}

export function extrairCnpjBasico(cnpj: string): string {
  const limpo = desformatarCNPJ(cnpj);
  return limpo.slice(0, 8);
}

export function validarCnpjBasico(cnpjBasico: string): boolean {
  const limpo = desformatarCNPJ(cnpjBasico);
  return limpo.length === 8;
}

export function validarCNPJ(cnpj: string): boolean {
  const limpo = desformatarCNPJ(cnpj);

  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  const pesosD1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosD2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let somaD1 = 0;
  for (let i = 0; i < 12; i++) {
    somaD1 += parseInt(limpo[i], 10) * pesosD1[i];
  }
  const restoD1 = somaD1 % 11;
  const digito1 = restoD1 < 2 ? 0 : 11 - restoD1;

  if (parseInt(limpo[12], 10) !== digito1) return false;

  let somaD2 = 0;
  for (let i = 0; i < 13; i++) {
    somaD2 += parseInt(limpo[i], 10) * pesosD2[i];
  }
  const restoD2 = somaD2 % 11;
  const digito2 = restoD2 < 2 ? 0 : 11 - restoD2;

  return parseInt(limpo[13], 10) === digito2;
}
