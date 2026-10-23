"use client";
import { useEffect } from "react";
export default function E2BTokenSync(){
  useEffect(()=>{
    try{
      const p = new URLSearchParams(window.location.search);
      const tok = p.get('e2b-traffic-access-token') || p.get('e2b_token') || p.get('e2bToken');
      if(tok) localStorage.setItem('e2b_traffic_token', tok);
      // Listen for parent postMessage if Arena forwards token that way
      const onMsg = (e: MessageEvent)=>{
        const d = e.data as Record<string,unknown>;
        if(typeof d['e2bTrafficToken']==='string') localStorage.setItem('e2b_traffic_token', d['e2bTrafficToken'] as string);
        if(typeof d['e2b-traffic-access-token']==='string') localStorage.setItem('e2b_traffic_token', d['e2b-traffic-access-token'] as string);
      };
      window.addEventListener('message', onMsg);
      return ()=> window.removeEventListener('message', onMsg);
    }catch{}
  },[]);
  return null;
}
