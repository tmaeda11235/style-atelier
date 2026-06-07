import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import React from "react"

import { chromeStoragePersister, queryClient } from "./lib/react-query-persist"
import SidePanelPage from "./pages/SidePanel"

import "./style.css"

function SidePanelIndex() {
  return (
    <React.StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: chromeStoragePersister }}>
        <SidePanelPage />
      </PersistQueryClientProvider>
    </React.StrictMode>
  )
}

export default SidePanelIndex
