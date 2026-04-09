"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ModalKeuProps {
  kementerianName: string;
  kategori: string; // "Bank" atau "Operasional"
  onClose: () => void;
}

export default function ModalTambahKeuangan({ kementerianName, kategori, onClose }: ModalKeuProps) {
  const [tgl, setTgl] = useState("");
  const [uraian, setUraian] = useState("");
  const [jenis, setJenis] = useState("Masuk"); // "Masuk" atau "Keluar"
  const [nom, setNom] = useState("");
  
  // Khusus Operasional
  const [pj, setPj] = useState("");
  const [qty, setQty] = useState("");
  const [hrg, setHrg] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dataKeuangan: any = {
      cat: kategori,
      tgl: tgl,
      uraian: uraian,
      jenis: jenis,
      nom: Number(nom),
      scope: kementerianName,
      createdAt: Date.now(),
    };

    if (kategori === "Operasional") {
      dataKeuangan.pj = pj;
      dataKeuangan.qty = Number(qty);
      dataKeuangan.hrg = Number(hrg);
      // Nominal total otomatis dihitung
      dataKeuangan.nom = Number(qty) * Number(hrg);
    }

    try {
      await addDoc(collection(db, "keuangan"), dataKeuangan);
      alert(`Data ${kategori} berhasil disimpan!`);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data.");
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
              <h5 className="modal-title fw-bold m-0 text-primary">Input Keuangan {kategori}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="small fw-bold">Tanggal</label>
                <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="small fw-bold">Uraian Transaksi</label>
                <input type="text" className="form-control" placeholder="Beli ATK / Dana Cair" value={uraian} onChange={(e) => setUraian(e.target.value)} required />
              </div>

              {kategori === "Operasional" && (
                <>
                  <div className="mb-3">
                    <label className="small fw-bold">Penanggung Jawab (PJ)</label>
                    <input type="text" className="form-control" placeholder="Nama PJ" value={pj} onChange={(e) => setPj(e.target.value)} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col">
                      <label className="small fw-bold">Qty</label>
                      <input type="number" className="form-control" placeholder="Jumlah" value={qty} onChange={(e) => setQty(e.target.value)} required />
                    </div>
                    <div className="col">
                      <label className="small fw-bold">Harga Satuan</label>
                      <input type="number" className="form-control" placeholder="Rp" value={hrg} onChange={(e) => setHrg(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              <div className="row g-2 mb-3">
                <div className="col-md-5">
                  <label className="small fw-bold">Jenis Arus</label>
                  <select className="form-select" value={jenis} onChange={(e) => setJenis(e.target.value)}>
                    <option value="Masuk">Pemasukan (+)</option>
                    <option value="Keluar">Pengeluaran (-)</option>
                  </select>
                </div>
                {kategori === "Bank" && (
                  <div className="col-md-7">
                    <label className="small fw-bold">Nominal</label>
                    <input type="number" className="form-control" placeholder="Rp" value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-top p-3 bg-light rounded-bottom-4">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary fw-bold" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}