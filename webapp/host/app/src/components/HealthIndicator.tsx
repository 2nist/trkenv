"use client"
import React from 'react'

export default function HealthIndicator({ok}:{ok?:boolean}){
  return (
    <div style={{fontSize:12, color:'#6b7280'}}>
      <span style={{display:'inline-block', width:10, height:10, background: ok? '#10b981':'#f59e0b', borderRadius:999, marginRight:8}}></span>
      backend
    </div>
  )
}
