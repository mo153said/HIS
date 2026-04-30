const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const dbCairo = mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: '1532004', 
    database: 'Branch_A_DB' 
});

// 1. استقبال طلب تسجيل مريض (تعديل: تخزين الـ ID بدلاً من الاسم)
app.post('/api/cairo/register', (req, res) => {
    const { name, national_id, hospital_id } = req.body; 
    
    console.log(`\n[REMOTE REQUEST] From Alex-Server to Cairo DB`);
    console.log(`[DATA] Patient: ${name}, Hospital ID: ${hospital_id}`);

    // تعديل الـ SQL ليستخدم Hospital_ID
    //git commit -m "SCRUM-14 Create a patient database and table (column: ID, Name, National_ID)"
    const sql = "INSERT INTO Patient (Name, National_ID, Hospital_ID) VALUES (?, ?, ?)";
    dbCairo.query(sql, [name, national_id, hospital_id], (err, result) => {
        if (err) {
            console.error("[ERROR] Failed to insert in Cairo DB:", err);
            return res.status(500).json(err);
        }
        console.log(`[SUCCESS] Registered in Cairo with Patient ID: ${result.insertId}`);
        res.json({ patient_id: result.insertId });
    });
});
//git commit -m "SCRUM-19 Create a hospital table and link it to the patient using a Foreign Key."
// 2. استقبال طلب بحث (تعديل: عمل JOIN لجلب اسم المستشفى من جدولها)
app.get('/api/cairo/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    // استعلام احترافي يربط جدول المرضى بجدول المستشفيات
    const sql = `
        SELECT p.Name, h.Hospital_Name 
        FROM Patient p 
        JOIN Hospital h ON p.Hospital_ID = h.Hospital_ID 
        WHERE p.Patient_ID = ?`;//git commit -m "SCRUM-19 Create a hospital table and link it to the patient using a Foreign Key."
//git commit -m "SCRUM-36 Global Record Synchronization"
    dbCairo.query(sql, [patientId], (err, rows) => {
        if (err) return res.status(500).json(err);
        
        if (rows.length === 0) {
            console.log(`[SEARCH] Patient ID ${patientId} not found.`);
            return res.status(404).json({ message: "غير موجود" });
        }
        //git commit -m "SCRUM-31 View results on the "Booking Details" page"
        console.log(`[SEARCH] Found: ${rows[0].Name} at ${rows[0].Hospital_Name}`);
        res.json({
            name: rows[0].Name,
            hospital_name: rows[0].Hospital_Name // ده اللي هيظهر في الواجهة عندك
        });
    });
});
//git commit -m "SCRUM-32 Setup Cairo API Node on Port 3000"
app.listen(3000, () => console.log("✅ Cairo Server (Port 3000) is running..."));