import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import MuralisNftIdl from "../idl/muralis_nft.json";
import MuralisEscrowIdl from "../idl/muralis_escrow.json";
import MuralisRwaIdl from "../idl/muralis_rwa.json";
import {
  RealBlockchainService,
  MockBlockchainService,
  setBlockchainService,
  type AnchorPrograms,
} from "../services/blockchainService";

interface AnchorCtxValue {
  provider: AnchorProvider | null;
  programs: AnchorPrograms | null;
}

const AnchorCtx = createContext<AnchorCtxValue>({ provider: null, programs: null });

export const AnchorContextProvider = ({ children }: { children: ReactNode }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);

  const programs = useMemo((): AnchorPrograms | null => {
    if (!provider) return null;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nft: new Program(MuralisNftIdl as any, provider),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      escrow: new Program(MuralisEscrowIdl as any, provider),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rwa: new Program(MuralisRwaIdl as any, provider),
    };
  }, [provider]);

  useEffect(() => {
    if (programs && provider) {
      setBlockchainService(new RealBlockchainService(programs, provider));
    } else {
      setBlockchainService(new MockBlockchainService());
    }
  }, [programs, provider]);

  return (
    <AnchorCtx.Provider value={{ provider, programs }}>
      {children}
    </AnchorCtx.Provider>
  );
};

/** Hook que expõe o provider Anchor e os 3 programs instanciados. */
export const usePrograms = () => useContext(AnchorCtx);
