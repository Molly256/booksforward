'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TOTAL_SLICES = 9;
const DEGREES_PER_SLICE = 360 / TOTAL_SLICES;
const TARGET_SLICE_INDEX = 0; // 2990 UGX - always wins

export default function MagicalWheelPage() {
  const router = useRouter();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spins, setSpins] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  
  const wheelRef = useRef(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const storedUser = localStorage.getItem('booksforward_user');
        if (!storedUser) {
          setLoading(false);
          return;
        }
        const userObj = JSON.parse(storedUser);
        const userPhone = userObj?.phone;
        if (!userPhone) {
          setLoading(false);
          return;
        }
        setPhone(userPhone);
        const res = await fetch(`/api/user?phone=${userPhone}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.user) {
          setSpins(Number(data.user.spins) || 0);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  async function startLuckyWheelSpin() {
    if (isSpinning) return;
    if (!phone) {
      alert("Please login again");
      return;
    }
    if (Number(spins) < 1) {
      alert("You do not have any lucky spins remaining!");
      return;
    }
    setIsSpinning(true);
    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'magicalwheel' }),
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || "No spins available!");
        setIsSpinning(false);
        // refresh spins from server
        const res = await fetch(`/api/user?phone=${phone}`, { cache: 'no-store' });
        const d = await res.json();
        if(d.success) setSpins(Number(d.user.spins)||0);
        return;
      }
      const baseRotations = 6 * 360;
      const sliceCenter = TARGET_SLICE_INDEX * DEGREES_PER_SLICE + (DEGREES_PER_SLICE / 2);
      const finalRotationAngle = baseRotations + (360 - sliceCenter); 
      if (wheelRef.current) {
        wheelRef.current.style.transition = "transform 4.5s cubic-bezier(0.1, 0.8, 0.3, 1)";
        wheelRef.current.style.transform = `rotate(${finalRotationAngle}deg)`;
      }
      setTimeout(() => {
        setShowModal(true);
        setSpins(Number(data.remainingSpins) || 0);
        setTimeout(() => {
          if (wheelRef.current) {
            wheelRef.current.style.transition = "none";
            wheelRef.current.style.transform = `rotate(${-sliceCenter}deg)`;
          }
          setIsSpinning(false);
        }, 500);
      }, 4500);
    } catch (error) {
      console.error("Spin execution error:", error);
      alert("Something went wrong. Try again.");
      setIsSpinning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '18px', fontWeight: '500', color:'#00C853' }}>Loading magical wheel...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#fff' }}>
      
      <div style={{
        width:'100%',
        background:'#00C853',
        padding:'14px 20px',
        display:'flex',
        alignItems:'center',
        gap:'12px',
        position:'sticky',
        top:0,
        zIndex:50
      }}>
        <button 
          onClick={()=>router.push('/dashboard')} 
          style={{color:'#fff', fontSize:'26px', fontWeight:900, background:'none', border:'none', cursor:'pointer'}}
        >
          ←
        </button>
        <h1 style={{color:'#fff', fontWeight:900, fontSize:'18px', margin:0, letterSpacing:'0.3px'}}>
          Magical Wheel
        </h1>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px', width:'100%', maxWidth:'448px' }}>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: spins > 0 ? '#E8F5E9' : '#fff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: spins > 0 ? '2px solid #00C853' : '1px solid #eee' }}>
            <strong>Spins:</strong> <span style={{ color: spins > 0 ? '#00C853' : '#999', fontWeight: spins > 0 ? '700' : '400' }}>{spins}</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '330px', height: '330px', margin: '30px 0' }}>
          <div style={{
            position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
            width: '0', height: '0', borderLeft: '18px solid transparent', borderRight: '18px solid transparent',
            borderTop: '30px solid #00C853', zIndex: 10, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }} />

          <div 
            ref={wheelRef}
            style={{
              width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,200,83,0.25)', position: 'relative'
            }}
          >
            <img 
              src="/magical-wheel.png" 
              alt="Magical Wheel"
              style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:'50%', userSelect:'none', pointerEvents:'none' }}
              draggable={false}
            />
          </div>

          <button 
            onClick={startLuckyWheelSpin}
            disabled={isSpinning || spins < 1}
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '90px', height: '90px', borderRadius: '50%', border: '3px solid #fff',
              backgroundColor: '#FFFFFF', 
              color: '#000',
              cursor: isSpinning || spins < 1 ? 'not-allowed' : 'pointer', 
              boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', zIndex: 20,
              opacity: 1,
            }}
          >
            <span style={{fontSize:'18px', lineHeight:'18px', fontWeight:900, color:'#000'}}>BF</span>
            <span style={{fontSize:'9px', lineHeight:'10px', fontWeight:900, color:'#000', marginTop:'2px'}}>MAGICAL</span>
            <span style={{fontSize:'9px', lineHeight:'10px', fontWeight:900, color:'#000'}}>WHEEL</span>
          </button>
        </div>

        <button
          onClick={startLuckyWheelSpin}
          disabled={isSpinning || spins < 1}
          style={{
            background:'#00C853', color:'#fff', border:'none', padding:'12px 40px', borderRadius:'999px',
            fontWeight:'900', fontSize:'15px', cursor: isSpinning || spins < 1 ? 'not-allowed':'pointer',
            opacity: isSpinning || spins < 1 ? 0.5 : 1, boxShadow:'0 4px 15px rgba(0,200,83,0.3)'
          }}
        >
          {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
        </button>

        <div style={{ 
          maxWidth: '400px', 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '13px', 
          lineHeight: '1.5',
          marginTop: '18px',
          padding: '0 20px'
        }}>
          Spin the BF Magical Wheel and win exclusive rewards. Every spin wins!
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: '380px', width: '90%', border:'2px solid #00C853' }}>
            <h2 style={{ fontSize: '50px', margin: '0 0 10px 0' }}>🎉</h2>
            <h3 style={{ margin: '0 0 8px 0', color: '#00C853', fontWeight:'900', fontSize:'18px' }}>Congratulations upon your magical win!</h3>
            <p style={{ fontSize: '22px', color: '#000', margin: '10px 0', fontWeight:'900' }}>2990 UGX</p>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 22px 0' }}>Your magical reward has been added to your transaction history as <strong>magicalwheel</strong>.</p>
            <button 
              onClick={() => setShowModal(false)}
              style={{ background: '#00C853', color: '#fff', border: 'none', padding: '11px 30px', borderRadius: '999px', fontWeight: '900', cursor: 'pointer' }}
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}