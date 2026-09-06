"use client";

import { ShieldCheck, Building, ExternalLink, AlertCircle } from "lucide-react";
import type { OperadoraANSItem } from "@/lib/ans";

interface SecaoDadosCadastraisANSProps {
  operadora: OperadoraANSItem | null;
}

function formatarCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function SecaoDadosCadastraisANS({ operadora }: SecaoDadosCadastraisANSProps) {
  if (!operadora) {
    return null;
  }

  return (
    <article className="painel overflow-hidden border border-emerald-200/60 p-6 bg-white shadow-sm">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Building size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Dados Cadastrais ANS (Operadora de Saúde)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                <ShieldCheck size={12} aria-hidden="true" /> Fato Oficial
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Registro Ativo no Cadastro de Operadoras da Agência Nacional de Saúde Suplementar (CADOP)
            </p>
          </div>
        </div>

        {operadora.fonte.url && (
          <a
            href={operadora.fonte.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Base oficial ANS
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Aviso de Governança Obrigatório */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          <strong>Aviso de Governança ANS:</strong> Dados cadastrais oficiais da operadora de planos de saúde.{" "}
          <em>Não constituem prova de vínculo de exclusividade ou operação hospitalar direta</em>, indicando enquadramento regulatório como operadora de saúde suplementar.
        </p>
      </div>

      {/* Grid de Campos Cadastrais (ZERO DADOS PESSOAIS) */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Registro ANS</span>
          <span className="mt-1 block font-mono font-bold text-slate-900">{operadora.registroAns}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">CNPJ da Operadora</span>
          <span className="mt-1 block font-mono font-semibold text-slate-900">{formatarCNPJ(operadora.cnpj)}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Modalidade Regulatória</span>
          <span className="mt-1 block font-semibold text-slate-900">{operadora.modalidade}</span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
          <span className="block text-xs font-medium text-slate-500">Razão Social Registrada</span>
          <span className="mt-1 block font-bold text-slate-900">{operadora.razaoSocial}</span>
        </div>

        {operadora.nomeFantasia && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Nome Fantasia</span>
            <span className="mt-1 block font-semibold text-slate-900">{operadora.nomeFantasia}</span>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Situação Cadastral</span>
          <span className="mt-1 inline-flex items-center gap-1.5 font-bold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            {operadora.situacao}
          </span>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block text-xs font-medium text-slate-500">Sede Administrativa</span>
          <span className="mt-1 block font-medium text-slate-900">
            {operadora.cidade} / {operadora.uf}
          </span>
        </div>

        {operadora.dataRegistroAns && (
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="block text-xs font-medium text-slate-500">Data de Registro na ANS</span>
            <span className="mt-1 block font-medium text-slate-900">
              {new Date(operadora.dataRegistroAns).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <span>Fonte: CADOP / ANS (dados abertos)</span>
        <span>Confiança: Alta (Registro Oficial)</span>
      </div>
    </article>
  );
}
