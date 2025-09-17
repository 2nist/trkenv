"use client"
import React from 'react'
import NavLink from './NavLink'
import LabMenu from '../LabMenu'
import { moduleToPublicUrl } from '../../lib/moduleUrl'

export default function SideNav(){
  const openModule = (m: any) => {
    // Prefer opening module UI under /experiments/<id>/ui/<path>
    const url = moduleToPublicUrl(m) || '#'
    const iframe = document.querySelector('iframe#panel') as HTMLIFrameElement | null
    if (iframe) {
      iframe.src = url
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 p-4 h-full min-h-screen">
      <div className="space-y-2">
        {/* Main Navigation */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 font-dymo">
            Navigation
          </h3>
          <div className="space-y-1">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/playhead">Playhead</NavLink>
            <NavLink href="/songs">Library</NavLink>
            <NavLink href="/design">Design</NavLink>
            <NavLink href="/editor">Editor</NavLink>
            <NavLink href="/record">Record</NavLink>
            <NavLink href="/import">Import</NavLink>
          </div>
        </div>

        {/* Lab Modules */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 font-dymo">
            Lab Modules
          </h3>
          <LabMenu onOpenModule={openModule} />
        </div>
      </div>
    </aside>
  )
}
