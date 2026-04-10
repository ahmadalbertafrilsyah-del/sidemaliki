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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let prompt = "";

    switch (action) {
      case "notulen":
        prompt = `Anda adalah seorang Sekretaris Eksekutif DEMA UIN Malang yang sangat profesional. 
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

      case "renstra":
        prompt = `Anda adalah Konsultan Organisasi dan Perencanaan Strategis yang handal. 
        Buatkan draf Program Kerja (Proker) yang inovatif dan Analisis SWOT untuk organisasi target di bawah ini.
        
        Data Organisasi Target: ${payload.organisasi}
        Visi Induk: ${payload.visi}
        Misi Induk: ${payload.misi}
        Konteks / Isu Terkini yang ingin diselesaikan: ${payload.konteks}
        
        Buatlah output dalam format Markdown yang rapi. Berikan minimal 3 ide program kerja konkret yang sejalan dengan Visi Misi induk dan menjawab "Isu Terkini" organisasi tersebut. 
        Untuk setiap program kerja, sertakan: 
        - Nama Program Kerja
        - Tujuan Program
        - Sasaran Peserta
        - Indikator Keberhasilan (KPI)
        
        Di bagian akhir, berikan Analisis SWOT singkat dalam bentuk bullet points.`;
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
        { "no": "nomor surat", "asal": "nama instansi pengirim", "tgl_buat": "YYYY-MM-DD", "tgl_datang": "YYYY-MM-DD", "hal": "perihal surat", "ket": "keterangan singkat" }
  
        Jika ini surat KELUAR, format JSON-nya:
        { "no": "nomor surat", "tujuan": "nama instansi tujuan", "tgl_buat": "YYYY-MM-DD", "tgl_kirim": "YYYY-MM-DD", "hal": "perihal surat", "ket": "keterangan singkat" }

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