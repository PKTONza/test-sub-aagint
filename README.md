# JSONBin.io Database Demo

เว็บไซต์ตัวอย่างการใช้ JSONBin.io เป็น database สำหรับเว็บไซต์บน GitHub Pages

## ฟีเจอร์
- ✅ Create: เพิ่มข้อมูลใหม่
- ✅ Read: อ่านข้อมูลจาก JSONBin.io
- ✅ Update: แก้ไขข้อมูล
- ✅ Delete: ลบข้อมูล

## การตั้งค่า JSONBin.io

### 1. สมัครสมาชิก
ไปที่ [JSONBin.io](https://jsonbin.io) และสมัครสมาชิกฟรี

### 2. สร้าง API Key
1. เข้าสู่ระบบ
2. ไปที่ API Keys
3. สร้าง Master Key ใหม่
4. คัดลอก API Key

### 3. สร้าง Bin ใหม่
1. ไปที่ Dashboard
2. กด "Create Bin"
3. ใส่ข้อมูลเริ่มต้น: `[]`
4. บันทึกและคัดลอก Bin ID

### 4. อัพเดทไฟล์ script.js
แทนที่ค่าดังนี้ในไฟล์ `script.js`:

```javascript
const API_KEY = '$2a$10$YOUR_ACTUAL_API_KEY_HERE';
const BIN_ID = 'YOUR_ACTUAL_BIN_ID_HERE';
```

## การ Deploy บน GitHub Pages

### 1. Push โค้ดขึ้น GitHub
```bash
git add .
git commit -m "Add JSONBin.io database demo"
git push origin main
```

### 2. เปิดใช้งาน GitHub Pages
1. ไปที่ Settings > Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. บันทึก

### 3. เข้าใช้งาน
เว็บไซต์จะพร้อมใช้งานที่: `https://yourusername.github.io/repository-name`

## ข้อจำกัด JSONBin.io (Free Plan)
- 10,000 API calls ต่อเดือน
- ขนาดไฟล์สูงสุด 100KB ต่อ bin
- อัพเดท 2 ครั้งต่อนาที

## ทางเลือกอื่น
หากต้องการฟีเจอร์มากกว่านี้ สามารถใช้:
- **Firebase Firestore** - Real-time database ฟรี
- **Supabase** - PostgreSQL ฟรี
- **GitHub API** - ใช้ repository เป็น database

## ตัวอย่างการใช้งาน
1. กรอกหัวข้อและเนื้อหา
2. กดบันทึกข้อมูล
3. ข้อมูลจะถูกเก็บไว้ใน JSONBin.io
4. สามารถแก้ไข/ลบข้อมูลได้