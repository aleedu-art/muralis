import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { explorerUrl, shortAddress } from "../services/blockchainService";

export default function Success() {
  const { id } = useParams(); // id = contributionId
  const navigate = useNavigate();
  const { state, getProject } = useMuralis();
  const contribution = state.contributions.find((c) => c.id === id);
  const project = contribution ? getProject(contribution.projectId) : undefined;

  const FALLBACK_IMG = "/placeholder-nft.svg";
  const isDevnetSim = contribution?.paymentTxSignature.startsWith("devnet-sim") ?? false;
  const [imgSrc, setImgSrc] = useState(isDevnetSim ? FALLBACK_IMG : (project?.image ?? FALLBACK_IMG));

  if (!contribution || !project) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Contribuição não encontrada</h2>
        <button onClick={() => navigate("/")} className="text-primary underline mt-4">Voltar</button>
      </div>
    );
  }

  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${3 + Math.random() * 4}s`,
    opacity: 0.3 + Math.random() * 0.7,
    scale: 0.5 + Math.random() * 1.5,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-4 py-12 max-w-2xl mx-auto flex flex-col items-center gap-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none -z-10">
        {particles.map((p) => (
          <div
            key={p.id}
            className="confetti"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity,
              transform: `scale(${p.scale})`,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, stiffness: 100 }}
          className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-4 border-primary/50 shadow-[0_0_30px_rgba(0,200,150,0.4)]"
        >
          <CheckCircle2 className="text-primary w-16 h-16 fill-primary/10" />
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight">Contribuição Confirmada!</h1>
        <p className="text-on-surface-variant max-w-sm mx-auto">Seu apoio foi registrado com sucesso na blockchain da Solana.</p>
      </div>

      <div className="w-full glass-card rounded-2xl p-6 space-y-6">
        <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Resumo da Transação</h2>
        <div className="space-y-4 font-medium text-sm">
          <TransactionRow label="Projeto" value={project.title} />
          <TransactionRow label="Valor contribuído" value={`${contribution.amountUsdc} USDC`} isPrimary />
          <TransactionRow
            label="ID da Transação"
            value={shortAddress(contribution.paymentTxSignature, 4, 4)}
            hasCopy
            copyValue={contribution.paymentTxSignature}
            externalUrl={explorerUrl(contribution.paymentTxSignature, "tx")}
          />
          <TransactionRow
            label="Mint do NFT"
            value={shortAddress(contribution.supporterNftMint, 4, 4)}
            hasCopy
            copyValue={contribution.supporterNftMint}
            externalUrl={explorerUrl(contribution.supporterNftMint, "address")}
          />
          <TransactionRow label="Rede" value="Solana Localhost" />
          <TransactionRow label="Status" value="Confirmado" isSuccess />
        </div>
      </div>

      <div className="w-full gradient-border-green p-6 rounded-2xl flex flex-col items-center gap-6 text-center">
        <div className="relative w-full aspect-square max-w-[280px] rounded-xl overflow-hidden shadow-2xl">
          <img src={imgSrc} alt="NFT Preview" className="w-full h-full object-cover filter saturate-[1.2] contrast-[1.1]" onError={() => setImgSrc(FALLBACK_IMG)} />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-40"></div>
          <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black uppercase text-white border border-white/20">Apoiador NFT</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight">Seu NFT de Apoiador foi mintado!</h3>
          <p className="text-xs text-on-surface-variant px-4">Este token colecionável comprova sua contribuição ambiental para sempre.</p>
        </div>
        <Link to="/wallet" className="w-full py-3 rounded-full border border-primary text-primary font-bold text-sm tracking-wide hover:bg-primary/10 transition-all active:scale-95 text-center">
          Ver NFT na minha carteira
        </Link>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={() => navigate("/")}
          className="w-full bg-primary-container text-on-primary-container py-5 rounded-full font-black text-lg shadow-lg shadow-primary/10 active:scale-[0.98] transition-all"
        >
          Explorar outros Murais
        </button>
      </div>
    </motion.div>
  );
}

interface TransactionRowProps {
  label: string;
  value: string;
  isPrimary?: boolean;
  hasCopy?: boolean;
  copyValue?: string;
  isSuccess?: boolean;
  externalUrl?: string;
}

function TransactionRow({
  label,
  value,
  isPrimary,
  hasCopy,
  copyValue,
  isSuccess,
  externalUrl,
}: TransactionRowProps) {
  const handleCopy = () => {
    if (copyValue) {
      navigator.clipboard.writeText(copyValue);
    }
  };

  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-3">
      <span className="text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline flex items-center gap-1 font-mono font-bold"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span
            className={`font-bold ${
              isPrimary ? "text-primary text-xl" : isSuccess ? "text-primary flex items-center gap-1" : "text-on-surface"
            }`}
          >
            {value}
            {isSuccess && <CheckCircle2 className="w-3 h-3" />}
          </span>
        )}
        {hasCopy && (
          <Copy
            onClick={handleCopy}
            className="w-3.5 h-3.5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors"
          />
        )}
      </div>
    </div>
  );
}