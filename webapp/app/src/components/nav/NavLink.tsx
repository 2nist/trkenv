"use client"
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function NavLink({href, children}:{href:string, children:React.ReactNode}){
  const router = useRouter()
  const active = router.pathname === href || router.pathname.startsWith(href + "/")

  return (
    <Link href={href} legacyBehavior>
      <a className={`
        block px-3 py-2 text-sm rounded-md transition-all duration-200 font-dymo
        ${active
          ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm border-l-4 border-blue-500'
          : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
        }
      `}>
        {children}
      </a>
    </Link>
  )
}
