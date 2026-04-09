"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, setDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import * as XLSX from "xlsx"; 

// IMPORT KOMPONEN MODAL UNTUK BPH
import ModalTambahSurat from "@/components/ModalTambahSurat";
import ModalTambahKeuangan from "@/components/ModalTambahKeuangan";
import ModalTambahInventaris from "@/components/ModalTambahInventaris";

interface Kementerian { id: string; nama: string; email: string; password?: string; }
interface Pengurus { nama: string; nim: string; jabatan: string; lembaga: string; }

export default function DashboardBPH() {
  const router = useRouter();
  
  const [activeMenu, setActiveMenu] = useState("dashboard"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // --- STATE DATABASE GLOBAL ---
  const [totalSurat, setTotalSurat] = useState(0);
  const [saldoKas, setSaldoKas] = useState(0);
  const [listKementerian, setListKementerian] = useState<Kementerian[]>([]);

  // --- STATE FORM BUAT AKUN KEMENTERIAN ---
  const [newKemId, setNewKemId] = useState("");
  const [newKemNama, setNewKemNama] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false); 

  // --- STATE "ADMINISTRASI BPH" ---
  const [bphSuratMasuk, setBphSuratMasuk] = useState<any[]>([]);
  const [bphSuratKeluar, setBphSuratKeluar] = useState<any[]>([]);
  const [bphKeuangan, setBphKeuangan] = useState<any[]>([]);
  const [bphInventaris, setBphInventaris] = useState<any[]>([]);

  const [adminSubTabSurat, setAdminSubTabSurat] = useState("masuk"); 
  const [adminSubTabKeu, setAdminSubTabKeu] = useState("bank"); 

  const [isModalSuratOpen, setIsModalSuratOpen] = useState(false);
  const [tipeSurat, setTipeSurat] = useState("Masuk");
  const [isModalKeuOpen, setIsModalKeuOpen] = useState(false);
  const [kategoriKeu, setKategoriKeu] = useState("Bank");
  const [isModalInvOpen, setIsModalInvOpen] = useState(false);
  const [tipeInv, setTipeInv] = useState("Rekap");

  // --- STATE "PANTAU DATA" (SPY VIEW) ---
  const [selectedKem, setSelectedKem] = useState<Kementerian | null>(null);
  const [detailTab, setDetailTab] = useState("surat");
  const [detailSuratMasuk, setDetailSuratMasuk] = useState<any[]>([]);
  const [detailSuratKeluar, setDetailSuratKeluar] = useState<any[]>([]);
  const [detailKeuangan, setDetailKeuangan] = useState<any[]>([]);
  const [detailInventaris, setDetailInventaris] = useState<any[]>([]);

  // --- STATE "PENGATURAN WEB" & KEPENGURUSAN ---
  const [webGrandDesign, setWebGrandDesign] = useState("");
  const [webVisi, setWebVisi] = useState("");
  const [webMisi, setWebMisi] = useState("");
  const [webProker, setWebProker] = useState("");
  
  // STATE KHUSUS UPLOAD FILE PDF PO-PPTA
  const [poPptaFileName, setPoPptaFileName] = useState(""); 
  const [poPptaFileUrl, setPoPptaFileUrl] = useState(""); 
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  
  const [linkGCal, setLinkGCal] = useState(""); 
  const [inputPengurusRaw, setInputPengurusRaw] = useState(""); 
  const [dataPengurus, setDataPengurus] = useState<Pengurus[]>([]); 
  const [excelFileName, setExcelFileName] = useState(""); 
  const [isSavingWeb, setIsSavingWeb] = useState(false);

  // --- STATE PROGRAM KERJA ---
  const [prokerTab, setProkerTab] = useState("umum"); 

  // --- STATE ASISTEN AI (TABS) ---
  const [aiTab, setAiTab] = useState("smartletter"); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(""); 
  const [pdfSplitNames, setPdfSplitNames] = useState(""); 
  
  // State Input AI Renstra
  const [targetOrg, setTargetOrg] = useState("");
  const [konteksIsu, setKonteksIsu] = useState("");
  const [notulenJudul, setNotulenJudul] = useState("");
  const [notulenTempat, setNotulenTempat] = useState("");

  const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : "";

  useEffect(() => {
    if (userRole !== "bph" && typeof window !== 'undefined') {
      alert("Akses ditolak! Anda bukan BPH.");
      router.push("/login");
    }
  }, [userRole, router]);

  useEffect(() => {
    if (userRole !== "bph") return;
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString("id-ID")), 1000);

    const unsubSuratAll = onSnapshot(collection(db, "surat_masuk"), snap => setTotalSurat(snap.size));
    const unsubKeuanganAll = onSnapshot(collection(db, "keuangan"), snap => {
      let total = 0;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.jenis === "Masuk") total += Number(d.nom) || 0;
        if (d.jenis === "Keluar") total -= Number(d.nom) || 0;
      });
      setSaldoKas(total);
    });
    const unsubKemAll = onSnapshot(collection(db, "kementerian"), snap => {
      setListKementerian(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Kementerian[]);
    });

    const unsubBphSM = onSnapshot(query(collection(db, "surat_masuk"), where("scope", "==", "bph")), snap => setBphSuratMasuk(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubBphSK = onSnapshot(query(collection(db, "surat_keluar"), where("scope", "==", "bph")), snap => setBphSuratKeluar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubBphKeu = onSnapshot(query(collection(db, "keuangan"), where("scope", "==", "bph")), snap => setBphKeuangan(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a:any, b:any) => new Date(a.tgl).getTime() - new Date(b.tgl).getTime())));
    const unsubBphInv = onSnapshot(query(collection(db, "inventaris"), where("scope", "==", "bph")), snap => setBphInventaris(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    const unsubWeb = onSnapshot(doc(db, "pengaturan", "beranda"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWebGrandDesign(data.grandDesign || "");
        setWebVisi(data.visi || "");
        setWebMisi(data.misi || "");
        setWebProker(data.proker || "");
        
        setPoPptaFileName(data.poPptaFileName || "");
        setPoPptaFileUrl(data.poPptaUrl || ""); 
        setLinkGCal(data.linkGCal || ""); 
        setDataPengurus(data.dataPengurus || []);
        
        if (data.dataPengurus) {
          const rawText = data.dataPengurus.map((p: Pengurus) => `${p.nama}\t${p.nim}\t${p.jabatan}\t${p.lembaga}`).join('\n');
          setInputPengurusRaw(rawText);
        }
      }
    });

    return () => { clearInterval(timer); unsubSuratAll(); unsubKeuanganAll(); unsubKemAll(); unsubBphSM(); unsubBphSK(); unsubBphKeu(); unsubBphInv(); unsubWeb(); };
  }, [userRole]);

  useEffect(() => {
    if (!selectedKem) return;
    const unsubSM = onSnapshot(query(collection(db, "surat_masuk"), where("scope", "==", selectedKem.id)), snap => setDetailSuratMasuk(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubSK = onSnapshot(query(collection(db, "surat_keluar"), where("scope", "==", selectedKem.id)), snap => setDetailSuratKeluar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubKeu = onSnapshot(query(collection(db, "keuangan"), where("scope", "==", selectedKem.id)), snap => setDetailKeuangan(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a:any, b:any) => new Date(a.tgl).getTime() - new Date(b.tgl).getTime())));
    const unsubInv = onSnapshot(query(collection(db, "inventaris"), where("scope", "==", selectedKem.id)), snap => setDetailInventaris(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => { unsubSM(); unsubSK(); unsubKeu(); unsubInv(); };
  }, [selectedKem]);

  const handleLogout = () => { if (confirm("Apakah Anda yakin ingin keluar?")) { localStorage.clear(); router.push("/login"); } };
  const formatRp = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);

  const handleAddKementerian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKemId || !newKemNama || !newEmail || !newPassword) return alert("Semua data wajib diisi!");
    const validId = newKemId.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "kementerian", validId), { nama: newKemNama, email: newEmail, password: newPassword, role: "kementerian", createdAt: Date.now() });
      alert(`Akun untuk ${newKemNama} berhasil dibuat!`);
      setNewKemId(""); setNewKemNama(""); setNewEmail(""); setNewPassword("");
      setShowAddForm(false); 
    } catch (error) { alert("Gagal membuat akun kementerian."); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteKementerian = async (id: string, nama: string) => {
    if(confirm(`Yakin menghapus akun ${nama}? Data mereka tidak akan bisa diakses lagi!`)) await deleteDoc(doc(db, "kementerian", id));
  }

  const handleCekData = (kem: Kementerian) => { setSelectedKem(kem); setDetailTab("surat"); setActiveMenu("detail"); };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const parsedPengurus: Pengurus[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0 && row[0]) { 
          parsedPengurus.push({
            nama: row[0]?.toString() || "-",
            nim: row[1]?.toString() || "-",
            jabatan: row[2]?.toString() || "-",
            lembaga: row[3]?.toString() || "-"
          });
        }
      }
      
      setDataPengurus(parsedPengurus);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePoPptaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Harap unggah file dalam format PDF!");
      return;
    }

    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Error: Konfigurasi Cloudinary di .env.local belum diisi!");
      return;
    }

    setIsUploadingPdf(true);
    setPoPptaFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setPoPptaFileUrl(data.secure_url);
        alert("Upload PDF berhasil! Jangan lupa klik 'Simpan Semua Pengaturan'.");
      } else {
        throw new Error(data.error?.message || "Upload gagal");
      }
    } catch (error: any) {
      alert(`Gagal upload ke Cloudinary: ${error.message}`);
      setPoPptaFileName("");
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleSaveWebSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWeb(true);

    const parsedPengurus = inputPengurusRaw
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.split('\t'); 
        return {
          nama: parts[0] || "-",
          nim: parts[1] || "-",
          jabatan: parts[2] || "-",
          lembaga: parts[3] || "-"
        };
      });

    try {
      await setDoc(doc(db, "pengaturan", "beranda"), {
        grandDesign: webGrandDesign, 
        visi: webVisi, 
        misi: webMisi, 
        proker: webProker, 
        poPptaFileName: poPptaFileName, 
        poPptaUrl: poPptaFileUrl, 
        linkGCal: linkGCal, 
        dataPengurus: parsedPengurus, 
        updatedAt: Date.now()
      }, { merge: true });
      alert("Pengaturan Web & Susunan Kepengurusan berhasil diperbarui!");
      setExcelFileName(""); 
    } catch (error) { alert("Gagal menyimpan pengaturan web."); } 
    finally { setIsSavingWeb(false); }
  };

  const triggerAiProcess = async (actionType: string) => {
    setIsAiLoading(true);
    setAiResponse(""); 
    
    let payloadData = {};

    if (actionType === "renstra") {
      if (!targetOrg) return alert("Nama Organisasi Target belum diisi!");
      payloadData = { 
        organisasi: targetOrg, 
        visi: webVisi, 
        misi: webMisi, 
        konteks: konteksIsu 
      };
    } else if (actionType === "notulen") {
      payloadData = { 
        judul: notulenJudul, 
        lokasi: notulenTempat, 
        teksKasar: "Bismillah. Rapat tadi bahas soal pensi. Kata ketua harus ada 3 divisi: acara, humas, logistik. Humas tolong cari media partner, acara siapkan rundown besok sore. Logistik mulai list barang. Udah itu aja, target kelar minggu depan." 
      };
    } else if (actionType === "smartletter") {
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

  let bphSaldoBank = 0; let bphSaldoOps = 0;

  const groupedPengurus = dataPengurus.reduce((acc, curr) => {
    if (!acc[curr.lembaga]) acc[curr.lembaga] = [];
    acc[curr.lembaga].push(curr);
    return acc;
  }, {} as Record<string, Pengurus[]>);

  return (
    <div>
      <style>{`
        body { font-family: 'Arial', sans-serif; background-color: #f8fafc; margin: 0; overflow-x: hidden; }
        .sidebar { width: 280px; height: 100vh; position: fixed; top: 0; left: 0; background: #002266; color: white; z-index: 1040; transition: 0.4s; overflow-y: auto; }
        .sidebar-brand { height: 90px; display: flex; align-items: center; padding: 0 25px; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-logo { width: 45px; height: 45px; border-radius: 50%; object-fit: contain; border: 2px solid #FFCC00; background: white;}
        .sidebar-menu { list-style: none; padding: 20px 15px; margin: 0; }
        .sidebar-menu .nav-link { display: flex; align-items: center; padding: 12px 15px; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 12px; cursor: pointer; margin-bottom: 5px; font-size: 0.95rem; gap: 15px; transition: 0.2s ease-in-out; }
        .sidebar-menu .nav-link:hover, .sidebar-menu .nav-link.active { background: rgba(255,255,255,0.15); color: #FFCC00; font-weight: 600; border-left: 4px solid #FFCC00; }
        
        .main-header { position: fixed; top: 0; left: 280px; right: 0; height: 70px; background: #ffffff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; transition: 0.4s; border-bottom: 1px solid #e2e8f0; }
        .content-wrapper { margin-top: 70px; margin-left: 280px; padding: 25px; transition: 0.4s; min-height: 100vh; }
        
        /* UPDATE DESAIN INFO BOX BERANDA */
        .info-box { background: #ffffff; border-radius: 20px; padding: 25px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; height: 100%; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .info-box:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
        .info-box .icon-circle { width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: white; transition: 0.3s ease; }
        .info-box:hover .icon-circle { transform: scale(1.1) rotate(5deg); }
        
        .bg-gradient-blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .bg-gradient-green { background: linear-gradient(135deg, #10b981, #047857); }
        .bg-gradient-yellow { background: linear-gradient(135deg, #f59e0b, #b45309); }
        .bg-gradient-red { background: linear-gradient(135deg, #ef4444, #b91c1c); }
        
        /* Desain Card Info Beranda */
        .glass-card { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2); }
        .glass-card::before { content: ""; position: absolute; top: -50%; right: -20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
        
        .modul-tabs .nav-link { color: #64748b; border: none; border-bottom: 3px solid transparent; border-radius: 0; padding: 10px 20px; cursor: pointer; }
        .modul-tabs .nav-link:hover { color: #003399; }
        .modul-tabs .nav-link.active { color: #003399; border-bottom-color: #003399; font-weight: bold; background: transparent; }
        
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
          <img src="https://i.ibb.co.com/gFhcwFzr/icon.png" alt="Logo" className="sidebar-logo" />
          <div className="d-flex flex-column">
            <span className="fw-bold" style={{ lineHeight: 1.2, letterSpacing: "1px" }}>SIDEMALIKI</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>BPH / Induk</span>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li><a className={`nav-link ${activeMenu === "dashboard" ? "active" : ""}`} onClick={() => { setActiveMenu("dashboard"); setIsSidebarOpen(false); }}><i className="fas fa-chart-pie"></i> <span>Dashboard Utama</span></a></li>
          
          <li className="sidebar-heading">Administrasi Induk</li>
          <li><a className={`nav-link ${activeMenu === "admin_surat" ? "active" : ""}`} onClick={() => { setActiveMenu("admin_surat"); setIsSidebarOpen(false); }}><i className="fas fa-envelope"></i> <span>Surat Induk</span></a></li>
          <li><a className={`nav-link ${activeMenu === "admin_keuangan" ? "active" : ""}`} onClick={() => { setActiveMenu("admin_keuangan"); setIsSidebarOpen(false); }}><i className="fas fa-wallet"></i> <span>Keuangan Pusat</span></a></li>
          <li><a className={`nav-link ${activeMenu === "admin_inventaris" ? "active" : ""}`} onClick={() => { setActiveMenu("admin_inventaris"); setIsSidebarOpen(false); }}><i className="fas fa-box"></i> <span>Inventaris DEMA</span></a></li>
          
          <li className="sidebar-heading">Data Organisasi</li>
          <li><a className={`nav-link ${activeMenu === "kepengurusan" ? "active" : ""}`} onClick={() => { setActiveMenu("kepengurusan"); setIsSidebarOpen(false); }}><i className="fas fa-sitemap"></i> <span>Susunan Pengurus</span></a></li>
          <li><a className={`nav-link ${activeMenu === "proker" ? "active" : ""}`} onClick={() => { setActiveMenu("proker"); setIsSidebarOpen(false); }}><i className="fas fa-calendar-check"></i> <span>Program Kerja</span></a></li>

          <li className="sidebar-heading">Manajemen Sistem</li>
          <li className="mt-2 pt-2 border-top border-secondary">
            <a className={`nav-link ${activeMenu === "asisten_ai" ? "active" : ""}`} onClick={() => { setActiveMenu("asisten_ai"); setIsSidebarOpen(false); }}>
              <i className="fas fa-robot text-info"></i> <span>Asisten Administrasi</span>
            </a>
          </li>
          <li><a className={`nav-link ${activeMenu === "kementerian" || activeMenu === "detail" ? "active" : ""}`} onClick={() => { setActiveMenu("kementerian"); setIsSidebarOpen(false); }}><i className="fas fa-users"></i> <span>Kelola Kementerian</span></a></li>
          <li><a className={`nav-link ${activeMenu === "pengaturan_web" ? "active" : ""}`} onClick={() => { setActiveMenu("pengaturan_web"); setIsSidebarOpen(false); }}><i className="fas fa-globe"></i> <span>Pengaturan Web</span></a></li>
          
          <li><a className="nav-link text-warning mt-4" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> <span>Keluar Sistem</span></a></li>
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
            <h6 className="m-0 fw-bold" style={{ color: "#003399" }}>DEMA UIN MALANG</h6>
            <small className="text-muted">Badan Pengurus Harian</small>
          </div>
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: "40px", height: "40px" }}>BP</div>
        </div>
      </header>

      <div className="content-wrapper">
        
        {/* --- MENU 1: DASHBOARD --- */}
        {activeMenu === "dashboard" && (
          <div className="animate-fade-in-up">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div>
                <h4 className="fw-bolder m-0" style={{ color: "#0f172a" }}>Statistik Global</h4>
                <p className="text-muted small m-0 mt-1">Ringkasan aktivitas dan data organisasi DEMA UIN Malang.</p>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px" }}>Total Surat</small>
                    <h2 className="fw-bolder m-0 text-dark">{totalSurat}</h2>
                    <span className="badge bg-primary bg-opacity-10 text-primary mt-2"><i className="fas fa-arrow-up me-1"></i>Keseluruhan</span>
                  </div>
                  <div className="icon-circle bg-gradient-blue shadow"><i className="fas fa-envelope-open-text"></i></div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px" }}>Saldo Kas</small>
                    <h2 className="fw-bolder m-0 text-success">{formatRp(saldoKas)}</h2>
                    <span className="badge bg-success bg-opacity-10 text-success mt-2"><i className="fas fa-coins me-1"></i>Kas Aktif</span>
                  </div>
                  <div className="icon-circle bg-gradient-green shadow"><i className="fas fa-wallet"></i></div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px" }}>Kementerian</small>
                    <h2 className="fw-bolder m-0 text-dark">{listKementerian.length}</h2>
                    <span className="badge bg-warning bg-opacity-10 text-warning mt-2 text-dark"><i className="fas fa-users me-1"></i>Terdaftar</span>
                  </div>
                  <div className="icon-circle bg-gradient-yellow text-white shadow"><i className="fas fa-landmark"></i></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-5 mt-2">
              <div className="row g-4 align-items-center position-relative" style={{ zIndex: 2 }}>
                <div className="col-lg-5 border-end border-secondary border-opacity-50 pe-lg-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "40px", height: "40px" }}><i className="fas fa-bullhorn"></i></div>
                    <h5 className="fw-bold m-0 text-warning">Grand Design</h5>
                  </div>
                  <p className="fst-italic mb-0" style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "#e2e8f0" }}>"{webGrandDesign || "Deskripsi Grand Design belum diatur oleh administrator."}"</p>
                </div>
                
                <div className="col-lg-7 ps-lg-4">
                  <div className="mb-4">
                    <h6 className="fw-bold text-info mb-2 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.85rem" }}><i className="fas fa-eye me-2"></i>Visi Organisasi</h6>
                    <p className="mb-0 text-white opacity-75" style={{ lineHeight: "1.5" }}>{webVisi || "Visi belum diatur"}</p>
                  </div>
                  <div className="p-3 bg-white bg-opacity-10 rounded-3 border border-white border-opacity-10">
                    <h6 className="fw-bold text-success mb-2 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.85rem" }}><i className="fas fa-bullseye me-2"></i>Misi Utama</h6>
                    <p className="mb-0 text-white opacity-75 text-truncate" title={webMisi}>{webMisi ? webMisi.split('\n')[0] : "Misi belum diatur"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Informasi Tambahan di Beranda */}
            <div className="row g-4 mt-1">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex align-items-start">
                    <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-3 me-3"><i className="fas fa-calendar-check fa-2x"></i></div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Fokus Program Kerja Bulan Ini</h6>
                      <p className="text-muted small mb-0">{webProker || "Belum ada agenda spesifik bulan ini."}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                  <div className="d-flex align-items-start">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3"><i className="fas fa-users-cog fa-2x"></i></div>
                    <div>
                      <h6 className="fw-bold text-dark mb-1">Total Pengurus Aktif</h6>
                      <p className="text-muted small mb-0">Terdapat <b>{dataPengurus.length}</b> fungsionaris yang tercatat dalam database sistem SIDEMALIKI saat ini.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- MENU: SURAT INDUK --- */}
        {activeMenu === "admin_surat" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Surat Induk BPH</h4>
            <ul className="nav nav-pills mb-3 gap-2">
              <li className="nav-item"><button className={`nav-link btn-sm ${adminSubTabSurat === "masuk" ? "active" : "bg-white border text-dark"}`} onClick={() => setAdminSubTabSurat("masuk")}>Surat Masuk</button></li>
              <li className="nav-item"><button className={`nav-link btn-sm ${adminSubTabSurat === "keluar" ? "active btn-warning text-dark" : "bg-white border text-dark"}`} onClick={() => setAdminSubTabSurat("keluar")}>Surat Keluar / SK</button></li>
            </ul>

            {adminSubTabSurat === "masuk" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-primary">Surat Masuk BPH</span>
                  <button className="btn btn-sm btn-primary shadow-sm" onClick={() => { setTipeSurat("Masuk"); setIsModalSuratOpen(true); }}><i className="fas fa-plus"></i> Tambah Surat</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>No</th><th>Asal</th><th>Tgl Terima</th><th>Perihal</th><th>File</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphSuratMasuk.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada data surat masuk pusat</td></tr> : 
                        bphSuratMasuk.map(s => (
                          <tr key={s.id}><td>{s.no}</td><td className="fw-bold">{s.asal || s.asalTujuan}</td><td>{s.tgl_datang || s.tgl_proses}</td><td>{s.hal}</td>
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

            {adminSubTabSurat === "keluar" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-warning">Surat Keluar / SK Pusat</span>
                  <button className="btn btn-sm btn-warning text-dark fw-bold shadow-sm" onClick={() => { setTipeSurat("Keluar"); setIsModalSuratOpen(true); }}><i className="fas fa-plus"></i> Buat Surat/SK</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>No</th><th>Tujuan/Nama SK</th><th>Tgl Kirim</th><th>Perihal</th><th>File</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphSuratKeluar.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada data surat keluar pusat</td></tr> : 
                        bphSuratKeluar.map(s => (
                          <tr key={s.id}><td>{s.no}</td><td className="fw-bold">{s.tujuan || s.asalTujuan}</td><td>{s.tgl_kirim || s.tgl_proses}</td><td>{s.hal}</td>
                            <td>{s.link_drive ? <a href={s.link_drive} target="_blank" className="btn btn-sm btn-outline-warning text-dark rounded-pill"><i className="fab fa-google-drive"></i></a> : '-'}</td>
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

        {/* --- MENU: KEUANGAN PUSAT --- */}
        {activeMenu === "admin_keuangan" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Keuangan Induk BPH</h4>
            <ul className="nav nav-pills mb-3 gap-2">
              <li className="nav-item"><button className={`nav-link btn-sm ${adminSubTabKeu === "bank" ? "active" : "bg-white border text-dark"}`} onClick={() => setAdminSubTabKeu("bank")}>Kas Induk DEMA</button></li>
              <li className="nav-item"><button className={`nav-link btn-sm ${adminSubTabKeu === "ops" ? "active btn-warning text-dark" : "bg-white border text-dark"}`} onClick={() => setAdminSubTabKeu("ops")}>Operasional BPH</button></li>
            </ul>

            {adminSubTabKeu === "bank" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-success">Laporan Kas Induk DEMA</span>
                  <button className="btn btn-sm btn-info text-white shadow-sm fw-bold" onClick={() => { setKategoriKeu("Bank"); setIsModalKeuOpen(true); }}><i className="fas fa-plus"></i> Transaksi Kas</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>Tgl</th><th>Uraian</th><th>Debit</th><th>Kredit</th><th>Saldo</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphKeuangan.filter(k => k.cat === "Bank").length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada transaksi bank pusat</td></tr> : 
                        bphKeuangan.filter(k => k.cat === "Bank").map(k => {
                          const debit = k.jenis === "Masuk" ? Number(k.nom) : 0;
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          bphSaldoBank += (debit - kredit);
                          return (
                            <tr key={k.id}>
                              <td>{k.tgl}</td><td>{k.uraian}</td><td className="text-success">{formatRp(debit)}</td><td className="text-danger">{formatRp(kredit)}</td><td className="fw-bold">{formatRp(bphSaldoBank)}</td>
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

            {adminSubTabKeu === "ops" && (
              <div className="card border-0 shadow-sm rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <span className="fw-bold text-warning">Operasional BPH Pusat</span>
                  <button className="btn btn-sm btn-warning text-dark fw-bold shadow-sm" onClick={() => { setKategoriKeu("Operasional"); setIsModalKeuOpen(true); }}><i className="fas fa-plus"></i> Tambah Pengeluaran</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th>Tgl</th><th>Uraian</th><th>Qty</th><th>Harga</th><th>Total</th><th>Debit</th><th>Kredit</th><th>Saldo</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphKeuangan.filter(k => k.cat === "Operasional").length === 0 ? <tr><td colSpan={9} className="text-center py-4 text-muted">Belum ada transaksi ops pusat</td></tr> : 
                        bphKeuangan.filter(k => k.cat === "Operasional").map(k => {
                          const debit = k.jenis === "Masuk" ? Number(k.nom) : 0;
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          bphSaldoOps += (debit - kredit);
                          return (
                            <tr key={k.id}>
                              <td>{k.tgl}</td><td>{k.uraian}</td><td>{k.qty || "-"}</td><td>{k.hrg ? formatRp(k.hrg) : "-"}</td><td>{k.qty && k.hrg ? formatRp(k.qty * k.hrg) : "-"}</td>
                              <td className="text-success">{formatRp(debit)}</td><td className="text-danger">{formatRp(kredit)}</td><td className="fw-bold">{formatRp(bphSaldoOps)}</td>
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

        {/* --- MENU: INVENTARIS BPH --- */}
        {activeMenu === "admin_inventaris" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Inventaris DEMA</h4>
            <div className="card border-0 shadow-sm rounded-4 p-3">
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                <span className="fw-bold text-danger">Rekapitulasi Inventaris Induk</span>
                <button className="btn btn-sm btn-danger shadow-sm" onClick={() => { setTipeInv("Rekap"); setIsModalInvOpen(true); }}><i className="fas fa-plus"></i> Tambah Aset Pusat</button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle text-nowrap">
                  <thead className="table-light"><tr><th>Nama Barang</th><th>Merk/Tipe</th><th>Jumlah</th><th>Kondisi</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {bphInventaris.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">Belum ada inventaris pusat terdaftar</td></tr> : 
                      bphInventaris.map(i => (
                        <tr key={i.id}>
                          <td className="fw-bold">{i.nama}</td><td>{i.merk || "-"}</td><td><span className="badge bg-secondary">{i.jml || 1}</span></td>
                          <td>{i.cond === "Baik" ? <span className="badge bg-success">Baik</span> : <span className="badge bg-danger">{i.cond}</span>}</td>
                          <td><button className="btn btn-sm btn-outline-danger rounded-circle"><i className="fas fa-trash"></i></button></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- MENU BARU: SUSUNAN KEPENGURUSAN (BAGAN / KELOMPOK) --- */}
        {activeMenu === "kepengurusan" && (
          <div className="animate-fade-in-up">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div>
                <h4 className="fw-bold m-0" style={{ color: "#003399" }}>Struktur Organisasi</h4>
                <p className="text-muted small m-0 mt-1">Daftar pengurus ini diatur melalui sinkronisasi Excel di Pengaturan Web.</p>
              </div>
              <span className="badge bg-light text-dark border p-2"><i className="fas fa-sitemap text-primary me-2"></i> {dataPengurus.length} Pengurus Aktif</span>
            </div>

            {dataPengurus.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                <i className="fas fa-users-slash fa-4x text-muted mb-3 opacity-25"></i>
                <h5 className="fw-bold text-secondary">Belum Ada Data Pengurus</h5>
                <p className="text-muted small">BPH belum mengupload file Excel struktur pengurus di menu Pengaturan Web.</p>
              </div>
            ) : (
              Object.entries(groupedPengurus).map(([lembaga, members]) => (
                <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" key={lembaga}>
                  <div className="bg-primary text-white p-3 d-flex align-items-center">
                    <i className="fas fa-building fs-4 me-3 opacity-75"></i>
                    <h5 className="fw-bold m-0 m-0 text-uppercase" style={{ letterSpacing: "1px" }}>{lembaga}</h5>
                  </div>
                  <div className="card-body bg-light p-4">
                    <div className="row g-3">
                      {members.map((m, idx) => (
                        <div className="col-md-6 col-lg-4" key={idx}>
                          <div className="card shadow-sm border-0 border-start border-4 border-warning h-100" style={{ transition: "0.3s" }}>
                            <div className="card-body py-3 px-4">
                              <div className="fw-bolder fs-6 text-dark text-truncate" title={m.nama}>{m.nama}</div>
                              <div className="text-muted small mb-2 font-monospace">{m.nim}</div>
                              <span className="badge bg-info text-dark shadow-sm">{m.jabatan}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- MENU BARU: PROGRAM KERJA --- */}
        {activeMenu === "proker" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bold mb-4" style={{ color: "#003399" }}>Program Kerja Organisasi</h4>
            
            <ul className="nav nav-tabs modul-tabs mb-4 border-bottom">
              <li className="nav-item"><a className={`nav-link ${prokerTab === "umum" ? "active" : ""}`} onClick={() => setProkerTab("umum")}>Gambaran Umum</a></li>
              <li className="nav-item"><a className={`nav-link ${prokerTab === "kalender" ? "active" : ""}`} onClick={() => setProkerTab("kalender")}>Kalender Proker</a></li>
            </ul>

            {prokerTab === "umum" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center animate-fade-in-up">
                <i className="fas fa-tools fa-4x text-muted mb-3 opacity-25"></i>
                <h5 className="fw-bold text-secondary">Fitur Gambaran Umum Proker Sedang Dibangun</h5>
                <p className="text-muted small">Nantinya tabel untuk menginput dan memantau detail tiap program kerja akan muncul di sini.</p>
              </div>
            )}

            {prokerTab === "kalender" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 animate-fade-in-up bg-white">
                {linkGCal ? (
                  <div className="ratio ratio-16x9 rounded overflow-hidden border">
                    <iframe src={linkGCal} style={{ borderWidth: 0 }} frameBorder="0" scrolling="no"></iframe>
                  </div>
                ) : (
                  <div className="text-center p-5">
                    <i className="fas fa-calendar-times fa-4x text-muted mb-3 opacity-25"></i>
                    <h5 className="fw-bold text-secondary">Kalender Belum Terhubung</h5>
                    <p className="text-muted small">BPH belum menautkan link integrasi Google Calendar di menu Pengaturan Web.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- MENU: KELOLA & PANTAU KEMENTERIAN --- */}
        {activeMenu === "kementerian" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bolder mb-4" style={{ color: "#003399" }}>Kelola & Pantau Kementerian</h4>
            
            <div className="mb-3 text-end">
              <button className={`btn fw-bold shadow-sm ${showAddForm ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setShowAddForm(!showAddForm)}>
                <i className={`fas ${showAddForm ? 'fa-times' : 'fa-user-plus'} me-2`}></i> {showAddForm ? "Batal Tambah Akun" : "Buat Akun Kementerian"}
              </button>
            </div>

            {showAddForm && (
              <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 animate-fade-in-up" style={{ backgroundColor: "#f8f9fa" }}>
                <h6 className="fw-bold mb-3"><i className="fas fa-user-plus text-primary me-2"></i>Registrasi Akun Baru</h6>
                <form onSubmit={handleAddKementerian}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-8"><label className="form-label small fw-bold">Nama Lengkap Kementerian</label><input type="text" className="form-control" placeholder="Kementerian Luar Negeri" value={newKemNama} onChange={(e) => setNewKemNama(e.target.value)} required /></div>
                    <div className="col-md-4"><label className="form-label small fw-bold">ID Singkatan</label><input type="text" className="form-control" placeholder="kemlu" value={newKemId} onChange={(e) => setNewKemId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} required /></div>
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6"><label className="form-label small fw-bold">Email Login</label><input type="email" className="form-control bg-white" placeholder="kemlu@sidemaliki.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></div>
                    <div className="col-md-6"><label className="form-label small fw-bold">Password Login</label><input type="text" className="form-control bg-white" placeholder="Minimal 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} /></div>
                  </div>
                  <button type="submit" className="btn btn-primary fw-bold" disabled={isSubmitting}><i className="fas fa-save me-2"></i> {isSubmitting ? "Menyimpan..." : "Simpan Akun"}</button>
                </form>
              </div>
            )}

            <div className="card border-0 shadow-sm rounded-4 p-4">
              <h6 className="fw-bold mb-3">Daftar Akun & Hak Akses</h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>Kode</th><th>Nama Kementerian</th><th>Email Login</th><th>Password</th><th>Aksi Pantauan</th></tr></thead>
                  <tbody>
                    {listKementerian.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">Belum ada akun kementerian.</td></tr> : 
                      listKementerian.map((kem) => (
                        <tr key={kem.id}>
                          <td><span className="badge bg-secondary text-uppercase">{kem.id}</span></td>
                          <td className="fw-bold">{kem.nama}</td>
                          <td className="text-primary">{kem.email}</td>
                          <td><code className="bg-light p-1 rounded text-dark">{kem.password}</code></td>
                          <td>
                            <button className="btn btn-sm btn-info text-white rounded-pill fw-bold me-2 shadow-sm" onClick={() => handleCekData(kem)}><i className="fas fa-eye"></i> Cek Laporan</button>
                            <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => handleDeleteKementerian(kem.id, kem.nama)}><i className="fas fa-trash"></i></button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- MENU: DETAIL SPY VIEW KEMENTERIAN --- */}
        {activeMenu === "detail" && selectedKem && (
          <div className="animate-fade-in-up">
            <button className="btn btn-light border shadow-sm mb-3 text-primary fw-bold" onClick={() => setActiveMenu("kementerian")}><i className="fas fa-arrow-left me-2"></i> Kembali ke Daftar</button>
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4" style={{ background: "linear-gradient(135deg, #002266, #003399)", color: "white" }}>
              <div className="d-flex justify-content-between align-items-center">
                <div><h4 className="fw-bolder mb-1">{selectedKem.nama}</h4><p className="m-0 opacity-75 small"><i className="fas fa-envelope me-2"></i>{selectedKem.email}</p></div>
                <div className="text-end"><span className="badge bg-warning text-dark px-3 py-2 fs-6 shadow-sm border border-light">MODE PANTAU (READ-ONLY)</span></div>
              </div>
            </div>

            <ul className="nav nav-tabs mb-4 border-bottom">
              <li className="nav-item"><a className={`nav-link text-dark fw-bold ${detailTab === "surat" ? "active border-bottom border-primary border-3" : "border-0"}`} style={{ cursor: "pointer", background: "none" }} onClick={() => setDetailTab("surat")}>Arsip Surat</a></li>
              <li className="nav-item"><a className={`nav-link text-dark fw-bold ${detailTab === "keuangan" ? "active border-bottom border-success border-3" : "border-0"}`} style={{ cursor: "pointer", background: "none" }} onClick={() => setDetailTab("keuangan")}>Laporan Keuangan</a></li>
              <li className="nav-item"><a className={`nav-link text-dark fw-bold ${detailTab === "inventaris" ? "active border-bottom border-danger border-3" : "border-0"}`} style={{ cursor: "pointer", background: "none" }} onClick={() => setDetailTab("inventaris")}>Aset & Inventaris</a></li>
            </ul>

            {detailTab === "surat" && (
              <div className="row g-4 animate-fade-in-up">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-3">
                    <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">Surat Masuk ({detailSuratMasuk.length})</h6>
                    <ul className="list-group list-group-flush">
                      {detailSuratMasuk.length === 0 ? <li className="list-group-item text-muted small">Kosong</li> : 
                        detailSuratMasuk.map(s => (
                          <li key={s.id} className="list-group-item px-0 d-flex justify-content-between align-items-start">
                            <div><div className="fw-bold small">{s.no}</div><div className="text-muted" style={{ fontSize: "12px" }}>Dari: {s.asal || s.asalTujuan} | {s.tgl_buat}</div></div>
                            {s.link_drive && <a href={s.link_drive} target="_blank" className="badge bg-primary text-decoration-none">Buka Drive</a>}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-3">
                    <h6 className="fw-bold text-warning mb-3 border-bottom pb-2">Surat Keluar ({detailSuratKeluar.length})</h6>
                    <ul className="list-group list-group-flush">
                      {detailSuratKeluar.length === 0 ? <li className="list-group-item text-muted small">Kosong</li> : 
                        detailSuratKeluar.map(s => (
                          <li key={s.id} className="list-group-item px-0 d-flex justify-content-between align-items-start">
                            <div><div className="fw-bold small">{s.no}</div><div className="text-muted" style={{ fontSize: "12px" }}>Tujuan: {s.tujuan || s.asalTujuan} | {s.tgl_buat}</div></div>
                            {s.link_drive && <a href={s.link_drive} target="_blank" className="badge bg-warning text-dark text-decoration-none">Buka Drive</a>}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "keuangan" && (
              <div className="card border-0 shadow-sm rounded-4 p-3 animate-fade-in-up">
                <h6 className="fw-bold text-success mb-3 border-bottom pb-2">Catatan Keuangan</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light"><tr><th>Kategori</th><th>Tgl</th><th>Uraian</th><th>Masuk</th><th>Keluar</th></tr></thead>
                    <tbody>
                      {detailKeuangan.length === 0 ? <tr><td colSpan={5} className="text-center text-muted py-3">Belum ada transaksi</td></tr> :
                        detailKeuangan.map(k => (
                          <tr key={k.id}>
                            <td><span className={`badge ${k.cat === "Bank" ? "bg-success" : "bg-warning text-dark"}`}>{k.cat}</span></td>
                            <td className="small">{k.tgl}</td><td className="small fw-bold">{k.uraian}</td>
                            <td className="small text-success">{k.jenis === "Masuk" ? formatRp(Number(k.nom)) : "-"}</td><td className="small text-danger">{k.jenis === "Keluar" ? formatRp(Number(k.nom)) : "-"}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailTab === "inventaris" && (
              <div className="card border-0 shadow-sm rounded-4 p-3 animate-fade-in-up">
                <h6 className="fw-bold text-danger mb-3 border-bottom pb-2">Daftar Aset</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light"><tr><th>Barang</th><th>Merk</th><th>Jml</th><th>Kondisi</th></tr></thead>
                    <tbody>
                      {detailInventaris.length === 0 ? <tr><td colSpan={4} className="text-center text-muted py-3">Belum ada aset</td></tr> :
                        detailInventaris.map(i => (
                          <tr key={i.id}>
                            <td className="small fw-bold">{i.nama}</td><td className="small">{i.merk || "-"}</td>
                            <td><span className="badge bg-secondary">{i.jml || 1}</span></td>
                            <td>{i.cond === "Baik" ? <span className="badge bg-success">Baik</span> : <span className="badge bg-danger">{i.cond}</span>}</td>
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

        {/* --- MENU: ASISTEN AI --- */}
        {activeMenu === "asisten_ai" && (
          <div className="animate-fade-in-up">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-info bg-opacity-10 text-info rounded p-2 me-3"><i className="fas fa-robot fa-2x"></i></div>
              <div>
                <h4 className="fw-bolder m-0" style={{ color: "#0f172a" }}>Asisten Administrasi AI</h4>
                <p className="text-muted m-0 small">Kumpulan alat cerdas untuk mempercepat pekerjaan sekretaris.</p>
              </div>
            </div>

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
                  <p className="text-muted">Sistem otomatis berbasis AI untuk memeriksa kesesuaian Margin, Ukuran Kertas, Font, dan Penomoran Surat.</p>
                  
                  {poPptaFileUrl ? (
                    <a href={poPptaFileUrl} target="_blank" rel="noreferrer" className="badge bg-success text-white border p-2 shadow-sm text-decoration-none">
                      <i className="fas fa-check-circle me-1"></i> Standar PO-PPTA Aktif: {poPptaFileName}
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
                  <h5 className="fw-bold">Klik untuk upload atau drag & drop</h5>
                  <p className="text-muted small">Format: PDF (Max 10MB)<br/>Pastikan scan surat terlihat jelas agar analisis akurat.</p>
                  <input type="file" className="form-control d-none" id="upload-smartletter" accept=".pdf" />
                  <button className="btn btn-outline-primary mt-2" onClick={() => document.getElementById('upload-smartletter')?.click()}>Pilih File Surat</button>
                </div>
                
                {aiResponse && (
                  <div className="alert alert-info mt-4 mx-auto" style={{ maxWidth: "600px" }}>
                    <h6 className="fw-bold"><i className="fas fa-robot me-2"></i>Hasil Analisis AI:</h6>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>{aiResponse}</div>
                  </div>
                )}
                
                <div className="text-center mt-4">
                  <button className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow" onClick={() => triggerAiProcess("smartletter")} disabled={isAiLoading || !poPptaFileUrl}>
                    {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Menganalisis...</> : "Mulai Analisis AI"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB NOTULEN */}
            {aiTab === "notulen" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 animate-fade-in-up">
                <div className="text-center mb-4">
                  <h3 className="fw-bolder mb-2">Ubah Tulisan Jadi Digital</h3>
                  <p className="text-muted">Upload foto catatan rapat atau teks kasar, biarkan AI merapikan formatnya menjadi notulensi profesional standar KBBI.</p>
                </div>
                
                <div className="row g-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Judul Rapat</label>
                    <input type="text" className="form-control" placeholder="Contoh: Rapat Pleno 1" value={notulenJudul} onChange={(e) => setNotulenJudul(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Tempat/Lokasi</label>
                    <input type="text" className="form-control" placeholder="Ruang Meeting A" value={notulenTempat} onChange={(e) => setNotulenTempat(e.target.value)} />
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
                    
                    <label className="small fw-bold mb-2">Tanda Tangan Ketua</label>
                    <div className="upload-area p-3 mb-3 bg-white" style={{ padding: "15px" }}>
                      <i className="fas fa-upload text-muted"></i> <span className="small text-muted ms-1">Click to upload</span>
                    </div>

                    <label className="small fw-bold mb-2">Tanda Tangan Sekretaris</label>
                    <div className="upload-area p-3 mb-3 bg-white" style={{ padding: "15px" }}>
                      <i className="fas fa-upload text-muted"></i> <span className="small text-muted ms-1">Click to upload</span>
                    </div>

                    <label className="small fw-bold mb-2">Stempel Lembaga</label>
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
                      <div><h5 className="fw-bold m-0">Data Target Renstra</h5><p className="text-muted m-0 small">Sistem AI akan menganalisis Visi-Misi Induk untuk menyusun Program Kerja.</p></div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Nama Organisasi Target</label>
                      <input type="text" className="form-control" placeholder="Misal: Kementerian / Biro X" value={targetOrg} onChange={(e) => setTargetOrg(e.target.value)} />
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-info"><i className="fas fa-eye me-1"></i> Visi Induk (Otomatis)</label>
                        <textarea className="form-control bg-light" rows={4} readOnly value={webVisi || "Visi belum diatur oleh BPH"}></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-info"><i className="fas fa-bullseye me-1"></i> Misi Induk (Otomatis)</label>
                        <textarea className="form-control bg-light" rows={4} readOnly value={webMisi || "Misi belum diatur oleh BPH"}></textarea>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Konteks Isu Khusus / Target Tambahan</label>
                      <textarea className="form-control" rows={3} placeholder="Masukkan isu strategis yang ingin diselesaikan pada periode ini..." value={konteksIsu} onChange={(e) => setKonteksIsu(e.target.value)}></textarea>
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

        {/* --- MENU: PENGATURAN WEB & SUSUNAN KEPENGURUSAN --- */}
        {activeMenu === "pengaturan_web" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bolder mb-4" style={{ color: "#003399" }}>Pengaturan Web & Organisasi</h4>
            <div className="row">
              <div className="col-lg-8">
                
                {/* KARTU PENGATURAN PROFIL */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                  <h6 className="fw-bold mb-3 border-bottom pb-2"><i className="fas fa-edit text-primary me-2"></i>Konten Profil Organisasi</h6>
                  <form onSubmit={handleSaveWebSettings}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-secondary">Teks Grand Design</label>
                      <textarea className="form-control" rows={2} value={webGrandDesign} onChange={(e) => setWebGrandDesign(e.target.value)} required></textarea>
                    </div>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Teks Visi</label>
                        <textarea className="form-control" rows={3} value={webVisi} onChange={(e) => setWebVisi(e.target.value)} required></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Teks Misi</label>
                        <textarea className="form-control" rows={3} value={webMisi} onChange={(e) => setWebMisi(e.target.value)} required></textarea>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-secondary">Program Kerja Bulan Ini</label>
                      <input type="text" className="form-control" value={webProker} onChange={(e) => setWebProker(e.target.value)} required />
                    </div>
                    
                    <hr className="my-4 text-muted" />

                    <div className="mb-4 bg-light p-3 border rounded">
                      <label className="form-label small fw-bold text-primary"><i className="fas fa-file-pdf me-2"></i>Dokumen Standar PO-PPTA (Master AI)</label>
                      <p className="small text-muted mb-2">Upload file PDF Pedoman Organisasi yang akan digunakan oleh Asisten AI sebagai acuan validasi surat.</p>
                      
                      <div className="d-flex align-items-center gap-3">
                        <input type="file" className="form-control d-none" id="upload-po-ppta" accept=".pdf" onChange={handlePoPptaUpload} />
                        <button type="button" className="btn btn-outline-primary fw-bold" onClick={() => document.getElementById('upload-po-ppta')?.click()} disabled={isUploadingPdf}>
                          {isUploadingPdf ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-upload me-2"></i>}
                          {isUploadingPdf ? "Mengunggah..." : "Upload PDF PO-PPTA"}
                        </button>
                        <div className="text-muted small text-truncate" style={{ maxWidth: "250px" }}>
                          {poPptaFileName ? <span className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i> {poPptaFileName}</span> : "Belum ada file dipilih"}
                        </div>
                      </div>
                      {poPptaFileUrl && (
                        <div className="mt-2 small text-primary">
                          <a href={poPptaFileUrl} target="_blank" rel="noreferrer">Lihat File yang tersimpan</a>
                        </div>
                      )}
                    </div>

                    <div className="mb-4 bg-light p-3 border rounded mt-3">
                      <label className="form-label small fw-bold text-primary"><i className="fas fa-calendar-alt me-2"></i>Integrasi Google Calendar</label>
                      <p className="small text-muted mb-2">Masukkan link embed (src) dari Google Calendar untuk menampilkan jadwal kegiatan di menu Program Kerja.</p>
                      <input type="url" className="form-control" placeholder="https://calendar.google.com/calendar/embed?src=..." value={linkGCal} onChange={(e) => setLinkGCal(e.target.value)} />
                    </div>

                    <button type="submit" className="btn btn-primary fw-bold px-4" disabled={isSavingWeb || isUploadingPdf}>
                      <i className="fas fa-check-circle me-2"></i> {isSavingWeb ? "Menyimpan Data..." : "Simpan Semua Pengaturan"}
                    </button>
                  </form>
                </div>

                {/* KARTU UPLOAD EXCEL KEPENGURUSAN */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white border border-info border-2 border-top-0 border-end-0 border-bottom-0">
                  <h6 className="fw-bold mb-3 border-bottom pb-2 text-info"><i className="fas fa-file-excel me-2"></i>Upload File Excel Kepengurusan</h6>
                  <p className="small text-muted mb-3">Upload file <code>.xlsx</code> yang berisi daftar pengurus. Pastikan urutan kolom adalah: <b>Nama, NIM, Jabatan, Kementerian/Lembaga</b> (baris pertama akan dianggap sebagai header dan diabaikan).</p>
                  
                  <div className="upload-area mb-3 p-3 bg-light">
                    <i className="fas fa-file-excel fa-2x text-success mb-2"></i>
                    <p className="m-0 small fw-bold text-dark">{excelFileName || "Klik untuk memilih file Excel"}</p>
                    <input type="file" className="form-control d-none" id="upload-excel-pengurus" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                    <button type="button" className="btn btn-sm btn-outline-success mt-2 fw-bold" onClick={() => document.getElementById('upload-excel-pengurus')?.click()}>
                      Cari File Excel
                    </button>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted fw-bold">
                      {dataPengurus.length > 0 ? `${dataPengurus.length} data pengurus terdeteksi.` : "Belum ada data terdeteksi."}
                    </span>
                    <button className="btn btn-info text-white fw-bold px-4 shadow-sm" onClick={handleSaveWebSettings} disabled={isSavingWeb || dataPengurus.length === 0}>
                      <i className="fas fa-save me-2"></i> Simpan ke Database
                    </button>
                  </div>
                </div>

              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-primary text-white sticky-top" style={{ top: "90px", background: "linear-gradient(135deg, #002266, #003399)" }}>
                  <h6 className="fw-bold mb-3 text-warning"><i className="fas fa-info-circle me-2"></i>Petunjuk Pengisian</h6>
                  <p className="small opacity-75 mb-3">Teks profil organisasi yang disimpan di sini akan langsung tampil secara publik di <b>Halaman Beranda</b>.</p>
                  <hr className="bg-light opacity-25" />
                  <p className="small opacity-75 mb-2 fw-bold">Cara Upload Data Pengurus:</p>
                  <ol className="small opacity-75 ps-3 mb-0">
                    <li className="mb-1">Siapkan file Excel (<code>.xlsx</code>).</li>
                    <li className="mb-1">Pastikan ada 4 kolom (A: Nama, B: NIM, C: Jabatan, D: Lembaga).</li>
                    <li className="mb-1">Baris ke-1 otomatis dianggap sebagai header/judul kolom.</li>
                    <li>Upload file pada kotak yang disediakan dan klik Simpan.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL UNTUK BPH */}
      {isModalSuratOpen && <ModalTambahSurat kementerianName="bph" tipe={tipeSurat} onClose={() => setIsModalSuratOpen(false)} />}
      {isModalKeuOpen && <ModalTambahKeuangan kementerianName="bph" kategori={kategoriKeu} onClose={() => setIsModalKeuOpen(false)} />}
      {isModalInvOpen && <ModalTambahInventaris kementerianName="bph" tipe={tipeInv} onClose={() => setIsModalInvOpen(false)} />}

    </div>
  );
}