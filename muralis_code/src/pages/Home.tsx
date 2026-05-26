import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { MapPin, Ruler, Wind, Leaf, TreePine } from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { TREES_PER_SQUARE_METER } from "../types";

export default function Home() {
  const { state } = useMuralis();
  const projects = state.projects;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hero-gradient"
    >
      <section className="px-4 pt-12 pb-8 max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Tokenize Arte Urbana.<br />
          <span className="text-primary">Gere Impacto Real.</span>
        </h1>
        <p className="text-lg text-on-surface-variant mb-8 max-w-lg">
          Financie murais sustentáveis na Solana e acompanhe seu impacto ambiental registrado na blockchain.
        </p>

        <div className="flex flex-wrap gap-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Leaf className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm">Compromisso Verde</p>
              <p className="text-xs text-on-surface-variant">Cada mural neutraliza emissões locais de carbono.</p>
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <TreePine className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm">1 m² ≈ {TREES_PER_SQUARE_METER} árvores</p>
              <p className="text-xs text-on-surface-variant">Tinta fotocatalítica absorve CO₂ ininterruptamente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Murais em Aberto</h2>
          <Link to="/map" className="text-xs font-bold text-primary hover:underline">Ver no mapa →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((mural) => {
            const progress = Math.round((mural.raisedUsdc / mural.goalUsdc) * 100);
            const isComplete = mural.status === "completed";
            return (
              <motion.div
                key={mural.id}
                whileHover={{ y: -4 }}
                className="bg-surface-container rounded-2xl overflow-hidden border border-white/10 group h-full flex flex-col"
              >
                <Link to={`/mural/${mural.id}`} className="relative h-56 w-full block overflow-hidden">
                  <img src={mural.image} alt={mural.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                    <MapPin className="text-primary w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{mural.location.city}, {mural.location.state}</span>
                  </div>
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  <Link to={`/mural/${mural.id}`}>
                    <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{mural.title}</h3>
                    <p className="text-sm text-on-surface-variant mb-4">por {mural.artist}</p>
                  </Link>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Ruler className="w-4 h-4" />
                      <span className="text-xs font-bold">{mural.area} m²</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Wind className="w-4 h-4" />
                      <span className="text-xs font-bold">{mural.co2PerYear} kg/ano</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      <TreePine className="w-4 h-4" />
                      <span className="text-xs font-bold">≈ {mural.treeEquivalent} 🌳</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">Meta: {mural.goalUsdc} USDC</span>
                      <span className="text-primary font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-container transition-all duration-1000"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant text-right">
                      {mural.raisedUsdc} USDC arrecadados
                    </p>
                  </div>

                  <Link to={`/mural/${mural.id}`} className="w-full bg-primary-container text-on-primary-container font-bold py-3 mt-6 rounded-full active:scale-95 transition-all text-sm text-center">
                    {isComplete ? "Ver Prova de Impacto" : "Financiar este Mural"}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className="w-full py-8 border-t border-white/5 bg-surface-container-lowest mt-12 mb-12">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-xs font-medium text-on-surface-variant">ODS 11 — Cidades e Comunidades Sustentáveis</p>
          <p className="text-xs font-medium text-on-surface-variant">ODS 13 — Ação Contra a Mudança Global do Clima</p>
          <div className="flex items-center gap-2 text-primary/60 mt-2">
            <span className="text-[10px] uppercase tracking-widest font-bold">Powered by Solana</span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}