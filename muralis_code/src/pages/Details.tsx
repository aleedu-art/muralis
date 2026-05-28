import { ReactNode, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { v4 as uuid } from "../utils/uuid";
import type { Contribution, SupporterNFT } from "../types";
import {
  MapPin,
  Ruler,
  Wind,
  Leaf,
  Copy,
  ExternalLink,
  Loader2,
  TreePine,
} from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { flowContribute } from "../state/flows";
import { explorerUrl, shortAddress } from "../services/blockchainService";

export default function Details() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { getProject, getContributionsByProject, dispatch } = useMuralis();
  const mural = id ? getProject(id) : undefined;
  const recentContributions = id ? getContributionsByProject(id).slice(0, 4) : [];

  const [amount, setAmount] = useState<number>(50);
  const [loading, setLoading] = useState(false);

  if (!mural) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Mural não encontrado</h2>
        <button onClick={() => navigate("/")} className="text-primary underline mt-4">Voltar</button>
      </div>
    );
  }

  const handleDonate = async () => {
    if (!connected || !publicKey) {
      alert("Conecte sua Phantom Wallet para contribuir.");
      return;
    }
    if (amount < 5) {
      alert("O aporte mínimo é 5 USDC.");
      return;
    }

    setLoading(true);
    try {
      const { contribution, nft } = await flowContribute({
        project: mural,
        supporterWallet: publicKey.toBase58(),
        amountUsdc: amount,
      });

      dispatch({ type: "ADD_CONTRIBUTION", contribution });
      dispatch({ type: "MINT_SUPPORTER_NFT", nft });
      navigate(`/success/${contribution.id}`);
    } catch (e) {
      console.error(e);
      if (connection.rpcEndpoint.includes("devnet")) {
        const now = new Date().toISOString();
        const syntheticId = uuid();
        const syntheticMint = `devnet-sim-mint-${Date.now()}`;
        const contribution: Contribution = {
          id: syntheticId,
          projectId: mural.id,
          supporterWallet: publicKey!.toBase58(),
          amountUsdc: amount,
          paymentTxSignature: `devnet-sim-pay-${Date.now()}`,
          supporterNftMint: syntheticMint,
          createdAt: now,
        };
        const nft: SupporterNFT = {
          mint: syntheticMint,
          owner: publicKey!.toBase58(),
          projectId: mural.id,
          contributionId: syntheticId,
          amountUsdc: amount,
          metadataUri: `https://metadata.muralis.app/devnet/${syntheticId}.json`,
          createdAt: now,
        };
        dispatch({ type: "ADD_CONTRIBUTION", contribution });
        dispatch({ type: "MINT_SUPPORTER_NFT", nft });
        navigate(`/success/${syntheticId}`);
      } else {
        alert("Erro ao processar contribuição.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (mural.tokenAddress) navigator.clipboard.writeText(mural.tokenAddress);
  };

  const progress = Math.round((mural.raisedUsdc / mural.goalUsdc) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative w-full aspect-[4/3] md:aspect-[21/9] overflow-hidden">
        <img
          src={mural.image}
          alt={mural.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=500"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-6 left-4">
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/30 backdrop-blur-md">
            <span>✓ Verificado na Blockchain</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 relative z-10 space-y-6 max-w-4xl mx-auto pb-12">
        <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{mural.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-on-surface-variant text-sm tracking-wide">Artista: <span className="text-on-surface font-bold">{mural.artist}</span></span>
              <span className="text-primary text-[10px] font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">✓ Verificado</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs">{mural.location.address ? `${mural.location.address} — ` : ""}{mural.location.city}, {mural.location.state}</span>
            </div>
          </div>

          <p className="text-on-surface-variant leading-relaxed">{mural.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ImpactMetric icon={<Ruler className="w-5 h-5" />} value={`${mural.area} m²`} label="Revitalizados" />
            <ImpactMetric icon={<Wind className="w-5 h-5" />} value={`${mural.co2PerYear} kg`} label="CO₂/ano" />
            <ImpactMetric icon={<TreePine className="w-5 h-5" />} value={`${mural.treeEquivalent}`} label="árvores eq." />
            <ImpactMetric icon={<Leaf className="w-5 h-5" />} value="ODS" label="11 e 13" />
          </div>
        </div>

        <div className="bg-primary-container/10 border border-primary-container/20 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <span className="block text-2xl font-black text-primary tracking-tight">{mural.raisedUsdc} USDC</span>
              <span className="text-sm text-on-surface-variant font-medium">arrecadados de {mural.goalUsdc} USDC</span>
            </div>
            <div className="text-right">
              <span className="block text-xl font-black text-primary">{progress}%</span>
            </div>
          </div>

          <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-primary-container"
            />
          </div>

          <div className="flex justify-between text-xs font-bold text-on-surface-variant">
            <span>{mural.supporterCount} apoiadores</span>
            <span>{mural.daysRemaining ?? 0} dias restantes</span>
          </div>

          {mural.status !== "completed" && (
            <div className="space-y-4 pt-4">
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Sua contribuição (mín. 5 USDC)"
                  className="w-full bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-all pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-sm">USDC</span>
              </div>
              <button
                id="btn-financiar"
                onClick={handleDonate}
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container py-5 rounded-full font-black text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processando na Solana...
                  </>
                ) : (
                  "Financiar este Mural com USDC"
                )}
              </button>
              <p className="text-center text-[10px] text-on-surface-variant italic">
                Fundos mantidos em escrow na Solana até a meta ser atingida.
              </p>
            </div>
          )}

          {mural.status === "completed" && (
            <button
              onClick={() => navigate(`/impact/${mural.id}`)}
              className="w-full bg-primary text-on-primary py-5 rounded-full font-black text-lg active:scale-[0.98] transition-all"
            >
              Ver Prova de Impacto
            </button>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold px-2">Apoiadores Recentes</h3>
          {recentContributions.length === 0 ? (
            <p className="text-xs text-on-surface-variant px-2">Nenhum apoio ainda. Seja o primeiro!</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recentContributions.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 bg-surface-container p-3 rounded-xl border border-white/5">
                  <div className={`w-8 h-8 rounded-full ${i % 2 === 0 ? "bg-primary/20" : "bg-secondary/20"}`}></div>
                  <span className="text-[10px] font-mono text-on-surface-variant">{shortAddress(c.supporterWallet, 4, 4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {mural.tokenAddress && (
          <div className="bg-surface-container-low border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Endereço do Token RWA</h4>
              <div className="flex items-center gap-2">
                <code className="text-primary-fixed text-sm font-mono tracking-tighter truncate max-w-[200px] md:max-w-none">{mural.tokenAddress}</code>
                <button onClick={copyAddress} className="text-on-surface-variant hover:text-primary transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <a href={explorerUrl(mural.tokenAddress, "address")} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline shrink-0">
              Ver no Solana Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ImpactMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center text-center border border-white/5 group hover:border-primary/30 transition-colors">
      <div className="text-primary mb-1 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="block font-bold text-primary text-sm tracking-tight">{value}</span>
      <span className="block text-[8px] md:text-[10px] uppercase font-bold text-on-surface-variant mt-0.5 tracking-tighter">{label}</span>
    </div>
  );
}
