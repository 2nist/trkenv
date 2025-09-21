"use client"
import React, { ReactNode } from 'react'
import Sidebar from './Sidebar'
import styles from './AppShell.module.css'

export default function AppShell({children}:{children:ReactNode}){
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>{children}</div>
    </div>
  )
}
