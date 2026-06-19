// Admin panel logic for Campus Smart Scheduler
document.addEventListener('DOMContentLoaded', () => {
    // 1. Session check
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Access Denied. Please login as Admin.");
        window.location.href = "../login.html";
        return;
    }

    // 2. Set username and avatar in topbar
    const usernameEl = document.querySelector('.username');
    const avatarEl = document.querySelector('.avatar');
    if (usernameEl) usernameEl.innerHTML = `${currentUser.name} ▾`;
    if (avatarEl) avatarEl.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // 3. Setup logout button
    const logoutBtn = document.querySelector('.sb-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = '../login.html';
        });
    }

    // 4. Inject AI assistant widget
    const aiScript = document.createElement('script');
    aiScript.src = '../js/ai-assistant.js';
    document.body.appendChild(aiScript);

    // 5. Page routing based on pathname
    const path = window.location.pathname;
    
    if (path.includes('dashboard.html')) {
        initDashboard();
    } else if (path.includes('manage-courses.html')) {
        initManageCourses();
    } else if (path.includes('manage-rooms.html')) {
        initManageRooms();
    } else if (path.includes('manage-students.html')) {
        initManageStudents();
    } else if (path.includes('manage-teachers.html')) {
        initManageTeachers();
    } else if (path.includes('generate-timetable.html')) {
        initGenerateTimetable();
    } else if (path.includes('conflict-detection.html')) {
        initConflictDetection();
    } else if (path.includes('announcements.html')) {
        initAnnouncements();
    } else if (path.includes('profile.html')) {
        initProfile();
    }
});

// --- CUSTOM MODAL / DIALOG DIALOGUE SYSTEM ---

function showCustomModal({ title, contentHtml, buttons, onClose }) {
    // Remove existing modal if any
    const existing = document.getElementById('custom-dialog-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-dialog-modal';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.zIndex = '20000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.fontFamily = "'Inter', -apple-system, sans-serif";

    const box = document.createElement('div');
    box.style.background = 'white';
    box.style.borderRadius = '16px';
    box.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
    box.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    box.style.width = '480px';
    box.style.maxWidth = '90%';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.overflow = 'hidden';
    box.style.transform = 'translateY(-20px) scale(0.95)';
    box.style.transition = 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    // Header
    const header = document.createElement('div');
    header.style.padding = '18px 24px';
    header.style.borderBottom = '1px solid #e2e8f0';
    header.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)';
    header.style.color = 'white';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.fontWeight = '600';
    header.style.fontSize = '16px';
    header.innerHTML = `
        <span style="flex:1;">${title}</span>
        <button id="modal-close-x" style="background:transparent; border:none; color:rgba(255,255,255,0.7); font-size:24px; cursor:pointer; font-weight:300; line-height: 1; transition:color 0.2s;">&times;</button>
    `;
    box.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.style.padding = '24px';
    body.style.fontSize = '14px';
    body.style.lineHeight = '1.6';
    body.style.color = '#334155';
    body.style.maxHeight = '70vh';
    body.style.overflowY = 'auto';
    body.innerHTML = contentHtml;
    box.appendChild(body);

    // Footer Buttons
    const footer = document.createElement('div');
    footer.style.padding = '16px 24px';
    footer.style.borderTop = '1px solid #f1f5f9';
    footer.style.background = '#f8fafc';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '12px';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.padding = '9px 18px';
        button.style.fontSize = '13.5px';
        button.style.fontWeight = '500';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s';
        
        if (btn.primary) {
            button.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.boxShadow = '0 4px 10px rgba(124,58,237,0.2)';
            button.onmouseover = () => button.style.opacity = '0.9';
            button.onmouseout = () => button.style.opacity = '1';
        } else if (btn.danger) {
            button.style.background = '#ef4444';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.boxShadow = '0 4px 10px rgba(239,68,68,0.2)';
            button.onmouseover = () => button.style.opacity = '0.9';
            button.onmouseout = () => button.style.opacity = '1';
        } else {
            button.style.background = 'white';
            button.style.color = '#475569';
            button.style.border = '1px solid #cbd5e1';
            button.onmouseover = () => button.style.background = '#f1f5f9';
            button.onmouseout = () => button.style.background = 'white';
        }

        button.addEventListener('click', () => {
            btn.onClick(closeModal);
        });
        footer.appendChild(button);
    });

    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Close Modal helper
    function closeModal() {
        overlay.style.opacity = '0';
        box.style.transform = 'translateY(20px) scale(0.95)';
        setTimeout(() => {
            overlay.remove();
            if (onClose) onClose();
        }, 250);
    }

    // Trigger animate-in
    setTimeout(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'translateY(0) scale(1)';
    }, 10);

    // Event listeners
    document.getElementById('modal-close-x').addEventListener('click', closeModal);
}

function customAlert(title, message, onOk) {
    showCustomModal({
        title: title,
        contentHtml: `<p style="margin:0;">${message.replace(/\n/g, '<br/>')}</p>`,
        buttons: [{
            text: 'OK',
            primary: true,
            onClick: (close) => { close(); if (onOk) onOk(); }
        }]
    });
}

function customConfirm(title, message, onConfirm, onCancel) {
    showCustomModal({
        title: title,
        contentHtml: `<p style="margin:0;">${message}</p>`,
        buttons: [
            {
                text: 'Cancel',
                onClick: (close) => { close(); if (onCancel) onCancel(); }
            },
            {
                text: 'Confirm',
                danger: true,
                onClick: (close) => { close(); if (onConfirm) onConfirm(); }
            }
        ]
    });
}

// --- PAGE INITIALIZERS ---

// 1. Dashboard
function initDashboard() {
    // Load counts
    const statNums = document.querySelectorAll('.stat-num');
    
    // Fetch students
    fetch('../api/students').then(r => r.json()).then(data => {
        if (statNums[0]) statNums[0].textContent = data.length;
    });
    // Fetch teachers
    fetch('../api/teachers').then(r => r.json()).then(data => {
        if (statNums[1]) statNums[1].textContent = data.length;
    });
    // Fetch courses
    fetch('../api/courses').then(r => r.json()).then(data => {
        if (statNums[2]) statNums[2].textContent = data.length;
    });
    // Fetch rooms
    fetch('../api/rooms').then(r => r.json()).then(data => {
        if (statNums[3]) statNums[3].textContent = data.length;
    });

    // Load Pending Requests
    loadPendingRequests();

    // Check System Status
    loadSystemStatus();
}

function loadPendingRequests() {
    const cardContainer = document.querySelector('.two-col .card:first-child');
    if (!cardContainer) return;

    fetch('../api/requests')
    .then(r => r.json())
    .then(requests => {
        // Clear previous items except the title
        const title = cardContainer.querySelector('.card-title');
        cardContainer.innerHTML = '';
        cardContainer.appendChild(title);

        const pending = requests.filter(r => r.status === 'Pending');
        if (pending.length === 0) {
            const noReq = document.createElement('p');
            noReq.style.fontSize = '13px';
            noReq.style.color = '#888';
            noReq.style.padding = '1rem';
            noReq.textContent = "No pending rescheduling or quiz requests.";
            cardContainer.appendChild(noReq);
            return;
        }

        pending.forEach(req => {
            const typeColor = req.type === 'Quiz' ? 'background:#e0f2fe; color:#0369a1;' : 'background:#fef3c7; color:#b45309;';
            const item = document.createElement('div');
            item.className = 'admin-req-item';
            item.innerHTML = `
                <div class="admin-req-type" style="${typeColor}">${req.type}</div>
                <div class="admin-req-info" style="flex: 1; margin-left: 12px;">
                    <div class="admin-req-title">${req.title}</div>
                    <div class="admin-req-sub">${req.teacher_name} — ${req.details}</div>
                </div>
                <div class="admin-req-actions">
                    <button class="admin-btn-approve" onclick="handleRequest(${req.id}, 'Approved')">✅ Approve</button>
                    <button class="admin-btn-reject" onclick="handleRequest(${req.id}, 'Rejected')">❌ Reject</button>
                </div>
            `;
            cardContainer.appendChild(item);
        });
    });
}

window.handleRequest = function(id, status) {
    fetch('../api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, status: status })
    })
    .then(r => r.json())
    .then(data => {
        customAlert("Updated", `Request ${status} successfully!`);
        loadPendingRequests();
        loadSystemStatus();
    });
};

function loadSystemStatus() {
    const statusItems = document.querySelectorAll('.admin-status-value');
    if (statusItems.length === 0) return;

    // Check if Timetable Generated
    fetch('../api/timetable')
    .then(r => r.json())
    .then(tt => {
        statusItems[0].innerHTML = tt.length > 0 ? `✅ Yes (${tt.length} entries)` : `❌ No timetable active`;
    });

    // Check conflicts
    fetch('../api/timetable/conflicts')
    .then(r => r.json())
    .then(conflicts => {
        statusItems[1].innerHTML = conflicts.length > 0 
            ? `<span style="color:#ef4444; font-weight:600;">⚠️ ${conflicts.length} Issues Found</span>` 
            : `✅ 0 Conflicts (Clean)`;
    });

    // Last updated / db status
    statusItems[2].textContent = new Date().toLocaleString();
    statusItems[3].textContent = "✅ Connected (SQLite)";
}

// 2. Manage Courses
function initManageCourses() {
    const tbody = document.querySelector('.clo-table tbody');
    const addBtn = document.querySelector('.admin-btn-add');
    const card = document.querySelector('.page-content .card');

    function loadCourses() {
        fetch('../api/courses')
        .then(r => r.json())
        .then(courses => {
            tbody.innerHTML = '';
            courses.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:left; font-weight: 600;">${c.code}</td>
                    <td style="text-align:left;" class="clo-name">${c.name}</td>
                    <td>${c.teacher_name || '<span style="color:#d97706;">Unassigned</span>'}</td>
                    <td>${c.semester}</td>
                    <td>${c.credits}</td>
                    <td>${c.student_count}</td>
                    <td>
                        <button class="admin-btn-small" style="background:#4f46e5; border:none; color:white; padding:5px 10px; border-radius:4px; margin-right:5px; cursor:pointer;" onclick="editCourse(${c.id})">✏️ Edit</button>
                        <button class="admin-btn-small-delete" onclick="deleteCourse(${c.id})">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    // Inject Create Course Form dynamically
    const formDiv = document.createElement('div');
    formDiv.id = 'addCourseForm';
    formDiv.className = 'card';
    formDiv.style.display = 'none';
    formDiv.style.marginBottom = '1.2rem';
    
    // Load teachers to select
    fetch('../api/teachers').then(r => r.json()).then(teachers => {
        let options = '<option value="">Select Teacher (Optional)</option>';
        teachers.forEach(t => {
            options += `<option value="${t.id}">${t.name}</option>`;
        });

        formDiv.innerHTML = `
            <h3 class="card-title">Add New Course</h3>
            <div class="gen-form">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="gen-form-group">
                        <label>Course Code</label>
                        <input type="text" id="c-code" class="req-input" placeholder="e.g. CS-201">
                    </div>
                    <div class="gen-form-group">
                        <label>Course Name</label>
                        <input type="text" id="c-name" class="req-input" placeholder="e.g. Data Structures">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
                    <div class="gen-form-group">
                        <label>Semester</label>
                        <select id="c-sem" class="tt-select" style="width:100%;">
                            <option>1st Semester</option>
                            <option>2nd Semester</option>
                            <option>3rd Semester</option>
                            <option>4th Semester</option>
                            <option>5th Semester</option>
                            <option>6th Semester</option>
                            <option>7th Semester</option>
                            <option>8th Semester</option>
                        </select>
                    </div>
                    <div class="gen-form-group">
                        <label>Credit Hours</label>
                        <input type="number" id="c-credits" class="req-input" min="1" max="4" value="3">
                    </div>
                    <div class="gen-form-group">
                        <label>Course Type</label>
                        <select id="c-type" class="tt-select" style="width:100%;">
                            <option value="Lecture">Lecture</option>
                            <option value="Lab">Lab</option>
                        </select>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="gen-form-group">
                        <label>Assign Faculty</label>
                        <select id="c-teacher" class="tt-select" style="width:100%;">
                            ${options}
                        </select>
                    </div>
                    <div class="gen-form-group">
                        <label>Est. Students</label>
                        <input type="number" id="c-students" class="req-input" value="35">
                    </div>
                </div>
                <div style="display:flex; gap:1rem; margin-top: 1rem;">
                    <button class="gen-submit-btn" onclick="saveCourse()">💾 Save Course</button>
                    <button class="gen-submit-btn" style="background:#999;" onclick="toggleCourseForm(false)">Cancel</button>
                </div>
            </div>
        `;
    });

    card.parentNode.insertBefore(formDiv, card);

    window.toggleCourseForm = function(show) {
        formDiv.style.display = show ? 'block' : 'none';
    };

    addBtn.addEventListener('click', () => toggleCourseForm(true));

    window.saveCourse = function() {
        const code = document.getElementById('c-code').value.trim();
        const name = document.getElementById('c-name').value.trim();
        const sem = document.getElementById('c-sem').value;
        const credits = parseInt(document.getElementById('c-credits').value);
        const type = document.getElementById('c-type').value;
        const teacher_id = document.getElementById('c-teacher').value || null;
        const students = parseInt(document.getElementById('c-students').value);

        if (!code || !name) {
            customAlert("Error", "Code and Name are required!");
            return;
        }

        fetch('../api/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                name: name,
                semester: sem,
                credits: credits,
                type: type,
                teacher_id: teacher_id ? parseInt(teacher_id) : null,
                student_count: students
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
            return response.json();
        })
        .then(data => {
            customAlert("Success", "Course added successfully!");
            toggleCourseForm(false);
            loadCourses();
        })
        .catch(err => customAlert("Error", "Error: " + err.message));
    };

    window.deleteCourse = function(id) {
        customConfirm("Delete Course?", "Are you sure you want to delete this course? This will remove it from all schedules.", () => {
            fetch(`../api/courses/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                customAlert("Deleted", data.message);
                loadCourses();
            });
        });
    };

    window.editCourse = function(id) {
        Promise.all([
            fetch('../api/courses').then(r => r.json()),
            fetch('../api/teachers').then(r => r.json())
        ])
        .then(([courses, teachers]) => {
            const c = courses.find(item => item.id === id);
            if (!c) {
                customAlert("Error", "Course not found.");
                return;
            }

            let teacherOptions = '<option value="">Select Teacher (Optional)</option>';
            teachers.forEach(t => {
                const selected = t.id === c.teacher_id ? 'selected' : '';
                teacherOptions += `<option value="${t.id}" ${selected}>${t.name}</option>`;
            });

            const semOptions = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester']
                .map(sem => `<option value="${sem}" ${c.semester === sem ? 'selected' : ''}>${sem}</option>`).join('');

            const contentHtml = `
                <div class="gen-form" style="text-align: left;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Course Code</label>
                            <input type="text" id="edit-c-code" class="req-input" value="${c.code}">
                        </div>
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Course Name</label>
                            <input type="text" id="edit-c-name" class="req-input" value="${c.name}">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-top:8px;">
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Semester</label>
                            <select id="edit-c-sem" class="tt-select" style="width:100%;">${semOptions}</select>
                        </div>
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Credit Hours</label>
                            <input type="number" id="edit-c-credits" class="req-input" min="1" max="4" value="${c.credits}">
                        </div>
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Course Type</label>
                            <select id="edit-c-type" class="tt-select" style="width:100%;">
                                <option value="Lecture" ${c.type === 'Lecture' ? 'selected' : ''}>Lecture</option>
                                <option value="Lab" ${c.type === 'Lab' ? 'selected' : ''}>Lab</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:8px;">
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Assign Faculty</label>
                            <select id="edit-c-teacher" class="tt-select" style="width:100%;">${teacherOptions}</select>
                        </div>
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">Est. Students</label>
                            <input type="number" id="edit-c-students" class="req-input" value="${c.student_count}">
                        </div>
                    </div>
                </div>
            `;

            showCustomModal({
                title: "✏️ Edit Course",
                contentHtml: contentHtml,
                buttons: [
                    {
                        text: 'Cancel',
                        onClick: (close) => close()
                    },
                    {
                        text: 'Save Changes',
                        primary: true,
                        onClick: (close) => {
                            const code = document.getElementById('edit-c-code').value.trim();
                            const name = document.getElementById('edit-c-name').value.trim();
                            const sem = document.getElementById('edit-c-sem').value;
                            const credits = parseInt(document.getElementById('edit-c-credits').value);
                            const type = document.getElementById('edit-c-type').value;
                            const teacher_id = document.getElementById('edit-c-teacher').value || null;
                            const students = parseInt(document.getElementById('edit-c-students').value);

                            if (!code || !name) {
                                customAlert("Error", "Course Code and Name are required!");
                                return;
                            }

                            fetch(`../api/courses/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    code: code,
                                    name: name,
                                    semester: sem,
                                    credits: credits,
                                    type: type,
                                    teacher_id: teacher_id ? parseInt(teacher_id) : null,
                                    student_count: students
                                })
                            })
                            .then(response => {
                                if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
                                return response.json();
                            })
                            .then(data => {
                                close();
                                customAlert("Success", "Course details updated successfully!");
                                loadCourses();
                            })
                            .catch(err => customAlert("Error", "Error: " + err.message));
                        }
                    }
                ]
            });
        });
    };

    loadCourses();
}

// 3. Manage Rooms
function initManageRooms() {
    const tbody = document.querySelector('.clo-table tbody');
    const addBtn = document.querySelector('.admin-btn-add');
    const card = document.querySelector('.page-content .card');

    function loadRooms() {
        fetch('../api/rooms')
        .then(r => r.json())
        .then(rooms => {
            tbody.innerHTML = '';
            rooms.forEach(r => {
                const tr = document.createElement('tr');
                const typeColor = r.type === 'Lab' ? 'orange' : (r.type === 'Classroom' ? 'blue' : 'purple');
                const statusColor = r.status === 'Available' ? 'green' : 'orange';
                tr.innerHTML = `
                    <td style="text-align:left; font-weight: 600;">${r.room_num}</td>
                    <td style="text-align:left;" class="clo-name">${r.name}</td>
                    <td><span class="clo-pill ${typeColor}">${r.type}</span></td>
                    <td>${r.capacity}</td>
                    <td><span class="clo-pill ${statusColor}">${r.status}</span></td>
                    <td>
                        <button class="admin-btn-small-delete" onclick="deleteRoom(${r.id})">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    // Inject Add Room Form
    const formDiv = document.createElement('div');
    formDiv.id = 'addRoomForm';
    formDiv.className = 'card';
    formDiv.style.display = 'none';
    formDiv.style.marginBottom = '1.2rem';
    formDiv.innerHTML = `
        <h3 class="card-title">Add New Room</h3>
        <div class="gen-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="gen-form-group">
                    <label>Room ID / Number</label>
                    <input type="text" id="r-num" class="req-input" placeholder="e.g. CS-301">
                </div>
                <div class="gen-form-group">
                    <label>Display Name</label>
                    <input type="text" id="r-name" class="req-input" placeholder="e.g. Classroom 1">
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="gen-form-group">
                    <label>Room Type</label>
                    <select id="r-type" class="tt-select" style="width:100%;">
                        <option value="Classroom">Classroom</option>
                        <option value="Lab">Lab</option>
                        <option value="Auditorium">Auditorium</option>
                    </select>
                </div>
                <div class="gen-form-group">
                    <label>Capacity</label>
                    <input type="number" id="r-capacity" class="req-input" value="40" min="10">
                </div>
            </div>
            <div style="display:flex; gap:1rem; margin-top: 1rem;">
                <button class="gen-submit-btn" onclick="saveRoom()">💾 Save Room</button>
                <button class="gen-submit-btn" style="background:#999;" onclick="toggleRoomForm(false)">Cancel</button>
            </div>
        </div>
    `;

    card.parentNode.insertBefore(formDiv, card);

    window.toggleRoomForm = function(show) {
        formDiv.style.display = show ? 'block' : 'none';
    };

    addBtn.addEventListener('click', () => toggleRoomForm(true));

    window.saveRoom = function() {
        const room_num = document.getElementById('r-num').value.trim();
        const name = document.getElementById('r-name').value.trim();
        const type = document.getElementById('r-type').value;
        const capacity = parseInt(document.getElementById('r-capacity').value);

        if (!room_num || !name) {
            customAlert("Error", "Room Number and Display Name are required!");
            return;
        }

        fetch('../api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_num: room_num,
                name: name,
                type: type,
                capacity: capacity
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
            return response.json();
        })
        .then(data => {
            customAlert("Success", "Room added successfully!");
            toggleRoomForm(false);
            loadRooms();
        })
        .catch(err => customAlert("Error", "Error: " + err.message));
    };

    window.deleteRoom = function(id) {
        customConfirm("Delete Room?", "Are you sure you want to delete this room?", () => {
            fetch(`../api/rooms/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                customAlert("Deleted", data.message);
                loadRooms();
            });
        });
    };

    loadRooms();
}

// 4. Manage Students
function initManageStudents() {
    const tbody = document.querySelector('.clo-table tbody');
    const form = document.getElementById('addStudentForm');

    window.openAddStudent = function() { form.style.display = 'block'; };
    window.closeAddStudent = function() { form.style.display = 'none'; };

    function loadStudents() {
        fetch('../api/students')
        .then(r => r.json())
        .then(students => {
            tbody.innerHTML = '';
            students.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:left; font-weight: 600;">${s.roll_no}</td>
                    <td style="text-align:left;" class="clo-name">${s.name}</td>
                    <td>${s.email}</td>
                    <td>${s.semester}</td>
                    <td>${s.department}</td>
                    <td><span class="clo-pill green">Active</span></td>
                    <td>
                        <button class="admin-btn-small-delete" onclick="deleteStudent(${s.id})">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    window.saveStudent = function() {
        const name = form.querySelector('input[placeholder="Ali Raza"]').value.trim();
        const email = form.querySelector('input[placeholder="student@university.edu.pk"]').value.trim();
        
        if (!name || !email) {
            customAlert("Error", "Name and Email are required!");
            return;
        }

        fetch('../api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, email: email })
        })
        .then(response => {
            if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
            return response.json();
        })
        .then(data => {
            customAlert("Success", "Student added successfully!");
            closeAddStudent();
            loadStudents();
        })
        .catch(err => customAlert("Error", "Error: " + err.message));
    };

    window.deleteStudent = function(id) {
        customConfirm("Delete Student?", "Are you sure you want to delete this student?", () => {
            fetch(`../api/students/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                customAlert("Deleted", data.message);
                loadStudents();
            });
        });
    };

    loadStudents();
}

// 5. Manage Teachers
function initManageTeachers() {
    const tbody = document.querySelector('.clo-table tbody');
    const form = document.getElementById('addTeacherForm');
    const courseSelect = form.querySelector('select[multiple]');

    window.openAddTeacher = function() { form.style.display = 'block'; };
    window.closeAddTeacher = function() { form.style.display = 'none'; };

    // Load unassigned or all courses to populate multiple select
    fetch('../api/courses').then(r => r.json()).then(courses => {
        if (courseSelect) {
            courseSelect.innerHTML = '';
            courses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (${c.code}) - ${c.semester}`;
                courseSelect.appendChild(opt);
            });
        }
    });

    function loadTeachers() {
        fetch('../api/teachers')
        .then(r => r.json())
        .then(teachers => {
            tbody.innerHTML = '';
            teachers.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:left;" class="clo-name">${t.name}</td>
                    <td>${t.email}</td>
                    <td>Computer Science</td>
                    <td>Lecturer</td>
                    <td>${t.course_count} Courses</td>
                    <td><span class="clo-pill green">Active</span></td>
                    <td>
                        <button class="admin-btn-small-delete" onclick="deleteTeacher(${t.id})">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    window.saveTeacher = function() {
        const name = form.querySelector('input[placeholder="Sir Farhan Ahmed"]').value.trim();
        const email = form.querySelector('input[placeholder="teacher@university.edu.pk"]').value.trim();
        
        // Find selected courses
        const selectedCourses = [];
        if (courseSelect) {
            for (let i = 0; i < courseSelect.options.length; i++) {
                if (courseSelect.options[i].selected) {
                    selectedCourses.push(parseInt(courseSelect.options[i].value));
                }
            }
        }

        if (!name || !email) {
            customAlert("Error", "Name and Email are required!");
            return;
        }

        fetch('../api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                email: email,
                courses: selectedCourses
            })
        })
        .then(response => {
            if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
            return response.json();
        })
        .then(data => {
            customAlert("Success", "Teacher added successfully!");
            closeAddTeacher();
            loadTeachers();
        })
        .catch(err => customAlert("Error", "Error: " + err.message));
    };

    window.deleteTeacher = function(id) {
        customConfirm("Delete Teacher?", "Are you sure you want to delete this teacher? This will clear their timetable assignments.", () => {
            fetch(`../api/teachers/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                customAlert("Deleted", data.message);
                loadTeachers();
            });
        });
    };

    loadTeachers();
}

// 6. Generate Timetable
function initGenerateTimetable() {
    const historyBody = document.querySelector('.clo-table tbody');
    const genBtn = document.querySelector('.gen-submit-btn');

    function loadHistory() {
        fetch('../api/timetable/history')
        .then(r => r.json())
        .then(history => {
            if (!historyBody) return;
            historyBody.innerHTML = '';
            history.forEach(h => {
                const tr = document.createElement('tr');
                const statusColor = h.status === 'Success' ? 'green' : 'orange';
                const conflictStyle = h.conflicts_count > 0 ? 'color:#ef4444; font-weight:600;' : 'color:#16a34a;';
                tr.innerHTML = `
                    <td>${h.date}</td>
                    <td>${h.semester}</td>
                    <td><span class="clo-pill ${statusColor}">${h.status}</span></td>
                    <td style="${conflictStyle}">${h.conflicts_count} Issues</td>
                    <td><button class="admin-btn-small" onclick="viewHistoryItem(${h.id})">👁️ View</button></td>
                `;
                historyBody.appendChild(tr);
            });
        });
    }

    window.generateTimetable = function() {
        const semester = document.querySelectorAll('.tt-select')[0].value;
        const algorithm = document.querySelectorAll('.tt-select')[1].value;

        // Show loading state on button
        const oldText = genBtn.innerHTML;
        genBtn.disabled = true;
        genBtn.style.opacity = '0.7';
        genBtn.innerHTML = `⏳ Executing ${algorithm}...`;

        fetch('../api/timetable/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                semester: semester,
                algorithm: algorithm
            })
        })
        .then(r => r.json())
        .then(data => {
            // Restore button
            genBtn.disabled = false;
            genBtn.style.opacity = '1';
            genBtn.innerHTML = oldText;

            customAlert(
                "Generation Run Completed", 
                `Algorithm: ${algorithm}\nScheduled classes: ${data.scheduled_count}\nConflicts detected: ${data.conflicts_count}`
            );
            loadHistory();
        })
        .catch(err => {
            genBtn.disabled = false;
            genBtn.style.opacity = '1';
            genBtn.innerHTML = oldText;
            customAlert("Error", "Error running schedule generation: " + err.message);
        });
    };

    window.viewHistoryItem = function(id) {
        fetch('../api/timetable/history')
        .then(r => r.json())
        .then(history => {
            const h = history.find(item => item.id === id);
            if (h) {
                const details = JSON.parse(h.conflicts_details || '[]');
                let conflictsHtml = '';
                if (details.length > 0) {
                    conflictsHtml = `
                        <div style="margin-top: 12px; text-align: left;">
                            <strong style="color: #ef4444; display:block; margin-bottom: 6px; font-size: 13px;">⚠️ Detected Conflicts:</strong>
                            <ul style="padding-left: 20px; color:#475569; font-size:12.5px; margin: 0;">
                                ${details.map(d => `<li style="margin-bottom: 6px;"><strong>[${d.type}]</strong> ${d.details}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                } else {
                    conflictsHtml = `
                        <div style="margin-top: 12px; padding: 10px; background:#f0fdf4; border-radius: 6px; border-left: 3px solid #16a34a; color:#14532d; font-size:13px; text-align: left;">
                            🎉 No scheduling conflicts detected for this run! Timetable is clean.
                        </div>
                    `;
                }

                const contentHtml = `
                    <div style="display:flex; flex-direction:column; gap:8px; text-align: left;">
                        <div><strong>Date of Run:</strong> <span style="color:#64748b;">${h.date}</span></div>
                        <div><strong>Target Semester:</strong> <span style="color:#64748b;">${h.semester}</span></div>
                        <div><strong>Status:</strong> <span class="clo-pill ${h.status === 'Success' ? 'green' : 'orange'}">${h.status}</span></div>
                        <div><strong>Total Conflicts:</strong> <span style="color:#ef4444; font-weight:600;">${h.conflicts_count}</span></div>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                        ${conflictsHtml}
                    </div>
                `;

                showCustomModal({
                    title: `📊 Generation Run Details`,
                    contentHtml: contentHtml,
                    buttons: [{
                        text: 'Close',
                        primary: true,
                        onClick: (close) => close()
                    }]
                });
            }
        });
    };

    loadHistory();
}

// 7. Conflict Detection page
function initConflictDetection() {
    const summaryDiv = document.querySelector('.conflict-summary');
    const cards = document.querySelectorAll('.page-content .card');
    
    // Select cards by index to avoid :first-of-type selector bugs
    const criticalCard = cards[0];
    const warningCard = cards[1];

    function loadConflicts() {
        fetch('../api/timetable/conflicts')
        .then(r => r.json())
        .then(conflicts => {
            // Update Summary Counts
            const criticals = conflicts.filter(c => c.severity === 'Critical');
            const warnings = conflicts.filter(c => c.severity === 'Warning');
            
            if (summaryDiv) {
                summaryDiv.innerHTML = `
                    <h2 class="tt-title">Detected Conflicts</h2>
                    <div style="display:flex; gap:1rem; margin-top:0.8rem;">
                        <div style="padding:0.8rem 1.2rem; background:#fee2e2; border-radius:8px; color:#991b1b; font-weight:600;">
                            ⚠️ ${criticals.length} Critical Issues
                        </div>
                        <div style="padding:0.8rem 1.2rem; background:#fef3c7; border-radius:8px; color:#92400e; font-weight:600;">
                            ⚠️ ${warnings.length} Warnings
                        </div>
                    </div>
                `;
            }

            // Clear Critical list (keep title)
            if (criticalCard) {
                const title = criticalCard.querySelector('.card-title');
                criticalCard.innerHTML = '';
                criticalCard.appendChild(title);
                
                if (criticals.length === 0) {
                    const noCrit = document.createElement('p');
                    noCrit.style.color = '#16a34a';
                    noCrit.style.fontSize = '13.5px';
                    noCrit.style.padding = '1.2rem';
                    noCrit.textContent = "✅ No critical conflicts. Excellent!";
                    criticalCard.appendChild(noCrit);
                } else {
                    criticals.forEach(c => {
                        const item = document.createElement('div');
                        item.className = 'conflict-item critical';
                        
                        // Extract target entry ID(s)
                        const ids = c.entry_id ? [c.entry_id] : (c.entry_ids || []);
                        const idsStr = ids.join(',');
                        
                        let resolveBtn = '';
                        if (ids.length > 0) {
                            resolveBtn = `<button class="conflict-resolve-btn" style="background:#4f46e5; border:none; color:white; padding:8px 16px; border-radius:6px; cursor:pointer;" onclick="openResolveModal('${idsStr}')">🔧 Resolve</button>`;
                        }

                        item.innerHTML = `
                            <div class="conflict-type">${c.type}</div>
                            <div class="conflict-details" style="flex:1; margin-left:12px;">
                                ${c.details}
                            </div>
                            <div style="display:flex; gap:8px;">
                                ${resolveBtn}
                                <button class="conflict-resolve-btn" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; cursor:pointer;" onclick="askAIToResolve('${c.type}: ${c.details.replace(/'/g, "\\'")}')">✨ Ask AI</button>
                            </div>
                        `;
                        criticalCard.appendChild(item);
                    });
                }
            }

            // Clear Warning list (keep title)
            if (warningCard) {
                const title = warningCard.querySelector('.card-title');
                warningCard.innerHTML = '';
                warningCard.appendChild(title);
                
                if (warnings.length === 0) {
                    const noWarn = document.createElement('p');
                    noWarn.style.color = '#16a34a';
                    noWarn.style.fontSize = '13.5px';
                    noWarn.style.padding = '1.2rem';
                    noWarn.textContent = "✅ No warning-level conflicts.";
                    warningCard.appendChild(noWarn);
                } else {
                    warnings.forEach(c => {
                        const item = document.createElement('div');
                        item.className = 'conflict-item warning';
                        
                        const ids = c.entry_id ? [c.entry_id] : (c.entry_ids || []);
                        const idsStr = ids.join(',');
                        
                        let resolveBtn = '';
                        if (ids.length > 0) {
                            resolveBtn = `<button class="conflict-resolve-btn" style="background:#4f46e5; border:none; color:white; padding:8px 16px; border-radius:6px; cursor:pointer;" onclick="openResolveModal('${idsStr}')">🔧 Resolve</button>`;
                        }

                        item.innerHTML = `
                            <div class="conflict-type">${c.type}</div>
                            <div class="conflict-details" style="flex:1; margin-left:12px;">
                                ${c.details}
                            </div>
                            <div style="display:flex; gap:8px;">
                                ${resolveBtn}
                                <button class="conflict-resolve-btn" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; cursor:pointer;" onclick="askAIToResolve('${c.type}: ${c.details.replace(/'/g, "\\'")}')">✨ Ask AI</button>
                            </div>
                        `;
                        warningCard.appendChild(item);
                    });
                }
            }
        });
    }

    // Modal popup to reschedule class dynamically
    window.openResolveModal = function(entryIdsStr) {
        const ids = entryIdsStr.split(',').map(id => parseInt(id));
        
        Promise.all([
            fetch('../api/timetable').then(r => r.json()),
            fetch('../api/courses').then(r => r.json()),
            fetch('../api/rooms').then(r => r.json()),
            fetch('../api/teachers').then(r => r.json())
        ])
        .then(([timetable, courses, rooms, teachers]) => {
            const targetEntries = timetable.filter(t => ids.includes(t.id));
            if (targetEntries.length === 0) {
                customAlert("Error", "Timetable entry not found.");
                return;
            }

            let selectionHtml = '';
            if (targetEntries.length > 1) {
                selectionHtml = `
                    <div style="margin-bottom:12px; text-align: left;">
                        <label style="font-weight:600; display:block; margin-bottom:6px; font-size:13px; color:#475569;">Select Class to Reschedule / Edit:</label>
                        <select id="resolve-class-select" class="tt-select" style="width:100%;" onchange="updateResolveFormInfo()">
                            ${targetEntries.map(e => `<option value="${e.id}">${e.course_name} (${e.teacher_name}) - ${e.day} ${e.time_slot}</option>`).join('')}
                        </select>
                    </div>
                `;
            } else {
                selectionHtml = `<input type="hidden" id="resolve-class-select" value="${targetEntries[0].id}" />`;
            }

            const roomOptions = rooms.map(r => `<option value="${r.room_num}">${r.room_num} (${r.name} - Cap: ${r.capacity})</option>`).join('');
            const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => `<option value="${d}">${d}</option>`).join('');
            const timeslots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
            const timeOptions = timeslots.map(s => `<option value="${s}">${s}</option>`).join('');

            const contentHtml = `
                <div style="display:flex; flex-direction:column; gap:12px; text-align: left;">
                    ${selectionHtml}
                    
                    <div id="resolve-details-box" style="padding:10px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; color:#475569; text-align: left;">
                        <!-- Filled by JS -->
                    </div>

                    <hr style="border:0; border-top:1px solid #e2e8f0; margin:4px 0;" />

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">New Day</label>
                            <select id="resched-day" class="tt-select" style="width:100%;">${dayOptions}</select>
                        </div>
                        <div class="gen-form-group">
                            <label style="font-weight:600; font-size:12.5px;">New Time Slot</label>
                            <select id="resched-slot" class="tt-select" style="width:100%;">${timeOptions}</select>
                        </div>
                    </div>

                    <div class="gen-form-group">
                        <label style="font-weight:600; font-size:12.5px;">New Room</label>
                        <select id="resched-room" class="tt-select" style="width:100%;">${roomOptions}</select>
                    </div>

                    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px;">
                        <button class="admin-btn-small" style="background:#4f46e5; color:white; padding:8px 14px; border:none; border-radius:6px; cursor:pointer;" id="suggest-slot-btn">💡 Auto-Suggest Free Slot</button>
                        <button class="admin-btn-small-delete" style="padding:8px 14px;" id="cancel-class-btn">🗑️ Cancel/Delete Class</button>
                    </div>

                    <div id="suggest-result" style="font-size:12.5px; margin-top:4px; font-weight:600; text-align: center;"></div>
                </div>
            `;

            showCustomModal({
                title: "🔧 Resolve Timetable Conflict",
                contentHtml: contentHtml,
                buttons: [
                    {
                        text: 'Cancel',
                        onClick: (close) => close()
                    },
                    {
                        text: 'Save Resolution',
                        primary: true,
                        onClick: (close) => {
                            const activeId = parseInt(document.getElementById('resolve-class-select').value);
                            const day = document.getElementById('resched-day').value;
                            const slot = document.getElementById('resched-slot').value;
                            const room = document.getElementById('resched-room').value;

                            fetch(`../api/timetable/${activeId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ day: day, time_slot: slot, room_num: room })
                            })
                            .then(r => {
                                if (!r.ok) return r.json().then(e => { throw new Error(e.error); });
                                return r.json();
                            })
                            .then(res => {
                                close();
                                customAlert("Success", "Schedule updated successfully and conflict resolved!");
                                loadConflicts();
                            })
                            .catch(err => customAlert("Error", "Error saving resolution: " + err.message));
                        }
                    }
                ]
            });

            // Helper to update form fields dynamically
            window.updateResolveFormInfo = function() {
                const activeId = parseInt(document.getElementById('resolve-class-select').value);
                const entry = targetEntries.find(t => t.id === activeId);
                
                document.getElementById('resolve-details-box').innerHTML = `
                    <strong>Class:</strong> ${entry.course_name} (${entry.course_code})<br/>
                    <strong>Teacher:</strong> ${entry.teacher_name}<br/>
                    <strong>Current Room:</strong> ${entry.room_num}<br/>
                    <strong>Current Schedule:</strong> ${entry.day} at ${entry.time_slot}<br/>
                    <strong>Cohort:</strong> ${entry.semester}
                `;

                // Set select values to current values
                document.getElementById('resched-day').value = entry.day;
                document.getElementById('resched-slot').value = entry.time_slot;
                document.getElementById('resched-room').value = entry.room_num;
                document.getElementById('suggest-result').innerHTML = '';
            };

            // Run initially
            updateResolveFormInfo();

            // Wire up cancel/delete class
            document.getElementById('cancel-class-btn').addEventListener('click', () => {
                const activeId = parseInt(document.getElementById('resolve-class-select').value);
                customConfirm("Cancel Class?", "Are you sure you want to completely cancel and delete this class entry from the timetable?", () => {
                    fetch(`../api/timetable/${activeId}`, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(res => {
                        const modal = document.getElementById('custom-dialog-modal');
                        if (modal) modal.remove();
                        customAlert("Success", "Class entry deleted successfully!");
                        loadConflicts();
                    });
                });
            });

            // Wire up auto-suggest slot
            document.getElementById('suggest-slot-btn').addEventListener('click', () => {
                const activeId = parseInt(document.getElementById('resolve-class-select').value);
                const entry = targetEntries.find(t => t.id === activeId);
                const courseObj = courses.find(c => c.id === entry.course_id) || {};
                const resultDiv = document.getElementById('suggest-result');
                
                // Get teacher availability
                fetch(`../api/teachers/availability?teacher_id=${entry.teacher_id}`)
                .then(r => r.json())
                .then(availability => {
                    const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const SLOTS_LIST = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM']; // exclude lunch slot 01:00 PM
                    
                    let found = null;
                    
                    // Shuffle arrays for varieties
                    const shuffledDays = [...DAYS_LIST].sort(() => Math.random() - 0.5);
                    const shuffledSlots = [...SLOTS_LIST].sort(() => Math.random() - 0.5);

                    for (let day of shuffledDays) {
                        if (found) break;
                        for (let slot of shuffledSlots) {
                            if (found) break;
                            
                            // Check teacher availability
                            const tAvail = availability[day] || [];
                            if (!tAvail.includes(slot)) continue;
                            
                            // Check teacher conflict in timetable (excluding current entry id)
                            const teacherBusy = timetable.some(t => t.id !== activeId && t.teacher_id === entry.teacher_id && t.day === day && t.time_slot === slot);
                            if (teacherBusy) continue;
                            
                            // Check student cohort conflict (excluding current entry id)
                            const studentBusy = timetable.some(t => t.id !== activeId && t.semester === entry.semester && t.day === day && t.time_slot === slot);
                            if (studentBusy) continue;
                            
                            // Check rooms
                            const suitableRooms = rooms.filter(r => (courseObj.type === 'Lab' && r.type === 'Lab') || (courseObj.type !== 'Lab' && r.type !== 'Lab'));
                            
                            for (let room of suitableRooms) {
                                // Check room conflict (excluding current entry id)
                                const roomBusy = timetable.some(t => t.id !== activeId && t.room_num === room.room_num && t.day === day && t.time_slot === slot);
                                if (!roomBusy) {
                                    found = { day, slot, room: room.room_num };
                                    break;
                                }
                            }
                        }
                    }

                    if (found) {
                        // Update select values
                        document.getElementById('resched-day').value = found.day;
                        document.getElementById('resched-slot').value = found.slot;
                        document.getElementById('resched-room').value = found.room;
                        
                        resultDiv.style.color = '#16a34a';
                        resultDiv.innerHTML = `💡 Auto-Suggested Slot: ${found.day} at ${found.slot} in Room ${found.room}!`;
                    } else {
                        resultDiv.style.color = '#ef4444';
                        resultDiv.innerHTML = `❌ No conflict-free slot found automatically.`;
                    }
                });
            });
        });
    };

    window.askAIToResolve = function(issueText) {
        // Open the AI Chat Assistant and prompt it automatically
        const bubble = document.getElementById('ai-bubble-btn');
        const chatWin = document.getElementById('ai-chat-win');
        const input = document.getElementById('ai-chat-in');
        
        if (chatWin && !chatWin.classList.contains('open')) {
            bubble.click(); // trigger open
        }
        
        if (input) {
            input.value = `How do I resolve the conflict: "${issueText}"?`;
            document.getElementById('ai-send-btn').click();
        }
    };

    loadConflicts();
}

// 8. Announcements management
function initAnnouncements() {
    const tbody = document.querySelector('.clo-table tbody');
    const form = document.getElementById('newAnnForm');

    window.openNewAnnouncement = function() { if (form) form.style.display = 'block'; };
    window.closeNewAnnouncement = function() { if (form) form.style.display = 'none'; };

    function loadAnnouncements() {
        fetch('../api/announcements?role=admin')
        .then(r => r.json())
        .then(data => {
            if (!tbody) return;
            tbody.innerHTML = '';
            data.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:left; font-weight:600;">${a.title}</td>
                    <td style="text-align:left;">${a.content}</td>
                    <td>${a.date}</td>
                    <td><span class="clo-pill blue">${a.role_target}</span></td>
                    <td>
                        <button class="admin-btn-small-delete" onclick="deleteAnnouncement(${a.id})">🗑️ Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    window.publishAnnouncement = function() {
        const title = document.getElementById('annTitle').value.trim();
        const content = document.getElementById('annContent').value.trim();
        const target = document.getElementById('annAudience').value;

        if (!title || !content) {
            customAlert("Error", "Title and Content are required!");
            return;
        }

        fetch('../api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: content,
                role_target: target
            })
        })
        .then(r => r.json())
        .then(data => {
            customAlert("Published", "✅ Announcement published successfully!");
            closeNewAnnouncement();
            loadAnnouncements();
            // Clear inputs
            document.getElementById('annTitle').value = '';
            document.getElementById('annContent').value = '';
        });
    };

    window.deleteAnnouncement = function(id) {
        customConfirm("Delete Announcement?", "Are you sure you want to delete this announcement?", () => {
            fetch(`../api/announcements/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(data => {
                customAlert("Deleted", data.message);
                loadAnnouncements();
            });
        });
    };

    loadAnnouncements();
}

// 9. Profile settings page
function initProfile() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const profileWrap = document.querySelector('.profile-wrap');
    if (!profileWrap) return;

    // Load initial values from currentUser
    updateProfileDOM(currentUser);

    // Bind Edit Button
    const editBtn = document.querySelector('.profile-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openEditProfileModal(currentUser);
        });
    }
}

function updateProfileDOM(user) {
    const pName = document.querySelector('.profile-name');
    const pAvatar = document.querySelector('.profile-avatar');
    const pRole = document.querySelector('.profile-role');
    const infoValues = document.querySelectorAll('.profile-info-value');

    if (pName) pName.textContent = user.name;
    if (pAvatar) pAvatar.textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (pRole) pRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    if (infoValues.length >= 2) {
        infoValues[0].textContent = user.name; // Full Name
        infoValues[1].textContent = user.email; // Email
        infoValues[2].textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1); // Role
    }
}

function openEditProfileModal(user) {
    const contentHtml = `
        <div class="gen-form" style="text-align: left;">
            <div class="gen-form-group">
                <label style="font-weight:600; font-size:12.5px;">Full Name</label>
                <input type="text" id="edit-profile-name" class="req-input" value="${user.name}">
            </div>
            <div class="gen-form-group" style="margin-top:8px;">
                <label style="font-weight:600; font-size:12.5px;">Email Address</label>
                <input type="email" id="edit-profile-email" class="req-input" value="${user.email}">
            </div>
            <hr style="border:0; border-top:1px solid #e2e8f0; margin:15px 0;" />
            <div class="gen-form-group">
                <label style="font-weight:600; font-size:12.5px;">New Password (leave blank to keep current)</label>
                <input type="password" id="edit-profile-password" class="req-input" placeholder="New password">
            </div>
            <div class="gen-form-group" style="margin-top:8px;">
                <label style="font-weight:600; font-size:12.5px;">Confirm New Password</label>
                <input type="password" id="edit-profile-confirm" class="req-input" placeholder="Confirm new password">
            </div>
        </div>
    `;

    showCustomModal({
        title: "👤 Edit Profile Settings",
        contentHtml: contentHtml,
        buttons: [
            {
                text: 'Cancel',
                onClick: (close) => close()
            },
            {
                text: 'Save Changes',
                primary: true,
                onClick: (close) => {
                    const name = document.getElementById('edit-profile-name').value.trim();
                    const email = document.getElementById('edit-profile-email').value.trim();
                    const password = document.getElementById('edit-profile-password').value;
                    const confirm = document.getElementById('edit-profile-confirm').value;

                    if (!name || !email) {
                        customAlert("Error", "Name and Email are required!");
                        return;
                    }

                    if (password && password !== confirm) {
                        customAlert("Error", "Passwords do not match!");
                        return;
                    }

                    fetch('../api/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: user.id,
                            name: name,
                            email: email,
                            password: password || null
                        })
                    })
                    .then(response => {
                        if (!response.ok) return response.json().then(e => { throw new Error(e.error); });
                        return response.json();
                    })
                    .then(updatedUser => {
                        close();
                        customAlert("Success", "Profile updated successfully!");
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        updateProfileDOM(updatedUser);
                        
                        const headerName = document.querySelector('.username');
                        const headerAvatar = document.querySelector('.avatar');
                        if (headerName) headerName.innerHTML = `${updatedUser.name} ▾`;
                        if (headerAvatar) headerAvatar.textContent = updatedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    })
                    .catch(err => customAlert("Error", "Error updating profile: " + err.message));
                }
            }
        ]
    });
}
