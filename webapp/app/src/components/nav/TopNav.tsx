"use client"
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'

export default function TopNav({children}:{children?:React.ReactNode}){
  const router = useRouter()

  return (
    <div className="w-full sticky top-0 z-40 bg-white border-b border-gray-200 py-2 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="TRK Studio Logo" width={60} height={60} className="object-contain" priority />
            <span className="ml-3 text-xl font-bold text-gray-800 font-dymo tracking-wide">
              TRK Studio
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}
