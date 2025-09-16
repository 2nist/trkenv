"use client"
import React from 'react'
import NavLink from './NavLink'
import LabMenu from '@/components/LabMenu'
import { moduleToPublicUrl } from '@/lib/moduleUrl'

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
    <div className="w-56 bg-gray-100 p-2 h-full">
      <div className="flex flex-col space-y-1">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/playhead">Playhead</NavLink>
        <NavLink href="/songs">Library</NavLink>
        <NavLink href="/import">Import</NavLink>
      </div>
      <div className="mt-4">
        <LabMenu onOpenModule={openModule} />
      </div>
    </div>
  )
}
