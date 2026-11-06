# ผู้ช่วยครู AI — React entry

โปรเจกต์นี้เป็น React/Vite entry สำหรับเว็บ PHP เดิม โดยคง HTML, CSS, JavaScript, session, API และข้อมูลเดิมทั้งหมดไว้ จึงใช้งานได้เหมือนเดิมระหว่างทยอยย้ายแต่ละหน้าเป็น React จริง

## รันบนเครื่อง

1. เปิด Apache/XAMPP ให้เว็บเดิมทำงานที่ `http://localhost/AI`
2. คัดลอก `.env.example` เป็น `.env` หาก URL ต่างจากค่าเริ่มต้น
3. รัน `npm install` และ `npm run dev`
4. เปิด `http://localhost:5173`

## Build / นำเข้า Google AI Studio

ใช้โฟลเดอร์ `react-app` เป็นรากโปรเจกต์ React แล้วกำหนด `VITE_LEGACY_BASE_URL` เป็น URL สาธารณะของ PHP backend เดิมก่อน build/deploy เช่น `https://example.com/AI/`

> React ไม่สามารถแทน PHP backend ได้เอง การสร้างเอกสาร, เรียก AI, อ่าน/เขียนคลัง และ session ยังต้องใช้ backend เดิมจนกว่าจะย้าย API ไปเป็นบริการที่ Google AI Studio เรียกได้

เส้นทางใน React ใช้ hash เช่น `#/home`, `#/worksheet`, `#/exam` เพื่อให้เปิดได้บน static hosting โดยไม่ต้องตั้ง rewrite rule
