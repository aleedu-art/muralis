import { ReactNode } from "react";
import { motion } from "motion/react";
import { Link, useParams } from "react-router-dom";
import {
  Verified,
  Ruler,
  Wind,
  MapPin,
  ChevronRight,
  TreePine,
} from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { explorerUrl, shortAddress } from "../services/blockchainService";

export default function Impact() {
  const { id } = useParams();
  const { state, getProject, getContributionsByProject } = useMuralis();

  // Se houver :id, mostra a Prova de Impacto desse projeto.
  // Caso contrário, mostra o primeiro projeto concluído (ou o primeiro de tudo).
  const mural = id
    ? getProject(id)
    : state.projects.find((p) => p.status === "completed") ?? state.projects[0];

  if (!mural) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Sem projetos ainda</h2>
      </div>
    );
  }

  const contributions = getContributionsByProject(mural.id);
  const completedAt = mural.completedAt
    ? new Date(mural.completedAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : new Date(mural.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-12">
      {/* Hero Impact Image */}
      <section className="relative w-full aspect-square md:aspect-[16/9] overflow-hidden">
        <img src={mural.image} alt="Finalized Impact" className="w-full h-full object-cover filter brightness-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        <div className="absolute bottom-6 left-6">
          <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-4 py-2 rounded-full border border-primary/30 backdrop-blur-md shadow-2xl">
            <span>✓ Verificado na Blockchain Solana</span>
          </div>
        </div>
      </section>

      <div className="px-4 max-w-4xl mx-auto -mt-6 relative z-10 space-y-8">
        {/* Basic Info */}
        <div className="glass-card rounded-2xl p-6 md:p-8 space-y-4">
          <h1 className="text-3xl font-black tracking-tight">{mural.title}</h1>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-on-surface-variant font-medium capitalize">{completedAt}</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">{mural.artist.slice(0, 2).toUpperCase()}</span>
              </div>
              <span className="font-bold text-on-surface">{mural.artist}</span>
              <span className="text-primary text-[10px] font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">✓ Verificado</span>
            </div>
          </div>
        </div>

        {/* Impact Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ImpactCard icon={<Ruler className="text-primary w-5 h-5" />} value={`${mural.area} m²`} label="Área revitalizada" />
          <ImpactCard icon={<Wind className="text-primary w-5 h-5" />} value={`${mural.co2PerYear} kg`} label="CO₂ absorvido/ano" />
          <ImpactCard icon={<TreePine className="text-primary w-5 h-5" />} value={`${mural.treeEquivalent}`} label="Árvores equivalentes" />
          <ImpactCard icon={<MapPin className="text-primary w-5 h-5" />} value={`${mural.location.state}, BR`} label="Impacto local" />
        </div>

        {/* On-Chain Data */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Dados On-Chain</h2>
          <div className="bg-surface-container-low border border-white/5 rounded-2xl p-6 font-mono text-xs space-y-4">
            <DataRow
              label="Token RWA"
              value={mural.tokenAddress ? shortAddress(mural.tokenAddress, 4, 4) : "—"}
              isPrimary
              externalUrl={mural.tokenAddress ? explorerUrl(mural.tokenAddress, "address") : undefined}
            />
            <DataRow label="Mintagem" value={new Date(mural.createdAt).toLocaleDateString("pt-BR")} />
            <DataRow label="Padrão" value="Metaplex RWA" />
            <DataRow label="Rede" value="Solana Localhost" isLive />
            <DataRow label="ODS" value={mural.ods.join(", ")} />
          </div>
        </div>

        {/* Top Supporters */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Apoiadores Principais</h2>
            <Link to={`/mural/${mural.id}`} className="text-[10px] font-bold text-primary flex items-center gap-1">
              Ver mural <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {contributions.length === 0 ? (
            <p className="text-center text-xs text-on-surface-variant py-4">Sem contribuições ainda neste projeto.</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {contributions.slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full border-2 ${i % 2 === 0 ? "border-primary/30 bg-primary/10" : "border-secondary/30 bg-secondary/10"} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-primary">{c.amountUsdc}</span>
                  </div>
                  <span className="text-[8px] font-mono text-on-surface-variant">{shortAddress(c.supporterWallet)}</span>
                </div>
              ))}
              {contributions.length > 5 && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest border-2 border-white/5 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">+{contributions.length - 5}</span>
                  </div>
                  <span className="text-[8px] font-mono text-on-surface-variant">Ver mais</span>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-on-surface-variant text-sm mt-4">
            <span className="text-primary font-bold">{mural.supporterCount} pessoas</span> tornaram isso possível
          </p>
        </div>

        {/* CTA */}
        <Link
          id="btn-financiar-next"
          to="/"
          className="block w-full bg-primary py-5 rounded-full text-on-primary font-black text-lg text-center shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Quero financiar o próximo mural!
        </Link>
      </div>

      <div className="mt-12 py-8 flex flex-col items-center gap-4 text-center px-4">
        <p className="text-xs font-medium text-on-surface-variant">Construído na Solana · Alinhado com ODS 11 e 13</p>
        <Verified className="text-primary w-6 h-6 mt-2" />
      </div>
    </motion.div>
  );
}

function ImpactCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card p-4 rounded-xl flex flex-col items-center text-center gap-2">
      <div className="mb-1">{icon}</div>
      <span className="font-black text-primary text-sm tracking-tight">{value}</span>
      <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter leading-tight">{label}</span>
    </div>
  );
}

function DataRow({
  label,
  value,
  isPrimary,
  isLive,
  externalUrl,
}: {
  label: string;
  value: string;
  isPrimary?: boolean;
  isLive?: boolean;
  externalUrl?: string;
}) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        {isLive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline flex items-center gap-1 font-mono font-bold"
          >
            {value}
          </a>
        ) : (
          <span className={isPrimary ? "text-primary font-bold" : "text-on-surface"}>{value}</span>
        )}
      </div>
    </div>
  );
}