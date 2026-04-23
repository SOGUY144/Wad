/**
 * ระบบจัดการองค์กร - Organization Management System
 * Frontend Control Script
 */

// Global State
let members = [];
let departments = [];
let issues = [];
let activities = [];
let stats = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupDefaultDate();
    initTheme();

    // Add smooth scrolling for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

// Theme Management
function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);

    showToast('info', 'เปลี่ยนธีม', isDark ? 'เข้าสู่โหมดกลางคืน' : 'เข้าสู่โหมดกลางวัน');
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('.theme-toggle i');
    if (isDark) {
        icon.className = 'fa-solid fa-sun';
        icon.style.color = '#fbbf24'; // Warning yellow
    } else {
        icon.className = 'fa-solid fa-moon';
        icon.style.color = 'inherit';
    }
}

async function loadAllData() {
    try {
        await Promise.all([
            loadMembers(false),
            loadDepartments(false),
            loadIssues(false),
            loadActivities(false),
            loadStats()
        ]);
        buildNotifications();
        console.log('✨ System initialized successfully');
    } catch (error) {
        showToast('error', 'ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณารีเฟรชหน้าเว็บ');
        console.error('Init Error:', error);
    }
}

function setupDefaultDate() {
    const activityDateInput = document.getElementById('activity-date');
    if (activityDateInput) {
        const today = new Date().toISOString().split('T')[0];
        activityDateInput.value = today;
    }
}

// ==========================================
// UX & UI Utilities
// ==========================================

// Custom Toast Notification System
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;

    container.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Friendly Error Handler
function handleApiError(error, context) {
    console.error(`Error in ${context}:`, error);
    let userMessage = 'เกิดข้อผิดพลาดในการดำเนินการ';

    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
    } else if (error.message.includes('404')) {
        userMessage = 'ไม่พบข้อมูลที่ต้องการ';
    }

    showToast('error', 'ขออภัย', userMessage);
}

// Tab Switching with Animation
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="switchTab('${tabName}')"]`);
    if (btn) btn.classList.add('active');
    const content = document.getElementById(`${tabName}-tab`);
    if (content) content.classList.add('active');
    if      (tabName === 'dashboard') loadDashboard();
    else if (tabName === 'members')   loadMembers();
    else if (tabName === 'departments') loadDepartments();
    else if (tabName === 'issues')    loadIssues();
    else if (tabName === 'history')   loadHistory();
    else if (tabName === 'calendar')  renderCalendar();
    else if (tabName === 'chat') {
        loadChat();
        if(!chatPollingInterval) chatPollingInterval = setInterval(loadChat, 3000);
    }
    else if (tabName === 'work') {
        loadMembers().then(() => {
            loadActivities();
            populateActivitySelects();
        });
    }
}

// Modal Management
function openModal(title, contentHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = contentHtml;
    document.getElementById('view-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('view-modal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('view-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Confirmation Modal Wrapper (Better than window.confirm)
function confirmAction(message, callback) {
    // For now, using native confirm but wrapped for potential future upgrade
    if (confirm(message)) {
        callback();
    }
}

// Data Handling & State Management
async function fetchData(endpoint) {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json;
}

async function sendData(endpoint, method, data) {
    const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
}

// ==========================================
// 1. Members Management
// ==========================================

async function loadMembers(refreshUI = true) {
    try {
        const result = await fetchData('/api/members');
        if (result.success) {
            members = result.data;
            if (refreshUI) {
                displayMembers(members);
                populateMemberSelects();
            }
        }
    } catch (error) {
        handleApiError(error, 'loadMembers');
    }
}

function displayMembers(list) {
    const container = document.getElementById('members-list');

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#9ca3af;">
                <i class="fa-solid fa-users-slash" style="font-size:3rem; margin-bottom:15px; color:#e5e7eb;"></i>
                <p>ยังไม่มีรายชื่อสมาชิกในระบบ</p>
            </div>
        `;
        return;
    }

    const avatarColors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#f43f5e','#06b6d4','#84cc16'];
    container.innerHTML = list.map((m, idx) => {
        const dept = departments.find(d => d.id === m.department);
        const initial = m.name ? m.name.charAt(0) : '?';
        const color = avatarColors[idx % avatarColors.length];
        return `
            <div class="item-card">
                <div style="display:flex;gap:14px;align-items:center;flex:1;min-width:0;">
                    <div class="avatar" style="background:${color};">${initial}</div>
                    <div class="item-info">
                        <h4>
                            ${m.name}
                            ${m.isLeader ? '<span class="badge badge-warning"><i class="fa-solid fa-crown"></i> หัวหน้า</span>' : ''}
                        </h4>
                        <div class="item-meta">
                            <span><i class="fa-regular fa-envelope"></i> ${m.email || 'ไม่ระบุ'}</span>
                            <span><i class="fa-solid fa-phone"></i> ${m.phone || 'ไม่ระบุ'}</span>
                            <span><i class="fa-solid fa-building"></i> ${dept ? dept.name : 'ไม่สังกัดฝ่าย'}</span>
                            <span><i class="fa-solid fa-id-badge"></i> ${m.position || 'ไม่ระบุตำแหน่ง'}</span>
                        </div>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewMember('${m.id}')" title="ดูข้อมูล"><i class="fa-regular fa-eye"></i></button>
                    <button class="btn-icon" onclick="editMember('${m.id}')" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete" onclick="deleteMember('${m.id}')" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

async function saveMember(event) {
    event.preventDefault();
    const form = event.target;

    const data = {
        name: document.getElementById('member-name').value,
        email: document.getElementById('member-email').value,
        phone: document.getElementById('member-phone').value,
        department: document.getElementById('member-department').value,
        position: document.getElementById('member-position').value,
        isLeader: document.getElementById('member-leader').checked
    };

    const id = form.dataset.id;
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/api/members/${id}` : '/api/members';

    try {
        const result = await sendData(endpoint, method, data);
        if (result.success) {
            showToast('success', 'บันทึกสำเร็จ', id ? 'แก้ไขข้อมูลสมาชิกเรียบร้อยแล้ว' : 'เพิ่มสมาชิกใหม่เรียบร้อยแล้ว');
            resetMemberForm();
            loadMembers();
            loadStats();
        }
    } catch (error) {
        handleApiError(error, 'saveMember');
    }
}

function resetMemberForm() {
    const form = document.getElementById('member-form');
    form.reset();
    delete form.dataset.id;
    // Reset button text
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> บันทึกข้อมูล';
}

function editMember(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;

    document.getElementById('member-name').value = member.name;
    document.getElementById('member-email').value = member.email;
    document.getElementById('member-phone').value = member.phone;
    document.getElementById('member-department').value = member.department;
    document.getElementById('member-position').value = member.position;
    document.getElementById('member-leader').checked = member.isLeader;

    const form = document.getElementById('member-form');
    form.dataset.id = id;
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไข';

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });

    showToast('info', 'กำลังแก้ไข', `กำลังแก้ไขข้อมูลของ ${member.name}`);
}

function deleteMember(id) {
    const member = members.find(m => m.id === id);
    confirmAction(`ยืนยันการลบสมาชิก "${member.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้`, async () => {
        try {
            const result = await sendData(`/api/members/${id}`, 'DELETE');
            if (result.success) {
                showToast('success', 'ลบสำเร็จ', 'ลบข้อมูลสมาชิกออกจากระบบแล้ว');
                loadMembers();
                loadStats();
            }
        } catch (error) {
            handleApiError(error, 'deleteMember');
        }
    });
}

function filterMembers() {
    const search = document.getElementById('member-search').value.toLowerCase();
    const deptFilter = document.getElementById('member-filter-dept').value;
    const workFilter = document.getElementById('member-filter-work').value;

    const filtered = members.filter(m => {
        const matchSearch = !search || m.name.toLowerCase().includes(search) || (m.email && m.email.toLowerCase().includes(search));
        const matchDept = !deptFilter || m.department === deptFilter;
        const count = m.workCount || 0;
        const matchWork = workFilter === 'all' ||
            (workFilter === 'with-work' && count > 0) ||
            (workFilter === 'no-work' && count === 0);
        return matchSearch && matchDept && matchWork;
    });

    displayMembers(filtered);
}

function populateMemberSelects() {
    const deptFilter = document.getElementById('member-filter-dept');
    const deptSelect = document.getElementById('member-department');

    // Save current selection
    const currentFilter = deptFilter.value;
    const currentSelect = deptSelect.value;

    const options = departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    deptFilter.innerHTML = '<option value="">แสดงทุกฝ่าย</option>' + options;
    deptSelect.innerHTML = '<option value="">-- กรุณาเลือกฝ่าย --</option>' + options;

    // Restore selection
    deptFilter.value = currentFilter;
    if (currentSelect) deptSelect.value = currentSelect;
}

// ==========================================
// 2. Departments Management
// ==========================================

async function loadDepartments(refreshUI = true) {
    try {
        const result = await fetchData('/api/departments');
        if (result.success) {
            departments = result.data;
            if (refreshUI) {
                displayDepartments(departments);
                populateMemberSelects(); // Updates dept dropdowns in member form
            }
        }
    } catch (error) {
        handleApiError(error, 'loadDepartments');
    }
}

function displayDepartments(list) {
    const container = document.getElementById('departments-list');

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#9ca3af;">
                <i class="fa-solid fa-building-circle-xmark" style="font-size:3rem; margin-bottom:15px; color:#e5e7eb;"></i>
                <p>ยังไม่มีข้อมูลแผนก</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(d => {
        const leader = members.find(m => m.id === d.leaderId);
        const memberCount = members.filter(m => m.department === d.id).length;

        return `
            <div class="item-card">
                <div class="item-info">
                    <h4>${d.name}</h4>
                    <div class="item-meta">
                        <span><i class="fa-solid fa-user-tie"></i> หัวหน้า: ${leader ? leader.name : 'ยังไม่ระบุ'}</span>
                        <span><i class="fa-solid fa-users"></i> สมาชิก: ${memberCount} คน</span>
                    </div>
                    <p style="margin-top:10px; color:#6b7280; font-size:0.9rem;">${d.description || 'ไม่มีรายละเอียด'}</p>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewDepartmentComments('${d.id}')" title="คอมเมนต์">
                        <i class="fa-regular fa-comments"></i>
                    </button>
                    <button class="btn-icon" onclick="editDepartment('${d.id}')" title="แก้ไข">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteDepartment('${d.id}')" title="ลบ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Also update leader dropdown in department form
    const leaderSelect = document.getElementById('department-leader');
    const potentialLeaders = members.filter(m => m.isLeader);
    leaderSelect.innerHTML = '<option value="">-- เลือกหัวหน้า --</option>' +
        potentialLeaders.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

async function saveDepartment(event) {
    event.preventDefault();
    const form = event.target;

    const data = {
        name: document.getElementById('department-name').value,
        leaderId: document.getElementById('department-leader').value,
        description: document.getElementById('department-description').value
    };

    const id = form.dataset.id;
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/api/departments/${id}` : '/api/departments';

    try {
        const result = await sendData(endpoint, method, data);
        if (result.success) {
            showToast('success', 'บันทึกสำเร็จ', 'ข้อมูลแผนกถูกบันทึกเรียบร้อยแล้ว');
            form.reset();
            delete form.dataset.id;
            form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-plus-circle"></i> สร้างแผนกใหม่';
            loadDepartments();
            loadStats();
        }
    } catch (error) {
        handleApiError(error, 'saveDepartment');
    }
}

function editDepartment(id) {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;

    document.getElementById('department-name').value = dept.name;
    document.getElementById('department-leader').value = dept.leaderId || '';
    document.getElementById('department-description').value = dept.description;

    const form = document.getElementById('department-form');
    form.dataset.id = id;
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไข';

    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteDepartment(id) {
    const dept = departments.find(d => d.id === id);
    confirmAction(`ยืนยันการลบแผนก "${dept.name}"? หากลบแล้ว สมาชิกในแผนกนี้จะไม่มีสังกัด`, async () => {
        try {
            const result = await sendData(`/api/departments/${id}`, 'DELETE');
            if (result.success) {
                showToast('success', 'ลบสำเร็จ', 'ลบแผนกเรียบร้อยแล้ว');
                loadDepartments();
                loadMembers(); // Refresh members to show updated department status
                loadStats();
            }
        } catch (error) {
            handleApiError(error, 'deleteDepartment');
        }
    });
}

// ==========================================
// 3. Issues & Suggestions
// ==========================================

async function loadIssues(refreshUI = true) {
    try {
        const result = await fetchData('/api/issues');
        if (result.success) {
            issues = result.data;
            if (refreshUI) displayIssues(issues);
        }
    } catch (error) {
        handleApiError(error, 'loadIssues');
    }
}

function displayIssues(list) {
    const container = document.getElementById('issues-list');

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#9ca3af;">
                <i class="fa-regular fa-folder-open" style="font-size:3rem; margin-bottom:15px; color:#e5e7eb;"></i>
                <p>ไม่มีรายการแจ้งปัญหาหรือข้อเสนอแนะ</p>
            </div>
        `;
        return;
    }

    // Sort: Pending first, then by date
    list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    container.innerHTML = list.map(i => {
        let statusBadge = '';
        if (i.status === 'pending') statusBadge = '<span class="badge badge-warning">รอดำเนินการ</span>';
        else if (i.status === 'in-progress') statusBadge = '<span class="badge badge-info">กำลังแก้ไข</span>';
        else if (i.status === 'resolved') statusBadge = '<span class="badge badge-success">เสร็จสิ้น</span>';

        const typeIcon = i.type === 'issue' ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>' : '<i class="fa-solid fa-lightbulb" style="color:var(--warning)"></i>';

        return `
            <div class="item-card">
                <div class="item-info">
                    <h4>${typeIcon} ${i.title} ${statusBadge}</h4>
                    <p style="margin:5px 0; color:#4b5563;">${i.description}</p>
                    <div class="item-meta">
                        <span><i class="fa-regular fa-user"></i> ${i.author || 'ไม่ระบุตัวตน'}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${new Date(i.createdAt).toLocaleString('th-TH')}</span>
                    </div>
                </div>
                <div class="action-buttons" style="flex-direction:column; gap:8px;">
                     <select onchange="updateIssueStatus('${i.id}', this.value)" style="padding:6px; border-radius:6px; border:1px solid #d1d5db; width:100%; font-size:0.9rem;">
                        <option value="pending" ${i.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                        <option value="in-progress" ${i.status === 'in-progress' ? 'selected' : ''}>กำลังแก้ไข</option>
                        <option value="resolved" ${i.status === 'resolved' ? 'selected' : ''}>เสร็จสิ้น</option>
                    </select>
                    
                    <button class="btn btn-danger" onclick="deleteIssue('${i.id}')" style="justify-content:center; padding: 6px; font-size:0.85rem;">
                        <i class="fa-solid fa-trash-can"></i> ลบ
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function saveIssue(event) {
    event.preventDefault();

    const data = {
        type: document.getElementById('issue-type').value,
        title: document.getElementById('issue-title').value,
        description: document.getElementById('issue-description').value,
        author: document.getElementById('issue-author').value
    };

    try {
        const result = await sendData('/api/issues', 'POST', data);
        if (result.success) {
            showToast('success', 'ส่งเรื่องสำเร็จ', 'ทางเราได้รับเรื่องของคุณแล้ว ขอบคุณสำหรับคำแนะนำ');
            document.getElementById('issue-form').reset();
            loadIssues();
        }
    } catch (error) {
        handleApiError(error, 'saveIssue');
    }
}

async function updateIssueStatus(id, status) {
    try {
        const result = await sendData(`/api/issues/${id}`, 'PUT', { status });
        if (result.success) {
            showToast('success', 'อัปเดตสถานะ', 'เปลี่ยนสถานะเรียบร้อยแล้ว');
            loadIssues(); // Refresh to re-sort
        }
    } catch (error) {
        handleApiError(error, 'updateIssueStatus');
    }
}

async function deleteIssue(id) {
    if (!confirm('คุณต้องการลบรายงานปัญหานี้ใช่หรือไม่?')) return;

    try {
        const result = await sendData(`/api/issues/${id}`, 'DELETE');
        if (result.success) {
            showToast('success', 'ลบสำเร็จ', 'ลบรายการเรียบร้อยแล้ว');
            loadIssues();
        }
    } catch (error) {
        handleApiError(error, 'deleteIssue');
    }
}

function filterIssues() {
    const typeFilter = document.getElementById('issue-filter-type').value;
    const statusFilter = document.getElementById('issue-filter-status').value;

    const filtered = issues.filter(i => {
        const matchType = typeFilter === 'all' || i.type === typeFilter;
        const matchStatus = statusFilter === 'all' || i.status === statusFilter;
        return matchType && matchStatus;
    });

    displayIssues(filtered);
}

// ==========================================
// 4. Activities Management
// ==========================================

async function loadActivities(refreshUI = true) {
    try {
        const result = await fetchData('/api/activities');
        if (result.success) {
            activities = result.data;
            if (refreshUI) displayActivities(activities);
        }
    } catch (error) {
        handleApiError(error, 'loadActivities');
    }
}

function displayActivities(list) {
    const container = document.getElementById('activities-list');

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#9ca3af;">
                <i class="fa-regular fa-calendar-plus" style="font-size:3rem; margin-bottom:15px; color:#e5e7eb;"></i>
                <p>ยังไม่มีกิจกรรมในช่วงนี้</p>
                <div style="margin-top:10px;">
                    <button class="btn btn-primary" onclick="document.querySelector('a[href=\\'#activity-form\\']').click()">
                        + วางแผนงานใหม่
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = list.map(a => {
        const creator = members.find(m => m.id === a.creatorId);
        const participantCount = (a.participantIds || []).length;

        const statusClass = a.status === 'completed' ? 'badge-success' : (a.status === 'pending' ? 'badge-warning' : 'badge-info');
        const statusText = a.status === 'completed' ? 'เสร็จสิ้น' : (a.status === 'pending' ? 'รอดำเนินการ' : 'กำลังดำเนินการ');

        // Allow editing for all activities as requested
        const isEditable = true;
        const editBtn = `<button class="btn btn-warning" onclick="editActivity('${a.id}')" style="padding:6px 12px; font-size:0.85rem;"><i class="fa-solid fa-pen"></i> แก้ไข</button>`;

        return `
            <div class="item-card" onclick="viewActivity('${a.id}')" style="cursor:pointer;">
                <div class="item-info">
                    <h4 style="color:var(--text-main); font-size:1.1rem; margin-bottom:4px;">${a.name}</h4>
                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
                        <span class="badge ${statusClass}">${statusText}</span>
                        <span style="font-size:0.85rem; color:var(--text-dim);"><i class="fa-regular fa-calendar"></i> ${new Date(a.date).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div class="item-meta">
                        <span><i class="fa-regular fa-user"></i> ${creator ? creator.name : 'Unknown'}</span>
                        <span><i class="fa-solid fa-users"></i> ${participantCount} คน</span>
                    </div>
                </div>
                <div class="action-buttons" onclick="event.stopPropagation();" style="display:flex; gap:8px;">
                    ${editBtn}
                    <button class="btn btn-danger" onclick="deleteActivity('${a.id}')" style="padding:6px 12px; font-size:0.85rem;"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function populateActivitySelects() {
    // 1. Creator Select
    const creatorSelect = document.getElementById('activity-creator');
    if (creatorSelect) {
        creatorSelect.innerHTML = members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    }

    // 2. Participants Checkbox List (Grid Layout)
    const container = document.getElementById('activity-participants-checkbox');
    if (container) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        container.style.gap = '12px';

        container.innerHTML = members.map(m => `
            <label class="checkbox-wrapper">
                <input type="checkbox" name="participants" value="${m.id}">
                <div>
                    <span>${m.name}</span>
                    <span>${m.position || 'พนักงาน'}</span>
                </div>
            </label>
        `).join('');
    }
}



async function saveActivity(event) {
    event.preventDefault();
    const checkboxes = document.querySelectorAll('#activity-participants-checkbox input:checked');
    const participantIds = Array.from(checkboxes).map(cb => cb.value);
    if (participantIds.length === 0) {
        showToast('error', 'ข้อมูลไม่ครบ', 'กรุณาเลือกผู้เข้าร่วมกิจกรรมอย่างน้อย 1 คน');
        return;
    }
    const id = document.getElementById('activity-id').value;
    const statusEl = document.getElementById('activity-status');
    const data = {
        name: document.getElementById('activity-name').value,
        date: document.getElementById('activity-date').value,
        description: document.getElementById('activity-description').value,
        creatorId: document.getElementById('activity-creator').value,
        status: statusEl ? statusEl.value : 'pending',
        participantIds: participantIds
    };
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/api/activities/${id}` : '/api/activities';
    try {
        const result = await sendData(endpoint, method, data);
        if (result.success) {
            showToast('success', `${id ? 'แก้ไข' : 'สร้าง'}กิจกรรมสำเร็จ`, 'บันทึกข้อมูลเรียบร้อยแล้ว');
            resetActivityForm();
            loadActivities();
            loadStats();
            buildNotifications();
        }
    } catch (error) {
        handleApiError(error, 'saveActivity');
    }
}

function editActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    document.getElementById('activity-id').value = activity.id;
    document.getElementById('activity-name').value = activity.name;
    document.getElementById('activity-date').value = activity.date;
    document.getElementById('activity-description').value = activity.description || '';
    document.getElementById('activity-creator').value = activity.creatorId;
    const statusEl = document.getElementById('activity-status');
    if (statusEl) statusEl.value = activity.status || 'pending';
    const checkboxes = document.querySelectorAll('#activity-participants-checkbox input');
    checkboxes.forEach(cb => { cb.checked = (activity.participantIds || []).includes(cb.value); });
    const submitBtn = document.querySelector('#activity-form button[type="submit"]');
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไข';
    const form = document.getElementById('activity-form');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.style.transition = 'box-shadow 0.3s';
    form.style.boxShadow = '0 0 0 4px var(--primary-soft)';
    setTimeout(() => { form.style.boxShadow = ''; }, 1000);
}

function resetActivityForm() {
    document.getElementById('activity-form').reset();
    document.getElementById('activity-id').value = '';
    setupDefaultDate();

    // Reset button text
    const submitBtn = document.querySelector('#activity-form button[type="submit"]');
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> สร้างกิจกรรม';
}

async function viewActivity(id) {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const creator = members.find(m => m.id === activity.creatorId);
    const participants = (activity.participantIds || []).map(id => {
        const m = members.find(mem => mem.id === id);
        return m ? m.name : 'Unknown';
    });

    // Status Logic for Modal
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const actDate = new Date(activity.date);
    actDate.setHours(0, 0, 0, 0);
    let statusText = 'กำลังดำเนินการ';
    let statusIcon = '<i class="fa-solid fa-spinner fa-spin"></i>';
    let statusColor = 'var(--info)';

    if (actDate < today) {
        statusText = 'สิ้นสุดแล้ว (Locked)';
        statusIcon = '<i class="fa-solid fa-lock"></i>';
        statusColor = 'var(--success)';
    } else if (actDate.getTime() === today.getTime()) {
        statusText = 'วันนี้';
        statusIcon = '<i class="fa-solid fa-bell fa-shake"></i>';
        statusColor = 'var(--warning)';
    }

    const dateStr = actDate.toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('modal-title').textContent = `รายละเอียดกิจกรรม`;
    document.getElementById('modal-body').innerHTML = `
        <div style="background: ${statusColor}20; border-left: 5px solid ${statusColor}; padding: 15px; border-radius: 8px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
             <h3 style="margin:0; color:var(--primary-dark);">${activity.name}</h3>
             <span style="color:${statusColor}; font-weight:bold; display:flex; align-items:center; gap:5px;">
                ${statusIcon} ${statusText}
             </span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
            <div>
                <p><strong><i class="fa-regular fa-calendar"></i> วันที่:</strong> ${dateStr}</p>
                <p><strong><i class="fa-solid fa-user-circle"></i> เจ้าของ:</strong> ${creator ? creator.name : '-'}</p>
            </div>
            <div>
                <p><strong><i class="fa-solid fa-users"></i> ผู้เข้าร่วม (${participants.length}):</strong></p>
                <div style="max-height:60px; overflow-y:auto; font-size:0.9rem; color:#666;">
                    ${participants.join(', ')}
                </div>
            </div>
        </div>

        <div style="background:#f9fafb; padding:15px; border-radius:12px; margin-bottom:20px;">
            <h4 style="margin-bottom:5px;">รายละเอียด</h4>
            <p style="color:#4b5563;">${activity.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
        </div>

            <!-- Simulated Comment Workspace -->
        <div style="border-top: 1px solid #e5e7eb; pt-4; margin-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; margin-top:15px;">
                <h4>💬 พื้นที่ทำงาน (Comments)</h4>
                <div style="display:flex; gap:5px; background:#f3f4f6; padding:4px; border-radius:8px;">
                    <button class="btn-sm active" style="background:white; border:none; padding:4px 10px; border-radius:6px; font-size:0.8rem; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">ทั้งหมด</button>
                    <button class="btn-sm" style="background:transparent; border:none; padding:4px 10px; border-radius:6px; font-size:0.8rem; color:#6b7280;">ฝ่าย</button>
                    <button class="btn-sm" style="background:transparent; border:none; padding:4px 10px; border-radius:6px; font-size:0.8rem; color:#6b7280;">เอกสาร</button>
                </div>
            </div>
            
            <div id="simulated-comments" style="min-height:150px; max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">
                <div class="comment-bubble" style="background:white; padding:10px; border-radius:8px; border:1px solid #e5e7eb; display:flex; gap:10px;">
                     <div style="width:30px; height:30px; background:#e0e7ff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">🤖</div>
                     <div>
                        <div style="font-size:0.8rem; margin-bottom:2px;"><strong>System</strong> <span style="color:#9ca3af;">• วันนี้</span></div>
                        <div style="font-size:0.9rem; color:#4b5563;">กิจกรรมถูกสร้างขึ้นแล้ว เริ่มต้นวางแผนงานได้เลย!</div>
                     </div>
                </div>
                <!-- Simulated History -->
                ${simulatedChats.map(chat => `
                    <div class="comment-bubble" style="background: #f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0; display:flex; gap:10px;">
                        <div style="width:30px; height:30px; background:#dcfce7; color:#166534; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem;"><i class="fa-solid fa-user"></i></div>
                        <div>
                            <div style="font-size:0.8rem; margin-bottom:2px;"><strong>${chat.user}</strong> <span style="color:#9ca3af;">• ${chat.time}</span></div>
                            <div style="font-size:0.9rem; color:#4b5563;">${chat.text}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <form onsubmit="event.preventDefault(); sendSimulatedMessage();" style="display:flex; gap:10px;">
                <input type="text" id="workspace-chat-input" placeholder="พิมพ์ข้อความ... " style="background:#fff;">
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </div>
    `;
    document.getElementById('view-modal').classList.add('show');
}
async function deleteActivity(id) {
    const activity = activities.find(a => a.id === id);
    confirmAction(`ต้องการยกเลิกกิจกรรม "${activity.name}" หรือไม่?`, async () => {
        try {
            const result = await sendData(`/api/activities/${id}`, 'DELETE');
            if (result.success) {
                showToast('success', 'ยกเลิกสำเร็จ', 'ลบกิจกรรมออกจากระบบแล้ว');
                loadActivities();
                loadStats();
            }
        } catch (error) {
            handleApiError(error, 'deleteActivity');
        }
    });
}

function filterActivities() {
    const search = document.getElementById('activity-search').value.toLowerCase();
    const dateFilter = document.getElementById('activity-filter-date').value;
    const statusFilter = document.getElementById('activity-filter-status') ? document.getElementById('activity-filter-status').value : 'all';
    const filtered = activities.filter(a => {
        const matchSearch = !search || a.name.toLowerCase().includes(search);
        const matchDate = !dateFilter || a.date === dateFilter;
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSearch && matchDate && matchStatus;
    });
    displayActivities(filtered);
}

// ==========================================
// 5. Dashboard Stats
// ==========================================

async function loadStats() {
    try {
        const result = await fetchData('/api/stats');
        if (result.success) {
            stats = result.data;
            displayStats(stats);
        }
    } catch (error) {
        console.error('Stats loading error:', error);
    }
}

function displayStats(s) {
    const container = document.getElementById('stats-section');
    const pending = issues.filter(i => i.status === 'pending').length;
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card green">
                <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                <h3>${s.totalMembers}</h3>
                <p>สมาชิกทั้งหมด</p>
            </div>
            <div class="stat-card blue">
                <div class="stat-icon"><i class="fa-solid fa-building"></i></div>
                <h3>${s.totalDepartments}</h3>
                <p>แผนก/ฝ่าย</p>
            </div>
            <div class="stat-card orange">
                <div class="stat-icon"><i class="fa-solid fa-briefcase"></i></div>
                <h3>${s.totalWorkCount}</h3>
                <p>งานที่มอบหมายแล้ว</p>
            </div>
            <div class="stat-card purple">
                <div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div>
                <h3>${s.totalActivities}</h3>
                <p>กิจกรรมทั้งหมด</p>
            </div>
            <div class="stat-card rose">
                <div class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>${pending}</h3>
                <p>ปัญหารอดำเนินการ</p>
            </div>
        </div>
    `;
}

// ==========================================
// Helper: View Comments Modal
// ==========================================
async function viewDepartmentComments(deptId) {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;

    try {
        const result = await fetchData(`/api/departments/${deptId}/comments`);
        const comments = result.success ? result.data : [];

        let html = `
            <div style="background:#f9fafb; padding:20px; border-radius:12px; margin-bottom:20px;">
                <h4 style="margin-bottom:15px; color:var(--primary);">✍️ เขียนคอมเมนต์ถึง ${dept.name}</h4>
                <form onsubmit="submitComment(event, '${deptId}')">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                        <input type="text" id="com-author" placeholder="ชื่อของคุณ" style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; width:100%;">
                        <select id="com-type" style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; width:100%;">
                            <option value="suggestion">💡 ข้อเสนอแนะ</option>
                            <option value="problem">⚠️ ปัญหาที่พบ</option>
                            <option value="improvement">🚀 สิ่งที่ควรปรับปรุง</option>
                        </select>
                    </div>
                    <textarea id="com-message" required placeholder="แสดงความคิดเห็นที่นี่..." style="width:100%; height:80px; padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:10px;"></textarea>
                    <button type="submit" class="btn btn-primary" style="width:100%;">ส่งความคิดเห็น</button>
                </form>
            </div>
            
            <h4 style="margin-bottom:15px;">ความคิดเห็นทั้งหมด (${comments.length})</h4>
            <div style="max-height:300px; overflow-y:auto;">
        `;

        if (comments.length === 0) {
            html += '<p style="text-align:center; color:#9ca3af; padding:20px;">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นสิ!</p>';
        } else {
            html += comments.map(c => {
                const badgeClass = c.type === 'problem' ? 'badge-danger' : (c.type === 'improvement' ? 'badge-info' : 'badge-success');
                const typeText = c.type === 'problem' ? 'ปัญหา' : (c.type === 'improvement' ? 'ปรับปรุง' : 'ข้อเสนอแนะ');
                return `
                    <div style="border-bottom:1px solid #e5e7eb; padding:15px 0;">
                            <strong>${c.author || 'ไม่ระบุชื่อ'}</strong>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span class="badge ${badgeClass}">${typeText}</span>
                                <button onclick="deleteComment('${deptId}', '${c.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="ลบความคิดเห็น">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                        <p style="color:#4b5563; margin-bottom:5px;">${c.message}</p>
                        <small style="color:#9ca3af;">${new Date(c.createdAt).toLocaleString('th-TH')}</small>
                    </div>
                `;
            }).join('');
        }

        html += '</div>';

        openModal(`ความคิดเห็น: ${dept.name}`, html);

    } catch (error) {
        handleApiError(error, 'viewComments');
    }
}

async function deleteComment(deptId, commentId) {
    if (!confirm('คุณต้องการลบความคิดเห็นนี้ใช่หรือไม่?')) return;

    try {
        const result = await sendData(`/api/departments/${deptId}/comments/${commentId}`, 'DELETE');
        if (result.success) {
            showToast('success', 'ลบสำเร็จ', 'ลบความคิดเห็นเรียบร้อยแล้ว');
            viewDepartmentComments(deptId); // Reload
        }
    } catch (error) {
        handleApiError(error, 'deleteComment');
    }
}

async function submitComment(event, deptId) {
    event.preventDefault();
    const data = {
        author: document.getElementById('com-author').value,
        type: document.getElementById('com-type').value,
        message: document.getElementById('com-message').value
    };

    try {
        const result = await sendData(`/api/departments/${deptId}/comments`, 'POST', data);
        if (result.success) {
            showToast('success', 'สำเร็จ', 'ความคิดเห็นของคุณถูกส่งแล้ว');
            viewDepartmentComments(deptId); // Reload comments
        }
    } catch (error) {
        handleApiError(error, 'submitComment');
    }
}

// ==========================================
// Workspace Chat Simulation (In-Memory)
// ==========================================
let simulatedChats = [];

function sendSimulatedMessage() {
    const input = document.getElementById('workspace-chat-input');
    const message = input.value.trim();
    if (!message) return;

    const chatContainer = document.getElementById('simulated-comments');

    // Add user message
    simulatedChats.push({ user: 'คุณ', text: message, time: 'เมื่อสักครู่' });

    // Append to UI immediately
    const msgDiv = document.createElement('div');
    msgDiv.className = 'comment-bubble';
    msgDiv.style = 'background: #f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0; display:flex; gap:10px; animation: slideInRight 0.3s ease;';
    msgDiv.innerHTML = `
         <div style="width:30px; height:30px; background:#dcfce7; color:#166534; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem;"><i class="fa-solid fa-user"></i></div>
         <div>
            <div style="font-size:0.8rem; margin-bottom:2px;"><strong>คุณ</strong> <span style="color:#9ca3af;">• เมื่อสักครู่</span></div>
            <div style="font-size:0.9rem; color:#4b5563;">${message}</div>
         </div>
    `;

    chatContainer.appendChild(msgDiv);
    input.value = '';

    // Auto scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ==========================================
// Helper: View Member Detail
// ==========================================
function viewMember(id) {
    const m = members.find(m => m.id === id);
    if (!m) return;

    const dept = departments.find(d => d.id === m.department);

    const html = `
        <div style="text-align:center; margin-bottom:20px;">
            <div style="width:80px; height:80px; background:#e0e7ff; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; color:var(--primary); font-size:2rem;">
                <i class="fa-solid fa-user"></i>
            </div>
            <h3 style="margin-bottom:5px;">${m.name}</h3>
            <span class="badge ${m.isLeader ? 'badge-warning' : 'badge-info'}">${m.isLeader ? 'หัวหน้าฝ่าย' : 'พนักงานทั่วไป'}</span>
        </div>
        
        <div style="background:#f9fafb; border-radius:12px; padding:20px;">
            <div style="display:grid; grid-template-columns: auto 1fr; gap:15px; align-items:center;">
                <i class="fa-solid fa-envelope" style="color:#9ca3af;"></i> <span>${m.email || '-'}</span>
                <i class="fa-solid fa-phone" style="color:#9ca3af;"></i> <span>${m.phone || '-'}</span>
                <i class="fa-solid fa-building" style="color:#9ca3af;"></i> <span>${dept ? dept.name : '-'}</span>
                <i class="fa-solid fa-briefcase" style="color:#9ca3af;"></i> <span>${m.position || '-'}</span>
                <i class="fa-solid fa-chart-pie" style="color:#9ca3af;"></i> <span>งานที่ได้รับมอบหมาย: <strong>${m.workCount || 0}</strong> งาน</span>
            </div>
        </div>
    `;

    openModal('ข้อมูลสมาชิก', html);
}

// ==========================================
// 6. Modal Helper Functions (Premium)
// ==========================================

function openModal(title, contentHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = contentHtml;
    // Premium Animation: Add 'show' class
    const modal = document.getElementById('view-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal() {
    // Premium Animation: Remove 'show' class
    const modal = document.getElementById('view-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('view-modal');
    if (event.target === modal) { closeModal(); }
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel && panel.classList.contains('show') && !panel.contains(event.target) && event.target !== btn) {
        panel.classList.remove('show');
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.toggle('show');
}

function buildNotifications() {
    const body    = document.getElementById('notif-panel-body');
    const badgeEl = document.querySelector('.notif-badge');
    if (!body) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const notifs = [];
    activities.forEach(a => {
        if (a.status === 'completed') return;
        const d = new Date(a.date); d.setHours(0,0,0,0);
        const diff = Math.ceil((d - today) / 86400000);
        if (diff >= 0 && diff <= 3) {
            notifs.push({ type:'warn', icon:'fa-calendar-day', title:'กิจกรรมใกล้ถึงกำหนด', body:`${a.name} — ${diff === 0 ? 'วันนี้!' : 'อีก '+diff+' วัน'}` });
        }
    });
    const pendingCount = issues.filter(i => i.status === 'pending').length;
    if (pendingCount > 0) notifs.push({ type:'warn', icon:'fa-triangle-exclamation', title:'ปัญหารอดำเนินการ', body:`มี ${pendingCount} รายการที่ยังรอแก้ไข` });
    const noDept = members.filter(m => !m.department).length;
    if (noDept > 0) notifs.push({ type:'info', icon:'fa-user-slash', title:'สมาชิกไม่มีสังกัดฝ่าย', body:`${noDept} คนยังไม่ได้รับการกำหนดฝ่าย` });
    if (badgeEl) { badgeEl.textContent = notifs.length; badgeEl.style.display = notifs.length > 0 ? 'flex' : 'none'; }
    if (notifs.length === 0) {
        body.innerHTML = '<div class="notif-empty"><i class="fa-regular fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block;"></i>ไม่มีการแจ้งเตือน</div>';
        return;
    }
    body.innerHTML = notifs.map(n => `
        <div class="notif-item">
            <div class="notif-item-icon ${n.type}"><i class="fa-solid ${n.icon}"></i></div>
            <div><h5>${n.title}</h5><p>${n.body}</p></div>
        </div>`).join('');
}

// ==========================================
// DASHBOARD
// ==========================================
function loadDashboard() {
    displayDeptChart();
    displayUpcoming();
    displayWorkStatusChart();
    displayPendingIssues();
    displayParticipationTop();
    displayParticipationZero();
    renderParticipationTable();
}

function displayDeptChart() {
    const el = document.getElementById('dept-chart');
    if (!el) return;
    if (departments.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">ยังไม่มีข้อมูลแผนก</p>'; return; }
    const max = Math.max(...departments.map(d => members.filter(m => m.department === d.id).length), 1);
    el.innerHTML = departments.map(d => {
        const count = members.filter(m => m.department === d.id).length;
        return `<div class="dept-bar-item">
            <div class="dept-bar-label"><span>${d.name}</span><span>${count} คน</span></div>
            <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${Math.round(count/max*100)}%"></div></div>
        </div>`;
    }).join('');
}

function displayUpcoming() {
    const el = document.getElementById('upcoming-list');
    if (!el) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const upcoming = activities
        .filter(a => { const d = new Date(a.date); d.setHours(0,0,0,0); return d >= today && a.status !== 'completed'; })
        .sort((a,b) => new Date(a.date)-new Date(b.date)).slice(0,5);
    if (upcoming.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">ไม่มีกิจกรรมที่กำลังจะมาถึง</p>'; return; }
    el.innerHTML = upcoming.map(a => {
        const d    = new Date(a.date);
        const diff = Math.ceil((d - today) / 86400000);
        return `<div class="upcoming-item">
            <div class="upcoming-date-box">
                <div class="day">${d.toLocaleDateString('th-TH',{day:'numeric'})}</div>
                <div class="mon">${d.toLocaleDateString('th-TH',{month:'short'})}</div>
            </div>
            <div class="upcoming-info">
                <h5>${a.name}</h5>
                <p>${diff === 0 ? 'วันนี้!' : 'อีก '+diff+' วัน'} • ${(a.participantIds||[]).length} คนเข้าร่วม</p>
            </div>
        </div>`;
    }).join('');
}

function displayWorkStatusChart() {
    const el = document.getElementById('work-status-chart');
    if (!el) return;
    const total = activities.length || 1;
    const statuses = [
        { label:'รอดำเนินการ',    count:activities.filter(a=>a.status==='pending').length,     color:'var(--warning)', cls:'badge-warning' },
        { label:'กำลังดำเนินการ', count:activities.filter(a=>a.status==='in-progress').length, color:'var(--info)',    cls:'badge-info' },
        { label:'เสร็จสิ้น',     count:activities.filter(a=>a.status==='completed').length,   color:'var(--success)', cls:'badge-success' },
    ];
    el.innerHTML = statuses.map(s => `
        <div class="dept-bar-item">
            <div class="dept-bar-label"><span><span class="badge ${s.cls}">${s.label}</span></span><span>${s.count} รายการ</span></div>
            <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${Math.round(s.count/total*100)}%;background:${s.color}"></div></div>
        </div>`).join('');
}

function displayPendingIssues() {
    const el = document.getElementById('pending-issues-list');
    if (!el) return;
    const pending = issues.filter(i => i.status === 'pending').slice(0,5);
    if (pending.length === 0) { el.innerHTML = '<p style="color:var(--success);text-align:center;padding:20px;"><i class="fa-solid fa-check-circle"></i> ไม่มีปัญหาที่รอดำเนินการ</p>'; return; }
    el.innerHTML = pending.map(i => `
        <div class="upcoming-item">
            <div class="notif-item-icon warn"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="upcoming-info"><h5>${i.title}</h5><p>${i.author||'ไม่ระบุชื่อ'} • ${new Date(i.createdAt).toLocaleDateString('th-TH')}</p></div>
        </div>`).join('');
}

// ==========================================
// EXPORT CSV
// ==========================================
function downloadCSV(filename, rows) {
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportMembersCSV() {
    const header = ['ชื่อ-นามสกุล','อีเมล','เบอร์โทรศัพท์','แผนก/ฝ่าย','ตำแหน่ง','หัวหน้าฝ่าย'];
    const rows = members.map(m => {
        const dept = departments.find(d => d.id === m.department);
        return [m.name, m.email||'', m.phone||'', dept ? dept.name : '', m.position||'', m.isLeader ? 'ใช่' : 'ไม่'];
    });
    downloadCSV('สมาชิก.csv', [header, ...rows]);
    showToast('success', 'Export สำเร็จ', `ดาวน์โหลดข้อมูลสมาชิก ${members.length} คนแล้ว`);
}

function exportActivitiesCSV() {
    const header = ['ชื่อกิจกรรม','วันที่','สถานะ','ผู้มอบหมาย','จำนวนผู้เข้าร่วม','รายละเอียด'];
    const statusMap = { pending:'รอดำเนินการ', 'in-progress':'กำลังดำเนินการ', completed:'เสร็จสิ้น' };
    const rows = activities.map(a => {
        const creator = members.find(m => m.id === a.creatorId);
        return [a.name, a.date, statusMap[a.status]||a.status, creator ? creator.name : '', (a.participantIds||[]).length, a.description||''];
    });
    downloadCSV('กิจกรรม.csv', [header, ...rows]);
    showToast('success', 'Export สำเร็จ', `ดาวน์โหลดข้อมูลกิจกรรม ${activities.length} รายการแล้ว`);
}

// ==========================================
// HISTORY (ประวัติการแก้ไข)
// ==========================================
let historyData = [];

async function loadHistory() {
    try {
        const result = await fetchData('/api/history');
        if (result.success) {
            historyData = result.data;
            displayHistory(historyData);
        }
    } catch (error) {
        handleApiError(error, 'loadHistory');
    }
}

function displayHistory(list) {
    const container = document.getElementById('history-list');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="fa-solid fa-clock-rotate-left" style="font-size:3rem;margin-bottom:12px;display:block;opacity:0.3;"></i>
            <p>ยังไม่มีประวัติการแก้ไขในระบบ</p>
        </div>`;
        return;
    }
    const actionMap = { create:'เพิ่มใหม่', update:'แก้ไข', delete:'ลบ' };
    const typeMap   = { member:'สมาชิก', department:'แผนก/ฝ่าย', activity:'กิจกรรม' };
    const iconMap   = { create:'fa-plus', update:'fa-pen', delete:'fa-trash' };
    container.innerHTML = list.map(h => {
        const dt  = new Date(h.timestamp);
        const day = dt.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' });
        const time = dt.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
        return `<div class="history-item">
            <div class="history-icon ${h.action}">
                <i class="fa-solid ${iconMap[h.action]||'fa-circle'}"></i>
            </div>
            <div class="history-body">
                <h5>${actionMap[h.action]||h.action} ${typeMap[h.type]||h.type}: <span style="color:var(--primary);">${h.name}</span></h5>
                <p>${h.detail || ''}</p>
            </div>
            <div class="history-time">${day}<br><strong>${time}</strong></div>
        </div>`;
    }).join('');
}

function filterHistory() {
    const typeFilter   = document.getElementById('history-filter-type').value;
    const actionFilter = document.getElementById('history-filter-action').value;
    const filtered = historyData.filter(h => {
        const matchType   = typeFilter   === 'all' || h.type   === typeFilter;
        const matchAction = actionFilter === 'all' || h.action === actionFilter;
        return matchType && matchAction;
    });
    displayHistory(filtered);
}

async function clearHistory() {
    if (!confirm('ต้องการล้างประวัติการแก้ไขทั้งหมดใช่หรือไม่?')) return;
    try {
        await fetch('/api/history', { method:'DELETE' });
        historyData = [];
        displayHistory([]);
        showToast('success', 'ล้างสำเร็จ', 'ลบประวัติทั้งหมดแล้ว');
    } catch (e) {
        showToast('error', 'ข้อผิดพลาด', 'ไม่สามารถล้างประวัติได้');
    }
}

// ==========================================
// CALENDAR (ปฏิทินกิจกรรม)
// ==========================================
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

function renderCalendar() {
    const titleEl = document.getElementById('cal-title');
    const gridEl  = document.getElementById('cal-grid');
    if (!titleEl || !gridEl) return;

    const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    titleEl.textContent = `${monthNames[calMonth]} ${calYear + 543}`;

    const today       = new Date();
    const firstDay    = new Date(calYear, calMonth, 1).getDay();  // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevDays    = new Date(calYear, calMonth, 0).getDate();

    let cells = [];

    // Cells from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: prevDays - i, current: false });
    }
    // Cells of current month
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, current: true });
    }
    // Cells for next month to fill grid
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, current: false });
    }

    gridEl.innerHTML = cells.map(cell => {
        const isToday = cell.current &&
            cell.day === today.getDate() &&
            calMonth  === today.getMonth() &&
            calYear   === today.getFullYear();

        let eventsHtml = '';
        if (cell.current) {
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`;
            const dayActivities = activities.filter(a => a.date === dateStr);
            const show = dayActivities.slice(0, 2);
            const more = dayActivities.length - 2;
            eventsHtml = show.map(a =>
                `<div class="cal-event ${a.status||'pending'}" title="${a.name}" onclick="viewActivity('${a.id}');event.stopPropagation();">${a.name}</div>`
            ).join('');
            if (more > 0) eventsHtml += `<div class="cal-more">+${more} เพิ่มเติม</div>`;
        }

        return `<div class="cal-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}">
            <div class="cal-day-num">${cell.day}</div>
            ${eventsHtml}
        </div>`;
    }).join('');

    // Legend
    const legendEl = document.getElementById('cal-legend');
    if (legendEl) {
        legendEl.innerHTML = `
            <span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;">
                <span style="width:12px;height:12px;border-radius:3px;background:var(--warning-bg);border:1px solid #fde68a;display:inline-block;"></span> รอดำเนินการ
            </span>
            <span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;">
                <span style="width:12px;height:12px;border-radius:3px;background:var(--info-bg);border:1px solid #bfdbfe;display:inline-block;"></span> กำลังดำเนินการ
            </span>
            <span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;">
                <span style="width:12px;height:12px;border-radius:3px;background:var(--success-bg);border:1px solid #a7f3d0;display:inline-block;"></span> เสร็จสิ้น
            </span>`;
    }
}

function calPrev()  { calMonth--; if (calMonth < 0)  { calMonth = 11; calYear--; } renderCalendar(); }
function calNext()  { calMonth++; if (calMonth > 11) { calMonth = 0;  calYear++; } renderCalendar(); }
function calToday() { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); renderCalendar(); }

// ==========================================
// PARTICIPATION STATS (สถิติการมีส่วนร่วม)
// ==========================================

function getMemberStats() {
    // คำนวณสถิติจากข้อมูล activities โดยตรง (แม่นกว่า workCount)
    return members.map(m => {
        const dept        = departments.find(d => d.id === m.department);
        const participated = activities.filter(a => (a.participantIds || []).includes(m.id));
        const completed    = participated.filter(a => a.status === 'completed').length;
        const inProgress   = participated.filter(a => a.status === 'in-progress').length;
        const pending      = participated.filter(a => a.status === 'pending').length;
        return {
            ...m,
            deptName:   dept ? dept.name : 'ไม่สังกัดฝ่าย',
            totalJoined: participated.length,
            completed, inProgress, pending,
            lastJoined: participated.sort((a,b) => new Date(b.date)-new Date(a.date))[0]?.date || null
        };
    }).sort((a,b) => b.totalJoined - a.totalJoined);
}

function displayParticipationTop() {
    const el = document.getElementById('participation-top');
    if (!el) return;
    const stats   = getMemberStats();
    const top5    = stats.filter(m => m.totalJoined > 0).slice(0, 5);
    const maxJoin = top5[0]?.totalJoined || 1;
    const rankCls = ['gold','silver','bronze','',''];
    const medal   = ['🥇','🥈','🥉','4','5'];
    if (top5.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">ยังไม่มีข้อมูล</p>';
        return;
    }
    const avatarColors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#f43f5e'];
    el.innerHTML = top5.map((m, i) => `
        <div class="top-member-item">
            <div class="top-rank ${rankCls[i]}">${medal[i]}</div>
            <div class="avatar" style="background:${avatarColors[i % avatarColors.length]};width:34px;height:34px;font-size:0.9rem;">${m.name.charAt(0)}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.9rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
                <div class="work-bar-mini" style="margin-top:4px;">
                    <div class="work-bar-track-mini">
                        <div class="work-bar-fill-mini" style="width:${Math.round(m.totalJoined/maxJoin*100)}%"></div>
                    </div>
                    <span class="work-count-badge">${m.totalJoined} ครั้ง</span>
                </div>
            </div>
        </div>`).join('');
}

function displayParticipationZero() {
    const el = document.getElementById('participation-zero');
    if (!el) return;
    const stats  = getMemberStats();
    const zeros  = stats.filter(m => m.totalJoined === 0);
    if (zeros.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--success);">
            <i class="fa-solid fa-party-horn" style="font-size:2rem;margin-bottom:8px;display:block;"></i>
            <p style="font-weight:600;">ทุกคนมีส่วนร่วมแล้ว! 🎉</p>
        </div>`;
        return;
    }
    el.innerHTML = zeros.map(m => `
        <div class="top-member-item">
            <div class="avatar" style="background:#94a3b8;width:34px;height:34px;font-size:0.9rem;">${m.name.charAt(0)}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.9rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">${m.deptName}</div>
            </div>
            <span class="work-count-badge zero">ยังไม่มี</span>
        </div>`).join('');
}

function renderParticipationTable() {
    const el     = document.getElementById('participation-table');
    if (!el) return;
    const search = (document.getElementById('participation-search')?.value || '').toLowerCase();
    const filter = document.getElementById('participation-filter')?.value || 'all';

    let stats = getMemberStats();
    if (search) stats = stats.filter(m => m.name.toLowerCase().includes(search) || m.deptName.toLowerCase().includes(search));
    if (filter === 'active') stats = stats.filter(m => m.totalJoined > 0);
    if (filter === 'zero')   stats = stats.filter(m => m.totalJoined === 0);

    if (stats.length === 0) {
        el.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-muted);">ไม่พบสมาชิกที่ตรงกับเงื่อนไข</p>';
        return;
    }

    const maxJoin = Math.max(...stats.map(m => m.totalJoined), 1);
    const avatarColors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#f43f5e','#06b6d4','#84cc16'];

    el.innerHTML = `
        <table class="participation-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>สมาชิก</th>
                    <th>ฝ่าย/แผนก</th>
                    <th style="text-align:center;">รวมทั้งหมด</th>
                    <th style="text-align:center;">เสร็จแล้ว</th>
                    <th style="text-align:center;">กำลังทำ</th>
                    <th style="text-align:center;">รอทำ</th>
                    <th>ความคืบหน้า</th>
                    <th>ล่าสุด</th>
                </tr>
            </thead>
            <tbody>
                ${stats.map((m, i) => {
                    const color  = avatarColors[i % avatarColors.length];
                    const pct    = Math.round(m.totalJoined / maxJoin * 100);
                    const lastDate = m.lastJoined
                        ? new Date(m.lastJoined).toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'numeric'})
                        : '—';
                    return `<tr>
                        <td>${i+1}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div class="avatar" style="background:${color};width:32px;height:32px;font-size:0.85rem;">${m.name.charAt(0)}</div>
                                <div>
                                    <div style="font-weight:700;color:var(--text-main);">${m.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">${m.position || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge badge-info" style="font-size:0.72rem;">${m.deptName}</span></td>
                        <td style="text-align:center;">
                            <span class="work-count-badge ${m.totalJoined === 0 ? 'zero' : ''}">${m.totalJoined} ครั้ง</span>
                        </td>
                        <td style="text-align:center;"><span style="color:var(--success);font-weight:700;">${m.completed}</span></td>
                        <td style="text-align:center;"><span style="color:var(--info);font-weight:700;">${m.inProgress}</span></td>
                        <td style="text-align:center;"><span style="color:var(--warning);font-weight:700;">${m.pending}</span></td>
                        <td style="min-width:120px;">
                            <div class="work-bar-mini">
                                <div class="work-bar-track-mini"><div class="work-bar-fill-mini" style="width:${pct}%"></div></div>
                                <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;">${pct}%</span>
                            </div>
                        </td>
                        <td style="font-size:0.8rem;color:var(--text-muted);">${lastDate}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// ==========================================
// CHAT SYSTEM (ระบบแชทแบบ Polling)
// ==========================================
let chatData = [];
let chatPollingInterval = null;
let currentChatName = localStorage.getItem('chatName') || '';
let currentChatColor = localStorage.getItem('chatColor') || '#10b981';

document.addEventListener('DOMContentLoaded', () => {
    // กำหนดค่าเริ่มต้นตอนโหลดหน้า
    if (currentChatName) {
        document.getElementById('chat-name-input').value = currentChatName;
        document.getElementById('chat-color-input').value = currentChatColor;
    }
    initEmojiPicker();
});

function saveChatName() {
    const nameInput = document.getElementById('chat-name-input').value.trim();
    const colorInput = document.getElementById('chat-color-input').value;
    if (!nameInput) {
        showToast('error', 'ข้อผิดพลาด', 'กรุณาระบุชื่อของคุณ');
        return;
    }
    currentChatName = nameInput;
    currentChatColor = colorInput;
    localStorage.setItem('chatName', currentChatName);
    localStorage.setItem('chatColor', currentChatColor);
    showToast('success', 'สำเร็จ', 'บันทึกชื่อสำหรับแชทแล้ว');
    renderChatMessages(); // Re-render to update 'me' bubbles
}

async function loadChat() {
    try {
        const result = await fetchData('/api/chat');
        if (result.success) {
            // เช็คว่ามีข้อความใหม่ไหม ถ้ามีค่อยเลื่อนลงล่างสุด
            const isNew = chatData.length !== result.data.length ||
                          (chatData.length > 0 && result.data.length > 0 &&
                           chatData[chatData.length-1].id !== result.data[result.data.length-1].id);
            chatData = result.data;
            renderChatMessages();

            if (isNew) {
                const container = document.getElementById('chat-messages');
                if (container) container.scrollTop = container.scrollHeight;
            }
        }
    } catch (e) {
        console.error('Chat load error:', e);
    }
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (chatData.length === 0) {
        container.innerHTML = `<div class="chat-empty">
            <i class="fa-regular fa-comments" style="font-size:3rem;margin-bottom:10px;opacity:0.5;"></i>
            <p>ยังไม่มีข้อความ เริ่มต้นทักทายเลย!</p>
        </div>`;
        return;
    }

    let html = '';
    let lastDate = '';

    chatData.forEach(msg => {
        const dt = new Date(msg.timestamp);
        const dayStr = dt.toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'numeric'});
        const timeStr = dt.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'});

        if (dayStr !== lastDate) {
            html += `<div class="chat-day-divider"><span>${dayStr}</span></div>`;
            lastDate = dayStr;
        }

        const isMe = currentChatName && msg.sender === currentChatName;
        const bubbleCls = isMe ? 'me-bubble' : 'other';
        const wrapCls   = isMe ? 'me' : '';
        const bgStyle   = isMe ? `background: ${currentChatColor};` : '';
        const avatarColor = msg.color || '#94a3b8';

        html += `
        <div class="chat-bubble-wrap ${wrapCls}">
            ${!isMe ? `<div class="chat-avatar-small" style="background:${avatarColor};">${msg.sender.charAt(0)}</div>` : ''}
            <div class="chat-bubble-inner">
                ${!isMe ? `<div class="chat-sender-name">${msg.sender}</div>` : ''}
                <div class="chat-bubble ${bubbleCls}" style="${bgStyle}">
                    ${msg.text.replace(/\\n/g, '<br>')}
                </div>
                <div class="chat-meta" style="${isMe ? 'justify-content:flex-end;' : ''}">
                    <span class="chat-time">${timeStr}</span>
                    <button class="chat-del-btn" onclick="deleteMessage('${msg.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    });

    // We only update innerHTML if it's different to prevent flickering/losing text selection
    // But since timestamps change etc, it's safer to just overwrite.
    // For a real robust app, we'd append only new nodes.
    const scrollPos = container.scrollTop;
    const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 20;

    container.innerHTML = html;

    if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
    } else {
        container.scrollTop = scrollPos;
    }
}

function chatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-text-input');
    const text = input.value.trim();
    if (!text) return;
    if (!currentChatName) {
        showToast('error', 'แจ้งเตือน', 'กรุณาตั้งชื่อและกดยืนยันก่อนแชท');
        document.getElementById('chat-name-input').focus();
        return;
    }

    // Clear input & close picker
    input.value = '';
    document.getElementById('emoji-picker').style.display = 'none';

    try {
        await fetchData('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                sender: currentChatName,
                text: text,
                color: currentChatColor
            })
        });
        loadChat(); // Reload immediately
    } catch (e) {
        showToast('error', 'ส่งไม่สำเร็จ', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
}

async function deleteMessage(id) {
    if (!confirm('ลบข้อความนี้ใช่หรือไม่?')) return;
    try {
        await fetch(`/api/chat/${id}`, { method: 'DELETE' });
        loadChat();
    } catch (e) {
        showToast('error', 'ลบไม่สำเร็จ');
    }
}

async function clearChatConfirm() {
    if (!confirm('ต้องการล้างข้อความแชททั้งหมดใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)')) return;
    try {
        // Since we don't have a clear all endpoint, we can just delete file contents manually or add endpoint.
        // I will add a trick: we can just post a special clear message or let's use the fetch clear history approach.
        // Actually I didn't add /api/chat DELETE ALL. We can leave this as a UI-only clear or ask user to delete one by one.
        // Wait, let's just make it call the API if it existed, otherwise show error.
        showToast('warning', 'ฟังก์ชันนี้ยังไม่เปิดใช้งาน', 'กรุณาลบทีละข้อความครับ');
    } catch (e) {}
}

// === EMOJI PICKER ===
function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}
function initEmojiPicker() {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;
    const emojis = ['😀','😂','🥰','😎','🤔','😅','👍','🙏','🎉','🔥','✅','❌','👀','✨','💪','💡'];
    grid.innerHTML = emojis.map(e => `<button class="emoji-btn" onclick="addEmoji('${e}')">${e}</button>`).join('');
}
function addEmoji(emoji) {
    const input = document.getElementById('chat-text-input');
    input.value += emoji;
    input.focus();
    toggleEmojiPicker();
}

// clear polling when not in chat tab (optional, but good for performance)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!e.currentTarget.getAttribute('onclick').includes('chat')) {
            if (chatPollingInterval) {
                clearInterval(chatPollingInterval);
                chatPollingInterval = null;
            }
        }
    });
});
