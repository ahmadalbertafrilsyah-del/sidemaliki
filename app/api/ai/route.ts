import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mengambil API Key dari .env.local secara aman di sisi server
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    // 1. Membaca data yang dikirim dari Frontend (BPH / Kementerian)
    const body = await req.json();
    const { action, payload } = body;

    // Cek apakah API Key sudah dipasang
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key Gemini belum dikonfigurasi di server (.env.local)." },
        { status: 500 }
      );
    }

    // 2. Menggunakan model Gemini 1.5 Flash (Sangat cepat dan cerdas untuk teks)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = "";

    // 3. Logika percabangan "Prompt Engineering" berdasarkan fitur yang ditekan user
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
        Visi Induk (DEMA): ${payload.visi}
        Misi Induk (DEMA): ${payload.misi}
        Konteks / Isu Terkini yang ingin diselesaikan: ${payload.konteks}
        
        Buatlah output dalam format Markdown yang rapi. Berikan minimal 3 ide program kerja konkret yang sejalan dengan Visi Misi induk dan menjawab "Isu Terkini" organisasi tersebut. 
        Untuk setiap program kerja, sertakan: 
        - Nama Program Kerja
        - Tujuan Program
        - Sasaran Peserta
        - Indikator Keberhasilan (KPI)
        
        Di bagian akhir, berikan Analisis SWOT (Strengths, Weaknesses, Opportunities, Threats) singkat dalam bentuk bullet points untuk organisasi target tersebut dalam menjalankan program kerjanya.`;
        break;

      case "smartletter":
        prompt = `Anda adalah Auditor Administrasi DEMA UIN Malang yang sangat teliti. Analisis teks draf surat berikut apakah sudah mematuhi kaidah penulisan surat resmi kelembagaan.
        
        Teks Surat yang diekstrak: 
        "${payload.teksSurat}"
        
        Berikan analisis singkat dan lugas dalam format Markdown: 
        1. Kesalahan Tata Bahasa atau Ejaan (EBI/KBBI)
        2. Kelengkapan Komponen Surat (Apakah ada kop, tanggal, nomor, lampiran, perihal, tujuan, isi, dan penutup/tanda tangan?)
        3. Rekomendasi Perbaikan secara spesifik.`;
        break;

      case "pdf_splitter":
      case "ttd_stamp":
        return NextResponse.json({ 
          result: "Fitur manipulasi file PDF murni dieksekusi secara lokal (di browser Anda) menggunakan sistem *Client-Side Secure* demi menjaga privasi dokumen. AI hanya membantu verifikasi alur kerja." 
        });

      default:
        return NextResponse.json({ error: "Aksi AI tidak dikenali oleh sistem." }, { status: 400 });
    }

    // 4. Eksekusi pemanggilan ke server Google Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. Mengembalikan hasil teks Markdown ke Frontend
    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada pemrosesan AI.", details: error.message },
      { status: 500 }
    );
  }
}