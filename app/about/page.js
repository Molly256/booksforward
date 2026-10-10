'use client'
import Link from 'next/link'

const HOT_GREEN = '#00C853'

export default function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#FFFFFF', paddingBottom: '90px' }}>
      <div style={{ background: HOT_GREEN, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard" style={{ width: '36px', height: '36px', background: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: HOT_GREEN, fontSize: '20px', fontWeight: '900', textDecoration: 'none' }}>←</Link>
        <h1 style={{ color: '#FFF', fontSize: '15px', fontWeight: '900', letterSpacing: '1px' }}>ABOUT US</h1>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: '#F6FFF8', border: `2px solid ${HOT_GREEN}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#111', lineHeight: '1.3', marginBottom: '12px' }}>
            Looking for an experienced, innovative PR team to elevate your book?
          </h2>
          <p style={{ fontSize: '13.5px', color: '#333', lineHeight: '1.6', fontWeight: '500' }}>
            For decades, <span style={{ fontWeight: '900', color: HOT_GREEN }}>Books Forward</span> has exemplified excellence in book marketing and promotion, with over <b>1,200 authors</b> entrusting our team to advance their writing careers.
          </p>
        </div>

        <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.7', marginBottom: '20px' }}>
          We prioritize transparency alongside creativity, executing ambitious campaigns that offer limitless possibilities for generating media coverage, growing readerships and standing out amidst the <b>3,000 daily book releases</b>. Our proven track record includes representing New York Times bestsellers, national award-winning books and buzz-worthy stories featured across various platforms and social media outlets. With a global reach, we collaborate with esteemed publishers and authors from <b>50 states and seven countries</b>.
        </p>

        <h3 style={{ fontSize: '14px', fontWeight: '900', color: HOT_GREEN, margin: '24px 0 12px' }}>HERE'S WHAT WE'VE ACHIEVED WITH OUR AUTHORS:</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            'Helped indie authors secure traditional publishing deals',
            'Guided authors to New York Times and USA Today bestseller status',
            'Championed books to become Indie Next Picks (selected by booksellers)',
            'Elevated nonfiction authors into authoritative brands',
            'Expanded U.S. releases into international markets',
            'Designed rogue, high-impact campaigns that defy convention',
            'Secured award wins for authors across genres',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', background: '#fff', border: '1px solid #E9E9E9', borderRadius: '12px', padding: '12px 14px' }}>
              <span style={{ width: '28px', height: '28px', background: HOT_GREEN, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* IMAGE 1 */}
        <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: `2px solid ${HOT_GREEN}`, marginBottom: '24px' }}>
          <img src="/book1.jpg" alt="" style={{ width: '100%', display: 'block' }} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: '900', color: HOT_GREEN, marginBottom: '12px' }}>Let us help you exceed your goals.</h2>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: HOT_GREEN, marginBottom: '12px' }}>You want to sell books, convey a message or build your platform? Marketing your book is a key step in achieving these objectives.</h3>
        <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.7', marginBottom: '28px' }}>
          Our full-service author publicity and book marketing firm crafts winning campaigns that blend proven methods with fresh approaches. Our team consists of avid readers and researchers who specialize in media relations, brand development, online book optimization, social media campaigns and website management, specifically for the book publishing industry.
        </p>

        {/* 2 IMAGES STACKED - NO BOUNDARY - BEACH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '28px' }}>
          <img src="/book2.jpg" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
          <img src="/book3.jpg" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* TESTIMONIAL + LOCATION */}
        <div style={{ background: '#F9F9F9', borderRadius: '16px', padding: '20px', borderLeft: `4px solid ${HOT_GREEN}`, marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: '#222', lineHeight: '1.7', fontStyle: 'italic', fontWeight: '500', marginBottom: '16px' }}>
            "Books Forward's enthusiasm, creativity, big-picture thinking, connections and passion for the project have been invaluable in introducing the book to important audiences I could not have reached otherwise."
          </p>
          <p style={{ fontSize: '13px', fontWeight: '900', color: '#000' }}>Andrew Maraniss</p>
          <p style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>New York Times bestselling author of Strong Inside</p>
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: '900', color: HOT_GREEN, marginBottom: '10px' }}>Located in:</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
          {['New Orleans, LA','Nashville, TN','Atlanta, GA','Australia','Denver, CO','Washington, D.C.'].map(loc=>(
            <div key={loc} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', background: HOT_GREEN, borderRadius: '50%' }}></span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{loc}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#111', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
          <p style={{ color: HOT_GREEN, fontSize: '16px', fontWeight: '900', marginBottom: '6px' }}>Books Forward</p>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>Phone: (615) 212-8549</p>
        </div>
      </div>
    </main>
  )
}