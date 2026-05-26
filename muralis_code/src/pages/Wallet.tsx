import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Wallet, Copy, ExternalLink, LogOut, RefreshCw, Award, Droplets, CheckCircle, AlertCircle } from "lucide-react";
import { flowDevFaucet } from "../state/flows";
import { useMuralis } from "../state/MuralisContext";
import { explorerUrl, shortAddress } from "../services/blockchainService";

export default function WalletPage() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const { getSupporterNftsByWallet, getContributionsByWallet, getProject } = useMuralis();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [faucetState, setFaucetState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [faucetError, setFaucetError] = useState<string | null>(null);

  const isDevnet = connection.rpcEndpoint.includes("devnet");

  const walletAddr = publicKey?.toBase58();
  const nfts = walletAddr ? getSupporterNftsByWallet(walletAddr) : [];
  const contribs = walletAddr ? getContributionsByWallet(walletAddr) : [];

  useEffect(() => {
    if (publicKey && connected) {
      fetchBalance();
    } else {
      setBalance(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connected]);

  const fetchBalance = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (publicKey) navigator.clipboard.writeText(publicKey.toBase58());
  };

  const handleDevFaucet = async () => {
    setFaucetState("loading");
    setFaucetError(null);
    try {
      await flowDevFaucet();
      setFaucetState("success");
      await fetchBalance();
    } catch (e) {
      setFaucetError(e instanceof Error ? e.message : "Erro no faucet");
      setFaucetState("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-8 max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <Wallet className="text-primary w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Sua Carteira</h1>
      </div>

      {!connected ? (
        <div className="bg-surface-container rounded-3xl p-12 text-center flex flex-col items-center gap-6 border border-white/5 shadow-2xl">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center border border-primary/20">
            <Wallet className="text-primary/40 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Conecte sua Phantom Wallet</h2>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
              Para financiar murais e gerenciar seus NFTs de impacto, você precisa conectar uma conta Solana.
            </p>
          </div>
          <div className="wallet-button-container">
            <WalletMultiButton className="!bg-primary !text-on-primary !rounded-full !font-black !h-auto !py-4 !px-8 hover:!brightness-110 transition-all shadow-lg shadow-primary/20" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Balance Card */}
          <div className="bg-primary-container text-on-primary-container rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-primary/10">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Wallet className="w-32 h-32 rotate-12" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest opacity-70">Saldo Disponível</span>
                <button onClick={fetchBalance} className={`p-2 hover:bg-white/10 rounded-full transition-all ${loading ? "animate-spin" : ""}`}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter">{balance !== null ? balance.toFixed(4) : "---"}</span>
                <span className="text-xl font-bold opacity-70">SOL</span>
              </div>
              <div className="pt-4 flex items-center gap-2">
                <div className="bg-on-primary/10 px-3 py-1.5 rounded-full border border-on-primary/20 flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-wider tabular-nums font-bold">
                    {shortAddress(publicKey?.toBase58() ?? "", 6, 6)}
                  </span>
                  <button onClick={copyAddress} className="hover:text-primary transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Rede" value="Localhost" live />
            <StatCard label="Apoios" value={contribs.length.toString()} />
            <StatCard label="NFTs" value={nfts.length.toString()} />
          </div>

          {/* Supporter NFTs */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider px-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> Meus Certificados de Apoiador
            </h2>
            {nfts.length === 0 ? (
              <div className="bg-surface-container rounded-2xl p-8 text-center text-on-surface-variant">
                <p className="text-sm">Você ainda não apoiou nenhum projeto.</p>
                <Link to="/" className="inline-block mt-3 text-primary font-bold text-sm hover:underline">
                  Explorar murais →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nfts.map((nft) => {
                  const project = getProject(nft.projectId);
                  return (
                    <a
                      key={nft.mint}
                      href={explorerUrl(nft.mint, "address")}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-surface-container rounded-2xl overflow-hidden border border-white/5 hover:border-primary/40 transition-all flex"
                    >
                      <div className="w-24 h-24 shrink-0">
                        {project && <img src={project.image} alt={project.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="p-3 flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{project?.title ?? nft.projectId}</p>
                        <p className="text-[10px] text-on-surface-variant">{nft.amountUsdc} USDC</p>
                        <p className="text-[10px] font-mono text-primary mt-2 truncate">{shortAddress(nft.mint, 6, 6)}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dev Faucet */}
          {isDevnet && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/10 p-2 rounded-lg">
                    <Droplets className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Dev Faucet</span>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                        devnet
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      2 SOL via airdrop automático · USDC via faucet da Circle
                    </p>
                  </div>
                </div>
              </div>

              {faucetState === "success" && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-xl px-3 py-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>2 SOL creditados! Para USDC, use o faucet da Circle abaixo.</span>
                </div>
              )}
              {faucetState === "error" && faucetError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{faucetError}</span>
                </div>
              )}

              <button
                onClick={handleDevFaucet}
                disabled={faucetState === "loading"}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 font-bold text-sm py-3 px-4 rounded-xl border border-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {faucetState === "loading" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Solicitando airdrop…
                  </>
                ) : (
                  <>
                    <Droplets className="w-4 h-4" />
                    Solicitar 2 SOL (airdrop Devnet)
                  </>
                )}
              </button>

              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-on-surface-variant font-semibold text-sm py-3 px-4 rounded-xl border border-white/10 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Obter USDC de teste no faucet da Circle
              </a>
            </div>
          )}

          {/* Links */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-white/5">
            <a
              href={explorerUrl(publicKey?.toBase58() ?? "", "address")}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-5 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-on-surface-variant" />
                <span className="font-bold">Ver no Explorer</span>
              </div>
              <RefreshCw className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
            </a>
            <button
              onClick={disconnect}
              className="flex items-center justify-between w-full p-5 hover:bg-error/10 text-error transition-all group"
            >
              <div className="flex items-center gap-3 text-red-400">
                <LogOut className="w-5 h-5" />
                <span className="font-bold">Desconectar Carteira</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4">
        <div className="bg-primary/10 p-2 rounded-lg shrink-0 h-fit">
          <RefreshCw className="text-primary w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm">Segurança da Blockchain</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Seus fundos e NFTs são mantidos de forma não-custodial. A Muralis nunca tem acesso à sua chave privada.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-white/5 space-y-1 relative overflow-hidden">
      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        {live && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        <span className="font-bold text-base">{value}</span>
      </div>
    </div>
  );
}