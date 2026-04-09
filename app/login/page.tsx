"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Poppins } from "next/font/google";

// IMPORT FIREBASE
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const poppins = Poppins({ 
  weight: ['300', '400', '600', '800'], 
  subsets: ['latin'],
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. CEK AKUN MASTER (BPH INDUK) DI FIREBASE
      // Sistem mencari di koleksi khusus bernama "bph"
      const qBph = query(collection(db, "bph"), where("email", "==", email));
      const snapshotBph = await getDocs(qBph);

      if (!snapshotBph.empty) {
        let isBphSuccess = false;
        
        snapshotBph.forEach((doc) => {
          const data = doc.data();
          if (data.password === password) {
            isBphSuccess = true;
            // Simpan sesi BPH
            localStorage.setItem("userRole", "bph");
            localStorage.setItem("userName", data.nama || "Badan Pengurus Harian");
            router.push("/bph");
          }
        });

        if (isBphSuccess) return; // Jika berhasil login sbg BPH, hentikan fungsi di sini
        
        // Jika email ketemu tapi password salah
        setErrorMsg("Password BPH yang Anda masukkan salah!");
        setIsLoading(false);
        return; 
      }

      // 2. JIKA BUKAN BPH, CEK AKUN KEMENTERIAN DI FIREBASE
      const qKem = query(collection(db, "kementerian"), where("email", "==", email));
      const snapshotKem = await getDocs(qKem);

      if (snapshotKem.empty) {
        setErrorMsg("Email tidak terdaftar di sistem SIDEMALIKI!");
        setIsLoading(false);
        return;
      }

      let isKemSuccess = false;

      snapshotKem.forEach((doc) => {
        const data = doc.data();
        if (data.password === password) {
          isKemSuccess = true;
          // Simpan sesi Kementerian
          localStorage.setItem("userRole", "kementerian");
          localStorage.setItem("userScope", doc.id); 
          localStorage.setItem("userName", data.nama); 
          router.push("/kementerian"); 
        }
      });

      if (!isKemSuccess) {
        setErrorMsg("Password Kementerian yang Anda masukkan salah!");
      }

    } catch (error) {
      console.error("Error Login:", error);
      setErrorMsg("Terjadi kesalahan koneksi ke database.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`d-flex align-items-center justify-content-center vh-100 ${poppins.className}`} style={{ backgroundColor: "#1A1D20" }}>
      <div className="card border-0 shadow-lg p-4 p-md-5" style={{ maxWidth: "400px", width: "100%", backgroundColor: "#F8F9FA", borderRadius: "20px" }}>
        
        <div className="text-center mb-4">
          <img src="/icon.png" alt="Logo DEMA" width="80" className="mb-3" />
          <h4 className="fw-bolder mb-1" style={{ color: "#1A1A1A", letterSpacing: "-0.5px" }}>LOGIN SISTEM</h4>
          <p className="text-muted small">SIDEMALIKI - UIN Malang</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary">Email Instansi</label>
            <input
              type="email" className="form-control form-control-lg bg-light"
              placeholder="email@sidemaliki.or.id"
              value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ fontSize: "14px" }}
            />
          </div>
          
          <div className="mb-4">
            <label className="form-label small fw-bold text-secondary">Password</label>
            <input
              type="password" className="form-control form-control-lg bg-light"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ fontSize: "14px" }}
            />
          </div>

          {errorMsg && (
            <div className="alert alert-danger py-2 small text-center fw-bold animate-fade-in-up">
              <i className="fas fa-exclamation-circle me-1"></i> {errorMsg}
            </div>
          )}

          <button
            type="submit" className="btn w-100 fw-bold py-3 mb-3 border-0" disabled={isLoading}
            style={{
              background: "linear-gradient(135deg, #1A1D20, #343A40)", color: "#F5E6D3",
              borderRadius: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", transition: "all 0.3s"
            }}
          >
            {isLoading ? "MEMERIKSA DATA..." : "MASUK SEKARANG"}
          </button>
        </form>

        <div className="text-center">
          <Link href="/" className="text-decoration-none small text-muted fw-bold">
            <i className="fas fa-arrow-left me-1"></i> Kembali ke Halaman Utama
          </Link>
        </div>

      </div>
    </div>
  );
}