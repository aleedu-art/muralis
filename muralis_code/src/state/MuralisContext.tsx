/**
 * MuralisContext — Estado global do app.
 *
 * Gerencia: projetos, contribuições e NFTs de apoiador.
 * Persiste em localStorage. Será substituído por chamadas ao DB (Supabase)
 * mais à frente — todos os reducers já estão pensados para isso.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  Contribution,
  Project,
  ProjectStatus,
  SupporterNFT,
  UserSummary,
} from "../types";
import { SEED_PROJECTS } from "../types";
import { loadState, saveState } from "../services/storage";

// ─────────────────────────────────────────────────────────────────────────
// State + Actions
// ─────────────────────────────────────────────────────────────────────────

export interface MuralisState {
  projects: Project[];
  contributions: Contribution[];
  supporterNfts: SupporterNFT[];
}

const initialState: MuralisState = {
  projects: SEED_PROJECTS,
  contributions: [],
  supporterNfts: [],
};

type Action =
  | { type: "RESET"; state?: MuralisState }
  | { type: "CREATE_PROJECT"; project: Project }
  | {
      type: "UPDATE_PROJECT_STATUS";
      projectId: string;
      status: ProjectStatus;
      patch?: Partial<Project>;
    }
  | { type: "ADD_CONTRIBUTION"; contribution: Contribution }
  | { type: "MINT_SUPPORTER_NFT"; nft: SupporterNFT }
  | { type: "COMPLETE_PROJECT"; projectId: string; completedAt: string };

function reducer(state: MuralisState, action: Action): MuralisState {
  switch (action.type) {
    case "RESET":
      return action.state ?? initialState;

    case "CREATE_PROJECT":
      return { ...state, projects: [action.project, ...state.projects] };

    case "UPDATE_PROJECT_STATUS":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, status: action.status, ...(action.patch ?? {}) }
            : p
        ),
      };

    case "ADD_CONTRIBUTION": {
      const c = action.contribution;
      return {
        ...state,
        contributions: [c, ...state.contributions],
        projects: state.projects.map((p) =>
          p.id === c.projectId
            ? {
                ...p,
                raisedUsdc: p.raisedUsdc + c.amountUsdc,
                supporterCount: p.supporterCount + 1,
                status:
                  p.raisedUsdc + c.amountUsdc >= p.goalUsdc ? "funded" : p.status,
              }
            : p
        ),
      };
    }

    case "MINT_SUPPORTER_NFT":
      return { ...state, supporterNfts: [action.nft, ...state.supporterNfts] };

    case "COMPLETE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, status: "completed", completedAt: action.completedAt }
            : p
        ),
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────

interface MuralisContextValue {
  state: MuralisState;
  dispatch: Dispatch<Action>;
  /** Helpers de leitura */
  getProject: (id: string) => Project | undefined;
  getContributionsByProject: (projectId: string) => Contribution[];
  getContributionsByWallet: (wallet: string) => Contribution[];
  getSupporterNftsByWallet: (wallet: string) => SupporterNFT[];
  getProjectsByArtist: (wallet: string) => Project[];
  getUserSummary: (wallet: string) => UserSummary;
}

const MuralisContext = createContext<MuralisContextValue | undefined>(undefined);

export function MuralisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const persisted = loadState<MuralisState>();
      if (
        persisted &&
        Array.isArray(persisted.projects) &&
        persisted.projects.length > 0 &&
        "goalUsdc" in persisted.projects[0] &&
        Array.isArray(persisted.contributions) &&
        Array.isArray(persisted.supporterNfts)
      ) {
        return persisted;
      }
    } catch (e) {
      console.warn("Invalid persisted state, using default init state", e);
    }
    return init;
  });

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<MuralisContextValue>(
    () => ({
      state,
      dispatch,
      getProject: (id) => state.projects.find((p) => p.id === id),
      getContributionsByProject: (projectId) =>
        state.contributions.filter((c) => c.projectId === projectId),
      getContributionsByWallet: (wallet) =>
        state.contributions.filter((c) => c.supporterWallet === wallet),
      getSupporterNftsByWallet: (wallet) =>
        state.supporterNfts.filter((n) => n.owner === wallet),
      getProjectsByArtist: (wallet) =>
        state.projects.filter((p) => p.artistWallet === wallet),
      getUserSummary: (wallet) => {
        const myContribs = state.contributions.filter((c) => c.supporterWallet === wallet);
        const myProjects = state.projects.filter((p) => p.artistWallet === wallet);
        const myNfts = state.supporterNfts.filter((n) => n.owner === wallet);
        return {
          wallet,
          myProjectIds: myProjects.map((p) => p.id),
          myContributionIds: myContribs.map((c) => c.id),
          totalContributedUsdc: myContribs.reduce((acc, c) => acc + c.amountUsdc, 0),
          totalSupporterNftsOwned: myNfts.length,
        };
      },
    }),
    [state]
  );

  return <MuralisContext.Provider value={value}>{children}</MuralisContext.Provider>;
}

export function useMuralis() {
  const ctx = useContext(MuralisContext);
  if (!ctx) {
    throw new Error("useMuralis must be used inside <MuralisProvider>");
  }
  return ctx;
}
