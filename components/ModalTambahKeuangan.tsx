"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

interface ModalKeuanganProps {
  kementerianName: string;
  kategori: string;
  onClose: () => void;
  initialData?: any; // Tambahan agar tidak error di TypeScript
}

export default function ModalTambahKeuangan({ kementerianName, kategori, onClose, initialData }: ModalKeuanganProps) {
  // State Umum
  const [tgl, setTgl] = useState("");
  const [jenis, setJenis] = useState("Keluar"); // Default Keluar
  const [uraian, setUraian] = useState("");
  const [nom, setNom] = useState("");

  // State Khusus Operasional & Kepanitiaan
  const [pj, setPj] = useState("");
  const [noNota, setNoNota] = useState("");
  const [vol, setVol] = useState("");
  const [satVol, setSatVol] = useState("");
  const [satHrg, setSatHrg] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // AUTO-FILL DATA (Dari OCR atau Mode Edit)
  useEffect(() => {
    if (initialData) {
      setTgl(initialData.tgl || "");
      setJenis(initialData.jenis || "Keluar");
      setUraian(initialData.uraian || initialData.nama_barang || "");
      setNom(initialData.nom || initialData.jumlah || "");
      
      setPj(initialData.pj || "");
      setNoNota(initialData.no_nota || "");
      setVol(initialData.vol || initialData.qty || "");
      setSatVol(initialData.sat_vol || "");
      setSatHrg(initialData.sat_hrg || initialData.hrg || "");
    } else {
      // Set default jenis untuk kategori tertentu
      if (kategori === "Kepanitiaan" || kategori === "Operasional") {
        setJenis("Keluar");
      } else {
        setJenis("Masuk");
      }
    }
  }, [initialData, kategori]);

  // Kalkulasi Total Dinamis untuk Ops & Kepanitiaan
  const hitungTotal = () => {
    const qty = Number(vol) || 0;
    const hrg = Number(satHrg) || 0;
    return qty * hrg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dataKeu: any = {
      cat: kategori,
      tgl: tgl,
      jenis: jenis,
      uraian: uraian,
      nom: Number(nom),
      scope: kementerianName,
      updatedAt: Date.now(),
    };

    // Penyesuaian Data Khusus
    if (kategori === "Operasional") {
      dataKeu.pj = pj;
      dataKeu.qty = Number(vol);
      dataKeu.hrg = Number(satHrg);
      dataKeu.nom = hitungTotal(); // Override nominal dengan total
    } else if (kategori === "Kepanitiaan") {
      dataKeu.no_nota = noNota;
      dataKeu.nama_barang = uraian; 
      dataKeu.vol = Number(vol);
      dataKeu.sat_vol = satVol;
      dataKeu.sat_hrg = Number(satHrg);
      dataKeu.jumlah = hitungTotal();
      dataKeu.nom = dataKeu.jumlah; // Disamakan agar gampang direkap
      dataKeu.nama_kegiatan = initialData?.nama_kegiatan || "Kegiatan Baru";
      dataKeu.jenis = "Keluar"; // Nota kepanitiaan biasanya pengeluaran
    }

    try {
      if (initialData && initialData.id) {
        // MODE EDIT
        await updateDoc(doc(db, "keuangan", initialData.id), dataKeu);
        alert("Data Transaksi berhasil diperbarui!");
      } else {
        // MODE TAMBAH BARU / OCR
        dataKeu.createdAt = Date.now();
        await addDoc(collection(db, "keuangan"), dataKeu);
        alert("Data Transaksi berhasil ditambahkan!");
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data keuangan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "550px", margin: "50px auto" }}>
        <div className="modal-content bg-white rounded-4 shadow-lg border-0 animate-fade-in-up">
          <form onSubmit={handleSubmit}>
            <div className="modal-header border-bottom p-3">
              <h5 className="modal-title fw-bold m-0 text-dark">
                {initialData && initialData.id ? "Edit Data" : "Input Transaksi"} {kategori}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              
              {initialData && !initialData.id && (
                <div className="alert alert-info py-2 px-3 small border-0 rounded-3 mb-3">
                  <i className="fas fa-robot me-2 text-primary"></i> Data diekstrak dari nota. <strong>Harap periksa ulang</strong> isian di bawah ini.
                </div>
              )}

              {/* RENDER FORM BERDASARKAN KATEGORI */}
              
              {/* === FORM KEPANITIAAN === */}
              {kategori === "Kepanitiaan" && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="small fw-bold">Nomor Nota</label>
                      <input type="text" className="form-control" placeholder="NOTA-001" value={noNota} onChange={(e) => setNoNota(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="small fw-bold">Tanggal</label>
                      <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Nama Barang</label>
                    <input type="text" className="form-control" placeholder="Print Banner / Konsumsi" value={uraian} onChange={(e) => setUraian(e.target.value)} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="small fw-bold">Volume</label>
                      <input type="number" className="form-control" placeholder="Jml" value={vol} onChange={(e) => setVol(e.target.value)} required />
                    </div>
                    <div className="col-4">
                      <label className="small fw-bold">Satuan</label>
                      <input type="text" className="form-control" placeholder="Pcs/Lbr" value={satVol} onChange={(e) => setSatVol(e.target.value)} required />
                    </div>
                    <div className="col-4">
                      <label className="small fw-bold">Harga Satuan</label>
                      <input type="number" className="form-control" placeholder="Rp" value={satHrg} onChange={(e) => setSatHrg(e.target.value)} required />
                    </div>
                  </div>
                  <div className="p-3 bg-light rounded-3 text-end border">
                    <span className="small text-muted me-2">Total Jumlah:</span>
                    <strong className="fs-5 text-danger">Rp {hitungTotal().toLocaleString('id-ID')}</strong>
                  </div>
                </>
              )}

              {/* === FORM OPERASIONAL === */}
              {kategori === "Operasional" && (
                <>
                  <div className="mb-3">
                    <label className="small fw-bold">Tanggal</label>
                    <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Uraian Keperluan</label>
                    <input type="text" className="form-control" placeholder="Beli Tinta Printer" value={uraian} onChange={(e) => setUraian(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Penanggung Jawab</label>
                    <input type="text" className="form-control" placeholder="Nama PJ" value={pj} onChange={(e) => setPj(e.target.value)} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="small fw-bold">Qty</label>
                      <input type="number" className="form-control" value={vol} onChange={(e) => setVol(e.target.value)} required />
                    </div>
                    <div className="col-8">
                      <label className="small fw-bold">Harga Satuan</label>
                      <input type="number" className="form-control" value={satHrg} onChange={(e) => setSatHrg(e.target.value)} required />
                    </div>
                  </div>
                  <div className="p-3 bg-light rounded-3 text-end border">
                    <span className="small text-muted me-2">Total Pengeluaran:</span>
                    <strong className="fs-5 text-danger">Rp {hitungTotal().toLocaleString('id-ID')}</strong>
                  </div>
                </>
              )}

              {/* === FORM UMUM (DIPA, INTERN, EXTERN, BANK) === */}
              {kategori !== "Kepanitiaan" && kategori !== "Operasional" && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="small fw-bold">Tanggal</label>
                      <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="small fw-bold">Jenis Arus</label>
                      <select className="form-select" value={jenis} onChange={(e) => setJenis(e.target.value)}>
                        <option value="Masuk">Pemasukan (Debit)</option>
                        <option value="Keluar">Pengeluaran (Kredit)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Uraian / Kegiatan</label>
                    <input type="text" className="form-control" placeholder="Keterangan transaksi..." value={uraian} onChange={(e) => setUraian(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold">Nominal (Rp)</label>
                    <input type="number" className="form-control" placeholder="150000" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                </>
              )}

            </div>

            <div className="modal-footer border-top p-3 bg-light rounded-bottom-4">
              <button type="button" className="btn btn-secondary rounded-pill fw-bold px-4" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-dark rounded-pill fw-bold px-4" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}