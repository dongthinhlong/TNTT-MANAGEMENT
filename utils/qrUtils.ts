/**
 * qrUtils - Hàm tiện ích xử lý QR code
 * 
 * Hỗ trợ cả 2 loại QR:
 * 1. QR cũ: chứa text thuần (VD: "HS001")
 * 2. QR mới: chứa URL (VD: "https://domain.com/?id=HS001")
 */
export function extractStudentId(decodedText: string): string {
  const text = decodedText.trim();
  
  // Nếu là URL, lấy ID từ query param ?id=...
  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const url = new URL(text);
      const idFromParam = url.searchParams.get('id');
      if (idFromParam) return idFromParam.trim();
    } catch {
      // URL không hợp lệ → fallback về raw text
    }
  }
  
  // QR cũ (raw text) hoặc fallback: dùng nguyên văn
  return text;
}
