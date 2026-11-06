# Sites preview

แพ็กเกจนี้เป็นเว็บทดสอบแบบ static สำหรับ OpenAI Sites สร้างใหม่ด้วยคำสั่ง:

```bash
npm run build:sites-preview
```

ผลลัพธ์อยู่ใน `sites-preview/dist` และแสดงทุกหน้าหลักของ Teacher AI โดยไม่รวม
API keys, ข้อมูลใน `data/` หรือระบบบันทึกฝั่งเซิร์ฟเวอร์ จึงเหมาะสำหรับตรวจหน้าตา
และลำดับการใช้งานก่อนย้าย backend ไปยัง runtime ของ Sites
