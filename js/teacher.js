// Teacher panel logic for Campus Smart Scheduler
document.addEventListener('DOMContentLoaded', () => {
    // 1. Session check
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || currentUser.role !== 'teacher') {
        alert("Access Denied. Please login as Teacher.");
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
        initDashboard(currentUser);
    } else if (path.includes('classes.html')) {
        initClasses(currentUser);
    } else if (path.includes('timetable.html')) {
        initTimetable(currentUser);
    } else if (path.includes('availability.html')) {
        initAvailability(currentUser);
    } else if (path.includes('students.html')) {
        initStudents(currentUser);
    } else if (path.includes('requests.html')) {
        initRequests(currentUser);
    } else if (path.includes('announcements.html')) {
        initAnnouncements();
    } else if (path.includes('profile.html')) {
        initProfile(currentUser);
    }
});

// --- PAGE INITIALIZERS ---

// 1. Dashboard
function initDashboard(teacher) {
    const statNums = document.querySelectorAll('.stat-num');
    
    // Stats: My Classes
    fetch(`../api/courses`)
    .then(r => r.json())
    .then(courses => {
        const myCourses = courses.filter(c => c.teacher_id === teacher.id);
        if (statNums[0]) statNums[0].textContent = myCourses.length;
        
        // Stats: Assigned Students (sum student counts for teacher's courses)
        const totalStudents = myCourses.reduce((sum, c) => sum + c.student_count, 0);
        if (statNums[1]) statNums[1].textContent = totalStudents > 0 ? totalStudents : 35;
    });

    // Stats: Pending Requests
    fetch(`../api/requests?teacher_id=${teacher.id}`)
    .then(r => r.json())
    .then(requests => {
        const pending = requests.filter(r => r.status === 'Pending');
        if (statNums[2]) statNums[2].textContent = pending.length;
    });

    // Stats: Announcements
    fetch(`../api/announcements?role=teacher`)
    .then(r => r.json())
    .then(ann => {
        if (statNums[3]) statNums[3].textContent = ann.length;
    });

    // Today's Classes List
    const classesContainer = document.querySelector('.card:first-of-type');
    if (classesContainer) {
        // Find current day name
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = daysOfWeek[new Date().getDay()];
        
        fetch(`../api/timetable?teacher_id=${teacher.id}`)
        .then(r => r.json())
        .then(classes => {
            // Filter classes for today
            const todayClasses = classes.filter(c => c.day.toLowerCase() === todayName.toLowerCase());
            
            // Clear current items (keep the header)
            const title = classesContainer.querySelector('.card-title');
            classesContainer.innerHTML = '';
            classesContainer.appendChild(title);

            if (todayClasses.length === 0) {
                const noClass = document.createElement('p');
                noClass.style.fontSize = '13.5px';
                noClass.style.color = '#888';
                noClass.style.padding = '1.2rem';
                noClass.textContent = `☕ No classes scheduled for today (${todayName}).`;
                classesContainer.appendChild(noClass);
                return;
            }

            const colors = ['blue', 'green', 'purple', 'orange'];
            todayClasses.forEach((cls, idx) => {
                const item = document.createElement('div');
                item.className = 'class-item';
                item.innerHTML = `
                    <span class="dot ${colors[idx % colors.length]}"></span>
                    <div class="class-info">
                        <div class="class-name">${cls.course_name}</div>
                        <div class="class-sub">Room ${cls.room_num} · Cohort ${cls.semester}</div>
                    </div>
                    <div class="class-time">${cls.time_slot}</div>
                `;
                classesContainer.appendChild(item);
            });
        });
    }
}

// 2. My Classes
function initClasses(teacher) {
    const card = document.querySelector('.page-content .card');
    if (!card) return;

    fetch('../api/courses')
    .then(r => r.json())
    .then(courses => {
        const myCourses = courses.filter(c => c.teacher_id === teacher.id);
        card.innerHTML = `<h3 class="card-title">📚 Courses Taught by Me</h3>`;
        
        if (myCourses.length === 0) {
            card.innerHTML += `<p style="padding:1rem; color:#888;">You have not been assigned any courses yet.</p>`;
            return;
        }

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '1.2rem';
        grid.style.marginTop = '1rem';

        myCourses.forEach(c => {
            const cCard = document.createElement('div');
            cCard.className = 'stat-card';
            cCard.style.textAlign = 'left';
            cCard.style.padding = '1.5rem';
            cCard.style.background = 'white';
            cCard.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
            cCard.innerHTML = `
                <div style="font-size: 11px; font-weight:700; color:#4f46e5; text-transform:uppercase;">${c.code}</div>
                <h4 style="margin: 6px 0; font-size:16px; color:#1e293b;">${c.name}</h4>
                <div style="font-size: 13px; color:#64748b; margin-top:8px;">
                    Semester: <strong>${c.semester}</strong><br/>
                    Type: <strong>${c.type}</strong><br/>
                    Credits: <strong>${c.credits} Credit Hours</strong><br/>
                    Students: <strong>${c.student_count} Enrolled</strong>
                </div>
            `;
            grid.appendChild(cCard);
        });
        card.appendChild(grid);
    });
}

// 3. Weekly Timetable Grid
function initTimetable(teacher) {
    const tbody = document.querySelector('.tt-table tbody');
    if (!tbody) return;

    fetch(`../api/timetable?teacher_id=${teacher.id}`)
    .then(r => r.json())
    .then(schedule => {
        tbody.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Define row timeslots
        const timeslots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
        
        timeslots.forEach(slot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="tt-time">${slot}</td>`;
            
            days.forEach(day => {
                const classItem = schedule.find(item => item.day.toLowerCase() === day.toLowerCase() && item.time_slot === slot);
                
                const td = document.createElement('td');
                if (classItem) {
                    const color = classItem.course_type === 'Lab' ? 'green' : 'blue';
                    td.innerHTML = `
                        <div class="tt-class ${color}">
                            <div class="tt-class-name">${classItem.course_name}</div>
                            <div class="tt-class-info">${classItem.room_num} (${classItem.semester})</div>
                        </div>
                    `;
                } else if (slot === '01:00 PM') {
                    // Highlight lunch break slot
                    td.innerHTML = `<div style="font-size:11px; color:#94a3b8; font-style:italic; text-align:center;">Lunch Break</div>`;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    });
}

// 4. Availability Grid Editor
function initAvailability(teacher) {
    const tbody = document.querySelector('.av-table tbody');
    const saveBtn = document.querySelector('.av-save-btn');
    if (!tbody || !saveBtn) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeslots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

    // Load current availability from backend
    fetch(`../api/teachers/availability?teacher_id=${teacher.id}`)
    .then(r => r.json())
    .then(availability => {
        tbody.innerHTML = '';
        
        timeslots.forEach(slot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="av-time">${slot}</td>`;
            
            days.forEach(day => {
                const daySlots = availability[day] || [];
                const isAvailable = daySlots.includes(slot);
                const disabled = slot === '01:00 PM' ? 'disabled' : ''; // Disable lunch break selection
                
                td = document.createElement('td');
                td.innerHTML = `<input type="checkbox" ${isAvailable ? 'checked' : ''} ${disabled} data-day="${day}" data-slot="${slot}">`;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    });

    // Save changes listener
    saveBtn.addEventListener('click', () => {
        const newAvailability = {
            'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': []
        };
        
        const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const day = cb.getAttribute('data-day');
                const slot = cb.getAttribute('data-slot');
                newAvailability[day].push(slot);
            }
        });

        fetch('../api/teachers/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_id: teacher.id,
                availability: newAvailability
            })
        })
        .then(r => r.json())
        .then(data => {
            alert("💾 Availability saved successfully!\nAdmin has been notified of the changes.");
        });
    });
}

// 5. Students list
function initStudents(teacher) {
    const tbody = document.querySelector('.clo-table tbody');
    if (!tbody) return;

    // Load students enrolled under this teacher's departments/semesters
    fetch(`../api/students`)
    .then(r => r.json())
    .then(students => {
        tbody.innerHTML = '';
        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:left;">${s.roll_no}</td>
                <td style="text-align:left;" class="clo-name">${s.name}</td>
                <td>${s.email}</td>
                <td>${s.semester}</td>
                <td>${s.department}</td>
                <td><span class="clo-pill green">Enrolled</span></td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 6. Requests submission & past lists
function initRequests(teacher) {
    const tbody = document.querySelector('.clo-table tbody');
    const courseSelect = document.querySelectorAll('.tt-select')[1];
    
    // Fill course select
    fetch('../api/courses')
    .then(r => r.json())
    .then(courses => {
        if (courseSelect) {
            courseSelect.innerHTML = '';
            const myCourses = courses.filter(c => c.teacher_id === teacher.id);
            myCourses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (${c.code})`;
                courseSelect.appendChild(opt);
            });
        }
    });

    function loadRequests() {
        fetch(`../api/requests?teacher_id=${teacher.id}`)
        .then(r => r.json())
        .then(requests => {
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999;">No requests submitted yet.</td></tr>`;
                return;
            }

            requests.forEach(req => {
                const tr = document.createElement('tr');
                const statusColor = req.status === 'Approved' ? 'green' : (req.status === 'Pending' ? 'orange' : 'red');
                tr.innerHTML = `
                    <td style="text-align:left; font-weight:600;">${req.type}</td>
                    <td style="text-align:left;" class="clo-name">${req.title}</td>
                    <td colspan="2">${req.details}</td>
                    <td><span class="clo-pill ${statusColor}">${req.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    window.submitRequest = function() {
        const type = document.querySelectorAll('.tt-select')[0].value;
        const courseOpt = courseSelect.options[courseSelect.selectedIndex];
        const courseName = courseOpt ? courseOpt.textContent : 'CS Course';
        const dateVal = document.querySelector('input[type="date"]').value;
        const timeVal = document.querySelectorAll('.tt-select')[2].value;
        const reason = document.querySelector('.req-textarea').value.trim();

        if (!dateVal || !reason) {
            customAlert("Error", "Please provide the date and a description reason!");
            return;
        }

        const detailsStr = `${courseName} — ${dateVal} at ${timeVal} · Note: ${reason}`;

        const previewHtml = `
            <div style="text-align:left; font-size:13.5px; color:#475569; display:flex; flex-direction:column; gap:8px;">
                <p style="margin:0;"><strong>Request Type:</strong> ${type}</p>
                <p style="margin:0;"><strong>Course:</strong> ${courseName}</p>
                <p style="margin:0;"><strong>Proposed Date:</strong> ${dateVal}</p>
                <p style="margin:0;"><strong>Time Slot:</strong> ${timeVal}</p>
                <p style="margin:0; border-top:1px solid #e2e8f0; padding-top:8px;"><strong>Reason / Description:</strong></p>
                <p style="margin:0; font-style:italic; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">"${reason}"</p>
            </div>
        `;

        showCustomModal({
            title: "📤 Confirm Request Submission",
            contentHtml: previewHtml,
            buttons: [
                {
                    text: 'Cancel',
                    onClick: (close) => close()
                },
                {
                    text: 'Confirm & Send',
                    primary: true,
                    onClick: (close) => {
                        fetch('../api/requests', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                teacher_id: teacher.id,
                                type: type,
                                title: type + ' request',
                                details: detailsStr
                            })
                        })
                        .then(r => r.json())
                        .then(data => {
                            close();
                            customAlert("Request Sent", "📤 Request sent to administration successfully!");
                            document.querySelector('input[type="date"]').value = '';
                            document.querySelector('.req-textarea').value = '';
                            loadRequests();
                        });
                    }
                }
            ]
        });
    };

    loadRequests();
}

// 7. Announcements
function initAnnouncements() {
    const listContainer = document.querySelector('.ann-list');
    const markAllBtn = document.querySelector('.ann-mark-all');
    if (!listContainer) return;

    fetch('../api/announcements?role=teacher')
    .then(r => r.json())
    .then(announcements => {
        listContainer.innerHTML = '';
        if (announcements.length === 0) {
            listContainer.innerHTML = `<p style="padding:1rem; color:#888;">No recent announcements.</p>`;
            return;
        }

        const readList = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');

        announcements.forEach(a => {
            const isRead = readList.includes(a.id);
            const cardClass = isRead ? 'ann-card' : 'ann-card unread';
            const dotClass = isRead ? 'ann-dot read' : 'ann-dot';
            
            const badgeType = a.role_target === 'all' ? 'amber' : 'blue';
            const badgeText = a.role_target === 'all' ? 'Notice' : 'Faculty';

            const item = document.createElement('div');
            item.className = cardClass;
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <div class="${dotClass}"></div>
                <div class="ann-body">
                    <div class="ann-title">${a.title}</div>
                    <div class="ann-text">${a.content}</div>
                    <div class="ann-meta">${a.date} · Admin</div>
                </div>
                <span class="badge ${badgeType}">${badgeText}</span>
            `;

            // On click mark as read
            item.addEventListener('click', () => {
                const currentRead = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
                if (!currentRead.includes(a.id)) {
                    currentRead.push(a.id);
                    localStorage.setItem('readAnnouncements', JSON.stringify(currentRead));
                    item.className = 'ann-card';
                    const dot = item.querySelector('.ann-dot');
                    if (dot) dot.className = 'ann-dot read';
                }
            });

            listContainer.appendChild(item);
        });

        // Mark All As Read
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentRead = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
                announcements.forEach(a => {
                    if (!currentRead.includes(a.id)) {
                        currentRead.push(a.id);
                    }
                });
                localStorage.setItem('readAnnouncements', JSON.stringify(currentRead));
                
                // Update UI of all cards
                listContainer.querySelectorAll('.ann-card').forEach(card => {
                    card.className = 'ann-card';
                });
                listContainer.querySelectorAll('.ann-dot').forEach(dot => {
                    dot.className = 'ann-dot read';
                });
            });
        }
    });
}

// 8. Profile settings page
function initProfile(teacher) {
    const profileWrap = document.querySelector('.profile-wrap');
    if (!profileWrap) return;

    // Load initial values from database session
    updateProfileDOM(teacher);

    // Bind Edit Button
    const editBtn = document.querySelector('.profile-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openEditProfileModal(teacher);
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
        infoValues[2].textContent = "Computer Science"; // Department
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

// --- CUSTOM MODAL / DIALOG DIALOGUE SYSTEM ---
function showCustomModal({ title, contentHtml, buttons, onClose }) {
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

    const body = document.createElement('div');
    body.style.padding = '24px';
    body.style.fontSize = '14px';
    body.style.lineHeight = '1.6';
    body.style.color = '#334155';
    body.style.maxHeight = '70vh';
    body.style.overflowY = 'auto';
    body.innerHTML = contentHtml;
    box.appendChild(body);

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

    function closeModal() {
        overlay.style.opacity = '0';
        box.style.transform = 'translateY(20px) scale(0.95)';
        setTimeout(() => {
            overlay.remove();
            if (onClose) onClose();
        }, 250);
    }

    setTimeout(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'translateY(0) scale(1)';
    }, 10);

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