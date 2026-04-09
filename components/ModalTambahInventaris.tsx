"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ModalInvProps {
  kementerianName: string;
  tipe: string; // "Rekap" atau "Buku"
  onClose: () => void;
}

export default function ModalTambahInventaris({ kementerianName, tipe, onClose }: ModalInvProps) {
  const [nama, setNama] = useState("");
  const [cond, setCond] = useState("Baik"); // Baik, Kurang Baik, Rusak
  const [ket, setKet] = useState("");
  
  // Rekap Fields
  const [merk, setMerk] = useState("");
  const [thn, setThn] = useState("");
  const [jml, setJml] = useState("");

  // Buku Fields
  const [kode, setKode] = useState("");
  const [jenis, setJenis] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const dataInv: any = {
      type: tipe,
      nama: nama,
      cond: cond,
      ket: ket,
      scope: kementerianName,
      createdAt: Date.now(),
    };

    if (tipe === "Rekap") {
      dataInv.merk = merk;
      dataInv.thn = thn;
      dataInv.jml = Number(jml);
    } else {
      dataInv.kode = kode;
      dataInv.jenis = jenis;
    }

    try {
      await addDoc(collection(db, "inventaris"), dataInv);
      alert(`Data Inventaris ${tipe} berhasil disimpan!`);
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
              <h5 className="modal-title fw-bold m-0 text-danger">Input Inventaris {tipe}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="small fw-bold">Nama Barang</label>
                <input type="text" className="form-control" placeholder="Printer / Proyektor" value={nama} onChange={(e) => setNama(e.target.value)} required />
              </div>

              {tipe === "Rekap" && (
                <>
                  <div className="mb-3">
                    <label className="small fw-bold">Merk Barang</label>
                    <input type="text" className="form-control" placeholder="Epson / Asus" value={merk} onChange={(e) => setMerk(e.target.value)} />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col">
                      <label className="small fw-bold">Tahun</label>
                      <input type="number" className="form-control" placeholder="2026" value={thn} onChange={(e) => setThn(e.target.value)} />
                    </div>
                    <div className="col">
                      <label className="small fw-bold">Jumlah</label>
                      <input type="number" className="form-control" placeholder="Qty" value={jml} onChange={(e) => setJml(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              {tipe === "Buku" && (
                <div className="row g-2 mb-3">
                  <div className="col">
                    <label className="small fw-bold">Kode Barang</label>
                    <input type="text" className="form-control" placeholder="INV-001" value={kode} onChange={(e) => setKode(e.target.value)} />
                  </div>
                  <div className="col">
                    <label className="small fw-bold">Jenis</label>
                    <input type="text" className="form-control" placeholder="Elektronik" value={jenis} onChange={(e) => setJenis(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="small fw-bold">Kondisi</label>
                <select className="form-select" value={cond} onChange={(e) => setCond(e.target.value)}>
                  <option value="Baik">Baik</option>
                  <option value="Kurang Baik">Kurang Baik</option>
                  <option value="Rusak">Rusak</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="small fw-bold">Keterangan</label>
                <textarea className="form-control" rows={2} placeholder="Catatan tambahan..." value={ket} onChange={(e) => setKet(e.target.value)}></textarea>
              </div>
            </div>

            <div className="modal-footer border-top p-3 bg-light rounded-bottom-4">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-danger fw-bold" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Aset"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}