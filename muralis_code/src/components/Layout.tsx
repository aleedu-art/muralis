import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Palette,
  Compass,
  Map as MapIcon,
  Wallet,
  User,
  Plus
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen bg-background text-on-background pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-surface/60 border-b border-white/10">
        <div className="flex justify-between items-center px-4 h-16 w-full max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <Palette className="text-primary w-6 h-6" />
            <h1 className="font-heading text-xl font-bold text-primary tracking-tight">Muralis</h1>
          </Link>
          <div className="wallet-button-container-header scale-90 md:scale-100 origin-right">
             <WalletMultiButton className="!bg-primary-container !text-on-primary-container !rounded-full !text-sm !font-semibold !h-auto !py-2 !px-4 hover:!brightness-110 active:scale-95 transition-all !line-height-[normal]" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 bg-surface-container/80 backdrop-blur-xl border-t border-white/5 shadow-2xl">
        <div className="flex justify-around items-center h-20 px-4 pb-safe max-w-7xl mx-auto">
          <NavItem 
            to="/"
            isActive={isActive("/") || isActive("/mural")} 
            icon={<Compass className="w-6 h-6" />}
            label="Explorar"
          />
          <NavItem
            to="/map"
            isActive={isActive("/map") || isActive("/impact")}
            icon={<MapIcon className="w-6 h-6" />}
            label="Mapa"
          />
          {/* Action Button */}
          <Link 
            to="/register"
            className={`flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full shadow-lg transition-all active:scale-95 ${
              isActive("/register") 
                ? "bg-primary text-on-primary" 
                : "bg-primary-container text-on-primary-container"
            }`}
          >
            <Plus className="w-6 h-6" />
          </Link>
          <NavItem 
            to="/wallet"
            isActive={isActive("/wallet")} 
            icon={<Wallet className="w-6 h-6" />}
            label="Carteira"
          />
          <NavItem 
            to="/profile"
            isActive={isActive("/profile")} 
            icon={<User className="w-6 h-6" />}
            label="Perfil"
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, isActive, icon, label }: { 
  to: string;
  isActive: boolean; 
  icon: ReactNode; 
  label: string 
}) {
  return (
    <Link 
      to={to}
      className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${
        isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <div className={isActive ? "scale-110" : ""}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}