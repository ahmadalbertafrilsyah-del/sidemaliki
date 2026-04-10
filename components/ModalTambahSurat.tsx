"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ModalSuratProps {
  kementerianName: string;
  tipe: string; // "Masuk" atau "Keluar"
  onClose: () => void;
}

export default function ModalTambahSurat({ kementerianName, tipe, onClose, initialData }: any) {
  const [no, setNo] = useState("");
  const [asalTujuan, setAsalTujuan] = useState("");
  const [tglBuat, setTglBuat] = useState("");
  const [tglProses, setTglProses] = useState("");
  const [hal, setHal] = useState("");
  const [linkDrive, setLinkDrive] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dataSurat: any = {
      no: no,
      tgl_buat: tglBuat,
      hal: hal,
      link_drive: linkDrive,
      scope: kementerianName,
      createdAt: Date.now(),
    };

    // Sesuaikan field berdasarkan tipe surat
    if (tipe === "Masuk") {
      dataSurat.asal = asalTujuan;
      dataSurat.tgl_datang = tglProses;
    } else {
      dataSurat.tujuan = asalTujuan;
      dataSurat.tgl_kirim = tglProses;
    }

    const targetCollection = tipe === "Masuk" ? "surat_masuk" : "surat_keluar";

    try {
      await addDoc(collection(db, targetCollection), dataSurat);
      alert(`Surat ${tipe} berhasil disimpan!`);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data surat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "500px", margin: "50px auto" }}>
        <div className="modal-content bg-white rounded-4 shadow-lg border-0">
          <form onSubmit={handleSubmit}>
            <div className="modal-header border-bottom p-3">
              <h5 className={`modal-title fw-bold m-0 ${tipe === "Masuk" ? "text-primary" : "text-warning"}`}>
                Input Surat {tipe}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="small fw-bold">Nomor Surat</label>
                <input type="text" className="form-control" placeholder="001/DEMA/2026" value={no} onChange={(e) => setNo(e.target.value)} required />
              </div>
              
              <div className="mb-3">
                <label className="small fw-bold">{tipe === "Masuk" ? "Instansi Pengirim (Asal)" : "Instansi Penerima (Tujuan)"}</label>
                <input type="text" className="form-control" placeholder="Contoh: Rektorat / BEM Universitas" value={asalTujuan} onChange={(e) => setAsalTujuan(e.target.value)} required />
              </div>

              <div className="row g-2 mb-3">
                <div className="col">
                  <label className="small fw-bold">Tanggal Surat</label>
                  <input type="date" className="form-control" value={tglBuat} onChange={(e) => setTglBuat(e.target.value)} required />
                </div>
                <div className="col">
                  <label className="small fw-bold">{tipe === "Masuk" ? "Tanggal Diterima" : "Tanggal Dikirim"}</label>
                  <input type="date" className="form-control" value={tglProses} onChange={(e) => setTglProses(e.target.value)} required />
                </div>
              </div>

              <div className="mb-3">
                <label className="small fw-bold">Perihal / Agenda</label>
                <input type="text" className="form-control" placeholder="Undangan Rapat / Peminjaman Gedung" value={hal} onChange={(e) => setHal(e.target.value)} required />
              </div>

              <div className="mb-3 p-3 bg-light rounded border">
                <label className="small fw-bold text-primary"><i className="fab fa-google-drive me-2"></i>Link File Google Drive</label>
                <input 
                  type="url" 
                  className="form-control form-control-sm mt-1" 
                  placeholder="https://drive.google.com/..." 
                  value={linkDrive} 
                  onChange={(e) => setLinkDrive(e.target.value)} 
                />
                <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>*Pastikan akses link Google Drive di-set ke "Siapa saja yang memiliki link" (Anyone with the link).</small>
              </div>
            </div>

            <div className="modal-footer border-top p-3 bg-light rounded-bottom-4">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className={`btn fw-bold ${tipe === "Masuk" ? "btn-primary" : "btn-warning text-dark"}`} disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Surat"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}