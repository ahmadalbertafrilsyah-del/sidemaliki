"use client"; // Diperlukan karena kita menggunakan useEffect dan useState

import { useState, useEffect } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";

// IMPORT FIREBASE
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// 1. SETUP FONT MODERN (POPPINS)
const poppins = Poppins({ 
  weight: ['300', '400', '600', '800'], 
  subsets: ['latin'],
  display: 'swap',
});

export default function HalamanUtama() {
  // Background gambar WA sesuai kodingan aslimu
  const linkBgIbb = "https://i.ibb.co.com/tMwWC3Sm/Gemini-Generated-Image-k5fcjrk5fcjrk5fc.png";

  // STATE UNTUK MENAMPUNG DATA CMS DARI BPH
  const [cmsData, setCmsData] = useState({
    grandDesign: "Memuat informasi...",
    visi: "Memuat visi...",
    misi: "Memuat misi...",
    proker: "Memuat program kerja..."
  });

  // MENARIK DATA DARI FIREBASE SECARA REALTIME
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "pengaturan", "beranda"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCmsData({
          grandDesign: data.grandDesign || "Belum ada data Grand Design.",
          visi: data.visi || "Belum ada data Visi.",
          misi: data.misi || "Belum ada data Misi.",
          proker: data.proker || "Belum ada Program Kerja bulan ini."
        });
      }
    });
    return () => unsub();
  }, []);

  return (
    <div
      className={`d-flex flex-column position-relative text-white ${poppins.className}`}
      style={{
        backgroundImage: `url(${linkBgIbb})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed", // Agar gambar tetap di tempat saat di-scroll
        backgroundRepeat: "no-repeat",
        minHeight: "100vh" // min-height agar bisa di-scroll jika konten panjang
      }}
    >
      {/* 2. SUNTIKAN CSS ANIMASI */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(224, 224, 224, 0.6); }
          70% { box-shadow: 0 0 20px 15px rgba(224, 224, 224, 0); }
          100% { box-shadow: 0 0 0 0 rgba(224, 224, 224, 0); }
        }

        .animate-fade-in-up {
          animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; 
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .btn-glow:hover {
          animation: pulseGlow 1.5s infinite;
          transform: translateY(-3px); 
        }
        
        .delay-100 { animation-delay: 0.2s; }
        .delay-200 { animation-delay: 0.4s; }
        .delay-300 { animation-delay: 0.6s; }
        .delay-400 { animation-delay: 0.8s; } /* Tambahan delay untuk profil */

        /* Style Glassmorphism untuk Card Informasi CMS */
        .glass-card {
          background: rgba(20, 24, 28, 0.65);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          transition: transform 0.3s ease;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .glass-card:hover { transform: translateY(-5px); background: rgba(20, 24, 28, 0.8); }
      `}</style>

      {/* OVERLAY GRADIENT: z-index 1 (Di belakang) */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          background: "linear-gradient(135deg, rgba(20, 24, 28, 0.92) 0%, rgba(100, 105, 110, 0.7) 100%)",
          zIndex: 1,
        }}
      ></div>

      {/* KONTEN UTAMA: z-index 10 (Sangat di depan agar menimpa overlay) */}
      <div className="container position-relative py-5" style={{ zIndex: 10 }}>
        
        {/* ====================================================== */}
        {/* BAGIAN ATAS (HERO SECTION - PERSIS SEPERTI ASLIMU) */}
        {/* ====================================================== */}
        <div className="row align-items-center justify-content-center text-center" style={{ minHeight: "85vh" }}>
          <div className="col-lg-8 col-xl-7">
            
            {/* Logo - Melayang (Float) */}
            <div 
              className="d-inline-block mb-4 p-3 rounded-circle shadow-lg animate-fade-in-up animate-float" 
              style={{ 
                background: "rgba(255, 255, 255, 0.05)", 
                backdropFilter: "blur(12px)", 
                border: "2px solid rgba(245, 230, 211, 0.5)"
              }}
            >
              <img
                src="https://i.ibb.co/CpVb7cK6/icon.png"
                alt="icon"
                width="120"
                height="120"
                style={{ objectFit: "contain", display: "block" }}
              />
            </div>

            {/* Judul - Warna Cream */}
            <h1
              className="display-4 fw-bolder mb-3 animate-fade-in-up delay-100"
              style={{
                letterSpacing: "-1px", 
                color: "#F5E6D3", 
                textShadow: "0 4px 15px rgba(0,0,0,0.6)" 
              }}
            >
              SIDE-MALIKI
            </h1>
            
            {/* Subjudul - Warna Light Silver */}
            <p 
              className="lead fs-5 mb-5 mx-auto animate-fade-in-up delay-200" 
              style={{ maxWidth: "600px", fontWeight: 300, color: "#E0E0E0" }}
            >
              Sistem Informasi dan Administrasi Digital DEMALIKI
              <span className="d-block small mt-2 fw-normal" style={{ color: "#C0C0C0" }}>
                UIN Maulana Malik Ibrahim Malang
              </span>
            </p>

            {/* Tombol - Gradien Silver Metalik */}
            <div className="d-grid d-sm-block gap-3 animate-fade-in-up delay-300 mb-5">
              <Link
                href="/login"
                className="btn btn-lg fw-bold py-3 px-5 border-0 btn-glow"
                style={{
                  background: "linear-gradient(135deg, #F8F9FA, #C0C0C0)",
                  color: "#1A1A1A", 
                  borderRadius: "50px", 
                  transition: "all 0.3s ease",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                }}
              >
                <i className="fas fa-sign-in-alt me-2"></i> 
                MASUK KE SISTEM
              </Link>
            </div>

            {/* Indikator Scroll ke Bawah */}
            <div className="animate-fade-in-up delay-400 mt-4 opacity-50 animate-float d-none d-md-block">
              <span className="small d-block mb-1" style={{ letterSpacing: "2px" }}>PROFIL ORGANISASI</span>
              <i className="fas fa-chevron-down fs-4"></i>
            </div>

          </div>
        </div>

        {/* ====================================================== */}
        {/* BAGIAN BAWAH (KONTEN CMS DARI FIREBASE) */}
        {/* ====================================================== */}
        <div className="row g-4 pt-5 pb-5 animate-fade-in-up delay-400">
          
          {/* Teks Grand Design (Tengah Atas) */}
          <div className="col-12 text-center mb-4">
            <h3 className="fw-bold mb-3" style={{ color: "#FFCC00" }}>
              <i className="fas fa-bullhorn me-2"></i>Grand Design
            </h3>
            <p className="lead fs-5 fst-italic" style={{ color: "#E0E0E0", maxWidth: "800px", margin: "0 auto", lineHeight: "1.6" }}>
              "{cmsData.grandDesign}"
            </p>
          </div>

          {/* Kartu Visi */}
          <div className="col-md-6">
            <div className="glass-card h-100">
              <div className="d-flex align-items-center mb-4 border-bottom border-secondary pb-3">
                <div className="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: "45px", height: "45px", background: "linear-gradient(135deg, #003399, #005ce6)" }}>
                  <i className="fas fa-eye text-white fs-5"></i>
                </div>
                <h4 className="fw-bold m-0" style={{ color: "#F5E6D3" }}>Visi DEMA</h4>
              </div>
              <p style={{ color: "#E0E0E0", lineHeight: "1.8", whiteSpace: "pre-line", fontSize: "1.05rem" }}>
                {cmsData.visi}
              </p>
            </div>
          </div>

          {/* Kartu Misi */}
          <div className="col-md-6">
            <div className="glass-card h-100">
              <div className="d-flex align-items-center mb-4 border-bottom border-secondary pb-3">
                <div className="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: "45px", height: "45px", background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <i className="fas fa-bullseye text-white fs-5"></i>
                </div>
                <h4 className="fw-bold m-0" style={{ color: "#F5E6D3" }}>Misi DEMA</h4>
              </div>
              <p style={{ color: "#E0E0E0", lineHeight: "1.8", whiteSpace: "pre-line", fontSize: "1.05rem" }}>
                {cmsData.misi}
              </p>
            </div>
          </div>

          {/* Kartu Program Kerja (Full Width di bawah) */}
          <div className="col-12 mt-3">
            <div className="glass-card text-center" style={{ borderLeft: "5px solid #FFCC00", borderRight: "5px solid #FFCC00" }}>
              <span className="badge bg-warning text-dark px-3 py-2 rounded-pill mb-3 fw-bold shadow-sm">
                <i className="fas fa-calendar-alt me-1"></i> PROGRAM KERJA BULAN INI
              </span>
              <h3 className="fw-bolder m-0" style={{ color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                {cmsData.proker}
              </h3>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}