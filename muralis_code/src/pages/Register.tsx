import React, { useState, useEffect, useRef, ReactNode } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { CloudUpload, MapPin, Info, Wind, Verified, ArrowRight, Loader2, TreePine } from "lucide-react";
import { useMuralis } from "../state/MuralisContext";
import { flowCreateProject } from "../state/flows";
import { calculateImpact, TREES_PER_SQUARE_METER } from "../types";


export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { dispatch } = useMuralis();

  const [form, setForm] = useState({
    cep: "",
    title: "",
    description: "",
    artist: "",
    widthMeters: 0,
    heightMeters: 0,
    paintLiters: 0,
    address: "",
    city: "São Paulo",
    state: "SP",
    lat: -23.5505,
    lng: -46.6333,
    goalUsdc: 0,
    budgetBreakdown: "",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwsfgVvMEkFN8NOvkbJBjxrsynHl-_sbE7DBFBI2j4Yy7KkphMOG1mLymapCWIqQ0uQz94O7gcjSJYVtrAML1zUssYkMvKQzc86nEiDSezO4rU3PL4uo-mmdj4TItW3GGGt7ieaVnbcQiQhaq6FlQSly8Vv9n1c0Miid7DvHpGBrVwTRpNJoJUNMq9tJTewS0bRuFNKL1RE0Xuz5k39vciuiE1SOkd9nJ88JA5NVy9B0heOlEUudWJj9OHOjkjZ0s8WcIuthzz4Ynn",
  });

  const area = form.widthMeters * form.heightMeters;
  const impact = calculateImpact(area);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const cleanedCep = form.cep.replace(/\D/g, "");
    if (cleanedCep.length !== 8) return;

    setCepLoading(true);

    const run = async () => {
      const res = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data || data.erro) return;

      const bairro = data.bairro ? `, ${data.bairro}` : "";
      update("address", `${data.logradouro}${bairro}`);
      update("city", data.localidade);
      update("state", data.uf);

      const q = encodeURIComponent(
        `${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`
      );
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        { headers: { "Accept-Language": "pt-BR", "User-Agent": "Muralis/1.0" } }
      );
      if (!geoRes.ok) return;

      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        update("lat", parseFloat(geoData[0].lat));
        update("lng", parseFloat(geoData[0].lon));
      }
    };

    run().catch(() => {}).finally(() => setCepLoading(false));
  }, [form.cep]);

  function handleFileChange(file: File | null | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) update("image", e.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files[0]);
  }

  const handleFinish = async () => {
    if (!publicKey) {
      alert("Conecte sua Phantom Wallet antes de mintar o projeto.");
      return;
    }
    if (!form.title || !form.description || area <= 0 || form.goalUsdc <= 0) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const { project } = await flowCreateProject({
        title: form.title,
        description: form.description,
        artist: form.artist || "Artista Muralis",
        artistWallet: publicKey.toBase58(),
        widthMeters: form.widthMeters,
        heightMeters: form.heightMeters,
        paintLiters: form.paintLiters,
        location: {
          lat: form.lat,
          lng: form.lng,
          city: form.city,
          state: form.state,
          country: "Brasil",
          address: form.address,
        },
        goalUsdc: form.goalUsdc,
        budgetBreakdown: form.budgetBreakdown,
        image: form.image,
        daysRemaining: 30,
      });

      dispatch({ type: "CREATE_PROJECT", project });
      navigate(`/mural/${project.id}`);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Verifique a carteira e o saldo na Devnet.";
      alert(`Erro ao registrar o projeto na Solana:\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 py-8 max-w-2xl mx-auto"
    >
      <h2 className="text-3xl font-bold mb-8">Cadastre seu Projeto de Mural</h2>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-surface-container-highest -z-10 -translate-y-1/2"></div>
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ring-8 ring-background ${
              step >= s ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
            }`}>
              {s}
            </div>
            <span className={`text-[10px] font-bold ${step === s ? "text-primary" : "text-on-surface-variant"}`}>
              {s === 1 ? "Dados da Obra" : s === 2 ? "Impacto" : "Orçamento"}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-primary font-bold text-sm">Etapa 1</span>
              <h3 className="text-2xl font-bold">Dados da Obra</h3>
            </div>

            <div className="space-y-4">
              <Field label="Nome do Artista">
                <input
                  type="text"
                  placeholder="Ex: Luan Silva"
                  value={form.artist}
                  onChange={(e) => update("artist", e.target.value)}
                  className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                />
              </Field>
              <Field label="Título do Projeto">
                <input
                  type="text"
                  placeholder="Ex: Sopro da Amazônia"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                />
              </Field>
              <Field label="Conceito Artístico">
                <textarea
                  placeholder="Descreva a narrativa visual e técnica utilizada..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Largura (m)">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.widthMeters || ""}
                    onChange={(e) => update("widthMeters", Number(e.target.value))}
                    className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                  />
                </Field>
                <Field label="Altura (m)">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.heightMeters || ""}
                    onChange={(e) => update("heightMeters", Number(e.target.value))}
                    className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                  />
                </Field>
              </div>
              {area > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm">
                  Área total: <strong className="text-primary">{area.toFixed(2)} m²</strong>
                </div>
              )}
              <Field label="Upload do Esboço">
                <input
                  ref={fileInputRef}
                  id="sketch-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-primary/10 transition-all group"
                >
                  {form.image && !form.image.startsWith("https://lh3") ? (
                    <img
                      src={form.image}
                      alt="Esboço"
                      className="w-24 h-24 object-cover rounded-xl border border-primary/20"
                    />
                  ) : (
                    <div className="bg-primary/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                      <CloudUpload className="text-primary w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold">Envie o esboço ou foto</p>
                    <p className="text-xs text-on-surface-variant mt-1">JPG, PNG · Upload para Arweave/IPFS</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="text-primary font-bold text-sm underline underline-offset-4"
                  >
                    {form.image && !form.image.startsWith("https://lh3") ? "Trocar arquivo" : "Procurar arquivo"}
                  </button>
                </div>
              </Field>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-primary py-4 rounded-full text-on-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              Continuar <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-primary font-bold text-sm">Etapa 2</span>
              <h3 className="text-2xl font-bold">Dados de Impacto</h3>
            </div>

            <div className="space-y-6">
              <Field label="CEP">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={form.cep}
                    onChange={(e) => update("cep", e.target.value)}
                    className="w-full bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors pr-12"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-on-surface-variant" />
                  )}
                </div>
              </Field>
              <Field label="Localização">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Endereço (rua, bairro)"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    className="w-full bg-surface-container border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-primary transition-colors"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cidade">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                  />
                </Field>
                <Field label="UF">
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                  />
                </Field>
              </div>

              <Field label="Tinta Fotocatalítica (Litros)" hint="Esta tinta absorve CO₂ do ar continuamente.">
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={form.paintLiters || ""}
                  onChange={(e) => update("paintLiters", Number(e.target.value))}
                  className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                />
              </Field>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Wind className="text-primary w-5 h-5" />
                  </div>
                  <span className="font-bold">Absorção estimada</span>
                </div>
                <span className="text-xl font-bold text-primary tracking-tight">
                  {impact.co2PerYear.toFixed(1)} kg CO₂/ano
                </span>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <TreePine className="text-primary w-5 h-5" />
                  </div>
                  <span className="font-bold">Equivalente em árvores</span>
                </div>
                <span className="text-xl font-bold text-primary tracking-tight">
                  ≈ {impact.treeEquivalent} 🌳
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep(1)}
                className="py-4 rounded-full border border-white/10 font-bold hover:bg-white/5 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-primary py-4 rounded-full text-on-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                Continuar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-primary font-bold text-sm">Etapa 3</span>
              <h3 className="text-2xl font-bold">Orçamento</h3>
            </div>

            <div className="space-y-6">
              <Field label="Orçamento Necessário (USDC)">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.goalUsdc || ""}
                    onChange={(e) => update("goalUsdc", Number(e.target.value))}
                    className="w-full bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors pr-20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-lg border border-white/5">
                    <span className="font-label-md text-primary font-bold text-[10px]">$</span>
                    <span className="text-xs font-bold uppercase">USDC</span>
                  </div>
                </div>
              </Field>

              <Field label="Detalhamento do Orçamento">
                <textarea
                  placeholder="Liste materiais, cachê artístico, andaimes, etc."
                  rows={6}
                  value={form.budgetBreakdown}
                  onChange={(e) => update("budgetBreakdown", e.target.value)}
                  className="bg-surface-container border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-colors w-full"
                />
              </Field>
            </div>

            <div className="pt-4">
              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container py-5 rounded-full font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Mintando RWA na Solana...
                  </>
                ) : (
                  <>
                    <Verified className="w-6 h-6" />
                    Gerar Token RWA
                  </>
                )}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-4 mt-4 font-bold text-on-surface-variant hover:text-on-surface transition-all"
              >
                Voltar para Etapa 2
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

function Field({ label, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{label}</label>
        {hint && (
          <div className="group relative">
            <Info className="w-4 h-4 text-on-surface-variant cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-surface-container-highest text-on-surface text-[10px] p-2 rounded border border-white/10 w-48 shadow-xl z-20">
              {hint}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}