"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import SignatureCanvas from "react-signature-canvas";

export default function FormPresensi({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  
  // SOLUSI ERROR NEXT.JS 15: Unwrap params menggunakan React.use()
  const resolvedParams = use(params);
  const slug = resolvedParams.slug; 

  // State Data Kegiatan
  const [kegiatan, setKegiatan] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State Form Input
  const [nama, setNama] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [kementerian, setKementerian] = useState("");

  // State Kamera & Foto
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user"); // user = depan, environment = belakang
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // State Tanda Tangan
  const sigPad = useRef<SignatureCanvas>(null);

  // State Proses Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Ambil Data Kegiatan dari Firestore saat halaman dimuat
  useEffect(() => {
    const fetchKegiatan = async () => {
      if (!slug) return;
      try {
        const docRef = doc(db, "presensi", slug); 
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setKegiatan(docSnap.data());
        } else {
          setKegiatan(null);
        }
      } catch (error) {
        console.error("Gagal mengambil data kegiatan:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchKegiatan();
  }, [slug]);

  // 2. Logika Kamera Terintegrasi
  const startCamera = async (mode: "user" | "environment") => {
    setIsCameraOpen(true);
    setFotoBase64(null); 
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      alert("Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera pada browser.");
      setIsCameraOpen(false);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = canvas.toDataURL("image/jpeg", 0.8);
        setFotoBase64(imgData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // Bersihkan memori kamera kalau user menutup halaman
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  // 3. Logika Upload Gambar ke Cloudinary
  const uploadToCloudinary = async (base64Image: string) => {
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error("Konfigurasi Cloudinary tidak ditemukan di env.");
    }

    const formData = new FormData();
    formData.append("file", base64Image);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gagal upload gambar");
    return data.secure_url;
  };

  // 4. Proses Submit Form Ke Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !jabatan || !kementerian) return alert("Harap isi semua data teks!");
    if (!fotoBase64) return alert("Harap ambil foto bukti kehadiran (Selfie)!");
    if (sigPad.current?.isEmpty()) return alert("Harap isi tanda tangan Anda pada kanvas yang disediakan!");

    setIsSubmitting(true);

    try {
      const ttdBase64 = sigPad.current?.getTrimmedCanvas().toDataURL("image/png");

      const [fotoUrl, ttdUrl] = await Promise.all([
        uploadToCloudinary(fotoBase64),
        uploadToCloudinary(ttdBase64 as string)
      ]);

      const pesertaRef = collection(db, "presensi", slug, "peserta");
      await addDoc(pesertaRef, {
        nama,
        jabatan,
        kementerian,
        fotoUrl,
        ttdUrl,
        waktu_absen: new Date().toLocaleString("id-ID"),
        timestamp: Date.now()
      });

      setIsSuccess(true);
    } catch (error: any) {
      alert("Terjadi kesalahan saat mengirim presensi: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin fa-3x text-primary mb-3"></i>
          <h5 className="text-secondary fw-bold">Memuat Formulir Presensi...</h5>
        </div>
      </div>
    );
  }

  if (!kegiatan) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light px-3">
        <div className="card shadow-sm border-0 rounded-4 p-5 text-center" style={{ maxWidth: "400px" }}>
          <i className="fas fa-exclamation-triangle fa-4x text-warning mb-3 opacity-50"></i>
          <h4 className="fw-bolder text-dark">Link Tidak Valid</h4>
          <p className="text-muted">Formulir presensi tidak ditemukan atau sudah ditutup oleh panitia.</p>
          <button className="btn btn-dark rounded-pill fw-bold mt-2" onClick={() => router.push("/")}>Ke Beranda</button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 p-3" style={{ backgroundColor: "#f8fafc" }}>
        <div className="card shadow-lg border-0 rounded-4 p-5 text-center animate-fade-in-up" style={{ maxWidth: "450px", width: "100%" }}>
          <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: "80px", height: "80px" }}>
            <i className="fas fa-check fa-3x"></i>
          </div>
          <h3 className="fw-bolder text-dark">Presensi Berhasil!</h3>
          <p className="text-muted mb-4">Terima kasih <b>{nama}</b>. Kehadiran Anda pada agenda <b>{kegiatan.nama_kegiatan}</b> telah tercatat valid di sistem.</p>
          <button className="btn btn-light border rounded-pill fw-bold shadow-sm" onClick={() => window.location.reload()}>Absen Anggota Lain</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 py-4 py-md-5 px-3" style={{ backgroundColor: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      
      <style>{`
        .glass-header { background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 20px 20px 0 0; }
        .form-control:focus, .form-select:focus { border-color: #0f172a; box-shadow: 0 0 0 0.25rem rgba(15, 23, 42, 0.1); }
        .canvas-wrapper { border: 2px dashed #cbd5e1; border-radius: 12px; background: #ffffff; overflow: hidden; touch-action: none; }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="mx-auto animate-fade-in-up" style={{ maxWidth: "600px" }}>
        
        <div className="card shadow-lg border-0 rounded-4 mb-4 overflow-hidden">
          <div className="glass-header p-4 text-center position-relative overflow-hidden">
             <i className="fas fa-clipboard-check fa-4x position-absolute opacity-10" style={{ right: "-10px", top: "-10px" }}></i>
             <span className="badge bg-white text-dark rounded-pill mb-2 px-3 py-1 shadow-sm fw-bold">E-Presensi DEMA</span>
             <h4 className="fw-bolder mb-1 lh-base">{kegiatan.nama_kegiatan}</h4>
             <p className="m-0 text-white opacity-75 small"><i className="fas fa-calendar-alt me-2"></i>{kegiatan.tgl}</p>
          </div>

          <div className="card-body p-4 bg-white">
            <form onSubmit={handleSubmit}>
              
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3"><i className="fas fa-user-circle me-2 text-primary"></i>Identitas Pengurus</h6>
              
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">Nama Lengkap</label>
                <input type="text" className="form-control bg-light py-2" placeholder="Masukkan nama Anda..." value={nama} onChange={(e) => setNama(e.target.value)} required />
              </div>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">Jabatan</label>
                  <input type="text" className="form-control bg-light py-2" placeholder="Contoh: Dirjen" value={jabatan} onChange={(e) => setJabatan(e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">Kementerian / Lembaga</label>
                  <input type="text" className="form-control bg-light py-2" placeholder="Kementerian Luar Negeri" value={kementerian} onChange={(e) => setKementerian(e.target.value)} required />
                </div>
              </div>

              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 mt-4"><i className="fas fa-camera me-2 text-success"></i>Bukti Kehadiran (Selfie/Foto)</h6>
              
              {!fotoBase64 && !isCameraOpen && (
                 <div className="text-center p-4 border border-2 border-dashed rounded-4 bg-light mb-4 cursor-pointer hover-elevate" onClick={() => startCamera(facingMode)}>
                    <i className="fas fa-camera fa-3x text-secondary mb-2 opacity-50"></i>
                    <p className="small text-muted mb-3">Mohon ambil foto wajah Anda di lokasi kegiatan sebagai bukti validasi.</p>
                    <button type="button" className="btn btn-dark rounded-pill fw-bold px-4 shadow-sm">
                       <i className="fas fa-video me-2"></i> Buka Kamera
                    </button>
                 </div>
              )}

              {isCameraOpen && (
                <div className="mb-4">
                  <div className="position-relative rounded-4 overflow-hidden shadow-sm bg-dark mb-3" style={{ height: "350px", width: "100%" }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)" }}></video>
                  </div>
                  <div className="d-flex justify-content-center gap-2">
                    <button type="button" className="btn btn-secondary rounded-pill shadow-sm px-4" onClick={switchCamera}><i className="fas fa-sync-alt me-1"></i> Putar</button>
                    <button type="button" className="btn btn-success rounded-pill fw-bold px-4 shadow-sm" onClick={takePhoto}><i className="fas fa-camera me-1"></i> Jepret</button>
                    <button type="button" className="btn btn-danger rounded-pill shadow-sm px-3" onClick={stopCamera}><i className="fas fa-times"></i></button>
                  </div>
                </div>
              )}

              {fotoBase64 && (
                <div className="mb-4 text-center">
                  <div className="position-relative d-inline-block">
                     <img src={fotoBase64} alt="Bukti Hadir" className="img-fluid rounded-4 shadow-sm border border-3 border-white" style={{ maxHeight: "350px", objectFit: "cover", width: "100%" }} />
                     <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success p-2 border border-light"><i className="fas fa-check"></i> Valid</span>
                  </div>
                  <div className="mt-3">
                     <button type="button" className="btn btn-sm btn-outline-dark rounded-pill fw-bold px-4" onClick={() => startCamera(facingMode)}><i className="fas fa-redo me-1"></i> Foto Ulang</button>
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} className="d-none"></canvas>

              <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 mt-4"><i className="fas fa-signature me-2 text-danger"></i>Tanda Tangan Digital</h6>
              <p className="small text-muted mb-2">Silakan tanda tangan di dalam kotak putih di bawah ini (Bisa menggunakan jari).</p>
              
              <div className="canvas-wrapper mb-2 shadow-sm">
                <SignatureCanvas 
                   ref={sigPad} 
                   penColor="black"
                   canvasProps={{ className: "w-100", style: { height: "200px", cursor: "crosshair" } }} 
                />
              </div>
              <div className="text-end mb-5">
                 <button type="button" className="btn btn-sm btn-light border text-danger rounded-pill px-3 shadow-sm" onClick={() => sigPad.current?.clear()}><i className="fas fa-eraser me-1"></i> Bersihkan TTD</button>
              </div>

              <div className="d-grid mt-4">
                <button type="submit" className="btn btn-dark btn-lg rounded-pill shadow fw-bolder py-3" disabled={isSubmitting}>
                  {isSubmitting ? <><i className="fas fa-spinner fa-spin me-2"></i> Mengirim Data...</> : <><i className="fas fa-paper-plane me-2"></i> Kirim Presensi Sekarang</>}
                </button>
              </div>

            </form>
          </div>
        </div>
        
        <div className="text-center pb-5">
           <small className="text-muted fw-bold letter-spacing-1"><i className="fas fa-shield-alt me-1"></i>Secure E-Presensi DEMA UIN Malang</small>
        </div>

      </div>
    </div>
  );
}