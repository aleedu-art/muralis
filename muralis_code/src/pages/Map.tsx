/**
 * Mapa de Murais — visualização geográfica dos projetos.
 *
 * Usa Leaflet (vanilla) via useEffect para evitar conflitos de versão com
 * react-leaflet em React 19. Tiles via OpenStreetMap (sem API key).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { MapPin, Filter, Ruler, Wind, TreePine } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMuralis } from "../state/MuralisContext";
import type { Project, ProjectStatus } from "../types";

// Fix default marker icons (Leaflet expects assets that Vite doesn't bundle by default)
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Ícones customizados por status do projeto
function buildIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 0 0 2px ${color}66, 0 4px 12px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
    "><div style="
      width: 8px; height: 8px; border-radius: 50%; background: white;
    "></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ICONS: Record<ProjectStatus, L.DivIcon> = {
  draft: buildIcon("#85948c"),
  funding: buildIcon("#42e5b0"),
  funded: buildIcon("#ffbca2"),
  executing: buildIcon("#ffbca2"),
  completed: buildIcon("#00c896"),
};

type StatusFilter = "all" | ProjectStatus;

export default function MapPage() {
  const { state } = useMuralis();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = state.projects.filter((p) => (filter === "all" ? true : p.status === filter));

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-15.0, -50.0], // centro do Brasil
      zoom: 4,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever filter or projects change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // limpa markers antigos
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (filtered.length === 0) return;

    filtered.forEach((p) => {
      const marker = L.marker([p.location.lat, p.location.lng], {
        icon: ICONS[p.status],
      });
      marker.bindPopup(buildPopupHtml(p));
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Fit bounds com padding
    const bounds = L.latLngBounds(filtered.map((p) => [p.location.lat, p.location.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
  }, [filter, filtered]);

  const counts = {
    all: state.projects.length,
    funding: state.projects.filter((p) => p.status === "funding").length,
    funded: state.projects.filter((p) => p.status === "funded").length,
    completed: state.projects.filter((p) => p.status === "completed").length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2 rounded-xl">
            <MapPin className="text-primary w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Mapa de Murais</h1>
        </div>
        <p className="text-sm text-on-surface-variant max-w-xl">
          Onde a arte sustentável está acontecendo. Cada ponto é um mural tokenizado na Solana.
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-on-surface-variant shrink-0" />
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`Todos (${counts.all})`} />
          <FilterChip active={filter === "funding"} onClick={() => setFilter("funding")} label={`Em financiamento (${counts.funding})`} />
          <FilterChip active={filter === "funded"} onClick={() => setFilter("funded")} label={`Financiados (${counts.funded})`} />
          <FilterChip active={filter === "completed"} onClick={() => setFilter("completed")} label={`Concluídos (${counts.completed})`} />
        </div>
      </div>

      {/* Map */}
      <div className="px-4 max-w-7xl mx-auto">
        <div
          ref={containerRef}
          className="w-full h-[60vh] md:h-[70vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: "var(--color-surface-container)" }}
        />
      </div>

      {/* Legenda + lista lateral */}
      <div className="px-4 py-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container rounded-2xl p-5 border border-white/5">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Legenda</h3>
          <div className="space-y-2 text-sm">
            <LegendDot color="#42e5b0" label="Em financiamento" />
            <LegendDot color="#ffbca2" label="Financiado / Em execução" />
            <LegendDot color="#00c896" label="Concluído" />
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl p-5 border border-white/5 md:col-span-2">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Projetos visíveis ({filtered.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/mural/${p.id}`}
                className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3 border border-white/5 hover:border-primary/40 transition-all"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                  onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=500"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.title}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{p.location.city}, {p.location.state}</p>
                  <div className="flex gap-2 mt-1">
                    <Stat icon={<Ruler className="w-3 h-3" />} value={`${p.area}m²`} />
                    <Stat icon={<Wind className="w-3 h-3" />} value={`${p.co2PerYear}kg`} />
                    <Stat icon={<TreePine className="w-3 h-3" />} value={`${p.treeEquivalent}🌳`} />
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-on-surface-variant col-span-2 py-6">
                Nenhum projeto neste filtro.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function buildPopupHtml(p: Project): string {
  const progress = Math.round((p.raisedUsdc / p.goalUsdc) * 100);
  return `
    <div style="min-width: 220px; font-family: Inter, sans-serif;">
      <img src="${p.image}" alt="${p.title}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" onerror="this.src='https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=500'" />
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${p.title}</div>
      <div style="font-size: 11px; color: #888; margin-bottom: 6px;">${p.location.city}, ${p.location.state}</div>
      <div style="display: flex; gap: 8px; font-size: 11px; color: #00c896; margin-bottom: 6px;">
        <span>📐 ${p.area} m²</span>
        <span>🌳 ${p.treeEquivalent}</span>
      </div>
      <div style="font-size: 11px; margin-bottom: 4px;"><strong>${p.raisedUsdc}</strong> / ${p.goalUsdc} USDC (${progress}%)</div>
      <a href="/mural/${p.id}" style="display: inline-block; margin-top: 4px; color: #00c896; font-weight: 700; font-size: 12px; text-decoration: none;">
        Ver mural →
      </a>
    </div>
  `;
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {label}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 0 2px ${color}33` }} />
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );
}

function Stat({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="text-[10px] text-primary flex items-center gap-1">
      {icon}
      {value}
    </span>
  );
}
