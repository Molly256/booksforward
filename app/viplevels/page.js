'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export const VIPS = {
  0: { name: 'Vip0', price: 0, books: 5, perBook: 400, daily: 2000, days: 1 },
  1: { name: 'Vip1', price: 50000, books: 5, perBook: 400, daily: 2000, days: 365 },
  2: { name: 'Vip2', price: 230000, books: 10, perBook: 810, daily: 8100, days: 365 },
  3: { name: 'Vip3', price: 650000, books: 15, perBook: 1466, daily: 22000, days: 365 },
  4: { name: 'Vip4', price: 850000, books: 20, perBook: 1500, daily: 30000, days: 365 },
}

const getTodayDateStrFullYear = () => new Date().toLocaleDateString('en-CA',{timeZone:"Africa/Kampala"})
const getTodayTimeStrKampala = () => new Date().toLocaleString("en-CA",{timeZone:"Africa/Kampala",hour12:false}).slice(0,16).replace(',',' ')

const Toast = ({ msg, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose,1500); return ()=>clearTimeout(t)},[onClose])
  return <div style={{position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',background:'#000',color:'#fff',padding:'12px 20px',borderRadius:'25px',fontWeight:'700',fontSize:'13px',zIndex:2000}}>{msg}</div>
}
const HOT_GREEN = '#00C853'
function VipImage({level}){return(<div style={{width:90,height:110,flexShrink:0,background:'#FFF',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={`/vip${level}.jpg`} alt="" style={{width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#FFF',border:'none',mixBlendMode:'multiply'}}/></div>)}

export default function VipLevels(){
  const [user,setUser]=useState(null)
  const [loading,setLoading]=useState(false)
  const [toast,setToast]=useState(null)
  const vips=[{level:0,price:0},{level:1,price:50000},{level:2,price:230000},{level:3,price:650000},{level:4,price:850000}]

  useEffect(()=>{
    const localData = JSON.parse(localStorage.getItem('booksforward_user')||'{}')
    if(!localData.phone) return
    // FIX: always fetch fresh from bf:user:phone so refresh keeps vip state
    fetch(`/api/viplevels?phone=${localData.phone}`)
     .then(r=>r.json())
     .then(d=>{
        if(d.success && d.user){
          const today=getTodayDateStrFullYear()
          if((d.user.lastResetDate||'')!==today){
            d.user.books_read_today=0; d.user.dailyIncome=0
          }
          setUser(d.user)
          localStorage.setItem('booksforward_user',JSON.stringify(d.user))
        } else {
          // fallback to local if api fails
          setUser(localData)
        }
      })
     .catch(()=>setUser(localData))
  },[])

  const handleBuyVip=async(vip)=>{
    if(!user) return
    const isActivated = user.vipActivated==='true'||user.vipActivated===true
    const isBought = user.hasBoughtVip==='true'||user.hasBoughtVip===true
    const curVip = Number(user.vip||0)

    if(vip.level===0){
      if(isActivated){setToast('Vip0 already activated');return}
      if(isBought && curVip>0){setToast("Can't downgrade to Vip0");return}
    } else {
      if(isBought && vip.level<=curVip){setToast("Can't downgrade");return}
      if((Number(user.availableBalance)||0) < vip.price){setToast('Insufficient Available Balance');return}
    }

    setLoading(true)
    try{
      const res=await fetch('/api/viplevels',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone:user.phone,action:'UPGRADE',payload:{vipLevel:vip.level}})
      })
      const data=await res.json()
      if(!data.success||!data.user){setToast(data.message||'Purchase failed');return}
      localStorage.setItem('booksforward_user',JSON.stringify(data.user))
      setUser(data.user)
      if(data.isSunday && vip.level>=1){
        setToast('Upgraded Successful - No books on Sunday')
      } else {
        setToast('Upgraded Successful')
      }
    }catch(err){setToast('Error: '+err.message)}finally{setLoading(false)}
  }

  if(!user) return null
  const currentVipLevel=Number(user.vip||0)
  const isBought = user.hasBoughtVip==='true'||user.hasBoughtVip===true
  const isActivated = user.vipActivated==='true'||user.vipActivated===true

  return(
    <main style={{minHeight:'100vh',background:'#FFFFFF',padding:'0',paddingBottom:'90px'}}>
      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
      <div style={{background:HOT_GREEN,padding:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
        <Link href="/dashboard" style={{width:'36px',height:'36px',background:'#FFF',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:HOT_GREEN,fontSize:'20px',fontWeight:'900',textDecoration:'none'}}>←</Link>
        <h1 style={{color:'#FFF',fontSize:'15px',fontWeight:'900',letterSpacing:'1px'}}>VIP LEVELS</h1>
      </div>
      <div style={{padding:'12px',maxWidth:'500px',margin:'0 auto',background:'#FFFFFF'}}>
        <div style={{display:'flex',flexDirection:'column',maxWidth:'420px',margin:'0 auto',background:'#FFFFFF'}}>
          {vips.map(vip=>{
            const isCurrent = currentVipLevel===vip.level && (vip.level===0? isActivated : isBought)
            // FIXED canBuy: below current = Can't downgrade, above = hot green, survives refresh
            const canBuy = vip.level===0?!isActivated && (!isBought || currentVipLevel===0) :!isBought? true : vip.level > currentVipLevel

            return(
              <div key={vip.level} style={{background:'#FFFFFF',display:'flex',alignItems:'center',padding:'16px 0',borderBottom:'1px solid #E9E9E9'}}>
                <VipImage level={vip.level}/>
                <div style={{marginLeft:'16px',flex:1}}>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'10px'}}><span style={{fontWeight:800,fontSize:'15px',color:'#111'}}>{vip.price.toLocaleString()} UGX</span></div>
                  {canBuy?(
                    <button onClick={()=>handleBuyVip(vip)} disabled={loading} style={{width:'100%',background:HOT_GREEN,color:'#FFFFFF',border:'none',borderRadius:'10px',padding:'12px 0',fontWeight:'900',fontSize:'14px',letterSpacing:'0.5px',cursor:'pointer'}}>UPGRADE</button>
                  ):isCurrent?(
                    <div style={{width:'100%',background:'#E8E8E8',borderRadius:'10px',padding:'12px 0',fontWeight:'900',fontSize:'14px',textAlign:'center'}}>✅ CURRENT</div>
                  ):(
                    <div style={{width:'100%',background:'#E8E8E8',borderRadius:'10px',padding:'12px 0',fontWeight:'900',fontSize:'14px',textAlign:'center',color:'#777'}}>Can't downgrade</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}