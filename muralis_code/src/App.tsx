/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Details from "./pages/Details";
import Success from "./pages/Success";
import Impact from "./pages/Impact";
import WalletPage from "./pages/Wallet";
import MapPage from "./pages/Map";
import Profile from "./pages/Profile";
import { SolanaProvider } from "./components/SolanaProvider";
import { MuralisProvider } from "./state/MuralisContext";

export default function App() {
  return (
    <SolanaProvider>
      <MuralisProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/mural/:id" element={<Details />} />
              <Route path="/success/:id" element={<Success />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/impact/:id" element={<Impact />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </MuralisProvider>
    </SolanaProvider>
  );
}