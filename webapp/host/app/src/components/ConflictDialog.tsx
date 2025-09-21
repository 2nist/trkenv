"use client"
import React, {useEffect, useRef, useId} from 'react'
import styles from './ConflictDialog.module.css'

export default function ConflictDialog({onRefresh, onOverwrite, onClose}:{onRefresh:()=>void; onOverwrite:()=>void; onClose:()=>void}){
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastButtonRef = useRef<HTMLButtonElement | null>(null)
  const prevFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    // Save previously focused element to restore focus on close
    prevFocused.current = document.activeElement as HTMLElement | null

    // Focus the first actionable button
    const toFocus = firstButtonRef.current || sheetRef.current
    toFocus && (toFocus as HTMLElement).focus()

    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape'){
        e.preventDefault()
        onClose()
        return
      }

      if(e.key === 'Tab'){
        // Basic focus trap: keep focus within the dialog
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []
        if(focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if(e.shiftKey){
          if(document.activeElement === first){
            e.preventDefault()
            last.focus()
          }
        } else {
          if(document.activeElement === last){
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // restore focus
      try { prevFocused.current?.focus() } catch (err) { /* ignore */ }
    }
  }, [onClose])

  // prevent clicks inside sheet from closing if overlay gets a handler later
  function onOverlayClick(e: React.MouseEvent){
    if(e.target === overlayRef.current){
      onClose()
    }
  }

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={onOverlayClick} role="presentation">
      <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h3 id={titleId}>Conflict detected</h3>
        <p>The palette was changed on the server since you loaded it. You can refresh to get the latest, or overwrite the remote copy.</p>
        <div className={styles.actions}>
          <button ref={firstButtonRef} onClick={onClose}>Cancel</button>
          <button onClick={onRefresh}>Refresh</button>
          <button ref={lastButtonRef} onClick={onOverwrite}>Overwrite</button>
        </div>
      </div>
    </div>
  )
}
