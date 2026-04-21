const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const axios = require('axios'); 
const app = express();
app.use(express.json());
app.use(cors());

const dbAlex = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1532004', 
    database: 'Branch_B_DB'    
});

dbAlex.connect((err) => {
    if (err) {
        console.error("❌ فشل اتصال إسكندرية بـ MySQL: " + err.message);
    } else {
        console.log("✅ سيرفر الإسكندرية متصل بقاعدة بيانات (Branch_B_DB) بنجاح!");
    }
});

// 1. عملية التسجيل الموزعة (تعديل: استقبال hospital_id وتمريره للقاهرة)
app.post('/api/register-distributed', async (req, res) => {
    const { name, national_id, hospital_id, doctor_id } = req.body;
    
    console.log(`\n🚀 بدء تسجيل موزع للمريض: ${name}`);

    try {
        console.log("🌐 جاري إرسال بيانات الهوية والمستشفى لسيرفر القاهرة (3000)...");
        
        // نمرر الـ hospital_id للسيرفر الرئيسي في القاهرة
        const cairoRes = await axios.post('http://localhost:3000/api/cairo/register', { 
            name, 
            national_id, 
            hospital_id 
        });
        
        const newPatientId = cairoRes.data.patient_id;

        console.log(`📥 استلمت ID من القاهرة: ${newPatientId}. جاري حجز الموعد في إسكندرية...`);

        // هنا بنسجل الموعد فقط (شيلنا Hospital_Name من هنا تماماً)
        dbAlex.query("INSERT INTO Appointment (App_Date, Doctor_ID, Patient_ID) VALUES (CURDATE(), ?, ?)", 
        [doctor_id, newPatientId], (err) => {
            if (err) {
                console.error("❌ خطأ في جدول المواعيد بإسكندرية:", err);
                return res.status(500).json(err);
            }
            console.log("✨ تمت العملية الموزعة بالكامل!");
            res.json({ message: `تم التسجيل بنجاح! ID المريض: ${newPatientId}` });
        });
    } catch (error) {
        console.error("⚠️ فشل الربط مع القاهرة!");
        res.status(500).json({ message: "فشل الاتصال بسيرفر القاهرة" });
    }
});

// 2. عملية البحث الموزعة (تعديل: جلب اسم المستشفى من القاهرة)
app.get('/api/search-distributed/:id', async (req, res) => {
    const patientId = req.params.id;
    try {
        console.log(`🔍 جاري البحث الموزع عن ID: ${patientId}`);

        // نطلب البيانات من القاهرة (دلوقتي القاهرة هترجع الاسم + اسم المستشفى بفضل الـ JOIN)
        const cairoRes = await axios.get(`http://localhost:3000/api/cairo/patient/${patientId}`);
        
        // نجيب بيانات الدكتور والموعد من إسكندرية (بدون عمود Hospital_Name)
        const query = `
            SELECT a.App_Date, d.Name as Doctor_Name 
            FROM Appointment a 
            JOIN Doctor d ON a.Doctor_ID = d.Doctor_ID 
            WHERE a.Patient_ID = ?`;
            
        dbAlex.query(query, [patientId], (err, results) => {
            if (err) return res.status(500).json(err);

            if (results.length > 0) {
                // تجميع البيانات من السيرفرين
                res.json({
                    patient_name: cairoRes.data.name,        // من القاهرة
                    hospital_name: cairoRes.data.hospital_name, // من القاهرة (جديد)
                    doctor_name: results[0].Doctor_Name,     // من إسكندرية
                    appointment_date: results[0].App_Date    // من إسكندرية
                });
                console.log("✅ تم استرجاع البيانات بنجاح من المصدرين.");
            } else {
                res.status(404).json({ message: "المريض مسجل في القاهرة ولكن ليس لديه موعد في إسكندرية" });
            }
        });
    } catch (error) { 
        console.error("⚠️ خطأ في عملية البحث الموزع");
        res.status(500).json({ message: "المريض غير موجود أو السيرفرات مغلقة" }); 
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`🚀 Alexandria Server (Coordinator) running on port ${PORT}`);
});