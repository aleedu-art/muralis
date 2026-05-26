import { type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { User, Palette, Heart, TreePine } from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { shortAddress } from "../services/blockchainService";

export default function Profile() {
  const { publicKey, connected } = useWallet();
  const { getProjectsByArtist, getUserSummary, state } = useMuralis();

  if (!connected || !publicKey) {
    return (
      <div className="px-4 py-12 max-w-2xl mx-auto">
        <div className="bg-surface-container rounded-3xl p-12 text-center flex flex-col items-center gap-6 border border-white/5">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center border border-primary/20">
            <User className="text-primary/40 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Conecte sua carteira</h2>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
              Seu perfil mostra os projetos que você criou como artista e os murais que apoiou.
            </p>
          </div>
          <WalletMultiButton className="!bg-primary !text-on-primary !rounded-full !font-black !h-auto !py-4 !px-8" />
        </div>
      </div>
    );
  }

  const wallet = publicKey.toBase58();
  const myProjects = getProjectsByArtist(wallet);
  const summary = getUserSummary(wallet);
  const myContribProjects = state.projects.filter((p) =>
    state.contributions.some((c) => c.supporterWallet === wallet && c.projectId === p.id)
  );

  const totalArvores = myContribProjects.reduce((acc, p) => acc + p.treeEquivalent, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meu Perfil</h1>
          <p className="text-xs font-mono text-on-surface-variant">{shortAddress(wallet, 8, 8)}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Palette className="w-5 h-5" />} value={myProjects.length.toString()} label="Projetos criados" />
        <StatTile icon={<Heart className="w-5 h-5" />} value={summary.totalContributedUsdc.toString()} label="USDC apoiados" />
        <StatTile icon={<TreePine className="w-5 h-5" />} value={totalArvores.toString()} label="Árvores eq." />
      </div>

      {/* Meus Projetos (como artista) */}
      <section>
        <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">Meus Projetos</h2>
        {myProjects.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-8 text-center">
            <p className="text-sm text-on-surface-variant mb-4">Você ainda não cadastrou nenhum mural.</p>
            <Link to="/register" className="inline-block bg-primary-container text-on-primary-container font-bold py-3 px-6 rounded-full text-sm">
              Cadastrar primeiro projeto
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myProjects.map((p) => (
              <Link key={p.id} to={`/mural/${p.id}`} className="flex items-center gap-4 bg-surface-container rounded-2xl p-3 border border-white/5 hover:border-primary/40 transition-all">
                <img src={p.image} alt={p.title} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{p.title}</p>
                  <p className="text-[10px] text-on-surface-variant">{p.raisedUsdc}/{p.goalUsdc} USDC · {p.supporterCount} apoiadores</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.status === "completed" ? "bg-primary text-on-primary" : "bg-primary/10 text-primary border border-primary/30"}`}>
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Projetos que apoiei */}
      <section>
        <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">Murais que Apoiei</h2>
        {myContribProjects.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-8 text-center">
            <p className="text-sm text-on-surface-variant mb-4">Você ainda não apoiou nenhum projeto.</p>
            <Link to="/" className="inline-block bg-primary text-on-primary font-bold py-3 px-6 rounded-full text-sm">
              Explorar murais
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myContribProjects.map((p) => (
              <Link key={p.id} to={`/mural/${p.id}`} className="flex items-center gap-4 bg-surface-container rounded-2xl p-3 border border-white/5 hover:border-primary/40 transition-all">
                <img src={p.image} alt={p.title} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{p.title}</p>
                  <p className="text-[10px] text-on-surface-variant">{p.location.city}, {p.location.state}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                  ✓ apoiei
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center gap-1">
      <div className="text-primary mb-1">{icon}</div>
      <span className="font-black text-primary tracking-tight">{value}</span>
      <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter">{label}</span>
    </div>
  );
}
