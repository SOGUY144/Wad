/**
 * ระบบจัดการองค์กร
 * Organization Management System
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const DATA_DIR = './data';

// สร้างโฟลเดอร์ data ถ้ายังไม่มี
async function initDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log('Data directory initialized');
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
}

initDataDir();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper functions
async function readJSONFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

async function writeJSONFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ========== API Routes ==========

// === สมาชิก (Members) ===

// ดึงรายชื่อสมาชิกทั้งหมด
app.get('/api/members', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ดึงข้อมูลสมาชิก
app.get('/api/members/:id', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const member = members.find(m => m.id === req.params.id);
        if (member) {
            res.json({ success: true, data: member });
        } else {
            res.status(404).json({ success: false, error: 'Member not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มสมาชิกใหม่
app.post('/api/members', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const newMember = {
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email || '',
            phone: req.body.phone || '',
            department: req.body.department || '',
            position: req.body.position || '',
            isLeader: req.body.isLeader === true || req.body.isLeader === 'true',
            workCount: 0,
            createdAt: new Date().toISOString()
        };
        members.push(newMember);
        await writeJSONFile('members.json', members);
        res.json({ success: true, data: newMember });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// อัปเดตข้อมูลสมาชิก
app.put('/api/members/:id', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const index = members.findIndex(m => m.id === req.params.id);
        if (index !== -1) {
            members[index] = {
                ...members[index],
                ...req.body,
                id: req.params.id, // ไม่ให้เปลี่ยน ID
                workCount: members[index].workCount // ไม่ให้เปลี่ยน workCount ตรงนี้
            };
            await writeJSONFile('members.json', members);
            res.json({ success: true, data: members[index] });
        } else {
            res.status(404).json({ success: false, error: 'Member not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ลบสมาชิก
app.delete('/api/members/:id', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const filtered = members.filter(m => m.id !== req.params.id);
        await writeJSONFile('members.json', filtered);
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มจำนวนงาน/กิจกรรม (แบบเดิม - สำหรับ backward compatibility)
app.post('/api/members/:id/work', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const member = members.find(m => m.id === req.params.id);
        if (member) {
            member.workCount = (member.workCount || 0) + 1;
            member.lastWorkDate = new Date().toISOString();
            await writeJSONFile('members.json', members);
            res.json({ success: true, data: member });
        } else {
            res.status(404).json({ success: false, error: 'Member not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === กิจกรรม (Activities) ===

// ดึงรายชื่อกิจกรรมทั้งหมด
app.get('/api/activities', async (req, res) => {
    try {
        const activities = await readJSONFile('activities.json') || [];
        res.json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ดึงข้อมูลกิจกรรม
app.get('/api/activities/:id', async (req, res) => {
    try {
        const activities = await readJSONFile('activities.json') || [];
        const activity = activities.find(a => a.id === req.params.id);
        if (activity) {
            res.json({ success: true, data: activity });
        } else {
            res.status(404).json({ success: false, error: 'Activity not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มกิจกรรมใหม่
app.post('/api/activities', async (req, res) => {
    try {
        const activities = await readJSONFile('activities.json') || [];
        const members = await readJSONFile('members.json') || [];

        const newActivity = {
            id: Date.now().toString(),
            name: req.body.name,
            description: req.body.description || '',
            date: req.body.date || new Date().toISOString().split('T')[0],
            creatorId: req.body.creatorId || null,
            participantIds: req.body.participantIds || [],
            createdAt: new Date().toISOString()
        };

        activities.push(newActivity);
        await writeJSONFile('activities.json', activities);

        // อัปเดตจำนวนงานของสมาชิกที่เข้าร่วม
        if (newActivity.participantIds.length > 0) {
            newActivity.participantIds.forEach(memberId => {
                const member = members.find(m => m.id === memberId);
                if (member) {
                    member.workCount = (member.workCount || 0) + 1;
                    member.lastWorkDate = new Date().toISOString();
                }
            });
            await writeJSONFile('members.json', members);
        }

        res.json({ success: true, data: newActivity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// อัปเดตกิจกรรม
app.put('/api/activities/:id', async (req, res) => {
    try {
        const activities = await readJSONFile('activities.json') || [];
        const members = await readJSONFile('members.json') || [];
        const index = activities.findIndex(a => a.id === req.params.id);

        if (index !== -1) {
            const oldActivity = activities[index];
            const oldParticipantIds = oldActivity.participantIds || [];
            const newParticipantIds = req.body.participantIds || [];

            // ลบจำนวนงานของสมาชิกที่ออกจากการเข้าร่วม
            oldParticipantIds.forEach(memberId => {
                if (!newParticipantIds.includes(memberId)) {
                    const member = members.find(m => m.id === memberId);
                    if (member && member.workCount > 0) {
                        member.workCount = member.workCount - 1;
                    }
                }
            });

            // เพิ่มจำนวนงานของสมาชิกที่เข้าร่วมใหม่
            newParticipantIds.forEach(memberId => {
                if (!oldParticipantIds.includes(memberId)) {
                    const member = members.find(m => m.id === memberId);
                    if (member) {
                        member.workCount = (member.workCount || 0) + 1;
                        member.lastWorkDate = new Date().toISOString();
                    }
                }
            });

            activities[index] = {
                ...activities[index],
                ...req.body,
                id: req.params.id
            };

            await writeJSONFile('activities.json', activities);
            await writeJSONFile('members.json', members);

            res.json({ success: true, data: activities[index] });
        } else {
            res.status(404).json({ success: false, error: 'Activity not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ลบกิจกรรม
app.delete('/api/activities/:id', async (req, res) => {
    try {
        const activities = await readJSONFile('activities.json') || [];
        const members = await readJSONFile('members.json') || [];
        const activity = activities.find(a => a.id === req.params.id);

        if (activity) {
            // ลบจำนวนงานของสมาชิกที่เข้าร่วมกิจกรรมนี้
            if (activity.participantIds && activity.participantIds.length > 0) {
                activity.participantIds.forEach(memberId => {
                    const member = members.find(m => m.id === memberId);
                    if (member && member.workCount > 0) {
                        member.workCount = member.workCount - 1;
                    }
                });
                await writeJSONFile('members.json', members);
            }

            const filtered = activities.filter(a => a.id !== req.params.id);
            await writeJSONFile('activities.json', filtered);
            res.json({ success: true, message: 'Activity deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Activity not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ฝ่าย/แผนก (Departments) ===

// ดึงรายชื่อฝ่ายทั้งหมด
app.get('/api/departments', async (req, res) => {
    try {
        const departments = await readJSONFile('departments.json') || [];
        res.json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มฝ่ายใหม่
app.post('/api/departments', async (req, res) => {
    try {
        const departments = await readJSONFile('departments.json') || [];
        const newDept = {
            id: Date.now().toString(),
            name: req.body.name,
            leaderId: req.body.leaderId || null,
            description: req.body.description || '',
            createdAt: new Date().toISOString()
        };
        departments.push(newDept);
        await writeJSONFile('departments.json', departments);
        res.json({ success: true, data: newDept });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// อัปเดตฝ่าย
app.put('/api/departments/:id', async (req, res) => {
    try {
        const departments = await readJSONFile('departments.json') || [];
        const index = departments.findIndex(d => d.id === req.params.id);
        if (index !== -1) {
            departments[index] = {
                ...departments[index],
                ...req.body,
                id: req.params.id
            };
            await writeJSONFile('departments.json', departments);
            res.json({ success: true, data: departments[index] });
        } else {
            res.status(404).json({ success: false, error: 'Department not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ลบฝ่าย
app.delete('/api/departments/:id', async (req, res) => {
    try {
        const departments = await readJSONFile('departments.json') || [];
        const filtered = departments.filter(d => d.id !== req.params.id);
        await writeJSONFile('departments.json', filtered);
        res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === คอมเมนต์ฝ่าย (Department Comments) ===

// ดึงคอมเมนต์ฝ่าย
app.get('/api/departments/:id/comments', async (req, res) => {
    try {
        const comments = await readJSONFile('department-comments.json') || [];
        const deptComments = comments.filter(c => c.departmentId === req.params.id);
        res.json({ success: true, data: deptComments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มคอมเมนต์ฝ่าย
app.post('/api/departments/:id/comments', async (req, res) => {
    try {
        const comments = await readJSONFile('department-comments.json') || [];
        const newComment = {
            id: Date.now().toString(),
            departmentId: req.params.id,
            author: req.body.author || 'ผู้ใช้',
            message: req.body.message,
            type: req.body.type || 'suggestion', // suggestion, problem, improvement
            createdAt: new Date().toISOString()
        };
        comments.push(newComment);
        await writeJSONFile('department-comments.json', comments);
        res.json({ success: true, data: newComment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ลบคอมเมนต์ฝ่าย
app.delete('/api/departments/:deptId/comments/:commentId', async (req, res) => {
    try {
        const comments = await readJSONFile('department-comments.json') || [];
        const index = comments.findIndex(c => String(c.id) === String(req.params.commentId) && String(c.departmentId) === String(req.params.deptId));

        if (index !== -1) {
            const filtered = comments.filter(c => c.id !== req.params.commentId);
            await writeJSONFile('department-comments.json', filtered);
            res.json({ success: true, message: 'Comment deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Comment not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === ปัญหาและข้อเสนอแนะ (Issues & Suggestions) ===

// ดึงปัญหาทั้งหมด
app.get('/api/issues', async (req, res) => {
    try {
        const issues = await readJSONFile('issues.json') || [];
        res.json({ success: true, data: issues });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่มปัญหา/ข้อเสนอแนะ
app.post('/api/issues', async (req, res) => {
    try {
        const issues = await readJSONFile('issues.json') || [];
        const newIssue = {
            id: Date.now().toString(),
            type: req.body.type || 'issue', // issue, suggestion
            title: req.body.title,
            description: req.body.description,
            author: req.body.author || 'ผู้ใช้',
            status: 'pending', // pending, in-progress, resolved
            createdAt: new Date().toISOString()
        };
        issues.push(newIssue);
        await writeJSONFile('issues.json', issues);
        res.json({ success: true, data: newIssue });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ลบปัญหา/ข้อเสนอแนะ
app.delete('/api/issues/:id', async (req, res) => {
    try {
        const issues = await readJSONFile('issues.json') || [];
        console.log(`[DELETE ISSUE] Request ID: ${req.params.id} (Type: ${typeof req.params.id})`);
        console.log(`[DELETE ISSUE] Available IDs: ${issues.map(i => i.id).join(', ')}`);

        const index = issues.findIndex(i => String(i.id) === String(req.params.id));
        console.log(`[DELETE ISSUE] Fallback match index: ${index}`);

        if (index !== -1) {
            const filtered = issues.filter(i => String(i.id) !== String(req.params.id));
            await writeJSONFile('issues.json', filtered);
            res.json({ success: true, message: 'Issue deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Issue not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// อัปเดตสถานะปัญหา
app.put('/api/issues/:id', async (req, res) => {
    try {
        const issues = await readJSONFile('issues.json') || [];
        const index = issues.findIndex(i => i.id === req.params.id);
        if (index !== -1) {
            issues[index] = {
                ...issues[index],
                ...req.body,
                id: req.params.id
            };
            await writeJSONFile('issues.json', issues);
            res.json({ success: true, data: issues[index] });
        } else {
            res.status(404).json({ success: false, error: 'Issue not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === สถิติ (Statistics) ===

// ดึงสถิติ
app.get('/api/stats', async (req, res) => {
    try {
        const members = await readJSONFile('members.json') || [];
        const departments = await readJSONFile('departments.json') || [];
        const activities = await readJSONFile('activities.json') || [];

        const stats = {
            totalMembers: members.length,
            totalDepartments: departments.length,
            totalActivities: activities.length,
            membersWithWork: members.filter(m => (m.workCount || 0) > 0).length,
            membersWithoutWork: members.filter(m => (m.workCount || 0) === 0).length,
            totalWorkCount: members.reduce((sum, m) => sum + (m.workCount || 0), 0),
            leaders: members.filter(m => m.isLeader).length
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เริ่มเซิร์ฟเวอร์
const server = app.listen(port, () => {
    console.log(`\n🚀 Server is running at http://localhost:${port}`);
    console.log(`📁 Open your browser and visit: http://localhost:${port}\n`);
});

// จัดการ error เมื่อพอร์ตถูกใช้งาน
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ พอร์ต ${port} ถูกใช้งานอยู่แล้ว`);
        console.log(`💡 วิธีแก้ไข:`);
        console.log(`   1. หยุดเซิร์ฟเวอร์เก่าที่รันอยู่ (กด Ctrl+C)`);
        console.log(`   2. หรือใช้คำสั่ง: netstat -ano | findstr :${port} แล้ว kill process`);
        console.log(`   3. หรือเปลี่ยนพอร์ตโดยตั้งค่า: set PORT=3001 && npm start\n`);
        process.exit(1);
    } else {
        console.error('Error starting server:', error);
        process.exit(1);
    }
});
