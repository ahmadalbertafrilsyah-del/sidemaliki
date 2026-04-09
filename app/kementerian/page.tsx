"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";

// IMPORT KOMPONEN MODAL
import ModalTambahKeuangan from "@/components/ModalTambahKeuangan";
import ModalTambahInventaris from "@/components/ModalTambahInventaris";
import ModalTambahSurat from "@/components/ModalTambahSurat";

export default function DashboardKementerian() {
  const router = useRouter();
  
  // State Navigasi Utama Sidebar
  const [activeSidebar, setActiveSidebar] = useState("info"); 
  
  // State Navigasi Sub-Tab
  const [activeSubTabSurat, setActiveSubTabSurat] = useState("masuk"); 
  const [activeSubTabKeu, setActiveSubTabKeu] = useState("bank"); 
  const [activeSubTabInv, setActiveSubTabInv] = useState("rekap"); 

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Data Firebase
  const [suratMasuk, setSuratMasuk] = useState<any[]>([]);
  const [suratKeluar, setSuratKeluar] = useState<any[]>([]);
  const [keuangan, setKeuangan] = useState<any[]>([]);
  const [inventaris, setInventaris] = useState<any[]>([]);

  // STATE KONTROL MODAL
  const [isModalKeuOpen, setIsModalKeuOpen] = useState(false);
  const [kategoriKeu, setKategoriKeu] = useState("Bank");
  const [isModalInvOpen, setIsModalInvOpen] = useState(false);
  const [tipeInv, setTipeInv] = useState("Rekap");
  const [isModalSuratOpen, setIsModalSuratOpen] = useState(false);
  const [tipeSurat, setTipeSurat] = useState("Masuk");

  // STATE UNTUK DATA CMS (PROFIL ORGANISASI)
  const [cmsData, setCmsData] = useState({
    grandDesign: "Memuat informasi...",
    visi: "Memuat visi...",
    misi: "Memuat misi...",
    poPptaFileName: "",
    poPptaUrl: ""
  });

  // STATE ASISTEN AI (TABS)
  const [aiTab, setAiTab] = useState("smartletter"); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(""); // Menampung jawaban dari Gemini
  const [pdfSplitNames, setPdfSplitNames] = useState(""); 
  
  // State Input AI 
  const [targetOrg, setTargetOrg] = useState("");
  const [konteksIsu, setKonteksIsu] = useState("");
  const [notulenJudul, setNotulenJudul] = useState("");
  const [notulenTempat, setNotulenTempat] = useState("");

  const currentUserScope = typeof window !== 'undefined' ? localStorage.getItem("userScope") || "" : ""; 
  const currentUserName = typeof window !== 'undefined' ? localStorage.getItem("userName") || "Kementerian" : "Kementerian";

  useEffect(() => {
    if (!currentUserScope && typeof window !== 'undefined') {
      alert("Anda belum login! Silakan login terlebih dahulu.");
      router.push("/login");
    }
  }, [currentUserScope, router]);

  useEffect(() => {
    if (!currentUserScope) return;
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString("id-ID")), 1000);

    const unsubSM = onSnapshot(query(collection(db, "surat_masuk"), where("scope", "==", currentUserScope)), (snapshot) => {
      setSuratMasuk(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSK = onSnapshot(query(collection(db, "surat_keluar"), where("scope", "==", currentUserScope)), (snapshot) => {
      setSuratKeluar(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubKeu = onSnapshot(query(collection(db, "keuangan"), where("scope", "==", currentUserScope)), (snapshot) => {
      setKeuangan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a:any, b:any) => new Date(a.tgl).getTime() - new Date(b.tgl).getTime()));
    });
    const unsubInv = onSnapshot(query(collection(db, "inventaris"), where("scope", "==", currentUserScope)), (snapshot) => {
      setInventaris(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubWeb = onSnapshot(doc(db, "pengaturan", "beranda"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCmsData({
          grandDesign: data.grandDesign || "Belum ada data Grand Design.",
          visi: data.visi || "Belum ada data Visi.",
          misi: data.misi || "Belum ada data Misi.",
          poPptaFileName: data.poPptaFileName || "",
          poPptaUrl: data.poPptaUrl || ""
        });
      }
    });

    return () => { clearInterval(timer); unsubSM(); unsubSK(); unsubKeu(); unsubInv(); unsubWeb(); };
  }, [currentUserScope]);

  const handleLogout = () => {
    if (confirm("Keluar dari sistem?")) {
      localStorage.clear();
      router.push("/login");
    }
  };

  const formatRp = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);
  };

  // ========================================================
  // FUNGSI PEMANGGILAN API ROUTE (GEMINI AI SUNGGUHAN!)
  // ========================================================
  const triggerAiProcess = async (actionType: string) => {
    setIsAiLoading(true);
    setAiResponse(""); // Kosongkan response lama
    
    let payloadData = {};

    // Siapkan data yang mau dikirim ke Gemini berdasarkan tab
    if (actionType === "renstra") {
      if (!targetOrg) return alert("Nama Organisasi Target belum diisi!");
      payloadData = { 
        organisasi: targetOrg, 
        visi: cmsData.visi, 
        misi: cmsData.misi, 
        konteks: konteksIsu 
      };
    } else if (actionType === "notulen") {
      payloadData = { 
        judul: notulenJudul, 
        lokasi: notulenTempat, 
        teksKasar: "Bismillah. Rapat tadi bahas soal pensi. Kata ketua harus ada 3 divisi: acara, humas, logistik. Humas tolong cari media partner, acara siapkan rundown besok sore. Logistik mulai list barang. Udah itu aja, target kelar minggu depan." 
        // Catatan: Teks kasar ini simulasi OCR dari gambar. 
      };
    } else if (actionType === "smartletter") {
       // Catatan: Idealnya file pdf diekstrak dulu teksnya di frontend menggunakan pdf.js
       payloadData = { teksSurat: "Nomor: 01/DEMA/UIN/2026. Hal: Undangan. Dengan hormat, kami mengundang..." }; 
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          payload: payloadData
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAiResponse(data.result);
      } else {
        alert(`AI Error: ${data.error}`);
      }
    } catch (error) {
      alert("Gagal terhubung ke API AI. Pastikan file route.ts sudah dibuat.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const totalSaldo = keuangan.reduce((acc, curr) => curr.jenis === "Masuk" ? acc + Number(curr.nom) : acc - Number(curr.nom), 0);
  let saldoBankBerjalan = 0;
  let saldoOpsBerjalan = 0;

  const openModalKeu = (kat: string) => { setKategoriKeu(kat); setIsModalKeuOpen(true); };
  const openModalInv = (tipe: string) => { setTipeInv(tipe); setIsModalInvOpen(true); };
  const openModalSurat = (tipe: string) => { setTipeSurat(tipe); setIsModalSuratOpen(true); };

  return (
    <div>
      <style>{`
        body { font-family: 'Arial', sans-serif; background-color: #f1f5f9; margin: 0; overflow-x: hidden; }
        .sidebar { width: 280px; height: 100vh; position: fixed; top: 0; left: 0; background: #003399; color: white; z-index: 1040; transition: 0.4s; overflow-y: auto; }
        .sidebar-brand { height: 90px; display: flex; align-items: center; padding: 0 25px; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-logo { width: 45px; height: 45px; border-radius: 50%; object-fit: contain; background: white; padding: 2px;}
        .sidebar-menu { list-style: none; padding: 20px 15px; margin: 0; }
        .sidebar-menu .nav-link { display: flex; align-items: center; padding: 12px 15px; color: rgba(255,255,255,0.8); text-decoration: none; border-radius: 12px; cursor: pointer; margin-bottom: 5px; font-size: 0.95rem; gap: 15px; }
        .sidebar-menu .nav-link:hover, .sidebar-menu .nav-link.active { background: rgba(255,255,255,0.2); color: #fff; font-weight: 600; border-left: 4px solid #FFCC00; }
        
        .main-header { position: fixed; top: 0; left: 280px; right: 0; height: 70px; background: #ffffff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; transition: 0.4s; border-bottom: 1px solid #e2e8f0; }
        .content-wrapper { margin-top: 70px; margin-left: 280px; padding: 25px; transition: 0.4s; min-height: 100vh; }
        .info-box { background: #ffffff; border-radius: 16px; padding: 20px; display: flex; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; height: 100%; }
        .icon-circle { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-right: 15px; flex-shrink: 0; color: white; }
        
        .bg-gradient-blue { background: linear-gradient(135deg, #003399, #005ce6); }
        .bg-gradient-yellow { background: linear-gradient(135deg, #FFCC00, #ffdb4d); color: #000 !important; }
        .bg-gradient-green { background: linear-gradient(135deg, #10b981, #059669); }
        .bg-gradient-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
        
        .ai-tabs .nav-link { color: #64748b; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 20px; font-weight: 600; margin-right: 10px; cursor: pointer; transition: 0.3s; }
        .ai-tabs .nav-link:hover { border-color: #3b82f6; color: #3b82f6; }
        .ai-tabs .nav-link.active { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-color: transparent; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }

        .upload-area { border: 2px dashed #cbd5e1; border-radius: 15px; padding: 40px 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: 0.3s; }
        .upload-area:hover { border-color: #3b82f6; background: #eff6ff; }

        .sidebar-heading { padding: 10px 20px 5px; font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-top: 10px; }

        .mobile-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1030; display: none; backdrop-filter: blur(2px); }
        @media (max-width: 992px) { .sidebar { transform: translateX(-100%); } .sidebar.active { transform: translateX(0); } .main-header { left: 0; } .content-wrapper { margin-left: 0; } .sidebar.active ~ .mobile-overlay { display: block; } }
      `}</style>

      <aside className={`sidebar ${isSidebarOpen ? "active" : ""}`}>
        <div className="sidebar-brand">
          <img src="/logo-dema.png" alt="Logo" className="sidebar-logo" />
          <div className="d-flex flex-column">
            <span className="fw-bold text-truncate" style={{ lineHeight: 1.2, maxWidth: "160px" }}>{currentUserName}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8, textTransform: "uppercase" }}>{currentUserScope}</span>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li><a className={`nav-link ${activeSidebar === "info" ? "active" : ""}`} onClick={() => setActiveSidebar("info")}><i className="fas fa-home"></i> <span>Beranda</span></a></li>
          
          <li className="sidebar-heading">Data Administrasi</li>
          <li><a className={`nav-link ${activeSidebar === "surat" ? "active" : ""}`} onClick={() => setActiveSidebar("surat")}><i className="fas fa-envelope"></i> <span>Persuratan</span></a></li>
          <li><a className={`nav-link ${activeSidebar === "keuangan" ? "active" : ""}`} onClick={() => setActiveSidebar("keuangan")}><i className="fas fa-wallet"></i> <span>Keuangan</span></a></li>
          <li><a className={`nav-link ${activeSidebar === "inventaris" ? "active" : ""}`} onClick={() => setActiveSidebar("inventaris")}><i className="fas fa-box"></i> <span>Inventaris</span></a></li>

          <li className="sidebar-heading">Alat Bantu Organisasi</li>
          <li><a className={`nav-link ${activeSidebar === "ai" ? "active" : ""}`} onClick={() => setActiveSidebar("ai")}><i className="fas fa-robot text-warning"></i> <span>Asisten AI</span></a></li>
          <li><a className={`nav-link ${activeSidebar === "proker" ? "active" : ""}`} onClick={() => setActiveSidebar("proker")}><i className="fas fa-calendar-alt"></i> <span>Program Kerja</span></a></li>
          <li><a className={`nav-link ${activeSidebar === "presensi" ? "active" : ""}`} onClick={() => setActiveSidebar("presensi")}><i className="fas fa-qrcode"></i> <span>Daftar Hadir</span></a></li>
          <li><a className={`nav-link ${activeSidebar === "formulir" ? "active" : ""}`} onClick={() => setActiveSidebar("formulir")}><i className="fas fa-wpforms"></i> <span>Formulir Dinamis</span></a></li>
          
          <li><a className="nav-link text-warning mt-4" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> <span>Keluar</span></a></li>
        </ul>
      </aside>

      {isSidebarOpen && <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <header className="main-header shadow-sm">
        <div className="d-flex align-items-center">
          <button className="btn btn-light d-lg-none me-3 border" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="d-none d-md-block text-primary fw-bold bg-light px-3 py-1 rounded small border"><i className="far fa-clock me-2"></i> {currentTime || "Memuat waktu..."}</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-sm-block">
            <h6 className="m-0 fw-bold text-primary">{currentUserName}</h6>
            <small className="text-muted">Kementerian</small>
          </div>
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: "40px", height: "40px" }}>KM</div>
        </div>
      </header>

      <div className="content-wrapper">
        
        {/* --- MENU: BERANDA / INFO --- */}
        {activeSidebar === "info" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Beranda Ruang Kerja</h4>
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4" style={{ background: "linear-gradient(135deg, #003399, #002266)", color: "white" }}>
              <div className="row g-4 align-items-center">
                <div className="col-lg-6 border-end border-secondary border-opacity-50">
                  <h6 className="fw-bold text-warning mb-2"><i className="fas fa-bullhorn me-2"></i>Grand Design DEMA</h6>
                  <p className="fst-italic mb-0" style={{ fontSize: "0.95rem", opacity: 0.9 }}>"{cmsData.grandDesign}"</p>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <h6 className="fw-bold text-info mb-1"><i className="fas fa-eye me-2"></i>Visi</h6>
                    <p className="mb-0 small opacity-75 text-truncate" title={cmsData.visi}>{cmsData.visi}</p>
                  </div>
                  <div>
                    <h6 className="fw-bold text-success mb-1"><i className="fas fa-bullseye me-2"></i>Misi Utama</h6>
                    <p className="mb-0 small opacity-75 text-truncate" title={cmsData.misi}>{cmsData.misi.split('\n')[0]}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-6 col-md-3"><div className="info-box border-0 shadow-sm"><div className="icon-circle bg-gradient-blue"><i className="fas fa-inbox"></i></div><div><small className="fw-bold text-muted">S. MASUK</small><h4 className="fw-bold m-0">{suratMasuk.length}</h4></div></div></div>
              <div className="col-6 col-md-3"><div className="info-box border-0 shadow-sm"><div className="icon-circle bg-gradient-yellow text-dark"><i className="fas fa-paper-plane"></i></div><div><small className="fw-bold text-muted">S. KELUAR</small><h4 className="fw-bold m-0">{suratKeluar.length}</h4></div></div></div>
              <div className="col-12 col-md-3"><div className="info-box border-0 shadow-sm"><div className="icon-circle bg-gradient-green"><i className="fas fa-wallet"></i></div><div><small className="fw-bold text-muted">SALDO KAS</small><h4 className="fw-bold text-success m-0">{formatRp(totalSaldo)}</h4></div></div></div>
              <div className="col-12 col-md-3"><div className="info-box border-0 shadow-sm"><div className="icon-circle bg-gradient-red"><i className="fas fa-box"></i></div><div><small className="fw-bold text-muted">ASET INV</small><h4 className="fw-bold text-danger m-0">{inventaris.length}</h4></div></div></div>
            </div>
          </div>
        )}

        {/* --- MENU: PERSURATAN --- */}
        {activeSidebar === "surat" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Buku Persuratan</h4>
            <ul className="nav nav-pills mb-3 gap-2">
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabSurat === "masuk" ? "active" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabSurat("masuk")}>Surat Masuk</button></li>
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabSurat === "keluar" ? "active btn-warning text-dark" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabSurat("keluar")}>Surat Keluar</button></li>
            </ul>

            {activeSubTabSurat === "masuk" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-primary">Data Surat Masuk</span>
                  <button className="btn btn-sm btn-primary shadow-sm" onClick={() => openModalSurat("Masuk")}><i className="fas fa-plus"></i> Tambah Surat</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>No</th><th>Asal</th><th>Tgl Buat</th><th>Tgl Terima</th><th>Perihal</th><th>File</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {suratMasuk.length === 0 ? <tr><td colSpan={7} className="text-center py-4 text-muted">Belum ada data</td></tr> : 
                        suratMasuk.map(s => (
                          <tr key={s.id}><td>{s.no}</td><td className="fw-bold">{s.asal || s.asalTujuan}</td><td>{s.tgl_buat}</td><td>{s.tgl_datang || s.tgl_proses}</td><td>{s.hal}</td>
                            <td>{s.link_drive ? <a href={s.link_drive} target="_blank" className="btn btn-sm btn-outline-primary rounded-pill"><i className="fab fa-google-drive"></i></a> : '-'}</td>
                            <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTabSurat === "keluar" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-warning">Data Surat Keluar</span>
                  <button className="btn btn-sm btn-warning text-dark fw-bold shadow-sm" onClick={() => openModalSurat("Keluar")}><i className="fas fa-plus"></i> Tambah Surat</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>No</th><th>Tujuan</th><th>Tgl Buat</th><th>Tgl Kirim</th><th>Perihal</th><th>File</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {suratKeluar.length === 0 ? <tr><td colSpan={7} className="text-center py-4 text-muted">Belum ada data</td></tr> : 
                        suratKeluar.map(s => (
                          <tr key={s.id}><td>{s.no}</td><td className="fw-bold">{s.tujuan || s.asalTujuan}</td><td>{s.tgl_buat}</td><td>{s.tgl_kirim || s.tgl_proses}</td><td>{s.hal}</td>
                            <td>{s.link_drive ? <a href={s.link_drive} target="_blank" className="btn btn-sm btn-outline-warning rounded-pill text-dark"><i className="fab fa-google-drive"></i></a> : '-'}</td>
                            <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MENU: KEUANGAN --- */}
        {activeSidebar === "keuangan" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Laporan Keuangan</h4>
            <ul className="nav nav-pills mb-3 gap-2">
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabKeu === "bank" ? "active" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabKeu("bank")}>Kas Bank</button></li>
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabKeu === "ops" ? "active btn-warning text-dark" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabKeu("ops")}>Operasional</button></li>
            </ul>

            {activeSubTabKeu === "bank" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-success">Laporan Kas Bank</span>
                  <button className="btn btn-sm btn-info text-white shadow-sm fw-bold" onClick={() => openModalKeu("Bank")}><i className="fas fa-plus"></i> Tambah Transaksi</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>Tgl</th><th>Uraian</th><th>Debit</th><th>Kredit</th><th>Saldo</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {keuangan.filter(k => k.cat === "Bank").length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada transaksi</td></tr> : 
                        keuangan.filter(k => k.cat === "Bank").map(k => {
                          const debit = k.jenis === "Masuk" ? Number(k.nom) : 0;
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          saldoBankBerjalan += (debit - kredit);
                          return (
                            <tr key={k.id}>
                              <td>{k.tgl}</td>
                              <td>{k.uraian}</td>
                              <td className="text-success">{formatRp(debit)}</td>
                              <td className="text-danger">{formatRp(kredit)}</td>
                              <td className="fw-bold">{formatRp(saldoBankBerjalan)}</td>
                              <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTabKeu === "ops" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-warning">Laporan Operasional</span>
                  <button className="btn btn-sm btn-warning text-dark fw-bold shadow-sm" onClick={() => openModalKeu("Operasional")}><i className="fas fa-plus"></i> Tambah Pengeluaran</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>Tgl</th><th>Uraian</th><th>PJ</th><th>Qty</th><th>Harga</th><th>Total</th><th>Debit</th><th>Kredit</th><th>Saldo</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {keuangan.filter(k => k.cat === "Operasional").length === 0 ? <tr><td colSpan={10} className="text-center py-4 text-muted">Belum ada transaksi ops</td></tr> : 
                        keuangan.filter(k => k.cat === "Operasional").map(k => {
                          const debit = k.jenis === "Masuk" ? Number(k.nom) : 0;
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          saldoOpsBerjalan += (debit - kredit);
                          return (
                            <tr key={k.id}>
                              <td>{k.tgl}</td><td>{k.uraian}</td><td>{k.pj || "-"}</td><td>{k.qty || "-"}</td>
                              <td>{k.hrg ? formatRp(k.hrg) : "-"}</td><td>{k.qty && k.hrg ? formatRp(k.qty * k.hrg) : "-"}</td>
                              <td className="text-success">{formatRp(debit)}</td>
                              <td className="text-danger">{formatRp(kredit)}</td>
                              <td className="fw-bold">{formatRp(saldoOpsBerjalan)}</td>
                              <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MENU: INVENTARIS --- */}
        {activeSidebar === "inventaris" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Manajemen Inventaris</h4>
            <ul className="nav nav-pills mb-3 gap-2">
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabInv === "rekap" ? "active" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabInv("rekap")}>Rekapitulasi</button></li>
              <li className="nav-item"><button className={`nav-link btn-sm ${activeSubTabInv === "buku" ? "active btn-warning text-dark" : "bg-white border text-dark"}`} onClick={() => setActiveSubTabInv("buku")}>Buku Inv.</button></li>
            </ul>

            {activeSubTabInv === "rekap" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                 <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-danger">Rekapitulasi Aset</span>
                  <button className="btn btn-sm btn-danger shadow-sm" onClick={() => openModalInv("Rekap")}><i className="fas fa-plus"></i> Tambah Aset</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>Barang</th><th>Merk</th><th>Tahun</th><th>Jml</th><th>Kondisi</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {inventaris.filter(i => i.type === "Rekap").length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada aset</td></tr> : 
                        inventaris.filter(i => i.type === "Rekap").map(i => (
                          <tr key={i.id}>
                            <td className="fw-bold">{i.nama}</td><td>{i.merk || "-"}</td><td>{i.thn || "-"}</td><td><span className="badge bg-secondary">{i.jml}</span></td>
                            <td>{i.cond === "Baik" ? <span className="badge bg-success">Baik</span> : <span className="badge bg-danger">{i.cond}</span>}</td>
                            <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MENU BARU: ASISTEN AI --- */}
        {activeSidebar === "ai" && (
          <div className="animate-fade-in-up">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-info bg-opacity-10 text-info rounded p-2 me-3"><i className="fas fa-robot fa-2x"></i></div>
              <div>
                <h4 className="fw-bolder m-0" style={{ color: "#0f172a" }}>Asisten Administrasi AI</h4>
                <p className="text-muted m-0 small">Kumpulan alat cerdas untuk mempercepat pekerjaan sekretaris Kementerian.</p>
              </div>
            </div>

            {/* TAB NAVIGASI ASISTEN AI */}
            <div className="d-flex flex-wrap ai-tabs mb-4 gap-2">
              <a className={`nav-link ${aiTab === "smartletter" ? "active" : ""}`} onClick={() => setAiTab("smartletter")}><i className="fas fa-search me-2"></i>Cek PPTA</a>
              <a className={`nav-link ${aiTab === "notulen" ? "active" : ""}`} onClick={() => setAiTab("notulen")}><i className="fas fa-pen-fancy me-2"></i>Notulen</a>
              <a className={`nav-link ${aiTab === "ttd" ? "active" : ""}`} onClick={() => setAiTab("ttd")}><i className="fas fa-signature me-2"></i>Sign & Stamp</a>
              <a className={`nav-link ${aiTab === "pdf" ? "active" : ""}`} onClick={() => setAiTab("pdf")}><i className="fas fa-file-pdf me-2"></i>PDF Splitter Pro</a>
              <a className={`nav-link ${aiTab === "renstra" ? "active" : ""}`} onClick={() => setAiTab("renstra")}><i className="fas fa-sitemap me-2"></i>RenstraGen AI</a>
            </div>

            {/* TAB SMARTLETTER */}
            {aiTab === "smartletter" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 animate-fade-in-up">
                <div className="text-center mb-4">
                  <h3 className="fw-bolder mb-2">Analisis Surat Standar <span className="text-primary">PO-PPTA</span></h3>
                  <p className="text-muted">Sistem otomatis berbasis AI untuk memeriksa kesesuaian Margin, Ukuran Kertas, Font, dan Penomoran Surat Kementerian Anda terhadap Pedoman Organisasi.</p>
                  
                  {cmsData.poPptaUrl ? (
                    <a href={cmsData.poPptaUrl} target="_blank" rel="noreferrer" className="badge bg-success text-white border p-2 shadow-sm text-decoration-none">
                      <i className="fas fa-check-circle me-1"></i> Standar PO-PPTA Aktif: {cmsData.poPptaFileName}
                    </a>
                  ) : (
                    <span className="badge bg-warning text-dark border p-2">BPH belum mengunggah file acuan PO-PPTA.</span>
                  )}
                  
                  <div className="d-flex justify-content-center gap-3 mt-3">
                    <span className="badge bg-light text-dark border p-2"><i className="fas fa-check text-primary me-1"></i> Margin 2.56cm & F4</span>
                    <span className="badge bg-light text-dark border p-2"><i className="fas fa-check text-primary me-1"></i> Kop Surat Sesuai</span>
                    <span className="badge bg-light text-dark border p-2"><i className="fas fa-check text-primary me-1"></i> Validasi Penomoran</span>
                  </div>
                </div>
                
                <div className="upload-area mx-auto" style={{ maxWidth: "600px" }}>
                  <i className="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                  <h5 className="fw-bold">Klik untuk upload surat Anda</h5>
                  <p className="text-muted small">Format: PDF (Max 10MB)<br/>Pastikan scan surat terlihat jelas agar analisis AI akurat.</p>
                  <input type="file" className="form-control d-none" id="upload-smartletter-kem" accept=".pdf" />
                  <button className="btn btn-outline-primary mt-2" onClick={() => document.getElementById('upload-smartletter-kem')?.click()}>Pilih File Surat</button>
                </div>

                {aiResponse && (
                  <div className="alert alert-info mt-4 mx-auto" style={{ maxWidth: "600px" }}>
                    <h6 className="fw-bold"><i className="fas fa-robot me-2"></i>Hasil Analisis AI:</h6>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>{aiResponse}</div>
                  </div>
                )}
                
                <div className="text-center mt-4">
                  <button className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow" onClick={() => triggerAiProcess("smartletter")} disabled={isAiLoading || !cmsData.poPptaUrl}>
                    {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Menganalisis...</> : "Mulai Analisis AI"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB NOTULEN AI */}
            {aiTab === "notulen" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 animate-fade-in-up">
                <div className="text-center mb-4">
                  <h3 className="fw-bolder mb-2">Ubah Tulisan Jadi Digital</h3>
                  <p className="text-muted">Upload foto catatan rapat atau teks kasar, biarkan AI merapikan formatnya menjadi notulensi profesional standar KBBI.</p>
                </div>
                
                <div className="row g-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Judul Rapat</label>
                    <input type="text" className="form-control" placeholder="Contoh: Rapat Pleno Kementerian" value={notulenJudul} onChange={(e) => setNotulenJudul(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Tempat/Lokasi</label>
                    <input type="text" className="form-control" placeholder="Ruang Meeting Sekretariat" value={notulenTempat} onChange={(e) => setNotulenTempat(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Upload Foto Catatan / Hasil Transkrip</label>
                    <div className="upload-area p-4">
                      <i className="fas fa-image fa-2x text-secondary mb-2"></i>
                      <p className="m-0 small text-muted">Upload file JPG/PNG atau Ketik teks kasarnya di sini</p>
                    </div>
                  </div>
                </div>

                {aiResponse && (
                  <div className="alert alert-info mt-4 mx-auto" style={{ maxWidth: "800px" }}>
                    <h6 className="fw-bold"><i className="fas fa-robot me-2"></i>Draf Notulensi AI:</h6>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>{aiResponse}</div>
                  </div>
                )}
                
                <div className="text-center mt-4">
                  <button className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow" onClick={() => triggerAiProcess("notulen")} disabled={isAiLoading}>
                     {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Merapikan Teks...</> : "Generate Notulen KBBI"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB SIGN & STAMP */}
            {aiTab === "ttd" && (
              <div className="card border-0 shadow-sm rounded-4 p-0 overflow-hidden animate-fade-in-up">
                <div className="row g-0">
                  <div className="col-md-4 border-end bg-light p-4">
                    <h6 className="fw-bold mb-4 text-primary">Aset Tanda Tangan & Stempel</h6>
                    
                    <label className="small fw-bold mb-2">Tanda Tangan Menteri</label>
                    <div className="upload-area p-3 mb-3 bg-white" style={{ padding: "15px" }}>
                      <i className="fas fa-upload text-muted"></i> <span className="small text-muted ms-1">Click to upload</span>
                    </div>

                    <label className="small fw-bold mb-2">Tanda Tangan Sekmen</label>
                    <div className="upload-area p-3 mb-3 bg-white" style={{ padding: "15px" }}>
                      <i className="fas fa-upload text-muted"></i> <span className="small text-muted ms-1">Click to upload</span>
                    </div>

                    <label className="small fw-bold mb-2">Stempel Kementerian</label>
                    <div className="upload-area p-3 bg-white" style={{ padding: "15px" }}>
                      <i className="fas fa-upload text-muted"></i> <span className="small text-muted ms-1">Click to upload</span>
                    </div>
                  </div>
                  <div className="col-md-8 p-5 text-center d-flex flex-column align-items-center justify-content-center">
                    <div className="upload-area w-100 border-0" style={{ background: "transparent" }}>
                      <div className="bg-white rounded-circle shadow-sm d-inline-flex align-items-center justify-content-center mb-3" style={{ width: "80px", height: "80px" }}>
                        <i className="fas fa-file-pdf fa-2x text-primary"></i>
                      </div>
                      <h4 className="fw-bold">Upload Dokumen Master</h4>
                      <p className="text-muted small">Upload file PDF untuk mulai membubuhkan tanda tangan dan stempel digital secara presisi.</p>
                      <button className="btn btn-primary rounded-pill px-4 mt-2" onClick={() => triggerAiProcess("ttd_stamp")}>Pilih File PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB PDF SPLITTER PRO (MENGGUNAKAN TEXTAREA) */}
            {aiTab === "pdf" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 animate-fade-in-up bg-light border">
                <div className="text-center mb-4">
                  <h3 className="fw-bolder mb-2">PDF Splitter Pro <span className="badge bg-secondary fs-6 align-middle ms-2">Secure Local</span></h3>
                  <p className="text-muted">Pisahkan halaman PDF massal (misal: Sertifikat) menjadi file satuan bernama sesuai daftar nama yang di-inputkan.</p>
                </div>
                
                <div className="row g-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <div className="col-md-6">
                    <div className="card border h-100 shadow-sm">
                      <div className="card-header bg-white fw-bold text-danger border-bottom-0 pt-3"><i className="fas fa-file-pdf me-2"></i>1. Upload File PDF Master</div>
                      <div className="card-body d-flex flex-column justify-content-center">
                        <p className="small text-muted mb-2">Pilih file PDF multi-halaman yang ingin dipisahkan.</p>
                        <div className="upload-area p-4 bg-white flex-grow-1 d-flex flex-column align-items-center justify-content-center">
                          <i className="fas fa-cloud-upload-alt text-muted mb-2 fa-2x"></i>
                          <p className="m-0 small fw-bold">Klik/Tarik PDF ke sini</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border h-100 shadow-sm">
                      <div className="card-header bg-white fw-bold text-success border-bottom-0 pt-3"><i className="fas fa-list-ol me-2"></i>2. Paste Daftar Nama File</div>
                      <div className="card-body">
                        <p className="small text-muted mb-2">Copy-Paste dari Excel/Word. <b>Setiap baris (Enter)</b> akan menjadi nama untuk satu halaman PDF.</p>
                        <textarea 
                          className="form-control" 
                          rows={6} 
                          placeholder="Ahmad Albert Afrilsyah&#10;Budi Santoso&#10;Siti Aminah..."
                          value={pdfSplitNames}
                          onChange={(e) => setPdfSplitNames(e.target.value)}
                        ></textarea>
                        {pdfSplitNames && (
                          <div className="mt-2 text-end small text-muted fw-bold text-primary">
                            {pdfSplitNames.split('\n').filter(n => n.trim() !== '').length} nama terdeteksi.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card mt-4 mx-auto border-primary" style={{ maxWidth: "800px", borderTopWidth: "4px" }}>
                  <div className="card-body text-center p-4">
                    <h5 className="fw-bold mb-2">Siap Memproses?</h5>
                    <p className="small text-muted mb-3">Sistem akan memecah PDF per halaman, menamainya secara berurutan sesuai daftar yang dimasukkan, dan membungkusnya dalam satu file ZIP.</p>
                    <button className="btn btn-primary px-5 py-2 fw-bold rounded shadow" onClick={() => triggerAiProcess("pdf_splitter")} disabled={isAiLoading}>
                      <i className="fas fa-bolt me-2"></i> Proses & Download ZIP
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB RENSTRA GEN AI */}
            {aiTab === "renstra" && (
              <div className="row justify-content-center animate-fade-in-up">
                <div className="col-lg-9">
                  <div className="card border-0 shadow-sm rounded-4 p-4" style={{ borderTop: "5px solid #0ea5e9" }}>
                    <div className="d-flex align-items-center mb-4 border-bottom pb-3">
                      <i className="fas fa-sitemap fa-2x text-info me-3"></i>
                      <div><h5 className="fw-bold m-0">Data Target Renstra</h5><p className="text-muted m-0 small">Sistem AI akan menganalisis Visi-Misi Induk untuk menyusun Program Kerja Kementerian Anda.</p></div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Nama Organisasi Target</label>
                      <input type="text" className="form-control" placeholder="Misal: Kementerian Luar Negeri" value={targetOrg} onChange={(e) => setTargetOrg(e.target.value)} />
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-info"><i className="fas fa-eye me-1"></i> Visi Induk (Otomatis dari BPH)</label>
                        <textarea className="form-control bg-light" rows={4} readOnly value={cmsData.visi}></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-info"><i className="fas fa-bullseye me-1"></i> Misi Induk (Otomatis dari BPH)</label>
                        <textarea className="form-control bg-light" rows={4} readOnly value={cmsData.misi}></textarea>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Konteks Isu Khusus Kementerian Anda</label>
                      <textarea className="form-control" rows={3} placeholder="Masukkan isu strategis yang ingin diselesaikan kementerian Anda pada periode ini..." value={konteksIsu} onChange={(e) => setKonteksIsu(e.target.value)}></textarea>
                    </div>

                    {aiResponse && (
                      <div className="alert alert-info mt-4">
                        <h6 className="fw-bold"><i className="fas fa-robot me-2"></i>Draf Renstra AI:</h6>
                        <div style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>{aiResponse}</div>
                      </div>
                    )}

                    <div className="text-end mt-4">
                      <button className="btn btn-info text-white px-5 py-2 fw-bold shadow-sm" onClick={() => triggerAiProcess("renstra")} disabled={isAiLoading}>
                        {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Menyusun Kerangka...</> : "Buat Renstra AI"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SECTION LAINNYA --- */}
        {(activeSidebar === "proker" || activeSidebar === "presensi" || activeSidebar === "formulir") && (
          <div className="animate-fade-in-up text-center py-5">
            <h4 className="text-primary fw-bold">Modul {activeSidebar.toUpperCase()}</h4>
            <p className="text-muted">Fitur ini akan segera ditambahkan.</p>
          </div>
        )}

      </div>

      {/* RENDER KOMPONEN MODAL SECARA KONDISIONAL */}
      {isModalSuratOpen && <ModalTambahSurat kementerianName={currentUserScope} tipe={tipeSurat} onClose={() => setIsModalSuratOpen(false)} />}
      {isModalKeuOpen && <ModalTambahKeuangan kementerianName={currentUserScope} kategori={kategoriKeu} onClose={() => setIsModalKeuOpen(false)} />}
      {isModalInvOpen && <ModalTambahInventaris kementerianName={currentUserScope} tipe={tipeInv} onClose={() => setIsModalInvOpen(false)} />}

    </div>
  );
}