"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, setDoc, doc, deleteDoc, query, where, addDoc } from "firebase/firestore";
import * as XLSX from "xlsx"; 
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Rnd } from "react-rnd";

// IMPORT KOMPONEN MODAL UNTUK BPH
import ModalTambahSurat from "@/components/ModalTambahSurat";
import ModalTambahKeuangan from "@/components/ModalTambahKeuangan";
import ModalTambahInventaris from "@/components/ModalTambahInventaris";

interface Kementerian { id: string; nama: string; email: string; password?: string; }
interface Pengurus { nama: string; nim: string; jabatan: string; lembaga: string; }
interface Proker { id: string; nama: string; tujuan: string; sasaran: string; kpi: string; scope: string; tgl: string; }

export default function DashboardBPH() {
  const router = useRouter();
  
  const [activeMenu, setActiveMenu] = useState("dashboard"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const [totalSurat, setTotalSurat] = useState(0);
  const [saldoKas, setSaldoKas] = useState(0);
  const [listKementerian, setListKementerian] = useState<Kementerian[]>([]);

  const [newKemId, setNewKemId] = useState("");
  const [newKemNama, setNewKemNama] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false); 

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

  const [selectedKem, setSelectedKem] = useState<Kementerian | null>(null);
  const [detailTab, setDetailTab] = useState("surat");
  const [detailSuratMasuk, setDetailSuratMasuk] = useState<any[]>([]);
  const [detailSuratKeluar, setDetailSuratKeluar] = useState<any[]>([]);
  const [detailKeuangan, setDetailKeuangan] = useState<any[]>([]);
  const [detailInventaris, setDetailInventaris] = useState<any[]>([]);

  const [webGrandDesign, setWebGrandDesign] = useState("");
  const [webVisi, setWebVisi] = useState("");
  const [webMisi, setWebMisi] = useState("");
  const [webProker, setWebProker] = useState("");
  
  const [poPptaFileName, setPoPptaFileName] = useState(""); 
  const [poPptaFileUrl, setPoPptaFileUrl] = useState(""); 
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  
  const [linkGCal, setLinkGCal] = useState(""); 
  const [inputPengurusRaw, setInputPengurusRaw] = useState(""); 
  const [dataPengurus, setDataPengurus] = useState<Pengurus[]>([]); 
  const [excelFileName, setExcelFileName] = useState(""); 
  const [isSavingWeb, setIsSavingWeb] = useState(false);

  const [prokerTab, setProkerTab] = useState("umum"); 
  const [daftarProker, setDaftarProker] = useState<Proker[]>([]);
  const [showAddProker, setShowAddProker] = useState(false);
  const [formProker, setFormProker] = useState({ nama: "", tujuan: "", sasaran: "", kpi: "" });

  const [aiTab, setAiTab] = useState("smartletter"); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(""); 
  
  const [pdfSplitNames, setPdfSplitNames] = useState(""); 
  const [splitPdfFile, setSplitPdfFile] = useState<File | null>(null);

  // --- STATE KHUSUS SIGN & STAMP (CANVAS INTERAKTIF) ---
  const [ttdKetua, setTtdKetua] = useState<File | null>(null);
  const [ttdKetuaUrl, setTtdKetuaUrl] = useState("");
  const [posKetua, setPosKetua] = useState({ x: 300, y: 550, w: 150, h: 80 });

  const [ttdSekre, setTtdSekre] = useState<File | null>(null);
  const [ttdSekreUrl, setTtdSekreUrl] = useState("");
  const [posSekre, setPosSekre] = useState({ x: 50, y: 550, w: 150, h: 80 });

  const [stempel, setStempel] = useState<File | null>(null);
  const [stempelUrl, setStempelUrl] = useState("");
  const [posStempel, setPosStempel] = useState({ x: 260, y: 520, w: 100, h: 100 });

  const [pdfMasterTtd, setPdfMasterTtd] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(""); 
  const previewRef = useRef<HTMLDivElement>(null); 

  const [targetOrg, setTargetOrg] = useState("");
  const [konteksIsu, setKonteksIsu] = useState("");
  const [notulenJudul, setNotulenJudul] = useState("");
  const [notulenTempat, setNotulenTempat] = useState("");

  const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : "";

  // Dynamic import untuk pdfjsLib, agar tidak error saat SSR/Build di Vercel
  const loadPdfjsLib = async () => {
    if (typeof window !== "undefined") {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      return pdfjsLib;
    }
    return null;
  };

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
    const unsubProker = onSnapshot(query(collection(db, "program_kerja"), where("scope", "==", "bph")), snap => setDaftarProker(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Proker[]));

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

    return () => { clearInterval(timer); unsubSuratAll(); unsubKeuanganAll(); unsubKemAll(); unsubBphSM(); unsubBphSK(); unsubBphKeu(); unsubBphInv(); unsubProker(); unsubWeb(); };
  }, [userRole]);

  useEffect(() => {
    if (!selectedKem) return;
    const unsubSM = onSnapshot(query(collection(db, "surat_masuk"), where("scope", "==", selectedKem.id)), snap => setDetailSuratMasuk(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubSK = onSnapshot(query(collection(db, "surat_keluar"), where("scope", "==", selectedKem.id)), snap => setDetailSuratKeluar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubKeu = onSnapshot(query(collection(db, "keuangan"), where("scope", "==", selectedKem.id)), snap => setDetailKeuangan(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a:any, b:any) => new Date(a.tgl).getTime() - new Date(b.tgl).getTime())));
    const unsubInv = onSnapshot(query(collection(db, "inventaris"), where("scope", "==", selectedKem.id)), snap => setDetailInventaris(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => { unsubSM(); unsubSK(); unsubKeu(); unsubInv(); };
  }, [selectedKem]);

  // Handler Gambar Interaktif
  const handleTtdKetuaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setTtdKetua(file); setTtdKetuaUrl(URL.createObjectURL(file)); }
  };
  const handleTtdSekreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setTtdSekre(file); setTtdSekreUrl(URL.createObjectURL(file)); }
  };
  const handleStempelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setStempel(file); setStempelUrl(URL.createObjectURL(file)); }
  };

  // Preview PDF ke HTML Canvas
  const handlePdfMasterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      return alert("File harus berformat PDF!");
    }

    setPdfMasterTtd(file);
    setIsAiLoading(true);

    try {
      // DYNAMIC IMPORT UNTUK MENCEGAH ERROR VERCEL
      const pdfjsLib = await loadPdfjsLib();
      if (!pdfjsLib) throw new Error("Gagal memuat pustaka PDF.js");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const lastPageNum = pdf.numPages; // Kita ambil halaman terakhir
      const page = await pdf.getPage(lastPageNum);
      
      const viewport = page.getViewport({ scale: 1.5 }); // Resolusi lumayan jernih
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        // FIX UNTUK ERROR TYPESCRIPT
        await page.render({ canvasContext: context, viewport: viewport } as any).promise;
        setPdfPreviewUrl(canvas.toDataURL("image/jpeg", 0.8)); // Jadikan background
      } else {
        throw new Error("Browser tidak mendukung Canvas 2D.");
      }
    } catch (error: any) {
      console.error("Detail Error PDF.js:", error);
      alert(`Gagal merender preview PDF: ${error.message || "File corrupt/password"}`);
      setPdfMasterTtd(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogout = () => { if (confirm("Apakah Anda yakin ingin keluar?")) { localStorage.clear(); router.push("/login"); } };
  const formatRp = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);

  const handleSaveProker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProker.nama || !formProker.tujuan || !formProker.sasaran || !formProker.kpi) return alert("Semua bidang wajib diisi!");
    try {
      await addDoc(collection(db, "program_kerja"), { ...formProker, scope: "bph", tgl: new Date().toLocaleDateString("id-ID") });
      alert("Program Kerja berhasil disimpan!");
      setFormProker({ nama: "", tujuan: "", sasaran: "", kpi: "" });
      setShowAddProker(false);
    } catch (error) { alert("Gagal menyimpan program kerja."); }
  };

  const handleDeleteProker = async (id: string) => {
    if (confirm("Yakin ingin menghapus program kerja ini?")) await deleteDoc(doc(db, "program_kerja", id));
  };

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
            nama: row[0]?.toString() || "-", nim: row[1]?.toString() || "-",
            jabatan: row[2]?.toString() || "-", lembaga: row[3]?.toString() || "-"
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
    if (file.type !== "application/pdf") return alert("Harap unggah file dalam format PDF!");

    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!CLOUD_NAME || !UPLOAD_PRESET) return alert("Error: Konfigurasi Cloudinary di .env.local belum diisi!");

    setIsUploadingPdf(true);
    setPoPptaFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setPoPptaFileUrl(data.secure_url);
        alert("Upload PDF berhasil! Jangan lupa klik 'Simpan Semua Pengaturan'.");
      } else { throw new Error(data.error?.message || "Upload gagal"); }
    } catch (error: any) {
      alert(`Gagal upload ke Cloudinary: ${error.message}`);
      setPoPptaFileName("");
    } finally { setIsUploadingPdf(false); }
  };

  const handleSaveWebSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWeb(true);
    const parsedPengurus = inputPengurusRaw.split('\n').filter(line => line.trim() !== '').map(line => {
        const parts = line.split('\t'); 
        return { nama: parts[0] || "-", nim: parts[1] || "-", jabatan: parts[2] || "-", lembaga: parts[3] || "-" };
      });
    try {
      await setDoc(doc(db, "pengaturan", "beranda"), {
        grandDesign: webGrandDesign, visi: webVisi, misi: webMisi, proker: webProker, 
        poPptaFileName: poPptaFileName, poPptaUrl: poPptaFileUrl, linkGCal: linkGCal, 
        dataPengurus: parsedPengurus, updatedAt: Date.now()
      }, { merge: true });
      alert("Pengaturan Web & Susunan Kepengurusan berhasil diperbarui!");
      setExcelFileName(""); 
    } catch (error) { alert("Gagal menyimpan pengaturan web."); } 
    finally { setIsSavingWeb(false); }
  };

  const triggerAiProcess = async (actionType: string, extractedText: string = "") => {
    setIsAiLoading(true);
    setAiResponse(""); 
    let payloadData = {};

    if (actionType === "notulen") {
      if (!notulenJudul || !notulenTempat) { setIsAiLoading(false); return alert("Lengkapi data rapat terlebih dahulu!"); }
      payloadData = { judul: notulenJudul, lokasi: notulenTempat, teksKasar: "Bismillah. Rapat tadi bahas soal proker. Harus ada divisi acara, humas, logistik. Humas cari media partner. Udah itu aja, kelar minggu depan." };
    } else if (actionType === "smartletter") {
       payloadData = { teksSurat: extractedText }; 
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, payload: payloadData })
      });
      const data = await response.json();
      
      if (response.ok) { 
        setAiResponse(data.result); 
      } else { 
        alert(`AI Error: ${data.error}\n\nDetail Teknis:\n${data.details || "Tidak ada detail tambahan"}`); 
      }
    } catch (error: any) {
      alert(`Gagal terhubung ke API Server: ${error.message}`);
    } finally { 
      setIsAiLoading(false); 
    }
  };

  const handleExtractAndCheck = async () => {
    const fileInput = document.getElementById('upload-smartletter') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return alert("Upload file PDF surat terlebih dahulu!");

    setIsAiLoading(true);
    setAiResponse("");
    try {
      // DYNAMIC IMPORT PDFJS
      const pdfjsLib = await loadPdfjsLib();
      if (!pdfjsLib) throw new Error("Gagal memuat pustaka PDF.js");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
      triggerAiProcess("smartletter", fullText);
    } catch (error: any) {
      console.error("Error Ekstraksi:", error);
      alert(`Gagal membaca teks PDF: ${error.message}`);
      setIsAiLoading(false);
    }
  };

  const handleProcessSplitPDF = async () => {
    if (!splitPdfFile) return alert("Upload file PDF master terlebih dahulu!");
    if (!pdfSplitNames) return alert("Masukkan daftar nama file terlebih dahulu!");

    setIsAiLoading(true);
    try {
      const arrayBuffer = await splitPdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();
      const names = pdfSplitNames.split('\n').filter(n => n.trim() !== '');

      if (names.length !== totalPages) {
        alert(`Peringatan: Jumlah nama (${names.length}) tidak sama dengan halaman PDF (${totalPages}). Memproses sesuai jumlah yang paling sedikit.`);
      }

      const zip = new JSZip();
      const limit = Math.min(names.length, totalPages);

      for (let i = 0; i < limit; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        zip.file(`${names[i]}.pdf`, pdfBytes);
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      saveAs(zipContent, "Hasil_Split_PDF.zip");
      alert("File ZIP berhasil dibuat dan diunduh otomatis!");
    } catch (error) {
      alert("Gagal memproses dan memotong PDF.");
    } finally { setIsAiLoading(false); }
  };

  // LOGIKA SIGN & STAMP DINAMIS (DRAG & DROP)
  const handleSignAndStamp = async () => {
    if (!pdfMasterTtd) return alert("Upload file PDF Master terlebih dahulu!");
    if (!previewRef.current) return alert("Kanvas preview belum siap.");

    setIsAiLoading(true);
    try {
      const pdfBytes = await pdfMasterTtd.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width: pdfWidth, height: pdfHeight } = lastPage.getSize();

      // Mendapatkan skala kanvas HTML vs PDF asli
      const htmlWidth = previewRef.current.clientWidth;
      const scaleRatio = pdfWidth / htmlWidth;

      const drawImage = async (file: File, posInfo: any) => {
        const imgBytes = await file.arrayBuffer();
        let embeddedImg;
        if (file.type === "image/png") {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } else if (file.type === "image/jpeg" || file.type === "image/jpg") {
          embeddedImg = await pdfDoc.embedJpg(imgBytes);
        } else { throw new Error("Gunakan JPG atau PNG."); }
        
        // Konversi Koordinat dari HTML (Top-Left) ke PDF (Bottom-Left)
        const pdfX = posInfo.x * scaleRatio;
        const pdfY = pdfHeight - ((posInfo.y + posInfo.h) * scaleRatio);
        const pdfW = posInfo.w * scaleRatio;
        const pdfH = posInfo.h * scaleRatio;

        lastPage.drawImage(embeddedImg, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });
      };

      if (ttdSekre) await drawImage(ttdSekre, posSekre);
      if (ttdKetua) await drawImage(ttdKetua, posKetua);
      if (stempel) await drawImage(stempel, posStempel);

      const pdfSavedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfSavedBytes)], { type: "application/pdf" });
      saveAs(blob, `Signed_${pdfMasterTtd.name}`);
      alert("Dokumen berhasil ditandatangani sesuai posisi!");
    } catch (error: any) {
      alert(`Gagal memproses: ${error.message}`);
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
        /* PALET WARNA SILVER/SLATE ELEGANT */
        :root {
          --bg-main: #f8fafc;
          --sidebar-bg: #ffffff;
          --sidebar-text: #475569;
          --sidebar-border: #e2e8f0;
          --active-bg: #f1f5f9;
          --active-text: #0f172a;
          --accent-color: #64748b; 
          
          --card-bg: #ffffff;
          --text-dark: #0f172a;
          --text-muted: #64748b;
        }

        body { font-family: 'Inter', 'Segoe UI', sans-serif; background-color: var(--bg-main); margin: 0; overflow-x: hidden; color: var(--text-dark); }
        
        .sidebar { width: 280px; height: 100vh; position: fixed; top: 0; left: 0; background: var(--sidebar-bg); color: var(--sidebar-text); z-index: 1040; transition: 0.4s; overflow-y: auto; border-right: 1px solid var(--sidebar-border); box-shadow: 2px 0 10px rgba(0,0,0,0.02); }
        .sidebar-brand { height: 90px; display: flex; align-items: center; padding: 0 25px; gap: 15px; border-bottom: 1px solid var(--sidebar-border); }
        .sidebar-logo { width: 45px; height: 45px; border-radius: 50%; object-fit: contain; border: 1px solid #e2e8f0; padding: 2px; }
        .sidebar-menu { list-style: none; padding: 20px 15px; margin: 0; }
        .sidebar-menu .nav-link { display: flex; align-items: center; padding: 12px 15px; color: var(--sidebar-text); text-decoration: none; border-radius: 10px; cursor: pointer; margin-bottom: 5px; font-size: 0.95rem; gap: 15px; transition: all 0.2s ease; font-weight: 500; }
        .sidebar-menu .nav-link:hover { background: var(--active-bg); color: var(--active-text); }
        .sidebar-menu .nav-link.active { background: var(--text-dark); color: #ffffff; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15); }
        
        .main-header { position: fixed; top: 0; left: 280px; right: 0; height: 70px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; transition: 0.4s; border-bottom: 1px solid var(--sidebar-border); }
        .content-wrapper { margin-top: 70px; margin-left: 280px; padding: 30px; transition: 0.4s; min-height: 100vh; }
        
        .info-box { background: var(--card-bg); border-radius: 20px; padding: 25px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04); border: 1px solid var(--sidebar-border); transition: all 0.3s ease; }
        .info-box:hover { transform: translateY(-4px); box-shadow: 0 12px 25px rgba(15, 23, 42, 0.08); border-color: #cbd5e1; }
        .info-box .icon-circle { width: 55px; height: 55px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text-dark); background: #f1f5f9; transition: 0.3s ease; border: 1px solid #e2e8f0; }
        .info-box:hover .icon-circle { background: var(--text-dark); color: #ffffff; transform: scale(1.05) rotate(5deg); }
        
        .glass-card { background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); border: 1px solid #334155; }
        .glass-card::before { content: ""; position: absolute; top: -30%; right: -10%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
        
        .modul-tabs { border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
        .modul-tabs .nav-link { color: var(--text-muted); border: none; border-bottom: 3px solid transparent; border-radius: 0; padding: 12px 20px; cursor: pointer; font-weight: 500; transition: 0.2s; }
        .modul-tabs .nav-link:hover { color: var(--text-dark); }
        .modul-tabs .nav-link.active { color: var(--text-dark); border-bottom-color: var(--text-dark); font-weight: 700; background: transparent; }
        
        .ai-tabs .nav-link { color: var(--text-muted); background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 20px; font-weight: 600; margin-right: 10px; cursor: pointer; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        .ai-tabs .nav-link:hover { border-color: #94a3b8; color: var(--text-dark); transform: translateY(-2px); }
        .ai-tabs .nav-link.active { background: var(--text-dark); color: white; border-color: transparent; box-shadow: 0 4px 15px rgba(15, 23, 42, 0.2); }

        .upload-area { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 40px 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: 0.3s; position: relative; }
        .upload-area:hover { border-color: var(--text-dark); background: #f1f5f9; }

        .sidebar-heading { padding: 15px 20px 5px; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        
        .card { box-shadow: 0 4px 15px rgba(15, 23, 42, 0.03); border-color: #e2e8f0; }
        .table-light { background-color: #f8fafc; color: var(--text-muted); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        
        .mobile-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); z-index: 1030; display: none; backdrop-filter: blur(3px); }
        @media (max-width: 992px) { .sidebar { transform: translateX(-100%); } .sidebar.active { transform: translateX(0); } .main-header { left: 0; } .content-wrapper { margin-left: 0; } .sidebar.active ~ .mobile-overlay { display: block; } }
        
        /* Gaya untuk area drag & drop TTD */
        .pdf-preview-container { position: relative; display: inline-block; width: 100%; max-width: 700px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .pdf-preview-img { width: 100%; height: auto; display: block; user-select: none; }
        .draggable-img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; border: 1px dashed #3b82f6; background: rgba(59, 130, 246, 0.1); }
      `}</style>

      <aside className={`sidebar ${isSidebarOpen ? "active" : ""}`}>
        <div className="sidebar-brand">
          <img src="https://i.ibb.co.com/gFhcwFzr/icon.png" alt="Logo" className="sidebar-logo" />
          <div className="d-flex flex-column">
            <span className="fw-bolder text-dark" style={{ lineHeight: 1.2, letterSpacing: "1px" }}>SIDEMALIKI</span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>BPH / Induk</span>
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
          <li className="mt-1 mb-2"></li>
          <li><a className={`nav-link ${activeMenu === "asisten_ai" ? "active" : ""}`} onClick={() => { setActiveMenu("asisten_ai"); setIsSidebarOpen(false); }}><i className="fas fa-robot"></i> <span>Asisten AI</span></a></li>
          <li><a className={`nav-link ${activeMenu === "kementerian" || activeMenu === "detail" ? "active" : ""}`} onClick={() => { setActiveMenu("kementerian"); setIsSidebarOpen(false); }}><i className="fas fa-users"></i> <span>Kelola Kementerian</span></a></li>
          <li><a className={`nav-link ${activeMenu === "pengaturan_web" ? "active" : ""}`} onClick={() => { setActiveMenu("pengaturan_web"); setIsSidebarOpen(false); }}><i className="fas fa-globe"></i> <span>Pengaturan Web</span></a></li>
          
          <li className="mt-4 border-top pt-3 border-secondary border-opacity-25"><a className="nav-link text-danger fw-bold hover-danger" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> <span>Keluar Sistem</span></a></li>
        </ul>
      </aside>

      {isSidebarOpen && <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <header className="main-header">
        <div className="d-flex align-items-center">
          <button className="btn btn-light d-lg-none me-3 border shadow-sm" onClick={() => setIsSidebarOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="d-none d-md-flex align-items-center text-secondary fw-bold bg-light px-3 py-2 rounded-pill small border"><i className="far fa-clock me-2 text-dark"></i> {currentTime || "Memuat waktu..."}</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-sm-block">
            <h6 className="m-0 fw-bolder text-dark">DEMA UIN MALANG</h6>
            <small className="text-muted fw-500">Badan Pengurus Harian</small>
          </div>
          <div className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold shadow" style={{ width: "45px", height: "45px", border: "2px solid #e2e8f0" }}>BP</div>
        </div>
      </header>

      <div className="content-wrapper">
        
        {/* --- MENU 1: DASHBOARD --- */}
        {activeMenu === "dashboard" && (
          <div className="animate-fade-in-up">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div>
                <h3 className="fw-bolder m-0 text-dark" style={{ letterSpacing: "-0.5px" }}>Statistik Global</h3>
                <p className="text-muted small m-0 mt-1">Ringkasan aktivitas dan data organisasi DEMA UIN Malang.</p>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.75rem" }}>Total Surat</small>
                    <h2 className="fw-bolder m-0 text-dark">{totalSurat}</h2>
                    <span className="badge bg-light text-secondary border mt-2 px-2 py-1"><i className="fas fa-file-alt me-1"></i>Keseluruhan</span>
                  </div>
                  <div className="icon-circle"><i className="fas fa-envelope-open-text"></i></div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.75rem" }}>Saldo Kas Induk</small>
                    <h2 className="fw-bolder m-0 text-dark">{formatRp(saldoKas)}</h2>
                    <span className="badge bg-light text-secondary border mt-2 px-2 py-1"><i className="fas fa-chart-line me-1"></i>Kas Aktif</span>
                  </div>
                  <div className="icon-circle"><i className="fas fa-wallet"></i></div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div className="info-box">
                  <div>
                    <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.75rem" }}>Kementerian</small>
                    <h2 className="fw-bolder m-0 text-dark">{listKementerian.length}</h2>
                    <span className="badge bg-light text-secondary border mt-2 px-2 py-1"><i className="fas fa-landmark me-1"></i>Terdaftar</span>
                  </div>
                  <div className="icon-circle"><i className="fas fa-users-cog"></i></div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-5 mt-2">
              <div className="row g-4 align-items-center position-relative" style={{ zIndex: 2 }}>
                <div className="col-lg-5 border-end border-secondary border-opacity-50 pe-lg-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center me-3 shadow" style={{ width: "45px", height: "45px" }}><i className="fas fa-bullhorn"></i></div>
                    <h5 className="fw-bolder m-0 text-white" style={{ letterSpacing: "1px" }}>Grand Design</h5>
                  </div>
                  <p className="fst-italic mb-0" style={{ fontSize: "1.15rem", lineHeight: "1.6", color: "#f8fafc" }}>"{webGrandDesign || "Deskripsi Grand Design belum diatur oleh administrator."}"</p>
                </div>
                
                <div className="col-lg-7 ps-lg-4">
                  <div className="mb-4">
                    <h6 className="fw-bold text-gray-300 mb-2 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.8rem", color: "#94a3b8" }}><i className="fas fa-eye me-2"></i>Visi Organisasi</h6>
                    <p className="mb-0 text-white opacity-90 fw-500" style={{ lineHeight: "1.6" }}>{webVisi || "Visi belum diatur"}</p>
                  </div>
                  
                  {/* --- PERBAIKAN TAMPILAN MISI UTAMA DI SINI --- */}
                  <div className="p-3 bg-white bg-opacity-10 rounded-4 border border-white border-opacity-10 backdrop-blur">
                    <h6 className="fw-bold text-gray-300 mb-3 text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.8rem", color: "#94a3b8" }}><i className="fas fa-bullseye me-2"></i>Misi Utama</h6>
                    {webMisi ? (
                      <ul className="list-unstyled mb-0">
                        {webMisi.split('\n').filter(m => m.trim() !== '').map((misi, index) => (
                          <li key={index} className="text-white opacity-90 fw-500 mb-2 d-flex align-items-start">
                            <i className="fas fa-check-circle text-success mt-1 me-2" style={{fontSize: "0.8rem"}}></i>
                            <span style={{ lineHeight: "1.5", fontSize: "0.95rem" }}>{misi}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 text-white opacity-90 fw-500">Misi belum diatur</p>
                    )}
                  </div>
                  {/* --- AKHIR PERBAIKAN TAMPILAN MISI --- */}

                </div>
              </div>
            </div>

            <div className="row g-4 mt-1">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate">
                  <div className="d-flex align-items-start">
                    <div className="bg-slate-100 text-slate-600 rounded-4 p-3 me-4 border bg-light"><i className="fas fa-calendar-check fa-2x text-secondary"></i></div>
                    <div>
                      <h6 className="fw-bold text-dark mb-2">Fokus Program Kerja</h6>
                      <p className="text-muted small mb-0 lh-lg">{webProker || "Belum ada agenda spesifik bulan ini."}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white hover-elevate">
                  <div className="d-flex align-items-start">
                    <div className="bg-slate-100 text-slate-600 rounded-4 p-3 me-4 border bg-light"><i className="fas fa-sitemap fa-2x text-secondary"></i></div>
                    <div>
                      <h6 className="fw-bold text-dark mb-2">Total Pengurus Aktif</h6>
                      <p className="text-muted small mb-0 lh-lg">Terdapat <span className="badge bg-dark text-white mx-1">{dataPengurus.length}</span> fungsionaris yang tercatat dalam sistem saat ini.</p>
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
            <h4 className="fw-bolder mb-4 text-dark">Surat Induk BPH</h4>
            <ul className="nav nav-pills mb-4 gap-2 bg-white p-2 rounded-pill shadow-sm d-inline-flex border">
              <li className="nav-item"><button className={`nav-link rounded-pill fw-bold px-4 ${adminSubTabSurat === "masuk" ? "active bg-dark text-white" : "bg-transparent text-muted"}`} onClick={() => setAdminSubTabSurat("masuk")}>Surat Masuk</button></li>
              <li className="nav-item"><button className={`nav-link rounded-pill fw-bold px-4 ${adminSubTabSurat === "keluar" ? "active bg-dark text-white" : "bg-transparent text-muted"}`} onClick={() => setAdminSubTabSurat("keluar")}>Surat Keluar / SK</button></li>
            </ul>

            {adminSubTabSurat === "masuk" && (
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <span className="fw-bold text-dark fs-5">Data Surat Masuk BPH</span>
                  <button className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm" onClick={() => { setTipeSurat("Masuk"); setIsModalSuratOpen(true); }}><i className="fas fa-plus me-2"></i> Tambah Surat</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap border-top">
                    <thead className="table-light"><tr><th className="py-3">No</th><th>Asal Instansi</th><th>Tgl Terima</th><th>Perihal</th><th>Dokumen</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphSuratMasuk.length === 0 ? <tr><td colSpan={6} className="text-center py-5 text-muted">Belum ada data surat masuk pusat</td></tr> : 
                        bphSuratMasuk.map(s => (
                          <tr key={s.id}>
                            <td className="fw-bold text-secondary">{s.no}</td><td className="fw-bold text-dark">{s.asal || s.asalTujuan}</td><td>{s.tgl_datang || s.tgl_proses}</td><td>{s.hal}</td>
                            <td>{s.link_drive ? <a href={s.link_drive} target="_blank" className="btn btn-sm btn-light border text-primary rounded-pill px-3"><i className="fab fa-google-drive me-1"></i> Buka</a> : <span className="text-muted small">-</span>}</td>
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
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <span className="fw-bold text-dark fs-5">Data Surat Keluar / SK</span>
                  <button className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm" onClick={() => { setTipeSurat("Keluar"); setIsModalSuratOpen(true); }}><i className="fas fa-plus me-2"></i> Buat Surat/SK</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap border-top">
                    <thead className="table-light"><tr><th className="py-3">No</th><th>Tujuan / Nama SK</th><th>Tgl Keluar</th><th>Perihal</th><th>Dokumen</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphSuratKeluar.length === 0 ? <tr><td colSpan={6} className="text-center py-5 text-muted">Belum ada data surat keluar pusat</td></tr> : 
                        bphSuratKeluar.map(s => (
                          <tr key={s.id}>
                            <td className="fw-bold text-secondary">{s.no}</td><td className="fw-bold text-dark">{s.tujuan || s.asalTujuan}</td><td>{s.tgl_kirim || s.tgl_proses}</td><td>{s.hal}</td>
                            <td>{s.link_drive ? <a href={s.link_drive} target="_blank" className="btn btn-sm btn-light border text-primary rounded-pill px-3"><i className="fab fa-google-drive me-1"></i> Buka</a> : <span className="text-muted small">-</span>}</td>
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
            <h4 className="fw-bolder mb-4 text-dark">Keuangan Induk BPH</h4>
            <ul className="nav nav-pills mb-4 gap-2 bg-white p-2 rounded-pill shadow-sm d-inline-flex border">
              <li className="nav-item"><button className={`nav-link rounded-pill fw-bold px-4 ${adminSubTabKeu === "bank" ? "active bg-dark text-white" : "bg-transparent text-muted"}`} onClick={() => setAdminSubTabKeu("bank")}>Kas Induk DEMA</button></li>
              <li className="nav-item"><button className={`nav-link rounded-pill fw-bold px-4 ${adminSubTabKeu === "ops" ? "active bg-dark text-white" : "bg-transparent text-muted"}`} onClick={() => setAdminSubTabKeu("ops")}>Operasional BPH</button></li>
            </ul>

            {adminSubTabKeu === "bank" && (
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <span className="fw-bold text-dark fs-5">Laporan Kas Induk</span>
                  <button className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm" onClick={() => { setKategoriKeu("Bank"); setIsModalKeuOpen(true); }}><i className="fas fa-plus me-2"></i> Transaksi Kas</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th className="py-3">Tanggal</th><th>Uraian Transaksi</th><th>Debit (Masuk)</th><th>Kredit (Keluar)</th><th>Saldo</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphKeuangan.filter(k => k.cat === "Bank").length === 0 ? <tr><td colSpan={6} className="text-center py-5 text-muted">Belum ada transaksi bank pusat</td></tr> : 
                        bphKeuangan.filter(k => k.cat === "Bank").map(k => {
                          const debit = k.jenis === "Masuk" ? Number(k.nom) : 0;
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          bphSaldoBank += (debit - kredit);
                          return (
                            <tr key={k.id}>
                              <td className="text-secondary">{k.tgl}</td>
                              <td className="fw-bold text-dark">{k.uraian}</td>
                              <td className="text-success fw-500">{debit > 0 ? formatRp(debit) : "-"}</td>
                              <td className="text-danger fw-500">{kredit > 0 ? formatRp(kredit) : "-"}</td>
                              <td className="fw-bold bg-light">{formatRp(bphSaldoBank)}</td>
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
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                  <span className="fw-bold text-dark fs-5">Operasional BPH Pusat</span>
                  <button className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm" onClick={() => { setKategoriKeu("Operasional"); setIsModalKeuOpen(true); }}><i className="fas fa-plus me-2"></i> Pengeluaran Baru</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light"><tr><th className="py-3">Tgl</th><th>Uraian</th><th>Penanggung Jawab</th><th>Qty</th><th>Harga Satuan</th><th>Total (Kredit)</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {bphKeuangan.filter(k => k.cat === "Operasional").length === 0 ? <tr><td colSpan={7} className="text-center py-5 text-muted">Belum ada transaksi operasional</td></tr> : 
                        bphKeuangan.filter(k => k.cat === "Operasional").map(k => {
                          const kredit = k.jenis === "Keluar" ? Number(k.nom) : 0;
                          return (
                            <tr key={k.id}>
                              <td className="text-secondary">{k.tgl}</td>
                              <td className="fw-bold text-dark">{k.uraian}</td>
                              <td><span className="badge bg-light text-dark border px-2 py-1">{k.pj || "-"}</span></td>
                              <td>{k.qty || "-"}</td>
                              <td>{k.hrg ? formatRp(k.hrg) : "-"}</td>
                              <td className="text-danger fw-bold bg-light">{formatRp(kredit)}</td>
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
            <h4 className="fw-bolder mb-4 text-dark">Inventaris DEMA</h4>
            <div className="card border-0 shadow-sm rounded-4 p-4">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <span className="fw-bold text-dark fs-5">Buku Inventaris Induk</span>
                <button className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm" onClick={() => { setTipeInv("Rekap"); setIsModalInvOpen(true); }}><i className="fas fa-plus me-2"></i> Tambah Aset</button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle text-nowrap border-top">
                  <thead className="table-light"><tr><th className="py-3">Nama Barang / Aset</th><th>Merk/Tipe</th><th>Jumlah</th><th>Kondisi</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {bphInventaris.length === 0 ? <tr><td colSpan={5} className="text-center py-5 text-muted">Belum ada inventaris pusat terdaftar</td></tr> : 
                      bphInventaris.map(i => (
                        <tr key={i.id}>
                          <td className="fw-bold text-dark">{i.nama}</td>
                          <td className="text-secondary">{i.merk || "-"}</td>
                          <td><span className="badge bg-dark text-white px-2 py-1">{i.jml || 1}</span></td>
                          <td>{i.cond === "Baik" ? <span className="badge bg-success bg-opacity-10 text-success border border-success px-2">Baik</span> : <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2">{i.cond}</span>}</td>
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

        {/* --- MENU: SUSUNAN KEPENGURUSAN --- */}
        {activeMenu === "kepengurusan" && (
          <div className="animate-fade-in-up">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div>
                <h4 className="fw-bolder m-0 text-dark">Struktur Organisasi</h4>
                <p className="text-muted small m-0 mt-1">Daftar pengurus disinkronisasi via Excel di Pengaturan Web.</p>
              </div>
              <span className="badge bg-dark text-white border p-2 shadow-sm"><i className="fas fa-sitemap me-2"></i> {dataPengurus.length} Pengurus</span>
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
                  <div className="bg-light border-bottom p-3 d-flex align-items-center">
                    <i className="fas fa-building fs-5 me-3 text-secondary"></i>
                    <h5 className="fw-bolder m-0 text-dark text-uppercase" style={{ letterSpacing: "1px" }}>{lembaga}</h5>
                  </div>
                  <div className="card-body bg-white p-4">
                    <div className="row g-3">
                      {members.map((m, idx) => (
                        <div className="col-md-6 col-lg-4" key={idx}>
                          <div className="card shadow-sm border-0 border-start border-4 border-dark h-100 bg-light hover-elevate">
                            <div className="card-body py-3 px-4">
                              <div className="fw-bolder fs-6 text-dark text-truncate" title={m.nama}>{m.nama}</div>
                              <div className="text-secondary small mb-2 font-monospace">{m.nim}</div>
                              <span className="badge bg-secondary text-white shadow-sm border px-2">{m.jabatan}</span>
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

        {/* --- MENU: PROGRAM KERJA (CRUD LENGKAP) --- */}
        {activeMenu === "proker" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bolder mb-4 text-dark">Program Kerja Organisasi</h4>
            
            <ul className="nav nav-tabs modul-tabs mb-4 border-bottom border-2">
              <li className="nav-item"><a className={`nav-link text-uppercase fw-bold ${prokerTab === "umum" ? "active text-dark border-dark" : ""}`} onClick={() => setProkerTab("umum")}>Gambaran Umum</a></li>
              <li className="nav-item"><a className={`nav-link text-uppercase fw-bold ${prokerTab === "kalender" ? "active text-dark border-dark" : ""}`} onClick={() => setProkerTab("kalender")}>Kalender Kegiatan</a></li>
            </ul>

            {prokerTab === "umum" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white animate-fade-in-up">
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                  <span className="fw-bold text-dark fs-5">Daftar Program Kerja BPH</span>
                  <button className={`btn rounded-pill fw-bold px-4 shadow-sm ${showAddProker ? 'btn-light border' : 'btn-dark'}`} onClick={() => setShowAddProker(!showAddProker)}>
                    <i className={`fas ${showAddProker ? 'fa-times text-danger' : 'fa-plus text-white'} me-2`}></i> {showAddProker ? "Batal" : "Tambah Proker"}
                  </button>
                </div>

                {showAddProker && (
                  <div className="card border border-secondary border-opacity-25 rounded-4 p-4 mb-4 bg-light">
                    <h6 className="fw-bold mb-3 text-dark"><i className="fas fa-edit text-primary me-2"></i>Formulir Program Kerja Baru</h6>
                    <form onSubmit={handleSaveProker}>
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-secondary">Nama Program Kerja</label>
                        <input type="text" className="form-control" placeholder="Contoh: Latihan Kepemimpinan Manajemen Mahasiswa" value={formProker.nama} onChange={(e) => setFormProker({...formProker, nama: e.target.value})} required />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-secondary">Tujuan / Goal</label>
                        <textarea className="form-control" rows={2} placeholder="Tujuan dilaksanakannya proker ini..." value={formProker.tujuan} onChange={(e) => setFormProker({...formProker, tujuan: e.target.value})} required></textarea>
                      </div>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label small fw-bold text-secondary">Sasaran Peserta / Target</label>
                          <input type="text" className="form-control" placeholder="Contoh: Mahasiswa Baru Angkatan 2026" value={formProker.sasaran} onChange={(e) => setFormProker({...formProker, sasaran: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold text-secondary">Indikator Keberhasilan (KPI)</label>
                          <input type="text" className="form-control" placeholder="Contoh: Diikuti oleh minimal 150 peserta" value={formProker.kpi} onChange={(e) => setFormProker({...formProker, kpi: e.target.value})} required />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-dark fw-bold rounded-pill px-5"><i className="fas fa-save me-2"></i> Simpan Program Kerja</button>
                    </form>
                  </div>
                )}

                <div className="table-responsive mt-3">
                  <table className="table table-hover align-middle border-top text-nowrap">
                    <thead className="table-light"><tr><th className="py-3">Tgl Input</th><th>Nama Program Kerja</th><th>Tujuan</th><th>Sasaran</th><th>KPI Target</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {daftarProker.length === 0 ? <tr><td colSpan={6} className="text-center py-5 text-muted">Belum ada program kerja yang ditambahkan.</td></tr> : 
                        daftarProker.map((p) => (
                          <tr key={p.id}>
                            <td className="text-secondary small">{p.tgl}</td>
                            <td className="fw-bold text-dark">{p.nama}</td>
                            <td className="text-truncate" style={{ maxWidth: "200px" }} title={p.tujuan}>{p.tujuan}</td>
                            <td><span className="badge bg-light border text-dark">{p.sasaran}</span></td>
                            <td className="text-success fw-500">{p.kpi}</td>
                            <td><button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => handleDeleteProker(p.id)}><i className="fas fa-trash"></i></button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {prokerTab === "kalender" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 animate-fade-in-up bg-white">
                {linkGCal ? (
                  <div className="ratio ratio-16x9 rounded-4 overflow-hidden border shadow-sm">
                    <iframe src={linkGCal} style={{ borderWidth: 0 }} frameBorder="0" scrolling="no"></iframe>
                  </div>
                ) : (
                  <div className="text-center p-5">
                    <i className="fas fa-calendar-times fa-4x text-muted mb-3 opacity-25"></i>
                    <h5 className="fw-bold text-secondary">Kalender Belum Terhubung</h5>
                    <p className="text-muted small">BPH perlu menautkan *link embed* Google Calendar di menu Pengaturan Web.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- MENU: KELOLA KEMENTERIAN --- */}
        {activeMenu === "kementerian" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bolder mb-4 text-dark">Kelola Akun Kementerian</h4>
            
            <div className="mb-3 text-end">
              <button className={`btn rounded-pill fw-bold px-4 shadow-sm ${showAddForm ? 'btn-light border' : 'btn-dark'}`} onClick={() => setShowAddForm(!showAddForm)}>
                <i className={`fas ${showAddForm ? 'fa-times text-danger' : 'fa-user-plus text-white'} me-2`}></i> {showAddForm ? "Batal Tambah Akun" : "Buat Akun Baru"}
              </button>
            </div>

            {showAddForm && (
              <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 animate-fade-in-up bg-white">
                <h6 className="fw-bold mb-4 text-dark fs-5 border-bottom pb-3"><i className="fas fa-user-plus text-secondary me-2"></i>Registrasi Akun Baru</h6>
                <form onSubmit={handleAddKementerian}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-8"><label className="form-label small fw-bold text-secondary">Nama Lengkap Kementerian</label><input type="text" className="form-control bg-light" placeholder="Misal: Kementerian Dalam Negeri" value={newKemNama} onChange={(e) => setNewKemNama(e.target.value)} required /></div>
                    <div className="col-md-4"><label className="form-label small fw-bold text-secondary">ID (Huruf Kecil)</label><input type="text" className="form-control bg-light" placeholder="kemendagri" value={newKemId} onChange={(e) => setNewKemId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} required /></div>
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6"><label className="form-label small fw-bold text-secondary">Email Login</label><input type="email" className="form-control bg-light" placeholder="kemendagri@sidemaliki.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></div>
                    <div className="col-md-6"><label className="form-label small fw-bold text-secondary">Password Login</label><input type="text" className="form-control bg-light" placeholder="Minimal 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} /></div>
                  </div>
                  <button type="submit" className="btn btn-dark fw-bold rounded-pill px-4" disabled={isSubmitting}><i className="fas fa-save me-2"></i> {isSubmitting ? "Menyimpan..." : "Simpan Akun"}</button>
                </form>
              </div>
            )}

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h6 className="fw-bold mb-4 text-dark fs-5 border-bottom pb-2">Daftar Akun & Hak Akses</h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle border-top text-nowrap">
                  <thead className="table-light"><tr><th className="py-3">Kode</th><th>Nama Kementerian</th><th>Email Login</th><th>Password</th><th>Aksi Pantauan</th></tr></thead>
                  <tbody>
                    {listKementerian.length === 0 ? <tr><td colSpan={5} className="text-center py-5 text-muted">Belum ada akun kementerian.</td></tr> : 
                      listKementerian.map((kem) => (
                        <tr key={kem.id}>
                          <td><span className="badge bg-light text-secondary border text-uppercase">{kem.id}</span></td>
                          <td className="fw-bold text-dark">{kem.nama}</td>
                          <td className="text-secondary">{kem.email}</td>
                          <td><code className="bg-light border px-2 py-1 rounded text-dark font-monospace">{kem.password}</code></td>
                          <td>
                            <button className="btn btn-sm btn-dark rounded-pill fw-bold me-2 px-3 shadow-sm" onClick={() => handleCekData(kem)}><i className="fas fa-eye me-1"></i> Laporan</button>
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
            <button className="btn btn-light border shadow-sm mb-4 text-dark fw-bold rounded-pill px-3" onClick={() => setActiveMenu("kementerian")}><i className="fas fa-arrow-left me-2"></i> Kembali</button>
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 glass-card">
              <div className="d-flex justify-content-between align-items-center position-relative" style={{ zIndex: 2 }}>
                <div><h4 className="fw-bolder mb-1 text-white">{selectedKem.nama}</h4><p className="m-0 text-white opacity-75 small"><i className="fas fa-envelope me-2"></i>{selectedKem.email}</p></div>
                <div className="text-end"><span className="badge bg-white text-dark px-3 py-2 shadow-sm border border-secondary rounded-pill"><i className="fas fa-search me-1"></i> Mode Pantau</span></div>
              </div>
            </div>

            <ul className="nav nav-tabs modul-tabs mb-4 border-bottom border-2">
              <li className="nav-item"><a className={`nav-link text-uppercase fw-bold ${detailTab === "surat" ? "active text-dark border-dark" : ""}`} onClick={() => setDetailTab("surat")}>Arsip Surat</a></li>
              <li className="nav-item"><a className={`nav-link text-uppercase fw-bold ${detailTab === "keuangan" ? "active text-dark border-dark" : ""}`} onClick={() => setDetailTab("keuangan")}>Laporan Keuangan</a></li>
              <li className="nav-item"><a className={`nav-link text-uppercase fw-bold ${detailTab === "inventaris" ? "active text-dark border-dark" : ""}`} onClick={() => setDetailTab("inventaris")}>Data Aset</a></li>
            </ul>

            {detailTab === "surat" && (
              <div className="row g-4 animate-fade-in-up">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                    <h6 className="fw-bold text-dark mb-4 fs-5 border-bottom pb-2">Surat Masuk ({detailSuratMasuk.length})</h6>
                    <ul className="list-group list-group-flush">
                      {detailSuratMasuk.length === 0 ? <li className="list-group-item text-muted small px-0">Belum ada data</li> : 
                        detailSuratMasuk.map(s => (
                          <li key={s.id} className="list-group-item px-0 d-flex justify-content-between align-items-start border-light py-3">
                            <div><div className="fw-bold text-dark">{s.no}</div><div className="text-secondary small mt-1"><i className="fas fa-building me-1"></i> {s.asal || s.asalTujuan} | {s.tgl_buat}</div></div>
                            {s.link_drive && <a href={s.link_drive} target="_blank" className="badge bg-light text-primary border text-decoration-none p-2 rounded-pill shadow-sm"><i className="fab fa-google-drive"></i></a>}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                    <h6 className="fw-bold text-dark mb-4 fs-5 border-bottom pb-2">Surat Keluar ({detailSuratKeluar.length})</h6>
                    <ul className="list-group list-group-flush">
                      {detailSuratKeluar.length === 0 ? <li className="list-group-item text-muted small px-0">Belum ada data</li> : 
                        detailSuratKeluar.map(s => (
                          <li key={s.id} className="list-group-item px-0 d-flex justify-content-between align-items-start border-light py-3">
                            <div><div className="fw-bold text-dark">{s.no}</div><div className="text-secondary small mt-1"><i className="fas fa-paper-plane me-1"></i> {s.tujuan || s.asalTujuan} | {s.tgl_buat}</div></div>
                            {s.link_drive && <a href={s.link_drive} target="_blank" className="badge bg-light text-primary border text-decoration-none p-2 rounded-pill shadow-sm"><i className="fab fa-google-drive"></i></a>}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "keuangan" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white animate-fade-in-up">
                <h6 className="fw-bold text-dark mb-4 fs-5 border-bottom pb-2">Rekap Keuangan</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap border-top">
                    <thead className="table-light"><tr><th className="py-3">Kategori</th><th>Tgl</th><th>Uraian</th><th>Masuk</th><th>Keluar</th></tr></thead>
                    <tbody>
                      {detailKeuangan.length === 0 ? <tr><td colSpan={5} className="text-center text-muted py-5">Belum ada transaksi</td></tr> :
                        detailKeuangan.map(k => (
                          <tr key={k.id}>
                            <td><span className={`badge border px-2 py-1 rounded-pill ${k.cat === "Bank" ? "bg-success bg-opacity-10 text-success border-success" : "bg-warning bg-opacity-10 text-dark border-warning"}`}>{k.cat}</span></td>
                            <td className="small text-secondary">{k.tgl}</td><td className="fw-bold text-dark">{k.uraian}</td>
                            <td className="text-success fw-500">{k.jenis === "Masuk" ? formatRp(Number(k.nom)) : "-"}</td><td className="text-danger fw-500">{k.jenis === "Keluar" ? formatRp(Number(k.nom)) : "-"}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailTab === "inventaris" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white animate-fade-in-up">
                <h6 className="fw-bold text-dark mb-4 fs-5 border-bottom pb-2">Daftar Aset Lembaga</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle text-nowrap border-top">
                    <thead className="table-light"><tr><th className="py-3">Barang</th><th>Merk</th><th>Jml</th><th>Kondisi</th></tr></thead>
                    <tbody>
                      {detailInventaris.length === 0 ? <tr><td colSpan={4} className="text-center text-muted py-5">Belum ada aset terdaftar</td></tr> :
                        detailInventaris.map(i => (
                          <tr key={i.id}>
                            <td className="fw-bold text-dark">{i.nama}</td><td className="text-secondary">{i.merk || "-"}</td>
                            <td><span className="badge bg-dark text-white px-2 py-1">{i.jml || 1}</span></td>
                            <td>{i.cond === "Baik" ? <span className="badge bg-success bg-opacity-10 text-success border border-success">Baik</span> : <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">{i.cond}</span>}</td>
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

        {/* --- MENU: ASISTEN AI (TERMASUK PDF & SMARTLETTER LOGIC SUNGGUHAN) --- */}
        {activeMenu === "asisten_ai" && (
          <div className="animate-fade-in-up">
            <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
              <div className="bg-dark text-white rounded-3 p-3 me-3 shadow-sm"><i className="fas fa-robot fa-2x"></i></div>
              <div>
                <h3 className="fw-bolder m-0 text-dark">Asisten AI SIDEMALIKI</h3>
                <p className="text-muted m-0 mt-1">Kumpulan alat cerdas otomatis untuk mempercepat administrasi sekretaris.</p>
              </div>
            </div>

            <div className="d-flex flex-wrap ai-tabs mb-4 gap-2">
              <a className={`nav-link ${aiTab === "smartletter" ? "active" : ""}`} onClick={() => setAiTab("smartletter")}><i className="fas fa-search me-2"></i>Cek Surat PPTA</a>
              <a className={`nav-link ${aiTab === "notulen" ? "active" : ""}`} onClick={() => setAiTab("notulen")}><i className="fas fa-pen-fancy me-2"></i>Notulen AI</a>
              <a className={`nav-link ${aiTab === "ttd" ? "active" : ""}`} onClick={() => setAiTab("ttd")}><i className="fas fa-signature me-2"></i>Sign & Stamp Pro</a>
              <a className={`nav-link ${aiTab === "pdf" ? "active" : ""}`} onClick={() => setAiTab("pdf")}><i className="fas fa-file-pdf me-2"></i>PDF Splitter</a>
            </div>

            {/* TAB SMARTLETTER (EKSTRAKSI TEKS SUNGGUHAN) */}
            {aiTab === "smartletter" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 bg-white animate-fade-in-up">
                <div className="text-center mb-4">
                  <h4 className="fw-bolder mb-2 text-dark">Analisis Surat Otomatis</h4>
                  <p className="text-secondary mb-4">Sistem AI memeriksa format teks secara langsung dari file PDF yang Anda unggah.</p>
                  
                  {poPptaFileUrl ? (
                    <a href={poPptaFileUrl} target="_blank" rel="noreferrer" className="badge bg-success bg-opacity-10 text-success border border-success p-2 px-3 shadow-sm text-decoration-none rounded-pill">
                      <i className="fas fa-check-circle me-1"></i> Acuan PPTA Aktif: {poPptaFileName}
                    </a>
                  ) : (
                    <span className="badge bg-warning bg-opacity-10 text-dark border border-warning p-2 px-3 rounded-pill"><i className="fas fa-exclamation-triangle me-1 text-warning"></i> BPH belum mengunggah file acuan PO-PPTA.</span>
                  )}
                </div>
                
                <div className="upload-area mx-auto bg-light border-secondary" style={{ maxWidth: "600px", borderStyle: "dashed" }}>
                  <i className="fas fa-cloud-upload-alt fa-3x text-secondary mb-3"></i>
                  <h6 className="fw-bold text-dark">Upload Surat Draf (.pdf)</h6>
                  <p className="text-muted small">AI akan mengekstrak teks dan membandingkannya dengan kaidah persuratan resmi.</p>
                  <input type="file" className="form-control d-none" id="upload-smartletter" accept=".pdf" />
                  <button className="btn btn-dark mt-2 rounded-pill px-4" onClick={() => document.getElementById('upload-smartletter')?.click()}>Pilih File Surat</button>
                </div>
                
                {aiResponse && (
                  <div className="alert alert-secondary border-0 bg-light mt-4 mx-auto rounded-4 shadow-sm" style={{ maxWidth: "600px" }}>
                    <h6 className="fw-bold text-dark border-bottom pb-2 mb-3"><i className="fas fa-robot me-2 text-primary"></i>Hasil Analisis AI:</h6>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem", color: "#334155", lineHeight: "1.6" }}>{aiResponse}</div>
                  </div>
                )}
                
                <div className="text-center mt-5 border-top pt-4 mx-auto" style={{ maxWidth: "600px" }}>
                  <button className="btn btn-dark px-5 py-3 fw-bold rounded-pill shadow hover-elevate w-100" onClick={handleExtractAndCheck} disabled={isAiLoading || !poPptaFileUrl}>
                    {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Mengekstrak & Menganalisis...</> : <><i className="fas fa-magic me-2"></i> Ekstrak & Analisis AI</>}
                  </button>
                </div>
              </div>
            )}

            {/* TAB NOTULEN */}
            {aiTab === "notulen" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 bg-white animate-fade-in-up">
                <div className="text-center mb-5">
                  <h4 className="fw-bolder mb-2 text-dark">NotulenAI</h4>
                  <p className="text-secondary">Ubah catatan kasar rapat atau foto transkrip menjadi notulensi profesional standar formal.</p>
                </div>
                
                <div className="row g-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-secondary">Judul Kegiatan / Rapat</label>
                    <input type="text" className="form-control bg-light border-secondary" placeholder="Contoh: Rapat Pleno 1" value={notulenJudul} onChange={(e) => setNotulenJudul(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-secondary">Tempat / Lokasi</label>
                    <input type="text" className="form-control bg-light border-secondary" placeholder="Ruang Meeting A" value={notulenTempat} onChange={(e) => setNotulenTempat(e.target.value)} />
                  </div>
                  <div className="col-12 mt-4">
                    <label className="form-label small fw-bold text-secondary">Upload Foto Catatan / Ketik Transkrip</label>
                    <div className="upload-area p-5 bg-light border-secondary">
                      <i className="fas fa-file-alt fa-3x text-secondary mb-3 opacity-50"></i>
                      <p className="m-0 small fw-bold text-dark">Upload JPG/PNG atau Paste teks kasar di area ini</p>
                    </div>
                  </div>
                </div>
                
                {aiResponse && (
                  <div className="alert alert-secondary border-0 bg-light mt-5 mx-auto rounded-4 shadow-sm p-4" style={{ maxWidth: "800px" }}>
                    <h6 className="fw-bold text-dark border-bottom pb-2 mb-3"><i className="fas fa-robot me-2 text-primary"></i>Draf Notulensi AI:</h6>
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.95rem", color: "#334155", lineHeight: "1.6" }}>{aiResponse}</div>
                  </div>
                )}
                
                <div className="text-center mt-5 border-top pt-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <button className="btn btn-dark px-5 py-3 fw-bold rounded-pill shadow hover-elevate w-100" onClick={() => triggerAiProcess("notulen")} disabled={isAiLoading}>
                     {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Merapikan Teks...</> : <><i className="fas fa-pen-fancy me-2"></i> Generate Notulensi Baku</>}
                  </button>
                </div>
              </div>
            )}

            {/* TAB SIGN & STAMP (DRAG AND DROP) */}
            {aiTab === "ttd" && (
              <div className="card border-0 shadow-sm rounded-4 p-0 overflow-hidden bg-white animate-fade-in-up">
                <div className="row g-0">
                  <div className="col-lg-3 border-end bg-light p-4" style={{ minHeight: "600px" }}>
                    <h6 className="fw-bold mb-4 text-dark border-bottom pb-2">Aset Tanda Tangan</h6>
                    
                    <label className="small fw-bold mb-2 text-secondary">Ketua Umum</label>
                    <div className="upload-area p-2 mb-3 bg-white border-secondary shadow-sm cursor-pointer" onClick={() => document.getElementById('upload-ttd-ketua')?.click()}>
                      {ttdKetua ? <span className="small text-success fw-bold"><i className="fas fa-check me-1"></i> Terpilih</span> : <><i className="fas fa-upload text-secondary me-2"></i><span className="small text-secondary fw-500">Pilih File (.png)</span></>}
                      <input type="file" className="form-control d-none" id="upload-ttd-ketua" accept="image/png, image/jpeg" onChange={handleTtdKetuaChange} />
                    </div>

                    <label className="small fw-bold mb-2 text-secondary">Sekretaris Umum</label>
                    <div className="upload-area p-2 mb-3 bg-white border-secondary shadow-sm cursor-pointer" onClick={() => document.getElementById('upload-ttd-sekre')?.click()}>
                      {ttdSekre ? <span className="small text-success fw-bold"><i className="fas fa-check me-1"></i> Terpilih</span> : <><i className="fas fa-upload text-secondary me-2"></i><span className="small text-secondary fw-500">Pilih File (.png)</span></>}
                      <input type="file" className="form-control d-none" id="upload-ttd-sekre" accept="image/png, image/jpeg" onChange={handleTtdSekreChange} />
                    </div>

                    <label className="small fw-bold mb-2 text-secondary">Stempel Lembaga</label>
                    <div className="upload-area p-2 bg-white border-secondary shadow-sm cursor-pointer mb-4" onClick={() => document.getElementById('upload-stempel')?.click()}>
                      {stempel ? <span className="small text-success fw-bold"><i className="fas fa-check me-1"></i> Terpilih</span> : <><i className="fas fa-upload text-secondary me-2"></i><span className="small text-secondary fw-500">Pilih File (.png)</span></>}
                      <input type="file" className="form-control d-none" id="upload-stempel" accept="image/png, image/jpeg" onChange={handleStempelChange} />
                    </div>

                    <div className="border-top pt-3">
                       <label className="small fw-bold mb-2 text-primary">Upload PDF Master</label>
                       <input type="file" className="form-control form-control-sm border-primary" id="upload-pdf-master-ttd" accept=".pdf" onChange={handlePdfMasterChange} />
                    </div>
                  </div>
                  
                  <div className="col-lg-9 p-4 bg-slate-50 d-flex flex-column align-items-center" style={{ overflowX: "auto" }}>
                    <div className="d-flex justify-content-between align-items-center w-100 mb-3" style={{ maxWidth: "700px" }}>
                       <span className="fw-bold text-dark"><i className="fas fa-desktop me-2"></i>Kanvas Interaktif</span>
                       <button className="btn btn-dark rounded-pill px-4 shadow-sm" onClick={handleSignAndStamp} disabled={!pdfMasterTtd || isAiLoading}>
                          {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Menyimpan...</> : <><i className="fas fa-download me-2"></i> Simpan Dokumen</>}
                       </button>
                    </div>

                    {/* KANVAS PDF */}
                    {!pdfPreviewUrl ? (
                      <div className="pdf-preview-container d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: "500px", borderStyle: "dashed", backgroundColor: "white" }}>
                        <i className="fas fa-file-pdf fa-4x mb-3 opacity-25"></i>
                        <p className="fw-bold">Upload Dokumen Master di Panel Kiri</p>
                        <p className="small">Dokumen akan muncul di sini sebagai Kanvas Visual.</p>
                      </div>
                    ) : (
                      <div className="pdf-preview-container" ref={previewRef}>
                        <img src={pdfPreviewUrl} alt="PDF Background" className="pdf-preview-img" />
                        
                        {/* RND Komponen TTD SEKRE */}
                        {ttdSekreUrl && (
                          <Rnd
                            bounds="parent"
                            position={{ x: posSekre.x, y: posSekre.y }}
                            size={{ width: posSekre.w, height: posSekre.h }}
                            onDragStop={(e, d) => setPosSekre({ ...posSekre, x: d.x, y: d.y })}
                            onResizeStop={(e, dir, ref, delta, pos) => setPosSekre({ x: pos.x, y: pos.y, w: parseInt(ref.style.width), h: parseInt(ref.style.height) })}
                          >
                            <img src={ttdSekreUrl} className="draggable-img" alt="ttd sekre" />
                          </Rnd>
                        )}

                        {/* RND Komponen TTD KETUA */}
                        {ttdKetuaUrl && (
                          <Rnd
                            bounds="parent"
                            position={{ x: posKetua.x, y: posKetua.y }}
                            size={{ width: posKetua.w, height: posKetua.h }}
                            onDragStop={(e, d) => setPosKetua({ ...posKetua, x: d.x, y: d.y })}
                            onResizeStop={(e, dir, ref, delta, pos) => setPosKetua({ x: pos.x, y: pos.y, w: parseInt(ref.style.width), h: parseInt(ref.style.height) })}
                          >
                            <img src={ttdKetuaUrl} className="draggable-img" alt="ttd ketua" />
                          </Rnd>
                        )}

                        {/* RND Komponen STEMPEL */}
                        {stempelUrl && (
                          <Rnd
                            bounds="parent"
                            position={{ x: posStempel.x, y: posStempel.y }}
                            size={{ width: posStempel.w, height: posStempel.h }}
                            lockAspectRatio={true}
                            onDragStop={(e, d) => setPosStempel({ ...posStempel, x: d.x, y: d.y })}
                            onResizeStop={(e, dir, ref, delta, pos) => setPosStempel({ x: pos.x, y: pos.y, w: parseInt(ref.style.width), h: parseInt(ref.style.height) })}
                          >
                            <img src={stempelUrl} className="draggable-img" alt="stempel" style={{ opacity: 0.8 }} />
                          </Rnd>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB PDF SPLITTER PRO */}
            {aiTab === "pdf" && (
              <div className="card border-0 shadow-sm rounded-4 p-5 bg-white animate-fade-in-up">
                <div className="text-center mb-5">
                  <h4 className="fw-bolder mb-2 text-dark">PDF Splitter Pro</h4>
                  <p className="text-secondary">Pisahkan file PDF multi-halaman (seperti e-sertifikat) menjadi file satuan yang dinamai otomatis sesuai daftar nama.</p>
                </div>
                
                <div className="row g-4 mx-auto" style={{ maxWidth: "800px" }}>
                  <div className="col-md-6">
                    <div className="card border h-100 shadow-sm rounded-4">
                      <div className="card-header bg-light fw-bold text-dark border-bottom-0 pt-4 pb-2 fs-6"><span className="badge bg-dark text-white me-2 rounded-circle">1</span> Upload PDF Master</div>
                      <div className="card-body d-flex flex-column justify-content-center px-4 pb-4">
                        <p className="small text-secondary mb-3">Pilih file PDF yang berisi banyak halaman.</p>
                        
                        <div className="upload-area p-4 bg-white flex-grow-1 d-flex flex-column align-items-center justify-content-center border-secondary shadow-sm">
                          <i className="fas fa-file-pdf text-secondary mb-3 fa-2x"></i>
                          <p className="m-0 small fw-bold text-dark text-truncate w-100 px-2">{splitPdfFile ? splitPdfFile.name : "Pilih PDF Master"}</p>
                          <input type="file" className="form-control d-none" id="upload-pdf-master-split" accept=".pdf" onChange={(e) => setSplitPdfFile(e.target.files?.[0] || null)} />
                          <button className="btn btn-sm btn-outline-dark mt-2 rounded-pill" onClick={() => document.getElementById('upload-pdf-master-split')?.click()}>Cari File</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border h-100 shadow-sm rounded-4">
                      <div className="card-header bg-light fw-bold text-dark border-bottom-0 pt-4 pb-2 fs-6"><span className="badge bg-dark text-white me-2 rounded-circle">2</span> Daftar Nama File</div>
                      <div className="card-body px-4 pb-4">
                        <p className="small text-secondary mb-3">Satu baris tulisan akan menjadi satu nama file.</p>
                        <textarea 
                          className="form-control bg-light border-secondary" 
                          rows={6} 
                          style={{ resize: "none" }}
                          placeholder="Ahmad Albert&#10;Budi Santoso&#10;Siti Aminah..."
                          value={pdfSplitNames}
                          onChange={(e) => setPdfSplitNames(e.target.value)}
                        ></textarea>
                        {pdfSplitNames && (
                          <div className="mt-2 text-end small fw-bold text-primary">
                            <i className="fas fa-check-circle me-1"></i> {pdfSplitNames.split('\n').filter(n => n.trim() !== '').length} nama terbaca
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-5 pt-4 border-top mx-auto" style={{ maxWidth: "800px" }}>
                    <h6 className="fw-bold mb-3 text-dark">Siap Memproses?</h6>
                    <button className="btn btn-dark px-5 py-3 fw-bold rounded-pill shadow hover-elevate w-100" onClick={handleProcessSplitPDF} disabled={isAiLoading || !splitPdfFile}>
                      {isAiLoading ? <><i className="fas fa-spinner fa-spin me-2"></i> Memproses & Membungkus ZIP...</> : <><i className="fas fa-file-archive me-2"></i> Pisahkan & Download ZIP</>}
                    </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MENU: PENGATURAN WEB & SUSUNAN KEPENGURUSAN --- */}
        {activeMenu === "pengaturan_web" && (
          <div className="animate-fade-in-up">
            <h4 className="fw-bolder mb-4 text-dark">Pengaturan Web & Organisasi</h4>
            <div className="row g-4">
              <div className="col-lg-8">
                
                {/* KARTU PENGATURAN PROFIL */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                  <h6 className="fw-bold mb-4 text-dark fs-5 border-bottom pb-2"><i className="fas fa-edit text-secondary me-2"></i>Profil Organisasi Publik</h6>
                  <form onSubmit={handleSaveWebSettings}>
                    <div className="mb-4">
                      <label className="form-label small fw-bold text-secondary">Nama / Tema Grand Design</label>
                      <textarea className="form-control bg-light" rows={2} value={webGrandDesign} onChange={(e) => setWebGrandDesign(e.target.value)} required></textarea>
                    </div>
                    <div className="row g-4 mb-4">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Visi Utama</label>
                        <textarea className="form-control bg-light" rows={4} value={webVisi} onChange={(e) => setWebVisi(e.target.value)} required></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-secondary">Misi Pokok (Bisa list angka)</label>
                        <textarea className="form-control bg-light" rows={4} value={webMisi} onChange={(e) => setWebMisi(e.target.value)} required></textarea>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="form-label small fw-bold text-secondary">Highlight Agenda/Proker Bulan Ini</label>
                      <input type="text" className="form-control bg-light py-2" value={webProker} onChange={(e) => setWebProker(e.target.value)} required />
                    </div>
                    
                    <hr className="my-5 bg-secondary opacity-25" />

                    <div className="mb-4 p-4 rounded-4 border bg-light shadow-sm">
                      <h6 className="fw-bold text-dark mb-2"><i className="fas fa-file-pdf me-2 text-danger"></i>Dokumen Pedoman (PO-PPTA)</h6>
                      <p className="small text-muted mb-3">Upload file PDF Pedoman Organisasi yang menjadi Master Acuan bagi AI dalam mengecek kesalahan format surat.</p>
                      
                      <div className="d-flex align-items-center gap-3">
                        <input type="file" className="form-control d-none" id="upload-po-ppta" accept=".pdf" onChange={handlePoPptaUpload} />
                        <button type="button" className="btn btn-dark fw-bold rounded-pill shadow-sm" onClick={() => document.getElementById('upload-po-ppta')?.click()} disabled={isUploadingPdf}>
                          {isUploadingPdf ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-upload me-2"></i>}
                          {isUploadingPdf ? "Menyimpan ke Cloud..." : "Pilih File PDF"}
                        </button>
                        <div className="text-dark small fw-500 text-truncate" style={{ maxWidth: "250px" }}>
                          {poPptaFileName ? <span className="text-success"><i className="fas fa-check-circle me-1"></i> {poPptaFileName}</span> : "Belum ada file dipilih"}
                        </div>
                      </div>
                      {poPptaFileUrl && (
                        <div className="mt-3 small">
                          <a href={poPptaFileUrl} target="_blank" rel="noreferrer" className="text-primary text-decoration-none fw-bold"><i className="fas fa-external-link-alt me-1"></i> Lihat Dokumen Master Saat Ini</a>
                        </div>
                      )}
                    </div>

                    <div className="mb-5 p-4 rounded-4 border bg-light shadow-sm">
                      <h6 className="fw-bold text-dark mb-2"><i className="fas fa-calendar-alt me-2 text-primary"></i>Integrasi Kalender (Google Calendar)</h6>
                      <p className="small text-muted mb-3">Masukkan link iframe/embed (bagian <code className="bg-white px-1 border rounded">src="..."</code>) dari Pengaturan Google Calendar organisasi.</p>
                      <input type="url" className="form-control bg-white py-2" placeholder="https://calendar.google.com/calendar/embed?src=..." value={linkGCal} onChange={(e) => setLinkGCal(e.target.value)} />
                    </div>

                    <button type="submit" className="btn btn-dark fw-bold px-5 py-3 w-100 rounded-pill shadow hover-elevate" disabled={isSavingWeb || isUploadingPdf}>
                      <i className="fas fa-save me-2"></i> {isSavingWeb ? "Menyimpan ke Server..." : "Simpan Semua Pengaturan Web"}
                    </button>
                  </form>
                </div>

                {/* KARTU UPLOAD EXCEL KEPENGURUSAN */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white border-top border-4 border-info">
                  <h6 className="fw-bold mb-4 text-dark fs-5 border-bottom pb-2"><i className="fas fa-users-cog text-secondary me-2"></i>Sinkronisasi Database Kepengurusan</h6>
                  <p className="small text-muted mb-4">Sistem akan otomatis membuat bagan struktur berdasarkan data Excel. Urutan kolom wajib: <b>Nama, NIM, Jabatan, Kementerian/Lembaga</b>.</p>
                  
                  <div className="upload-area mb-4 p-5 bg-light border-secondary shadow-sm">
                    <i className="fas fa-file-excel fa-3x text-success mb-3 opacity-75"></i>
                    <h6 className="fw-bold text-dark mb-1">{excelFileName || "Upload Master Excel (.xlsx)"}</h6>
                    <p className="small text-muted mb-0">Drag and drop file atau klik tombol di bawah</p>
                    <input type="file" className="form-control d-none" id="upload-excel-pengurus" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                    <button type="button" className="btn btn-outline-dark rounded-pill mt-3 px-4 fw-bold shadow-sm bg-white" onClick={() => document.getElementById('upload-excel-pengurus')?.click()}>
                      Pilih File
                    </button>
                  </div>

                  <div className="d-flex justify-content-between align-items-center bg-slate-50 p-3 rounded-3 border">
                    <span className="small text-dark fw-bold">
                      <i className="fas fa-info-circle text-primary me-2"></i> 
                      {dataPengurus.length > 0 ? `${dataPengurus.length} Baris Data Terbaca` : "Belum Ada Data Baru"}
                    </span>
                    <button className="btn btn-dark fw-bold px-4 rounded-pill shadow-sm" onClick={handleSaveWebSettings} disabled={isSavingWeb || dataPengurus.length === 0}>
                      <i className="fas fa-sync-alt me-2"></i> Sinkronisasi
                    </button>
                  </div>
                </div>

              </div>

              <div className="col-lg-4">
                <div className="glass-card p-4 rounded-4 sticky-top shadow-lg" style={{ top: "90px" }}>
                  <h6 className="fw-bolder mb-4 text-white border-bottom border-secondary border-opacity-50 pb-2"><i className="fas fa-lightbulb me-2 text-warning"></i>Pusat Bantuan</h6>
                  <p className="small opacity-75 mb-4 text-white lh-lg">Informasi yang disimpan pada menu ini merupakan <b>Jantung Aplikasi</b> yang akan merefleksikan identitas organisasi di halaman beranda utama.</p>
                  
                  <h6 className="fw-bold text-white small mb-2"><i className="fas fa-check-circle text-success me-2"></i>Panduan Upload Pengurus</h6>
                  <ol className="small opacity-75 ps-3 mb-0 text-white lh-lg font-monospace">
                    <li>Buat sheet Excel baru.</li>
                    <li>Baris pertama WAJIB dikosongkan/diisi judul header.</li>
                    <li>Kolom A: Nama Lengkap</li>
                    <li>Kolom B: NIM Mahasiswa</li>
                    <li>Kolom C: Jabatan (ex: Sekretaris)</li>
                    <li>Kolom D: Nama Lembaga Induk</li>
                    <li>Save As .xlsx dan Upload.</li>
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