import React from "react"

interface SimpleMintingHeaderProps {
  t: any
}

export const SimpleMintingHeader: React.FC<SimpleMintingHeaderProps> = ({
  t
}) => (
  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
    <div>
      <h2 className="text-sm font-black text-slate-800 tracking-tight">
        {t.minting.quickCardCreator}
      </h2>
      <p className="text-[10px] text-slate-500 font-medium">
        {t.minting.mintInstantly}
      </p>
    </div>
    <span className="text-xs bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">
      {t.minting.easyMode}
    </span>
  </div>
)
