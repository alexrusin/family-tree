'use client'

import { Plus } from 'lucide-react'

export default function CreateTreeButton({ label }: { label: string }) {
  return (
    <button className="bg-primary-container text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 self-start sm:self-auto whitespace-nowrap">
      <Plus className="w-5 h-5" />
      <span className="text-sm font-semibold tracking-wide">{label}</span>
    </button>
  )
}
