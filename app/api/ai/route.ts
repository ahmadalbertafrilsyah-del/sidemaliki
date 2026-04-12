import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mengambil API Key dari .env.local
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key Gemini belum dikonfigurasi di server (.env.local)." },
        { status: 500 }
      );
    }

    // Menggunakan model standar terbaru
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = "";

    switch (action) {
      case "notulen":
        prompt = `Anda adalah seorang Sekretaris Dewan Eksekutif Mahasiswa UIN Malang yang sangat profesional. 
        Tugas Anda adalah merapikan catatan kasar atau hasil transkrip rapat berikut menjadi sebuah Notulensi Rapat yang sangat rapi, formal, dan menggunakan tata bahasa Indonesia baku (KBBI).
        
        Informasi Rapat:
        - Judul Rapat: ${payload.judul || "Tidak disebutkan"}
        - Lokasi: ${payload.lokasi || "Tidak disebutkan"}
        
        Catatan Kasar / Teks Mentah:
        "${payload.teksKasar}"
        
        Tolong buatkan output dalam format Markdown yang rapi. Susun menjadi bagian-bagian: 
        1. Detail Rapat (Hari, Tanggal, Waktu, Tempat)
        2. Agenda / Topik Pembahasan Pokok
        3. Poin-poin Detail Diskusi (Jelaskan dengan narasi yang profesional)
        4. Kesimpulan dan Tindak Lanjut (Action Items).`;
        break;

      case "smartletter":
        prompt = `Anda adalah Auditor Administrasi DEMA UIN Malang yang sangat teliti. Analisis teks draf surat berikut apakah sudah mematuhi kaidah penulisan surat resmi kelembagaan.
        
        Teks Surat yang diekstrak: 
        "${payload.teksSurat}"
        
        Berikan analisis singkat dan lugas dalam format Markdown: 
        1. Kesalahan Tata Bahasa atau Ejaan (EBI/KBBI)
        2. Kelengkapan Komponen Surat
        3. Rekomendasi Perbaikan secara spesifik.`;
        break;
      
      case "parse_surat":
        prompt = `Saya memiliki teks kasar hasil ekstraksi dari sebuah dokumen surat (PDF).
        Tolong analisa dan ekstrak informasi berikut ke dalam format JSON murni TANPA markdown block (jangan gunakan \`\`\`json).
  
        Teks Kasar:
        "${payload.teksSurat}"
  
        Jika ini surat MASUK, format JSON-nya:
        { "no/nomor": "nomor surat", "asal": "nama instansi pengirim", "tgl_buat": "YYYY-MM-DD", "tgl_datang": "YYYY-MM-DD", "hal/perihal": "perihal surat", "ket": "keterangan singkat" }
  
        Jika ini surat KELUAR, format JSON-nya:
        { "no/nomor": "nomor surat", "tujuan": "nama instansi tujuan/Kepada/Yth/Kepada Yth", "tgl_buat": "YYYY-MM-DD", "tgl_kirim": "YYYY-MM-DD", "hal/perihal": "perihal surat", "ket": "keterangan singkat" }

        Tipe surat yang diminta adalah: ${payload.tipeSurat}. 
        Pastikan output HANYA JSON.`;
        break;

      default:
        return NextResponse.json({ error: "Aksi AI tidak dikenali oleh sistem." }, { status: 400 });
    }

    // Eksekusi AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("AI Error Detail:", error);
    return NextResponse.json(
      { error: "Gagal memproses AI.", details: error.message },
      { status: 500 }
    );
  }
}