import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { AnchorContextProvider } from "./AnchorContext";
import "@solana/wallet-adapter-react-ui/styles.css";

const DEVNET_ENDPOINT = "https://api.devnet.solana.com";

export const SolanaProvider = ({ children }: { children: ReactNode }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={DEVNET_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AnchorContextProvider>{children}</AnchorContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
